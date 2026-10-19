/* ==========================================================================
   Generierte Platzhalter-Artworks (SVG) — monochrom in Akzentfarbe/Weiss.
   Werden nur angezeigt, solange ein Projekt noch keine Bilder hat (admin.html).
   ========================================================================== */

// Farben sind CSS-Variablen (css/style.css) — beim Farbwechsel färben sich die Grafiken von selbst um
const ART_C = {
  ink: "var(--bx)", deep: "var(--bx-deep)", night: "var(--bx-night)",
  b80: "var(--bx-80)", b60: "var(--bx-60)", b35: "var(--bx-35)",
  b15: "var(--bx-15)", b08: "var(--bx-08)", w: "var(--white)",
};

function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONO = `font-family="JetBrains Mono, monospace" letter-spacing="0.5"`;
const SANS = `font-family="Inter Tight, sans-serif"`;
const SERIF = `font-family="Instrument Serif, serif" font-style="italic"`;

function svgWrap(W, H, body) {
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${body}</svg>`;
}

function gridLines(W, H, step, color, op = 1) {
  let s = "";
  for (let x = step; x < W; x += step) s += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for (let y = step; y < H; y += step) s += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  return `<g stroke="${color}" stroke-width="1" opacity="${op}">${s}</g>`;
}

function corners(W, H, p, l, color) {
  return `<g stroke="${color}" stroke-width="2" fill="none">
    <path d="M${p} ${p + l}V${p}H${p + l}"/><path d="M${W - p - l} ${p}H${W - p}V${p + l}"/>
    <path d="M${p} ${H - p - l}V${H - p}H${p + l}"/><path d="M${W - p - l} ${H - p}H${W - p}V${H - p - l}"/></g>`;
}

/* ── Architektur ─────────────────────────────────────────────── */
function artPlan(W, H) {
  const m = Math.min(W, H) * 0.17;
  const x0 = m, y0 = m * 1.15, x1 = W - m, y1 = H - m * 1.15;
  const w = x1 - x0, h = y1 - y0;
  const vx = x0 + w * 0.56, hy = y0 + h * 0.58, d = Math.min(w, h) * 0.16;
  let stairs = "";
  for (let i = 0; i < 8; i++) {
    const y = hy + 12 + i * ((y1 - hy - 24) / 8);
    stairs += `<line x1="${vx + 14}" y1="${y}" x2="${vx + w * 0.2}" y2="${y}"/>`;
  }
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.b08}"/>
    ${gridLines(W, H, 20, ART_C.b15)}
    <g stroke="${ART_C.ink}" stroke-linecap="square" fill="none">
      <rect x="${x0}" y="${y0}" width="${w}" height="${h}" stroke-width="7"/>
      <path d="M${vx} ${y0}V${hy - d - 10}M${vx} ${hy}V${y1}" stroke-width="5"/>
      <path d="M${x0} ${hy}H${x0 + w * 0.22}M${x0 + w * 0.22 + d}  ${hy}H${x1}" stroke-width="5"/>
      <path d="M${vx} ${hy - d - 10}A${d} ${d} 0 0 1 ${vx - d} ${hy - 10}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <line x1="${vx}" y1="${hy - d - 10}" x2="${vx - d}" y2="${hy - d - 10}" stroke-width="2"/>
      <path d="M${x0 + w * 0.22} ${hy}A${d} ${d} 0 0 0 ${x0 + w * 0.22 + d} ${hy - d}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <g stroke-width="1.5">${stairs}</g>
      <rect x="${x0 + w * 0.08}" y="${y0 + h * 0.1}" width="${w * 0.3}" height="${h * 0.2}" stroke-width="1.5"/>
      <circle cx="${x0 + w * 0.75}" cy="${y0 + h * 0.28}" r="${Math.min(w, h) * 0.1}" stroke-width="1.5"/>
    </g>
    <g stroke="${ART_C.ink}" stroke-width="1.2">
      <line x1="${x0}" y1="${y0 - m * 0.5}" x2="${x1}" y2="${y0 - m * 0.5}"/>
      <line x1="${x0 - 5}" y1="${y0 - m * 0.5 + 5}" x2="${x0 + 5}" y2="${y0 - m * 0.5 - 5}"/>
      <line x1="${x1 - 5}" y1="${y0 - m * 0.5 + 5}" x2="${x1 + 5}" y2="${y0 - m * 0.5 - 5}"/>
      <line x1="${x0 - m * 0.5}" y1="${y0}" x2="${x0 - m * 0.5}" y2="${y1}"/>
      <line x1="${x0 - m * 0.5 - 5}" y1="${y0 + 5}" x2="${x0 - m * 0.5 + 5}" y2="${y0 - 5}"/>
      <line x1="${x0 - m * 0.5 - 5}" y1="${y1 + 5}" x2="${x0 - m * 0.5 + 5}" y2="${y1 - 5}"/>
    </g>
    <text x="${W / 2}" y="${y0 - m * 0.5 - 8}" text-anchor="middle" font-size="11" fill="${ART_C.ink}" ${MONO}>12.40</text>
    <text transform="translate(${x0 - m * 0.5 - 8} ${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="${ART_C.ink}" ${MONO}>9.60</text>
    <g transform="translate(${x1 - 4} ${y1 + m * 0.55})" fill="${ART_C.ink}">
      <circle r="13" fill="none" stroke="${ART_C.ink}" stroke-width="1.2"/><path d="M0 -10 5 6 0 3 -5 6Z"/>
    </g>
    <text x="${x0}" y="${y1 + m * 0.6}" font-size="11" fill="${ART_C.ink}" ${MONO}>GRUNDRISS EG — 1:100</text>`);
}

