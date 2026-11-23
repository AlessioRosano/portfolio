// Grossansicht der Kunden-Galerie (galerie.php) — Daten kommen als JSON aus der Seite
const files = JSON.parse(document.getElementById("gallery-files").textContent);
const box = document.querySelector("[data-lightbox]");
const stage = box.querySelector("[data-lb-stage]");
let current = 0;

// Schärfere Version im Hintergrund laden (der Browser wählt per srcset 1200 oder 2000 px)
function sharp(f) {
  const img = new Image();
  img.alt = "";
  img.sizes = "100vw";
  if (f.srcset) img.srcset = f.srcset;
  img.src = f.src;
  return img;
}

// dir: 1 = von rechts hereingewischt, -1 = von links (nur für die Animation)
function show(i, dir = 0) {
  current = (i + files.length) % files.length;
  const f = files[current];
  // Fotos: sofort die kleine Vorschau aus der Übersicht zeigen, dann gegen die schärfere austauschen
  stage.innerHTML = f.kind === "video"
    ? `<video src="${f.src}"${f.poster ? ` poster="${f.poster}"` : ""} controls autoplay playsinline></video>`
    : `<img src="${f.thumb || f.src}" alt="" />`;
  if (f.kind === "image" && f.thumb) {
    const shown = current;
    const big = sharp(f);
    const swap = () => { if (current === shown) stage.querySelector("img")?.replaceWith(big); };
    big.complete ? swap() : big.addEventListener("load", swap, { once: true });
  }
  if (files.length > 1) stage.insertAdjacentHTML("beforeend",
    `<button class="lb__nav lb__nav--prev" data-step="-1" aria-label="Vorheriges"><span class="lb__arrow" aria-hidden="true">←</span></button><button class="lb__nav lb__nav--next" data-step="1" aria-label="Nächstes"><span class="lb__arrow" aria-hidden="true">→</span></button>`);
  box.querySelector("[data-lb-name]").textContent = `${current + 1} / ${files.length} — ${f.name}`;
  box.querySelector("[data-lb-dl]").href = f.dl;
  if (!box.open) {
    box.showModal();
    document.documentElement.classList.add("lb-open");   // Seite dahinter nicht mehr scrollbar
  }
  if (dir) slideIn(dir);
  // Nächstes Foto schon vorladen, damit das Weiterblättern sofort geht
  const next = files[(current + 1) % files.length];
  if (next.kind === "image") sharp(next);
}

document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) show(+open.dataset.open);
  const step = e.target.closest("[data-step]");
  if (step && Date.now() - swipedAt > 400) show(current + +step.dataset.step);
  if (e.target.closest("[data-lb-close]")) box.close();
});
box.addEventListener("close", () => {
  if (box.open) return;   // schon wieder geöffnet, bevor das Schliessen gemeldet wurde
  stage.innerHTML = "";
  document.documentElement.classList.remove("lb-open");
});

/* ── Wischen am Handy: links/rechts blättern, nach unten schliessen. Das Bild folgt dem Finger. ── */
const shownMedia = () => stage.querySelector("img, video");
let touch = null;        // Startpunkt des Fingers
let swipedAt = 0;        // nach einem Wisch keinen Klick auf die Blätterflächen auslösen

function slideIn(dir) {
  const m = shownMedia();
  if (!m) return;
  m.style.transform = `translateX(${dir * 60}px)`;
  m.style.opacity = "0";
  requestAnimationFrame(() => {
    m.classList.add("is-snapping");
    m.style.transform = "";
    m.style.opacity = "";
  });
}

stage.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse" || !e.isPrimary) return;
  touch = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
  shownMedia()?.classList.remove("is-snapping");
});
stage.addEventListener("pointermove", (e) => {
  if (!touch || !e.isPrimary) return;
  touch.dx = e.clientX - touch.x;
  touch.dy = e.clientY - touch.y;
  const m = shownMedia();
  if (!m) return;
  if (Math.abs(touch.dx) > Math.abs(touch.dy)) m.style.transform = `translateX(${touch.dx}px)`;
  else if (touch.dy > 0) {
    m.style.transform = `translateY(${touch.dy}px)`;
    m.style.opacity = String(Math.max(0.3, 1 - touch.dy / 400));
  }
});
const endTouch = () => {
  if (!touch) return;
  const { dx, dy } = touch;
  touch = null;
  const m = shownMedia();
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) && files.length > 1) {
    swipedAt = Date.now();
    show(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  } else if (dy > 120 && dy > Math.abs(dx)) {
    swipedAt = Date.now();
    box.close();
  } else if (m) {   // zu kurz gewischt: zurückschnappen
    m.classList.add("is-snapping");
    m.style.transform = "";
    m.style.opacity = "";
  }
};
stage.addEventListener("pointerup", endTouch);
stage.addEventListener("pointercancel", endTouch);
addEventListener("keydown", (e) => {
  if (!box.open) return;
  if (e.key === "ArrowRight") show(current + 1);
  if (e.key === "ArrowLeft") show(current - 1);
});
