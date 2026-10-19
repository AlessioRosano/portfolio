/* ==========================================================================
   Gemeinsame Helfer für Website (main.js) und CMS (admin.js).
   ========================================================================== */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const pad = (n, l = 2) => String(n).padStart(l, "0");
const esc = (s = "") => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function slugify(s) {
  return (s || "projekt").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "projekt";
}

// Stabile Projekt-Adressen aus dem Titel; gleiche Titel bekommen -2, -3 …
function projectIds(projects) {
  const seen = {};
  return projects.map((p) => {
    const base = slugify(p.title);
    let id = base, n = 2;
    while (seen[id]) id = `${base}-${n++}`;
    seen[id] = true;
    return id;
  });
}
