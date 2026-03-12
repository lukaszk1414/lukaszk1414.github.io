/* =====================================================================
   DASHBOARD v4 — app.js
   Nowe moduły: Prognoza 7 dni, AQI (GIOŚ), Cytat dnia,
                ToDo (localStorage), Trasa do pracy, Ceny paliw
   ===================================================================== */

const $  = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

/* ─── helpers ────────────────────────────────────────── */
function pad2(n){ return String(n).padStart(2,'0'); }
function safeText(s){ return (s??'').toString(); }
function set(id, v){ const e=$(id); if(e) e.textContent=v; }
function timeAgo(iso){
  if(!iso) return '';
  const d = Math.max(0, Math.round((Date.now()-new Date(iso).getTime())/60000));
  if(d<1) return 'teraz'; if(d<60) return d+' min temu';
  return Math.round(d/60)+' h temu';
}
function formatPLDate(d){
  const days   = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];
  const months = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
const DOW_SHORT = ['Nd','Pn','Wt','Śr','Cz','Pt','Sb'];

/* ─── clock ──────────────────────────────────────────── */
function setClock(){
  const now = new Date();
  set('#time', `${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
  set('#date', formatPLDate(now));
  set('#subtitle', `Dziś jest ${formatPLDate(now)}`);
}

/* ─── tabs ───────────────────────────────────────────── */
function setTabs(){
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.closest('[role=tablist]')||btn.parentElement;
      list.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const panel = $('#panel-'+btn.dataset.tab);
      panel?.closest('.tabpanels')?.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      panel?.classList.add('active');
    });
  });
}

/* ─── visualizer ─────────────────────────────────────── */
function buildViz(){
  const wrap=$('#vizWrap'); if(!wrap) return; wrap.innerHTML='';
  [8,14,22,18,26,12,20,28,16,24,10,22,18,26,12,20,14,8].forEach((h,i)=>{
    const b=document.createElement('div'); b.className='viz-bar';
    b.style.setProperty('--h',h+'px');
    b.style.setProperty('--d',(0.5+Math.random()*.7).toFixed(2)+'s');
    b.style.animationDelay=(i*.04).toFixed(2)+'s'; b.style.height='3px';
    wrap.appendChild(b);
  });
}
function startViz(){ $('#vizWrap')?.classList.add('active'); }
function stopViz() { $('#vizWrap')?.classList.remove('active'); }

/* ─── WEATHER ────────────────────────────────────────── */
function wCode(code){
  return ({0:'☀️ bezchmurnie',1:'🌤 pogodnie',2:'⛅ częściowe zachmurzenie',3:'☁️ pochmurno',
    45:'🌫 mgła',51:'🌦 mżawka',53:'🌦 mżawka',55:'🌦 mżawka',
    61:'🌧 deszcz',63:'🌧 deszcz',65:'⛈ ulewa',71:'🌨 śnieg',73:'🌨 śnieg',75:'❄️ intensywny śnieg',
    80:'🌦 przelotny deszcz',82:'⛈ silny deszcz',95:'⛈ burza'
  })[Number(code)]||'—';
}
function wIcon(code){
  return ({0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',51:'🌦',53:'🌦',55:'🌦',
    61:'🌧',63:'🌧',65:'⛈',71:'🌨',73:'🌨',75:'❄️',80:'🌦',82:'⛈',95:'⛈'
  })[Number(code)]||'🌡️';
}

async function loadWeather(){
  const cfg=window.DASH_CONFIG;
  set('#weatherPlace', cfg.placeLabel);
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${cfg.lat}&longitude=${cfg.lon}`+
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`+
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum`+
    `&timezone=Europe%2FWarsaw&forecast_days=7`
  );
  if(!res.ok) throw new Error('Weather '+res.status);
  const data = await res.json();
  const c = data.current||{};
  set('#temp',           (c.temperature_2m??'—')+'°');
  set('#apparent',       (c.apparent_temperature??'—')+'°');
  set('#wind',           (c.wind_speed_10m??'—')+' km/h');
  set('#precip',         (c.precipitation??'—')+' mm');
  set('#weatherDesc',    wCode(c.weather_code));
  set('#weatherUpdated', timeAgo(c.time)||'—');

  // prognoza 7 dni
  renderForecast(data.daily);
}

