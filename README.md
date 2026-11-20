# ViralMind AI
Create Smarter. Grow Faster.

- `app/` – Android app (Kotlin WebView shell + HTML/JS UI in `app/src/main/assets/www`)
- `backend/` – Cloudflare Worker (Gemini primary, optional backup provider)

## Backend setup (free)
1. Cloudflare dashboard -> Workers & Pages -> Create -> Worker -> name `viralmind-ai-api` -> Deploy -> Edit code -> paste `backend/src/index.js` -> Deploy.
2. Worker -> Settings -> Variables and Secrets -> add secret `GEMINI_API_KEY` (from aistudio.google.com/apikey).
3. Optional backup: secrets `BACKUP_API_KEY`, `BACKUP_BASE_URL` (OpenAI-compatible, e.g. https://api.groq.com/openai/v1), `BACKUP_MODEL`.
4. Optional variable `GEMINI_MODEL` (default `gemini-2.5-flash`).
5. Copy the Worker URL (https://viralmind-ai-api.<you>.workers.dev). Put it in the app: Settings -> Backend URL.
   Or add GitHub secret `WORKER_URL` so it is baked into the APK.

## Environment variables
| Name | Where | Required |
|---|---|---|
| GEMINI_API_KEY | Worker secret | yes |
| GEMINI_MODEL | Worker var | no |
| BACKUP_API_KEY / BACKUP_BASE_URL / BACKUP_MODEL | Worker secrets | no |
| WORKER_URL | GitHub Actions secret | no (can set inside app) |

## Limitations
- Guest mode only: history/favorites are stored on the phone. No login/Google login yet.
- Viral Analyzer cannot open video links; it analyses the details you type.
- Rate limit in the Worker is best-effort (in-memory per instance). Free AI tier has real quotas.
- Debug-signed APK (installable, not Play Store ready). Logo is a vector placeholder.
