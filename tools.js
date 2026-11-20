const PLATFORMS=['Instagram Reels','YouTube Shorts','YouTube Long Video'];
const LANGS=['Hinglish','Hindi','English'];
const TONES=['Emotional','Motivational','Educational','Funny','Storytelling','Professional'];
const DURS=['30 Seconds','1 Minute','2 Minutes','3 Minutes','4 Minutes','5 Minutes','10 Minutes'];
const WORDS={'30 Seconds':75,'1 Minute':150,'2 Minutes':300,'3 Minutes':450,'4 Minutes':600,'5 Minutes':750,'10 Minutes':1500};

const f={
  area:(k,l,ph,extra={})=>({k,l,t:'area',ph,req:1,...extra}),
  text:(k,l,ph,req)=>({k,l,t:'text',ph,req}),
  sel:(k,l,o)=>({k,l,t:'sel',o}),
};
const PLAT=f.sel('platform','Platform',PLATFORMS), LANG=f.sel('lang','Language',LANGS), TONE=f.sel('tone','Tone',TONES), DUR=f.sel('dur','Duration',DURS);
const NICHE=f.text('niche','Category / Niche','e.g. Motivation, Tech, Fitness, Finance');

const SYSTEM="You are ViralMind AI, an expert scriptwriter and growth strategist for video creators (Instagram Reels, YouTube Shorts, YouTube long videos). Rules: write ready-to-use, natural, voiceover-friendly output. Follow the requested language exactly: 'Hinglish' = natural conversational Hindi written in English/Roman letters; 'Hindi' = Devanagari script; 'English' = plain English. Never promise guaranteed virality, views or income and never invent statistics. Format the answer using markdown section headings that start with '## ' exactly as requested. Do not add any intro or closing remarks outside those sections.";

const line=(k,v)=>v?`${k}: ${v}\n`:'';
const STRUCT="Use exactly these section headings, in this order, each on its own line: '## HOOK', '## PROBLEM', '## SOLUTION', '## RESULT', '## CTA'.";

