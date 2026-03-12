/* =====================================================================
   DASHBOARD v5 — app.js
   ===================================================================== */

const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

/* ─── helpers ─────────────────────────────────────────── */
function pad2(n){ return String(n).padStart(2,'0'); }
function safeText(s){ return (s??'').toString(); }
function set(id,v){ const e=$(id); if(e) e.textContent=v; }
function timeAgo(iso){
  if(!iso) return '';
  const d=Math.max(0,Math.round((Date.now()-new Date(iso).getTime())/60000));
  if(d<1) return 'teraz'; if(d<60) return d+' min temu';
  return Math.round(d/60)+' h temu';
}
function formatPLDate(d){
  const days  =['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];
  const months=['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca',
                'sierpnia','września','października','listopada','grudnia'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
const DOW_SHORT=['Nd','Pn','Wt','Śr','Cz','Pt','Sb'];

/* ─── zegar ───────────────────────────────────────────── */
function setClock(){
  const now=new Date();
  set('#time',`${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
  set('#date',formatPLDate(now));
  set('#subtitle',`Dziś jest ${formatPLDate(now)}`);
}

/* ─── zakładki ────────────────────────────────────────── */
function setTabs(){
  $$('.tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const list=btn.closest('[role=tablist]')||btn.parentElement;
      list.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const panel=$('#panel-'+btn.dataset.tab);
      panel?.closest('.tabpanels')?.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      panel?.classList.add('active');
    });
  });
}

/* ─── wizualizator radia ─────────────────────────────── */
function buildViz(){
  const wrap=$('#vizWrap'); if(!wrap) return; wrap.innerHTML='';
  [8,14,22,18,26,12,20,28,16,24,10,22,18,26,12,20,14,8,22,16].forEach((h,i)=>{
    const b=document.createElement('div'); b.className='viz-bar';
    b.style.setProperty('--h',h+'px');
    b.style.setProperty('--d',(0.5+Math.random()*.7).toFixed(2)+'s');
    b.style.animationDelay=(i*.04).toFixed(2)+'s';
    b.style.height='3px';
    wrap.appendChild(b);
  });
}
function startViz(){ $('#vizWrap')?.classList.add('active'); }
function stopViz() { $('#vizWrap')?.classList.remove('active'); }

/* ─── POGODA ──────────────────────────────────────────── */
function wCode(code){
  return ({0:'☀️ bezchmurnie',1:'🌤 pogodnie',2:'⛅ częściowe zachmurzenie',
    3:'☁️ pochmurno',45:'🌫 mgła',51:'🌦 mżawka',53:'🌦 mżawka',55:'🌦 mżawka',
    61:'🌧 deszcz',63:'🌧 deszcz',65:'⛈ ulewa',71:'🌨 śnieg',73:'🌨 śnieg',
    75:'❄️ intensywny śnieg',80:'🌦 przelotny deszcz',82:'⛈ silny deszcz',95:'⛈ burza'
  })[Number(code)]||'—';
}
function wIcon(code){
  return ({0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',53:'🌦',55:'🌦',
    61:'🌧',63:'🌧',65:'⛈',71:'🌨',73:'🌨',75:'❄️',80:'🌦',82:'⛈',95:'⛈'
  })[Number(code)]||'🌡️';
}

async function loadWeather(){
  const cfg=window.DASH_CONFIG;
  set('#weatherPlace',cfg.placeLabel);
  const res=await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lon}`+
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`+
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum`+
    `&timezone=Europe%2FWarsaw&forecast_days=7`
  );
  if(!res.ok) throw new Error('Weather '+res.status);
  const data=await res.json();
  const c=data.current||{};
  set('#temp',(c.temperature_2m??'—')+'°');
  set('#apparent',(c.apparent_temperature??'—')+'°');
  set('#wind',(c.wind_speed_10m??'—')+' km/h');
  set('#precip',(c.precipitation??'—')+' mm');
  set('#weatherDesc',wCode(c.weather_code));
  set('#weatherUpdated',timeAgo(c.time)||'—');
  renderForecast(data.daily);
}

function renderForecast(daily){
  const box=$('#forecastBody'); if(!box||!daily) return;
  box.innerHTML='';
  const n=daily.time?.length||0;
  for(let i=0;i<n;i++){
    const d=new Date(daily.time[i]);
    const div=document.createElement('div');
    div.className='fc-day'+(i===0?' today':'');
    div.innerHTML=`
      <div class="fc-dow">${i===0?'Dziś':DOW_SHORT[d.getDay()]}</div>
      <div class="fc-icon">${wIcon(daily.weather_code[i])}</div>
      <div class="fc-hi">${Math.round(daily.temperature_2m_max[i])}°</div>
      <div class="fc-lo">${Math.round(daily.temperature_2m_min[i])}°</div>
      ${daily.precipitation_sum[i]>0.1?`<div class="fc-rain">💧${daily.precipitation_sum[i].toFixed(1)}</div>`:'<div></div>'}
    `;
    box.appendChild(div);
  }
}

/* ─── CYTAT DNIA ─────────────────────────────────────── */
const QUOTE_LS='dash_quote_v5';

async function loadQuote(force=false){
  const today=new Date().toDateString();

  // Przy force=false sprawdź czy już jest dzisiejszy cytat
  if(!force){
    try{
      const stored=JSON.parse(localStorage.getItem(QUOTE_LS));
      if(stored?.date===today){ renderQuote(stored); return; }
    }catch{}
  }

  // Zawsze najpierw próbuj zenquotes — /api/random przy force, /api/today przy normalnym
  const endpoint=force ? 'https://zenquotes.io/api/random' : 'https://zenquotes.io/api/today';
  try{
    const res=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(endpoint),
      {cache:'no-store'});
    if(!res.ok) throw new Error();
    const data=await res.json();
    if(!Array.isArray(data)||!data[0]?.q) throw new Error();
    const q={text:data[0].q, author:data[0].a, date:today};
    localStorage.setItem(QUOTE_LS,JSON.stringify(q));
    renderQuote(q);
    return;
  }catch{}

  // Fallback — quotable.io
  try{
    const res=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent('https://api.quotable.io/random'),
      {cache:'no-store'});
    if(!res.ok) throw new Error();
    const data=await res.json();
    if(!data?.content) throw new Error();
    const q={text:data.content, author:data.author, date:today};
    localStorage.setItem(QUOTE_LS,JSON.stringify(q));
    renderQuote(q);
    return;
  }catch{}

  // Ostateczny fallback — statyczne cytaty
  const fallbacks=[
    {text:'Nie ma rzeczy niemożliwych, są tylko trudne.',          author:'Napoleon Bonaparte'},
    {text:'Jedynym sposobem na wielkie dzieła jest miłość do tego, co się robi.', author:'Steve Jobs'},
    {text:'W środku każdej trudności kryje się okazja.',           author:'Albert Einstein'},
    {text:'Sukces to suma małych wysiłków powtarzanych dzień po dniu.', author:'Robert Collier'},
    {text:'Nie liczy się to, ile razy upadłeś, ale ile razy wstałeś.', author:'Vince Lombardi'},
    {text:'Wyobraźnia jest ważniejsza niż wiedza.',                author:'Albert Einstein'},
    {text:'Życie to nie czekanie aż burza minie, lecz nauka tańca w deszczu.', author:'Vivian Greene'},
  ];
  const idx=force ? Math.floor(Math.random()*fallbacks.length) : new Date().getDay()%fallbacks.length;
  const q={...fallbacks[idx], date:today};
  localStorage.setItem(QUOTE_LS,JSON.stringify(q));
  renderQuote(q);
}

function renderQuote(q){
  const t=$('#quoteText'), a=$('#quoteAuthor');
  if(t) t.textContent=q.text||'—';
  if(a) a.textContent=q.author?'— '+q.author:'';
}

/* ─── TODO ────────────────────────────────────────────── */
const TODO_LS='dash_todo_v4';
let todos=[];

function saveTodos(){ localStorage.setItem(TODO_LS,JSON.stringify(todos)); }
function loadTodosLS(){
  try{ todos=JSON.parse(localStorage.getItem(TODO_LS))||[]; }catch{ todos=[]; }
  renderTodos();
}
function renderTodos(){
  const list=$('#todoList'); if(!list) return;
  list.innerHTML='';
  todos.forEach((t,i)=>{
    const li=document.createElement('li'); li.className='todo-item'+(t.done?' done':'');
    const chk=document.createElement('button'); chk.className='todo-check'; chk.title='Ukończ';
    chk.addEventListener('click',()=>{ todos[i].done=!todos[i].done; saveTodos(); renderTodos(); });
    const txt=document.createElement('span'); txt.className='todo-text'; txt.textContent=t.text;
    const del=document.createElement('button'); del.className='todo-del'; del.textContent='✕'; del.title='Usuń';
    del.addEventListener('click',()=>{ todos.splice(i,1); saveTodos(); renderTodos(); });
    li.appendChild(chk); li.appendChild(txt); li.appendChild(del);
    list.appendChild(li);
  });
  const done=todos.filter(t=>t.done).length;
  set('#todoCount',todos.filter(t=>!t.done).length||todos.length);
  set('#todoDone',`${done} ukończonych`);
}
function addTodo(text){
  const t=text.trim(); if(!t) return;
  todos.unshift({text:t,done:false,id:Date.now()});
  saveTodos(); renderTodos();
}
function initTodo(){
  loadTodosLS();
  const input=$('#todoInput'),btn=$('#todoAdd');
  input?.addEventListener('keydown',e=>{ if(e.key==='Enter'){ addTodo(input.value); input.value=''; } });
  btn?.addEventListener('click',()=>{ addTodo(input?.value||''); if(input) input.value=''; });
  $('#todoClear')?.addEventListener('click',()=>{ todos=todos.filter(t=>!t.done); saveTodos(); renderTodos(); });
}

/* ─── FINANSE: USD, EUR, Au ───────────────────────────── */
async function nbpRate(code){
  const res=await fetch(`https://api.nbp.pl/api/exchangerates/rates/A/${code}/?format=json`);
  if(!res.ok) throw new Error('NBP '+res.status);
  const r=(await res.json()).rates?.[0];
  return {mid:r?.mid, effectiveDate:r?.effectiveDate, no:r?.no};
}
async function nbpGold(){
  const res=await fetch('https://api.nbp.pl/api/cenyzlota/last/?format=json');
  if(!res.ok) throw new Error('Gold '+res.status);
  const g=(await res.json())?.[0];
  return {cena:g?.cena, data:g?.data};
}
async function loadFinanse(){
  const [usd,eur,gold]=await Promise.all([
    nbpRate('USD').catch(()=>null),
    nbpRate('EUR').catch(()=>null),
    nbpGold().catch(()=>null)
  ]);
  set('#usdpln', usd?.mid ? usd.mid.toFixed(4) : '—');
  set('#eurpln',  eur?.mid ? eur.mid.toFixed(4) : '—');
  set('#fxDate',  usd?.effectiveDate ? 'NBP · '+usd.effectiveDate : '—');
  set('#fxNo',    eur?.effectiveDate ? 'NBP · '+eur.effectiveDate : '—');
  set('#goldPlnG', gold?.cena!=null ? Number(gold.cena).toFixed(2) : '—');
  set('#goldDate', gold?.data ? 'NBP · '+gold.data : '—');
}

/* ─── PALIWA ──────────────────────────────────────────── */
async function loadFuel(){
  const box=$('#fuelBody'); if(!box) return;
  try{
    const proxy='https://api.allorigins.win/raw?url=';
    const res=await fetch(proxy+encodeURIComponent('https://www.e-petrol.pl/benzyna/srednie-ceny-paliw'));
    if(!res.ok) throw new Error();
    const html=await res.text();
    const prices=parseFuelPrices(html);
    if(!prices.length) throw new Error('no data');
    box.innerHTML=prices.map(p=>`
      <div class="fuel-item">
        <div class="fuel-left">
          <div class="fuel-name">${p.name}</div>
          <div class="fuel-unit">zł/litr · śr. PL</div>
        </div>
        <div class="fuel-price">${p.price}</div>
      </div>`).join('')
      +`<div class="fuel-note">Źródło: e-petrol.pl</div>`;
  }catch{
    box.innerHTML=`
      <div class="fuel-item"><div class="fuel-left"><div class="fuel-name">Pb95</div><div class="fuel-unit">zł/l · est.</div></div><div class="fuel-price">~6.45</div></div>
      <div class="fuel-item"><div class="fuel-left"><div class="fuel-name">Pb98</div><div class="fuel-unit">zł/l · est.</div></div><div class="fuel-price">~7.05</div></div>
      <div class="fuel-item"><div class="fuel-left"><div class="fuel-name">Diesel</div><div class="fuel-unit">zł/l · est.</div></div><div class="fuel-price">~6.55</div></div>
      <div class="fuel-item"><div class="fuel-left"><div class="fuel-name">LPG</div><div class="fuel-unit">zł/l · est.</div></div><div class="fuel-price">~3.05</div></div>
      <div class="fuel-note">⚠ Dane szacunkowe — brak połączenia</div>
    `;
  }
}
function parseFuelPrices(html){
  const prices=[];
  const patterns=[
    {name:'Pb95',  re:/(?:Pb\s*95|benzyna\s*95|E5)[^0-9]*(\d[\d,\.]{3,6})/i},
    {name:'Pb98',  re:/(?:Pb\s*98|benzyna\s*98|E10)[^0-9]*(\d[\d,\.]{3,6})/i},
    {name:'Diesel',re:/(?:olej\s*napędowy|diesel|ON\b)[^0-9]*(\d[\d,\.]{3,6})/i},
    {name:'LPG',   re:/(?:LPG|autogaz)[^0-9]*(\d[\d,\.]{3,6})/i},
  ];
  for(const p of patterns){
    const m=html.match(p.re);
    if(m){ const v=parseFloat(m[1].replace(',','.')); if(v>1&&v<25) prices.push({name:p.name,price:v.toFixed(2)}); }
  }
  return prices;
}

/* ─── RSS / NEWSY ─────────────────────────────────────── */
async function fetchRss(url,limit=10){
  const res=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(url));
  if(!res.ok) throw new Error('RSS '+res.status);
  const doc=new DOMParser().parseFromString(await res.text(),'text/xml');
  return [...doc.querySelectorAll('item')].slice(0,limit).map(it=>({
    title: it.querySelector('title')?.textContent?.trim(),
    link:  it.querySelector('link')?.textContent?.trim(),
    pubDate: it.querySelector('pubDate')?.textContent?.trim()
  }));
}
function renderList(el,items){
  if(!el) return;
  el.innerHTML='';
  if(!items?.length){ el.innerHTML='<li class="item" style="color:var(--muted)">Brak artykułów.</li>'; return; }
  items.forEach(it=>{
    const li=document.createElement('li'); li.className='item';
    const a=document.createElement('a'); a.href=it.link||'#'; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=it.title||'Bez tytułu';
    const meta=document.createElement('div'); meta.className='meta';
    meta.textContent=it.pubDate?new Date(it.pubDate).toLocaleString('pl-PL'):'';
    li.appendChild(a); li.appendChild(meta); el.appendChild(li);
  });
}
async function loadNews(){
  const cfg=window.DASH_CONFIG;
  const [news,sport]=await Promise.all([
    cfg.rss?.news?.[0]?.url  ? fetchRss(cfg.rss.news[0].url, 10).catch(()=>[])  : [],
    cfg.rss?.sport?.[0]?.url ? fetchRss(cfg.rss.sport[0].url,10).catch(()=>[]) : []
  ]);
  renderList($('#listNews'), news);
  renderList($('#listSport'),sport);
}

