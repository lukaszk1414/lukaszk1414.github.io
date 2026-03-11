/* =====================================================================
   DASHBOARD v3 — app.js
   GridStack: drag / resize / hide / localStorage
   ===================================================================== */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

/* ─── helpers ────────────────────────────────────────────── */

function pad2(n){ return String(n).padStart(2,'0'); }

function formatPLDate(d){
  const days   = ['niedziela','poniedziałek','wtorek','środa','czwartek','piątek','sobota'];
  const months = ['stycznia','lutego','marca','kwietnia','maja','czerwca','lipca','sierpnia','września','października','listopada','grudnia'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function safeText(s){ return (s ?? '').toString(); }

function timeAgo(iso){
  if(!iso) return '';
  const diff = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if(diff < 1)  return 'teraz';
  if(diff < 60) return `${diff} min temu`;
  return `${Math.round(diff/60)} h temu`;
}

/* ─── clock ──────────────────────────────────────────────── */

function setClock(){
  const now = new Date();
  const tEl = $('#time'), dEl = $('#date'), sEl = $('#subtitle');
  if(tEl) tEl.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  if(dEl) dEl.textContent = formatPLDate(now);
  if(sEl) sEl.textContent = `Dziś jest ${formatPLDate(now)}`;
}

/* ─── tabs ───────────────────────────────────────────────── */

function setTabs(){
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const list = btn.closest('[role=tablist]') || btn.parentElement;
      list.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const panel = $('#panel-' + btn.dataset.tab);
      const wrap  = panel?.closest('.tabpanels');
      if(wrap) wrap.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      if(panel) panel.classList.add('active');
    });
  });
}

/* ─── visualizer ─────────────────────────────────────────── */

function buildViz(){
  const wrap = $('#vizWrap');
  if(!wrap) return;
  wrap.innerHTML = '';
  [8,14,22,18,26,12,20,28,16,24,10,22,18,26,12,20,14,8].forEach((h,i) => {
    const b = document.createElement('div');
    b.className = 'viz-bar';
    b.style.setProperty('--h', h+'px');
    b.style.setProperty('--d', (0.5 + Math.random()*.7).toFixed(2)+'s');
    b.style.animationDelay = (i*.04).toFixed(2)+'s';
    b.style.height = '3px';
    wrap.appendChild(b);
  });
}

function startViz(){ const w=$('#vizWrap'); if(w) w.classList.add('active'); }
function stopViz() { const w=$('#vizWrap'); if(w) w.classList.remove('active'); }

/* ─── weather ────────────────────────────────────────────── */

