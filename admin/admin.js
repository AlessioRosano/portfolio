/* ==========================================================================
   CMS für das Portfolio — läuft online unter /admin.
   Speichert über api/admin.php: Texte in content/data.json,
   Bilder in content/img/, Galerien in storage/ (von aussen gesperrt).
   ========================================================================== */

const MAX_SIDE = 2400;          // längste Bildseite in px
const JPEG_QUALITY = 0.85;
let chunkSize = 2 * 1024 * 1024;      // Galerie-Uploads in Stücken; Grösse meldet der Server (max. 8 MB)

let state = null;
let dirty = false;
let current = 0;                 // Index des gewählten Projekts
let filter = "";
let csrf = "";

/* ── Server ──────────────────────────────────────────────────── */
async function api(action, body) {
  const opts = { method: body ? "POST" : "GET", headers: { "X-CSRF": csrf } };
  if (body instanceof FormData) opts.body = body;
  else if (body) {
    opts.body = JSON.stringify(body);
    opts.headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`api/admin.php?a=${action}`, opts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && action !== "login") showLogin();
  if (!res.ok) throw new Error(data.error || `Serverfehler (${res.status})`);
  return data;
}

// Leeres Projekt: Standardwerte für neue Projekte und für Felder, die ältere Projekte noch nicht haben
const blankProject = () => ({
  title: "", cat: "branding", year: new Date().getFullYear(), client: "", role: "", tools: "", desc: "",
  link: "", videos: [], art: 0, images: [], full: [], wide: [],
});

function normalize(d) {
  d.SOCIAL ??= [];
  d.ABOUT = { statement: "", portrait: "", caption: "", specs: [], status: "", ...d.ABOUT };
  d.PROJECTS = d.PROJECTS.map(({ video, ...p }) => ({
    ...blankProject(), ...p,
    // Früher ein einzelner Film («video»), jetzt eine Liste
    videos: Array.isArray(p.videos) ? p.videos : video ? [video] : [],
    // Galerie-Layout: Projekte ohne eigene Wahl behalten ihr bisheriges Muster (jedes dritte Bild breit)
    wide: Array.isArray(p.wide) ? p.wide : (p.images || []).filter((_, i) => i > 0 && (i - 1) % 3 === 0),
  }));
  return d;
}

function markDirty() {
  dirty = true;
  updateStatus();
}

/* ── Login ───────────────────────────────────────────────────── */
function showLogin(message = "") {
  $("[data-login]").hidden = false;
  $("[data-login-error]").textContent = message;
  $("[data-login-form] input").focus();
}

$("[data-login-form]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = e.target.password;
  try {
    ({ csrf } = await api("login", { password: input.value }));
    input.value = "";
    $("[data-login]").hidden = true;
    await start();
  } catch (err) {
    $("[data-login-error]").textContent = err.message;
    input.select();
  }
});

$("[data-logout]").addEventListener("click", async () => {
  if (dirty && !confirm("Es gibt ungespeicherte Änderungen. Trotzdem abmelden?")) return;
  await api("logout", {}).catch(() => {});
  dirty = false;
  location.reload();
});

/* ── Speichern ───────────────────────────────────────────────── */
async function save() {
  try {
    await api("save", state);
    dirty = false;
    updateStatus(`Gespeichert ${new Date().toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" })}`);
    toast("Gespeichert — ist sofort auf der Website.");
  } catch (e) {
    toast(`Speichern fehlgeschlagen: ${e.message}`);
  }
}

/* ── Bilder ──────────────────────────────────────────────────── */
// Grosse Bilder werden verkleinert und als JPEG hochgeladen, kleine unverändert
async function prepareImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1.5e6) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", JPEG_QUALITY));
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

// Video-Loops liegen in derselben Liste wie Bilder (isLoop, loopPoster, stillOf: js/utils.js)
const isLoopFile = (f) => f.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(f.name);
const MAX_LOOP_MB = 60;

// Datei in Stücken hochladen (umgeht Upload-Limits des Servers); gibt die Antwort aufs letzte Stück zurück
async function uploadChunks(action, file, fields, onProgress) {
  const total = Math.max(1, Math.ceil(file.size / chunkSize));
  const id = [...crypto.getRandomValues(new Uint8Array(12))].map((n) => n.toString(36).padStart(2, "0")).join("").slice(0, 24);
  let res;
  for (let i = 0; i < total; i++) {
    const form = new FormData();
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append("upload", id);
    form.append("index", i);
    form.append("total", total);
    form.append("chunk", file.slice(i * chunkSize, (i + 1) * chunkSize), "chunk");
    res = await api(action, form);
    onProgress?.((i + 1) / total);
  }
  return res;
}

async function uploadLoop(file, title, onProgress) {
  if (file.size > MAX_LOOP_MB * 1024 * 1024) throw new Error(`Loop ist zu gross (max. ${MAX_LOOP_MB} MB). Kürzer oder kleiner exportieren.`);
  // Zuerst prüfen, ob der Browser das Video abspielen kann — dabei entsteht gleich das Standbild
  const poster = await videoPoster(file).catch(() => null);
  if (!poster) throw new Error("Dieses Video kann der Browser nicht abspielen (z. B. HEVC oder ProRes). Bitte als MP4 mit H.264 exportieren.");
  // MOV/M4V mit H.264 sind technisch MP4 — als .mp4 ablegen, damit jeder Browser sie abspielt
  const name = /\.webm$/i.test(file.name) ? file.name : file.name.replace(/\.\w+$/, "") + ".mp4";
  const res = await uploadChunks("loop-chunk", file, { name, title }, onProgress);
  const form = new FormData();
  form.append("path", res.path);
  form.append("poster", poster, "poster.jpg");
  await api("loop-poster", form).catch(() => {});
  return res.path;
}

// Querformat? (für das Galerie-Layout neuer Bilder) — Bilder direkt, Loops über ihr Standbild
async function isLandscape(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    return bmp.width > bmp.height;
  } catch { return false; }
}

