// Edytuj to pod siebie
window.DASH_CONFIG = {
  placeLabel: "Warszawa",
  // Warszawa (możesz zmienić na swoje współrzędne)
  lat: 52.2297,
  lon: 21.0122,

  // RSS (czytamy przez proxy, żeby ominąć CORS)
  rss: {
    news: [
      {
        label: "PL / Świat (Google News)",
        url: "https://news.google.com/rss?hl=pl&gl=PL&ceid=PL:pl"
      }
    ],
    sport: [
      {
        label: "Sport (Google News)",
        url: "https://news.google.com/rss/search?q=sport&hl=pl&gl=PL&ceid=PL:pl"
      }
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
    { label: "Eska 2", query: "ESKA2", countrycode: "PL" },
    { label: "Polskie Radio 1", query: "Polskie Radio Program I", countrycode: "PL" },
    { label: "Radio dla Ciebie", query: "Radio dla Ciebie", countrycode: "PL" },
    { label: "Melo radio", query: "Meloradio", countrycode: "PL" },
    { label: "Polskie Radio Trójka", query: "Polskie Radio Program III", countrycode: "PL" },
    { label: "Radio 357", query: "Radio 357", countrycode: "PL", fallbackUrl: "https://stream.radio357.pl" }
  ]
};
