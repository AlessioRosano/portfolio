/* ==========================================================================
   Alessio Rosano — Portfolio
   Gemeinsames Script für alle Seiten der Website.
   Inhalte (Texte, Projekte, Kontakt) kommen vom CMS über api/data.php.
   ========================================================================== */

/* ── Helpers ($, $$, pad, esc, isLoop, loopPoster, stillOf, projectIds: js/utils.js) ── */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Handy/Tablet: natives Scrollen mit Schwung statt Smooth-Scroll, leichtere Animationen
const TOUCH = matchMedia("(hover: none), (pointer: coarse)").matches;
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
const variant = (src, w) => src.replace(/\.\w+$/, `.w${w}.webp`);   // wie variantFile() in api/lib.php

function img(src, alt, sizes, { eager = false } = {}) {
  const v = IMAGES[src];
  const srcset = v ? ` srcset="${v.sizes.map((w) => `${esc(variant(src, w))} ${w}w`).join(", ")}" sizes="${sizes}" width="${v.w}" height="${v.h}"` : "";
  const load = eager ? ` fetchpriority="high"` : ` loading="lazy"`;
  return `<img src="${esc(src)}"${srcset} alt="${esc(alt)}"${load} decoding="async" />`;
}

// Titelbild = erstes Bild (Vorschau im Slider); ohne Bilder wird eine Platzhalter-Grafik generiert.
// Für «Zeig mal» und die Disziplin-Seite kann im CMS ein eigenes Vorschaubild gesetzt sein (Rolle).
// Video-Loops spielen nur auf der Projektseite (play), in Übersichten erscheint ihr Standbild.
const ROLES = ["previewWorks", "previewDiscipline", "previewHome", "keyvisual"];
const imageFor = (p, role) => (role && p[role] && p.images?.includes(p[role]) ? p[role] : p.images?.[0]);

function mediaItem(src, alt, sizes, { play = false, eager = false } = {}) {
  if (!isLoop(src)) return img(src, alt, sizes, { eager });
  if (!play) return `<img src="${esc(loopPoster(src))}" alt="${esc(alt)}" loading="lazy" decoding="async" />`;
  // Wer «Bewegung reduzieren» eingestellt hat, startet den Loop selbst
  const autoplay = reduced ? "controls" : "autoplay muted loop";
  return `<video src="${esc(src)}" poster="${esc(loopPoster(src))}" ${autoplay} playsinline preload="${eager ? "auto" : "metadata"}" aria-label="${esc(alt)}"></video>`;
}

function media(p, W, H, sizes, opts = {}) {
  const src = imageFor(p, opts.role) || p.filmThumb;   // ohne Bilder: Vorschaubild des Films
  if (src) return mediaItem(src, p.title, sizes, opts);
  return makeArt(p.cat, p.art, W, H, p.title);
}

// Filme eines Projekts: Liste «videos»; ältere Inhalte haben noch ein einzelnes Feld «video»
const projectFilms = (p) => (Array.isArray(p.videos) ? p.videos : p.video ? [p.video] : []);

// Textlinks in der Beschreibung: [Wort](https://…). Erst escapen, dann nur https-Links umwandeln.
const LINK_RE = /\[([^\]\n]+)\]\((https:\/\/[^\s()<>"]+)\)/g;
const linkify = (s = "") => esc(s).replace(LINK_RE, '<a href="$2" target="_blank" rel="noopener">$1</a>');
const plainText = (s = "") => s.replace(LINK_RE, "$1");   // für Meta-Beschreibung und strukturierte Daten

// Film-Link (YouTube/Vimeo) → Adresse des eingebetteten Players, datensparsam (nocookie / dnt)
function filmEmbed(url) {
  try {
    const u = new URL(url);
    if (/(^|\.)youtu(\.be|be\.com)$/.test(u.hostname)) {
      const id = u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v") || u.pathname.split("/")[2];
      if (/^[\w-]{11}$/.test(id)) return { name: "YouTube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` };
    }
    const vimeo = /(^|\.)vimeo\.com$/.test(u.hostname) && u.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-f0-9]+))?/);
    if (vimeo) return { name: "Vimeo", src: `https://player.vimeo.com/video/${vimeo[1]}?dnt=1${vimeo[2] ? `&h=${vimeo[2]}` : ""}` };
  } catch {}
  return null;
}