async function addImages(files) {
  const all = [...files];
  const imgs = all.filter((f) => f.type.startsWith("image/") || isLoopFile(f));
  // Nichts stillschweigend ignorieren: sagen, welche Dateien nicht gehen
  const skipped = all.filter((f) => !imgs.includes(f));
  if (skipped.length) toast(`Nicht unterstützt: ${skipped.map((f) => f.name).join(", ")} (erlaubt: Bilder und Videos MP4, MOV, M4V, WebM)`);
  if (!imgs.length) return;
  const p = state.PROJECTS[current];
  const drop = $("[data-drop]");
  drop?.classList.add("is-busy");
  let added = 0;
  for (const [n, f] of imgs.entries()) {
    const label = `${isLoopFile(f) ? "Loop" : "Bild"} ${n + 1} von ${imgs.length} wird hochgeladen`;
    if (drop) drop.querySelector("strong").textContent = `${label} …`;
    try {
      if (isLoopFile(f)) {
        const path = await uploadLoop(f, p.title, (x) => { if (drop) drop.querySelector("strong").textContent = `${label} … ${Math.round(x * 100)} %`; });
        p.images.push(path);
        if (await isLandscape(await fetch(loopPoster(path)).then((r) => r.blob()).catch(() => null))) p.wide.push(path);
      } else {
        const form = new FormData();
        form.append("file", await prepareImage(f));
        form.append("title", p.title);
        const path = (await api("upload", form)).path;
        p.images.push(path);
        if (await isLandscape(f)) p.wide.push(path);
      }
      added++;
    } catch (e) {
      toast(`«${f.name}»: ${e.message}`);
    }
  }
  if (added) {
    markDirty();
    toast(`${added} ${added === 1 ? "Datei" : "Dateien"} hochgeladen — Speichern nicht vergessen`);
  }
  renderEditor();
  renderList();
}

const thumb = (p, W = 400, H = 500) =>
  p.images.length ? `<img src="${esc(stillOf(p.images[0]))}" alt="" />` : makeArt(p.cat, p.art, W, H, p.title);

/* ── UI: Kopfzeile, Hinweise ─────────────────────────────────── */
function updateStatus(text) {
  const el = $("[data-status]");
  el.classList.toggle("is-dirty", dirty);
  el.textContent = text || (dirty ? "Ungespeichert" : "Gespeichert");
  $("[data-save]").disabled = !dirty;
}

let toastTimer;
function toast(msg) {
  const t = $("[data-toast]");
  t.textContent = msg;
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), 3200);
}

/* ── UI: Projektliste ────────────────────────────────────────── */
function renderFilter() {
  const count = (c) => state.PROJECTS.filter((p) => !c || p.cat === c).length;
  $("[data-filter]").innerHTML =
    `<button data-f="" class="${filter ? "" : "is-active"}">Alle ${pad(count())}</button>` +
    Object.entries(state.CATS).map(([k, v]) => `<button data-f="${esc(k)}" class="${filter === k ? "is-active" : ""}">${esc(v)} ${pad(count(k))}</button>`).join("");
}

function visible() {
  return state.PROJECTS.map((p, i) => ({ p, i })).filter(({ p }) => !filter || p.cat === filter);
}

function renderList() {
  renderFilter();
  const list = visible();
  $("[data-items]").innerHTML = list.length ? list.map(({ p, i }) => `
    <li class="item${i === current ? " is-active" : ""}" data-i="${i}">
      <div class="item__thumb">${thumb(p)}</div>
      <div>
        <div class="item__title">${esc(p.title || "Ohne Titel")}</div>
        <div class="mono muted">${esc(state.CATS[p.cat])} · ${esc(p.year)} · ${p.images.length} Bild${p.images.length === 1 ? "" : "er"}</div>
      </div>
      <div class="item__move">
        <button data-move="-1" title="Nach oben">▲</button>
        <button data-move="1" title="Nach unten">▼</button>
      </div>
    </li>`).join("") : `<li class="empty muted">Noch keine Projekte in dieser Disziplin.</li>`;
}

