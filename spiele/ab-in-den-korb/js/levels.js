// Spielinhalte: Produkte und Levels.
// Die Produkt-ID ist gleichzeitig der Dateiname der Grafik: assets/produkte/<id>.png
// Solange keine Grafik existiert, zeichnet das Spiel einen Platzhalter aus shape/color/accent/mark.
// Formen (shape): carton, bottle, jar, box, boxtall, loaf, pack, round, stick, bag, crescent, flat

window.GAME_DATA = {
  PRODUCTS: {
    // --- Level 1: Zmorge ---
    vollmilch:      { name: 'Vollmilch',      shape: 'carton',  color: '#ffffff', accent: '#2f6fd6' },
    milchdrink:     { name: 'Milchdrink',     shape: 'carton',  color: '#ffffff', accent: '#2f6fd6', mark: '½' },
    haferdrink:     { name: 'Haferdrink',     shape: 'carton',  color: '#f3e6c8', accent: '#a07a3a' },
    zopf:           { name: 'Zopf',           shape: 'loaf',    color: '#e3a650', accent: '#b9772c' },
    toastbrot:      { name: 'Toastbrot',      shape: 'boxtall', color: '#f2d9a6', accent: '#c9a25c' },
    konfi_erdbeer:  { name: 'Erdbeer-Konfi',  shape: 'jar',     color: '#d8343f', accent: '#ffffff' },
    konfi_aprikose: { name: 'Aprikosen-Konfi',shape: 'jar',     color: '#f08a2c', accent: '#ffffff' },
    eier_bio:       { name: 'Bio-Eier',         shape: 'pack',    color: '#cfe8c0', accent: '#f6ecd9', mark: 'Bio', markColor: '#2e8b3d' },
    eier:           { name: 'Eier',           shape: 'pack',    color: '#cfd6dc', accent: '#f6ecd9' },
    butter:         { name: 'Butter',         shape: 'box',     color: '#ffe066', accent: '#2f6fd6' },
    margarine:      { name: 'Margarine',      shape: 'box',     color: '#ffe066', accent: '#3aa35b', mark: 'V', markColor: '#3aa35b' },
    orangensaft:    { name: 'Orangensaft',    shape: 'bottle',  color: '#ffa526', accent: '#2b9a48' },
    gipfeli:        { name: 'Gipfeli',        shape: 'crescent',color: '#e9a957', accent: '#b9772c' },
    muesli:         { name: 'Müesli',         shape: 'boxtall', color: '#8fc2e6', accent: '#e2701b' },

    // --- Level 2: Grillabend ---
    cervelat:       { name: 'Cervelat',       shape: 'stick',   color: '#b5473a', accent: '#7a2a22' },
    bratwurst:      { name: 'Bratwurst',      shape: 'stick',   color: '#e8cfae', accent: '#b08b5d' },
    ketchup:        { name: 'Ketchup',        shape: 'bottle',  color: '#d72f2f', accent: '#ffffff' },
    senf:           { name: 'Senf',           shape: 'bottle',  color: '#f2c12e', accent: '#ffffff' },
    mayonnaise:     { name: 'Mayo',           shape: 'bottle',  color: '#fbf4dc', accent: '#2f6fd6' },
    maiskolben:     { name: 'Maiskolben',     shape: 'stick',   color: '#f7d33c', accent: '#6fae4a' },
    salat:          { name: 'Salat',          shape: 'round',   color: '#7cc455', accent: '#3d8a2c' },
    tomaten:        { name: 'Tomaten',        shape: 'round',   color: '#e2412f', accent: '#3d8a2c' },
    wasser:         { name: 'Mineral',        shape: 'bottle',  color: '#bfe3f7', accent: '#2f6fd6' },
    eistee:         { name: 'Eistee',         shape: 'bottle',  color: '#d9902f', accent: '#f2c12e' },
    chips:          { name: 'Chips Nature',   shape: 'bag',     color: '#f7d33c', accent: '#d72f2f' },
    chips_paprika:  { name: 'Chips Paprika',  shape: 'bag',     color: '#e8602c', accent: '#d72f2f' },

    // --- Level 3: Fondue-Abend ---
    fondue:         { name: 'Fondue',         shape: 'box',     color: '#e23b3b', accent: '#ffffff' },
    raclette:       { name: 'Raclette',       shape: 'box',     color: '#f2c12e', accent: '#e23b3b' },
    brot_halbweiss: { name: 'Halbweiss',      shape: 'loaf',    color: '#e0b06a', accent: '#a7742f' },
    brot_ruch:      { name: 'Ruchbrot',       shape: 'loaf',    color: '#8a5a2e', accent: '#5e3b1c' },
    knoblauch:      { name: 'Knoblauch',      shape: 'round',   color: '#f4efe4', accent: '#a89b7d' },
    zwiebel:        { name: 'Zwiebeln',       shape: 'round',   color: '#c98a3e', accent: '#7a5222' },
    gurken:         { name: 'Gurken',         shape: 'jar',     color: '#5e9c3a', accent: '#e9e2c8' },
    silberzwiebeln: { name: 'Silberzwiebeln', shape: 'jar',     color: '#e9e6dc', accent: '#5e9c3a' },
    birnen:         { name: 'Birnen',         shape: 'round',   color: '#cfd85a', accent: '#6b8a2c' },
    aepfel:         { name: 'Äpfel',          shape: 'round',   color: '#d6433b', accent: '#6b8a2c' },
    tee:            { name: 'Kräutertee',     shape: 'box',     color: '#7fbf6a', accent: '#ffffff' },
    tee_frucht:     { name: 'Früchtetee',     shape: 'box',     color: '#d65a7a', accent: '#ffffff' },
    schokolade:     { name: 'Schoggi',        shape: 'flat',    color: '#6b3e26', accent: '#f2e3c6' },
  },

  LEVELS: [
    {
      id: 'zmorge',
      title: 'Zmorge',
      subtitle: 'Sonntagszmorge für die ganze Familie',
      list: [
        { id: 'vollmilch', qty: 2 },
        { id: 'zopf', qty: 1 },
        { id: 'konfi_erdbeer', qty: 1 },
        { id: 'eier_bio', qty: 1 },
        { id: 'butter', qty: 1 },
        { id: 'orangensaft', qty: 1 },
      ],
      distractors: ['milchdrink', 'haferdrink', 'toastbrot', 'konfi_aprikose', 'eier', 'margarine', 'gipfeli', 'muesli'],
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
        { id: 'cervelat', qty: 4 },
        { id: 'ketchup', qty: 1 },
        { id: 'maiskolben', qty: 2 },
        { id: 'salat', qty: 1 },
        { id: 'wasser', qty: 2 },
        { id: 'chips', qty: 1 },
      ],
      distractors: ['bratwurst', 'senf', 'mayonnaise', 'tomaten', 'eistee', 'chips_paprika'],
      distractorCopies: 3,
      spawnEvery: 0.7,
      speed: [470, 620],
      itemSize: 140,
      timeLimit: null,
      palette: { sky: ['#ffd9b5', '#f2895a'], floor: '#86b562', floorLine: '#6a9a49', accent: '#c2410c', shelf: 'rgba(120,40,10,0.08)' },
      fact: 'Wurst, Saucen, Gemüse, Getränke – für einen Grillabend kommt das halbe Sortiment zusammen.',
    },
    {
      id: 'fondue',
      title: 'Fondue-Abend',
      subtitle: 'Kurz vor Ladenschluss, die Gäste kommen gleich',
      list: [
        { id: 'fondue', qty: 1 },
        { id: 'brot_halbweiss', qty: 2 },
        { id: 'knoblauch', qty: 1 },
        { id: 'gurken', qty: 1 },
        { id: 'birnen', qty: 2 },
        { id: 'tee', qty: 1 },
      ],
      distractors: ['raclette', 'brot_ruch', 'zwiebel', 'silberzwiebeln', 'aepfel', 'tee_frucht', 'schokolade'],
      distractorCopies: 3,
      spawnEvery: 0.55,
      speed: [580, 770],
      itemSize: 135,
      timeLimit: 75,
      palette: { sky: ['#1f3157', '#3d5a8a'], floor: '#e8eef7', floorLine: '#c3cfe0', accent: '#c81e3a', shelf: 'rgba(255,255,255,0.06)' },
      fact: 'Käse, Brot, Beilagen und Tee: Auch für einen gemütlichen Abend ist die Auswahl riesig.',
    },
  ],
};
