/* ========= helpers ========= */

const $ = (sel) => document.querySelector(sel);

function pad2(n){ return String(n).padStart(2,"0"); }

function formatPLDate(d){
  const days = ["niedziela","poniedziałek","wtorek","środa","czwartek","piątek","sobota"];
  const months = ["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function setSubtitle(){
  const now = new Date();
  $("#subtitle").textContent = `Dziś jest ${formatPLDate(now)}`;
}

function setClock(){
  const now = new Date();
  $("#time").textContent = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  $("#date").textContent = formatPLDate(now);
}

function setTabs(){
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      const key = btn.dataset.tab;
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      $("#panel-" + key).classList.add("active");
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

/* ========= weather (Open-Meteo) ========= */

async function loadWeather(){
  const cfg = window.DASH_CONFIG;
  $("#weatherPlace").textContent = cfg.placeLabel;

  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${encodeURIComponent(cfg.lat)}` +
    `&longitude=${encodeURIComponent(cfg.lon)}` +
    "&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m" +
    "&timezone=Europe%2FWarsaw";

  const res = await fetch(url);
  if(!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();

  const c = data.current || {};
  $("#temp").textContent = (c.temperature_2m ?? "—") + "°";
  $("#apparent").textContent = (c.apparent_temperature ?? "—") + "°";
  $("#wind").textContent = (c.wind_speed_10m ?? "—") + " km/h";
  $("#precip").textContent = (c.precipitation ?? "—") + " mm";
  $("#weatherDesc").textContent = weatherCodeToPL(c.weather_code);
  $("#weatherUpdated").textContent = timeAgo(c.time) || "—";
}

function weatherCodeToPL(code){
  // krótka, czytelna mapa; możesz rozbudować
  const map = {
    0:"bezchmurnie",
    1:"głównie pogodnie",
    2:"częściowe zachmurzenie",
    3:"pochmurno",
    45:"mgła",
    48:"mgła osadzająca",
    51:"mżawka",
    53:"mżawka",
    55:"mżawka",
    61:"deszcz",
    63:"deszcz",
    65:"ulewa",
    71:"śnieg",
    73:"śnieg",
    75:"intensywny śnieg",
    80:"przelotny deszcz",
    81:"przelotny deszcz",
    82:"silny przelotny deszcz",
    95:"burza"
  };
  return map[Number(code)] || "—";
}

/* ========= RSS news (proxy CORS) ========= */

async function fetchRssItems(rssUrl, limit=8){
  // Proxy: allorigins (bez klucza); pobiera XML bez problemów CORS
  const proxied = "https://api.allorigins.win/raw?url=" + encodeURIComponent(rssUrl);
  const res = await fetch(proxied);
  if(!res.ok) throw new Error("RSS fetch failed");
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = [...doc.querySelectorAll("item")].slice(0, limit);

  return items.map(it => {
    const title = it.querySelector("title")?.textContent?.trim();
    const link = it.querySelector("link")?.textContent?.trim();
    const pubDate = it.querySelector("pubDate")?.textContent?.trim();
    return { title, link, pubDate };
  });
}

function renderList(listEl, items){
  listEl.innerHTML = "";
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

  const newsSources = cfg.rss.news ?? [];
  const sportSources = cfg.rss.sport ?? [];

  // bierzemy pierwszy feed; możesz tu zsumować kilka
  const news = newsSources[0]?.url ? await fetchRssItems(newsSources[0].url, 10) : [];
  const sport = sportSources[0]?.url ? await fetchRssItems(sportSources[0].url, 10) : [];

  renderList($("#listNews"), news);
  renderList($("#listSport"), sport);
}

/* ========= FX + metals ========= */

async function nbpRate(code){
  // NBP Web API: /api/exchangerates/rates/A/{code}/?format=json
  // :contentReference[oaicite:7]{index=7}
  const url = `https://api.nbp.pl/api/exchangerates/rates/A/${encodeURIComponent(code)}/?format=json`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("NBP FX failed");
  const data = await res.json();
  const r = data?.rates?.[0];
  return {
    mid: r?.mid,
    effectiveDate: r?.effectiveDate,
    no: r?.no
  };
}

async function nbpGold(){
  // NBP Web API: /api/cenyzlota/last/?format=json
  // :contentReference[oaicite:8]{index=8}
  const url = "https://api.nbp.pl/api/cenyzlota/last/?format=json";
  const res = await fetch(url);
  if(!res.ok) throw new Error("NBP gold failed");
  const arr = await res.json();
  const g = arr?.[0];
  return { cena: g?.cena, data: g?.data };
}

async function stooqLastClose(symbol){
  // Stooq CSV: https://stooq.com/q/d/?s=xagusd  (dodamy parametry formatowania)
  // :contentReference[oaicite:9]{index=9}
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
  const proxied = "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
  const res = await fetch(proxied);
  if(!res.ok) throw new Error("Stooq failed");
  const csv = await res.text();

  // CSV: Date,Open,High,Low,Close,Volume
  const lines = csv.trim().split("\n");
  const last = lines[lines.length - 1];
  const parts = last.split(",");
  const close = Number(parts[4]);
  return close;
}

async function loadFxAndMetals(){
  const [usd, eur, gold] = await Promise.all([
    nbpRate("USD"),
    nbpRate("EUR"),
    nbpGold()
  ]);

  const usdpln = usd.mid;
  $("#usdpln").textContent = usdpln ? usdpln.toFixed(4) : "—";
  $("#eurpln").textContent = eur.mid ? eur.mid.toFixed(4) : "—";
  $("#fxDate").textContent = usd.effectiveDate ? `Data: ${usd.effectiveDate}` : "—";
  $("#fxNo").textContent = usd.no ? `Tabela: ${usd.no}` : "—";

  $("#goldPlnG").textContent = (gold.cena != null) ? Number(gold.cena).toFixed(2) : "—";
  $("#goldDate").textContent = gold.data ? `Data: ${gold.data}` : "—";

  // srebro XAGUSD -> PLN/oz po USD/PLN
  try{
    const xagUsd = await stooqLastClose("xagusd");
    if(xagUsd && usdpln){
      const plnOz = xagUsd * usdpln;
      $("#silverPlnOz").textContent = plnOz.toFixed(2);
    } else {
      $("#silverPlnOz").textContent = "—";
    }
  } catch {
    $("#silverPlnOz").textContent = "—";
  }
}

/* ========= radio (Radio-Browser) ========= */

const audio = $("#audio");
let currentStationId = null;

function setNowPlaying(text){
  $("#nowPlaying").textContent = text;
}

function setAudioUiPlaying(isPlaying){
  $("#btnToggle").disabled = !currentStationId;
  $("#btnToggle").textContent = isPlaying ? "⏸ Pauza" : "▶️ Wznów";
}

async function radioBrowserPickServer(){
  // wg docs: /json/servers na all.api.radio-browser.info
  // :contentReference[oaicite:10]{index=10}
  const url = "https://all.api.radio-browser.info/json/servers";
  const res = await fetch(url);
  if(!res.ok) throw new Error("RadioBrowser servers failed");
  const servers = await res.json();
  const first = servers?.[0]?.name;
  return first ? `https://${first}` : "https://de1.api.radio-browser.info";
}

async function radioBrowserSearch(serverBase, name, countrycode){
  // /json/stations/search?name=...&countrycode=PL&hidebroken=true&limit=10
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

  // heurystyka: nazwa podobna + sensowny bitrate + url_resolved
  const normalized = (s)=> safeText(s).toLowerCase();
  const target = normalized(label);

  const scored = results.map(r => {
    const name = normalized(r.name);
    let score = 0;
    if(name.includes(target) || target.includes(name)) score += 6;
    if(r.url_resolved) score += 4;
    if((r.bitrate ?? 0) >= 64) score += 2;
    if(r.lastcheckok === 1) score += 2;
    return { r, score };
  }).sort((a,b)=> b.score - a.score);

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
  try{
    currentStationId = sid;
    markActive(sid);

    audio.src = url;
    await audio.play();

    setNowPlaying(`Gra: ${label}`);
    setAudioUiPlaying(true);
  } catch (e){
    setNowPlaying(`Nie udało się odtworzyć: ${label}`);
    setAudioUiPlaying(false);
  }
}

function stopRadio(){
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
    audio.play().then(()=>setAudioUiPlaying(true)).catch(()=>setAudioUiPlaying(false));
  } else {
    audio.pause();
    setAudioUiPlaying(false);
  }
}

async function loadStations(){
  const cfg = window.DASH_CONFIG;
  const container = $("#stations");
  container.innerHTML = "";

  const serverBase = await radioBrowserPickServer();

  // przygotuj listę “docelowych” stacji
  const targets = cfg.stations.map((s, idx)=>({
    sid: `st_${idx}`,
    label: s.label,
    query: s.query,
    countrycode: s.countrycode,
    fallbackUrl: s.fallbackUrl
  }));

  for(const t of targets){
    let pickedUrl = t.fallbackUrl || null;
    let hint = t.fallbackUrl ? "fallback (bezpośredni stream)" : "szukanie streamu…";

    try{
      const results = await radioBrowserSearch(serverBase, t.query, t.countrycode);
      const best = chooseBestStation(results, t.label);
      if(best?.url_resolved){
        pickedUrl = best.url_resolved;
        hint = `${safeText(best.codec || "audio")} • ${best.bitrate ? best.bitrate + " kbps" : "?"}`;
      }
    } catch {
      // zostanie fallback albo brak
    }

    const st = {
      sid: t.sid,
      label: t.label,
      url: pickedUrl || "",
      sourceHint: pickedUrl ? hint : "brak URL (kliknij ponownie później)"
    };

    const card = createStationCard(st);
    // jeśli nie ma URL, dezaktywuj przycisk
    if(!st.url){
      card.querySelector("button.play").disabled = true;
      card.querySelector("button.play").textContent = "—";
    }
    container.appendChild(card);
  }
}

/* ========= quicklinks ========= */

function loadQuicklinks(){
  const cfg = window.DASH_CONFIG;
  const box = $("#quicklinks");
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

/* ========= init ========= */

function wireUI(){
  setTabs();

  $("#btnStop").addEventListener("click", stopRadio);
  $("#btnToggle").addEventListener("click", toggleRadio);

  $("#vol").addEventListener("input", (e)=>{
    audio.volume = Number(e.target.value);
  });
  audio.volume = Number($("#vol").value);

  audio.addEventListener("play", ()=> setAudioUiPlaying(true));
  audio.addEventListener("pause", ()=> setAudioUiPlaying(false));
}

async function main(){
  setSubtitle();
  setClock();
  wireUI();
  loadQuicklinks();

  // odśwież zegar
  setInterval(setClock, 1000);

  // pierwsze ładowanie
  await Promise.allSettled([
    loadWeather(),
    loadNews(),
    loadFxAndMetals(),
    loadStations()
  ]);

  // cykliczne odświeżanie
  setInterval(()=> loadWeather().catch(()=>{}), 10 * 60 * 1000);
  setInterval(()=> loadNews().catch(()=>{}), 20 * 60 * 1000);
  setInterval(()=> loadFxAndMetals().catch(()=>{}), 60 * 60 * 1000);
}

main().catch(err=>{
  $("#subtitle").textContent = "Wystąpił błąd ładowania danych.";
  console.error(err);
});