/* ── UI: Editor ──────────────────────────────────────────────── */
function renderEditor() {
  const ed = $("[data-editor]");
  const p = state.PROJECTS[current];
  if (!p) {
    ed.innerHTML = `<div class="editor__head"><h1>Keine Projekte</h1></div><p>Lege mit «+ Neues Projekt» dein erstes Projekt an.</p>`;
    return;
  }
  const catOpts = Object.entries(state.CATS).map(([k, v]) => `<option value="${esc(k)}"${p.cat === k ? " selected" : ""}>${esc(v)}</option>`).join("");
  ed.innerHTML = `
    <button class="btn btn--sm editor__back" type="button" data-back>← Alle Projekte</button>
    <div class="editor__head">
      <div>
        <p class="mono muted" style="margin:0 0 8px">Projekt ${pad(current + 1)} / ${pad(state.PROJECTS.length)} — erscheint auf ${esc(state.CATS[p.cat])}</p>
        <h1 data-title-view>${esc(p.title || "Ohne Titel")}</h1>
      </div>
      <div class="actions">
        <a class="btn btn--sm" href="projekt.html?p=${projectIds(state.PROJECTS)[current]}" target="_blank" rel="noopener" title="Erst speichern, dann ansehen">Projekt ansehen ↗</a>
        <button class="btn btn--sm btn--danger" data-delete>Löschen</button>
      </div>
    </div>

    <div class="form">
      <label class="field field--4"><span class="mono">Titel</span>
        <input type="text" data-f="title" value="${esc(p.title)}" placeholder="z. B. Nordwand" /></label>
      <label class="field field--2"><span class="mono">Jahr</span>
        <input type="number" data-f="year" value="${esc(p.year)}" min="1990" max="2100" /></label>

      <label class="field field--3"><span class="mono">Disziplin</span>
        <select data-f="cat">${catOpts}</select></label>
      <label class="field field--3"><span class="mono">Rolle / Leistung</span>
        <input type="text" data-f="role" value="${esc(p.role)}" placeholder="z. B. Identität, Logo, Guidelines" /></label>

      <label class="field field--3"><span class="mono">Kunde</span>
        <input type="text" data-f="client" value="${esc(p.client)}" placeholder="z. B. Bäckerei Müller (leer = nicht anzeigen)" /></label>
      <label class="field field--3"><span class="mono">Tools</span>
        <input type="text" data-f="tools" value="${esc(p.tools)}" placeholder="z. B. Illustrator, Figma" /></label>

      <label class="field"><span class="mono">Beschreibung</span>
        <textarea data-f="desc" rows="5" placeholder="Worum geht es, was war deine Rolle, was ist das Besondere?">${esc(p.desc)}</textarea>
        <small>Link hinter ein Wort legen: <code>[Wort](https://…)</code>, z. B. <code>[Bäckerei Müller](https://baeckerei-mueller.ch)</code>. Nur https-Links.</small></label>

      <div class="field field--3"><span class="mono">Filme (YouTube oder Vimeo, optional)</span>
        ${p.videos.map((url, k) => `
          <div class="pw">
            <input type="url" data-film="${k}" value="${esc(url)}" placeholder="https://vimeo.com/123456789" aria-label="Film ${k + 1}" />
            <button class="btn btn--sm btn--danger" type="button" data-film-del="${k}" title="Film entfernen">✕</button>
          </div>`).join("")}
        <div><button class="btn btn--sm" type="button" data-film-add>+ Film hinzufügen</button></div>
        <small>Erscheinen zuoberst auf der Projektseite, in dieser Reihenfolge. Der Player ist direkt eingebettet (YouTube ohne Cookies, Vimeo ohne Tracking) und lädt, sobald er ins Bild scrollt.</small></div>
      <label class="field field--3"><span class="mono">Link (optional)</span>
        <input type="url" data-f="link" value="${esc(p.link)}" placeholder="https://…" />
        <small>Wird im Projekt als «Link ↗» angezeigt, z. B. Behance oder Live-Website.</small></label>

      <div class="field">
        <span class="mono">Bilder &amp; Loops</span>
        <div class="drop" data-drop tabindex="0" role="button">
          <strong>Bilder hierher ziehen oder klicken</strong>
          <span class="mono muted">Bilder (JPG, PNG, WebP, GIF) oder kurze Loops (MP4, MOV, WebM; H.264, ohne Ton, max. 60 MB)</span>
        </div>
        ${p.images.length ? `<div class="images">${p.images.map((src, k) => `
          <div class="img-wrap">
          <div class="img${p.full.includes(src) ? " is-full" : ""}">
            <img src="${esc(stillOf(src))}" alt="" />
            ${isLoop(src) ? `<span class="img__badge mono" style="left:auto;right:8px">▶ Loop</span>` : ""}
            ${k === 0 ? `<span class="img__badge mono">Titelbild</span>` : ""}
            <div class="img__tools">
              <span>
                <button data-img="left" data-k="${k}" title="Nach vorne">←</button>
                <button data-img="right" data-k="${k}" title="Nach hinten">→</button>
              </span>
              <span>
                ${k ? `<button data-img="cover" data-k="${k}" title="Als Titelbild">★</button>` : ""}
                <button data-img="del" data-k="${k}" title="Entfernen">✕</button>
              </span>
            </div>
          </div>
          ${k ? `<div class="seg img__layout mono" role="group" aria-label="Breite in der Galerie">
            <button type="button" data-layout="half" data-src="${esc(src)}" class="${p.wide.includes(src) ? "" : "is-active"}" title="Halbe Breite, zwei nebeneinander">Hoch</button>
            <button type="button" data-layout="wide" data-src="${esc(src)}" class="${p.wide.includes(src) ? "is-active" : ""}" title="Ganze Breite">Quer</button>
          </div>` : `<span class="img__layout mono muted">Nur Vorschau</span>`}
          <label class="check img__full mono"><input type="checkbox" data-full="${esc(src)}"${p.full.includes(src) ? " checked" : ""} /> Nicht beschneiden</label>
          </div>`).join("")}</div>
          <small class="muted" style="margin-top:6px">Das erste Bild ist das Titelbild: Es erscheint als Vorschau im Slider und in den Übersichten, auf der Projektseite aber nicht (ausser das Projekt hat sonst keine Bilder und keinen Film). Die übrigen bilden dort die Galerie.
          «Nicht beschneiden» für Plakate oder Bilder mit Text: Auf der Projektseite erscheint das Bild dann vollständig, ohne Zuschnitt und Zoom.</small>` : ""}
      </div>

      ${p.images.length ? `
      <p class="field muted" style="margin:0">Bilder erscheinen in der Übersicht schwarz-weiss und auf der Projektseite in Originalfarben.</p>` : `
      <div class="field">
        <span class="mono">Platzhalter, solange keine Bilder da sind</span>
        <div class="placeholder">
          <div class="preview">${makeArt(p.cat, p.art, 400, 500, p.title)}</div>
          <div class="seg"><button data-art="0" class="${p.art % 2 ? "" : "is-active"}">Variante A</button><button data-art="1" class="${p.art % 2 ? "is-active" : ""}">Variante B</button></div>
        </div>
      </div>`}
    </div>`;
}

/* ── Ablagefelder: Dateien hineinziehen, anklicken oder per Tastatur öffnen ── */
// Die Felder werden neu gezeichnet, darum hören die Events auf der umgebenden Ansicht (view)
function dropZone(view, selector, input, onFiles) {
  const pick = () => $(input).click();
  view.addEventListener("click", (e) => { if (e.target.closest(selector)) pick(); });
  view.addEventListener("keydown", (e) => {
    if (e.target.matches(selector) && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); pick(); }
  });
  view.addEventListener("dragover", (e) => {
    const d = e.target.closest(selector);
    if (!d) return;
    e.preventDefault();
    d.classList.add("is-over");
  });
  view.addEventListener("dragleave", (e) => e.target.closest(selector)?.classList.remove("is-over"));
  view.addEventListener("drop", (e) => {
    const d = e.target.closest(selector);
    if (!d) return;
    e.preventDefault();
    d.classList.remove("is-over");
    onFiles(e.dataTransfer.files);
  });
  $(input).addEventListener("change", (e) => {
    onFiles(e.target.files);
    e.target.value = "";
  });
}