function renderForecast(daily){
  const box=$('#forecastBody'); if(!box||!daily) return;
  box.innerHTML='';
  const today = new Date().getDay();
  const n = daily.time?.length||0;
  for(let i=0;i<n;i++){
    const d   = new Date(daily.time[i]);
    const isT = i===0;
    const div = document.createElement('div');
    div.className='fc-day'+(isT?' today':'');
    div.innerHTML=`
      <div class="fc-dow">${isT?'Dziś':DOW_SHORT[d.getDay()]}</div>
      <div class="fc-icon">${wIcon(daily.weather_code[i])}</div>
      <div class="fc-hi">${Math.round(daily.temperature_2m_max[i])}°</div>
      <div class="fc-lo">${Math.round(daily.temperature_2m_min[i])}°</div>
      ${daily.precipitation_sum[i]>0.1?`<div class="fc-rain">💧${daily.precipitation_sum[i].toFixed(1)}</div>`:''}
    `;
    box.appendChild(div);
  }
}

/* ─── AQI (GIOŚ) ─────────────────────────────────────── */
async function loadAqi(){
  const cfg = window.DASH_CONFIG;
  const stId = cfg.aqi_station_id||114;
  const proxy = 'https://api.allorigins.win/raw?url=';

  // Pobierz indeks AQI
  const [idxRes, sensRes] = await Promise.all([
    fetch(proxy+encodeURIComponent(`https://api.gios.gov.pl/pjp-api/rest/aqindex/getIndex/${stId}`)),
    fetch(proxy+encodeURIComponent(`https://api.gios.gov.pl/pjp-api/rest/data/getData/${stId}`))
  ]);

  const box=$('#aqiBody'); if(!box) return;

  if(!idxRes.ok){ box.innerHTML='<div class="loading-msg">⚠ Brak danych GIOŚ</div>'; return; }
  const idx = await idxRes.json();
  const level   = idx?.stIndexLevel?.indexLevelName||'—';
  const calcDate= idx?.stCalcDate||'';

  // Pobierz sensory stacji
  let sensors=[];
  try{
    const stRes = await fetch(proxy+encodeURIComponent(`https://api.gios.gov.pl/pjp-api/rest/station/sensors/${stId}`));
    sensors = stRes.ok ? await stRes.json() : [];
  }catch{}

  const cls = aqiClass(level);
  const aqiNum = aqiLevelToNum(level);

  let sensorsHtml='';
  // Pobierz wartości sensorów (max 4)
  const top4 = sensors.slice(0,4);
  for(const s of top4){
    try{
      const dRes = await fetch(proxy+encodeURIComponent(`https://api.gios.gov.pl/pjp-api/rest/data/getData/${s.id}`));
      if(!dRes.ok) continue;
      const dData = await dRes.json();
      const vals  = dData?.values||[];
      const last  = vals.find(v=>v.value!=null);
      if(!last) continue;
      const name = s?.param?.paramName||s?.param?.paramCode||'?';
      const code = s?.param?.paramCode||'';
      sensorsHtml += `
        <div class="aqi-sensor">
          <div class="aqi-sensor-name">${code}</div>
          <div class="aqi-sensor-value">${Number(last.value).toFixed(1)} µg/m³</div>
        </div>`;
    }catch{}
  }

  box.innerHTML=`
    <div class="aqi-main">
      <div class="aqi-index ${cls}">${aqiNum}</div>
      <div>
        <div class="aqi-info-label">Jakość powietrza</div>
        <div class="aqi-info-val" style="color:var(--aqi-col)">${aqiLevelPL(level)}</div>
        <div class="aqi-station">${calcDate?'Aktualizacja: '+calcDate.slice(0,16):''}</div>
      </div>
    </div>
    ${sensorsHtml?`<div class="aqi-sensors">${sensorsHtml}</div>`:''}
  `;

  // dynamiczny kolor
  const colorMap={good:'#4fffb0',moderate:'#ffd93d','unhealthy-s':'#ff9a3c',unhealthy:'#ff6b6b','very-un':'#c678dd',hazardous:'#be5046'};
  box.style.setProperty('--aqi-col', colorMap[cls]||'#e8eaf0');
}