/* ─── RADIO ───────────────────────────────────────────── */
let audio,hls=null,currentSid=null;
function destroyHls(){ if(hls){try{hls.destroy()}catch{} hls=null;} }

async function resolvePlaylist(url){
  const res=await fetch(url,{cache:'no-store'}); if(!res.ok) throw new Error();
  const text=await res.text();
  const pls=text.match(/File1\s*=\s*(.+)/i); if(pls) return pls[1].trim();
  const m3u=text.split(/\r?\n/).map(l=>l.trim()).find(l=>l&&!l.startsWith('#')); if(m3u) return m3u;
  throw new Error();
}
async function playUrl(url){
  destroyHls();
  if(url.endsWith('.m3u8')&&window.Hls?.isSupported()){
    hls=new window.Hls({enableWorker:true}); hls.loadSource(url); hls.attachMedia(audio);
    await new Promise((ok,fail)=>{
      hls.on(window.Hls.Events.MANIFEST_PARSED,ok);
      hls.on(window.Hls.Events.ERROR,(_,d)=>fail(d?.details||'HLS'));
    });
  } else { audio.src=url; }
  await audio.play();
}
function setNowPlaying(t){ set('#nowPlaying',t); }
function setAudioUI(playing){
  const btn=$('#btnToggle');
  if(btn){ btn.disabled=!currentSid; btn.textContent=playing?'⏸ Pauza':'▶ Wznów'; }
  playing?startViz():stopViz();
}
async function rbServer(){
  try{
    const r=await fetch('https://all.api.radio-browser.info/json/servers');
    const s=await r.json();
    return s?.[0]?.name?`https://${s[0].name}`:'https://de1.api.radio-browser.info';
  }catch{ return 'https://de1.api.radio-browser.info'; }
}
async function rbSearch(base,name,cc){
  const url=`${base}/json/stations/search?name=${encodeURIComponent(name)}`+
    `${cc?'&countrycode='+cc:''}&hidebroken=true&limit=10`;
  const res=await fetch(url); if(!res.ok) throw new Error(); return res.json();
}
function pickBest(results,label){
  if(!results?.length) return null;
  const n=s=>safeText(s).toLowerCase(), t=n(label);
  return results.map(r=>{
    const u=safeText(r.url_resolved||r.url||'');
    let s=u.startsWith('https://')?8:-50;
    if(n(r.name).includes(t)||t.includes(n(r.name))) s+=6;
    if(r.url_resolved)s+=4; if((r.bitrate??0)>=64)s+=2; if((r.bitrate??0)>=128)s+=1; if(r.lastcheckok===1)s+=2;
    return {r,s};
  }).sort((a,b)=>b.s-a.s)[0]?.r||null;
}
function makeStationCard(st){
  const wrap=document.createElement('div'); wrap.className='station'; wrap.dataset.sid=st.sid;
  const left=document.createElement('div'); left.className='left';
  const name=document.createElement('div'); name.className='name'; name.textContent=st.label;
  const sub=document.createElement('div'); sub.className='sub'; sub.textContent=st.hint;
  left.appendChild(name); left.appendChild(sub);
  const btn=document.createElement('button'); btn.className='play'; btn.textContent='▶'; btn.title='Graj';
  btn.addEventListener('click',()=>playStation(st.sid,st.label,st.url));
  wrap.appendChild(left); wrap.appendChild(btn); return wrap;
}
function markActive(sid){ $$('.station').forEach(el=>el.classList.toggle('active',el.dataset.sid===sid)); }
async function playStation(sid,label,url){
  try{
    currentSid=sid; markActive(sid);
    await playUrl(url); setNowPlaying('▶ '+label); setAudioUI(true);
  }catch(e){ console.warn(e); setNowPlaying('⚠ Nie udało się: '+label); setAudioUI(false); }
}
function stopRadio(){
  destroyHls(); audio.pause(); audio.removeAttribute('src'); audio.load();
  currentSid=null; markActive('__x__'); setNowPlaying('Nie gra'); setAudioUI(false);
}
function toggleRadio(){
  if(!currentSid) return;
  audio.paused ? audio.play().then(()=>setAudioUI(true)).catch(()=>setAudioUI(false))
               : (audio.pause(), setAudioUI(false));
}
async function loadStations(){
  const cfg=window.DASH_CONFIG, box=$('#stations'); if(!box) return;
  box.innerHTML=''; const server=await rbServer();
  for(const [idx,s] of (cfg.stations??[]).entries()){
    let url='',hint='';
    if(s.directUrl){url=s.directUrl;hint='stream';}
    else if(s.playlistUrl){try{url=await resolvePlaylist(s.playlistUrl);hint='playlista';}catch{}}
    if(!url&&s.fallbackUrl){url=s.fallbackUrl;hint='fallback';}
    try{
      const best=pickBest(await rbSearch(server,s.query,s.countrycode),s.label);
      if(best?.url_resolved?.startsWith('https://')){url=best.url_resolved;hint=`${safeText(best.codec||'audio')} · ${best.bitrate||'?'} kbps`;}
    }catch{}
    const card=makeStationCard({sid:`st_${idx}`,label:s.label,url,hint:url?hint:'brak URL'});
    if(!url){const pb=card.querySelector('.play');if(pb){pb.disabled=true;pb.textContent='—';}}
    box.appendChild(card);
  }
}