function artSection(W, H) {
  const g = H * 0.7, l = W * 0.2, r = W * 0.8, eave = H * 0.4, peak = H * 0.2, mid = (l + r) / 2;
  const fl = (g + eave) / 2;
  const win = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${ART_C.b15}" stroke="${ART_C.ink}" stroke-width="2"/><line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="${ART_C.ink}" stroke-width="1"/>`;
  const ww = (r - l) * 0.18;
  return svgWrap(W, H, `
    <defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${ART_C.ink}" stroke-width="1.5"/></pattern></defs>
    <rect width="${W}" height="${H}" fill="${ART_C.w}"/>
    ${gridLines(W, H, 25, ART_C.b08)}
    <circle cx="${W * 0.8}" cy="${H * 0.14}" r="${W * 0.07}" fill="none" stroke="${ART_C.ink}" stroke-width="1.5"/>
    <rect x="0" y="${g}" width="${W}" height="${H - g}" fill="url(#hatch)" opacity="0.55"/>
    <polygon points="${l},${g} ${l},${eave} ${mid},${peak} ${r},${eave} ${r},${g}" fill="${ART_C.b08}" stroke="${ART_C.ink}" stroke-width="5" stroke-linejoin="miter"/>
    <line x1="${l}" y1="${fl}" x2="${r}" y2="${fl}" stroke="${ART_C.ink}" stroke-width="3" stroke-dasharray="10 5"/>
    ${win(l + ww * 0.6, eave + 14, ww, fl - eave - 30)}
    ${win(r - ww * 1.6, eave + 14, ww, fl - eave - 30)}
    ${win(l + ww * 0.6, fl + 16, ww * 1.6, g - fl - 30)}
    <rect x="${r - ww * 1.4}" y="${fl + 16}" width="${ww * 0.8}" height="${g - fl - 16}" fill="${ART_C.ink}"/>
    <line x1="0" y1="${g}" x2="${W}" y2="${g}" stroke="${ART_C.ink}" stroke-width="3"/>
    <g fill="${ART_C.ink}" font-size="11" ${MONO}>
      <path d="M${l - 40} ${peak} l6 -8 h-12Z"/><text x="${l - 56}" y="${peak - 12}">+7.20</text>
      <path d="M${l - 40} ${fl} l6 -8 h-12Z"/><text x="${l - 56}" y="${fl - 12}">+3.10</text>
      <path d="M${l - 40} ${g} l6 -8 h-12Z"/><text x="${l - 56}" y="${g - 12}">±0.00</text>
      <rect x="${W * 0.06 - 8}" y="${H - H * 0.06 - 15}" width="136" height="22" fill="${ART_C.ink}"/>
      <text x="${W * 0.06}" y="${H - H * 0.06}" fill="${ART_C.w}" font-size="11">SCHNITT A—A 1:50</text>
    </g>`);
}

