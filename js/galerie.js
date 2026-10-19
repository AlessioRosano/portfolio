// Grossansicht der Kunden-Galerie (galerie.php) — Daten kommen als JSON aus der Seite
const files = JSON.parse(document.getElementById("gallery-files").textContent);
const box = document.querySelector("[data-lightbox]");
const stage = box.querySelector("[data-lb-stage]");
let current = 0;

function show(i) {
  current = (i + files.length) % files.length;
  const f = files[current];
  stage.innerHTML = f.kind === "video"
    ? `<video src="${f.src}"${f.poster ? ` poster="${f.poster}"` : ""} controls autoplay playsinline></video>`
    : `<img src="${f.src}" alt="" />`;
  if (files.length > 1) stage.insertAdjacentHTML("beforeend",
    `<button class="lb__nav lb__nav--prev" data-step="-1" aria-label="Vorheriges"></button><button class="lb__nav lb__nav--next" data-step="1" aria-label="Nächstes"></button>`);
  box.querySelector("[data-lb-name]").textContent = `${current + 1} / ${files.length} — ${f.name}`;
  box.querySelector("[data-lb-dl]").href = f.dl;
  if (!box.open) box.showModal();
  // Nächstes Foto schon vorladen, damit das Weiterblättern sofort geht
  const next = files[(current + 1) % files.length];
  if (next.kind === "image") new Image().src = next.src;
}

document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) show(+open.dataset.open);
  const step = e.target.closest("[data-step]");
  if (step) show(current + +step.dataset.step);
  if (e.target.closest("[data-lb-close]")) box.close();
});
box.addEventListener("close", () => (stage.innerHTML = ""));
addEventListener("keydown", (e) => {
  if (!box.open) return;
  if (e.key === "ArrowRight") show(current + 1);
  if (e.key === "ArrowLeft") show(current - 1);
});
