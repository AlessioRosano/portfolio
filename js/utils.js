/* ==========================================================================
   Gemeinsame Helfer für Website (main.js) und CMS (admin.js).
   ========================================================================== */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const pad = (n, l = 2) => String(n).padStart(l, "0");
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Video-Loops (MP4/WebM) stehen in derselben Liste wie Bilder; daneben liegt ein Standbild als .jpg
const isLoop = (src) => /\.(mp4|webm)$/i.test(src);
const loopPoster = (src) => src.replace(/\.\w+$/, ".jpg");
const stillOf = (src) => (isLoop(src) ? loopPoster(src) : src);   // Bild zum Anzeigen: bei Loops das Standbild

// Text → Adressteil (wie urlSlug in api/lib.php)
function slugify(s, max = 40) {
  return (s || "projekt").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, max) || "projekt";
}

// Projekt-Adressen (wie projectSlugs in api/lib.php): eigener Slug aus dem CMS, sonst aus dem Titel; gleiche bekommen -2, -3 …
function projectIds(projects) {
  const seen = {};
  return projects.map((p) => {
    const base = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug || "") ? p.slug : slugify(p.title);
    let id = base, n = 2;
    while (seen[id]) id = `${base}-${n++}`;
    seen[id] = true;
    return id;
  });
}