/* ─── SKRÓTY ──────────────────────────────────────────── */
function loadQuicklinks(){
  const box=$('#quicklinks'); if(!box) return; box.innerHTML='';
  (window.DASH_CONFIG?.quicklinks??[]).forEach(l=>{
    const a=document.createElement('a'); a.className='link';
    a.href=l.url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=l.title;
    const sp=document.createElement('span'); sp.textContent=l.subtitle||'';
    a.appendChild(sp); box.appendChild(a);
  });
}

/* ─── GRIDSTACK ───────────────────────────────────────── */
const LS_KEY='dash_layout_v5', LS_HIDDEN='dash_hidden_v5';

const DEFAULT_LAYOUT=[
  {id:'weather',  x:0,  y:0,  w:4, h:5},
  {id:'forecast', x:4,  y:0,  w:5, h:5},
  {id:'quote',    x:9,  y:0,  w:3, h:5},
  {id:'todo',     x:0,  y:5,  w:3, h:5},
  {id:'finanse',  x:3,  y:5,  w:3, h:5},
  {id:'fuel',     x:6,  y:5,  w:3, h:5},
  {id:'links',    x:9,  y:5,  w:3, h:5},
  {id:'radio',    x:0,  y:10, w:6, h:5},
  {id:'news',     x:6,  y:10, w:6, h:5},
];

