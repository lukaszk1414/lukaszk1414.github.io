/* ========= helpers ========= */

const $ = (sel) => document.querySelector(sel);

function pad2(n){ return String(n).padStart(2,"0"); }

function formatPLDate(d){
  const days   = ["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"];
  const months = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function setSubtitle(){
  const now = new Date();
  const el = $("#subtitle");
  if(el) el.textContent = `Dziś jest ${formatPLDate(now)}`;
}

function setClock(){
  const now = new Date();
  const elTime = $("#time");
  const elDate = $("#date");
  if(elTime) elTime.textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  if(elDate) elDate.textContent = formatPLDate(now);
}

function setTabs(){
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.tab;
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      const panel = $("#panel-" + key);
      if(panel) panel.classList.add("active");
    });
  });
}

function safeText(s){ return (s ?? "").toString(); }

function timeAgo(iso){
  if(!iso) return "";
  const t = new Date(iso).getTime();
  if(Number.isNaN(t)) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - t)/60000));
  if(diffMin < 1) return "teraz";
  if(diffMin < 60) return `${diffMin} min temu`;
  const h = Math.round(diffMin/60);
  return `${h} h temu`;
}

/* ========= audio visualizer ========= */

function buildViz(){
  const wrap = $("#vizWrap");
  if(!wrap) return;
  wrap.innerHTML = "";
  const heights = [8,14,22,18,26,12,20,28,16,24,10,22,18,26,12,20,14,8];
  heights.forEach((h, i) => {
    const b = document.createElement("div");
    b.className = "viz-bar";
    b.style.setProperty("--h", h + "px");
    b.style.setProperty("--d", (0.5 + Math.random() * 0.7).toFixed(2) + "s");
    b.style.animationDelay = (i * 0.04).toFixed(2) + "s";
    b.style.height = "3px";
    wrap.appendChild(b);
  });
}

function startViz(){
  const wrap = $("#vizWrap");
  if(wrap) wrap.classList.add("active");
}

function stopViz(){
  const wrap = $("#vizWrap");
  if(wrap) wrap.classList.remove("active");
}

/* ========= weather (Open-Meteo) ========= */

async function loadWeather(){
  const cfg = window.DASH_CONFIG;
  const placeEl = $("#weatherPlace");
  if(placeEl) placeEl.textContent = cfg.placeLabel;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(cfg.lat)}` +
    `&longitude=${encodeURIComponent(cfg.lon)}` +
    "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m" +
    "&timezone=Europe%2FWarsaw";

  const res = await fetch(url);
  if(!res.ok) throw new Error("Weather fetch failed: " + res.status);
  const data = await res.json();

  const c = data.current || {};
  const set = (id, val) => { const el = $(id); if(el) el.textContent = val; };

  set("#temp",           (c.temperature_2m    ?? "—") + "°");
  set("#apparent",       (c.apparent_temperature ?? "—") + "°");
  set("#wind",           (c.wind_speed_10m    ?? "—") + " km/h");
  set("#precip",         (c.precipitation     ?? "—") + " mm");
  set("#weatherDesc",    weatherCodeToPL(c.weather_code));
  set("#weatherUpdated", timeAgo(c.time) || "—");
}

function weatherCodeToPL(code){
  const map = {
    0:"☀️ bezchmurnie", 1:"🌤 głównie pogodnie", 2:"⛅ częściowe zachmurzenie",
    3:"☁️ pochmurno", 45:"🌫 mgła", 48:"🌫 mgła osadzająca",
    51:"🌦 mżawka", 53:"🌦 mżawka", 55:"🌦 mżawka",
    61:"🌧 deszcz", 63:"🌧 deszcz", 65:"⛈ ulewa",
    71:"🌨 śnieg", 73:"🌨 śnieg", 75:"❄️ intensywny śnieg",
    80:"🌦 przelotny deszcz", 81:"🌦 przelotny deszcz", 82:"⛈ silny przelotny deszcz",
    95:"⛈ burza"
  };
  return map[Number(code)] || "—";
}

/* ========= RSS news (proxy CORS) ========= */

async function fetchRssItems(rssUrl, limit=9){
  const proxied = "https://api.allorigins.win/raw?url=" + encodeURIComponent(rssUrl);
  const res = await fetch(proxied);
  if(!res.ok) throw new Error("RSS fetch failed: " + res.status);
  const xml  = await res.text();
  const doc  = new DOMParser().parseFromString(xml, "text/xml");
  const items = [...doc.querySelectorAll("item")].slice(0, limit);
  return items.map(it => ({
    title:   it.querySelector("title")?.textContent?.trim(),
    link:    it.querySelector("link")?.textContent?.trim(),
    pubDate: it.querySelector("pubDate")?.textContent?.trim()
  }));
}

function renderList(listEl, items){
  if(!listEl) return;
  listEl.innerHTML = "";
  if(!items.length){
    const li = document.createElement("li");
    li.className = "item";
    li.textContent = "Brak artykułów.";
    listEl.appendChild(li);
    return;
  }
  for(const it of items){
    const li = document.createElement("li");
    li.className = "item";

    const a = document.createElement("a");
    a.href = it.link || "#";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = safeText(it.title) || "Bez tytułu";

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = it.pubDate ? new Date(it.pubDate).toLocaleString("pl-PL") : "";

    li.appendChild(a);
    li.appendChild(meta);
    listEl.appendChild(li);
  }
}

async function loadNews(){
  const cfg = window.DASH_CONFIG;
  const newsSources  = cfg.rss?.news  ?? [];
  const sportSources = cfg.rss?.sport ?? [];

  const [news, sport] = await Promise.all([
    newsSources[0]?.url  ? fetchRssItems(newsSources[0].url,  9).catch(()=>[]) : Promise.resolve([]),
    sportSources[0]?.url ? fetchRssItems(sportSources[0].url, 9).catch(()=>[]) : Promise.resolve([])
  ]);

  renderList($("#listNews"),  news);
  renderList($("#listSport"), sport);
}

/* ========= FX + metals ========= */

async function nbpRate(code){
  const url = `https://api.nbp.pl/api/exchangerates/rates/A/${encodeURIComponent(code)}/?format=json`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("NBP FX failed: " + res.status);
  const data = await res.json();
  const r = data?.rates?.[0];
  return { mid: r?.mid, effectiveDate: r?.effectiveDate, no: r?.no };
}