/* ── UI: Wer ─────────────────────────────────────────────────── */
function renderAbout() {
  const a = state.ABOUT;
  $("[data-about]").innerHTML = `
    <h1>Wer</h1>
    <p class="muted">Der Bereich «Wer» auf der Startseite: Text, Portrait und Steckbrief.</p>
    <div class="card">
      <div class="form">
        <label class="field"><span class="mono">Text</span>
          <textarea data-a="statement" rows="5">${esc(a.statement)}</textarea>
          <small>Erscheint gross und wird beim Scrollen Wort für Wort sichtbar. Leerzeile = neuer Absatz.</small></label>
      </div>
    </div>
    <div class="card">
      <h2>Portrait</h2>
      <div class="form">
        <div class="field field--2">
          ${a.portrait ? `<div class="img"><img src="${esc(a.portrait)}" alt="" />
            <div class="img__tools" style="opacity:1"><span></span><span><button data-about-remove title="Portrait entfernen">✕</button></span></div></div>` : ""}
          <div class="drop" data-about-drop tabindex="0" role="button" style="${a.portrait ? "margin-top:12px" : ""}">
            <strong>${a.portrait ? "Portrait ersetzen" : "Portrait hierher ziehen oder klicken"}</strong>
            <span class="mono muted">Hochformat 4:5, z. B. 1600 × 2000 px</span>
          </div>
        </div>
        <label class="field field--4"><span class="mono">Bildunterschrift</span>
          <input type="text" data-a="caption" value="${esc(a.caption)}" placeholder="z. B. PORTRAIT_01.JPG — 4:5" /></label>
      </div>
    </div>
    <div class="card">
      <h2>Steckbrief</h2>
      <div class="form">
        ${a.specs.map(([k, v], i) => `
          <label class="field field--2"><span class="mono">Bezeichnung</span>
            <input type="text" data-spec="${i}" data-sp="0" value="${esc(k)}" placeholder="z. B. Basis" /></label>
          <label class="field field--4"><span class="mono">Inhalt</span>
            <div class="pw">
              <input type="text" data-spec="${i}" data-sp="1" value="${esc(v)}" placeholder="z. B. St.Gallen, Schweiz" />
              <button class="btn btn--sm" type="button" data-spec-move="${i}" title="Nach oben">▲</button>
              <button class="btn btn--sm btn--danger" type="button" data-spec-del="${i}" title="Zeile entfernen">✕</button>
            </div></label>`).join("")}
        <div class="field"><div><button class="btn btn--sm" type="button" data-spec-add>+ Zeile hinzufügen</button></div></div>
        <label class="field field--4"><span class="mono">Status</span>
          <input type="text" data-a="status" value="${esc(a.status)}" placeholder="z. B. Offen für Projekte" />
          <small>Letzte Zeile mit pulsierendem Punkt. Leer lassen, um sie auszublenden.</small></label>
      </div>
    </div>`;
}

async function setPortrait(files) {
  const file = [...files].find((f) => f.type.startsWith("image/"));
  if (!file) return;
  const drop = $("[data-about-drop] strong");
  if (drop) drop.textContent = "Wird hochgeladen …";
  try {
    const form = new FormData();
    form.append("file", await prepareImage(file));
    form.append("title", "portrait");
    state.ABOUT.portrait = (await api("upload", form)).path;
    markDirty();
    toast("Portrait hochgeladen — Speichern nicht vergessen");
  } catch (e) {
    toast(e.message);
  }
  renderAbout();
}

const aboutView = $("[data-about]");
aboutView.addEventListener("input", (e) => {
  const { a, spec, sp } = e.target.dataset;
  if (a) state.ABOUT[a] = e.target.value;
  else if (spec !== undefined) state.ABOUT.specs[+spec][+sp] = e.target.value;
  else return;
  markDirty();
});
aboutView.addEventListener("click", (e) => {
  const S = state.ABOUT.specs;
  const del = e.target.closest("[data-spec-del]");
  const move = e.target.closest("[data-spec-move]");
  if (del) S.splice(+del.dataset.specDel, 1);
  else if (move) { const i = +move.dataset.specMove; if (i > 0) [S[i - 1], S[i]] = [S[i], S[i - 1]]; }
  else if (e.target.closest("[data-spec-add]")) S.push(["", ""]);
  else if (e.target.closest("[data-about-remove]")) state.ABOUT.portrait = "";
  else return;
  markDirty();
  renderAbout();
});
dropZone(aboutView, "[data-about-drop]", "[data-about-file]", setPortrait);

/* ── UI: Disziplinen & Allgemein ─────────────────────────────── */
function renderDisciplines() {
  $("[data-disciplines]").innerHTML = `
    <h1>Disziplinen</h1>
    <p class="muted">Texte für die vier Disziplinen («Was» auf der Startseite) — erscheinen beim Hover und auf der jeweiligen Unterseite.</p>
    ${state.DISCIPLINES.map((d, i) => `
      <div class="card">
        <h2>${pad(i + 1)} — <span data-cat-title="${esc(d.cat)}">${esc(state.CATS[d.cat])}</span></h2>
        <div class="form">
          <label class="field field--3"><span class="mono">Name</span>
            <input type="text" data-cat-label="${esc(d.cat)}" value="${esc(state.CATS[d.cat])}" />
            <small>Adresse der Seite bleibt gleich: disziplin.html?d=${esc(d.cat)}</small></label>
          <label class="field"><span class="mono">Einleitung</span>
            <textarea data-di="${i}" data-dk="lead" rows="3">${esc(d.lead)}</textarea></label>
          <label class="field field--3"><span class="mono">Stichworte</span>
            <input type="text" data-di="${i}" data-dk="tags" value="${esc(d.tags.join(", "))}" />
            <small>Mit Komma trennen</small></label>
          <label class="field field--3"><span class="mono">Tools</span>
            <input type="text" data-di="${i}" data-dk="tools" value="${esc(d.tools)}" /></label>
          <div class="steps">${d.steps.map(([t, x], s) => `
            <label class="field"><span class="mono">Schritt ${pad(s + 1)}</span>
              <input type="text" data-di="${i}" data-ds="${s}" data-dp="0" value="${esc(t)}" />
              <textarea data-di="${i}" data-ds="${s}" data-dp="1">${esc(x)}</textarea></label>`).join("")}
          </div>
        </div>
      </div>`).join("")}`;
}