/* ── Branding ────────────────────────────────────────────────── */
function artMark(W, H, title = "Brand") {
  const cx = W / 2, cy = H * 0.44, R = Math.min(W, H) * 0.27;
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.ink}"/>
    <g stroke="${ART_C.b60}" stroke-width="1" fill="none" opacity="0.8">
      <circle cx="${cx}" cy="${cy}" r="${R * 1.35}"/><circle cx="${cx}" cy="${cy}" r="${R * 0.5}"/>
      <rect x="${cx - R}" y="${cy - R}" width="${R * 2}" height="${R * 2}"/>
      <line x1="0" y1="${cy}" x2="${W}" y2="${cy}"/><line x1="${cx}" y1="0" x2="${cx}" y2="${H}"/>
      <line x1="${cx - R * 1.6}" y1="${cy - R * 1.6}" x2="${cx + R * 1.6}" y2="${cy + R * 1.6}"/>
      <line x1="${cx + R * 1.6}" y1="${cy - R * 1.6}" x2="${cx - R * 1.6}" y2="${cy + R * 1.6}"/>
    </g>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="${ART_C.w}"/>
    <rect x="${cx}" y="${cy}" width="${R}" height="${R}" fill="${ART_C.ink}"/>
    <rect x="${cx + R * 0.25}" y="${cy + R * 0.25}" width="${R * 0.75}" height="${R * 0.75}" fill="${ART_C.w}"/>
    <g fill="${ART_C.w}" font-size="8" ${MONO}>
      <text x="${cx + R + 6}" y="${cy - R - 6}">R=${Math.round(R)}</text>
      <text x="${cx - R}" y="${cy + R * 1.35 + 16}" opacity="0.7">LOGO — KONSTRUKTION</text>
    </g>
    <text x="${cx}" y="${H * 0.88}" text-anchor="middle" fill="${ART_C.w}" font-size="${Math.min(W, H) * 0.075}" font-weight="800" letter-spacing="${Math.min(W, H) * 0.02}" ${SANS}>${title.toUpperCase()}</text>`);
}

function artPalette(W, H, title = "Brand") {
  const bands = [ART_C.b15, ART_C.b35, ART_C.b60, ART_C.ink];
  const labels = ["TINT", "SOFT", "MEDIUM", "PRIMARY"];
  const top = H * 0.52, bh = (H - top) / bands.length;
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.b08}"/>
    <text x="${W * 0.08}" y="${H * 0.14}" font-size="11" fill="${ART_C.ink}" ${MONO}>BRAND GUIDELINES — V1.0</text>
    <text x="${W * 0.92}" y="${H * 0.14}" text-anchor="end" font-size="11" fill="${ART_C.ink}" ${MONO}>EST. 2026</text>
    <text x="${W * 0.08}" y="${H * 0.38}" font-size="${Math.min(W * 0.15, H * 0.16)}" fill="${ART_C.ink}" ${SERIF}>${title}</text>
    ${bands.map((c, i) => `
      <rect x="0" y="${top + i * bh}" width="${W}" height="${bh + 1}" fill="${c}"/>
      <text x="${W * 0.08}" y="${top + i * bh + bh / 2 + 4}" font-size="11" fill="${i > 1 ? ART_C.w : ART_C.ink}" ${MONO}>${labels[i]}</text>
      <text x="${W * 0.92}" y="${top + i * bh + bh / 2 + 4}" text-anchor="end" font-size="11" fill="${i > 1 ? ART_C.w : ART_C.ink}" ${MONO}>${["15", "35", "60", "100"][i]}%</text>`).join("")}`);
}