function aqiClass(level){
  const l=(level||'').toLowerCase();
  if(l.includes('bardzo dobry')||l.includes('good')) return 'good';
  if(l.includes('dobry')||l.includes('moderate')) return 'moderate';
  if(l.includes('dostateczny')||l.includes('unhealthy for')) return 'unhealthy-s';
  if(l.includes('zły')||l.includes('unhealthy')) return 'unhealthy';
  if(l.includes('bardzo zły')) return 'very-un';
  if(l.includes('niebezpieczny')||l.includes('hazardous')) return 'hazardous';
  return 'moderate';
}
function aqiLevelToNum(level){
  const l=(level||'').toLowerCase();
  if(l.includes('bardzo dobry')) return '😊';
  if(l.includes('dobry'))        return '🙂';
  if(l.includes('dostateczny'))  return '😐';
  if(l.includes('zły'))          return '😷';
  if(l.includes('bardzo zły'))   return '🤢';
  if(l.includes('niebezpieczny'))return '☠️';
  return '—';
}
function aqiLevelPL(level){
  if(!level||level==='—') return '—';
  const map={'Bardzo dobry':'Bardzo dobry ✅','Dobry':'Dobry 👍','Dostateczny':'Dostateczny ⚠️',
             'Zły':'Zły 😷','Bardzo zły':'Bardzo zły 🤢','Niebezpieczny':'Niebezpieczny ☠️'};
  return map[level]||level;
}

/* ─── CYTAT DNIA ─────────────────────────────────────── */
const QUOTE_LS = 'dash_quote_v4';

async function loadQuote(force=false){
  const stored = localStorage.getItem(QUOTE_LS);
  const today  = new Date().toDateString();

  if(!force && stored){
    const q = JSON.parse(stored);
    if(q.date===today){ renderQuote(q); return; }
  }

  try{
    // ZenQuotes — bez klucza, CORS przez proxy
    const res = await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent('https://zenquotes.io/api/today'));
    if(!res.ok) throw new Error();
    const data = await res.json();
    const q = { text: data[0].q, author: data[0].a, date: today };
    localStorage.setItem(QUOTE_LS, JSON.stringify(q));
    renderQuote(q);
  }catch{
    // fallback — statyczne cytaty po polsku
    const fallbacks=[
      {text:'Nie ma rzeczy niemożliwych, są tylko trudne.', author:'Napoleon Bonaparte'},
      {text:'Jedynym sposobem na wielkie dzieła jest miłość do tego, co się robi.', author:'Steve Jobs'},
      {text:'W środku każdej trudności kryje się okazja.', author:'Albert Einstein'},
      {text:'Sukces to suma małych wysiłków, powtarzanych dzień po dniu.', author:'Robert Collier'},
      {text:'Nie liczy się to, ile razy upadłeś, ale ile razy wstałeś.', author:'Vince Lombardi'},
    ];
    const q = {...fallbacks[new Date().getDay()%fallbacks.length], date:today};
    localStorage.setItem(QUOTE_LS, JSON.stringify(q));
    renderQuote(q);
  }
}

function renderQuote(q){
  const t=$('#quoteText'), a=$('#quoteAuthor');
  if(t) t.textContent = q.text||'—';
  if(a) a.textContent = q.author ? '— '+q.author : '';
}

