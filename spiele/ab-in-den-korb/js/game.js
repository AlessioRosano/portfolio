// Ab in den Korb! – Prototyp
// Logisches Spielfeld 1080 × 1920 px (9:16). Grafiken aus assets/ werden geladen,
// fehlende Dateien werden durch gezeichnete Platzhalter ersetzt.
(() => {
  'use strict';

  const W = 1080;
  const H = 1920;
  const FONT = '"Trebuchet MS", "Avenir Next", "Segoe UI", system-ui, sans-serif';
  const INK = '#2b2b2b';

  const HUD_H = 140;
  const FIG_W = 320;
  const FIG_H = 280;
  const FIG_BOTTOM = 1860;
  const FIG_TOP = FIG_BOTTOM - FIG_H;
  const BASKET_X = W / 2;
  const BASKET_MOUTH_Y = FIG_TOP + 70;
  const TAP_RADIUS = 0.62; // Trefferradius relativ zur Produktgrösse
  const FLY_TIME = 0.45;
  const FLOOR_Y = 1870;
  const PEEK_DURATION = 2.5;
  const PEEK_COST = 30;
  const POINTS_PER_ITEM = 100;
  const EXTRA_PENALTY = 25;
  const WRONG_PENALTY = 50;
  const CUMULUS_BY_STARS = [0, 20, 50, 100];
  const ROW_REVEAL = 0.32;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;

  const { PRODUCTS, LEVELS } = window.GAME_DATA;

  // ---------------------------------------------------------------- helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(str, x, y, size, opts = {}) {
    ctx.font = `${opts.weight || 'bold'} ${size}px ${FONT}`;
    ctx.fillStyle = opts.color || INK;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'middle';
    ctx.fillText(str, x, y);
  }

  // ---------------------------------------------------------------- assets
  const IMG = {};

  function loadImage(key, src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { IMG[key] = img; resolve(); };
      img.onerror = () => { IMG[key] = null; resolve(); };
      img.src = src;
    });
  }

  function assetList() {
    const list = [
      ['start', 'assets/hintergruende/start.png'],
      ['figur_normal', 'assets/spielfigur/figur_normal.png'],
      ['figur_fangen', 'assets/spielfigur/figur_fangen.png'],
      ['figur_links', 'assets/spielfigur/figur_links.png'],
      ['figur_rechts', 'assets/spielfigur/figur_rechts.png'],
      ['liste', 'assets/ui/liste.png'],
      ['kassenbon', 'assets/ui/kassenbon.png'],
      ['button', 'assets/ui/button.png'],
      ['button_gedrueckt', 'assets/ui/button_gedrueckt.png'],
      ['icon_richtig', 'assets/ui/icon_richtig.png'],
      ['icon_falsch', 'assets/ui/icon_falsch.png'],
      ['icon_fehlt', 'assets/ui/icon_fehlt.png'],
      ['icon_korb', 'assets/ui/icon_korb.png'],
      ['icon_cumulus', 'assets/ui/icon_cumulus.png'],
      ['titel', 'assets/ui/titel.png'],
      ['fang_funke', 'assets/effekte/fang_funke.png'],
      ['aufprall', 'assets/effekte/aufprall.png'],
    ];
    LEVELS.forEach((level, i) => {
      list.push([`bg_${level.id}`, `assets/hintergruende/level${i + 1}.png`]);
      list.push([`fg_${level.id}`, `assets/hintergruende/level${i + 1}_vorne.png`]);
    });
    Object.keys(PRODUCTS).forEach((id) => list.push([`p_${id}`, `assets/produkte/${id}.png`]));
    return list;
  }

  // ---------------------------------------------------------------- sound (synthetisch, keine Dateien)
  const Sound = {
    ac: null,
    muted: false,
    init() {
      if (this.ac) return;
      try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ac = null; }
    },
    tone(freq, dur, type = 'sine', vol = 0.15, when = 0, slide = 0) {
      if (!this.ac || this.muted) return;
      const t = this.ac.currentTime + when;
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    catch() { this.tone(660, 0.09, 'triangle', 0.18); this.tone(990, 0.12, 'triangle', 0.14, 0.06); },
    drop() { this.tone(150, 0.16, 'sine', 0.06, 0, 0.5); },
    click() { this.tone(520, 0.05, 'square', 0.05); },
    pick() { this.tone(880, 0.06, 'triangle', 0.12, 0, 1.4); },
    row() { this.tone(1200, 0.08, 'square', 0.04); },
    peek() { this.tone(380, 0.18, 'sawtooth', 0.04, 0, 1.6); },
    fanfare(stars) {
      const notes = [392, 523, 659, 784];
      for (let i = 0; i <= stars; i++) this.tone(notes[i], 0.25, 'triangle', 0.14, i * 0.14);
    },
  };

  // ---------------------------------------------------------------- state
  const state = {
    scene: 'loading',
    levelIndex: 0,
    time: 0,
    fig: { x: W / 2, targetX: W / 2, vx: 0, squash: 0 },
    items: [],
    fx: [],
    basket: {},
    basketCount: 0,
    deck: [],
    spawnT: 0,
    lastSpawnX: W / 2,
    peekT: 0,
    peeks: 0,
    banner: 0,
    timeLeft: null,
    closedByTime: false,
    result: null,
    revealT: 0,
    revealedRows: 0,
    fanfarePlayed: false,
  };

  const level = () => LEVELS[state.levelIndex];

  // ---------------------------------------------------------------- buttons / input
  let buttons = [];
  let pressedId = null;
  let hoverId = null;

  function hitButton(p) {
    for (let i = buttons.length - 1; i >= 0; i--) {
      const b = buttons[i];
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
    }
    return null;
  }

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
  }

  canvas.addEventListener('pointerdown', (e) => {
    Sound.init();
    const p = toGame(e);
    const b = hitButton(p);
    if (b && !b.disabled) {
      pressedId = b.id;
      return;
    }
    if (state.scene === 'play' && state.peekT <= 0 && state.banner <= 0.9) tapAt(p);
    if (state.scene === 'checkout' && state.revealedRows < resultRowCount()) state.revealT = 999;
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = toGame(e);
    const b = hitButton(p);
    hoverId = b && !b.disabled ? b.id : null;
    const overItem = state.scene === 'play' && state.peekT <= 0 && itemAt(p);
    canvas.style.cursor = hoverId || overItem ? 'pointer' : 'default';
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!pressedId) return;
    const b = hitButton(toGame(e));
    if (b && b.id === pressedId && !b.disabled) {
      Sound.click();
      b.onClick();
    }
    pressedId = null;
  });

  canvas.addEventListener('pointercancel', () => { pressedId = null; });
  canvas.addEventListener('pointerleave', () => { hoverId = null; });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') Sound.muted = !Sound.muted;
  });

  function button(id, x, y, w, h, label, onClick, opts = {}) {
    buttons.push({ id, x, y, w, h, onClick, disabled: !!opts.disabled });
    const down = pressedId === id;
    const hover = hoverId === id;
    const dy = down ? 6 : 0;
    ctx.save();
    if (opts.disabled) ctx.globalAlpha = 0.45;
    const img = down && IMG.button_gedrueckt ? IMG.button_gedrueckt : IMG.button;
    if (img) {
      ctx.drawImage(img, x, y + dy, w, h);
    } else {
      const fill = opts.color || '#e2701b';
      if (!down) {
        roundRect(x, y + 8, w, h, h / 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();
      }
      roundRect(x, y + dy + (down ? 2 : 0), w, h, h / 2);
      ctx.fillStyle = hover ? shade(fill, 12) : fill;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = INK;
      ctx.stroke();
    }
    text(label, x + w / 2, y + h / 2 + dy + 2, opts.size || Math.round(h * 0.36), { align: 'center', color: opts.textColor || '#fff' });
    ctx.restore();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255);
    const g = clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = clamp((n & 255) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }

  // ---------------------------------------------------------------- scene changes
  function showTitle() {
    state.scene = 'title';
  }

  function showList(index) {
    state.levelIndex = index;
    state.scene = 'list';
  }

  function buildDeck(lvl) {
    const deck = [];
    lvl.list.forEach(({ id, qty }) => { for (let k = 0; k < qty + 1; k++) deck.push(id); });
    lvl.distractors.forEach((id) => { for (let k = 0; k < (lvl.distractorCopies || 1); k++) deck.push(id); });
    return shuffle(deck);
  }

  function beginPlay() {
    const lvl = level();
    Object.assign(state, {
      scene: 'play',
      items: [],
      fx: [],
      basket: {},
      basketCount: 0,
      deck: buildDeck(lvl),
      spawnT: 0.8,
      peekT: 0,
      peeks: 0,
      banner: 1.8,
      timeLeft: lvl.timeLimit || null,
      closedByTime: false,
    });
    state.fig.x = BASKET_X;
    state.fig.vx = 0;
    state.fig.squash = 0;
  }

  function goCheckout(byTime) {
    state.result = evaluate();
    state.closedByTime = byTime;
    state.scene = 'checkout';
    state.revealT = byTime ? -1.2 : -0.4;
    state.revealedRows = 0;
    state.fanfarePlayed = false;
    canvas.style.cursor = 'default';
  }

  function startPeek() {
    if (state.peekT > 0) return;
    state.peekT = PEEK_DURATION;
    state.peeks += 1;
    Sound.peek();
  }

  // ---------------------------------------------------------------- evaluation
  function evaluate() {
    const lvl = level();
    const basket = state.basket;
    let points = 0;
    let maxPoints = 0;
    const rows = lvl.list.map(({ id, qty }) => {
      const got = basket[id] || 0;
      maxPoints += qty * POINTS_PER_ITEM;
      points += Math.min(got, qty) * POINTS_PER_ITEM;
      points -= Math.max(0, got - qty) * EXTRA_PENALTY;
      const status = got === qty ? 'ok' : got < qty ? 'missing' : 'extra';
      return { id, qty, got, status };
    });
    const wrong = Object.keys(basket)
      .filter((id) => !lvl.list.some((l) => l.id === id))
      .map((id) => ({ id, n: basket[id] }));
    wrong.forEach(({ n }) => { points -= n * WRONG_PENALTY; });
    points -= state.peeks * PEEK_COST;
    points = Math.max(0, points);
    const pct = points / maxPoints;
    const stars = pct >= 0.95 ? 3 : pct >= 0.7 ? 2 : pct >= 0.4 ? 1 : 0;
    return { rows, wrong, points, maxPoints, stars, cumulus: CUMULUS_BY_STARS[stars], peeks: state.peeks };
  }

  function resultLines() {
    const r = state.result;
    const lines = [];
    r.rows.forEach((row) => {
      const name = displayName(row.id);
      const right = row.status === 'ok' ? `${row.got}/${row.qty}` : row.status === 'missing' ? `${row.got}/${row.qty} fehlt` : `${row.got}/${row.qty} zu viel`;
      lines.push({ kind: 'item', id: row.id, icon: row.status === 'ok' ? 'richtig' : row.status === 'missing' ? 'fehlt' : 'falsch', label: `${row.qty}× ${name}`, right });
    });
    if (r.wrong.length) {
      lines.push({ kind: 'heading', label: 'Nicht auf dem Zettel' });
      const shown = r.wrong.slice(0, 5);
      shown.forEach((w) => lines.push({ kind: 'item', id: w.id, icon: 'falsch', label: `${w.n}× ${displayName(w.id)}`, right: `−${w.n * WRONG_PENALTY}` }));
      if (r.wrong.length > shown.length) {
        const rest = r.wrong.slice(shown.length).reduce((s, w) => s + w.n, 0);
        lines.push({ kind: 'note', label: `+ ${rest} weitere falsche Produkte` });
      }
    }
    if (r.peeks) lines.push({ kind: 'note', label: `Zettel ${r.peeks}× angeschaut`, right: `−${r.peeks * PEEK_COST}` });
    return lines;
  }

  function resultRowCount() {
    return state.result ? resultLines().length : 0;
  }

  // ---------------------------------------------------------------- update
  function updatePlay(dt) {
    const lvl = level();
    const fig = state.fig;

    fig.squash = Math.max(0, fig.squash - dt * 4);
    if (state.banner > 0) state.banner -= dt;

    updateFx(dt);

    if (state.peekT > 0) {
      state.peekT -= dt;
      return;
    }

    if (state.timeLeft !== null) {
      state.timeLeft -= dt;
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        goCheckout(true);
        return;
      }
    }

    state.spawnT -= dt;
    if (state.spawnT <= 0) {
      spawnItem(lvl);
      state.spawnT = rand(lvl.spawnEvery * 0.75, lvl.spawnEvery * 1.25);
    }

    for (let i = state.items.length - 1; i >= 0; i--) {
      const it = state.items[i];
      it.y += it.vy * dt;
      it.rot += it.vr * dt;

      if (it.y - it.size * 0.3 > FLOOR_Y) {
        state.fx.push({ type: 'splat', x: it.x, y: FLOOR_Y, t: 0, life: 0.5, color: PRODUCTS[it.id].color });
        Sound.drop();
        state.items.splice(i, 1);
      }
    }
  }

  function spawnItem(lvl) {
    if (!state.deck.length) state.deck = buildDeck(lvl);
    const id = state.deck.pop();
    let x = rand(110, W - 110);
    for (let tries = 0; tries < 4 && Math.abs(x - state.lastSpawnX) < 180; tries++) x = rand(110, W - 110);
    state.lastSpawnX = x;
    state.items.push({
      id,
      x,
      y: HUD_H - 120,
      vy: rand(lvl.speed[0], lvl.speed[1]),
      rot: rand(-0.3, 0.3),
      vr: rand(-0.9, 0.9),
      size: lvl.itemSize,
    });
  }

  function itemAt(p) {
    let best = null;
    let bestDist = Infinity;
    state.items.forEach((it) => {
      const d = Math.hypot(p.x - it.x, p.y - it.y);
      if (d < it.size * TAP_RADIUS && d < bestDist) { best = it; bestDist = d; }
    });
    return best;
  }

  function tapAt(p) {
    if (p.y < HUD_H) return;
    const it = itemAt(p);
    if (!it) {
      state.fx.push({ type: 'ripple', x: p.x, y: p.y, t: 0, life: 0.35 });
      return;
    }
    state.items.splice(state.items.indexOf(it), 1);
    state.basket[it.id] = (state.basket[it.id] || 0) + 1;
    state.basketCount += 1;
    Sound.pick();
    state.fx.push({ type: 'fly', id: it.id, x0: it.x, y0: it.y, size: it.size, rot: it.rot, t: 0, life: FLY_TIME, landed: false });
  }

  function landInBasket() {
    state.fig.squash = 1;
    Sound.catch();
    state.fx.push({ type: 'plus', x: BASKET_X, y: FIG_TOP - 30, t: 0, life: 0.8 });
    for (let k = 0; k < 9; k++) {
      const a = rand(-Math.PI, 0);
      const sp = rand(220, 480);
      state.fx.push({ type: 'spark', x: BASKET_X + rand(-60, 60), y: FIG_TOP + 30, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: 0, life: rand(0.35, 0.6), color: level().palette.accent });
    }
    state.fx.push({ type: 'hudpop', t: 0, life: 0.3 });
    if (IMG.fang_funke) state.fx.push({ type: 'funke', x: BASKET_X, y: FIG_TOP + 20, t: 0, life: 0.4 });
  }

  function updateFx(dt) {
    for (let i = state.fx.length - 1; i >= 0; i--) {
      const f = state.fx[i];
      f.t += dt;
      if (f.type === 'spark') {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += 1400 * dt;
      }
      if (f.type === 'fly' && f.t >= f.life && !f.landed) { f.landed = true; landInBasket(); }
      if (f.t >= f.life) state.fx.splice(i, 1);
    }
  }

  function updateCheckout(dt) {
    state.revealT += dt;
    const total = resultRowCount();
    const shouldShow = clamp(Math.floor(state.revealT / ROW_REVEAL), 0, total);
    if (shouldShow > state.revealedRows) {
      state.revealedRows = shouldShow;
      Sound.row();
    }
    if (state.revealedRows >= total && !state.fanfarePlayed && state.revealT > total * ROW_REVEAL + 0.3) {
      state.fanfarePlayed = true;
      Sound.fanfare(state.result.stars);
    }
  }

  // ---------------------------------------------------------------- drawing: products (placeholder shapes)
  const SHAPES = {
    carton(p) {
      ctx.beginPath();
      ctx.moveTo(-45, 88); ctx.lineTo(-45, -40); ctx.lineTo(-28, -82); ctx.lineTo(28, -82); ctx.lineTo(45, -40); ctx.lineTo(45, 88);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent; ctx.fillRect(-42, -10, 84, 34);
      ctx.beginPath(); ctx.moveTo(-45, -40); ctx.lineTo(45, -40); ctx.stroke();
    },
    bottle(p) {
      ctx.fillStyle = p.accent; roundRect(-16, -92, 32, 22, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-12, -70); ctx.lineTo(12, -70); ctx.lineTo(12, -50);
      ctx.quadraticCurveTo(40, -40, 40, -10); ctx.lineTo(40, 76); ctx.quadraticCurveTo(40, 88, 28, 88);
      ctx.lineTo(-28, 88); ctx.quadraticCurveTo(-40, 88, -40, 76); ctx.lineTo(-40, -10);
      ctx.quadraticCurveTo(-40, -40, -12, -50); ctx.closePath(); ctx.fill(); ctx.stroke();
    },
    jar(p) {
      ctx.fillStyle = p.accent; roundRect(-44, -48, 88, 24, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.color; roundRect(-50, -24, 100, 112, 18); ctx.fill(); ctx.stroke();
    },
    box(p) {
      roundRect(-62, -30, 124, 118, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent; ctx.fillRect(-59, -27, 118, 22);
    },
    boxtall(p) {
      roundRect(-44, -85, 88, 173, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent; ctx.fillRect(-41, -82, 82, 26);
    },
    loaf(p) {
      roundRect(-80, -20, 160, 108, 50); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = p.accent; ctx.lineWidth = 6;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 40 - 14, -6); ctx.lineTo(k * 40 + 14, 16); ctx.stroke(); }
      ctx.strokeStyle = INK;
    },
    pack(p) {
      ctx.fillStyle = p.accent;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.ellipse(k * 44, 4, 24, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = p.color; roundRect(-74, 18, 148, 70, 10); ctx.fill(); ctx.stroke();
    },
    round(p) {
      ctx.beginPath(); ctx.arc(0, 26, 62, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.ellipse(16, -42, 20, 9, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    },
    stick(p) {
      ctx.save(); ctx.rotate(-0.45);
      roundRect(-82, -6, 164, 56, 28); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent;
      ctx.beginPath(); ctx.arc(-82 + 14, 22, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(82 - 14, 22, 8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
    bag(p) {
      ctx.beginPath();
      ctx.moveTo(-56, -64);
      for (let k = 0; k <= 8; k++) ctx.lineTo(-56 + k * 14, k % 2 ? -76 : -64);
      ctx.lineTo(60, 80); ctx.lineTo(-60, 80); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(0, -10, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    },
    crescent(p) {
      ctx.beginPath();
      ctx.moveTo(-86, 50); ctx.quadraticCurveTo(0, -80, 86, 50); ctx.quadraticCurveTo(0, 0, -86, 50);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = p.accent; ctx.lineWidth = 5;
      for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(k * 32, -6); ctx.lineTo(k * 32 + (k * 6), 24); ctx.stroke(); }
      ctx.strokeStyle = INK;
    },
    flat(p) {
      roundRect(-82, 8, 164, 72, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent; ctx.fillRect(-79, 30, 158, 22);
    },
    can(p) {
      ctx.fillStyle = '#c9ced3';
      roundRect(-34, -84, 68, 16, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.color;
      roundRect(-40, -70, 80, 158, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.accent; ctx.fillRect(-37, -20, 74, 30);
    },
  };

  // Angezeigter Name: Marke/Linie + Produkt, z. B. «M-Budget Kochbutter»
  const displayName = (id) => {
    const p = PRODUCTS[id];
    return p.brand ? `${p.brand} ${p.name}` : p.name;
  };

  // Text, der in eine Breite passen muss: wird bis auf minScale verkleinert, danach mit «…» gekürzt
  function fitText(str, x, y, size, maxWidth, opts = {}) {
    const weight = opts.weight || 'bold';
    let s = size;
    const minSize = size * (opts.minScale || 0.62);
    ctx.font = `${weight} ${s}px ${FONT}`;
    while (ctx.measureText(str).width > maxWidth && s > minSize) {
      s -= 1;
      ctx.font = `${weight} ${s}px ${FONT}`;
    }
    let out = str;
    while (ctx.measureText(out).width > maxWidth && out.length > 2) out = `${out.slice(0, -2)}…`;
    text(out, x, y, s, opts);
  }

  function drawProduct(id, x, y, size, rot = 0, alpha = 1, withLabel = true) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha *= alpha;
    const img = IMG[`p_${id}`];
    if (img) {
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
      return;
    }
    const p = PRODUCTS[id];
    ctx.scale(size / 200, size / 200);
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.fillStyle = p.color;
    (SHAPES[p.shape] || SHAPES.box)(p);
    if (p.mark) {
      ctx.fillStyle = p.markColor || INK;
      ctx.beginPath(); ctx.arc(52, -52, 30, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
      text(p.mark, 52, -50, p.mark.length > 2 ? 22 : 30, { align: 'center', color: '#fff' });
    }
    if (withLabel) {
      // Etikett: Marke klein oben, Produkt darunter (nur Platzhalter, die Zeichnungen tragen das selbst)
      const hasBrand = !!p.brand;
      const top = hasBrand ? 22 : 40;
      const h = hasBrand ? 56 : 34;
      ctx.font = `bold 24px ${FONT}`;
      const nameW = ctx.measureText(p.name).width;
      ctx.font = `bold 18px ${FONT}`;
      const brandW = hasBrand ? ctx.measureText(p.brand).width : 0;
      const w = Math.min(Math.max(nameW, brandW) + 18, 196);
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      roundRect(-w / 2, top, w, h, 10); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
      if (hasBrand) fitText(p.brand, 0, top + 15, 18, w - 12, { align: 'center', color: '#555' });
      fitText(p.name, 0, top + h - 17, 24, w - 12, { align: 'center' });
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- drawing: backgrounds
  function drawBackground(lvl) {
    const img = IMG[`bg_${lvl.id}`];
    if (img) { ctx.drawImage(img, 0, 0, W, H); return; }
    const pal = lvl.palette;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, pal.sky[0]);
    g.addColorStop(1, pal.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // angedeutete Regale (ruhig, kontrastarm)
    ctx.fillStyle = pal.shelf;
    for (let row = 0; row < 6; row++) {
      const y = 330 + row * 230;
      ctx.fillRect(0, y, W, 18);
      for (let col = 0; col < 7; col++) {
        const w = 70 + ((row * 7 + col) * 37) % 60;
        const h = 60 + ((row * 5 + col) * 23) % 80;
        roundRect(40 + col * 150, y - h, w, h, 10);
        ctx.fill();
      }
    }
    ctx.fillStyle = pal.floor;
    ctx.fillRect(0, 1760, W, H - 1760);
    ctx.strokeStyle = pal.floorLine;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 1760); ctx.lineTo(W, 1760); ctx.stroke();
    for (let x = -200; x < W; x += 120) {
      ctx.beginPath(); ctx.moveTo(x + 160, 1760); ctx.lineTo(x, H); ctx.stroke();
    }
  }

  function drawTitleBackground() {
    if (IMG.start) { ctx.drawImage(IMG.start, 0, 0, W, H); return; }
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fff1d6');
    g.addColorStop(1, '#ffc98a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // fallende Produkte als Deko
    const ids = Object.keys(PRODUCTS);
    for (let k = 0; k < 18; k++) {
      const id = ids[(k * 7) % ids.length];
      const x = 90 + ((k * 263) % 920);
      const y = ((state.time * (60 + (k % 4) * 20) + k * 170) % (H + 240)) - 120;
      drawProduct(id, x, y, 120, Math.sin(state.time + k) * 0.4, 0.35, false);
    }
  }

  // ---------------------------------------------------------------- drawing: figure
  function drawFigure() {
    const fig = state.fig;
    const s = fig.squash;
    const tilt = clamp(fig.vx / 4000, -0.18, 0.18);
    ctx.save();
    ctx.translate(fig.x, FIG_BOTTOM);
    ctx.rotate(tilt);
    ctx.scale(1 + 0.1 * s, 1 - 0.12 * s);

    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(0, 0, 130, 16, 0, 0, Math.PI * 2); ctx.fill();

    let img = IMG.figur_normal;
    if (s > 0.3 && IMG.figur_fangen) img = IMG.figur_fangen;
    else if (fig.vx < -400 && IMG.figur_links) img = IMG.figur_links;
    else if (fig.vx > 400 && IMG.figur_rechts) img = IMG.figur_rechts;

    if (img) {
      ctx.drawImage(img, -FIG_W / 2, -FIG_H, FIG_W, FIG_H);
    } else {
      drawBasketPlaceholder(level().palette.accent);
    }
    ctx.restore();
  }

  function drawBasketPlaceholder(color) {
    ctx.lineWidth = 7;
    ctx.strokeStyle = INK;
    ctx.lineJoin = 'round';
    // Henkel
    ctx.beginPath(); ctx.arc(0, -150, 110, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    // Korb
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-150, -170); ctx.lineTo(150, -170); ctx.lineTo(118, -12); ctx.lineTo(-118, -12); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 5;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * 52, -160); ctx.lineTo(k * 42, -22); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-138, -110); ctx.lineTo(138, -110); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-128, -60); ctx.lineTo(128, -60); ctx.stroke();
    // Rand
    ctx.strokeStyle = INK;
    ctx.lineWidth = 7;
    ctx.fillStyle = '#fff';
    roundRect(-160, -186, 320, 26, 13); ctx.fill(); ctx.stroke();
  }

  // ---------------------------------------------------------------- drawing: shopping list
  function drawListCard(x, y, scale, lvl) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (IMG.liste) {
      ctx.drawImage(IMG.liste, 0, 0, 840, 1100);
    } else {
      ctx.save();
      ctx.rotate(-0.015);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      roundRect(14, 18, 840, 1100, 14); ctx.fill();
      ctx.fillStyle = '#fffdf6';
      roundRect(0, 0, 840, 1100, 14); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
      ctx.strokeStyle = '#d8e4f2'; ctx.lineWidth = 3;
      for (let k = 0; k < 11; k++) { ctx.beginPath(); ctx.moveTo(40, 250 + k * 80); ctx.lineTo(800, 250 + k * 80); ctx.stroke(); }
      ctx.strokeStyle = '#f2a3a3';
      ctx.beginPath(); ctx.moveTo(110, 30); ctx.lineTo(110, 1070); ctx.stroke();
      ctx.restore();
    }
    text('Einkaufszettel', 420, 95, 64, { align: 'center' });
    text(lvl.title + ' · ' + lvl.subtitle, 420, 160, 28, { align: 'center', weight: 'normal', color: '#555' });

    const rowH = Math.min(100, 720 / lvl.list.length);
    lvl.list.forEach((item, i) => {
      const ry = 260 + i * rowH + rowH / 2;
      drawProduct(item.id, 200, ry, rowH * 0.95, 0, 1, false);
      text(`${item.qty}×`, 290, ry, 46);
      fitText(displayName(item.id), 370, ry, 46, 430, { weight: 'normal' });
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------- drawing: scenes
  function drawTitle() {
    drawTitleBackground();
    if (IMG.titel) {
      ctx.drawImage(IMG.titel, 90, 420, 900, 400);
    } else {
      ctx.save();
      ctx.translate(W / 2, 600);
      ctx.rotate(-0.04);
      text('Ab in den', 0, -70, 96, { align: 'center' });
      text('Korb!', 0, 50, 170, { align: 'center', color: '#e2701b' });
      ctx.restore();
      text('Merk dir den Zettel. Fang deinen Einkauf.', W / 2, 860, 40, { align: 'center', weight: 'normal' });
    }

    LEVELS.forEach((lvl, i) => {
      button(`lvl${i}`, 200, 1010 + i * 190, 680, 150, `${i + 1} · ${lvl.title}`, () => showList(i), { color: lvl.palette.accent });
    });
    button('mute', W - 200, 60, 140, 70, Sound.muted ? 'Ton aus' : 'Ton an', () => { Sound.muted = !Sound.muted; }, { color: '#555', size: 26 });
  }

  function drawList() {
    const lvl = level();
    drawBackground(lvl);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, W, H);
    drawListCard(78, 190, 1.1, lvl);
    text('Präg dir den Zettel gut ein –', W / 2, 1490, 40, { align: 'center' });
    text('beim Einkaufen ist er weg!', W / 2, 1545, 40, { align: 'center' });
    button('zurueck', 60, 1640, 280, 140, 'Zurück', showTitle, { color: '#777', size: 42 });
    button('los', 380, 1640, 640, 140, 'Los geht’s!', beginPlay, { color: lvl.palette.accent, size: 54 });
  }

  function drawHud() {
    const lvl = level();
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(0, 0, W, HUD_H);
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, HUD_H); ctx.lineTo(W, HUD_H); ctx.stroke();

    // Korbzähler
    const pop = state.fx.find((f) => f.type === 'hudpop');
    const popScale = pop ? 1 + 0.25 * Math.sin((pop.t / pop.life) * Math.PI) : 1;
    ctx.save();
    ctx.translate(110, HUD_H / 2);
    ctx.scale(popScale, popScale);
    if (IMG.icon_korb) {
      ctx.drawImage(IMG.icon_korb, -48, -48, 96, 96);
    } else {
      ctx.scale(0.28, 0.28);
      ctx.translate(0, 120);
      drawBasketPlaceholder(lvl.palette.accent);
    }
    ctx.restore();
    text(String(state.basketCount), 175, HUD_H / 2 + 2, 56);

    if (state.timeLeft !== null) {
      const t = Math.ceil(state.timeLeft);
      const urgent = t <= 10;
      text(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, 420, HUD_H / 2 + 2, 50, { align: 'center', color: urgent ? '#c81e3a' : INK });
    }

    button('peek', 520, 28, 200, 84, 'Zettel', startPeek, { color: '#6b7a8f', size: 32, disabled: state.peekT > 0 });
    button('kasse', 740, 28, 290, 84, 'Zur Kasse', () => goCheckout(false), { color: lvl.palette.accent, size: 36 });
  }

  function drawPlay() {
    const lvl = level();
    drawBackground(lvl);

    state.fx.filter((f) => f.type === 'splat').forEach(drawFx);
    state.fx.filter((f) => f.type === 'fly').forEach(drawFx);
    drawFigure();
    state.items.forEach((it) => drawProduct(it.id, it.x, it.y, it.size, it.rot));
    state.fx.filter((f) => f.type === 'ripple').forEach(drawFx);
    if (IMG[`fg_${lvl.id}`]) ctx.drawImage(IMG[`fg_${lvl.id}`], 0, 0, W, H);
    state.fx.filter((f) => f.type === 'funke' || f.type === 'spark' || f.type === 'plus').forEach(drawFx);

    drawHud();

    if (state.banner > 0) {
      const a = clamp(state.banner / 0.4, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      roundRect(165, 780, 750, 240, 30); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke();
      text(`Level ${state.levelIndex + 1} · ${lvl.title}`, W / 2, 855, 56, { align: 'center' });
      text(state.banner > 0.9 ? 'Bereit …' : 'Los!', W / 2, 945, 62, { align: 'center', color: lvl.palette.accent });
      ctx.restore();
    }

    if (state.peekT > 0) {
      ctx.fillStyle = 'rgba(20,20,30,0.55)';
      ctx.fillRect(0, HUD_H, W, H - HUD_H);
      drawListCard(120, 300, 1.0, lvl);
      text(`Noch ${state.peekT.toFixed(1)} s  ·  −${PEEK_COST} Punkte`, W / 2, 1480, 44, { align: 'center', color: '#fff' });
    }
  }

  function drawFx(f) {
    const k = f.t / f.life;
    if (f.type === 'spark') {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, 10 * (1 - k) + 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (f.type === 'funke') {
      const s = 200 * (0.6 + 0.6 * k);
      ctx.globalAlpha = 1 - k;
      ctx.drawImage(IMG.fang_funke, f.x - s / 2, f.y - s / 2, s, s);
      ctx.globalAlpha = 1;
    } else if (f.type === 'plus') {
      text('+1', f.x, f.y - k * 90, 54, { align: 'center', color: INK });
    } else if (f.type === 'splat') {
      ctx.globalAlpha = 1 - k;
      if (IMG.aufprall) {
        ctx.drawImage(IMG.aufprall, f.x - 100, f.y - 100, 200, 120);
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(f.x, f.y, 70 * (0.5 + k), 14, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (f.type === 'fly') {
      const e = 1 - Math.pow(1 - k, 2);
      const x = f.x0 + (BASKET_X - f.x0) * e;
      const y = f.y0 + (BASKET_MOUTH_Y - f.y0) * e - Math.sin(Math.PI * k) * 160;
      drawProduct(f.id, x, y, f.size * (1 - 0.45 * k), f.rot * (1 - k));
    } else if (f.type === 'ripple') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(f.x, f.y, 20 + 50 * k, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawStatusIcon(kind, x, y) {
    const img = IMG[`icon_${kind}`];
    if (img) { ctx.drawImage(img, x - 24, y - 24, 48, 48); return; }
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 7; ctx.lineCap = 'round';
    if (kind === 'richtig') {
      ctx.strokeStyle = '#1f8a4c';
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-4, 12); ctx.lineTo(16, -14); ctx.stroke();
    } else if (kind === 'falsch') {
      ctx.strokeStyle = '#c81e3a';
      ctx.beginPath(); ctx.moveTo(-13, -13); ctx.lineTo(13, 13); ctx.moveTo(13, -13); ctx.lineTo(-13, 13); ctx.stroke();
    } else {
      ctx.strokeStyle = '#d97706';
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(0, 4); ctx.stroke();
      ctx.fillStyle = '#d97706'; ctx.beginPath(); ctx.arc(0, 15, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Kassenbon: Länge wächst mit dem Inhalt, Schrift skaliert nur, wenn es eng wird.
  const RECEIPT = { x: 90, w: 900, top: 40, bottom: 1580, head: 190, summary: 300, foot: 50 };
  const LINE_H = { item: 82, heading: 74, note: 64 };

  function receiptLayout(lines) {
    const natural = lines.reduce((sum, ln) => sum + LINE_H[ln.kind], 0);
    const maxLines = RECEIPT.bottom - RECEIPT.top - RECEIPT.head - RECEIPT.summary - RECEIPT.foot;
    const f = clamp(maxLines / natural, 0.7, 1);
    const h = RECEIPT.head + natural * f + RECEIPT.summary + RECEIPT.foot;
    const y = Math.max(RECEIPT.top, RECEIPT.bottom - h);
    return { f, h, y };
  }

  function drawReceiptPaper(h) {
    const { w } = RECEIPT;
    const img = IMG.kassenbon;
    if (img) {
      // 3-teilig: Kopf und Abrisskante bleiben unverzerrt, die Mitte wird gestreckt
      const sTop = img.naturalHeight * (200 / 1200);
      const sBot = img.naturalHeight * (100 / 1200);
      const dTop = w * (sTop / img.naturalWidth);
      const dBot = w * (sBot / img.naturalWidth);
      ctx.drawImage(img, 0, 0, img.naturalWidth, sTop, 0, 0, w, dTop);
      ctx.drawImage(img, 0, sTop, img.naturalWidth, img.naturalHeight - sTop - sBot, 0, dTop, w, h - dTop - dBot);
      ctx.drawImage(img, 0, img.naturalHeight - sBot, img.naturalWidth, sBot, 0, h - dBot, w, dBot);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(16, 16, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h - 24);
    const teeth = 30;
    const step = w / teeth;
    for (let k = 1; k <= teeth; k++) ctx.lineTo(w - k * step + step / 2, h), ctx.lineTo(w - k * step, h - 24);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  }

  function drawReceipt() {
    const lvl = level();
    const r = state.result;
    const lines = resultLines();
    const { f, h, y: baseY } = receiptLayout(lines);
    const slide = easeOutBack(clamp((state.revealT + 1.2) / 0.8, 0, 1));
    const { w } = RECEIPT;
    const L = 70;
    const R = w - 70;

    ctx.save();
    ctx.translate(RECEIPT.x, baseY + (1 - slide) * 1700);
    drawReceiptPaper(h);

    text('KASSE', w / 2, 80, 70, { align: 'center' });
    text(`${lvl.title}${state.closedByTime ? ' · Ladenschluss!' : ''}`, w / 2, 140, 36, { align: 'center', weight: 'normal', color: '#555' });
    ctx.setLineDash([12, 10]); ctx.lineWidth = 3; ctx.strokeStyle = '#999';
    ctx.beginPath(); ctx.moveTo(L, RECEIPT.head - 10); ctx.lineTo(R, RECEIPT.head - 10); ctx.stroke();
    ctx.setLineDash([]);

    let y = RECEIPT.head;
    lines.slice(0, state.revealedRows).forEach((ln) => {
      const lh = LINE_H[ln.kind] * f;
      const cy = y + lh / 2;
      if (ln.kind === 'heading') {
        text(ln.label, L, cy + 6 * f, 38 * f, { color: '#c81e3a' });
      } else if (ln.kind === 'note') {
        text(ln.label, L, cy, 34 * f, { weight: 'normal', color: '#555' });
        if (ln.right) text(ln.right, R, cy, 38 * f, { align: 'right', color: '#c81e3a' });
      } else {
        ctx.save();
        ctx.translate(L + 22, cy);
        ctx.scale(1.4 * f, 1.4 * f);
        drawStatusIcon(ln.icon, 0, 0);
        ctx.restore();
        drawProduct(ln.id, L + 100 * f, cy, 68 * f, 0, 1, false);
        ctx.font = `bold ${38 * f}px ${FONT}`;
        const rightW = ctx.measureText(ln.right).width;
        fitText(ln.label, L + 150 * f, cy, 42 * f, R - rightW - 24 - (L + 150 * f), { weight: 'normal' });
        text(ln.right, R, cy, 38 * f, { align: 'right', color: ln.icon === 'richtig' ? '#1f8a4c' : ln.icon === 'fehlt' ? '#b45309' : '#c81e3a' });
      }
      y += lh;
    });

    const done = state.revealedRows >= lines.length && state.revealT > lines.length * ROW_REVEAL + 0.2;
    if (done) {
      const sy = RECEIPT.head + lines.reduce((sum, ln) => sum + LINE_H[ln.kind] * f, 0) + 10;
      ctx.setLineDash([12, 10]); ctx.strokeStyle = '#999'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(L, sy); ctx.lineTo(R, sy); ctx.stroke();
      ctx.setLineDash([]);
      text('Punkte', L, sy + 60, 48);
      text(`${r.points} / ${r.maxPoints}`, R, sy + 60, 48, { align: 'right' });
      for (let k = 0; k < 3; k++) drawStar(w / 2 - 110 + k * 110, sy + 155, 46, k < r.stars, lvl.palette.accent);
      if (IMG.icon_cumulus) ctx.drawImage(IMG.icon_cumulus, L, sy + 220, 64, 64);
      text(`+${r.cumulus} Cumulus-Punkte`, w / 2, sy + 252, 46, { align: 'center', color: r.cumulus ? '#1f8a4c' : '#777' });
    }
    ctx.setLineDash([]);
    ctx.restore();
    return done;
  }

  function drawStar(cx, cy, r, filled, color) {
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      const rr = k % 2 ? r * 0.45 : r;
      ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = filled ? color : '#e5e5e5';
    ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  }

  function drawCheckout() {
    const lvl = level();
    drawBackground(lvl);
    ctx.fillStyle = 'rgba(30,30,40,0.45)';
    ctx.fillRect(0, 0, W, H);
    const done = drawReceipt();
    if (!done) {
      text('Tippen zum Überspringen', W / 2, 1760, 36, { align: 'center', color: 'rgba(255,255,255,0.8)', weight: 'normal' });
      return;
    }
    const r = state.result;
    const msg = ['Bei so viel Auswahl kann man sich vertun!', 'Da ging einiges durcheinander.', 'Fast alles erwischt!', 'Perfekter Einkauf!'][r.stars];
    text(msg, W / 2, 1640, 44, { align: 'center', color: '#fff' });
    const last = state.levelIndex >= LEVELS.length - 1;
    button('nochmal', 60, 1710, 440, 140, 'Nochmal', () => showList(state.levelIndex), { color: '#6b7a8f', size: 46 });
    button('weiter', 540, 1710, 480, 140, last ? 'Zum Start' : 'Nächstes Level', () => (last ? showTitle() : showList(state.levelIndex + 1)), { color: lvl.palette.accent, size: 46 });
  }

  function drawLoading(progress) {
    ctx.fillStyle = '#f3efe6';
    ctx.fillRect(0, 0, W, H);
    text('Lade …', W / 2, H / 2 - 40, 48, { align: 'center' });
    ctx.fillStyle = '#ddd'; roundRect(290, H / 2 + 10, 500, 24, 12); ctx.fill();
    ctx.fillStyle = '#e2701b'; roundRect(290, H / 2 + 10, 500 * progress, 24, 12); ctx.fill();
  }

  // ---------------------------------------------------------------- main loop
  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    requestAnimationFrame(frame);
  }

  function step(dt) {
    state.time += dt;
    buttons = [];

    if (state.scene === 'play') updatePlay(dt);
    if (state.scene === 'checkout') updateCheckout(dt);

    ctx.clearRect(0, 0, W, H);
    if (state.scene === 'title') drawTitle();
    else if (state.scene === 'list') drawList();
    else if (state.scene === 'play') drawPlay();
    else if (state.scene === 'checkout') drawCheckout();
  }

  // Test-Zugang: index.html?debug
  if (new URLSearchParams(location.search).has('debug')) {
    window.__korb = { state, step, beginPlay, goCheckout, showList, drawProduct, ctx };
  }

  // Online liegt neben den Grafiken eine Liste der vorhandenen Dateien (assets/manifest.json).
  // So fragt das Spiel nur an, was es wirklich gibt. Ohne Liste (z. B. lokal per Doppelklick) wird alles probiert.
  async function existingAssets() {
    try {
      const res = await fetch('assets/manifest.json', { cache: 'no-cache' });
      if (!res.ok) return null;
      return new Set(await res.json());
    } catch (e) {
      return null;
    }
  }

  async function boot() {
    const existing = await existingAssets();
    const list = assetList().filter(([, src]) => !existing || existing.has(src));
    let loaded = 0;
    drawLoading(0);
    await Promise.all(list.map(([key, src]) => loadImage(key, src).then(() => { loaded += 1; drawLoading(loaded / list.length); })));
    showTitle();
    requestAnimationFrame(frame);
  }

  boot();
})();
