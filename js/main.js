/* ==========================================================================
   Alessio Rosano — Portfolio
   Gemeinsames Script für Startseite und Disziplin-Unterseiten.
   Inhalte (Texte, Projekte, Kontakt) kommen vom CMS über api/data.php.
   ========================================================================== */

/* ── Helpers ($, $$, pad, esc, projectIds: js/utils.js) ───────── */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = !!window.gsap;
const PAGE = document.body.dataset.page || null;
const SUB = PAGE === "discipline" ? new URLSearchParams(location.search).get("d") : null;
let lenis = null;
let introDone = false;

const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
};

// Loader nur beim allerersten Besuch — danach nur ein kurzer Übergang
const QUICK = store.get("ar-seen") === "1";
if (QUICK) document.documentElement.classList.add("is-quick");

history.scrollRestoration = "manual";
window.scrollTo(0, 0);

// <img> mit srcset: der Browser lädt nur die WebP-Variante, die zur Anzeigegrösse passt
// (Varianten erzeugt der Server, siehe IMAGES aus api/data.php). sizes = ungefähre Anzeigebreite.
function img(src, alt, sizes, { eager = false } = {}) {
  const v = IMAGES[src];
  const srcset = v ? ` srcset="${v.sizes.map((w) => `${esc(src.replace(/\.\w+$/, `.w${w}.webp`))} ${w}w`).join(", ")}" sizes="${sizes}" width="${v.w}" height="${v.h}"` : "";
  const load = eager ? ` fetchpriority="high"` : ` loading="lazy"`;
  return `<img src="${esc(src)}"${srcset} alt="${esc(alt)}"${load} decoding="async" />`;
}

// Titelbild = erstes Bild; ohne Bilder wird eine Platzhalter-Grafik generiert
function media(p, W, H, sizes, opts) {
  const src = p.images?.[0];
  if (src) return img(src, p.title, sizes, opts);
  return makeArt(p.cat, p.art, W, H, p.title);
}

// Inhalte aus dem CMS — werden beim Start geladen (siehe Boot)
let CONTACT_EMAIL, NAME, CATS, DISCIPLINES, PROJECTS, SOCIAL, ABOUT, IMAGES, PROJECT_IDS;

async function loadContent() {
  const res = await fetch("api/data.php", { cache: "no-store" });
  if (!res.ok) throw new Error(`Inhalte nicht geladen (${res.status})`);
  ({ CONTACT_EMAIL, NAME, CATS, DISCIPLINES, PROJECTS, SOCIAL, ABOUT, IMAGES } = await res.json());
  SOCIAL ??= [];
  IMAGES ??= {};
  ABOUT ??= {};
  PROJECT_IDS = projectIds(PROJECTS);
}
const projectUrl = (p) => `projekt.html?p=${PROJECT_IDS[PROJECTS.indexOf(p)]}`;
const disciplineUrl = (cat) => `disziplin.html?d=${encodeURIComponent(cat)}`;

// Fotos: in der Übersicht schwarz-weiss, auf der Projektseite farbig (siehe CSS)
const mediaClass = (p) => (p.images?.length ? " is-photo" : "");

/* ── Grosse Namen / Titel (Loader, Hero, Footer) ─────────────── */
function buildNames() {
  $$("[data-name]").forEach((el) => {
    const text = el.dataset.name || NAME;
    const inner = document.createElement("span");
    inner.className = "name-inner";
    inner.innerHTML = text.split(" ").map((w) =>
      `<span class="word">${[...w].map((ch) => `<span class="m"><span class="c">${ch}</span></span>`).join("")}</span>`
    ).join("");
    el.appendChild(inner);
  });
}