/* ─── TODO ───────────────────────────────────────────── */
const TODO_LS = 'dash_todo_v4';
let todos = [];

function saveTodos(){ localStorage.setItem(TODO_LS, JSON.stringify(todos)); }
function loadTodos(){
  try{ todos=JSON.parse(localStorage.getItem(TODO_LS))||[]; }catch{ todos=[]; }
  renderTodos();
}

function renderTodos(){
  const list=$('#todoList'); if(!list) return;
  list.innerHTML='';
  todos.forEach((t,i)=>{
    const li=document.createElement('li'); li.className='todo-item'+(t.done?' done':'');
    const chk=document.createElement('button'); chk.className='todo-check'; chk.title='Ukończ';
    if(t.done) chk.style.cssText='background:var(--accent);border-color:var(--accent)';
    chk.addEventListener('click',()=>{ todos[i].done=!todos[i].done; saveTodos(); renderTodos(); });

    const txt=document.createElement('span'); txt.className='todo-text'; txt.textContent=t.text;

    const del=document.createElement('button'); del.className='todo-del'; del.textContent='✕'; del.title='Usuń';
    del.addEventListener('click',()=>{ todos.splice(i,1); saveTodos(); renderTodos(); });

    li.appendChild(chk); li.appendChild(txt); li.appendChild(del);
    list.appendChild(li);
  });
  const done=todos.filter(t=>t.done).length;
  const remain=todos.filter(t=>!t.done).length;
  set('#todoCount', remain||todos.length);
  set('#todoDone', `${done} ukończonych`);
}

function addTodo(text){
  const t=text.trim(); if(!t) return;
  todos.unshift({text:t, done:false, id:Date.now()});
  saveTodos(); renderTodos();
}

function initTodo(){
  loadTodos();
  const input=$('#todoInput'), btn=$('#todoAdd');
  input?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ addTodo(input.value); input.value=''; } });
  btn?.addEventListener('click',()=>{ addTodo(input?.value||''); if(input) input.value=''; });
  $('#todoClear')?.addEventListener('click',()=>{ todos=todos.filter(t=>!t.done); saveTodos(); renderTodos(); });
}

/* ─── TRASA DO PRACY ─────────────────────────────────── */
const COMMUTE_LS='dash_commute_v4';

function initCommute(){
  const stored=localStorage.getItem(COMMUTE_LS);
  if(stored){
    const c=JSON.parse(stored);
    const oi=$('#commuteOrigin'), di=$('#commuteDestination');
    if(oi) oi.value=c.origin||'';
    if(di) di.value=c.destination||'';
    if(c.origin&&c.destination) showCommuteMap(c.origin,c.destination);
  } else {
    // użyj wartości z config.js jeśli są
    const cfg=window.DASH_CONFIG;
    if(cfg.commute_origin&&cfg.commute_destination){
      const oi=$('#commuteOrigin'), di=$('#commuteDestination');
      if(oi) oi.value=cfg.commute_origin;
      if(di) di.value=cfg.commute_destination;
      showCommuteMap(cfg.commute_origin,cfg.commute_destination);
    }
  }

  $('#commuteSave')?.addEventListener('click',()=>{
    const o=$('#commuteOrigin')?.value?.trim();
    const d=$('#commuteDestination')?.value?.trim();
    if(!o||!d){ alert('Podaj obie lokalizacje.'); return; }
    localStorage.setItem(COMMUTE_LS, JSON.stringify({origin:o,destination:d}));
    showCommuteMap(o,d);
  });

  $('#commuteChange')?.addEventListener('click',()=>{
    $('#commuteMapWrap').style.display='none';
    $('#commuteSetup').style.display='flex';
  });
}

