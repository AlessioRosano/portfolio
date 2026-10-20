// Jeder Besuch bekommt zufällig eine Farbe: Orange, Pink oder Blau.
// Während eines Besuchs bleibt sie gleich (sessionStorage), beim nächsten Besuch wird neu gewürfelt.
// Läuft vor dem ersten Zeichnen, damit nichts aufblitzt; passt auch Favicon und Browserfarbe an.
(function () {
  var colors = { orange: "#ff6600", pink: "#fa51e1", blue: "#1f3fff" };
  var names = Object.keys(colors);
  var theme;
  try { theme = sessionStorage.getItem("ar-visit-theme"); } catch (e) {}
  if (!colors[theme]) {
    theme = names[Math.floor(Math.random() * names.length)];
    try { sessionStorage.setItem("ar-visit-theme", theme); } catch (e) {}
  }
  if (theme !== "orange") document.documentElement.dataset.theme = theme;

  var hex = colors[theme];
  // Tab-Icon in der Besuchsfarbe (die Dateien favicon.svg/.ico für Google bleiben orange)
  var icon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  if (icon && theme !== "orange") {
    icon.href = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="' + hex + '"/><text x="16" y="21.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="14" fill="#fff">AR</text></svg>');
  }
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = hex;
})();