const TOOLS=[
{id:'script',e:'🎬',title:'AI Script Generator',d:'Hook to CTA script',fields:[f.area('topic','Topic or complete script / story','Video ka topic ya poori script likho...'),PLAT,NICHE,LANG,TONE,DUR],
 build:v=>`Write a ${v.dur} ${v.platform} video script.\nTopic/Source: ${v.topic}\n${line('Niche',v.niche)}Language: ${v.lang}\nTone: ${v.tone}\nTarget length: about ${WORDS[v.dur]} spoken words.\n${STRUCT}\nMake the HOOK grab attention in the first 3 seconds. Keep it engaging, natural and easy to read aloud.`},
{id:'story',e:'📖',title:'Story to Script',d:'500-5000 word story',words:5000,fields:[f.area('topic','Paste your story (500 to 5000 words)','Yahan poori story paste karo...',{big:1}),PLAT,LANG,TONE,DUR],
 build:v=>`Convert the story below into a ${v.dur} ${v.platform} video script.\nLanguage: ${v.lang}\nTone: ${v.tone}\nTarget length: about ${WORDS[v.dur]} spoken words.\nRules: understand the story fully, preserve all important facts and events, remove unnecessary details, use engaging storytelling, and do NOT change the original meaning.\n${STRUCT}\n\nSTORY:\n${v.topic}`},
{id:'hook',e:'🪝',title:'Viral Hook Generator',d:'First 3 seconds',fields:[f.area('topic','Video topic','Topic likho...'),PLAT,NICHE,LANG,TONE],
 build:v=>`Create 10 scroll-stopping hooks (first 3 seconds) for a ${v.platform} video.\nTopic: ${v.topic}\n${line('Niche',v.niche)}Language: ${v.lang}\nTone: ${v.tone}\nUse sections: '## Curiosity Hooks' (4), '## Shocking Fact Hooks' (3), '## Story Hooks' (3). Number each hook.`},
{id:'caption',e:'💬',title:'Caption Generator',d:'Post captions',fields:[f.area('topic','Post / video about','Kis bare mein post hai...'),PLAT,LANG,TONE],
 build:v=>`Write 5 different captions for a ${v.platform} post.\nAbout: ${v.topic}\nLanguage: ${v.lang}\nTone: ${v.tone}\nUse headings '## Caption 1' to '## Caption 5'. Add a few fitting emojis and a call to action.`},
{id:'hashtag',e:'#️⃣',title:'Hashtag Generator',d:'Reach + niche tags',fields:[f.area('topic','Post / video about','Topic likho...'),PLAT,NICHE],
 build:v=>`Generate relevant hashtags for a ${v.platform} post.\nAbout: ${v.topic}\n${line('Niche',v.niche)}Use sections: '## High Reach' (8 tags), '## Niche Specific' (10 tags), '## Low Competition' (10 tags), '## Ready To Paste' (best 15 tags in one line). Hashtags only inside sections, no explanations. Do not claim they guarantee reach.`},
{id:'title',e:'🏷️',title:'Title Generator',d:'Click-worthy titles',fields:[f.area('topic','Video topic','Topic likho...'),PLAT,LANG,TONE],
 build:v=>`Write 10 click-worthy but honest (no misleading clickbait) titles for a ${v.platform} video.\nTopic: ${v.topic}\nLanguage: ${v.lang}\nTone: ${v.tone}\nUse headings '## Title 1' to '## Title 10', each with the title and one short line on why it works.`},
{id:'desc',e:'📝',title:'Description Generator',d:'SEO descriptions',fields:[f.area('topic','Video topic / summary','Video kis bare mein hai...'),PLAT,LANG,TONE],
 build:v=>`Write a video description for a ${v.platform} video.\nAbout: ${v.topic}\nLanguage: ${v.lang}\nTone: ${v.tone}\nUse sections: '## Description' (SEO friendly, strong first 2 lines), '## Keywords' (15 comma separated), '## Pinned Comment' (1 engaging question).`},
{id:'ideas',e:'💡',title:'Video Ideas Generator',d:'Fresh content ideas',fields:[NICHE,f.text('topic','Audience / extra details (optional)','e.g. students, beginners'),PLAT,LANG],
 build:v=>`Give 10 fresh video ideas for ${v.platform}.\nNiche: ${v.niche||'general'}\n${line('Audience / details',v.topic)}Language: ${v.lang}\nUse headings '## Idea 1' to '## Idea 10'; each idea has a title, a hook line and a 1-line outline.`,noReq:['topic','niche']},
{id:'analyzer',e:'📊',title:'AI Viral Analyzer',d:'Why views are low',fields:[f.text('link','Video link (optional, reference only)','https://...'),f.text('title','Video title','Current title'),f.area('hook','Opening hook / first lines (optional)','Pehle 3 second mein kya bola...',{opt:1}),f.text('views','Views','e.g. 850'),f.text('likes','Likes / comments / shares','e.g. 20 / 3 / 1'),f.text('ret','Avg watch time or retention %','e.g. 35% or 12 sec'),f.text('dur2','Video length','e.g. 45 sec'),f.area('notes','Anything else (optional)','Posting time, niche, followers...',{opt:1}),PLAT,LANG],
 build:v=>`Analyze this video's performance using ONLY the details provided. You cannot open links or see the video, so say so briefly if useful and never invent data.\n${line('Link',v.link)}${line('Title',v.title)}${line('Hook',v.hook)}${line('Views',v.views)}${line('Likes/comments/shares',v.likes)}${line('Retention/watch time',v.ret)}${line('Video length',v.dur2)}${line('Notes',v.notes)}Platform: ${v.platform}\nLanguage: ${v.lang}\nUse sections: '## Overall Diagnosis', '## Hook', '## Audience Retention', '## Engagement', '## Title', '## Content Structure', '## Possible Reasons For Low Views', '## Improvement Plan' (5 concrete steps). Be honest; do not promise viral results.`,noReq:['link','hook','likes','ret','dur2','notes','views']},
{id:'doctor',e:'🩺',title:'AI Video Doctor',d:'Score your script',fields:[f.area('topic','Paste your script','Apni script yahan paste karo...',{big:1}),PLAT,LANG],
 build:v=>`Review this ${v.platform} script like a strict but helpful video doctor. Respond in ${v.lang}.\nSections: '## Overall Score' (X/100 and one-line verdict), '## Score Breakdown' (each /10: First 3-second Hook, Audience Retention, Story Flow, Emotional Impact, Engagement Potential, CTA Quality), '## What Works', '## Problems', '## Fix It' (specific actionable suggestions), '## Better Hook' (3 improved hook options).\n\nSCRIPT:\n${v.topic}`},
{id:'planner',e:'🗓️',title:'Content Planner',d:'Content calendar',fields:[NICHE,f.sel('span','Plan length',['7 Days','14 Days','30 Days']),PLAT,LANG,f.text('goal','Goal (optional)','e.g. grow followers, sell course')],
 build:v=>`Create a ${v.span} content calendar for ${v.platform}.\nNiche: ${v.niche}\n${line('Goal',v.goal)}Language: ${v.lang}\nUse one heading per week ('## Week 1', ...). For each day give: topic, content format and a one-line hook. Include best-practice posting advice without guarantees.`,noReq:['goal']},
{id:'cta',e:'📣',title:'CTA Generator',d:'Calls to action',fields:[f.area('topic','Video topic','Topic likho...'),f.sel('goal','CTA goal',['Follow','Subscribe','Comment','Share','Save','Click link / Buy']),PLAT,LANG,TONE],
 build:v=>`Write 10 call-to-action lines for a ${v.platform} video.\nTopic: ${v.topic}\nGoal: ${v.goal}\nLanguage: ${v.lang}\nTone: ${v.tone}\nUse sections '## Soft CTAs' (4), '## Direct CTAs' (3), '## Curiosity CTAs' (3).`},
{id:'rewrite',e:'✍️',title:'Script Rewriter',d:'Rewrite any script',fields:[f.area('topic','Paste script','Script yahan paste karo...',{big:1}),f.sel('mode','Rewrite style',['Fresh rewrite','Simplify','More emotional','More viral & punchy']),LANG,TONE],
 build:v=>`Rewrite the script below. Style: ${v.mode}. Language: ${v.lang}. Tone: ${v.tone}. Keep the original meaning and facts. Output a single section '## Rewritten Script', then '## What Changed' (3 short bullets).\n\nSCRIPT:\n${v.topic}`},
{id:'voice',e:'🎙️',title:'Voiceover Script',d:'Voiceover ready',fields:[f.area('topic','Topic or script','Topic ya script...'),LANG,TONE,DUR],
 build:v=>`Create a voiceover-ready script.\nSource: ${v.topic}\nLanguage: ${v.lang}\nTone: ${v.tone}\nLength: about ${WORDS[v.dur]} spoken words (${v.dur}).\nUse sections '## Voiceover' (short natural sentences, add [pause] and [emphasis] cues) and '## Delivery Notes' (pace, emotion, music suggestions).`},
{id:'thumb',e:'🖼️',title:'Thumbnail Ideas',d:'Thumbnail concepts',fields:[f.area('topic','Video topic','Topic likho...'),PLAT,NICHE],
 build:v=>`Give 5 thumbnail concepts for a ${v.platform} video.\nTopic: ${v.topic}\n${line('Niche',v.niche)}Use headings '## Thumbnail 1' to '## Thumbnail 5'. For each: text overlay (max 4 words), main visual, colors, facial expression/emotion, and layout.`},
];