/* ── Video ───────────────────────────────────────────────────── */
function artFrame(W, H, seed = 3) {
  const r = rng(seed);
  const ridge = (base, amp, n) => {
    let p = `M0 ${H}L0 ${base}`;
    for (let i = 1; i <= n; i++) p += `L${(W / n) * i} ${base - r() * amp}`;
    return p + `L${W} ${H}Z`;
  };
  const bar = H * 0.1;
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.deep}"/>
    <circle cx="${W * 0.66}" cy="${H * 0.4}" r="${Math.min(W, H) * 0.12}" fill="${ART_C.b15}"/>
    <path d="${ridge(H * 0.62, H * 0.18, 7)}" fill="${ART_C.b80}"/>
    <path d="${ridge(H * 0.72, H * 0.14, 9)}" fill="${ART_C.ink}"/>
    <path d="${ridge(H * 0.82, H * 0.08, 12)}" fill="${ART_C.deep}"/>
    <rect width="${W}" height="${bar}" fill="${ART_C.night}"/><rect y="${H - bar}" width="${W}" height="${bar}" fill="${ART_C.night}"/>
    ${corners(W, H, bar + 14, 18, ART_C.w)}
    <g stroke="${ART_C.w}" stroke-width="1" opacity="0.7"><line x1="${W / 2 - 8}" y1="${H / 2}" x2="${W / 2 + 8}" y2="${H / 2}"/><line x1="${W / 2}" y1="${H / 2 - 8}" x2="${W / 2}" y2="${H / 2 + 8}"/></g>
    <g fill="${ART_C.w}" font-size="11" ${MONO}>
      <circle cx="22" cy="${bar / 2}" r="4"/><text x="32" y="${bar / 2 + 4}">REC</text>
      <text x="${W - 16}" y="${bar / 2 + 4}" text-anchor="end">4K · 24FPS</text>
      <text x="16" y="${H - bar / 2 + 4}">00:01:24:12</text>
      <text x="${W - 16}" y="${H - bar / 2 + 4}" text-anchor="end">ISO 800</text>
    </g>`);
}

function artTimeline(W, H, seed = 7) {
  const r = rng(seed);
  const pv = H * 0.5, pad = W * 0.06;
  const tracks = [ART_C.ink, ART_C.b60, ART_C.b35];
  let clips = "";
  tracks.forEach((c, t) => {
    let x = pad;
    while (x < W - pad) {
      const w = Math.min(W - pad - x, 30 + r() * 110);
      clips += `<rect x="${x}" y="${pv + 44 + t * 30}" width="${w - 3}" height="24" rx="3" fill="${c}"/>`;
      x += w + (r() > 0.7 ? 10 : 0);
    }
  });
  let wave = "";
  for (let x = pad; x < W - pad; x += 4) {
    const a = 3 + r() * 14 * Math.abs(Math.sin(x / 40));
    wave += `<line x1="${x}" y1="${pv + 150 - a}" x2="${x}" y2="${pv + 150 + a}"/>`;
  }
  let ruler = "";
  for (let x = pad, i = 0; x < W - pad; x += 20, i++) {
    ruler += `<line x1="${x}" y1="${pv + 16}" x2="${x}" y2="${pv + (i % 5 === 0 ? 30 : 24)}"/>`;
  }
  const ph = pad + (W - pad * 2) * 0.62;
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.b08}"/>
    <rect x="${pad}" y="${pad}" width="${W - pad * 2}" height="${pv - pad - 10}" rx="6" fill="${ART_C.ink}"/>
    <path d="M${W / 2 - 14} ${(pad + pv - 10) / 2 - 18} l34 18 l-34 18Z" fill="${ART_C.w}"/>
    <text x="${pad + 12}" y="${pad + 22}" font-size="10" fill="${ART_C.w}" ${MONO}>PROGRAM — SEQ_07</text>
    <g stroke="${ART_C.ink}" stroke-width="1">${ruler}</g>
    ${clips}
    <g stroke="${ART_C.b60}" stroke-width="2">${wave}</g>
    <line x1="${ph}" y1="${pv + 10}" x2="${ph}" y2="${H}" stroke="${ART_C.ink}" stroke-width="2"/>
    <path d="M${ph - 7} ${pv + 6}h14l-7 9Z" fill="${ART_C.ink}"/>
    <text x="${ph + 8}" y="${pv + 12}" font-size="10" fill="${ART_C.ink}" ${MONO}>00:02:13:08</text>`);
}