function showCommuteMap(origin, destination){
  const frame=$('#commuteFrame');
  if(!frame) return;
  const src=`https://www.google.com/maps/embed/v1/directions?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`+
    `&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`+
    `&mode=driving&language=pl`;
  // Uwaga: powyższy klucz to demo — wygasa. Podaj własny w config.js jako maps_api_key
  const cfg=window.DASH_CONFIG;
  const apiKey=cfg.maps_api_key||'AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY';
  frame.src=`https://www.google.com/maps/embed/v1/directions?key=${apiKey}`+
    `&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`+
    `&mode=driving&language=pl`;

  $('#commuteSetup').style.display='none';
  $('#commuteMapWrap').style.display='flex';
  $('#commuteMapWrap').style.flexDirection='column';
  $('#commuteMapWrap').style.flex='1';
}

/* ─── CENY PALIW ─────────────────────────────────────── */
async function loadFuel(){
  const box=$('#fuelBody'); if(!box) return;
  try{
    // e-petrol.pl udostępnia dane przez allorigins
    const proxy='https://api.allorigins.win/raw?url=';
    const url='https://www.e-petrol.pl/benzyna/srednie-ceny-paliw';
    const res=await fetch(proxy+encodeURIComponent(url));
    if(!res.ok) throw new Error('fuel '+res.status);
    const html=await res.text();
    const doc=new DOMParser().parseFromString(html,'text/html');

    // parsuj tabelę z cenami
    const rows=[...doc.querySelectorAll('table tr, .fuel-price, [class*="price"]')];
    const prices=parseFuelPrices(html);

    if(!prices.length) throw new Error('no data');

    box.innerHTML=prices.map(p=>`
      <div class="fuel-item">
        <div class="fuel-name">${p.name}</div>
        <div class="fuel-price">${p.price}</div>
        <div class="fuel-unit">zł/litr · PL śr.</div>
      </div>`).join('')
      +`<div class="fuel-note">Źródło: e-petrol.pl · średnia krajowa</div>`;
  }catch{
    // Fallback — statyczne dane orientacyjne ze znacznikiem
    box.innerHTML=`
      <div class="fuel-item"><div class="fuel-name">Pb95</div><div class="fuel-price">~6.45</div><div class="fuel-unit">zł/l · est.</div></div>
      <div class="fuel-item"><div class="fuel-name">Pb98</div><div class="fuel-price">~7.05</div><div class="fuel-unit">zł/l · est.</div></div>
      <div class="fuel-item"><div class="fuel-name">ON</div><div class="fuel-price">~6.55</div><div class="fuel-unit">zł/l · est.</div></div>
      <div class="fuel-item"><div class="fuel-name">LPG</div><div class="fuel-price">~3.05</div><div class="fuel-unit">zł/l · est.</div></div>
      <div class="fuel-note">⚠ Brak połączenia — dane szacunkowe. Sprawdź e-petrol.pl</div>
    `;
  }
}

function parseFuelPrices(html){
  // Próbuj wyciągnąć ceny z HTML e-petrol — szukamy wzorców cenowych
  const prices=[];
  const patterns=[
    { name:'Pb95', re:/(?:Pb\s*95|benzyna\s*95|E5)[^0-9]*(\d[\d,\.]{3,6})/i },
    { name:'Pb98', re:/(?:Pb\s*98|benzyna\s*98|E10)[^0-9]*(\d[\d,\.]{3,6})/i },
    { name:'ON',   re:/(?:olej\s*napędowy|diesel|ON\b)[^0-9]*(\d[\d,\.]{3,6})/i },
    { name:'LPG',  re:/(?:LPG|autogaz)[^0-9]*(\d[\d,\.]{3,6})/i },
  ];
  for(const p of patterns){
    const m=html.match(p.re);
    if(m){
      const raw=m[1].replace(',','.');
      const val=parseFloat(raw);
      if(val>1&&val<25) prices.push({name:p.name, price:val.toFixed(2)});
    }
  }
  return prices;
}

