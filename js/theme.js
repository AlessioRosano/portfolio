// Gewählte Farbe (Orange/Pink) vor dem ersten Zeichnen setzen — verhindert ein Aufblitzen
try { if (localStorage.getItem("ar-theme") === "pink") document.documentElement.dataset.theme = "pink"; } catch (e) {}
