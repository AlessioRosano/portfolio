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
  var icon = document.querySelector('link[rel="icon"]');
  if (icon) icon.href = icon.href.replace(/%23ff6600/gi, encodeURIComponent(hex));
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = hex;
})();