async function loadWeather(){
  const cfg = window.DASH_CONFIG;
  const set = (id, v) => { const e=$(id); if(e) e.textContent=v; };
  set('#weatherPlace', cfg.placeLabel);

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${cfg.lat}&longitude=${cfg.lon}` +
    '&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m' +
    '&timezone=Europe%2FWarsaw';

  const res  = await fetch(url);
  if(!res.ok) throw new Error('Weather ' + res.status);
  const c = (await res.json()).current || {};

  set('#temp',           (c.temperature_2m    ?? '—') + '°');
  set('#apparent',       (c.apparent_temperature ?? '—') + '°');
  set('#wind',           (c.wind_speed_10m    ?? '—') + ' km/h');
  set('#precip',         (c.precipitation     ?? '—') + ' mm');
  set('#weatherDesc',    wCode(c.weather_code));
  set('#weatherUpdated', timeAgo(c.time) || '—');
}

function wCode(code){
  return ({
    0:'☀️ bezchmurnie', 1:'🌤 głównie pogodnie', 2:'⛅ częściowe zachmurzenie',
    3:'☁️ pochmurno', 45:'🌫 mgła', 51:'🌦 mżawka', 53:'🌦 mżawka', 55:'🌦 mżawka',
    61:'🌧 deszcz', 63:'🌧 deszcz', 65:'⛈ ulewa',
    71:'🌨 śnieg', 73:'🌨 śnieg', 75:'❄️ intensywny śnieg',
    80:'🌦 przelotny deszcz', 82:'⛈ silny przelotny deszcz', 95:'⛈ burza'
  })[Number(code)] || '—';
}

/* ─── RSS ────────────────────────────────────────────────── */

async function fetchRss(url, limit=9){
  const res = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url));
  if(!res.ok) throw new Error('RSS ' + res.status);
  const doc = new DOMParser().parseFromString(await res.text(), 'text/xml');
  return [...doc.querySelectorAll('item')].slice(0,limit).map(it => ({
    title:   it.querySelector('title')?.textContent?.trim(),
    link:    it.querySelector('link')?.textContent?.trim(),
    pubDate: it.querySelector('pubDate')?.textContent?.trim()
  }));
}

function renderList(el, items){
  if(!el) return;
  el.innerHTML = '';
  if(!items?.length){ el.innerHTML = '<li class="item" style="color:var(--muted)">Brak artykułów.</li>'; return; }
  items.forEach(it => {
    const li   = document.createElement('li');   li.className = 'item';
    const a    = document.createElement('a');    a.href = it.link||'#'; a.target='_blank'; a.rel='noopener noreferrer'; a.textContent = it.title||'Bez tytułu';
    const meta = document.createElement('div');  meta.className='meta'; meta.textContent = it.pubDate ? new Date(it.pubDate).toLocaleString('pl-PL') : '';
    li.appendChild(a); li.appendChild(meta); el.appendChild(li);
  });
}

async function loadNews(){
  const cfg = window.DASH_CONFIG;
  const [news, sport] = await Promise.all([
    cfg.rss?.news?.[0]?.url  ? fetchRss(cfg.rss.news[0].url,  9).catch(()=>[]) : [],
    cfg.rss?.sport?.[0]?.url ? fetchRss(cfg.rss.sport[0].url, 9).catch(()=>[]) : []
  ]);
  renderList($('#listNews'), news);
  renderList($('#listSport'), sport);
}

/* ─── FX + metals ────────────────────────────────────────── */

async function nbpRate(code){
  const res = await fetch(`https://api.nbp.pl/api/exchangerates/rates/A/${code}/?format=json`);
  if(!res.ok) throw new Error('NBP ' + res.status);
  const r = (await res.json()).rates?.[0];
  return { mid: r?.mid, effectiveDate: r?.effectiveDate, no: r?.no };
}

async function nbpGold(){
  const res = await fetch('https://api.nbp.pl/api/cenyzlota/last/?format=json');
  if(!res.ok) throw new Error('Gold ' + res.status);
  const g = (await res.json())?.[0];
  return { cena: g?.cena, data: g?.data };
}

async function stooq(sym){
  const proxied = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(`https://stooq.com/q/d/l/?s=${sym}&i=d`);
  const res = await fetch(proxied);
  if(!res.ok) throw new Error('Stooq ' + res.status);
  const lines = (await res.text()).trim().split('\n');
  return Number(lines[lines.length-1].split(',')[4]);
}

async function loadFxAndMetals(){
  const set = (id,v) => { const e=$(id); if(e) e.textContent=v; };
  const [usd, eur, gold] = await Promise.all([nbpRate('USD').catch(()=>null), nbpRate('EUR').catch(()=>null), nbpGold().catch(()=>null)]);

  set('#usdpln', usd?.mid ? usd.mid.toFixed(4) : '—');
  set('#eurpln',  eur?.mid ? eur.mid.toFixed(4) : '—');
  set('#fxDate',  usd?.effectiveDate ? 'Data: '+usd.effectiveDate : '—');
  set('#fxNo',    usd?.no ? 'Tabela: '+usd.no : '—');
  set('#goldPlnG',  gold?.cena != null ? Number(gold.cena).toFixed(2) : '—');
  set('#goldDate',  gold?.data ? 'Data: '+gold.data : '—');

  try {
    const xag = await stooq('xagusd');
    set('#silverPlnOz', (xag && usd?.mid) ? (xag * usd.mid).toFixed(2) : '—');
  } catch { set('#silverPlnOz','—'); }
}

/* ─── radio ──────────────────────────────────────────────── */

let audio, hls = null, currentSid = null;

function destroyHls(){ if(hls){ try{hls.destroy()}catch{} hls=null; } }