// Inhalte aus dem CMS — werden beim Start geladen (siehe Boot)
let CONTACT_EMAIL, NAME, CATS, DISCIPLINES, PROJECTS, SOCIAL, ABOUT, IMAGES, ALL_PROJECTS;

async function loadContent() {
  const res = await fetch("api/data.php", { cache: "no-store" });
  if (!res.ok) throw new Error(`Inhalte nicht geladen (${res.status})`);
  ({ CONTACT_EMAIL, NAME, CATS, DISCIPLINES, PROJECTS, SOCIAL, ABOUT, IMAGES } = await res.json());
  SOCIAL ??= [];
  IMAGES ??= {};
  ABOUT ??= {};
  // Adressen kommen vom Server (api/data.php); Entwürfe sind nur dabei, wenn man im CMS angemeldet ist,
  // und erscheinen dann nur auf ihrer eigenen Projektseite, nie in Slider und Übersichten
  const ids = projectIds(PROJECTS);
  PROJECTS.forEach((p, i) => (p.id ??= ids[i]));
  ALL_PROJECTS = PROJECTS;
  PROJECTS = PROJECTS.filter((p) => !p.hidden);
}
const projectUrl = (p) => `projekt.html?p=${p.id}`;
const disciplineUrl = (cat) => `disziplin.html?d=${encodeURIComponent(cat)}`;

// Fotos: farbig, nur im Slider und auf «Zeig mal» schwarz-weiss bis zum Hover (siehe CSS)
const mediaClass = (p) => (p.images?.length || p.filmThumb ? " is-photo" : "");

// Ist das Vorschaubild ein Loop, merkt sich die Karte das Video; geladen wird es erst bei Bedarf (loopVideo)
const loopAttr = (p, role) => {
  const src = imageFor(p, role);
  return src && isLoop(src) && !reduced ? ` data-loop="${esc(src)}"` : "";
};

// «04 Projekte» und «, 2023–2026» (Jahre der Projekte)
const countText = (n) => `${pad(n)} ${n === 1 ? "Projekt" : "Projekte"}`;
function yearSpan(list) {
  const years = list.map((p) => p.year).filter(Boolean);
  return years.length ? `, ${Math.min(...years)}–${Math.max(...years)}` : "";
}

// Steckbrief-Zeilen [Bezeichnung, HTML] für <dl class="specs">
const specRows = (rows) => rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

// Unterseiten: grosser Titel im Loader und Hero (der Name im Footer bleibt)
function setPageName(name) {
  $$("[data-name]").forEach((el) => { if (!el.closest(".footer")) el.dataset.name = name; });
  $("h1.hero__name").setAttribute("aria-label", name);
}

