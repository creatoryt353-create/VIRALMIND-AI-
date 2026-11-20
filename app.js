(function(){
const LS={get:(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const $=s=>document.querySelector(s);
function h(t,a,...c){const e=document.createElement(t);a=a||{};for(const k in a){const v=a[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v)}c.flat(9).forEach(x=>{if(x==null||x===false)return;e.append(x.nodeType?x:document.createTextNode(String(x)))});return e}
let toastT;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2200)}

let stack=['home'];
let cur={tool:null,vals:{},out:'',busy:false,err:null,prompt:null,entryId:null};
const getApi=()=>{const u=LS.get('vm_api',null);const d=(window.VM_API_URL||'');return (u||(d.indexOf('__')===0?'':d)).trim()};
const hist=()=>LS.get('vm_hist',[]);const saveHist=a=>LS.set('vm_hist',a);
const toolById=id=>TOOLS.find(t=>t.id===id);

function go(s){stack.push(s);render()}
function tab(s){stack=s==='home'?['home']:['home',s];render()}
window.handleBack=function(){if(cur.busy&&stack[stack.length-1]==='tool'){}if(stack.length>1){stack.pop();render();return true}return false};

async function callAI(prompt){
  const base=getApi();
  if(!base)throw{message:'Backend URL set nahi hai. Settings mein Backend URL daalein.'};
  const ctrl=new AbortController();const to=setTimeout(()=>ctrl.abort(),170000);
  try{
    const r=await fetch(base.replace(/\/$/,'')+'/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:SYSTEM,prompt}),signal:ctrl.signal});
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw{message:(j.error&&j.error.message)||('Server error '+r.status)};
    if(!j.text)throw{message:'Khali jawab aaya. Retry karein.'};
    return j.text;
  }catch(e){
    if(e&&e.name==='AbortError')throw{message:'Request time out ho gayi. Retry karein.'};
    if(e instanceof TypeError)throw{message:'Network problem. Internet check karke Retry karein.'};
    throw e;
  }finally{clearTimeout(to)}
}
async function run(prompt){
  if(cur.busy)return;
  cur.busy=true;cur.err=null;cur.prompt=prompt;render();
  try{cur.out=await callAI(prompt);cur.entryId=null}
  catch(e){cur.err=e.message||'Kuch galat ho gaya.'}
  finally{cur.busy=false;render();const r=$('#result');if(r)r.scrollIntoView({behavior:'smooth',block:'start'})}
}
function generate(){
  const t=cur.tool,v=cur.vals;
  for(const fd of t.fields){
    const need=(fd.t==='area'&&!fd.opt&&!(t.noReq||[]).includes(fd.k))||(fd.req===true&&!(t.noReq||[]).includes(fd.k));
    if(need&&!(v[fd.k]||'').trim()){toast(fd.l+' bharna zaroori hai');return}
  }
  if(t.id==='analyzer'&&!(v.title||v.hook||v.views||'').trim()){toast('Title, hook ya views mein se kuch daalein');return}
  if(t.words){const n=wc(v.topic);if(n>t.words){toast('Story '+t.words+' words se chhoti honi chahiye ('+n+' hain)');return}}
  cur.out='';cur.entryId=null;
  run(t.build(v));
}
const wc=s=>(s||'').trim()?(s.trim().split(/\s+/).length):0;
function refine(kind){
  const ins={improve:'Improve this: stronger hook, clearer flow, more engaging. Keep the same language and the same section headings.',shorten:'Shorten this by about 40% while keeping the key points. Keep the same language and the same section headings.',expand:'Expand this by about 50% with more detail and flow. Keep the same language and the same section headings.'}[kind];
  run(ins+'\n\nCURRENT VERSION:\n'+cur.out);
}
function regen(){if(!cur.prompt)return;run(cur.prompt+'\n\nWrite a completely fresh and different version from any earlier one.')}

function parse(t){
  const parts=t.split(/^##\s+/m);const s=[];
  if(parts[0].trim())s.push({title:'Output',body:parts[0].trim().replace(/\*\*/g,'')});
  for(let i=1;i<parts.length;i++){const nl=parts[i].indexOf('\n');const title=(nl<0?parts[i]:parts[i].slice(0,nl)).trim().replace(/\*\*/g,'');const body=(nl<0?'':parts[i].slice(nl+1)).trim().replace(/\*\*/g,'');s.push({title,body})}
  return s;
}
const fullText=()=>parse(cur.out).map(s=>s.title==='Output'?s.body:s.title.toUpperCase()+'\n'+s.body).join('\n\n');
function copy(t){try{if(window.Android){Android.copy(t)}else navigator.clipboard.writeText(t);toast('Copied ✓')}catch(e){toast('Copy nahi hua')}}
function share(){const t=fullText();try{if(window.Android)Android.share(t);else if(navigator.share)navigator.share({text:t});else copy(t)}catch(e){toast('Share nahi hua')}}
function download(){
  const name='ViralMind_'+(cur.tool?cur.tool.id:'output')+'_'+Date.now()+'.txt';
  try{if(window.Android){const p=Android.saveTxt(name,fullText());toast(p?'Saved: '+p:'Save fail hua')}else toast('Download sirf app mein chalta hai')}catch(e){toast('Save fail hua')}
}
function saveEntry(fav){
  const a=hist();let e=cur.entryId?a.find(x=>x.id===cur.entryId):null;
  if(!e){e={id:Date.now(),tool:cur.tool.id,title:cur.tool.title,text:cur.out,ts:Date.now(),fav:false};a.unshift(e);cur.entryId=e.id}
  if(fav!==undefined)e.fav=fav;
  saveHist(a.slice(0,300));return e;
}
function toggleFav(){const a=hist();const e=cur.entryId?a.find(x=>x.id===cur.entryId):null;const nf=!(e&&e.fav);saveEntry(nf);render();toast(nf?'Favorites mein add ✓':'Favorite hata diya')}
const isFav=()=>{const e=cur.entryId&&hist().find(x=>x.id===cur.entryId);return !!(e&&e.fav)};

function resultView(){
  const w=h('div',{id:'result'});
  if(cur.busy)return h('div',{id:'result'},h('div',{class:'spin'},h('i'),'AI likh raha hai... (lambi script mein 1 min lag sakta hai)'));
  if(cur.err)w.append(h('div',{class:'err'},cur.err,h('div',{style:'margin-top:10px'},h('button',{class:'sm',onclick:()=>cur.prompt?run(cur.prompt):generate()},'🔄 Retry'))));
  if(!cur.out)return w;
  const bar=(...b)=>h('div',{class:'bar'},b);
  w.append(bar(h('button',{class:'sm',onclick:()=>copy(fullText())},'📋 Copy Full'),h('button',{class:'sm',onclick:regen},'🔁 Regenerate'),h('button',{class:'sm',onclick:()=>refine('improve')},'✨ Improve'),h('button',{class:'sm',onclick:()=>refine('shorten')},'➖ Shorten'),h('button',{class:'sm',onclick:()=>refine('expand')},'➕ Expand')));
  parse(cur.out).forEach(s=>w.append(h('div',{class:'sec'},h('div',{class:'h'},h('b',{},s.title),h('button',{class:'sm',onclick:()=>copy(s.body)},'Copy')),h('p',{},s.body))));
  w.append(bar(h('button',{class:'sm',onclick:()=>{saveEntry();toast('History mein save ✓')}},'💾 Save'),h('button',{class:'sm'+(isFav()?' on':''),onclick:toggleFav},isFav()?'♥ Favorite':'♡ Favorite'),h('button',{class:'sm',onclick:share},'📤 Share'),h('button',{class:'sm',onclick:download},'⬇️ TXT')));
  return w;
}

function homeScreen(){
  const g=h('div',{class:'grid'});
  TOOLS.forEach((t,i)=>g.append(h('button',{class:'tool',style:'animation-delay:'+(i*20)+'ms',onclick:()=>openTool(t)},h('div',{class:'e'},t.e),h('b',{},t.title),h('small',{},t.d))));
  return h('div',{},h('div',{class:'hero'},h('b',{},'Create Smarter. Grow Faster.'),h('span',{},'Apna tool chuno aur AI se content banao.')),g);
}
function openTool(t){cur={tool:t,vals:{},out:'',busy:false,err:null,prompt:null,entryId:null};t.fields.forEach(f=>{if(f.t==='sel')cur.vals[f.k]=f.o[0]});go('tool')}
function toolScreen(){
  const t=cur.tool;const form=h('div',{});
  t.fields.forEach(fd=>{
    let el;
    if(fd.t==='sel'){el=h('select',{},fd.o.map(o=>h('option',{value:o},o)));el.value=cur.vals[fd.k]||fd.o[0];el.addEventListener('change',()=>cur.vals[fd.k]=el.value)}
    else if(fd.t==='area'){el=h('textarea',{placeholder:fd.ph||'',style:fd.big?'min-height:220px':''});el.value=cur.vals[fd.k]||'';el.addEventListener('input',()=>{cur.vals[fd.k]=el.value;const c=$('#wc');if(c&&t.words)c.textContent=wc(el.value)+' / '+t.words+' words'})}
    else{el=h('input',{type:'text',placeholder:fd.ph||''});el.value=cur.vals[fd.k]||'';el.addEventListener('input',()=>cur.vals[fd.k]=el.value)}
    form.append(h('label',{},fd.l),el);
    if(fd.t==='area'&&t.words)form.append(h('div',{class:'cnt',id:'wc'},wc(cur.vals[fd.k])+' / '+t.words+' words'));
  });
  form.append(h('button',{class:'btn',disabled:cur.busy,onclick:generate},cur.busy?'Generating...':'✨ Generate'));
  if(t.id==='analyzer')form.append(h('p',{class:'mut'},'Note: AI video link khol nahi sakta. Wo sirf aapki diye hue details se analysis karta hai.'));
  return h('div',{},form,resultView());
}
function listScreen(favOnly){
  const a=hist().filter(x=>!favOnly||x.fav);
  const w=h('div',{});
  if(!a.length)w.append(h('p',{class:'mut'},favOnly?'Abhi koi favorite nahi hai.':'History khali hai. Koi result "Save" karo.'));
  a.forEach(e=>w.append(h('div',{class:'item'},h('div',{onclick:()=>openEntry(e)},h('b',{},(e.fav?'♥ ':'')+e.title),h('small',{},new Date(e.ts).toLocaleString()),h('div',{class:'t'},e.text.replace(/[#\n]+/g,' ').slice(0,80))),h('button',{class:'sm',onclick:()=>{if(confirm('Delete karein?')){saveHist(hist().filter(x=>x.id!==e.id));render()}}},'🗑'))));
  if(!favOnly&&a.length)w.append(h('button',{class:'sm',style:'margin-top:10px',onclick:()=>{if(confirm('Poori history delete karein?')){saveHist(hist().filter(x=>x.fav));render()}}},'Clear history (favorites rahenge)'));
  return w;
}
function openEntry(e){cur={tool:toolById(e.tool)||{id:e.tool,title:e.title,fields:[]},vals:{},out:e.text,busy:false,err:null,prompt:null,entryId:e.id};go('detail')}
function settingsScreen(){
  const inp=h('input',{type:'text',placeholder:'https://viralmind-ai-api.xxx.workers.dev'});inp.value=getApi();
  return h('div',{},
    h('label',{},'Backend URL (Cloudflare Worker)'),inp,
    h('div',{class:'bar'},
      h('button',{class:'sm',onclick:()=>{LS.set('vm_api',inp.value.trim());toast('Saved ✓')}},'💾 Save'),
      h('button',{class:'sm',onclick:async()=>{const u=inp.value.trim().replace(/\/$/,'');if(!u){toast('URL daalein');return}try{const r=await fetch(u+'/');const j=await r.json();toast(j.ok?(j.gemini?'Connected ✓ (Gemini ready)':'Connected, par GEMINI_API_KEY missing'):'Server ne galat jawab diya')}catch(e){toast('Connect nahi hua')}}},'🔌 Test')),
    h('p',{class:'mut'},'API keys is app mein kabhi store nahi hoti. Wo sirf Cloudflare Worker ke secrets mein rehti hain.'),
    h('p',{class:'mut'},'History aur favorites sirf is phone mein save hote hain. Free AI tier ki daily/per-minute limits hoti hain; limit full hone par app message dikhata hai.'),
    h('button',{class:'sm',onclick:()=>{if(confirm('Saara local data delete karein?')){saveHist([]);toast('Data delete ho gaya');render()}}},'🗑 Delete all my data'),
    h('p',{class:'mut'},'ViralMind AI v1.0.0'));
}

const TITLES={home:'ViralMind AI',tool:'',history:'History',favs:'Favorites',settings:'Settings',detail:''};
function render(){
  const s=stack[stack.length-1];const app=$('#app');app.innerHTML='';
  const sub=s==='tool'||s==='detail';
  const title=sub?(cur.tool?cur.tool.title:''):TITLES[s];
  app.append(h('div',{class:'top'},sub?h('button',{class:'ib',onclick:()=>window.handleBack()},'←'):h('div',{class:'logo'},'V'),h('h1',{},title)));
  if(s==='home')app.append(homeScreen());
  else if(s==='tool')app.append(toolScreen());
  else if(s==='detail')app.append(resultView());
  else if(s==='history')app.append(listScreen(false));
  else if(s==='favs')app.append(listScreen(true));
  else if(s==='settings')app.append(settingsScreen());
  const n=(id,i,l)=>h('button',{class:(stack[1]===id||(id==='home'&&stack.length===1))?'on':'',onclick:()=>tab(id)},h('span',{},i),l);
  app.append(h('div',{class:'nav'},n('home','🏠','Home'),n('history','🕘','History'),n('favs','♥','Favorites'),n('settings','⚙️','Settings')));
  window.scrollTo(0,0);
}
render();
})();