async function nbpGold(){
  const url = "https://api.nbp.pl/api/cenyzlota/last/?format=json";
  const res = await fetch(url);
  if(!res.ok) throw new Error("NBP gold failed: " + res.status);
  const arr = await res.json();
  const g = arr?.[0];
  return { cena: g?.cena, data: g?.data };
}

async function stooqLastClose(symbol){
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  const proxied = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
  const res = await fetch(proxied);
  if(!res.ok) throw new Error("Stooq failed: " + res.status);
  const csv = await res.text();
  const lines = csv.trim().split("\n");
  const last  = lines[lines.length - 1];
  const parts = last.split(",");
  return Number(parts[4]);
}

async function loadFxAndMetals(){
  const set = (id, val) => { const el = $(id); if(el) el.textContent = val; };

  const [usd, eur, gold] = await Promise.all([
    nbpRate("USD").catch(()=>null),
    nbpRate("EUR").catch(()=>null),
    nbpGold().catch(()=>null)
  ]);

  const usdpln = usd?.mid;
  set("#usdpln", usdpln ? usdpln.toFixed(4) : "—");
  set("#eurpln",  eur?.mid ? eur.mid.toFixed(4) : "—");
  set("#fxDate",  usd?.effectiveDate ? `Data: ${usd.effectiveDate}` : "—");
  set("#fxNo",    usd?.no ? `Tabela: ${usd.no}` : "—");
  set("#goldPlnG",  (gold?.cena != null) ? Number(gold.cena).toFixed(2) : "—");
  set("#goldDate",  gold?.data ? `Data: ${gold.data}` : "—");

  try {
    const xagUsd = await stooqLastClose("xagusd");
    set("#silverPlnOz", (xagUsd && usdpln) ? (xagUsd * usdpln).toFixed(2) : "—");
  } catch {
    set("#silverPlnOz", "—");
  }
}

/* ========= radio ========= */

let audio;
let currentStationId = null;
let hls = null;

function destroyHls(){
  if(hls){ try{ hls.destroy(); } catch {} hls = null; }
}