/* ─── RSS ────────────────────────────────────────────── */
async function fetchRss(url, limit=8){
  const res=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(url));
  if(!res.ok) throw new Error('RSS '+res.status);
  const doc=new DOMParser().parseFromString(await res.text(),'text/xml');
  return [...doc.querySelectorAll('item')].slice(0,limit).map(it=>({
    title:   it.querySelector('title')?.textContent?.trim(),
    link:    it.querySelector('link')?.textContent?.trim(),
    pubDate: it.querySelector('pubDate')?.textContent?.trim()
  }));
}

function renderList(el, items){
  if(!el) return;
  el.innerHTML='';
  if(!items?.length){ el.innerHTML='<li class="item" style="color:var(--muted)">Brak artykułów.</li>'; return; }
  items.forEach(it=>{
    const li=document.createElement('li'); li.className='item';
    const a=document.createElement('a'); a.href=it.link||'#'; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=it.title||'Bez tytułu';
    const meta=document.createElement('div'); meta.className='meta'; meta.textContent=it.pubDate?new Date(it.pubDate).toLocaleString('pl-PL'):'';
    li.appendChild(a); li.appendChild(meta); el.appendChild(li);
  });
}

async function loadNews(){
  const cfg=window.DASH_CONFIG;
  const [news,sport]=await Promise.all([
    cfg.rss?.news?.[0]?.url  ? fetchRss(cfg.rss.news[0].url,  8).catch(()=>[]) : [],
    cfg.rss?.sport?.[0]?.url ? fetchRss(cfg.rss.sport[0].url, 8).catch(()=>[]) : []
  ]);
  renderList($('#listNews'),  news);
  renderList($('#listSport'), sport);
}

/* ─── FX + metals ────────────────────────────────────── */
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
async function stooq(sym){
  const p='https://api.allorigins.win/raw?url='+encodeURIComponent(`https://stooq.com/q/d/l/?s=${sym}&i=d`);
  const res=await fetch(p); if(!res.ok) throw new Error('Stooq');
  const lines=(await res.text()).trim().split('\n');
  return Number(lines[lines.length-1].split(',')[4]);
}
async function loadFxAndMetals(){
  const [usd,eur,gold]=await Promise.all([nbpRate('USD').catch(()=>null),nbpRate('EUR').catch(()=>null),nbpGold().catch(()=>null)]);
  set('#usdpln', usd?.mid?usd.mid.toFixed(4):'—');
  set('#eurpln',  eur?.mid?eur.mid.toFixed(4):'—');
  set('#fxDate',  usd?.effectiveDate?'Data: '+usd.effectiveDate:'—');
  set('#fxNo',    usd?.no?'Tabela: '+usd.no:'—');
  set('#goldPlnG',  gold?.cena!=null?Number(gold.cena).toFixed(2):'—');
  set('#goldDate',  gold?.data?'Data: '+gold.data:'—');
  try{ const x=await stooq('xagusd'); set('#silverPlnOz',(x&&usd?.mid)?(x*usd.mid).toFixed(2):'—'); }catch{ set('#silverPlnOz','—'); }
}