/* ── Gestaltung ──────────────────────────────────────────────── */
function artPoster(W, H, title = "Form") {
  const word = title.split(/[\s&]+/)[0].toUpperCase();
  const fs = Math.min((W * 0.92) / (word.length * 0.74), H * 0.32);
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.ink}"/>
    ${gridLines(W, H, W / 6, ART_C.b80, 0.6)}
    <circle cx="${W * 0.68}" cy="${H * 0.3}" r="${Math.min(W, H) * 0.26}" fill="${ART_C.b15}"/>
    <circle cx="${W * 0.68}" cy="${H * 0.3}" r="${Math.min(W, H) * 0.26}" fill="none" stroke="${ART_C.w}" stroke-width="1.5" transform="translate(-18 18)"/>
    <text x="${W * 0.04}" y="${H * 0.88}" font-size="${fs}" font-weight="800" fill="${ART_C.w}" letter-spacing="${-fs * 0.05}" ${SANS}>${word}</text>
    <g fill="${ART_C.w}" font-size="10" ${MONO}>
      <text x="${W * 0.06}" y="${H * 0.08}">KONZERTREIHE</text><text x="${W * 0.06}" y="${H * 0.08 + 14}">HERBST 26</text>
      <text x="${W * 0.94}" y="${H * 0.96}" text-anchor="end">NO. 01 / 06</text>
    </g>`);
}

function artSwiss(W, H, seed = 5) {
  const col = W / 12;
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.w}"/>
    <g stroke="${ART_C.b15}" stroke-width="1">${Array.from({ length: 11 }, (_, i) => `<line x1="${col * (i + 1)}" y1="0" x2="${col * (i + 1)}" y2="${H}"/>`).join("")}</g>
    <rect x="${col * 1}" y="${H * 0.08}" width="${col * 5}" height="${H * 0.46}" fill="${ART_C.ink}"/>
    <rect x="${col * 6}" y="${H * 0.54}" width="${col * 5}" height="${H * 0.08}" fill="${ART_C.b35}"/>
    <text x="${col * 1 + 8}" y="${H * 0.08 + 22}" font-size="10" fill="${ART_C.w}" ${MONO}>AUSGABE</text>
    <text x="${col * 6 + 6}" y="${H * 0.5}" font-size="${Math.min(H * 0.34, W * 0.34)}" font-weight="800" fill="${ART_C.ink}" letter-spacing="-6" ${SANS}>0${seed % 9}</text>
    <text x="${col}" y="${H * 0.76}" font-size="${Math.min(W * 0.1, H * 0.1)}" fill="${ART_C.ink}" ${SERIF}>Editorial</text>
    <g fill="${ART_C.ink}" opacity="0.6">${Array.from({ length: 6 }, (_, i) => `<rect x="${col}" y="${H * 0.82 + i * 8}" width="${col * (i === 5 ? 3 : 5)}" height="3"/><rect x="${col * 7}" y="${H * 0.82 + i * 8}" width="${col * (i === 5 ? 2 : 4)}" height="3"/>`).join("")}</g>`);
}

/* ── Portrait-Platzhalter ────────────────────────────────────── */
function artPortrait(W, H) {
  const cx = W / 2;
  return svgWrap(W, H, `
    <rect width="${W}" height="${H}" fill="${ART_C.b15}"/>
    ${gridLines(W, H, 20, ART_C.b08)}
    <circle cx="${cx}" cy="${H * 0.4}" r="${W * 0.17}" fill="${ART_C.b35}"/>
    <path d="M${W * 0.12} ${H} C${W * 0.14} ${H * 0.72} ${W * 0.3} ${H * 0.64} ${cx} ${H * 0.64} S${W * 0.86} ${H * 0.72} ${W * 0.88} ${H}Z" fill="${ART_C.b35}"/>
    <g stroke="${ART_C.ink}" stroke-width="1"><line x1="${cx}" y1="0" x2="${cx}" y2="${H}" stroke-dasharray="4 4"/><line x1="0" y1="${H * 0.4}" x2="${W}" y2="${H * 0.4}" stroke-dasharray="4 4"/></g>
    <text x="16" y="26" font-size="11" fill="${ART_C.ink}" ${MONO}>PLATZHALTER — BILD FOLGT</text>`);
}

/* ── Dispatcher ──────────────────────────────────────────────── */
function makeArt(type, variant = 0, W = 400, H = 500, title = "") {
  const v = variant % 2;
  title = esc(title);
  switch (type) {
    case "architektur": return v ? artSection(W, H) : artPlan(W, H);
    case "branding": return v ? artPalette(W, H, title || "Atelier") : artMark(W, H, title || "Nordwand");
    case "video": return v ? artTimeline(W, H, variant + 7) : artFrame(W, H, variant + 3);
    case "gestaltung": return v ? artSwiss(W, H, variant + 3) : artPoster(W, H, title || "Form");
    default: return artPortrait(W, H);
  }
}