function renderGeneral() {
  $("[data-general]").innerHTML = `
    <h1>Allgemein</h1>
    <p class="muted">Einstellungen für die ganze Website.</p>
    <div class="card">
      <div class="form">
        <label class="field field--4"><span class="mono">Kontakt-E-Mail</span>
          <input type="email" data-g="CONTACT_EMAIL" value="${esc(state.CONTACT_EMAIL)}" />
          <small>Hier landen die Anfragen aus dem Kontaktformular.</small></label>
      </div>
    </div>
    <div class="card">
      <h2>Social-Links</h2>
      <p style="max-width:60ch;margin:0 0 16px">Erscheinen im Footer jeder Seite. Leere Zeilen werden nicht angezeigt; ohne Links verschwindet die Spalte.</p>
      <div class="form" data-social-list>
        ${state.SOCIAL.map((s, i) => `
          <label class="field field--2"><span class="mono">Name</span>
            <input type="text" data-si="${i}" data-sk="label" value="${esc(s.label)}" placeholder="z. B. Instagram" /></label>
          <label class="field field--4"><span class="mono">Link</span>
            <div class="pw">
              <input type="url" data-si="${i}" data-sk="url" value="${esc(s.url)}" placeholder="https://instagram.com/…" />
              <button class="btn btn--sm btn--danger" type="button" data-social-del="${i}" title="Link entfernen">✕</button>
            </div></label>`).join("")}
        <div class="field"><div><button class="btn btn--sm" type="button" data-social-add>+ Link hinzufügen</button></div></div>
      </div>
    </div>
    <div class="card">
      <h2>Backup</h2>
      <p style="max-width:60ch;margin:0 0 16px">
        Lädt alle Texte, Projektbilder und Galerie-Einstellungen als ZIP herunter (ohne die Galerie-Dateien selbst).
        Zusätzlich hebt der Server bei jedem Speichern die letzten 30 Stände auf.
      </p>
      <a class="btn" href="api/admin.php?a=export">Backup herunterladen ↓</a>
    </div>
    <div class="card">
      <h2>So funktioniert's</h2>
      <p style="max-width:60ch;margin:0">
        1. Projekte anlegen, Texte schreiben, Bilder hineinziehen — Bilder sind sofort hochgeladen.<br />
        2. <b>Speichern</b> (⌘S) — danach ist alles direkt auf der Website.<br />
        3. Galerien speichern sich selbst; Link und Passwort an Kund:innen weitergeben.
      </p>
    </div>`;
}

function renderAll() {
  renderList();
  renderEditor();
  renderDisciplines();
  renderAbout();
  renderGeneral();
  updateStatus();
}

/* ── Medien: alle hochgeladenen Fotos und Loops auf einen Blick (nur ansehen) ── */
let mediaFiles = null;           // Liste vom Server, wird beim Öffnen des Tabs geladen
let mediaFilter = "";
const MEDIA_KINDS = { image: "Fotos", loop: "Loops", film: "Film-Vorschauen" };

// Wo wird eine Datei verwendet? Zählt den aktuellen Stand im CMS, auch ungespeicherte Änderungen.
function mediaUsage() {
  const use = {};
  const add = (path, label) => (use[path] ??= []).push(label);
  state.PROJECTS.forEach((p) => {
    const name = p.title || "Ohne Titel";
    p.images.forEach((src, k) => add(src, k ? name : `${name} (Titelbild)`));
    (p.filmThumbs || []).forEach((src) => src && add(src, `${name} (Film)`));
  });
  if (state.ABOUT.portrait) add(state.ABOUT.portrait, "Wer: Portrait");
  return use;
}

async function loadMedia() {
  try { mediaFiles = await api("media"); } catch (err) { mediaFiles = []; toast(err.message); }
  renderMedia();
}

function renderMedia() {
  const box = $("[data-media]");
  if (!mediaFiles) { box.innerHTML = `<h1>Medien</h1><p class="muted">Lädt …</p>`; return; }
  const use = mediaUsage();
  const tests = { "": () => true, unused: (f) => !use[f.path], ...Object.fromEntries(Object.keys(MEDIA_KINDS).map((k) => [k, (f) => f.kind === k])) };
  const chip = (key, label) => {
    const n = mediaFiles.filter(tests[key]).length;
    return n || !key ? `<button data-media-filter="${key}" class="${mediaFilter === key ? "is-active" : ""}">${label} ${pad(n)}</button>` : "";
  };
  const list = mediaFiles.filter(tests[mediaFilter] || tests[""]);
  box.innerHTML = `
    <h1>Medien</h1>
    <p class="muted">Alle Fotos und Loops, die fürs Portfolio hochgeladen sind, die neusten zuerst. Ein Klick öffnet das Original. Dateien der Kunden-Galerien stehen unter «Galerien».</p>
    <div class="chips mono">${chip("", "Alle")}${Object.entries(MEDIA_KINDS).map(([k, v]) => chip(k, v)).join("")}${chip("unused", "Nicht verwendet")}</div>
    ${list.length ? `<div class="media-grid">${list.map((f) => `
      <div class="media-tile${use[f.path] ? "" : " is-unused"}">
        <a class="img" href="${esc(f.path)}" target="_blank" rel="noopener" title="Original öffnen">
          ${f.kind === "loop" && !f.thumb ? "" : `<img src="${esc(f.thumb || f.path)}" alt="" loading="lazy" />`}
          ${f.kind === "loop" ? `<span class="img__badge mono">▶ Loop</span>` : ""}
        </a>
        <span class="media-tile__name mono muted">${esc(f.path.split("/").pop())} · ${fmtBytes(f.size)}</span>
        <span class="media-tile__use">${use[f.path] ? use[f.path].map(esc).join("<br />") : `<span class="muted">Nicht verwendet</span>`}</span>
      </div>`).join("")}</div>` : `<p class="muted">Hier ist noch nichts.</p>`}`;
}

$("[data-media]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-media-filter]");
  if (!b) return;
  mediaFilter = b.dataset.mediaFilter;
  renderMedia();
});

/* ── Handy: Liste und Bearbeiten sind zwei Ansichten (auf dem Desktop nebeneinander) ── */
function showEditor(view, on) {
  $(view).classList.toggle("is-editing", on);
  if (matchMedia("(max-width: 900px)").matches) scrollTo(0, 0);
}
document.addEventListener("click", (e) => {
  const back = e.target.closest("[data-back]");
  if (back) showEditor(`#${back.closest(".view").id}`, false);
});