async function resolvePlaylistToUrl(playlistUrl){
  const res = await fetch(playlistUrl, { cache: "no-store" });
  if(!res.ok) throw new Error("Playlist fetch failed");
  const text = await res.text();
  const plsMatch = text.match(/File1\s*=\s*(.+)/i);
  if(plsMatch) return plsMatch[1].trim();
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const m3uLine = lines.find(l => !l.startsWith("#"));
  if(m3uLine) return m3uLine;
  throw new Error("Unsupported playlist format");
}

async function playUrl(url){
  destroyHls();
  if(url.endsWith(".m3u8")){
    if(window.Hls && window.Hls.isSupported()){
      hls = new window.Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(audio);
      await new Promise((resolve, reject) => {
        hls.on(window.Hls.Events.MANIFEST_PARSED, () => resolve());
        hls.on(window.Hls.Events.ERROR, (_e, d) => reject(d?.details || "HLS error"));
      });
      await audio.play();
      return;
    }
    audio.src = url;
    await audio.play();
    return;
  }
  audio.src = url;
  await audio.play();
}

function setNowPlaying(text){
  const el = $("#nowPlaying");
  if(el) el.textContent = text;
}

function setAudioUiPlaying(isPlaying){
  const btn = $("#btnToggle");
  if(btn){
    btn.disabled = !currentStationId;
    btn.textContent = isPlaying ? "⏸ Pauza" : "▶ Wznów";
  }
  if(isPlaying) startViz(); else stopViz();
}

async function radioBrowserPickServer(){
  try {
    const res = await fetch("https://all.api.radio-browser.info/json/servers");
    if(!res.ok) throw new Error();
    const servers = await res.json();
    const first = servers?.[0]?.name;
    return first ? `https://${first}` : "https://de1.api.radio-browser.info";
  } catch {
    return "https://de1.api.radio-browser.info";
  }
}

async function radioBrowserSearch(serverBase, name, countrycode){
  const url =
    `${serverBase}/json/stations/search` +
    `?name=${encodeURIComponent(name)}` +
    (countrycode ? `&countrycode=${encodeURIComponent(countrycode)}` : "") +
    `&hidebroken=true&limit=10`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("RadioBrowser search failed");
  return await res.json();
}

function chooseBestStation(results, label){
  if(!Array.isArray(results) || results.length === 0) return null;
  const norm  = s => safeText(s).toLowerCase();
  const target = norm(label);
  const scored = results.map(r => {
    const name = norm(r.name);
    const url  = safeText(r.url_resolved || r.url || "");
    let score  = 0;
    if(!url.startsWith("https://")) score -= 50; else score += 8;
    if(name.includes(target) || target.includes(name)) score += 6;
    if(r.url_resolved)          score += 4;
    if((r.bitrate ?? 0) >= 64)  score += 2;
    if((r.bitrate ?? 0) >= 128) score += 1;
    if(r.lastcheckok === 1)     score += 2;
    return { r, score };
  }).sort((a,b) => b.score - a.score);
  return scored[0]?.r || null;
}

function createStationCard(st){
  const wrap = document.createElement("div");
  wrap.className = "station";
  wrap.dataset.sid = st.sid;

  const left = document.createElement("div");
  left.className = "left";

  const name = document.createElement("div");
  name.className = "name";
  name.textContent = st.label;

  const sub = document.createElement("div");
  sub.className = "sub";
  sub.textContent = st.sourceHint;

  left.appendChild(name);
  left.appendChild(sub);

  const btn = document.createElement("button");
  btn.className = "play";
  btn.textContent = "▶";
  btn.title = "Graj";
  btn.addEventListener("click", () => playStation(st.sid, st.label, st.url));

  wrap.appendChild(left);
  wrap.appendChild(btn);
  return wrap;
}

function markActive(sid){
  document.querySelectorAll(".station").forEach(el => {
    el.classList.toggle("active", el.dataset.sid === sid);
  });
}

async function playStation(sid, label, url){
  try {
    currentStationId = sid;
    markActive(sid);
    await playUrl(url);
    setNowPlaying(`▶ ${label}`);
    setAudioUiPlaying(true);
  } catch(e) {
    console.warn("Radio error:", e);
    setNowPlaying(`⚠ Nie udało się: ${label}`);
    setAudioUiPlaying(false);
  }
}

function stopRadio(){
  destroyHls();
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
  currentStationId = null;
  markActive("___none___");
  setNowPlaying("Nie gra");
  setAudioUiPlaying(false);
}