async function resolvePlaylist(url){
  const res = await fetch(url, {cache:'no-store'});
  if(!res.ok) throw new Error('Playlist failed');
  const text = await res.text();
  const pls  = text.match(/File1\s*=\s*(.+)/i);
  if(pls) return pls[1].trim();
  const m3u  = text.split(/\r?\n/).map(l=>l.trim()).find(l=>l && !l.startsWith('#'));
  if(m3u) return m3u;
  throw new Error('Unsupported playlist');
}

async function playUrl(url){
  destroyHls();
  if(url.endsWith('.m3u8') && window.Hls?.isSupported()){
    hls = new window.Hls({enableWorker:true});
    hls.loadSource(url); hls.attachMedia(audio);
    await new Promise((ok,fail)=>{
      hls.on(window.Hls.Events.MANIFEST_PARSED, ok);
      hls.on(window.Hls.Events.ERROR, (_,d)=>fail(d?.details||'HLS error'));
    });
  } else { audio.src = url; }
  await audio.play();
}

function setNowPlaying(t){ const e=$('#nowPlaying'); if(e) e.textContent=t; }

function setAudioUI(playing){
  const btn = $('#btnToggle');
  if(btn){ btn.disabled=!currentSid; btn.textContent=playing?'⏸ Pauza':'▶ Wznów'; }
  playing ? startViz() : stopViz();
}

async function radioBrowserServer(){
  try{
    const res = await fetch('https://all.api.radio-browser.info/json/servers');
    const s   = await res.json();
    return s?.[0]?.name ? `https://${s[0].name}` : 'https://de1.api.radio-browser.info';
  }catch{ return 'https://de1.api.radio-browser.info'; }
}

async function rbSearch(base, name, cc){
  const url = `${base}/json/stations/search?name=${encodeURIComponent(name)}${cc?'&countrycode='+cc:''}&hidebroken=true&limit=10`;
  const res = await fetch(url); if(!res.ok) throw new Error('RB');
  return res.json();
}

function pickBest(results, label){
  if(!results?.length) return null;
  const norm  = s => safeText(s).toLowerCase();
  const target = norm(label);
  return results.map(r => {
    const url = safeText(r.url_resolved||r.url||'');
    let s = url.startsWith('https://') ? 8 : -50;
    if(norm(r.name).includes(target)||target.includes(norm(r.name))) s+=6;
    if(r.url_resolved) s+=4;
    if((r.bitrate??0)>=64) s+=2;
    if((r.bitrate??0)>=128) s+=1;
    if(r.lastcheckok===1) s+=2;
    return {r,s};
  }).sort((a,b)=>b.s-a.s)[0]?.r || null;
}

function makeStationCard(st){
  const wrap = document.createElement('div'); wrap.className='station'; wrap.dataset.sid=st.sid;
  const left = document.createElement('div'); left.className='left';
  const name = document.createElement('div'); name.className='name'; name.textContent=st.label;
  const sub  = document.createElement('div'); sub.className='sub';  sub.textContent=st.hint;
  left.appendChild(name); left.appendChild(sub);
  const btn = document.createElement('button'); btn.className='play'; btn.textContent='▶'; btn.title='Graj';
  btn.addEventListener('click', ()=>playStation(st.sid, st.label, st.url));
  wrap.appendChild(left); wrap.appendChild(btn);
  return wrap;
}

function markActive(sid){
  $$('.station').forEach(el => el.classList.toggle('active', el.dataset.sid===sid));
}

async function playStation(sid, label, url){
  try{
    currentSid=sid; markActive(sid);
    await playUrl(url);
    setNowPlaying('▶ '+label); setAudioUI(true);
  }catch(e){
    console.warn('Radio error:', e);
    setNowPlaying('⚠ Nie udało się: '+label); setAudioUI(false);
  }
}

function stopRadio(){
  destroyHls(); audio.pause(); audio.removeAttribute('src'); audio.load();
  currentSid=null; markActive('__none__'); setNowPlaying('Nie gra'); setAudioUI(false);
}

function toggleRadio(){
  if(!currentSid) return;
  audio.paused
    ? audio.play().then(()=>setAudioUI(true)).catch(()=>setAudioUI(false))
    : (audio.pause(), setAudioUI(false));
}

