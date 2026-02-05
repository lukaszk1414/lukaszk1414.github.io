// ==========================
// KONFIG – ustaw pod siebie
// ==========================
const CONFIG = {
  location: "Warszawa",     // miasto do pogody
  newsQuery: "Polska",      // temat newsów (Google News RSS)
  newsLimit: 10,

  // Ulubione linki (launcher)
  defaultLinks: [
    { name: "Gmail", url: "https://mail.google.com/", desc: "Poczta" },
    { name: "Kalendarz", url: "https://calendar.google.com/", desc: "Plan dnia" },
    { name: "Drive", url: "https://drive.google.com/", desc: "Pliki" },
    { name: "ChatGPT", url: "https://chatgpt.com/", desc: "Asystent" },
    { name: "GitHub", url: "https://github.com/", desc: "Repozytoria" },
    { name: "Notion", url: "https://www.notion.so/", desc: "Notatki" },
    { name: "Maps", url: "https://www.google.com/maps", desc: "Mapy" },
    { name: "Translate", url: "https://translate.google.com/", desc: "Tłumacz" }
  ],

  // Radio:
  // - type:"stream" -> bezpośredni URL do MP3/AAC po HTTPS (najlepsze)
  // - type:"embed"  -> iframe (np. kod/URL mini-playera z MyRadioOnline)
  radios: [
    // PRZYKŁAD "stream" (podmień na działający HTTPS stream mp3/aac)
    // { name:"Radio Stream", desc:"MP3/AAC stream", type:"stream", url:"https://.../stream.mp3" },

    // PRZYKŁAD "embed" – tu wklejasz URL playera z MyRadioOnline (albo cały embed URL)
    { name:"Moje Radio (embed)", desc:"Wklej link do playera z MyRadioOnline", type:"embed", iframeSrc:"about:blank" }
  ]
};

// ==========================
// Storage / cache keys
// ==========================
const STORAGE_KEY = "startpage.links.v3";
const CACHE = {
  weatherKey: "startpage.weather.cache.v2",
  newsKey: "startpage.news.cache.v2"
};