let grid;
function saveLayout(){
  const items=grid.save(false).map(item=>({
    id:item.el?.dataset?.widget||item.id, x:item.x,y:item.y,w:item.w,h:item.h
  }));
  localStorage.setItem(LS_KEY,JSON.stringify(items));
}
function loadLayout(){ try{return JSON.parse(localStorage.getItem(LS_KEY));}catch{return null;} }
function saveHidden(s){ localStorage.setItem(LS_HIDDEN,JSON.stringify([...s])); }
function loadHidden(){ try{return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN))||[]);}catch{return new Set();} }
function applyLayout(layout){
  layout?.forEach(pos=>{
    const el=$(`.grid-stack-item[data-widget="${pos.id}"]`);
    if(el) grid.update(el,{x:pos.x,y:pos.y,w:pos.w,h:pos.h});
  });
}
function hideWidget(wid){
  const el=$(`.grid-stack-item[data-widget="${wid}"]`);
  if(el){ grid.removeWidget(el,false); el.style.display='none'; }
  $(`.vis-btn[data-widget="${wid}"]`)?.classList.remove('active');
}
function showWidget(wid){
  const el=$(`.grid-stack-item[data-widget="${wid}"]`);
  if(!el) return; el.style.display=''; grid.makeWidget(el);
  $(`.vis-btn[data-widget="${wid}"]`)?.classList.add('active');
}

