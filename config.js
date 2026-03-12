// ═══════════════════════════════════════════════════
//  DASHBOARD — config.js
//  Edytuj ten plik pod siebie
// ═══════════════════════════════════════════════════
window.DASH_CONFIG = {

  // ── Lokalizacja (pogoda, AQI) ──────────────────
  placeLabel: "Warszawa",
  lat: 52.2297,
  lon: 21.0122,

  // ── GIOŚ — ID stacji jakości powietrza ─────────
  // Znajdź swoją stację: https://powietrze.gios.gov.pl
  // Warszawa-Marszałkowska = 114, Warszawa-Ursynów = 10435
  aqi_station_id: 114,

  // ── Trasa do pracy (Google Maps) ───────────────
  // Możesz też wpisać adres w UI dashboardu — zapisuje się automatycznie
  commute_origin:      "",   // np. "ul. Przykładowa 1, Warszawa"
  commute_destination: "",   // np. "ul. Biurowa 5, Warszawa"

  // ── RSS newsów ─────────────────────────────────
  rss: {
    news:  [{ label: "PL / Świat", url: "https://news.google.com/rss?hl=pl&gl=PL&ceid=PL:pl" }],
    sport: [{ label: "Sport",      url: "https://news.google.com/rss/search?q=sport&hl=pl&gl=PL&ceid=PL:pl" }]
  },

  // ── Ulubione linki ─────────────────────────────
  quicklinks: [
    { title: "Poczta",     subtitle: "Gmail",            url: "https://mail.google.com/" },
    { title: "Kalendarz",  subtitle: "Google Calendar",  url: "https://calendar.google.com/" },
    { title: "YouTube",    subtitle: "Muzyka / kanały",  url: "https://www.youtube.com/" },
    { title: "Reddit",     subtitle: "Suby",             url: "https://www.reddit.com/" }
  ],

  // ── Stacje radiowe ─────────────────────────────
  stations: [
    { label: "Eska 2",            query: "ESKA2",                   countrycode: "PL", directUrl: "https://pldm.ml/radio?url=https://www.eskago.pl/radio/eska2-warszawa" },
    { label: "Polskie Radio 1",   query: "Polskie Radio Program I", countrycode: "PL", directUrl: "https://stream11.polskieradio.pl/pr1/pr1.sdp/playlist.m3u8" },
    { label: "Radio dla Ciebie",  query: "Radio dla Ciebie",        countrycode: "PL", directUrl: "https://pldm.ml/radio?url=http://stream2.nadaje.com:11140/rdc" },
    { label: "Melo radio",        query: "Meloradio",               countrycode: "PL", playlistUrl: "https://hub.radiostream.pl/stream.pls?radio=8800&type=none&app=none&coding=mp3&redirect=true" },
    { label: "Polskie Radio 3",   query: "Polskie Radio Program III",countrycode: "PL", directUrl: "https://stream13.polskieradio.pl/pr3/pr3.sdp/playlist.m3u8" },
    { label: "Radio 357",         query: "Radio 357",               countrycode: "PL", fallbackUrl: "https://stream.radio357.pl" }
  ]
};