async function loadStations(){
  const cfg = window.DASH_CONFIG;
  const box = $('#stations'); if(!box) return;
  box.innerHTML = '';
  const server = await radioBrowserServer();

  for(const [idx, s] of (cfg.stations??[]).entries()){
    let url='', hint='';
    if(s.directUrl){ url=s.directUrl; hint='stream'; }
    else if(s.playlistUrl){ try{ url=await resolvePlaylist(s.playlistUrl); hint='playlista'; }catch{} }
    if(!url && s.fallbackUrl){ url=s.fallbackUrl; hint='fallback'; }

    try{
      const best = pickBest(await rbSearch(server,s.query,s.countrycode), s.label);
      if(best?.url_resolved?.startsWith('https://')){
        url=best.url_resolved; hint=`${safeText(best.codec||'audio')} · ${best.bitrate||'?'} kbps`;
      }
    }catch{}

    const card = makeStationCard({sid:`st_${idx}`, label:s.label, url, hint: url?hint:'brak URL'});
    if(!url){ const pb=card.querySelector('.play'); if(pb){pb.disabled=true;pb.textContent='—';} }
    box.appendChild(card);
  }
}

/* ─── quicklinks ─────────────────────────────────────────── */

function loadQuicklinks(){
  const box = $('#quicklinks'); if(!box) return;
  box.innerHTML = '';
  (window.DASH_CONFIG?.quicklinks??[]).forEach(l => {
    const a = document.createElement('a'); a.className='link'; a.href=l.url; a.target='_blank'; a.rel='noopener noreferrer';
    a.textContent=l.title;
    const sp=document.createElement('span'); sp.textContent=l.subtitle||'';
    a.appendChild(sp); box.appendChild(a);
  });
}

/* ─── GRIDSTACK layout engine ────────────────────────────── */

const LS_KEY    = 'dash_layout_v3';
const LS_HIDDEN = 'dash_hidden_v3';

const DEFAULT_LAYOUT = [
  { id:'weather', x:0,  y:0, w:4, h:4 },
  { id:'radio',   x:4,  y:0, w:4, h:4 },
  { id:'links',   x:8,  y:0, w:4, h:4 },
  { id:'fx',      x:0,  y:4, w:6, h:3 },
  { id:'metals',  x:6,  y:4, w:6, h:3 },
  { id:'news',    x:0,  y:7, w:12, h:5 }
];

let grid;

function saveLayout(){
  const items = grid.save(false);
  const layout = items.map(item => {
    const el  = item.el;
    const wid = el?.dataset?.widget || item.id;
    return { id: wid, x: item.x, y: item.y, w: item.w, h: item.h };
  });
  localStorage.setItem(LS_KEY, JSON.stringify(layout));
}

function loadLayout(){
  try { return JSON.parse(localStorage.getItem(LS_KEY)); }
  catch { return null; }
}

function saveHidden(set){ localStorage.setItem(LS_HIDDEN, JSON.stringify([...set])); }
function loadHidden(){
  try { return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN)) || []); }
  catch { return new Set(); }
}

function applyLayout(layout){
  if(!layout) return;
  layout.forEach(pos => {
    const el = $(`.grid-stack-item[data-widget="${pos.id}"]`);
    if(!el) return;
    grid.update(el, { x: pos.x, y: pos.y, w: pos.w, h: pos.h });
  });
}

function hideWidget(wid){
  const el = $(`.grid-stack-item[data-widget="${wid}"]`);
  if(el){ grid.removeWidget(el, false); el.style.display='none'; }
  const btn = $(`.vis-btn[data-widget="${wid}"]`);
  if(btn) btn.classList.remove('active');
}

function showWidget(wid){
  const el = $(`.grid-stack-item[data-widget="${wid}"]`);
  if(!el) return;
  el.style.display='';
  grid.makeWidget(el);
  const btn = $(`.vis-btn[data-widget="${wid}"]`);
  if(btn) btn.classList.add('active');
}

/* ─── Edit mode ──────────────────────────────────────────── */

let editMode = false;