/* ── Events ──────────────────────────────────────────────────── */
$("[data-tabs]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab]");
  if (!b) return;
  $$("[data-tab]").forEach((x) => x.classList.toggle("is-active", x === b));
  $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${b.dataset.tab}`));
  if (b.dataset.tab === "media") loadMedia();   // jedes Mal frisch, damit neue Uploads dabei sind
});

$("[data-save]").addEventListener("click", save);

$("[data-filter]").addEventListener("click", (e) => {
  const b = e.target.closest("[data-f]");
  if (!b) return;
  filter = b.dataset.f;
  const vis = visible();
  if (vis.length && !vis.some(({ i }) => i === current)) current = vis[0].i;
  renderList();
  renderEditor();
});

$("[data-items]").addEventListener("click", (e) => {
  const li = e.target.closest("[data-i]");
  if (!li) return;
  const i = +li.dataset.i;
  const mv = e.target.closest("[data-move]");
  if (mv) {
    // mit dem nächsten sichtbaren Nachbarn tauschen
    const vis = visible().map((v) => v.i);
    const j = vis[vis.indexOf(i) + +mv.dataset.move];
    if (j === undefined) return;
    const P = state.PROJECTS;
    [P[i], P[j]] = [P[j], P[i]];
    current = j;
    markDirty();
  } else {
    current = i;
    showEditor("#view-projects", true);
  }
  renderList();
  renderEditor();
});

$("[data-new]").addEventListener("click", () => {
  state.PROJECTS.unshift({ ...blankProject(), title: "Neues Projekt", cat: filter || "branding" });
  current = 0;
  markDirty();
  showEditor("#view-projects", true);
  renderList();
  renderEditor();
  const t = $('[data-f="title"]');
  t.focus();
  t.select();
});

const editor = $("[data-editor]");
editor.addEventListener("input", (e) => {
  const film = e.target.dataset.film;
  if (film !== undefined) {
    state.PROJECTS[current].videos[+film] = e.target.value.trim();
    markDirty();
    return;
  }
  const f = e.target.dataset.f;
  if (!f || e.target.type === "checkbox" || e.target.tagName === "SELECT") return;
  const p = state.PROJECTS[current];
  p[f] = f === "year" ? (parseInt(e.target.value, 10) || "") : e.target.value;
  if (f === "title") $("[data-title-view]").textContent = p.title || "Ohne Titel";
  markDirty();
  renderList();
});
editor.addEventListener("change", (e) => {
  const f = e.target.dataset.f;
  const p = state.PROJECTS[current];
  const fullSrc = e.target.dataset.full;
  if (fullSrc) {
    p.full = e.target.checked ? [...new Set([...p.full, fullSrc])] : p.full.filter((s) => s !== fullSrc);
    markDirty();
    renderEditor();
    return;
  }
  if (f !== "cat") return;
  p.cat = e.target.value;
  markDirty();
  renderList();
  renderEditor();
});
editor.addEventListener("click", async (e) => {
  const p = state.PROJECTS[current];
  const art = e.target.closest("[data-art]");
  if (art) { p.art = +art.dataset.art; markDirty(); renderEditor(); renderList(); return; }

  if (e.target.closest("[data-film-add]")) {
    p.videos.push("");
    renderEditor();
    $$("[data-film]", editor).pop()?.focus();
    return;
  }
  const filmDel = e.target.closest("[data-film-del]");
  if (filmDel) { p.videos.splice(+filmDel.dataset.filmDel, 1); markDirty(); renderEditor(); return; }

  const layout = e.target.closest("[data-layout]");
  if (layout) {
    const src = layout.dataset.src;
    p.wide = layout.dataset.layout === "wide" ? [...new Set([...p.wide, src])] : p.wide.filter((s) => s !== src);
    markDirty();
    renderEditor();
    return;
  }

  const im = e.target.closest("[data-img]");
  if (im) {
    const k = +im.dataset.k, A = p.images;
    const act = im.dataset.img;
    if (act === "left" && k > 0) [A[k - 1], A[k]] = [A[k], A[k - 1]];
    if (act === "right" && k < A.length - 1) [A[k + 1], A[k]] = [A[k], A[k + 1]];
    if (act === "cover") A.unshift(A.splice(k, 1)[0]);
    if (act === "del") {   // Datei bleibt auf dem Server liegen (sicher)
      const gone = A.splice(k, 1)[0];
      p.full = p.full.filter((s) => s !== gone);
      p.wide = p.wide.filter((s) => s !== gone);
    }
    markDirty();
    renderEditor();
    renderList();
    return;
  }

  if (e.target.closest("[data-delete]")) {
    if (!confirm(`«${p.title || "Ohne Titel"}» wirklich löschen?`)) return;
    state.PROJECTS.splice(current, 1);
    current = Math.max(0, Math.min(current, state.PROJECTS.length - 1));
    markDirty();
    renderList();
    renderEditor();
  }
});
dropZone(editor, "[data-drop]", "[data-file]", addImages);
// Bilder nicht versehentlich im Browser öffnen, wenn daneben fallen gelassen
addEventListener("dragover", (e) => e.preventDefault());
addEventListener("drop", (e) => e.preventDefault());

$("[data-disciplines]").addEventListener("input", (e) => {
  const t = e.target;
  const cat = t.dataset.catLabel;
  if (cat) {
    state.CATS[cat] = t.value.trim();
    $(`[data-cat-title="${cat}"]`).textContent = state.CATS[cat];
    renderList();
    markDirty();
    return;
  }
  if (t.dataset.di === undefined) return;
  const d = state.DISCIPLINES[+t.dataset.di];
  if (t.dataset.ds !== undefined) d.steps[+t.dataset.ds][+t.dataset.dp] = t.value;
  else if (t.dataset.dk === "tags") d.tags = t.value.split(",").map((s) => s.trim()).filter(Boolean);
  else d[t.dataset.dk] = t.value;
  markDirty();
});

$("[data-general]").addEventListener("input", (e) => {
  const { g, si, sk } = e.target.dataset;
  if (g) state[g] = e.target.value.trim();
  else if (si !== undefined) state.SOCIAL[+si][sk] = e.target.value.trim();
  else return;
  markDirty();
});
$("[data-general]").addEventListener("click", (e) => {
  const del = e.target.closest("[data-social-del]");
  if (del) state.SOCIAL.splice(+del.dataset.socialDel, 1);
  else if (e.target.closest("[data-social-add]")) state.SOCIAL.push({ label: "", url: "" });
  else return;
  markDirty();
  renderGeneral();
  if (!del) $$("[data-sk='label']").at(-1)?.focus();
});

addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (dirty) save();
  }
});

addEventListener("beforeunload", (e) => {
  if (dirty || uploading) { e.preventDefault(); e.returnValue = ""; }
});

/* ── Galerien ────────────────────────────────────────────────── */
// Galerien liegen nur auf dem Server und speichern sich sofort (unabhängig vom «Speichern»-Knopf oben)
let galleryList = [];
let gallery = null;              // gewählte Galerie (Entwurf, bis gespeichert)
let uploading = 0;

const fmtBytes = (b) => {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  for (; b >= 1024 && i < units.length - 1; i++) b /= 1024;
  return `${b.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
};
const fmtDate = (d) => (d ? new Date(`${d}T00:00`).toLocaleDateString("de-CH") : "");
const galleryUrl = (slug) => new URL(`galerie.php?g=${slug}`, document.baseURI).href;
const fileUrl = (slug, name, extra = "") => `api/file.php?g=${encodeURIComponent(slug)}&f=${encodeURIComponent(name)}${extra}`;

function newPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return [...crypto.getRandomValues(new Uint32Array(10))].map((n) => chars[n % chars.length]).join("");
}

async function loadGalleries(select = gallery?.slug) {
  try {
    galleryList = await api("galleries");
  } catch (e) {
    toast(e.message);
    return;
  }
  const found = galleryList.find((g) => g.slug === select);
  if (found) gallery = structuredClone(found);
  else if (gallery?.slug || !gallery) gallery = galleryList[0] ? structuredClone(galleryList[0]) : null;
  renderGalleryList();
  renderGalleryEditor();
}

function renderGalleryList() {
  $("[data-galleries]").innerHTML = galleryList.length ? galleryList.map((g) => `
    <li class="item${g.slug === gallery?.slug ? " is-active" : ""}" data-g="${esc(g.slug)}" style="grid-template-columns:1fr auto">
      <div>
        <div class="item__title">${esc(g.title)}</div>
        <div class="mono muted">${esc(fmtDate(g.date) || "Ohne Datum")} · ${g.files.length} Datei${g.files.length === 1 ? "" : "en"}</div>
      </div>
      ${g.expired ? `<span class="tag mono">Abgelaufen</span>` : ""}
    </li>`).join("") : `<li class="empty muted">Noch keine Galerien.</li>`;
}

function renderGalleryEditor() {
  const ed = $("[data-gallery-editor]");
  const g = gallery;
  if (!g) {
    ed.innerHTML = `<div class="editor__head"><h1>Galerien</h1></div>
      <p style="max-width:60ch">Hier legst du passwortgeschützte Seiten an, auf denen Kund:innen Fotos und Videos von Anlässen ansehen und herunterladen können.
      Lege mit «+ Neue Galerie» die erste an.</p>`;
    return;
  }
  const files = g.files || [];
  const size = files.reduce((sum, f) => sum + f.size, 0);
  ed.innerHTML = `
    <button class="btn btn--sm editor__back" type="button" data-back>← Alle Galerien</button>
    <div class="editor__head">
      <div>
        <p class="mono muted" style="margin:0 0 8px">${g.slug ? `${files.length} Dateien · ${fmtBytes(size)}` : "Neue Galerie — noch nicht gespeichert"}</p>
        <h1>${esc(g.title || "Neue Galerie")}</h1>
      </div>
      <div class="actions">
        ${g.slug ? `<a class="btn btn--sm" href="${esc(galleryUrl(g.slug))}" target="_blank" rel="noopener">Ansehen ↗</a>
        <button class="btn btn--sm btn--danger" data-g-delete>Löschen</button>` : ""}
      </div>
    </div>

    <div class="form">
      <label class="field field--4"><span class="mono">Titel</span>
        <input type="text" data-gf="title" value="${esc(g.title)}" placeholder="z. B. Hochzeit Muster, 12. Juni" /></label>
      <label class="field field--2"><span class="mono">Datum des Anlasses</span>
        <input type="date" data-gf="date" value="${esc(g.date)}" /></label>
      <div class="field field--4"><span class="mono">Passwort</span>
        <div class="pw">
          <input type="text" data-gf="password" value="${esc(g.password)}" autocomplete="off" spellcheck="false" />
          <button class="btn btn--sm" data-g-newpw type="button">Neu erzeugen</button>
        </div>
        <small>Mindestens 8 Zeichen. Wird geprüft, bevor jemand die Galerie sieht.</small></div>
      <label class="field field--2"><span class="mono">Verfügbar bis (optional)</span>
        <input type="date" data-gf="expires" value="${esc(g.expires)}" />
        <small>Danach ist die Galerie für Kund:innen gesperrt.</small></label>
      <div class="field"><div><button class="btn btn--fill" data-g-save type="button">${g.slug ? "Änderungen speichern" : "Galerie anlegen"}</button></div></div>

      ${g.slug ? `
      <div class="field"><span class="mono">Weitergeben</span>
        <div class="share">
          <code>${esc(galleryUrl(g.slug))}</code>
          <button class="btn btn--sm" data-g-copy="link" type="button">Link kopieren</button>
          <button class="btn btn--sm btn--fill" data-g-copy="all" type="button">Link + Passwort kopieren</button>
        </div></div>

      <div class="field"><span class="mono">Fotos & Videos</span>
        <div class="drop" data-g-drop tabindex="0" role="button">
          <strong>Dateien hierher ziehen oder klicken</strong>
          <span class="mono muted">Fotos (JPG, PNG, WebP, HEIC) und Videos (MP4, MOV, WebM) — auch sehr grosse Dateien</span>
        </div>
        <div class="uploads" data-g-uploads></div>
        ${files.length ? `<div class="files">${files.map((f) => `
          <div class="file">
            ${f.thumb
              ? `<img src="${esc(fileUrl(g.slug, f.name, "&thumb=1"))}" alt="" loading="lazy" />`
              : f.kind === "video"
                ? `<video src="${esc(fileUrl(g.slug, f.name))}#t=0.5" preload="metadata" muted></video>`
                : `<img src="${esc(fileUrl(g.slug, f.name))}" alt="" loading="lazy" />`}
            <span class="file__name mono">${f.kind === "video" ? "▶ " : ""}${esc(f.name)} · ${fmtBytes(f.size)}</span>
            <button class="file__del" data-g-file-del="${esc(f.name)}" title="Datei löschen">✕</button>
          </div>`).join("")}</div>` : ""}
      </div>` : `<p class="field muted" style="margin:0">Nach dem Anlegen kannst du Fotos und Videos hochladen.</p>`}
    </div>`;
}

async function saveGallery() {
  try {
    const { slug } = await api("gallery-save", { slug: gallery.slug, title: gallery.title, date: gallery.date, password: gallery.password, expires: gallery.expires });
    toast(gallery.slug ? "Galerie gespeichert" : "Galerie angelegt — jetzt Dateien hochladen");
    await loadGalleries(slug);
  } catch (e) {
    toast(e.message);
  }
}