// ==========================
// Helpers
// ==========================
function esc(s){
  return String(s || "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function favicon(url){
  try{
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${u.hostname}`;
  }catch{ return ""; }
}
function setText(id, text){
  const el = document.getElementById(id);
  if(el) el.textContent = text;
}
function showToast(text){
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1400);
}
function getCache(key){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return null;
    const obj = JSON.parse(raw);
    if(Date.now() > obj.expires) return null;
    return obj.data;
  }catch{ return null; }
}
function setCache(key, data, ttlMs){
  localStorage.setItem(key, JSON.stringify({ data, expires: Date.now() + ttlMs }));
}

// ==========================
// Clock
// ==========================
const WEEKDAYS = ["Niedziela","Poniedziałek","Wtorek","Środa","Czwartek","Piątek","Sobota"];
const MONTHS = ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

function tick(){
  const d = new Date();
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  setText("clock", `${hh}:${mm}`);
  setText("dateLine", `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`);
  setText("weekdayChip", WEEKDAYS[d.getDay()]);
  setText("monthChip", `Miesiąc: ${MONTHS[d.getMonth()]}`);
}
tick();
setInterval(tick, 1000);

// ==========================
// Links tiles + editor
// ==========================
function loadLinks(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : CONFIG.defaultLinks;
  }catch{ return CONFIG.defaultLinks; }
}
function saveLinks(links){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links, null, 2));
}
function renderLinks(){
  const links = loadLinks();
  const tiles = document.getElementById("tiles");
  tiles.innerHTML = links.map(l => `
    <a class="tile" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">
      <div class="ico"><img alt="" src="${favicon(l.url)}" loading="lazy"/></div>
      <div class="meta">
        <div class="name">${esc(l.name)}</div>
        <div class="desc">${esc(l.desc || l.url)}</div>
      </div>
    </a>
  `).join("");
  setText("tilesCount", `${links.length} linków`);
}
renderLinks();

// Editor modal
const modal = document.getElementById("modal");
const editor = document.getElementById("editor");

function openEditor(){
  editor.value = JSON.stringify(loadLinks(), null, 2);
  modal.classList.add("show");
  modal.setAttribute("aria-hidden","false");
}
function closeEditor(){
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden","true");
}

document.getElementById("editBtn").addEventListener("click", openEditor);
document.getElementById("closeBtn").addEventListener("click", closeEditor);

document.getElementById("saveBtn").addEventListener("click", () => {
  try{
    const parsed = JSON.parse(editor.value);
    if(!Array.isArray(parsed)) throw new Error("root not array");
    saveLinks(parsed);
    renderLinks();
    closeEditor();
    showToast("Zapisano ✅");
  }catch{
    alert("Błąd JSON. Upewnij się, że to lista obiektów linków.");
  }
});
document.getElementById("resetBtn").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  renderLinks();
  editor.value = JSON.stringify(loadLinks(), null, 2);
  showToast("Zresetowano 🔄");
});
modal.addEventListener("click", (e)=> { if(e.target === modal) closeEditor(); });

// Shortcuts
window.addEventListener("keydown", (e)=> {
  if(e.key === "/" && document.activeElement?.tagName !== "INPUT" && !modal.classList.contains("show")){
    e.preventDefault();
    document.getElementById("q").focus();
  }
  if((e.key === "e" || e.key === "E") && !modal.classList.contains("show")) openEditor();
  if(e.key === "Escape" && modal.classList.contains("show")) closeEditor();
});

// ==========================
// Search
// ==========================
function goSearch(){
  const q = document.getElementById("q").value.trim();
  if(!q) return;
  const engine = document.getElementById("engine").value;
  const encoded = encodeURIComponent(q);
  const url =
    engine === "google" ? `https://www.google.com/search?q=${encoded}` :
    engine === "bing" ? `https://www.bing.com/search?q=${encoded}` :
    `https://duckduckgo.com/?q=${encoded}`;

  window.open(url, "_blank", "noopener,noreferrer");
  document.getElementById("q").value = "";
}
document.getElementById("go").addEventListener("click", goSearch);
document.getElementById("q").addEventListener("keydown", (e)=> { if(e.key === "Enter") goSearch(); });

// ==========================
// Weather (Open-Meteo, no key)
// ==========================
const WMO = {
  0:"Bezchmurnie",1:"Przeważnie bezchmurnie",2:"Częściowe zachmurzenie",3:"Pochmurno",
  45:"Mgła",48:"Mgła osadzająca",
  51:"Mżawka słaba",53:"Mżawka umiark.",55:"Mżawka silna",
  61:"Deszcz słaby",63:"Deszcz umiark.",65:"Deszcz silny",
  71:"Śnieg słaby",73:"Śnieg umiark.",75:"Śnieg silny",
  80:"Przelotne opady słabe",81:"Przelotne opady umiark.",82:"Przelotne opady silne",
  95:"Burza",96:"Burza z gradem",99:"Silna burza z gradem"
};

async function loadWeather(){
  const cached = getCache(CACHE.weatherKey);
  if(cached){ renderWeather(cached); return; }

  try{
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(CONFIG.location)}&count=1&language=pl&format=json`;
    const geoRes = await fetch(geoUrl);
    const geo = await geoRes.json();
    if(!geo?.results?.length) throw new Error("no geo results");

    const { latitude, longitude, name, admin1 } = geo.results[0];
    setText("locLine", `${name}${admin1 ? ", " + admin1 : ""}`);

    const meteoUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,wind_speed_10m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,weather_code` +
      `&timezone=Europe%2FWarsaw`;

    const meteoRes = await fetch(meteoUrl);
    const data = await meteoRes.json();

    const payload = { place: { name, admin1 }, ...data };
    setCache(CACHE.weatherKey, payload, 30 * 60 * 1000); // 30 min
    renderWeather(payload);
  }catch{
    setText("weatherLine", "Nie udało się pobrać pogody.");
    setText("locLine", CONFIG.location);
  }
}

function renderWeather(data){
  try{
    const c = data.current;
    const d = data.daily;

    const temp = Math.round(c.temperature_2m);
    const wind = Math.round(c.wind_speed_10m);
    const codeNow = c.weather_code;
    const descNow = WMO[codeNow] || `Kod: ${codeNow}`;

    const min = Math.round(d.temperature_2m_min[0]);
    const max = Math.round(d.temperature_2m_max[0]);

    setText("tempNow", `${temp}°`);
    setText("weatherLine", descNow);
    setText("windChip", `Wiatr: ${wind} km/h`);
    setText("rangeChip", `Min/Max: ${min}° / ${max}°`);
  }catch{
    setText("weatherLine", "Brak danych pogodowych.");
  }
}
loadWeather();

// ==========================
// News (Google News RSS via proxy)
// ==========================
const NEWS_CACHE_TTL = 20 * 60 * 1000;

async function loadNews(force=false){
  if(!force){
    const cached = getCache(CACHE.newsKey);
    if(cached){ renderNews(cached); return; }
  }
  setText("newsLine", "Pobieram nagłówki…");

  try{
    const rss = `https://news.google.com/rss/search?q=${encodeURIComponent(CONFIG.newsQuery)}&hl=pl&gl=PL&ceid=PL:pl`;
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(rss)}`;

    const res = await fetch(proxy);
    const xmlText = await res.text();
    const items = parseRss(xmlText).slice(0, CONFIG.newsLimit);

    const payload = { items, updatedAt: new Date().toISOString(), query: CONFIG.newsQuery };
    setCache(CACHE.newsKey, payload, NEWS_CACHE_TTL);
    renderNews(payload);
  }catch{
    setText("newsLine", "Nie udało się pobrać newsów.");
    document.getElementById("news").innerHTML =
      `<div class="card-inner muted">Błąd pobierania RSS (czasem proxy jest chwilowo niedostępne).</div>`;
  }
}

function parseRss(xmlText){
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  const nodes = [...doc.querySelectorAll("item")];
  return nodes.map(n => {
    const title = n.querySelector("title")?.textContent?.trim() || "Bez tytułu";
    const link = n.querySelector("link")?.textContent?.trim() || "#";
    const pubDate = n.querySelector("pubDate")?.textContent?.trim() || "";
    const source = n.querySelector("source")?.textContent?.trim() || "Google News";
    return { title, link, pubDate, source };
  });
}

function fmtTime(pubDate){
  if(!pubDate) return "";
  const d = new Date(pubDate);
  if(isNaN(d)) return "";
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

function renderNews(payload){
  const items = payload.items || [];
  setText("newsLine", items.length ? `Temat: ${payload.query} • ${items.length} nagłówków` : "Brak nagłówków.");
  setText("newsCount", `${items.length} nagłówków`);

  const upd = new Date(payload.updatedAt);
  setText("newsUpdatedChip", `Akt.: ${upd.toLocaleTimeString("pl-PL", {hour:"2-digit", minute:"2-digit"})}`);

  const box = document.getElementById("news");
  box.innerHTML = items.map(it => `
    <a class="news-item" href="${esc(it.link)}" target="_blank" rel="noopener noreferrer">
      <div style="min-width:0">
        <div class="news-title">${esc(it.title)}</div>
        <div class="news-meta">${esc(it.source || "Źródło")}</div>
      </div>
      <div class="news-time">${esc(fmtTime(it.pubDate))}</div>
    </a>
  `).join("") || `<div class="card-inner muted">Brak newsów.</div>`;
}

document.getElementById("refreshNews").addEventListener("click", ()=> loadNews(true));
loadNews();

// ==========================
// RADIO (no reload)
// ==========================
const RADIO = CONFIG.radios;

const audio = document.getElementById("audio");
const radioList = document.getElementById("radioList");
const nowEl = document.getElementById("radioNow");
const statusEl = document.getElementById("radioStatus");
const vol = document.getElementById("radioVol");

const embedWrap = document.getElementById("radioEmbedWrap");
const embed = document.getElementById("radioEmbed");

let currentIndex = -1;

function renderRadio(){
  radioList.innerHTML = RADIO.map((r, i) => `
    <div class="radio-item" data-i="${i}">
      <div class="radio-dot"></div>
      <div style="min-width:0">
        <div class="radio-name">${esc(r.name)}</div>
        <div class="radio-desc">${esc(r.desc || (r.type === "embed" ? "Osadzony player" : "Stream"))}</div>
      </div>
    </div>
  `).join("");

  radioList.querySelectorAll(".radio-item").forEach(el => {
    el.addEventListener("click", () => {
      const i = Number(el.getAttribute("data-i"));
      playStation(i);
    });
  });

  if(!RADIO.length){
    statusEl.textContent = "Brak stacji";
    nowEl.textContent = "Dodaj stacje w app.js";
  }
}

function setActive(i){
  radioList.querySelectorAll(".radio-item").forEach((el, idx) => {
    el.classList.toggle("active", idx === i);
  });
}

function stopEmbed(){
  embed.src = "about:blank";
  embedWrap.style.display = "none";
}

function playStation(i){
  const r = RADIO[i];
  currentIndex = i;
  setActive(i);

  nowEl.textContent = r.name;
  statusEl.textContent = "Ładowanie…";

  if(r.type === "embed"){
    audio.pause();
    audio.src = "";
    embedWrap.style.display = "block";
    embed.src = r.iframeSrc || "about:blank";
    statusEl.textContent = "Embed";
    return;
  }

  stopEmbed();
  audio.src = r.url;
  audio.play().then(() => {
    statusEl.textContent = "Gra";
  }).catch(() => {
    statusEl.textContent = "Kliknij Play (autoplay zablokowany)";
  });
}

document.getElementById("radioPlay").addEventListener("click", () => {
  if(currentIndex === -1 && RADIO.length) playStation(0);
  else audio.play().catch(()=>{});
});

document.getElementById("radioPause").addEventListener("click", () => {
  audio.pause();
  statusEl.textContent = "Pauza";
});

vol.addEventListener("input", () => {
  audio.volume = Number(vol.value);
});

audio.addEventListener("playing", () => statusEl.textContent = "Gra");
audio.addEventListener("pause", () => statusEl.textContent = "Pauza");
audio.addEventListener("error", () => statusEl.textContent = "Błąd streamu");

audio.volume = Number(vol.value);
renderRadio();