function toggleRadio(){
  if(!currentStationId) return;
  if(audio.paused){
    audio.play().then(() => setAudioUiPlaying(true)).catch(() => setAudioUiPlaying(false));
  } else {
    audio.pause();
    setAudioUiPlaying(false);
  }
}

async function loadStations(){
  const cfg = window.DASH_CONFIG;
  const container = $("#stations");
  if(!container) return;
  container.innerHTML = "";

  const serverBase = await radioBrowserPickServer();

  const targets = (cfg.stations ?? []).map((s, idx) => ({
    sid: `st_${idx}`,
    label: s.label,
    query: s.query,
    countrycode: s.countrycode,
    directUrl: s.directUrl,
    playlistUrl: s.playlistUrl,
    fallbackUrl: s.fallbackUrl
  }));

  for(const t of targets){
    let pickedUrl = null;
    let hint = "";

    if(t.directUrl){
      pickedUrl = t.directUrl;
      hint = "bezpośredni stream";
    } else if(t.playlistUrl){
      try {
        pickedUrl = await resolvePlaylistToUrl(t.playlistUrl);
        hint = "playlista";
      } catch {}
    }

    if(!pickedUrl && t.fallbackUrl){
      pickedUrl = t.fallbackUrl;
      hint = "fallback";
    }

    try {
      const results = await radioBrowserSearch(serverBase, t.query, t.countrycode);
      const best = chooseBestStation(results, t.label);
      if(best?.url_resolved && safeText(best.url_resolved).startsWith("https://")){
        pickedUrl = best.url_resolved;
        hint = `${safeText(best.codec || "audio")} · ${best.bitrate ? best.bitrate + " kbps" : "?"}`;
      }
    } catch {}

    const st = {
      sid: t.sid,
      label: t.label,
      url: pickedUrl || "",
      sourceHint: pickedUrl ? hint : "brak URL"
    };

    const card = createStationCard(st);
    if(!st.url){
      const playBtn = card.querySelector("button.play");
      if(playBtn){ playBtn.disabled = true; playBtn.textContent = "—"; }
    }
    container.appendChild(card);
  }
}

/* ========= quicklinks ========= */

function loadQuicklinks(){
  const cfg = window.DASH_CONFIG;
  const box = $("#quicklinks");
  if(!box) return;
  box.innerHTML = "";
  for(const l of (cfg.quicklinks ?? [])){
    const a = document.createElement("a");
    a.className = "link";
    a.href = l.url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = l.title;
    const s = document.createElement("span");
    s.textContent = l.subtitle || "";
    a.appendChild(s);
    box.appendChild(a);
  }
}

/* ========= init — czekamy na DOMContentLoaded ========= */

document.addEventListener("DOMContentLoaded", () => {
  // inicjalizacja elementów audio po załadowaniu DOM
  audio = $("#audio");

  setSubtitle();
  setClock();
  setInterval(setClock, 1000);

  setTabs();
  buildViz();
  loadQuicklinks();

  // podpinamy przyciski
  const btnStop   = $("#btnStop");
  const btnToggle = $("#btnToggle");
  const vol       = $("#vol");

  if(btnStop)   btnStop.addEventListener("click", stopRadio);
  if(btnToggle) btnToggle.addEventListener("click", toggleRadio);
  if(vol){
    vol.addEventListener("input", e => { if(audio) audio.volume = Number(e.target.value); });
    if(audio) audio.volume = Number(vol.value);
  }

  if(audio){
    audio.addEventListener("play",  () => setAudioUiPlaying(true));
    audio.addEventListener("pause", () => setAudioUiPlaying(false));
  }

  // ładujemy dane — każde niezależnie, błąd jednego nie blokuje reszty
  loadWeather().catch(err => {
    console.warn("Pogoda niedostępna:", err);
    const el = $("#weatherDesc");
    if(el) el.textContent = "⚠ brak danych";
  });

  loadNews().catch(err => {
    console.warn("Newsy niedostępne:", err);
  });

  loadFxAndMetals().catch(err => {
    console.warn("Kursy niedostępne:", err);
  });

  loadStations().catch(err => {
    console.warn("Stacje niedostępne:", err);
  });

  // odświeżanie
  setInterval(() => loadWeather().catch(()=>{}),     10 * 60 * 1000);
  setInterval(() => loadNews().catch(()=>{}),        20 * 60 * 1000);
  setInterval(() => loadFxAndMetals().catch(()=>{}), 60 * 60 * 1000);
});