// Galerie-Datei in Stücken hochladen, mit Fortschritt in der Zeile
async function uploadGalleryFile(slug, file, row) {
  const res = await uploadChunks("chunk", file, { slug, name: file.name }, (x) => {
    row.querySelector("progress").value = x;
    row.querySelector("[data-pct]").textContent = `${Math.round(x * 100)} %`;
  });
  return res.name;
}

// Standbild aus einem Video ziehen (bei ca. 10 % der Länge, max. 1 s) — dient als Vorschau in der Galerie.
// Klappt nicht bei jedem Codec (z. B. HEVC in Chrome); dann zeigt die Galerie das Video selbst.
async function videoPoster(file) {
  const url = URL.createObjectURL(file);
  const video = Object.assign(document.createElement("video"), { muted: true, playsInline: true, preload: "auto", src: url });
  const wait = (event) => new Promise((resolve, reject) => {
    video.addEventListener(event, resolve, { once: true });
    video.addEventListener("error", reject, { once: true });
    setTimeout(() => reject(new Error("Zeitüberschreitung")), 20000);
  });
  try {
    await wait("loadeddata");
    video.currentTime = Math.min(1, (video.duration || 0) / 10);
    await wait("seeked");
    const scale = Math.min(1, 1200 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(video.videoWidth * scale), height: Math.round(video.videoHeight * scale) });
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.8));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function uploadPoster(slug, name, file) {
  const blob = await videoPoster(file).catch(() => null);
  if (!blob) return;
  const form = new FormData();
  form.append("slug", slug);
  form.append("name", name);
  form.append("poster", blob, "poster.jpg");
  await api("gallery-poster", form).catch(() => {});
}

async function addGalleryFiles(files) {
  const slug = gallery?.slug;
  if (!slug || !files.length) return;
  const box = $("[data-g-uploads]");
  const queue = [...files].map((file) => {
    const row = document.createElement("div");
    row.className = "upload mono";
    row.innerHTML = `<span>${esc(file.name)} · ${fmtBytes(file.size)}</span><span data-pct>wartet</span><progress max="1" value="0"></progress>`;
    box.appendChild(row);
    return { file, row };
  });
  uploading++;
  let done = 0;
  for (const { file, row } of queue) {
    try {
      const name = await uploadGalleryFile(slug, file, row);
      if (file.type.startsWith("video/") || /\.(mov|mp4|m4v|webm)$/i.test(file.name)) {
        row.querySelector("[data-pct]").textContent = "Standbild …";
        await uploadPoster(slug, name, file);
      }
      row.remove();
      done++;
    } catch (e) {
      row.querySelector("[data-pct]").textContent = `Fehler: ${e.message}`;
    }
  }
  uploading--;
  if (done) toast(`${done} ${done === 1 ? "Datei" : "Dateien"} hochgeladen`);
  const keep = [...box.children];
  await loadGalleries(slug);
  $("[data-g-uploads]")?.append(...keep);   // Fehlermeldungen stehen lassen
}

$("[data-galleries]").addEventListener("click", (e) => {
  const li = e.target.closest("[data-g]");
  if (!li) return;
  gallery = structuredClone(galleryList.find((g) => g.slug === li.dataset.g));
  showEditor("#view-galleries", true);
  renderGalleryList();
  renderGalleryEditor();
});

$("[data-gallery-new]").addEventListener("click", () => {
  gallery = { slug: "", title: "", date: new Date().toISOString().slice(0, 10), password: newPassword(), expires: "", files: [] };
  showEditor("#view-galleries", true);
  renderGalleryList();
  renderGalleryEditor();
  $('[data-gf="title"]').focus();
});

const gEditor = $("[data-gallery-editor]");
gEditor.addEventListener("input", (e) => {
  const f = e.target.dataset.gf;
  if (f) gallery[f] = e.target.value;
});
gEditor.addEventListener("click", async (e) => {
  if (e.target.closest("[data-g-save]")) return saveGallery();
  if (e.target.closest("[data-g-newpw]")) {
    gallery.password = newPassword();
    $('[data-gf="password"]').value = gallery.password;
    return;
  }
  const copy = e.target.closest("[data-g-copy]");
  if (copy) {
    const saved = galleryList.find((g) => g.slug === gallery.slug);
    const text = copy.dataset.gCopy === "link" ? galleryUrl(gallery.slug) : `${saved.title}\nLink: ${galleryUrl(gallery.slug)}\nPasswort: ${saved.password}`;
    await navigator.clipboard.writeText(text);
    toast(copy.dataset.gCopy === "link" ? "Link kopiert" : "Link und Passwort kopiert");
    return;
  }

  const del = e.target.closest("[data-g-file-del]");
  if (del) {
    if (!confirm(`«${del.dataset.gFileDel}» endgültig löschen?`)) return;
    try {
      await api("gallery-file-delete", { slug: gallery.slug, name: del.dataset.gFileDel });
      await loadGalleries(gallery.slug);
    } catch (err) { toast(err.message); }
    return;
  }

  if (e.target.closest("[data-g-delete]")) {
    if (!confirm(`Galerie «${gallery.title}» mit allen ${gallery.files.length} Dateien endgültig löschen?`)) return;
    try {
      await api("gallery-delete", { slug: gallery.slug });
      gallery = null;
      toast("Galerie gelöscht");
      await loadGalleries();
    } catch (err) { toast(err.message); }
  }
});
dropZone(gEditor, "[data-g-drop]", "[data-gallery-file]", addGalleryFiles);

/* ── Start ───────────────────────────────────────────────────── */
async function start() {
  state = normalize(await api("data"));
  current = 0;
  renderAll();
  loadGalleries();
  checkStorageLocked();
}

// Selbstkontrolle: Der gesperrte Speicher (Galerien, Backups) darf von aussen nie erreichbar sein
async function checkStorageLocked() {
  if (["localhost", "127.0.0.1"].includes(location.hostname)) return;   // lokal gibt es keine Sperre
  const res = await fetch("storage/index.html", { cache: "no-store" }).catch(() => null);
  if (res?.ok) {
    $("[data-alarm]").hidden = false;
  }
}

api("session")
  .then((s) => {
    csrf = s.csrf;
    chunkSize = s.chunk;
    if (!s.configured) showLogin("Auf dem Server ist noch kein Passwort eingerichtet.");
    else if (s.admin) start();
    else showLogin();
  })
  .catch((e) => showLogin(e.message));