/* ── Grosse Namen / Titel (Loader, Hero, Footer) ─────────────── */
function buildNames() {
  $$("[data-name]").forEach((el) => {
    const text = el.dataset.name || NAME;
    const inner = document.createElement("span");
    inner.className = "name-inner";
    el.textContent = "";   // Text vom Server (render.php) weicht den animierten Buchstaben
    inner.innerHTML = text.split(" ").map((w) =>
      `<span class="word">${[...w].map((ch) => `<span class="m"><span class="c">${esc(ch)}</span></span>`).join("")}</span>`
    ).join(" ");   // Leerzeichen zwischen den Wörtern: Google und Screenreader lesen «Alessio Rosano»
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
    // Handy: grosse Namen (zweizeilig) etwas weniger hoch, damit Untertitel und Slider mehr Platz haben
    if (SMALL_MQ.matches && !el.closest(".footer")) fs *= 0.86;
    el.style.fontSize = `${Math.floor(fs * 100) / 100}px`;
  });
}
const SMALL_MQ = matchMedia("(max-width: 640px)");

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
// Projektkarte für Slider und «Zeig mal»: nur das Bild; beim Hover farbig, Titel in der Mitte, Loop läuft an.
// Als Link (<a>) in Rastern, als <div> im Slider (dort entscheidet das Ziehen, ob ein Klick zählt).
function projectCard(p, { W, H, sizes, link = false, role }) {
  const open = link ? `<a class="card" href="${projectUrl(p)}" aria-label="${esc(p.title)}"` : `<div class="card" data-href="${projectUrl(p)}"`;
  return `
      ${open} data-cat="${esc(p.cat)}"${loopAttr(p, role)}>
        <div class="media${mediaClass(p)}">${media(p, W, H, sizes, { role })}</div>
        <div class="card__title" aria-hidden="true">${esc(p.title)}</div>
      </${link ? "a" : "div"}>`;
}

