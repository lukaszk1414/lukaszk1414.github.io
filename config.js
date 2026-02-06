// Edytuj to pod siebie
window.DASH_CONFIG = {
  placeLabel: "Wyszków",
  // Warszawa (możesz zmienić na swoje współrzędne)
  lat: 52.2297,
  lon: 21.0122,

  // RSS (czytamy przez proxy, żeby ominąć CORS)
  rss: {
    // UWAGA: sport jest domyślnie pierwszą zakładką na stronie
    news: [
      { label: "PL / Świat (Google News)", url: "https://news.google.com/rss?hl=pl&gl=PL&ceid=PL:pl" }
    ],
    sport: [
      { label: "Sport (Google News)", url: "https://news.google.com/rss/search?q=sport&hl=pl&gl=PL&ceid=PL:pl" }
    ]
  },

  // Ulubione linki (opcjonalne kafelki)
  quicklinks: [
    { title: "Poczta", subtitle: "Gmail / WP / inne", url: "https://mail.google.com/" },
    { title: "Kalendarz", subtitle: "Google Calendar", url: "https://calendar.google.com/" },
    { title: "YouTube", subtitle: "Muzyka / kanały", url: "https://www.youtube.com/" },
    { title: "Reddit", subtitle: "Suby", url: "https://www.reddit.com/" }
  ],

  // Twoja lista stacji
    stations: [
    {
      label: "Eska 2",
      query: "ESKA2",
      countrycode: "PL",
      // Proxy do streamów eskaGO (działa po https)
      directUrl: "https://pldm.ml/radio?url=https://www.eskago.pl/radio/eska2-warszawa"
    },
    {
      label: "Polskie Radio 1",
      query: "Polskie Radio Program I",
      countrycode: "PL",
      // HLS (m3u8) – odtwarzane przez hls.js (na stronie)
      directUrl: "https://stream11.polskieradio.pl/pr1/pr1.sdp/playlist.m3u8",
      // Alternatywa (podany stream HTTP) przez HTTPS proxy
      fallbackUrl: "https://pldm.ml/radio?url=http://mp3.polskieradio.pl:8950/"
    },
    {
      label: "Radio dla Ciebie",
      query: "Radio dla Ciebie",
      countrycode: "PL",
      // Podany działający stream jest po HTTP, więc przez HTTPS proxy (żeby GitHub Pages nie blokował mixed-content)
      directUrl: "https://pldm.ml/radio?url=http://stream2.nadaje.com:11140/rdc"
    },
    {
      label: "Melo radio",
      query: "Meloradio",
      countrycode: "PL",
      // Playlista (.pls) -> rozpakowywana w JS do właściwego URL
      playlistUrl: "https://hub.radiostream.pl/stream.pls?radio=8800&type=none&app=none&coding=mp3&redirect=true"
    },
    {
      label: "Polskie Radio Trójka",
      query: "Polskie Radio Program III",
      countrycode: "PL",
      // HLS (m3u8) – odtwarzane przez hls.js (na stronie)
      directUrl: "https://stream13.polskieradio.pl/pr3/pr3.sdp/playlist.m3u8"
    },
    {
      label: "Radio 357",
      query: "Radio 357",
      countrycode: "PL",
      fallbackUrl: "https://stream.radio357.pl"
    }
  ]
};
