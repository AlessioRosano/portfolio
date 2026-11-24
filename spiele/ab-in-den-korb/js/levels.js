// Spielinhalte: Produkte und Levels.
// Die Produkt-ID ist gleichzeitig der Dateiname der Grafik: assets/produkte/<id>.png
// Solange keine Grafik existiert, zeichnet das Spiel einen Platzhalter aus shape/color/accent/mark.
// Formen (shape): carton, bottle, jar, box, boxtall, loaf, pack, round, stick, bag, crescent, flat, can
//
// Alle Produkte gibt es im Sortiment der Migros (geprüft auf migros.ch, November 2026).
// brand = Marke/Linie (M-Classic, M-Budget, Valflora …), name = Produkt. Angezeigt wird «brand name».
// Die Zwillinge sind meist dasselbe Produkt aus einer anderen Linie (z. B. M-Classic gegen M-Budget):
// So wird beim Spielen nicht nur die Auswahl, sondern auch die Preisvielfalt der Migros sichtbar.

const MB = { mark: 'MB', markColor: '#5f6b73' }; // Platzhalter-Kennzeichen für M-Budget-Produkte

window.GAME_DATA = {
  PRODUCTS: {
    // --- Level 1: Zmorge ---
    valflora_vollmilch:    { brand: 'Valflora', name: 'Vollmilch',         shape: 'carton',   color: '#ffffff', accent: '#2f6fd6' },
    valflora_milchdrink:   { brand: 'Valflora', name: 'Milch Drink',       shape: 'carton',   color: '#ffffff', accent: '#7fb3f0', mark: '1.5', markColor: '#2f6fd6' },
    mclassic_butterzopf:   { brand: 'M-Classic', name: 'Butterzopf',       shape: 'loaf',     color: '#e3a650', accent: '#b9772c' },
    urdinkel_butterzopf:   { brand: '', name: 'Urdinkel-Butterzopf',       shape: 'loaf',     color: '#b9773a', accent: '#7d4c1f' },
    bellejournee_erdbeer:  { brand: 'Belle Journée', name: 'Erdbeer',      shape: 'jar',      color: '#d8343f', accent: '#ffffff' },
    mbudget_erdbeer:       { brand: 'M-Budget', name: 'Erdbeer-Konfi',     shape: 'jar',      color: '#d8343f', accent: '#e9ecee', ...MB },
    freiland_eier:         { brand: '', name: 'Freiland-Eier',             shape: 'pack',     color: '#cfe8c0', accent: '#f6ecd9' },
    mbudget_picknick_eier: { brand: 'M-Budget', name: 'Picknick-Eier',     shape: 'pack',     color: '#e9ecee', accent: '#f6ecd9', ...MB },
    valflora_butter:       { brand: 'Valflora', name: 'Butter',            shape: 'box',      color: '#ffe066', accent: '#2f6fd6' },
    mbudget_kochbutter:    { brand: 'M-Budget', name: 'Kochbutter',        shape: 'box',      color: '#fff2a8', accent: '#e9ecee', ...MB },
    annasbest_orangensaft: { brand: "Anna's Best", name: 'Orangensaft',    shape: 'bottle',   color: '#ffa526', accent: '#2b9a48' },
    mbudget_orangensaft:   { brand: 'M-Budget', name: 'Orangensaft',       shape: 'carton',   color: '#ffa526', accent: '#e9ecee', ...MB },
    mclassic_buttergipfel: { brand: 'M-Classic', name: 'Buttergipfel',     shape: 'crescent', color: '#e9a957', accent: '#b9772c' },
    mbudget_gipfel:        { brand: 'M-Budget', name: 'Gipfel',            shape: 'crescent', color: '#f0c784', accent: '#c99b55', ...MB },

    // --- Level 2: Grillabend ---
    mclassic_cervelas:     { brand: 'M-Classic', name: 'Cervelas',         shape: 'stick',    color: '#b5473a', accent: '#7a2a22' },
    mbudget_cervelas:      { brand: 'M-Budget', name: 'Cervelas',          shape: 'stick',    color: '#c96a5e', accent: '#7a2a22', ...MB },
    mbudget_bratwurst:     { brand: 'M-Budget', name: 'Bratwurst',         shape: 'stick',    color: '#e8cfae', accent: '#b08b5d', ...MB },
    mclassic_ketchup:      { brand: 'M-Classic', name: 'Ketchup',          shape: 'bottle',   color: '#d72f2f', accent: '#ffffff' },
    heinz_ketchup:         { brand: 'Heinz', name: 'Ketchup',              shape: 'bottle',   color: '#c62828', accent: '#f5f0e1', mark: 'H', markColor: '#1f1f1f' },
    migros_zuckermais:     { brand: 'Migros', name: 'Zuckermais',          shape: 'stick',    color: '#f7d33c', accent: '#6fae4a' },
    mbudget_maiskoelbchen: { brand: 'M-Budget', name: 'Maiskölbchen',      shape: 'jar',      color: '#f7d33c', accent: '#e9ecee', ...MB },
    mbudget_chips_nature:  { brand: 'M-Budget', name: 'Chips Nature',      shape: 'bag',      color: '#f7d33c', accent: '#e9ecee', ...MB },
    mbudget_chips_paprika: { brand: 'M-Budget', name: 'Chips Paprika',     shape: 'bag',      color: '#e8602c', accent: '#e9ecee', ...MB },
    eltony_mate:           { brand: 'El Tony', name: 'Mate',               shape: 'can',      color: '#f2e6c8', accent: '#1f6b3a' },
    eltony_mate_zero:      { brand: 'El Tony', name: 'Mate Zero',          shape: 'can',      color: '#2b2b2b', accent: '#1f6b3a', mark: '0', markColor: '#1f6b3a' },
    eltony_mate_mint:      { brand: 'El Tony', name: 'Mate & Mint',        shape: 'can',      color: '#bfe8d0', accent: '#1f6b3a', mark: '✿', markColor: '#2e9b5b' },
    kult_icetea_zitrone:   { brand: 'Kult', name: 'Ice Tea Zitrone',       shape: 'carton',   color: '#f5e04a', accent: '#c98a1c' },
    kult_icetea_pfirsich:  { brand: 'Kult', name: 'Ice Tea Pfirsich',      shape: 'carton',   color: '#f7a46b', accent: '#c96a2c' },

    // --- Level 3: Fondue-Abend ---
    migros_fondue:         { brand: 'Migros', name: 'Fondue',              shape: 'box',      color: '#e23b3b', accent: '#ffffff' },
    gerber_fondue:         { brand: 'Gerber', name: 'Fondue',              shape: 'box',      color: '#f0e0b0', accent: '#c81e3a', mark: 'G', markColor: '#c81e3a' },
    raccard_raclette:      { brand: 'Raccard', name: 'Raclette',           shape: 'flat',     color: '#f2c12e', accent: '#c81e3a' },
    mbudget_halbweissbrot: { brand: 'M-Budget', name: 'Halbweissbrot',     shape: 'loaf',     color: '#e0b06a', accent: '#a7742f', ...MB },
    baslerbrot:            { brand: '', name: 'Baslerbrot',                shape: 'loaf',     color: '#9a6634', accent: '#5e3b1c' },
    migros_cornichons:     { brand: 'Migros', name: 'Cornichons',          shape: 'jar',      color: '#5e9c3a', accent: '#e9e2c8' },
    condy_cornichons:      { brand: 'Condy', name: 'Cornichons',           shape: 'jar',      color: '#5e9c3a', accent: '#d8343f', mark: 'C', markColor: '#d8343f' },
    mbudget_silberzwiebeln:{ brand: 'M-Budget', name: 'Silberzwiebeln',    shape: 'jar',      color: '#e9e6dc', accent: '#e9ecee', ...MB },
    condy_silberzwiebeln:  { brand: 'Condy', name: 'Silberzwiebeln',       shape: 'jar',      color: '#e9e6dc', accent: '#d8343f', mark: 'C', markColor: '#d8343f' },
    migros_birnen:         { brand: 'Migros', name: 'Birnen Gute Luise',   shape: 'round',    color: '#cfd85a', accent: '#6b8a2c' },
    mbudget_birnen:        { brand: 'M-Budget', name: 'Birnen',            shape: 'round',    color: '#d9d98a', accent: '#6b8a2c', ...MB },
    freylini_classics:     { brand: 'Frey', name: 'Freylini Classics',     shape: 'bag',      color: '#6b3e26', accent: '#f2e3c6' },
    freylini_hazel:        { brand: 'Frey', name: 'Freylini Hazel Crunch', shape: 'bag',      color: '#8a5a2e', accent: '#f2e3c6', mark: '●', markColor: '#b07a3a' },
  },

  LEVELS: [
    {
      id: 'zmorge',
      title: 'Zmorge',
      subtitle: 'Sonntagszmorge für die ganze Familie',
      list: [
        { id: 'valflora_vollmilch', qty: 2 },
        { id: 'mclassic_butterzopf', qty: 1 },
        { id: 'bellejournee_erdbeer', qty: 1 },
        { id: 'freiland_eier', qty: 1 },
        { id: 'valflora_butter', qty: 1 },
        { id: 'annasbest_orangensaft', qty: 1 },
      ],
      distractors: ['valflora_milchdrink', 'urdinkel_butterzopf', 'mbudget_erdbeer', 'mbudget_picknick_eier', 'mbudget_kochbutter', 'mbudget_orangensaft', 'mclassic_buttergipfel', 'mbudget_gipfel'],
      distractorCopies: 2,
      spawnEvery: 0.9,          // Sekunden zwischen zwei Produkten
      speed: [360, 470],        // Fallgeschwindigkeit px/s
      itemSize: 150,
      timeLimit: null,          // Sekunden oder null
      palette: { sky: ['#fff6df', '#ffe2b0'], floor: '#efc98f', floorLine: '#d9ad6c', accent: '#e2701b', shelf: 'rgba(226,112,27,0.08)' },
      fact: 'Allein beim Zmorge hast du die Wahl zwischen Dutzenden Milch-, Brot- und Konfi-Sorten.',
    },
    {
      id: 'grill',
      title: 'Grillabend',
      subtitle: 'Spontan-Grillieren mit Freunden am See',
      list: [
        { id: 'mclassic_cervelas', qty: 4 },
        { id: 'mclassic_ketchup', qty: 1 },
        { id: 'migros_zuckermais', qty: 2 },
        { id: 'mbudget_chips_nature', qty: 1 },
        { id: 'eltony_mate', qty: 2 },
        { id: 'kult_icetea_zitrone', qty: 1 },
      ],
      distractors: ['mbudget_cervelas', 'mbudget_bratwurst', 'heinz_ketchup', 'mbudget_maiskoelbchen', 'mbudget_chips_paprika', 'eltony_mate_zero', 'eltony_mate_mint', 'kult_icetea_pfirsich'],
      distractorCopies: 3,
      spawnEvery: 0.7,
      speed: [470, 620],
      itemSize: 140,
      timeLimit: null,
      palette: { sky: ['#ffd9b5', '#f2895a'], floor: '#86b562', floorLine: '#6a9a49', accent: '#c2410c', shelf: 'rgba(120,40,10,0.08)' },
      fact: 'Wurst, Saucen, Snacks, Getränke: Für einen Grillabend kommt das halbe Sortiment zusammen.',
    },
    {
      id: 'fondue',
      title: 'Fondue-Abend',
      subtitle: 'Kurz vor Ladenschluss, die Gäste kommen gleich',
      list: [
        { id: 'migros_fondue', qty: 1 },
        { id: 'mbudget_halbweissbrot', qty: 2 },
        { id: 'migros_cornichons', qty: 1 },
        { id: 'mbudget_silberzwiebeln', qty: 1 },
        { id: 'migros_birnen', qty: 2 },
        { id: 'freylini_classics', qty: 1 },
      ],
      distractors: ['gerber_fondue', 'raccard_raclette', 'baslerbrot', 'condy_cornichons', 'condy_silberzwiebeln', 'mbudget_birnen', 'freylini_hazel'],
      distractorCopies: 3,
      spawnEvery: 0.55,
      speed: [580, 770],
      itemSize: 135,
      timeLimit: 75,
      palette: { sky: ['#1f3157', '#3d5a8a'], floor: '#e8eef7', floorLine: '#c3cfe0', accent: '#c81e3a', shelf: 'rgba(255,255,255,0.06)' },
      fact: 'Käse, Brot, Beilagen und Dessert: Auch für einen gemütlichen Abend ist die Auswahl riesig.',
    },
  ],
};