function fitNames() {
  $$("[data-name]").forEach((el) => {
    const inner = $(".name-inner", el);
    el.style.fontSize = "100px";
    let fs = (100 * el.clientWidth) / inner.scrollWidth;
    const max = parseFloat(el.dataset.max);
    if (max) {
      const h = inner.offsetHeight * (fs / 100);
      if (h > innerHeight * max) fs *= (innerHeight * max) / h;
    }
    el.style.fontSize = `${Math.floor(fs * 100) / 100}px`;
  });
}

/* ── Seitenübergang ──────────────────────────────────────────── */
const cover = $(".cover");

function navigate(url) {
  if (!hasGsap || reduced) { location.href = url; return; }
  lenis?.stop();
  gsap.to(cover, { opacity: 1, duration: 0.35, ease: "power2.out", onComplete: () => (location.href = url) });
}

function initLinks() {
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const href = a.getAttribute("href");

    // Anker auf derselben Seite → sanft scrollen
    if (href.startsWith("#")) {
      const target = href === "#top" ? 0 : $(href);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { duration: 1.6 });
      else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: "smooth" });
      return;
    }

    // Interne Seite → mit Übergang
    if (/\.html(\?[^#]*)?(#.*)?$/.test(href) && !/^[a-z]+:/i.test(href)) {
      e.preventDefault();
      navigate(href);
    }
  });

  // Zurück-Button (bfcache): Cover wieder öffnen
  addEventListener("pageshow", (e) => {
    if (e.persisted && hasGsap) { gsap.set(cover, { opacity: 0 }); lenis?.start(); }
  });
}

/* ── Hero-Slider (Startseite) ────────────────────────────────── */
const SLIDER_MQ = matchMedia("(max-width: 760px)");
SLIDER_MQ.addEventListener("change", () => buildSlider());
function buildSlider() {
  const track = $("[data-track]");
  if (!track) return;
  if (!PROJECTS?.length) return;
  // Desktop: grosse Querformate, Mobile: Hochformat
  const [W, H] = SLIDER_MQ.matches ? [400, 500] : [750, 500];
  const cards = [];
  // Mindestens 8 Karten, damit die Endlos-Reihe den Bildschirm füllt
  for (let i = 0; i < Math.max(8, PROJECTS.length); i++) {
    const p = PROJECTS[i % PROJECTS.length];
    cards.push(`
      <div class="card" data-href="${projectUrl(p)}" data-cursor="Ansehen">
        <div class="media${mediaClass(p)}">${media(p, W, H, "(max-width: 760px) 72vw, 60vw")}</div>
        <div class="card__cap mono"><span>[AR—${pad(i + 1, 3)}] ${esc(p.title)}</span><span>${esc(CATS[p.cat])} — ${esc(p.year)}</span></div>
      </div>`);
  }
  track.innerHTML = cards.join("") + cards.join("");
}

function sizeSlider() {
  const hero = $(".hero");
  const slider = $("[data-slider]");
  if (!slider) return;
  if (SLIDER_MQ.matches) { hero.style.removeProperty("--card-h"); return; }
  const meta = $(".hero__meta");
  const foot = $(".hero__foot");
  const top = meta.offsetTop + meta.offsetHeight;          // Layout-Werte, unabhängig von Transforms
  const cs = getComputedStyle(slider);
  const chrome = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 20 /* Karten-Padding */ + 30 /* Bildzeile */;
  const avail = innerHeight - top - foot.offsetHeight - chrome - parseFloat(getComputedStyle(hero).paddingBottom);
  const h = Math.max(320, Math.min(avail, innerWidth * 0.5));
  hero.style.setProperty("--card-h", `${Math.round(h)}px`);
}