function setEditMode(on){
  editMode = on;
  document.body.classList.toggle('edit-mode', on);
  const btn = $('#editToggle');
  if(btn) btn.classList.toggle('active', on);
  const panel = $('#visibilityPanel');
  if(panel) panel.classList.toggle('open', on);

  grid.setStatic(!on);   // gdy edit=false → statyczny (nie można przesuwać)
  if(!on) saveLayout();  // zapisz po wyjściu z trybu edycji
}

/* ─── init ───────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {

  audio = $('#audio');

  /* --- GridStack init --- */
  grid = GridStack.init({
    column: 12,
    cellHeight: 60,
    minRow: 1,
    margin: 7,
    handle: '.drag-handle',   // tylko handle, nie cała karta
    resizable: { handles: 'se' },
    static: true              // start bez edycji
  }, '#grid');

  /* Przywróć układ z localStorage */
  const saved = loadLayout();
  if(saved) applyLayout(saved);

  /* Przywróć ukryte widgety */
  const hidden = loadHidden();
  hidden.forEach(wid => hideWidget(wid));

  /* Zapis po każdej zmianie */
  grid.on('change', () => { if(editMode) saveLayout(); });

  /* --- Tryb edycji --- */
  $('#editToggle')?.addEventListener('click', () => setEditMode(!editMode));

  /* --- Przycisk Reset --- */
  $('#resetLayout')?.addEventListener('click', () => {
    // Pokaż wszystkie
    $$('.grid-stack-item').forEach(el => {
      if(el.style.display === 'none'){
        el.style.display = '';
        grid.makeWidget(el);
      }
    });
    // Przywróć domyślne pozycje
    DEFAULT_LAYOUT.forEach(pos => {
      const el = $(`.grid-stack-item[data-widget="${pos.id}"]`);
      if(el) grid.update(el, { x:pos.x, y:pos.y, w:pos.w, h:pos.h });
    });
    // Zaktualizuj przyciski
    $$('.vis-btn').forEach(b => b.classList.add('active'));
    // Wyczyść localStorage
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_HIDDEN);
    saveLayout();
  });

  /* --- Ukrywanie przez ✕ w karcie --- */
  $$('.card-hide-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wid = btn.dataset.widget;
      hideWidget(wid);
      const currentHidden = loadHidden(); currentHidden.add(wid); saveHidden(currentHidden);
    });
  });

  /* --- Przyciski widoczności w topbarze --- */
  $$('.vis-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.widget;
      const el  = $(`.grid-stack-item[data-widget="${wid}"]`);
      const isHidden = !el || el.style.display === 'none';

      if(isHidden){
        showWidget(wid);
        const h = loadHidden(); h.delete(wid); saveHidden(h);
      } else {
        hideWidget(wid);
        const h = loadHidden(); h.add(wid); saveHidden(h);
      }
      btn.classList.toggle('active', isHidden);
    });
  });

  /* --- Radio UI --- */
  $('#btnStop')?.addEventListener('click', stopRadio);
  $('#btnToggle')?.addEventListener('click', toggleRadio);
  $('#vol')?.addEventListener('input', e => { if(audio) audio.volume = Number(e.target.value); });
  if(audio){
    if($('#vol')) audio.volume = Number($('#vol').value);
    audio.addEventListener('play',  () => setAudioUI(true));
    audio.addEventListener('pause', () => setAudioUI(false));
  }

  /* --- Tabs, viz, quicklinks --- */
  setTabs();
  buildViz();
  loadQuicklinks();

  /* --- Zegar --- */
  setClock();
  setInterval(setClock, 1000);

  /* --- Dane (niezależne ładowanie) --- */
  loadWeather().catch(e => { console.warn('Pogoda:', e); const el=$('#weatherDesc'); if(el) el.textContent='⚠ brak danych'; });
  loadNews().catch(e => console.warn('Newsy:', e));
  loadFxAndMetals().catch(e => console.warn('Kursy:', e));
  loadStations().catch(e => console.warn('Radio:', e));

  setInterval(() => loadWeather().catch(()=>{}),     10*60*1000);
  setInterval(() => loadNews().catch(()=>{}),        20*60*1000);
  setInterval(() => loadFxAndMetals().catch(()=>{}), 60*60*1000);
});