/* ─── RADIO ──────────────────────────────────────────── */
let audio, hls=null, currentSid=null;
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
  if(btn){btn.disabled=!currentSid; btn.textContent=playing?'⏸ Pauza':'▶ Wznów';}
  playing?startViz():stopViz();
}
async function rbServer(){
  try{ const r=await fetch('https://all.api.radio-browser.info/json/servers'); const s=await r.json(); return s?.[0]?.name?`https://${s[0].name}`:'https://de1.api.radio-browser.info'; }
  catch{return 'https://de1.api.radio-browser.info';}
}
async function rbSearch(base,name,cc){
  const url=`${base}/json/stations/search?name=${encodeURIComponent(name)}${cc?'&countrycode='+cc:''}&hidebroken=true&limit=10`;
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
  try{ currentSid=sid; markActive(sid); await playUrl(url); setNowPlaying('▶ '+label); setAudioUI(true); }
  catch(e){ console.warn(e); setNowPlaying('⚠ Nie udało się: '+label); setAudioUI(false); }
}
function stopRadio(){ destroyHls(); audio.pause(); audio.removeAttribute('src'); audio.load(); currentSid=null; markActive('__x__'); setNowPlaying('Nie gra'); setAudioUI(false); }
function toggleRadio(){ if(!currentSid) return; audio.paused?audio.play().then(()=>setAudioUI(true)).catch(()=>setAudioUI(false)):(audio.pause(),setAudioUI(false)); }
async function loadStations(){
  const cfg=window.DASH_CONFIG, box=$('#stations'); if(!box) return;
  box.innerHTML=''; const server=await rbServer();
  for(const [idx,s] of (cfg.stations??[]).entries()){
    let url='', hint='';
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

/* ─── quicklinks ─────────────────────────────────────── */
function loadQuicklinks(){
  const box=$('#quicklinks'); if(!box) return; box.innerHTML='';
  (window.DASH_CONFIG?.quicklinks??[]).forEach(l=>{
    const a=document.createElement('a'); a.className='link'; a.href=l.url; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent=l.title;
    const sp=document.createElement('span'); sp.textContent=l.subtitle||''; a.appendChild(sp); box.appendChild(a);
  });
}

/* ─── GRIDSTACK ──────────────────────────────────────── */
const LS_KEY='dash_layout_v4', LS_HIDDEN='dash_hidden_v4';
const DEFAULT_LAYOUT=[
  {id:'weather', x:0,  y:0, w:3, h:4},
  {id:'forecast',x:3,  y:0, w:5, h:4},
  {id:'aqi',     x:8,  y:0, w:2, h:4},
  {id:'quote',   x:10, y:0, w:2, h:4},
  {id:'todo',    x:0,  y:4, w:3, h:4},
  {id:'fx',      x:3,  y:4, w:3, h:4},
  {id:'metals',  x:6,  y:4, w:3, h:4},
  {id:'fuel',    x:9,  y:4, w:3, h:4},
  {id:'radio',   x:0,  y:8, w:4, h:4},
  {id:'links',   x:4,  y:8, w:4, h:4},
  {id:'news',    x:8,  y:8, w:4, h:4},
];

let grid;
function saveLayout(){
  const items=grid.save(false).map(item=>({id:item.el?.dataset?.widget||item.id, x:item.x,y:item.y,w:item.w,h:item.h}));
  localStorage.setItem(LS_KEY,JSON.stringify(items));
}
function loadLayout(){ try{return JSON.parse(localStorage.getItem(LS_KEY));}catch{return null;} }
function saveHidden(s){ localStorage.setItem(LS_HIDDEN,JSON.stringify([...s])); }
function loadHidden(){ try{return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN))||[]);}catch{return new Set();} }
function applyLayout(layout){ layout?.forEach(pos=>{ const el=$(`.grid-stack-item[data-widget="${pos.id}"]`); if(el) grid.update(el,{x:pos.x,y:pos.y,w:pos.w,h:pos.h}); }); }
function hideWidget(wid){ const el=$(`.grid-stack-item[data-widget="${wid}"]`); if(el){grid.removeWidget(el,false);el.style.display='none';} $(`.vis-btn[data-widget="${wid}"]`)?.classList.remove('active'); }
function showWidget(wid){ const el=$(`.grid-stack-item[data-widget="${wid}"]`); if(!el) return; el.style.display=''; grid.makeWidget(el); $(`.vis-btn[data-widget="${wid}"]`)?.classList.add('active'); }

let editMode=false;
function setEditMode(on){
  editMode=on;
  document.body.classList.toggle('edit-mode',on);
  $('#editToggle')?.classList.toggle('active',on);
  $('#visibilityPanel')?.classList.toggle('open',on);
  grid.setStatic(!on);
  if(!on) saveLayout();
}