function initSlider() {
  const slider = $("[data-slider]");
  if (!slider) return;
  const track = $("[data-track]");
  let x = 0, boost = 0, hover = false, drag = false, lastX = 0, moved = 0, card = null;
  const base = 0.55;

  slider.addEventListener("mouseenter", () => (hover = true));
  slider.addEventListener("mouseleave", () => (hover = false));
  slider.addEventListener("pointerdown", (e) => {
    drag = true; moved = 0; lastX = e.clientX;
    card = e.target.closest(".card");
    slider.classList.add("is-drag");
    slider.setPointerCapture(e.pointerId);
  });
  slider.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const d = e.clientX - lastX;
    lastX = e.clientX; moved += Math.abs(d); x += d;
  });
  slider.addEventListener("pointerup", () => {
    drag = false;
    slider.classList.remove("is-drag");
    if (card && moved < 6) navigate(card.dataset.href);
  });
  slider.addEventListener("pointercancel", () => { drag = false; slider.classList.remove("is-drag"); });

  if (lenis) lenis.on("scroll", (l) => { boost = Math.min(Math.abs(l.velocity) * 0.6, 24); });

  gsap.ticker.add((t, dt) => {
    const half = track.scrollWidth / 2;
    if (!drag) x -= ((hover ? base * 0.3 : base) + boost) * (dt / 16.67);
    boost *= 0.93;
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
}

/* ── Wer (Startseite, gepflegt im CMS unter «Wer») ─────────────── */
function buildAbout() {
  const statement = $("[data-about-statement]");
  if (!statement) return;
  statement.textContent = ABOUT.statement || "";

  const portrait = $("[data-about-portrait]");
  portrait.hidden = !ABOUT.portrait;
  $(".media", portrait).innerHTML = ABOUT.portrait ? img(ABOUT.portrait, `Portrait von ${NAME}`, "(max-width: 760px) 100vw, 33vw") : "";
  $("figcaption", portrait).textContent = ABOUT.caption || "";

  const rows = (ABOUT.specs || []).filter(([k, v]) => k || v).map(([k, v]) => [esc(k), esc(v)]);
  if (ABOUT.status) rows.push(["Status", `<span class="dot"></span> ${esc(ABOUT.status)}`]);
  $("[data-about-specs]").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

/* ── Social-Links im Footer (gepflegt im CMS unter «Allgemein») ── */
function buildSocial() {
  const links = SOCIAL.filter((s) => s.label && s.url);
  $$("[data-social]").forEach((el) => {
    el.insertAdjacentHTML("beforeend", links.map((s) =>
      `<a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label)} ↗</a>`).join(""));
    el.hidden = !links.length;
  });
}

/* ── Disziplinen (Startseite) ────────────────────────────────── */
function buildDisciplines() {
  const list = $("[data-services]");
  if (!list) return;
  list.innerHTML = DISCIPLINES.map((d, i) => {
    const ps = PROJECTS.filter((p) => p.cat === d.cat);
    return `
      <a class="svc" href="${disciplineUrl(d.cat)}" data-cursor="Öffnen">
        <div class="svc__head">
          <span class="mono">${pad(i + 1)}</span>
          <h3>${esc(CATS[d.cat])}</h3>
          <span class="mono svc__count">${pad(ps.length)} Projekte</span>
          <span class="svc__arrow" aria-hidden="true">→</span>
        </div>
        <div class="svc__body"><div>
          <div class="svc__content">
            <span></span>
            <p>${esc(d.lead)}</p>
            <div class="tags mono">${d.tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>
            <div class="svc__thumbs">${ps.slice(0, 2).map((p) => `<div class="media${mediaClass(p)}">${media(p, 400, 500, "120px")}</div>`).join("")}</div>
          </div>
        </div></div>
      </a>`;
  }).join("");
}

/* ── Disziplin-Unterseite ────────────────────────────────────── */
function buildSub() {
  if (PAGE !== "discipline") return;
  const i = DISCIPLINES.findIndex((d) => d.cat === SUB);
  if (i < 0) { location.replace("index.html#was"); return; }
  const d = DISCIPLINES[i];
  const name = CATS[SUB];
  const ps = PROJECTS.filter((p) => p.cat === SUB);
  const years = ps.map((p) => p.year).filter(Boolean);

  document.title = `${name} — ${NAME}`;
  $('meta[name="description"]').content = `${name}: Projekte und Arbeitsweise von ${NAME}.`;
  $$("[data-name]").forEach((el) => { if (!el.closest(".footer")) el.dataset.name = name; });
  $("h1.hero__name").setAttribute("aria-label", name);
  $("[data-d-loader]").textContent = `AR / ${name.toUpperCase()}`;
  $("[data-d-route]").textContent = SUB;
  $$("[data-d-index]").forEach((el) => (el.textContent = `Disziplin ${pad(i + 1)} / ${pad(DISCIPLINES.length)}`));

  $("[data-d-lead]").textContent = d.lead;
  const span = years.length ? `, ${Math.min(...years)}–${Math.max(...years)}` : "";
  $("[data-d-count]").textContent = `${pad(ps.length)} ${ps.length === 1 ? "Projekt" : "Projekte"}${span}`;
  $("[data-d-tags]").innerHTML = d.tags.map((t) => `<span>${esc(t)}</span>`).join("");
  $("[data-d-steps]").innerHTML = d.steps.map(([t, x], n) => `
    <div class="step"><span class="mono">Schritt ${pad(n + 1)}</span><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`).join("");
  $("[data-d-specs]").innerHTML = [
    ["Disziplin", esc(name)], ["Tools", esc(d.tools)], ["Projekte", pad(ps.length)],
    ["Kontakt", `<a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)} ↗</a>`],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  const ni = (i + 1) % DISCIPLINES.length;
  const next = $("[data-d-next]");
  next.href = disciplineUrl(DISCIPLINES[ni].cat);
  $("[data-d-next-label]").textContent = `Nächste Disziplin — ${pad(ni + 1)} / ${pad(DISCIPLINES.length)}`;
  $("[data-d-next-title]").textContent = CATS[DISCIPLINES[ni].cat];

  buildWork(ps);
}

function buildWork(list) {
  const grid = $("[data-work]");
  if (!grid) return;
  grid.innerHTML = list.map((p, j) => {
    const land = j % 4 === 1 || j % 4 === 2;
    const [W, H] = land ? [500, 400] : [400, 500];
    return `
      <a class="work__item" href="${projectUrl(p)}" data-pos="${j % 4}" data-cursor="Ansehen">
        <div class="work__frame"><div class="media${mediaClass(p)}" style="aspect-ratio:${W} / ${H}">${media(p, W, H, "(max-width: 760px) 100vw, 50vw")}</div></div>
        <div class="work__meta">
          <span class="mono">[${pad(j + 1)}]</span>
          <h3>${esc(p.title)}<em class="serif">${esc(p.role)}</em></h3>
          <span class="mono">${esc(p.year)}</span>
        </div>
      </a>`;
  }).join("");
}

/* ── Projektseite (vollflächig) ──────────────────────────────── */
function buildProject() {
  if (PAGE !== "project") return;
  const id = new URLSearchParams(location.search).get("p");
  const i = PROJECT_IDS.indexOf(id);
  if (i < 0) { location.replace("index.html#was"); return; }
  const p = PROJECTS[i];
  const siblings = PROJECTS.filter((x) => x.cat === p.cat);
  const k = siblings.indexOf(p);

  document.title = `${p.title} — ${NAME}`;
  $$("[data-name]").forEach((el) => { if (!el.closest(".footer")) el.dataset.name = p.title; });
  $("h1.hero__name").setAttribute("aria-label", p.title);

  const back = $("[data-p-back]");
  back.href = disciplineUrl(p.cat);
  back.textContent = `← ${CATS[p.cat]}`;
  $("[data-p-count]").textContent = `Projekt ${pad(k + 1)} / ${pad(siblings.length)}`;
  $("[data-p-crumb-loader]").textContent = `${CATS[p.cat]} — ${p.year}`;
  $("[data-p-role]").textContent = p.role;
  $("[data-p-meta]").textContent = `${CATS[p.cat]}, ${p.year}`;

  // Titelbild über die ganze Breite (Mobile hochkant)
  const cover = $("[data-p-cover]");
  const [W, H] = SLIDER_MQ.matches ? [800, 1000] : [1600, 900];
  cover.innerHTML = `<div class="media${mediaClass(p)}">${media(p, W, H, "100vw", { eager: true })}</div>`;

  $("[data-p-desc]").textContent = p.desc;
  const specs = [["Disziplin", esc(CATS[p.cat])], ["Jahr", esc(p.year)], ["Rolle", esc(p.role)], ["Tools", esc(p.tools)]];
  if (p.link) specs.push(["Link", `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))} ↗</a>`]);
  $("[data-p-specs]").innerHTML = specs.filter(([, v]) => v).map(([k2, v]) => `<div><dt>${k2}</dt><dd>${v}</dd></div>`).join("");

  // Galerie: abwechselnd ein grosses Bild und zwei nebeneinander
  $("[data-p-gallery]").innerHTML = (p.images || []).slice(1).map((src, n) =>
    `<figure class="pgallery__item${n % 3 === 0 ? " is-wide" : ""}"><div class="media${mediaClass(p)}">${img(src, `${p.title} — Bild ${n + 2}`, n % 3 === 0 ? "100vw" : "(max-width: 760px) 100vw, 50vw")}</div></figure>`).join("");

  // Nächstes Projekt: innerhalb der Disziplin, sonst das nächste insgesamt
  const next = siblings.length > 1 ? siblings[(k + 1) % siblings.length] : PROJECTS[(i + 1) % PROJECTS.length];
  const nextEl = $("[data-p-next]");
  nextEl.href = projectUrl(next);
  $("[data-p-next-label]").textContent = `Nächstes Projekt — ${CATS[next.cat]}`;
  $("[data-p-next-title]").textContent = next.title;
}

/* ── Zeilen-Split für Titel ──────────────────────────────────── */
function splitLines(el) {
  if (!el.dataset.src) el.dataset.src = el.innerHTML;
  el.innerHTML = el.dataset.src;
  const words = [];
  const parts = [];
  [...el.childNodes].forEach((n) => {
    n.textContent.split(/\s+/).filter(Boolean).forEach((word) => {
      const s = document.createElement("span");
      if (n.nodeType === 1) {
        const inner = document.createElement(n.tagName.toLowerCase());
        inner.className = n.className;
        inner.textContent = word;
        s.appendChild(inner);
      } else s.textContent = word;
      words.push(s);
      parts.push(s, document.createTextNode(" "));
    });
  });
  el.innerHTML = "";
  parts.forEach((p) => el.appendChild(p));

  const lines = [];
  let top = null;
  words.forEach((w) => {
    if (top === null || Math.abs(w.offsetTop - top) > 4) { lines.push([]); top = w.offsetTop; }
    lines[lines.length - 1].push(w);
  });
  el.innerHTML = "";
  lines.forEach((ws) => {
    const line = document.createElement("span");
    line.className = "line";
    const inner = document.createElement("span");
    ws.forEach((w, i) => { inner.appendChild(w); if (i < ws.length - 1) inner.appendChild(document.createTextNode(" ")); });
    line.appendChild(inner);
    el.appendChild(line);
  });
  return $$(".line > span", el);
}

/* ── Scroll-Animationen ──────────────────────────────────────── */
function revealOnEnter(trigger, targets, vars) {
  if (!trigger || !targets.length) return;
  ScrollTrigger.create({ trigger, start: "top 85%", once: true, onEnter: () => gsap.to(targets, vars) });
}

// Elemente blenden von unten ein, sobald sie ins Bild scrollen (gemeinsam ankommende gestaffelt)
function fadeIn(targets, y = 40, vars = {}) {
  if (!targets.length) return;
  gsap.set(targets, { opacity: 0, y });
  ScrollTrigger.batch(targets, {
    start: "top 90%",
    once: true,
    onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.2, ease: "expo.out", stagger: 0.1, ...vars }),
  });
}

function initScroll() {
  $$(".split").forEach((el) => {
    const inner = splitLines(el);
    gsap.set(inner, { yPercent: 110 });
    revealOnEnter(el, inner, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.08 });
  });

  fadeIn($$("main .label"), 10, { duration: 0.8, ease: "power3.out" });
  fadeIn($$(".work__item"), 80, { stagger: 0.12 });
  fadeIn($$(".pgallery__item"), 60);
  fadeIn($$(".services__list > *, .about__grid > *, .form > *, .process__grid > *, .process__specs > *, .pinfo__grid > *, .contact__inner--cta .btn"));

  // Projektseite: Titelbild zoomt beim Scrollen leicht heraus
  const coverMedia = $(".pcover .media > *");
  if (coverMedia) {
    gsap.fromTo(coverMedia, { scale: 1.12 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: ".pcover", start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  // Über-mich-Text: Wort für Wort beim Scrollen
  const st = $("[data-words]");
  if (st) {
    st.innerHTML = st.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(" ");
    const words = $$(".w", st);
    ScrollTrigger.create({
      trigger: st,
      start: "top 80%",
      end: "bottom 45%",
      scrub: true,
      onUpdate: (s) => {
        const n = Math.round(s.progress * words.length);
        words.forEach((w, i) => (w.style.opacity = i < n ? 1 : ""));
      },
    });
  }

  // Footer-Name steigt Buchstabe für Buchstabe
  const fc = $$(".footer__name .c");
  gsap.set(fc, { yPercent: 110 });
  revealOnEnter($(".footer__name"), fc, { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.03 });

  // Hero-Name leichter Parallax beim Rausscrollen
  gsap.to(".hero__name", {
    yPercent: 30,
    ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });

  // Nav-Zustände
  const nav = $(".nav");
  ScrollTrigger.create({ start: 40, onToggle: (s) => nav.classList.toggle("is-scrolled", s.isActive) });
  ScrollTrigger.create({
    trigger: "#kontakt",
    start: "top 50px",
    end: "bottom top",
    onToggle: (s) => { nav.classList.toggle("is-dark", s.isActive); cursor.classList.toggle("is-light", s.isActive); },
  });
}

/* ── Scroll-Fortschritt ──────────────────────────────────────── */
function initProgress() {
  const el = $("[data-progress]");
  const update = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    el.textContent = `${pad(Math.round((scrollY / Math.max(max, 1)) * 100), 3)}%`;
  };
  addEventListener("scroll", update, { passive: true });
  update();
}

/* ── Cursor ──────────────────────────────────────────────────── */
const cursor = $(".cursor");
function initCursor() {
  if (matchMedia("(hover: none), (pointer: coarse)").matches) return;
  const label = $(".cursor__label");
  const xTo = gsap.quickTo(cursor, "x", { duration: 0.35, ease: "power3" });
  const yTo = gsap.quickTo(cursor, "y", { duration: 0.35, ease: "power3" });
  cursor.classList.add("is-hidden");
  addEventListener("pointermove", (e) => { xTo(e.clientX); yTo(e.clientY); cursor.classList.remove("is-hidden"); });
  document.addEventListener("mouseleave", () => cursor.classList.add("is-hidden"));
  document.addEventListener("pointerover", (e) => {
    const t = e.target.closest("[data-cursor]");
    cursor.classList.toggle("is-view", !!t);
    cursor.classList.toggle("is-invert", !!t && t.matches(".svc, .next"));
    if (t) label.textContent = t.dataset.cursor;
  });
}

/* ── Uhr ─────────────────────────────────────────────────────── */
function initClock() {
  const fmt = new Intl.DateTimeFormat("de-CH", { timeZone: "Europe/Zurich", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const els = $$("[data-clock]");
  const tick = () => { const t = fmt.format(new Date()); els.forEach((e) => (e.textContent = t)); };
  tick();
  setInterval(tick, 1000);
}

/* ── Kontaktformular (öffnet Mail-Programm) ──────────────────── */
function initForm() {
  const form = $("[data-form]");
  if (!form) return;
  const status = $("[data-status]");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    $$("[required]", form).forEach((f) => {
      const valid = f.value.trim() && f.checkValidity();
      f.classList.toggle("is-invalid", !valid);
      if (!valid) ok = false;
    });
    if (!ok) { status.textContent = "Bitte Name, E-Mail und Projekt ausfüllen."; return; }

    const d = new FormData(form);
    const body = [
      `Name: ${d.get("name")}`,
      `E-Mail: ${d.get("email")}`,
      "",
      d.get("message"),
    ].join("\n");
    location.href = `mailto:${encodeURIComponent(CONTACT_EMAIL).replace("%40", "@")}?subject=${encodeURIComponent(`Projektanfrage — ${d.get("name")}`)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Mail-Programm wird geöffnet …";
  });
  form.addEventListener("input", (e) => e.target.classList.remove("is-invalid"));
}

/* ── Farbschalter Orange / Pink ──────────────────────────────── */
// Alles (auch die Platzhalter-Grafiken) hängt an der CSS-Variable --bx und färbt sich selbst um
function initTheme() {
  const root = document.documentElement;
  const meta = $('meta[name="theme-color"]');
  const btns = $$("[data-theme-toggle]");
  const sync = () => {
    const pink = root.dataset.theme === "pink";
    btns.forEach((b) => {
      b.setAttribute("aria-pressed", pink);
      $("[data-theme-label]", b).textContent = pink ? "Pink" : "Orange";
    });
    meta?.setAttribute("content", getComputedStyle(root).getPropertyValue("--bx").trim());
  };
  btns.forEach((b) => b.addEventListener("click", () => {
    const pink = root.dataset.theme !== "pink";
    root.classList.add("theme-anim");
    if (pink) root.dataset.theme = "pink"; else delete root.dataset.theme;
    try { localStorage.setItem("ar-theme", pink ? "pink" : "orange"); } catch {}
    sync();
    setTimeout(() => root.classList.remove("theme-anim"), 600);
  }));
  sync();
}

/* ── Tastatur: G = Raster ─────────────────────────────────────── */
addEventListener("keydown", (e) => {
  const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName);
  if (!typing && (e.key === "g" || e.key === "G")) $(".grid-overlay").classList.toggle("is-on");
});

/* ── Intro / Loader ──────────────────────────────────────────── */
function unlock() {
  document.body.classList.remove("is-loading");
  introDone = true;
  store.set("ar-seen", "1");
  lenis?.start();
  if (hasGsap) ScrollTrigger.refresh();
}

function jumpTo(target) {
  if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
  else window.scrollTo(0, target.offsetTop);
}

function intro() {
  const loader = $(".loader");
  const hName = $(".hero__name");
  const lChars = $$(".loader__name .c");
  const countEl = $("[data-count]");
  const hashTarget = location.hash.length > 1 ? $(location.hash) : null;
  // Erster Besuch direkt auf einer Unterseite: etwas kürzerer Loader
  const fast = !!SUB;
  const D = fast ? 0.9 : 2.4;

  if (reduced || !hasGsap) {
    loader?.remove();
    unlock();
    if (hashTarget) jumpTo(hashTarget);
    return;
  }

  // Seitenwechsel: nur Vorhang auf + Titel kurz hochschieben
  if (QUICK) {
    const hChars = $$(".hero__name .c");
    if (hashTarget) { unlock(); jumpTo(hashTarget); }
    else {
      gsap.set(hChars, { yPercent: 110 });
      gsap.set(".hero .reveal-up", { yPercent: 120 });
      gsap.set(".hero .card, .hero__tags > *, .pcover", { opacity: 0, y: 40 });
    }
    const tl = gsap.timeline();
    tl.to(loader, { autoAlpha: 0, duration: 0.35, ease: "power2.out" })
      .add(() => { loader.remove(); if (!hashTarget) unlock(); });
    if (!hashTarget) {
      tl.to(hChars, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.015 }, 0.1)
        .to(".hero .reveal-up", { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 }, 0.25)
        .to(".hero .card, .hero__tags > *, .pcover", { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.03 }, 0.3);
    }
    return;
  }

  const count = { v: 0 };
  const tl = gsap.timeline({ delay: 0.1 });
  gsap.set(lChars, { yPercent: 110 });
  tl.to(lChars, { yPercent: 0, duration: fast ? 0.8 : 1.1, ease: "expo.out", stagger: fast ? 0.025 : 0.035 }, 0)
    .to(".loader__log li", { opacity: 1, duration: 0.01, stagger: D / 6 }, 0.1)
    .to(count, { v: 100, duration: D, ease: "power2.inOut", onUpdate: () => (countEl.textContent = pad(Math.round(count.v), 3)) }, 0.1)
    .to(".loader__bar span", { scaleX: 1, duration: D, ease: "power2.inOut" }, 0.1);

  // Ankunft mit Anker (z. B. index.html#kontakt): direkt dorthin, dann aufdecken
  if (hashTarget) {
    tl.add(() => { unlock(); jumpTo(hashTarget); })
      .to(loader, { opacity: 0, duration: 0.5, ease: "power2.out" })
      .add(() => loader.remove());
    return;
  }

  const r = hName.getBoundingClientRect();
  gsap.set(hName, { y: innerHeight / 2 - (r.top + r.height / 2), scale: 0.4 });
  gsap.set(".hero .reveal-up", { yPercent: 120 });
  gsap.set(".hero .card, .hero__tags > *", { opacity: 0, y: 60, scale: 0.95 });
  if ($(".pcover")) gsap.set(".pcover", { opacity: 0, y: 80 });
  gsap.set(".nav", { yPercent: -100, opacity: 0 });

  // Loader-Name liegt deckungsgleich über dem Hero-Namen → Loader ausblenden, Name wächst
  tl.to(".loader__row, .loader__bottom, .loader__bar", { opacity: 0, duration: 0.4 }, "+=0.15")
    .set(loader, { autoAlpha: 0 })
    .to(hName, { y: 0, scale: 1, duration: 1.5, ease: "expo.inOut" })
    .to(".nav", { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out" }, "-=0.55")
    .to(".hero .reveal-up", { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, "<")
    .to(".hero .card, .hero__tags > *", { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "expo.out", stagger: 0.05 }, "<0.1")
    .add(() => { loader.remove(); unlock(); }, "-=0.6");
  if ($(".pcover")) tl.to(".pcover", { opacity: 1, y: 0, duration: 1.3, ease: "expo.out" }, "-=1.4");
}

/* ── Boot ────────────────────────────────────────────────────── */
initTheme();
initClock();
initForm();
initProgress();
initLinks();

Promise.all([loadContent(), document.fonts.ready]).then(() => {
  buildProject();
  buildSub();
  buildNames();
  buildSlider();
  buildDisciplines();
  buildAbout();
  buildSocial();
  fitNames();
  sizeSlider();

  if (!hasGsap) {
    intro();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (window.Lenis && !reduced) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.stop();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  initSlider();
  initCursor();
  initScroll();
  intro();

  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      fitNames();
      sizeSlider();
      if (introDone) ScrollTrigger.refresh();
    }, 150);
  });
}).catch((e) => {
  console.error(e);
  $(".loader")?.remove();
  unlock();
});
