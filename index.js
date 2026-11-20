// ViralMind AI backend - Cloudflare Worker
// Secrets (never commit): GEMINI_API_KEY  | optional backup: BACKUP_API_KEY, BACKUP_BASE_URL, BACKUP_MODEL
// Optional var: GEMINI_MODEL (default gemini-2.5-flash)

const MAX_PROMPT = 40000;
const MAX_SYSTEM = 4000;
const ATTEMPT_TIMEOUT_MS = 50000;
const RATE_LIMIT = 20;          // requests per minute per IP (best effort, per isolate)
const hits = new Map();

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (obj, status = 200, extra = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS, ...extra } });

const fail = (status, code, message, extra) => json({ error: { code, message } }, status, extra);

class HttpErr extends Error {
  constructor(status, msg, retryable) { super(msg); this.status = status; this.retryable = retryable; }
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > RATE_LIMIT;
}

async function timedFetch(url, init) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    throw new HttpErr(504, 'timeout/network: ' + e.message, true);
  } finally {
    clearTimeout(t);
  }
}

async function callGemini(env, system, prompt) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await timedFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new HttpErr(res.status, `gemini ${res.status}: ${body.slice(0, 300)}`, res.status === 429 || res.status >= 500);
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
  if (!text) throw new HttpErr(502, 'gemini empty response: ' + (data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason || 'unknown'), false);
  return text;
}

async function callBackup(env, system, prompt) {
  const base = env.BACKUP_BASE_URL.replace(/\/$/, '');
  const res = await timedFetch(base + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.BACKUP_API_KEY },
    body: JSON.stringify({
      model: env.BACKUP_MODEL,
      temperature: 0.9,
      max_tokens: 8000,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new HttpErr(res.status, `backup ${res.status}: ${body.slice(0, 300)}`, res.status === 429 || res.status >= 500);
  }
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new HttpErr(502, 'backup empty response', false);
  return text;
}

// retry with exponential backoff + jitter
async function withRetry(fn, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!e.retryable || i === attempts - 1) break;
      const wait = 800 * 2 ** i + Math.random() * 400;
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw last;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);

    if (request.method === 'GET') {
      return json({ ok: true, service: 'ViralMind AI API', gemini: !!env.GEMINI_API_KEY, backup: !!(env.BACKUP_API_KEY && env.BACKUP_BASE_URL && env.BACKUP_MODEL) });
    }
    if (request.method !== 'POST' || url.pathname !== '/generate') return fail(404, 'not_found', 'Not found');

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (rateLimited(ip)) return fail(429, 'rate_limited', 'Bahut zyada requests. 1 minute ruk kar dobara try karein.', { 'Retry-After': '60' });

    let body;
    try { body = await request.json(); } catch { return fail(400, 'bad_json', 'Invalid request.'); }
    const system = typeof body.system === 'string' ? body.system.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) return fail(400, 'empty_prompt', 'Input khali hai.');
    if (prompt.length > MAX_PROMPT) return fail(400, 'too_long', 'Input bahut lamba hai. Thoda chhota karein.');
    if (system.length > MAX_SYSTEM) return fail(400, 'bad_system', 'Invalid request.');
    if (!env.GEMINI_API_KEY) return fail(500, 'not_configured', 'Server setup adhura hai (GEMINI_API_KEY missing).');

    const started = Date.now();
    try {
      const text = await withRetry(() => callGemini(env, system, prompt));
      console.log(JSON.stringify({ ok: true, provider: 'gemini', ms: Date.now() - started, len: text.length }));
      return json({ text, provider: 'gemini' });
    } catch (e1) {
      console.error(JSON.stringify({ ok: false, provider: 'gemini', status: e1.status, msg: e1.message }));
      if (env.BACKUP_API_KEY && env.BACKUP_BASE_URL && env.BACKUP_MODEL) {
        try {
          const text = await withRetry(() => callBackup(env, system, prompt), 2);
          console.log(JSON.stringify({ ok: true, provider: 'backup', ms: Date.now() - started }));
          return json({ text, provider: 'backup' });
        } catch (e2) {
          console.error(JSON.stringify({ ok: false, provider: 'backup', status: e2.status, msg: e2.message }));
        }
      }
      if (e1.status === 429) return fail(429, 'quota', 'AI ki free limit abhi full hai. Thodi der baad try karein.', { 'Retry-After': '60' });
      if (e1.status === 504) return fail(504, 'timeout', 'AI ne time par jawab nahi diya. Retry karein.');
      if (e1.status === 400 || e1.status === 403) return fail(502, 'provider_config', 'AI provider setup mein problem hai (API key / model check karein).');
      return fail(503, 'busy', 'AI server abhi busy hai. Thodi der baad Retry karein.');
    }
  },
};