function buildSlider() {
  const track = $("[data-track]");
  if (!track || !PROJECTS?.length) return;
  // Desktop: grosse Querformate, Mobile: Hochformat
  const [W, H] = SLIDER_MQ.matches ? [400, 500] : [750, 500];
  const cards = [];
  // Mindestens 8 Karten, damit die Endlos-Reihe den Bildschirm füllt
  for (let i = 0; i < Math.max(8, PROJECTS.length); i++) {
    cards.push(projectCard(PROJECTS[i % PROJECTS.length], { W, H, sizes: "(max-width: 760px) 72vw, 60vw" }));
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
  const chrome = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
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

  // Am Handy gibt es kein Hover: Loops laufen dort immer
  if (TOUCH) playAlways($$(".card[data-loop]", track));

  // Pfeile < >: um genau eine Karte weiter, weich ausgleitend; das automatische Laufen geht weiter
  $$("[data-slide]").forEach((btn) => btn.addEventListener("click", () => {
    const card = $(".card", track);
    const step = card.offsetWidth + parseFloat(getComputedStyle(track).columnGap || 0);
    const move = { v: 0 };
    let last = 0;
    gsap.to(move, {
      v: -btn.dataset.slide * step, duration: 0.9, ease: "expo.out",
      onUpdate: () => { x += move.v - last; last = move.v; },
    });
  }));

  gsap.ticker.add((t, dt) => {
    const half = track.scrollWidth / 2;
    if (!drag) x -= ((hover ? base * 0.3 : base) + boost) * (dt / 16.67);
    boost *= 0.93;
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x}px,0,0)`;
  });
}

/* ── Menü am Handy: Burger öffnet ein Vollbild mit den Menüpunkten ── */
function initMenu() {
  const btn = $("[data-menu-toggle]");
  if (!btn) return;
  const menu = document.createElement("div");
  menu.className = "menu";
  menu.id = "menu";
  menu.inert = true;
  // Gleiche Links wie in der Navigation (eine Quelle, keine doppelte Pflege)
  menu.innerHTML = `<nav class="menu__links" aria-label="Menü">${$$(".nav__links a").map((a) =>
    `<a href="${esc(a.getAttribute("href"))}"${a.hasAttribute("aria-current") ? ' aria-current="page"' : ""}>${a.innerHTML}</a>`).join("")}</nav>
    <p class="menu__foot mono"><span>St.Gallen, CH</span><span data-clock></span></p>`;
  document.body.appendChild(menu);

  const setOpen = (open) => {
    document.body.classList.toggle("menu-open", open);
    menu.inert = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Menü schliessen" : "Menü öffnen");
    if (open) lenis?.stop(); else lenis?.start();
  };
  btn.addEventListener("click", () => setOpen(!document.body.classList.contains("menu-open")));
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });   // schliesst vor dem Scrollen/Wechseln
  addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  matchMedia("(min-width: 861px)").addEventListener("change", (e) => e.matches && setOpen(false));
}

/* ── Video-Loops in Karten (data-loop): das Video kommt erst in die Karte, wenn es gebraucht wird ── */
function loopVideo(c) {
  let video = $("video", c);
  if (!video) {
    video = Object.assign(document.createElement("video"), { src: c.dataset.loop, muted: true, defaultMuted: true, loop: true, playsInline: true, autoplay: true, preload: "auto" });
    $(".media", c).appendChild(video);
  }
  return video;
}

// Am Handy laufen Loops immer, egal ob sie gerade im Bild sind (es gibt kein Hover, das sie startet)
function playAlways(items) {
  if (reduced) return;
  items.forEach((c) => {
    c.classList.add("is-playing");
    loopVideo(c).play().catch(() => {});
  });
}

// Laufen, solange die Karte im Bild ist, und pausieren ausserhalb
function playInView(items) {
  if (reduced || !items.length || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => entries.forEach(({ target: c, isIntersecting }) => {
    const video = isIntersecting ? loopVideo(c) : $("video", c);
    if (!video) return;
    c.classList.toggle("is-playing", isIntersecting);
    if (isIntersecting) video.play().catch(() => {}); else video.pause();
  }), { threshold: 0.2 });
  items.forEach((c) => io.observe(c));
}

// Beim Hover laden und abspielen, beim Verlassen anhalten. Nur mit der Maus: Antippen und Wischen
// lösen am Handy dieselben Ereignisse aus und hätten die immer laufenden Loops angehalten.
function initLoopHover() {
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const c = e.target.closest?.(".card[data-loop]");
    if (!c || c.contains(e.relatedTarget)) return;
    c.classList.add("is-playing");
    loopVideo(c).play().catch(() => {});
  });
  document.addEventListener("pointerout", (e) => {
    if (e.pointerType !== "mouse") return;
    const c = e.target.closest?.(".card[data-loop]");
    if (!c || c.contains(e.relatedTarget)) return;
    c.classList.remove("is-playing");
    $("video", c)?.pause();
  });
}

/* ── Zeig mal: alle Arbeiten, filterbar nach Disziplin ───────── */
function buildWorks() {
  if (PAGE !== "works") return;
  const grid = $("[data-works]");
  const filter = $("[data-w-filter]");

  setMeta(`Zeig mal — ${NAME}`, `Alle Arbeiten von ${NAME}: ${Object.values(CATS).join(", ")}.`, "arbeiten.html");
  $("[data-w-span]").textContent = countText(PROJECTS.length) + yearSpan(PROJECTS);
  $("[data-w-empty]").hidden = PROJECTS.length > 0;
  grid.innerHTML = PROJECTS.map((p) => projectCard(p, { W: 400, H: 300, sizes: "(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw", link: true, role: "previewWorks" })).join("");
  if (TOUCH) playAlways($$(".card[data-loop]", grid));   // am Handy laufen Loops immer, am Desktop beim Hover

  const cats = [["", "Alle", PROJECTS.length], ...DISCIPLINES.map((d) => [d.cat, CATS[d.cat], PROJECTS.filter((p) => p.cat === d.cat).length])];
  filter.innerHTML = cats.map(([cat, name, n]) =>
    `<button type="button" data-w-cat="${esc(cat)}" aria-pressed="${cat === ""}">${esc(name)} <span>${pad(n)}</span></button>`).join("");

  const apply = (cat) => {
    $$("[data-w-cat]", filter).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.wCat === cat)));
    $$(".card", grid).forEach((c) => c.classList.toggle("is-hidden", !!cat && c.dataset.cat !== cat));
    $("[data-w-count]").textContent = cat ? `${CATS[cat]}: ${countText(PROJECTS.filter((p) => p.cat === cat).length)}` : "Alle Arbeiten";
    history.replaceState(null, "", cat ? `?d=${encodeURIComponent(cat)}` : location.pathname);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  filter.addEventListener("click", (e) => {
    const b = e.target.closest("[data-w-cat]");
    if (b) apply(b.dataset.wCat);
  });
  const initial = new URLSearchParams(location.search).get("d");
  apply(CATS[initial] ? initial : "");
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
  $("[data-about-specs]").innerHTML = specRows(rows);
}

/* ── Suchmaschinen: Titel, Beschreibung, Canonical, strukturierte Daten ── */
const absoluteUrl = (path) => new URL(path, `${location.origin}/`).href;

// Für Unterseiten, deren Inhalt erst per JS feststeht (Google führt das JavaScript aus)
function setMeta(title, description, canonicalPath) {
  const text = String(description).replace(/\s+/g, " ").trim();
  const short = text.length > 155 ? `${text.slice(0, 152).replace(/\s\S*$/, "")} …` : text;
  document.title = title;
  $('meta[name="description"]').content = short;
  $('meta[property="og:title"]')?.setAttribute("content", title);
  $('meta[property="og:description"]')?.setAttribute("content", short);
  const canonical = $('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
  canonical.href = canonicalPath ? absoluteUrl(canonicalPath) : location.href.split("#")[0];
}

// schema.org als JSON-LD — wird nicht ausgeführt, darum mit der Content-Security-Policy vereinbar
function structuredData(data) {
  if ($('script[type="application/ld+json"][data-ssr]')) return;   // hat render.php schon geliefert
  const el = document.createElement("script");
  el.type = "application/ld+json";
  el.textContent = JSON.stringify({ "@context": "https://schema.org", ...data });
  document.head.appendChild(el);
}

function buildPersonData() {
  if (!$("[data-about-statement]")) return;   // nur Startseite
  structuredData({
    "@type": "Person",
    name: NAME,
    url: absoluteUrl(""),
    image: ABOUT.portrait ? absoluteUrl(ABOUT.portrait) : undefined,
    description: ABOUT.statement,
    email: `mailto:${CONTACT_EMAIL}`,
    address: { "@type": "PostalAddress", addressLocality: "St.Gallen", addressCountry: "CH" },
    knowsAbout: Object.values(CATS),
    sameAs: SOCIAL.filter((s) => s.url).map((s) => s.url),
  });
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
            <div class="svc__thumbs">${ps.slice(0, 2).map((p) => `<div class="media${mediaClass(p)}">${media(p, 400, 500, "120px", { role: "previewHome" })}</div>`).join("")}</div>
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

  setMeta(`${name} — ${NAME}`, d.lead);
  setPageName(name);
  $("[data-d-loader]").textContent = `AR / ${name.toUpperCase()}`;
  $("[data-d-route]").textContent = SUB;
  $$("[data-d-index]").forEach((el) => (el.textContent = `Disziplin ${pad(i + 1)} / ${pad(DISCIPLINES.length)}`));

  $("[data-d-lead]").textContent = d.lead;
  $("[data-d-count]").textContent = countText(ps.length) + yearSpan(ps);
  $("[data-d-tags]").innerHTML = d.tags.map((t) => `<span>${esc(t)}</span>`).join("");
  $("[data-d-steps]").innerHTML = d.steps.map(([t, x], n) => `
    <div class="step"><span class="mono">Schritt ${pad(n + 1)}</span><h3>${esc(t)}</h3><p>${esc(x)}</p></div>`).join("");
  $("[data-d-specs]").innerHTML = specRows([
    ["Disziplin", esc(name)], ["Tools", esc(d.tools)], ["Projekte", pad(ps.length)],
    ["Kontakt", `<a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)} ↗</a>`],
  ]);

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
      <a class="work__item" href="${projectUrl(p)}" data-pos="${j % 4}" data-cursor="Ansehen"${loopAttr(p, "previewDiscipline")}>
        <div class="work__frame"><div class="media${mediaClass(p)}" style="aspect-ratio:${W} / ${H}">${media(p, W, H, "(max-width: 760px) 100vw, 50vw", { role: "previewDiscipline" })}</div></div>
        <div class="work__meta">
          <span class="mono">[${pad(j + 1)}]</span>
          <h3>${esc(p.title)}<em class="serif">${esc(p.role)}</em></h3>
          <span class="mono">${esc(p.year)}</span>
        </div>
      </a>`;
  }).join("");
  // Disziplin-Seite: Loops laufen automatisch, am Desktop solange sie im Bild sind, am Handy immer
  (TOUCH ? playAlways : playInView)($$(".work__item[data-loop]", grid));
}

