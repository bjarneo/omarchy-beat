// Omarchy visual effects: the wordmark pixel field (omarchy.org hero) and
// ttfx terminal text effects (the omarchy.org screensaver engine).
import initTTFX, { Session, effect_catalog } from './assets/js/wte/ttfx.js';

const WASM = new URL('./assets/js/wte/ttfx.wasm', import.meta.url);
let ready = null;
export function loadFX() {
  if (!ready) {
    ready = initTTFX({ module_or_path: WASM })
      .then(() => JSON.parse(effect_catalog()).map((e) => e.name))
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

export const WIN_FX = ['beams', 'decrypt', 'rings', 'synthgrid', 'spotlights', 'waves', 'expand', 'middleout', 'laseretch', 'highlight', 'colorshift', 'vhstape', 'sweep', 'binarypath', 'swarm', 'matrix'];
export const BIG_FX = ['fireworks'];
export const FAIL_FX = ['crumble', 'burn', 'blackhole', 'smoke', 'unstable', 'thunderstorm', 'rain', 'pour'];
export const POP_FX = ['slice', 'middleout', 'expand', 'highlight', 'sweep', 'wipe', 'beams', 'decrypt'];

export const WORDMARK = [
  '                 ▄▄▄',
  ' ▄█████▄    ▄███████████▄    ▄███████   ▄███████   ▄███████   ▄█   █▄    ▄█   █▄',
  '███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███',
  '███   ███  ███   ███   ███  ███   ███  ███   ███  ███   █▀   ███   ███  ███   ███',
  '███   ███  ███   ███   ███ ▄███▄▄▄███ ▄███▄▄▄██▀  ███       ▄███▄▄▄███▄ ███▄▄▄███',
  '███   ███  ███   ███   ███ ▀███▀▀▀███ ▀███▀▀▀▀    ███      ▀▀███▀▀▀███  ▀▀▀▀▀▀███',
  '███   ███  ███   ███   ███  ███   ███ ██████████  ███   █▄   ███   ███  ▄██   ███',
  '███   ███  ███   ███   ███  ███   ███  ███   ███  ███   ███  ███   ███  ███   ███',
  ' ▀█████▀    ▀█   ███   █▀   ███   █▀   ███   ███  ███████▀   ███   █▀    ▀█████▀',
  '                                       ███   █▀',
].join('\n');

export const BITMAP = [
  '000000000000000001110000000000000000000000000000000000000000000000000000000000000',
  '001111100000011111111111000000111111100001111111000011111110000100010000001000100',
  '011111110000111111111111100001111111100011111111000111111110001100011000011000110',
  '111000111001110001110001110011100011100111000111001110001110011100011100111000111',
  '111000111001110001110001110011100011100111000111001110001110011100011100111000111',
  '111000111001110001110001110011100011100111000111001110001100011100011100111000111',
  '111000111001110001110001110011100011100111000111001110001000011100011100111000111',
  '111000111001110001110001110011100011100111000111001110000000011100011100111000111',
  '111000111001110001110001110111111111101111111110001110000000111111111110111111111',
  '111000111001110001110001110111111111101111111100001110000001111111111100111111111',
  '111000111001110001110001110011100011100111000000001110000000011100011100000000111',
  '111000111001110001110001110011100011101111111111001110001000011100011100011000111',
  '111000111001110001110001110011100011101111111111001110001100011100011100111000111',
  '111000111001110001110001110011100011100111000111001110001110011100011100111000111',
  '111000111001110001110001110011100011100111000111001110001110011100011100111000111',
  '011111110000110001110001100011100011000111000111001111111100011100011000011111110',
  '001111100000010001110001000011100010000111000111001111111000011100010000001111100',
  '000000000000000000000000000000000000000111000110000000000000000000000000000000000',
  '000000000000000000000000000000000000000111000100000000000000000000000000000000000',
];

const GLYPHS = {
  A: '111 101 111 101 101', B: '110 101 110 101 110', C: '111 100 100 100 111', D: '110 101 101 101 110',
  E: '111 100 111 100 111', F: '111 100 111 100 100', G: '111 100 101 101 111', H: '101 101 111 101 101',
  I: '111 010 010 010 111', J: '001 001 001 101 111', K: '101 101 110 101 101', L: '100 100 100 100 111',
  M: '101 111 111 101 101', N: '110 101 101 101 101', O: '111 101 101 101 111', P: '111 101 111 100 100',
  Q: '111 101 101 111 001', R: '111 101 110 101 101', S: '111 100 111 001 111', T: '111 010 010 010 010',
  U: '101 101 101 101 111', V: '101 101 101 101 010', W: '101 101 111 111 101', X: '101 101 010 101 101',
  Y: '101 101 010 010 010', Z: '111 001 010 100 111',
  0: '111 101 101 101 111', 1: '010 110 010 010 111', 2: '111 001 111 100 111', 3: '111 001 111 001 111',
  4: '101 101 111 001 001', 5: '111 100 111 001 111', 6: '111 100 111 101 111', 7: '111 001 001 001 001',
  8: '111 101 111 101 111', 9: '111 101 111 001 111',
  '.': '000 000 000 000 010', '/': '001 001 010 100 100', '!': '010 010 010 000 010', '%': '101 001 010 100 101',
  ':': '000 010 000 010 000', '-': '000 000 111 000 000', '?': '111 001 011 000 010', ',': '000 000 000 010 100',
};

/** 5 rows of '0'/'1' for a string in the omarchy.org 3x5 pixel font. */
export function glyphRows(str) {
  const rows = ['', '', '', '', ''];
  const chars = String(str).toUpperCase().split('');
  chars.forEach((ch, i) => {
    if (ch === ' ') { for (let r = 0; r < 5; r++) rows[r] += '00'; }
    else {
      const g = (GLYPHS[ch] || GLYPHS['?']).split(' ');
      for (let r = 0; r < 5; r++) rows[r] += g[r];
    }
    if (i < chars.length - 1) for (let r = 0; r < 5; r++) rows[r] += '0';
  });
  return rows;
}

/** Pixel-font text as block characters, two cells per pixel so pixels stay square. */
export function pixelText(str) {
  return glyphRows(str).map((r) => r.replace(/1/g, '██').replace(/0/g, '  ')).join('\n');
}

const fmtNum = (n) => Math.round(n).toLocaleString('en-US');
function center(s, w = 81) {
  const chars = [...s];
  if (chars.length > w) s = chars.slice(0, w - 1).join('') + '…';
  const pad = Math.max(0, Math.floor((w - [...s].length) / 2));
  return ' '.repeat(pad) + s;
}

/** The results screen as terminal text: the wordmark plus the run's numbers. */
export function resultsText(r) {
  const head = r.failed
    ? `BATTERY DEPLETED  ·  ${Math.round((r.progress || 0) * 100)}% OF THE TRACK`
    : `${r.fc ? 'FULL COMBO' : 'TRACK CLEARED'}  ·  RANK ${r.rank}`;
  return [
    WORDMARK, '',
    center(head), '',
    center(`${r.title} — ${r.artist}`),
    center(`${r.world} · ${r.diff}`), '',
    center(`SCORE ${fmtNum(r.score)}   ·   MAX COMBO ${r.maxCombo}   ·   CUT ${r.hits}/${r.total}`),
  ].join('\n');
}

const FRAME = 1000 / 120;

/**
 * Run ttfx effects on a canvas. Colors are remapped by luminance onto the
 * theme's field ramp (dim → crest), the same bands omarchy.org draws its
 * hero with, so every effect wears the current theme.
 */
export function runFX(canvas, o) {
  const ctx = canvas.getContext('2d');
  const art = o.text;
  const lines = art.split('\n');
  let aC = 1;
  for (const l of lines) aC = Math.max(aC, [...l].length);
  const aR = lines.length;
  let session = null, m = null, FW = 0, FH = 0;
  let sym = new Uint32Array(0), fg = new Uint32Array(0), bgA = new Uint32Array(0), fl = new Uint8Array(0);
  let acc = 0, finished = false, hold = 0, raf = 0, last = 0, stopped = false, current = '', ro = null;
  const effects = o.effects && o.effects.length ? o.effects : ['decrypt'];
  const counts = new Map();
  let lastPick = null;
  const pick = () => {
    const pool = effects.length > 1 ? effects.filter((n) => n !== lastPick) : effects;
    let tot = 0;
    const ws = pool.map((n) => { const w = 1 / ((counts.get(n) || 0) + 1); tot += w; return w; });
    let r = Math.random() * tot, ch = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) { ch = pool[i]; break; } }
    counts.set(ch, (counts.get(ch) || 0) + 1);
    lastPick = ch;
    return ch;
  };
  const cache = new Map();
  const ramp = o.ramp;
  const color = (p) => {
    const rgb = p & 0xffffff;
    let c = cache.get(rgb);
    if (c) return c;
    if (ramp && ramp.length) {
      const r = (rgb >> 16) & 255, g = (rgb >> 8) & 255, b = rgb & 255;
      const l = rgb === 0 ? 1 : (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      c = ramp[Math.min(ramp.length - 1, Math.floor(Math.pow(l, 0.75) * ramp.length))];
    } else c = '#' + rgb.toString(16).padStart(6, '0');
    cache.set(rgb, c);
    return c;
  };
  const layout = () => {
    let W, H, dpr = 1;
    if (o.fixed) { W = canvas.width; H = canvas.height; }
    else {
      W = Math.max(1, canvas.clientWidth); H = Math.max(1, canvas.clientHeight);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cw = Math.max(2, Math.min(o.maxCell || 12, Math.floor((W * (o.fit || 0.86)) / aC), Math.floor((H * (o.fitH || 0.8)) / (aR * 2))));
    const ch = cw * 2;
    m = { cw, ch, fs: Math.max(6, Math.round(ch / 1.25)), cols: Math.max(aC, Math.floor(W / cw)), rows: Math.max(aR, Math.floor(H / ch)), W, H };
  };
  const capture = () => {
    if (!session) return;
    FW = session.width(); FH = session.height();
    const n = FW * FH;
    if (sym.length < n) { sym = new Uint32Array(n); fg = new Uint32Array(n); bgA = new Uint32Array(n); fl = new Uint8Array(n); }
    session.fill(sym, fg, bgA, fl);
  };
  const start = (name) => {
    try { session?.free(); } catch {}
    current = name;
    session = new Session(art, name, m.cols, m.rows, undefined, 120);
    finished = false;
    if (session.step()) capture();
  };
  const paint = () => {
    const { cw, ch, fs, W, H } = m;
    if (o.bg) { ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H); } else ctx.clearRect(0, 0, W, H);
    const ox = Math.floor((W - FW * cw) / 2), oy = Math.floor((H - FH * ch) / 2);
    ctx.font = `500 ${fs}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let lastC = '';
    for (let i = 0, n = FW * FH; i < n; i++) {
      const cp = sym[i];
      if (cp === 32 || cp === 0 || (fl[i] & 32)) continue;
      const x = ox + (i % FW) * cw, y = oy + ((i / FW) | 0) * ch;
      const c = color(fg[i]);
      if (c !== lastC) { ctx.fillStyle = c; lastC = c; }
      if (cp === 0x2588) ctx.fillRect(x, y, cw + 0.5, ch + 0.5);
      else if (cp === 0x2580) ctx.fillRect(x, y, cw + 0.5, ch / 2 + 0.5);
      else if (cp === 0x2584) ctx.fillRect(x, y + ch / 2, cw + 0.5, ch / 2 + 0.5);
      else if (cp >= 0x2581 && cp <= 0x2587) { const h = ((cp - 0x2580) / 8) * ch; ctx.fillRect(x, y + ch - h, cw + 0.5, h); }
      else if (cp >= 0x2589 && cp <= 0x258f) ctx.fillRect(x, y, ((0x2590 - cp) / 8) * cw, ch);
      else if (cp === 0x2590) ctx.fillRect(x + cw / 2, y, cw / 2, ch);
      else if (cp >= 0x2591 && cp <= 0x2593) { ctx.globalAlpha = (cp - 0x2590) * 0.25; ctx.fillRect(x, y, cw, ch); ctx.globalAlpha = 1; }
      else ctx.fillText(String.fromCodePoint(cp), x + cw / 2, y + ch / 2);
    }
  };
  const step = (ms) => {
    if (stopped || !session) return;
    acc = Math.min(FRAME * 10, acc + ms * (o.speed || 1));
    let changed = false;
    while (acc >= FRAME && !finished) {
      acc -= FRAME;
      if (!session.step()) { finished = true; hold = o.hold ?? 2600; o.onDone?.(); }
      changed = true;
    }
    if (finished) {
      acc = 0;
      if (o.loop) { hold -= ms; if (hold <= 0) { start(pick()); changed = true; } }
    }
    if (changed) { capture(); paint(); }
  };
  const ctl = {
    tick: step,
    get effect() { return current; },
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      try { session?.free(); } catch {}
      session = null;
    },
  };
  layout();
  start(pick());
  paint();
  if (!o.fixed) {
    ro = new ResizeObserver(() => {
      if (stopped) return;
      if (m && canvas.clientWidth === m.W && canvas.clientHeight === m.H) return;
      layout(); start(current); paint();
    });
    ro.observe(canvas);
  }
  if (!o.manual) {
    last = performance.now();
    const loop = (now) => { if (stopped) return; step(now - last); last = now; raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
  }
  return ctl;
}

/**
 * The omarchy.org hero: the wordmark bitmap drawn on a lattice of pixels,
 * lit in the theme's field bands, with a sweep and a cursor glow.
 */
export class PixelField {
  constructor(canvas, label = '') {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.colors = null;
    const PX = 4, PY = 3, GAP = 3;
    const lab = label ? glyphRows(label) : null;
    this.cols = 81 + PX * 2;
    this.rows = PY + 19 + (lab ? GAP + 5 : 0) + PY;
    this.map = new Uint8Array(this.cols * this.rows);
    BITMAP.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === '1') this.map[(PY + r) * this.cols + PX + c] = 1; });
    if (lab) lab.forEach((row, r) => { for (let c = 0; c < row.length && PX + c < this.cols; c++) if (row[c] === '1') this.map[(PY + 19 + GAP + r) * this.cols + PX + c] = 2; });
    this.seed = new Float32Array(this.cols * this.rows).map(() => Math.random());
    this.mx = -999; this.my = -999;
    this.onMove = (e) => {
      const r = this.c.getBoundingClientRect();
      if (!r.width) return;
      this.mx = ((e.clientX - r.left) / r.width) * this.cols;
      this.my = ((e.clientY - r.top) / r.height) * this.rows;
    };
    window.addEventListener('pointermove', this.onMove);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    const loop = (t) => { this.draw(t); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  }
  setColors(c) { this.colors = c; }
  resize() {
    const w = this.c.clientWidth || 1;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cell = w / this.cols;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(this.cell * this.rows * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  draw(t = performance.now()) {
    const C = this.colors;
    if (!C) return;
    const { ctx } = this, cs = this.cell, W = this.cols, H = this.rows;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W * cs, H * cs);
    const time = t / 1000;
    const sweep = (((time * 0.2) % 1.7) - 0.35) * (W + H * 1.6);
    const g = cs >= 4 ? 1 : 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, m = this.map[i];
        const dx = x - this.mx, dy = y - this.my;
        const d = Math.sqrt(dx * dx + dy * dy);
        const near = d < 7 ? 1 - d / 7 : 0;
        const sw = Math.exp(-Math.pow((x + y * 1.6 - sweep) / 4, 2));
        let col, a = 1;
        if (m === 1) {
          const e = Math.max(near, sw * 0.9);
          col = e > 0.55 ? C.ramp[4] : e > 0.2 ? C.ramp[3] : C.ramp[2];
        } else if (m === 2) {
          col = near > 0.35 ? C.ramp[4] : C.ramp[3];
        } else {
          const tw = 0.5 + 0.5 * Math.sin(time * 1.4 + this.seed[i] * 60);
          const e = Math.max(near * 0.9, tw > 0.985 ? 0.4 : 0, sw * 0.25);
          if (e > 0.5) col = C.ramp[1];
          else { col = C.ramp[0]; a = 0.28 + e * 1.2; }
        }
        ctx.globalAlpha = a;
        ctx.fillStyle = col;
        ctx.fillRect(x * cs + g / 2, y * cs + g / 2, cs - g, cs - g);
      }
    }
    ctx.globalAlpha = 1;
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onMove);
    this.ro.disconnect();
  }
}