let editMode=false;
function setEditMode(on){
  editMode=on;
  document.body.classList.toggle('edit-mode',on);
  $('#editToggle')?.classList.toggle('active',on);
  $('#visibilityPanel')?.classList.toggle('open',on);
  grid.setStatic(!on);
  if(!on) saveLayout();
}

/* ─── INIT ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  audio=$('#audio');

  // GridStack — cellHeight 72px żeby kafelki h=5 miały ok. 360px
  grid=GridStack.init({
    column:12, cellHeight:72, minRow:1, margin:8,
    handle:'.drag-handle', resizable:{handles:'se'}, static:true
  },'#grid');

  applyLayout(loadLayout());
  loadHidden().forEach(wid=>hideWidget(wid));
  grid.on('change',()=>{ if(editMode) saveLayout(); });

  // Tryb edycji
  $('#editToggle')?.addEventListener('click',()=>setEditMode(!editMode));

  // Reset układu
  $('#resetLayout')?.addEventListener('click',()=>{
    $$('.grid-stack-item').forEach(el=>{
      if(el.style.display==='none'){ el.style.display=''; grid.makeWidget(el); }
    });
    DEFAULT_LAYOUT.forEach(p=>{
      const el=$(`.grid-stack-item[data-widget="${p.id}"]`);
      if(el) grid.update(el,{x:p.x,y:p.y,w:p.w,h:p.h});
    });
    $$('.vis-btn').forEach(b=>b.classList.add('active'));
    localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_HIDDEN);
    saveLayout();
  });

  // Ukrywanie kafelków
  $$('.card-hide-btn').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const w=btn.dataset.widget;
      hideWidget(w);
      const h=loadHidden(); h.add(w); saveHidden(h);
    });
  });

  // Przełączniki widoczności
  $$('.vis-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const w=btn.dataset.widget;
      const el=$(`.grid-stack-item[data-widget="${w}"]`);
      const hidden=!el||el.style.display==='none';
      if(hidden){ showWidget(w); const h=loadHidden(); h.delete(w); saveHidden(h); }
      else       { hideWidget(w); const h=loadHidden(); h.add(w); saveHidden(h); }
      btn.classList.toggle('active',hidden);
    });
  });

  // Radio
  $('#btnStop')?.addEventListener('click',stopRadio);
  $('#btnToggle')?.addEventListener('click',toggleRadio);
  $('#vol')?.addEventListener('input',e=>{ if(audio) audio.volume=Number(e.target.value); });
  if(audio){
    if($('#vol')) audio.volume=Number($('#vol').value);
    audio.addEventListener('play', ()=>setAudioUI(true));
    audio.addEventListener('pause',()=>setAudioUI(false));
  }

  // Cytat — odświeżanie
  $('#refreshQuote')?.addEventListener('click',()=>{
    const t=$('#quoteText'), a=$('#quoteAuthor');
    if(t) t.textContent='Ładowanie…';
    if(a) a.textContent='';
    loadQuote(true);
  });

  // Setup
  setTabs(); buildViz(); loadQuicklinks();
  setClock(); setInterval(setClock,1000);

  // Ładowanie danych
  loadWeather().catch(e=>{ console.warn('Pogoda:',e); set('#weatherDesc','⚠ brak danych'); });
  loadQuote(false).catch(e=>console.warn('Cytat:',e));
  initTodo();
  loadFinanse().catch(e=>console.warn('Finanse:',e));
  loadFuel().catch(e=>console.warn('Paliwo:',e));
  loadNews().catch(e=>console.warn('Newsy:',e));
  loadStations().catch(e=>console.warn('Radio:',e));

  // Odświeżanie cykliczne
  setInterval(()=>loadWeather().catch(()=>{}),     10*60*1000);
  setInterval(()=>loadFinanse().catch(()=>{}),     60*60*1000);
  setInterval(()=>loadFuel().catch(()=>{}),        60*60*1000);
  setInterval(()=>loadNews().catch(()=>{}),        20*60*1000);
});