/* ── Projektseite (vollflächig) ──────────────────────────────── */
function buildProject() {
  if (PAGE !== "project") return;
  const id = new URLSearchParams(location.search).get("p");
  const p = ALL_PROJECTS.find((x) => x.id === id);
  if (!p) { location.replace("index.html#was"); return; }
  const i = Math.max(0, PROJECTS.indexOf(p));
  const siblings = PROJECTS.filter((x) => x.cat === p.cat);
  const k = siblings.indexOf(p);

  setMeta(`${p.title} — ${NAME}`, plainText(p.desc) || `${p.title}: ${CATS[p.cat]}-Projekt von ${NAME}, ${p.year}.`);
  structuredData({
    "@type": "CreativeWork",
    name: p.title,
    description: plainText(p.desc),
    genre: CATS[p.cat],
    dateCreated: String(p.year || ""),
    image: p.images?.[0] ? absoluteUrl(stillOf(p.images[0])) : undefined,
    url: location.href,
    creator: { "@type": "Person", name: NAME, url: absoluteUrl("") },
  });
  setPageName(p.title);

  const back = $("[data-p-back]");
  back.href = disciplineUrl(p.cat);
  back.textContent = `← ${CATS[p.cat]}`;
  $("[data-p-count]").textContent = p.hidden ? "Entwurf · nur für dich sichtbar" : `Projekt ${pad(k + 1)} / ${pad(siblings.length)}`;
  $("[data-p-crumb-loader]").textContent = `${CATS[p.cat]} — ${p.year}`;
  $("[data-p-role]").textContent = p.role;
  $("[data-p-meta]").textContent = `${CATS[p.cat]}, ${p.year}`;

  // Aufbau: zuoberst die Filme, sonst das Keyvisual. Dann der Text, dann die Galerie.
  // Bilder mit einer Rolle (Titelbild = Vorschau im Slider, Vorschauen, Keyvisual) stehen nicht in der Galerie.
  const cover = $("[data-p-cover]");
  const [W, H] = SLIDER_MQ.matches ? [800, 1000] : [1600, 900];
  // Bilder, die im CMS auf «Nicht beschneiden» stehen, erscheinen vollständig (Plakate, Bilder mit Text)
  const full = new Set(p.full || []);
  const films = projectFilms(p).map(filmEmbed).filter(Boolean);
  const images = p.images || [];
  const roles = new Set([images[0], ...ROLES.map((r) => p[r])]);
  const gallery = images.filter((src) => !roles.has(src));
  const keyvisual = p.keyvisual && images.includes(p.keyvisual) ? p.keyvisual : "";
  // Ohne Film und Keyvisual: Hat das Projekt sonst nichts, springt das Titelbild (bzw. die Grafik) ein
  cover.hidden = films.length > 0 || (!keyvisual && gallery.length > 0);
  if (!cover.hidden) {
    cover.classList.toggle("is-full", full.has(keyvisual || images[0]));
    cover.innerHTML = `<div class="media${mediaClass(p)}">${media(p, W, H, "100vw", { eager: true, play: true, role: "keyvisual" })}</div>`;
  }

  // Filme: Player von YouTube/Vimeo direkt eingebettet, datensparsam (nocookie / dnt).
  // Er lädt erst, wenn er ins Bild scrollt.
  const filmBox = $("[data-p-film]");
  filmBox.hidden = !films.length;
  filmBox.innerHTML = films.map((film, n) => `
    <div class="pfilm__frame"><iframe src="${esc(film.src)}" title="${esc(p.title)}${films.length > 1 ? `, Film ${n + 1}` : ""} (${film.name})" loading="lazy" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`).join("");

  $("[data-p-desc]").innerHTML = linkify(p.desc);
  const specs = [["Kunde", esc(p.client)], ["Disziplin", esc(CATS[p.cat])], ["Jahr", esc(p.year)], ["Rolle", esc(p.role)], ["Tools", esc(p.tools)]];
  if (p.link) specs.push(["Link", `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.link.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""))} ↗</a>`]);
  $("[data-p-specs]").innerHTML = specRows(specs.filter(([, v]) => v));

  // Galerie: Querformat = ganze Breite, Hochformat = halbe Breite, zwei nebeneinander
  // (im CMS pro Bild wählbar; ältere Projekte ohne Wahl: jedes dritte Bild breit)
  $("[data-p-gallery]").innerHTML = gallery.map((src, n) => {
      const wide = Array.isArray(p.wide) ? p.wide.includes(src) : n % 3 === 0;
      return `<figure class="pgallery__item${wide ? " is-wide" : ""}${full.has(src) ? " is-full" : ""}"><div class="media${mediaClass(p)}">${mediaItem(src, `${p.title}, Bild ${n + 1}`, wide ? "100vw" : "(max-width: 760px) 100vw, 50vw", { play: true })}</div></figure>`;
    }).join("");

  // Nächstes Projekt: innerhalb der Disziplin, sonst das nächste insgesamt
  const next = siblings.length > 1 ? siblings[(k + 1) % siblings.length] : PROJECTS[(i + 1) % PROJECTS.length];
  const nextEl = $("[data-p-next]");
  nextEl.hidden = !next;   // nur möglich, wenn alle anderen Projekte ausgeblendet sind
  if (!next) return;
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
    // Geschützte Leerzeichen (&nbsp;) halten Wörter zusammen, z. B. «super gut.»
    n.textContent.split(/[^\S\u00a0]+/).filter(Boolean).forEach((word) => {
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
  // Am Handy: kurze Wege und früher starten, damit beim schnellen Wischen nichts leer wirkt
  if (TOUCH) { y = Math.min(y, 20); vars = { ...vars, duration: 0.7, stagger: 0.05 }; }
  gsap.set(targets, { opacity: 0, y });
  ScrollTrigger.batch(targets, {
    start: TOUCH ? "top 100%" : "top 90%",
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
  fadeIn($$(".works__grid .card"), 60, { stagger: 0.08 });
  fadeIn($$(".pgallery__item"), 60);
  fadeIn($$(".services__list > *, .about__grid > *, .form > *, .process__grid > *, .process__specs > *, .pinfo__grid > *, .contact__inner--cta .btn"));

  // Projektseite: Titelbild zoomt beim Scrollen leicht heraus, ausser es ist im CMS auf «Nicht beschneiden» gestellt
  const coverMedia = $(".pcover:not(.is-full) .media > *");
  if (coverMedia) {
    gsap.fromTo(coverMedia, { scale: 1.12 }, {
      scale: 1, ease: "none",
      scrollTrigger: { trigger: ".pcover", start: "top bottom", end: "bottom top", scrub: true },
    });
  }

  // Über-mich-Text: Wort für Wort beim Scrollen
  const st = $("[data-words]");
  if (st) {
    // Leerzeile im CMS = neuer Absatz; jedes Wort einzeln, damit es beim Scrollen aufleuchten kann.
    // Die letzten zwei Wörter hängen mit einem geschützten Leerzeichen zusammen: kein Wort steht allein auf der letzten Zeile.
    st.innerHTML = st.textContent.trim().split(/\n\s*\n/).map((para) => {
      const ws = para.trim().split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`);
      return ws.length > 2 ? `${ws.slice(0, -2).join(" ")} ${ws.slice(-2).join("&nbsp;")}` : ws.join("&nbsp;");
    }).join(`<span class="para-break"></span>`);
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

  // Hero-Name leichter Parallax beim Rausscrollen (nicht am Handy: ruckelt dort mit der Adressleiste)
  if (!TOUCH) gsap.to(".hero__name", {
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
  if (TOUCH) return;
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
    if (!ok) { status.textContent = "Da fehlt noch etwas: Name, E-Mail und ein paar Worte zum Projekt."; return; }

    const d = new FormData(form);
    const body = [
      `Name: ${d.get("name")}`,
      `E-Mail: ${d.get("email")}`,
      "",
      d.get("message"),
    ].join("\n");
    location.href = `mailto:${encodeURIComponent(CONTACT_EMAIL).replace("%40", "@")}?subject=${encodeURIComponent(`Projektanfrage — ${d.get("name")}`)}&body=${encodeURIComponent(body)}`;
    status.textContent = "Dein Mail-Programm geht gleich auf …";
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
  const fast = !!SUB || PAGE === "works";
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
    const items = ".hero .card, .hero__tags > *, .pfilm, .pcover";
    if (hashTarget) { unlock(); jumpTo(hashTarget); }
    else {
      gsap.set(hChars, { yPercent: 110 });
      gsap.set(".hero .reveal-up", { yPercent: 120 });
      gsap.set(items, { opacity: 0, y: 40 });
    }
    const tl = gsap.timeline();
    tl.to(loader, { autoAlpha: 0, duration: 0.35, ease: "power2.out" })
      .add(() => { loader.remove(); if (!hashTarget) unlock(); });
    if (!hashTarget) {
      tl.to(hChars, { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.015 }, 0.1)
        .to(".hero .reveal-up", { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.05 }, 0.25)
        .to(items, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.03 }, 0.3);
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
  if ($(".pcover")) gsap.set(".pfilm, .pcover", { opacity: 0, y: 80 });
  gsap.set(".nav", { yPercent: -100, opacity: 0 });

  // Loader-Name liegt deckungsgleich über dem Hero-Namen → Loader ausblenden, Name wächst
  tl.to(".loader__row, .loader__bottom, .loader__bar", { opacity: 0, duration: 0.4 }, "+=0.15")
    .set(loader, { autoAlpha: 0 })
    .to(hName, { y: 0, scale: 1, duration: 1.5, ease: "expo.inOut" })
    .to(".nav", { yPercent: 0, opacity: 1, duration: 1, ease: "expo.out" }, "-=0.55")
    .to(".hero .reveal-up", { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.08 }, "<")
    .to(".hero .card, .hero__tags > *", { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: "expo.out", stagger: 0.05 }, "<0.1")
    .add(() => { loader.remove(); unlock(); }, "-=0.6");
  if ($(".pcover")) tl.to(".pfilm, .pcover", { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", stagger: 0.1 }, "-=1.4");
}

/* ── Boot ────────────────────────────────────────────────────── */
initTheme();
initMenu();
initClock();
initForm();
initProgress();
initLinks();

Promise.all([loadContent(), document.fonts.ready]).then(() => {
  buildProject();
  buildSub();
  buildNames();
  buildSlider();
  buildWorks();
  buildDisciplines();
  buildAbout();
  buildSocial();
  buildPersonData();
  fitNames();
  sizeSlider();

  if (!hasGsap) {
    intro();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // Ein- und ausfahrende Adressleiste am Handy löst sonst ständig Neuberechnungen aus
  ScrollTrigger.config({ ignoreMobileResize: true });

  if (window.Lenis && !reduced && !TOUCH) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.stop();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  initSlider();
  initLoopHover();
  initCursor();
  initScroll();
  intro();

  let rt;
  let lastWidth = innerWidth;
  addEventListener("resize", () => {
    // Am Handy ändert sich beim Scrollen nur die Höhe (Adressleiste) — dann nichts neu berechnen
    if (TOUCH && innerWidth === lastWidth) return;
    lastWidth = innerWidth;
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