/* ─── INIT ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded',()=>{
  audio=$('#audio');

  // GridStack
  grid=GridStack.init({column:12,cellHeight:60,minRow:1,margin:7,handle:'.drag-handle',resizable:{handles:'se'},static:true},'#grid');
  applyLayout(loadLayout());
  loadHidden().forEach(wid=>hideWidget(wid));
  grid.on('change',()=>{ if(editMode) saveLayout(); });

  // Edit mode
  $('#editToggle')?.addEventListener('click',()=>setEditMode(!editMode));

  // Reset
  $('#resetLayout')?.addEventListener('click',()=>{
    $$('.grid-stack-item').forEach(el=>{ if(el.style.display==='none'){el.style.display='';grid.makeWidget(el);} });
    DEFAULT_LAYOUT.forEach(p=>{ const el=$(`.grid-stack-item[data-widget="${p.id}"]`); if(el) grid.update(el,{x:p.x,y:p.y,w:p.w,h:p.h}); });
    $$('.vis-btn').forEach(b=>b.classList.add('active'));
    localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_HIDDEN);
    saveLayout();
  });

  // Hide buttons
  $$('.card-hide-btn').forEach(btn=>{ btn.addEventListener('click',e=>{ e.stopPropagation(); const w=btn.dataset.widget; hideWidget(w); const h=loadHidden(); h.add(w); saveHidden(h); }); });

  // Visibility toggles
  $$('.vis-btn').forEach(btn=>{ btn.addEventListener('click',()=>{ const w=btn.dataset.widget; const el=$(`.grid-stack-item[data-widget="${w}"]`); const hidden=!el||el.style.display==='none'; if(hidden){showWidget(w);const h=loadHidden();h.delete(w);saveHidden(h);}else{hideWidget(w);const h=loadHidden();h.add(w);saveHidden(h);} btn.classList.toggle('active',hidden); }); });

  // Radio
  $('#btnStop')?.addEventListener('click',stopRadio);
  $('#btnToggle')?.addEventListener('click',toggleRadio);
  $('#vol')?.addEventListener('input',e=>{if(audio) audio.volume=Number(e.target.value);});
  if(audio){ if($('#vol')) audio.volume=Number($('#vol').value); audio.addEventListener('play',()=>setAudioUI(true)); audio.addEventListener('pause',()=>setAudioUI(false)); }

  // Quote refresh
  $('#refreshQuote')?.addEventListener('click',()=>loadQuote(true));

  // Setup
  setTabs(); buildViz(); loadQuicklinks();
  setClock(); setInterval(setClock,1000);

  // Załaduj dane niezależnie
  loadWeather().catch(e=>{ console.warn('Pogoda:',e); set('#weatherDesc','⚠ brak danych'); });
  loadAqi().catch(e=>{ console.warn('AQI:',e); const b=$('#aqiBody'); if(b) b.innerHTML='<div class="loading-msg">⚠ Brak danych GIOŚ</div>'; });
  loadQuote().catch(e=>console.warn('Cytat:',e));
  initTodo();
  loadFuel().catch(e=>console.warn('Paliwo:',e));
  loadNews().catch(e=>console.warn('Newsy:',e));
  loadFxAndMetals().catch(e=>console.warn('Kursy:',e));
  loadStations().catch(e=>console.warn('Radio:',e));

  setInterval(()=>loadWeather().catch(()=>{}),     10*60*1000);
  setInterval(()=>loadAqi().catch(()=>{}),         15*60*1000);
  setInterval(()=>loadFuel().catch(()=>{}),        60*60*1000);
  setInterval(()=>loadNews().catch(()=>{}),        20*60*1000);
  setInterval(()=>loadFxAndMetals().catch(()=>{}), 60*60*1000);
});
