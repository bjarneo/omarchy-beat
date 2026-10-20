// Claw rhythm engine: three.js + WebXR. Beatmaps are generated from the audio itself.
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
import { loadFX, runFX, pixelText, glyphRows, resultsText, BITMAP, WIN_FX, BIG_FX, FAIL_FX, POP_FX } from './omarchy-fx.js';

const HITZ = -0.9, LANES = [-0.9, -0.3, 0.3, 0.9], ROWG = 0.55, NOTE = 0.42, HB = 0.27, SPAWN = 24;
const SPEED = { easy: 9, normal: 11, hard: 13 };
const DIFF_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
const MULT = [1, 2, 4, 8], NEED = [2, 4, 8];
const COMBO_POPS = [25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];
const HANDS = ['L', 'R'], KS = 6, TRAIL = 18, SPARKS = 640;
const MARK = { y: 15, z: -30 };
const WHITE = new THREE.Color(1, 1, 1);
const LOGO = 'm1200 1200h-480v-80h400v-1040h-479.996v160h-400v720h720v-720h-80v-80h159.996v880h-400v160h-640v-1200h1200zm-1120-80h480v-80h-400l.004-400h-80.004zm0-560h80.004v-400h400v-80h-480.004z';
const FIELD = { r: 100, y: 20, h: 140, cell: 1.75 };
const TRACK_URLS = (f) => [`https://radio.omarchy.org/tracks/${f}`, `https://raw.githubusercontent.com/omacom/radio.omarchy.org/main/public/tracks/${f}`];
const FONT = '"JetBrains Mono", ui-monospace, monospace';
const DOME_VS = 'varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const DOME_FS = 'uniform vec3 top;uniform vec3 bottom;varying vec3 vDir;void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(-0.45,0.55,vDir.y)),1.0);\n#include <colorspace_fragment>\n}';
// The omarchy.org hero field, wrapped round the player: square pixels in the theme's field bands,
// mostly dim, with rare twinkles and one slow diagonal sweep
const FIELD_VS = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
const FIELD_FS = [
  'uniform vec3 f0;uniform vec3 f1;uniform vec3 f2;uniform float time;uniform float dim;uniform float pulse;uniform vec2 cells;varying vec2 vUv;',
  'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'void main(){',
  '  vec2 g=vUv*cells; vec2 id=floor(g); vec2 q=fract(g);',
  '  float tw=0.5+0.5*sin(time*1.4+hash(id)*60.0);',
  '  float sweep=(mod(time*0.045,1.7)-0.35)*(cells.x+cells.y*1.6);',
  '  float sw=exp(-pow((id.x+(cells.y-id.y)*1.6-sweep)/4.0,2.0));',
  '  float e=max(tw>0.9975?0.55:0.0,sw*0.3)+pulse*0.06;',
  '  vec3 cell=e>0.5?f2:mix(f0,f1,clamp(0.28+e*1.2,0.0,1.0));',
  '  float inside=step(0.13,q.x)*step(q.x,0.87)*step(0.13,q.y)*step(q.y,0.87);',
  '  float fade=smoothstep(0.08,0.3,vUv.y)*(1.0-smoothstep(0.62,0.9,vUv.y));',
  '  gl_FragColor=vec4(mix(f0,cell,inside*fade*dim),1.0);',
  '#include <colorspace_fragment>',
  '}',
].join('\n');

// [rotation.z, cut x, cut y]; arrow textures point down at rotation 0
const DIRS = [[0, 0, -1], [Math.PI, 0, 1], [-Math.PI / 2, -1, 0], [Math.PI / 2, 1, 0], [-Math.PI / 4, -0.7071, -0.7071], [Math.PI / 4, 0.7071, -0.7071], [-3 * Math.PI / 4, -0.7071, 0.7071], [3 * Math.PI / 4, 0.7071, 0.7071], [0, 0, 0]];

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const rng = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const quantile = (arr, q) => { if (!arr.length) return 0; const a = Float32Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))))]; };
const fmtTime = (t) => { t = Math.max(0, t || 0); return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; };
const lum = (hex) => { const c = new THREE.Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };

/* ------------------------------------------------------------ beat analysis */

function analyze(buffer) {
  const sr = buffer.sampleRate, hop = Math.round(sr / 100), fps = sr / hop;
  const A = buffer.getChannelData(0), B = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : A;
  const N = Math.floor(buffer.length / hop);
  const lo = new Float32Array(N), hi = new Float32Array(N), rms = new Float32Array(N);
  const a = 1 - Math.exp((-2 * Math.PI * 160) / sr);
  let lp = 0, px = 0, idx = 0;
  for (let f = 0; f < N; f++) {
    let el = 0, eh = 0, ef = 0;
    for (let i = 0; i < hop; i++, idx++) {
      const x = (A[idx] + B[idx]) * 0.5;
      lp += a * (x - lp);
      const d = x - px; px = x;
      el += lp * lp; eh += d * d; ef += x * x;
    }
    lo[f] = Math.log(1e-8 + el); hi[f] = Math.log(1e-8 + eh); rms[f] = Math.sqrt(ef / hop);
  }
  const r90 = quantile(rms, 0.9) || 1e-3;
  const nov = new Float32Array(N);
  for (let f = 1; f < N; f++) {
    const g = clamp(rms[f] / (0.3 * r90), 0, 1);
    nov[f] = g * (Math.max(0, lo[f] - lo[f - 1]) + 0.7 * Math.max(0, hi[f] - hi[f - 1]));
  }
  const W = 20, cs = new Float64Array(N + 1);
  for (let f = 0; f < N; f++) cs[f + 1] = cs[f] + nov[f];
  const ns = new Float32Array(N);
  for (let f = 0; f < N; f++) { const a0 = Math.max(0, f - W), b0 = Math.min(N, f + W + 1); ns[f] = Math.max(0, nov[f] - (cs[b0] - cs[a0]) / (b0 - a0)); }
  const n98 = quantile(ns, 0.98) || 1;
  for (let f = 0; f < N; f++) ns[f] = Math.min(1.5, ns[f] / n98);
  const sm = new Float32Array(N);
  for (let f = 1; f < N - 1; f++) sm[f] = ns[f] + 0.5 * (ns[f - 1] + ns[f + 1]);

  // tempo by autocorrelation, weighted toward ~122 BPM
  const minL = Math.floor((fps * 60) / 190), maxL = Math.ceil((fps * 60) / 72);
  let bestL = minL, bestS = -1;
  for (let L = minL; L <= maxL; L++) {
    let s = 0;
    for (let i = 0; i + L < N; i++) s += sm[i] * sm[i + L];
    s *= Math.exp(-0.5 * Math.pow(Math.log2((60 * fps) / L / 122) / 0.7, 2));
    if (s > bestS) { bestS = s; bestL = L; }
  }
  const comb = (p, ph) => { let s = 0; for (let x = ph; x < N - 1; x += p) s += sm[Math.round(x)]; return s; };
  let bp = bestL, bph = 0, bs = -1;
  for (let p = bestL - 1.2; p <= bestL + 1.2; p += 0.02) for (let ph = 0; ph < p; ph += 1) { const s = comb(p, ph); if (s > bs) { bs = s; bp = p; bph = ph; } }
  for (let p = bp - 0.03; p <= bp + 0.03; p += 0.002) for (let ph = Math.max(0, bph - 1); ph <= bph + 1; ph += 0.1) { const s = comb(p, ph); if (s > bs) { bs = s; bp = p; bph = ph; } }

  const grid = [];
  for (let x = bph, k = 0; x < N - 2; x += bp, k++) grid.push({ c: x, k });
  const off = grid.map((b) => { const c = Math.round(b.c); let bj = 0, bv = 0; for (let j = -4; j <= 4; j++) { const v = sm[c + j] || 0; if (v > bv) { bv = v; bj = j; } } return bv > 0.3 ? bj : NaN; });
  const smo = off.map((_, i) => { const w = []; for (let j = i - 6; j <= i + 6; j++) if (j >= 0 && j < off.length && !isNaN(off[j])) w.push(off[j]); if (w.length < 4) return 0; w.sort((x, y) => x - y); return w[w.length >> 1]; });
  const strength = (x) => { const c = Math.round(x); let m = 0; for (let j = -2; j <= 2; j++) m = Math.max(m, ns[c + j] || 0); return m; };
  const beats = grid.map((b, i) => { const x = b.c + smo[i]; return { t: x / fps, s: strength(x), k: b.k }; });
  const halves = [];
  for (let i = 0; i < grid.length - 1; i++) { const x = (grid[i].c + smo[i] + grid[i + 1].c + smo[i + 1]) / 2; halves.push({ t: x / fps, s: strength(x), k: grid[i].k + 0.5 }); }
  const bar = [0, 0, 0, 0];
  beats.forEach((b) => { bar[b.k % 4] += b.s; });
  const barOffset = bar.indexOf(Math.max(...bar));
  const env = new Float32Array(N), EW = 100, rc = new Float64Array(N + 1);
  for (let f = 0; f < N; f++) rc[f + 1] = rc[f] + rms[f];
  for (let f = 0; f < N; f++) { const a0 = Math.max(0, f - EW), b0 = Math.min(N, f + EW + 1); env[f] = (rc[b0] - rc[a0]) / (b0 - a0); }
  const e95 = quantile(env, 0.95) || 1;
  const energyAt = (t) => env[clamp(Math.round(t * fps), 0, N - 1)] / e95;
  return { fps, bpm: (60 * fps) / bp, period: bp / fps, beats, halves, barOffset, energyAt, duration: buffer.duration };
}

function generate(an, diff, seed) {
  const R = rng(seed);
  const C = {
    easy: { half: false, q: 0.5, gap: 1.75, dbl: 0, dot: 0.4, bomb: 0, quiet: 0.3 },
    normal: { half: true, hq: 0.92, q: 0.3, gap: 0.95, dbl: 0.35, dot: 0.12, bomb: 0.25, quiet: 0.22 },
    hard: { half: true, hq: 0.7, q: 0.18, gap: 0.45, dbl: 0.5, dot: 0.06, bomb: 0.4, quiet: 0.15 },
  }[diff];
  const bs = an.beats.map((b) => b.s);
  const qB = quantile(bs, C.q), qD = quantile(bs, 0.88), qH = C.half ? quantile(an.halves.map((b) => b.s), C.hq) : 1e9;
  let cands = an.beats.map((b) => ({ ...b, half: false }));
  if (C.half) cands = cands.concat(an.halves.map((b) => ({ ...b, half: true })));
  cands.sort((x, y) => x.t - y.t);
  const P = an.period, notes = [];
  const H = { L: { last: -99, par: 'down' }, R: { last: -99, par: 'down' } };
  let lastHand = 'R', lastT = -99;
  for (const c of cands) {
    if (c.t < 1.6 || c.t > an.duration - 1.5) continue;
    const e = an.energyAt(c.t);
    if (e < C.quiet) continue;
    let ok = c.half ? c.s >= qH && e > 0.55 : c.s >= qB * (e > 0.7 ? 0.5 : 1) || (diff !== 'easy' && e > 0.75 && c.s >= qB * 0.25);
    if (diff === 'easy' && c.k % 2 !== 0 && c.s < qD) ok = false;
    if (!ok || (c.t - lastT) / P < 0.45) continue;
    const free = (h) => (c.t - H[h].last) / P >= C.gap - 0.05;
    const pref = lastHand === 'L' ? 'R' : 'L';
    let hands;
    if (free(pref)) hands = [pref]; else if (free(lastHand)) hands = [lastHand]; else continue;
    const onBar = !c.half && (((c.k - an.barOffset) % 4) + 4) % 4 === 0;
    if (C.dbl && c.s >= qD && onBar && free('L') && free('R') && H.L.par === H.R.par && R() < C.dbl) hands = ['L', 'R'];
    const dbl = hands.length === 2, r1 = R(), rowR = R();
    for (const h of hands) {
      const par = H[h].par;
      let dir;
      if (!dbl && r1 < C.dot) dir = 8;
      else if (!dbl && r1 < C.dot + 0.22) dir = h === 'L' ? (par === 'down' ? 4 : 6) : par === 'down' ? 5 : 7;
      else dir = par === 'down' ? 0 : 1;
      const row = dbl ? 0 : par === 'down' ? (rowR < 0.5 ? 0 : rowR < 0.8 ? 1 : 2) : rowR < 0.7 ? 0 : 1;
      const col = h === 'L' ? (R() < 0.62 ? 1 : 0) : R() < 0.62 ? 2 : 3;
      notes.push({ t: c.t, hand: h, col, row, dir, type: 'note' });
      H[h].par = par === 'down' ? 'up' : 'down';
      H[h].last = c.t;
    }
    lastHand = hands[hands.length - 1];
    lastT = c.t;
  }
  if (C.bomb) {
    for (const h of HANDS) {
      const hn = notes.filter((n) => n.hand === h && n.type === 'note');
      for (let i = 0; i < hn.length - 1; i++) {
        const a = hn[i], b = hn[i + 1];
        if ((b.t - a.t) / P >= 1.8 && [0, 4, 5].includes(a.dir) && R() < C.bomb) notes.push({ t: (a.t + b.t) / 2, hand: h, col: h === 'L' ? 0 : 3, row: 2, dir: 8, type: 'bomb' });
      }
    }
    notes.sort((x, y) => x.t - y.t);
  }
  return notes;
}

/* --------------------------------------------------------------- geometry */

function segRect(x0, y0, x1, y1, minx, miny, maxx, maxy) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  const p = [-dx, dx, -dy, dy], q = [x0 - minx, maxx - x0, y0 - miny, maxy - y0];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return false; }
    else { const r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } }
  }
  return true;
}
function closestOnSeg(ax, ay, bx, by, px, py) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1e-9;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t };
}
function disposeDeep(o) {
  o.traverse((c) => {
    c.geometry?.dispose();
    const ms = Array.isArray(c.material) ? c.material : c.material ? [c.material] : [];
    ms.forEach((m) => { m.map?.dispose?.(); m.dispose(); });
  });
}
function canvasTex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function gridTex(bg, line, strong, fill = 1) {
  const c = mkCanvas(128, 128), x = c.getContext('2d');
  x.globalAlpha = fill; x.fillStyle = bg; x.fillRect(0, 0, 128, 128); x.globalAlpha = 1;
  x.fillStyle = line; x.fillRect(0, 0, 128, 3); x.fillRect(0, 0, 3, 128);
  x.fillStyle = strong; x.fillRect(0, 0, 7, 7);
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function radialTex(inner) {
  const c = mkCanvas(256, 256), x = c.getContext('2d'), g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, '#fff'); g.addColorStop(inner, '#fff'); g.addColorStop(1, '#000');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
function linearTex() {
  const c = mkCanvas(4, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#000'); g.addColorStop(0.45, '#fff'); g.addColorStop(1, '#fff');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}
// What the chrome reflects: the theme's field bands with a few soft key lights in the band colours
function envCanvas(w) {
  const c = mkCanvas(512, 256), x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, w.f[0]); g.addColorStop(0.46, w.f[1]); g.addColorStop(0.5, w.f[2]); g.addColorStop(0.56, w.f[1]); g.addColorStop(1, w.f[0]);
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  x.globalCompositeOperation = 'lighter';
  for (const [cx, cy, r, col, a] of [[110, 60, 70, '#ffffff', 0.7], [300, 40, 46, w.f[5], 0.8], [430, 80, 60, w.f[3], 0.6], [40, 150, 50, w.f[4], 0.4]]) {
    const rg = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalAlpha = a; x.fillStyle = rg; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  const t = canvasTex(c); t.mapping = THREE.EquirectangularReflectionMapping;
  return t;
}
let LOGO_PATH = null;
// Neon block faces: the Omarchy mark as the window frame, a glowing chevron or pixel inside
function neonFace(hex, kind, label) {
  const c = mkCanvas(256, 256), x = c.getContext('2d');
  const core = '#' + new THREE.Color(hex).lerp(WHITE, 0.6).getHexString();
  x.fillStyle = '#07080b'; x.fillRect(0, 0, 256, 256);
  if (kind === 'side' || kind === 'label') {
    x.shadowColor = hex; x.shadowBlur = 24; x.strokeStyle = hex; x.lineWidth = 10;
    x.strokeRect(16, 16, 224, 224); x.strokeRect(16, 16, 224, 224);
    x.shadowBlur = 0; x.strokeStyle = core; x.lineWidth = 3; x.strokeRect(16, 16, 224, 224);
  }
  if (kind === 'arrow' || kind === 'dot') {
    LOGO_PATH = LOGO_PATH || new Path2D(LOGO);
    x.save(); x.translate(22, 22); x.scale(212 / 1200, 212 / 1200);
    x.shadowColor = hex; x.shadowBlur = 26; x.fillStyle = hex;
    x.fill(LOGO_PATH, 'evenodd'); x.fill(LOGO_PATH, 'evenodd');
    x.shadowBlur = 0; x.globalAlpha = 0.55; x.fillStyle = core; x.fill(LOGO_PATH, 'evenodd');
    x.restore();
    x.shadowColor = hex; x.shadowBlur = 30; x.fillStyle = core;
    for (let k = 0; k < 2; k++) {
      x.beginPath();
      if (kind === 'arrow') { x.moveTo(82, 112); x.lineTo(174, 112); x.lineTo(128, 164); x.closePath(); x.fill(); }
      else x.fillRect(110, 110, 36, 36);
    }
    x.shadowBlur = 0;
  }
  if (kind === 'label') { x.shadowColor = hex; x.shadowBlur = 20; drawPixelString(x, label, core, 256, 256); x.shadowBlur = 0; drawPixelString(x, label, core, 256, 256); }
  const t = canvasTex(c); t.anisotropy = 8; return t;
}
function glowTex(hex) {
  const c = mkCanvas(128, 128), x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  const col = new THREE.Color(hex), rgb = (a) => 'rgba(' + Math.round(col.r * 255) + ',' + Math.round(col.g * 255) + ',' + Math.round(col.b * 255) + ',' + a + ')';
  g.addColorStop(0, rgb(0.9)); g.addColorStop(0.35, rgb(0.45)); g.addColorStop(1, rgb(0));
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return canvasTex(c);
}
function squareRingTex() {
  const c = mkCanvas(128, 128), x = c.getContext('2d');
  x.shadowColor = '#fff'; x.shadowBlur = 14; x.strokeStyle = '#fff'; x.lineWidth = 7;
  x.strokeRect(22, 22, 84, 84); x.strokeRect(22, 22, 84, 84);
  return canvasTex(c);
}
// Talon profile: the centre line rises toward the tip and the blade tapers to a point.
// The hit samples and the trails use the same line, so what you see is what cuts.
const talonRise = (f, L) => 0.09 * L * f * f;
const talonHalf = (f) => 0.013 * Math.pow(1 - f, 0.65) + 0.0007;
function bladeGeometry(L) {
  const s = new THREE.Shape(), N = 16, top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const f = i / N, c = talonRise(f, L), hh = talonHalf(f);
    top.push([f * L, c + hh * 0.55]); bot.push([f * L, c - hh]);
  }
  s.moveTo(bot[0][0], bot[0][1]);
  for (let i = 0; i <= N; i++) s.lineTo(top[i][0], top[i][1]);
  for (let i = N - 1; i >= 1; i--) s.lineTo(bot[i][0], bot[i][1]);
  s.closePath();
  // a thin core with a wide chamfer, so the edges catch the light
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.0022, bevelEnabled: true, bevelThickness: 0.0016, bevelSize: 0.001, bevelSegments: 1 });
  g.translate(0, 0, -0.0011); g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}
function edgeGeometry(L) {
  const pts = [];
  for (let i = 0; i <= 14; i++) { const f = 0.03 + (0.97 * i) / 14; pts.push(new THREE.Vector3(0, talonRise(f, L) - talonHalf(f) - 0.0006, -f * L)); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0015, 5, false);
}
// Two crossed ribbons along the cutting edge carry the glow, so it reads from every angle
function glowGeometry(L) {
  const N = 18, pos = [], uv = [], idx = [];
  for (let p = 0; p < 2; p++) {
    const o = p * (N + 1) * 2;
    for (let i = 0; i <= N; i++) {
      const f = 0.04 + (0.96 * i) / N, y = talonRise(f, L) - talonHalf(f) * 0.45, z = -f * L, w = 0.034 * (1 - 0.4 * f);
      if (p === 0) pos.push(0, y - w, z, 0, y + w, z); else pos.push(-w, y, z, w, y, z);
      uv.push(i / N, 0, i / N, 1);
      if (i < N) { const a = o + i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
function glowStripTex() {
  const W = 64, H = 32, c = mkCanvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = i / (W - 1), v = (j / (H - 1)) * 2 - 1, k = (j * W + i) * 4;
    const along = clamp(u / 0.12, 0, 1) * (1 - 0.75 * clamp((u - 0.82) / 0.18, 0, 1));
    const a = (0.7 * Math.exp(-v * v * 5) + 0.6 * Math.exp(-v * v * 60)) * along;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(clamp(a, 0, 1) * 255);
  }
  x.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}
function chamferBox(w, h, d, r) {
  const s = new THREE.Shape(), a = w / 2 - r, b = h / 2 - r;
  s.moveTo(-a, -b); s.lineTo(a, -b); s.lineTo(a, b); s.lineTo(-a, b); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2 });
  g.translate(0, 0, -(d - 2 * r) / 2);
  return g;
}
// A swept guard on each side of the knuckle housing
function finGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.046, -0.017); s.lineTo(0.034, -0.017); s.lineTo(0.022, 0.004); s.lineTo(-0.058, 0.03); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.002, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 1 });
  g.translate(0, 0, -0.001); g.rotateY(Math.PI / 2);
  return g;
}
// The back plate: the Omarchy mark between four cells that light up with the multiplier
function drawPlate(x, hex, lvl) {
  const W = 256, H = 64;
  x.fillStyle = '#07080b'; x.fillRect(0, 0, W, H);
  x.shadowColor = hex; x.shadowBlur = 8; x.strokeStyle = hex; x.globalAlpha = 0.55; x.lineWidth = 3;
  x.strokeRect(3, 3, W - 6, H - 6); x.globalAlpha = 1;
  LOGO_PATH = LOGO_PATH || new Path2D(LOGO);
  x.save(); x.translate(W / 2 - 20, 12); x.scale(40 / 1200, 40 / 1200); x.shadowBlur = 14; x.fillStyle = hex; x.fill(LOGO_PATH, 'evenodd'); x.restore();
  for (let i = 0; i < 4; i++) {
    const cx = i < 2 ? 16 + i * 42 : W - 50 - (3 - i) * 42, on = i <= lvl;
    x.shadowBlur = on ? 16 : 0; x.fillStyle = on ? hex : '#1b1d24';
    x.fillRect(cx, 21, 34, 22);
  }
  x.shadowBlur = 0;
}
function trailMaterial(color, light) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, heat: { value: 0 }, whiten: { value: light ? 0 : 1 } },
    vertexShader: 'attribute float alpha;varying float vA;void main(){vA=alpha;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 color;uniform float heat;uniform float whiten;varying float vA;void main(){vec3 c=mix(color,vec3(1.0),whiten*clamp(vA*vA*(0.25+0.45*heat),0.0,0.8));gl_FragColor=vec4(c,vA*clamp(0.55+0.2*heat,0.0,0.95));\n#include <colorspace_fragment>\n}',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: light ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
}
function drawPixelString(ctx, str, color, W, H) {
  const rows = glyphRows(str), w = rows[0].length;
  const cell = Math.floor(Math.min((H * 0.72) / 5, (W * 0.92) / w));
  const ox = Math.round((W - w * cell) / 2), oy = Math.round((H - 5 * cell) / 2);
  ctx.fillStyle = color;
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '1') ctx.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2); });
}

/* ------------------------------------------------------------------ game */

export class Game {
  constructor(host, cb = {}) {
    this.host = host; this.cb = cb;
    this.opts = { clawLength: 0.62, blades: 3 };
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.xr.enabled = true;
    r.xr.setReferenceSpaceType('local-floor');
    r.xr.setFoveation?.(1);
    Object.assign(r.domElement.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block', touchAction: 'none' });
    host.appendChild(r.domElement);
    this.maxAniso = r.capabilities.getMaxAnisotropy();
    this.pmrem = new THREE.PMREMGenerator(r);
    this.clawsOut = false;
    this.scene = new THREE.Scene();
    this.rig = new THREE.Group(); this.scene.add(this.rig);
    this.camera = new THREE.PerspectiveCamera(65, 1, 0.05, 500);
    this.camera.position.set(0, 1.9, 2.6);
    this.rig.add(this.camera);
    this.camLook = new THREE.Vector3(0, 6, -60);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x111111, 1.1); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1.5, 5, 3); this.scene.add(sun);
    this.clock = new THREE.Clock();
    this.t = 0; this.phase = 'lobby'; this.paused = false; this.song = -99; this.bass = 0;
    this.cache = new Map(); this.loadInfo = new Map(); this.live = []; this.notePool = []; this.bombPool = []; this.tok = 0;
    this.pointer = { nx: 0, ny: 0, has: false, reset: true, o: new THREE.Vector3(), d: new THREE.Vector3(0, 0, -1), po: new THREE.Vector3(), pd: new THREE.Vector3(0, 0, -1) };
    this.activeHand = 'R'; this.ctrl = { L: null, R: null };
    this._v = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._tp = new THREE.Vector3(); this._tl = new THREE.Vector3(); this._a = {}; this._b = {}; this._p = {};
    this.stats(); this.energy = 0.5;
    this._c1 = new THREE.Color(); this._c2 = new THREE.Color(); this._dummy = new THREE.Object3D(); this._p2 = {};
    this._initAudio();
    this._initShared();
    this._initControllers();
    this._bindInput();
    loadFX().then((n) => { this.fxNames = n; }).catch(() => {});
    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(host); this._resize();
    r.setAnimationLoop(() => this._tick());
  }

  stats() { Object.assign(this, { score: 0, combo: 0, maxCombo: 0, lvl: 0, prog: 0, hits: 0, misses: 0, bad: 0, bombs: 0, cutSum: 0 }); }

  /* -------- public api */
  setWorld(w) {
    this.world = w;
    this._buildEnv();
    this._worldMats();
    this._buildClaws();
    this._hudKey = '';
  }
  setOptions(o) {
    const prev = { ...this.opts };
    Object.assign(this.opts, o);
    if (!this.world) return;
    if (prev.blades !== this.opts.blades || prev.clawLength !== this.opts.clawLength) this._buildClaws();
  }
  renderNow() { this.scene.updateMatrixWorld(); this.renderer.render(this.scene, this.camera); }
  unlock() { this.actx.resume().catch(() => {}); }
  status(file) { return this.loadInfo.get(file) || null; }
  xrSupported() { return navigator.xr ? navigator.xr.isSessionSupported('immersive-vr').catch(() => false) : Promise.resolve(false); }

  load(track) {
    const file = track.file;
    if (this.cache.has(file)) return this.cache.get(file);
    const p = (async () => {
      this._emit(file, { stage: 'fetch', p: 0 });
      const ab = await this._fetch(track);
      this._emit(file, { stage: 'decode', p: 1 });
      const buffer = await this.actx.decodeAudioData(ab);
      this._emit(file, { stage: 'map', p: 1 });
      await new Promise((r) => setTimeout(r, 30));
      const an = analyze(buffer);
      this._emit(file, { stage: 'ready', p: 1, bpm: Math.round(an.bpm), duration: buffer.duration });
      return { buffer, an };
    })();
    p.catch(() => { this.cache.delete(file); this._emit(file, { stage: 'error', p: 0 }); });
    this.cache.set(file, p);
    if (this.cache.size > 2) for (const k of this.cache.keys()) { if (k !== file && k !== this.track?.file) { this.cache.delete(k); this.loadInfo.delete(k); break; } }
    return p;
  }

  async start({ track, difficulty = 'normal', noFail = true }) {
    const tok = ++this.tok;
    this._markExplode();
    this._clawsExtend(false);
    this._stopAudio(); this._clearNotes(); this._hideVRResults();
    this.paused = false;
    this.track = track; this.diff = difficulty; this.noFail = noFail;
    this.phase = 'loading'; this.cb.onPhase?.('loading');
    this.song = -99; this.hud.visible = false;
    this._bannerText('LOADING');
    let data;
    try { data = await this.load(track); }
    catch (e) {
      if (tok !== this.tok) return;
      this._bannerText('LOAD FAILED');
      this.cb.onError?.(e);
      setTimeout(() => { if (tok === this.tok) this.quit(); }, 1800);
      return;
    }
    if (tok !== this.tok) return;
    const xr = this.renderer.xr.isPresenting;
    this.an = data.an;
    this.map = generate(data.an, difficulty, hash(track.file + difficulty));
    this.ni = 0;
    this.noteCount = this.map.filter((n) => n.type === 'note').length;
    this.speed = SPEED[difficulty] * (xr ? 1 : 0.85);
    this.win = 0.13 * this.speed;
    this.minSp = xr ? 0.6 : 0.8; this.spMin = xr ? 1.0 : 1.5; this.spRange = xr ? 2.5 : 5;
    this.y0 = xr ? clamp((this.camera.position.y || 1.6) * 0.5, 0.62, 1.05) : 0.8;
    this.stats(); this.energy = 0.5;
    this.duration = data.buffer.duration;
    await Promise.race([this.actx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
    if (this.actx.state !== 'running') {
      this._bannerText('CLICK TO PLAY');
      await new Promise((res) => {
        const h = () => { window.removeEventListener('pointerdown', h, true); window.removeEventListener('keydown', h, true); this.actx.resume().then(res, res); };
        window.addEventListener('pointerdown', h, true); window.addEventListener('keydown', h, true);
      });
    }
    if (tok !== this.tok) return;
    const g = this.musicGain.gain, now = this.actx.currentTime;
    g.cancelScheduledValues(now); g.setValueAtTime(0.9, now);
    const src = this.actx.createBufferSource();
    src.buffer = data.buffer; src.connect(this.musicGain);
    this.lat = this.actx.outputLatency || this.actx.baseLatency || 0;
    this.startAt = now + 3.2;
    src.start(this.startAt);
    this.src = src;
    this.song = now - this.startAt;
    this.lastCount = null; this.shinged = false;
    this.phase = 'countdown';
    this.hud.visible = true; this._hudKey = '';
    this.cb.onPhase?.('countdown');
  }
  pause(force) {
    if (this.paused || !(this.phase === 'playing' || this.phase === 'countdown')) return;
    if (this.renderer.xr.isPresenting && !force) return;
    this.paused = true; this.actx.suspend(); this.cb.onPause?.(true);
  }
  resume() {
    if (!this.paused) return;
    this.paused = false; this.actx.resume(); this.cb.onPause?.(false);
  }
  quit() {
    this.tok++;
    this._stopAudio(); this._clearNotes(); this._hideVRResults();
    this.paused = false; this.actx.resume().catch(() => {});
    this.phase = 'lobby'; this.hud.visible = false; this._hideBanner();
    this._clawsExtend(false);
    this._markGather();
    this.cb.onPhase?.('lobby');
  }
  async enterVR() {
    if (!navigator.xr) return false;
    const s = await navigator.xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
    s.addEventListener('end', () => this._xrEnd());
    s.addEventListener('visibilitychange', () => { if (s.visibilityState !== 'visible') this.pause(true); else this.resume(); });
    await this.renderer.xr.setSession(s);
    this.session = s;
    this.cb.onXR?.(true);
    return true;
  }
  exitVR() { this.session?.end(); }
  destroy() {
    this.renderer.setAnimationLoop(null);
    this._ro.disconnect();
    window.removeEventListener('keydown', this._key);
    this._stopAudio();
    this.actx.close?.();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  /* -------- setup */
  _emit(file, info) {
    this.loadInfo.set(file, info);
    this.cb.onLoad?.(file, info);
    if (this.phase === 'loading' && file === this.track?.file) {
      const label = info.stage === 'fetch' ? `LOADING ${Math.round(info.p * 100)}%` : info.stage === 'error' ? 'LOAD FAILED' : 'MAPPING';
      if (label !== this._loadLabel) { this._loadLabel = label; this._bannerText(label); }
    }
  }
  async _fetch(track) {
    let err;
    for (const u of TRACK_URLS(track.file)) {
      try {
        const res = await fetch(u);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const total = +res.headers.get('content-length') || 0;
        if (!res.body || !total) return await res.arrayBuffer();
        const reader = res.body.getReader(), chunks = [];
        let got = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); got += value.length;
          this._emit(track.file, { stage: 'fetch', p: Math.min(1, got / total) });
        }
        const out = new Uint8Array(got);
        let o = 0;
        for (const c of chunks) { out.set(c, o); o += c.length; }
        return out.buffer;
      } catch (e) { err = e; }
    }
    throw err || new Error('fetch failed');
  }
  _initAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const c = (this.actx = new AC({ latencyHint: 'interactive' }));
    this.musicGain = c.createGain(); this.musicGain.gain.value = 0.9;
    this.analyser = c.createAnalyser(); this.analyser.fftSize = 512;
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.musicGain.connect(this.analyser); this.analyser.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0.35; this.sfx.connect(c.destination);
    const len = (c.sampleRate * 0.5) | 0;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  _initShared() {
    this.noteGeo = new THREE.BoxGeometry(NOTE, NOTE, NOTE);
    this.noteMats = {};
    for (const h of HANDS) {
      const side = new THREE.MeshBasicMaterial(), fa = new THREE.MeshBasicMaterial(), fd = new THREE.MeshBasicMaterial();
      const halo = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0.55 });
      this.noteMats[h] = { side, fa, fd, halo, arrow: [side, side, side, side, fa, side], dot: [side, side, side, side, fd, side] };
    }
    this.bombBody = new THREE.MeshBasicMaterial({ color: 0x07080b });
    this.bombEdge = new THREE.LineBasicMaterial({ color: 0xffffff });
    this.bombHalo = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0.5 });
    this.bombGeo = new THREE.IcosahedronGeometry(0.17, 0);
    this.bombEdges = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.19, 0));
    // claw slices
    this.pieceGeo = new THREE.BoxGeometry(1, 1, 1);
    this.pieces = [];
    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true });
      const mesh = new THREE.Mesh(this.pieceGeo, mat); mesh.visible = false; this.scene.add(mesh);
      this.pieces.push({ mesh, mat, v: new THREE.Vector3(), w: new THREE.Vector3(), age: 1, life: 0 });
    }
    // pixel explosion: every cut block bursts into voxels
    const VN = 2400;
    this.vox = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), VN);
    this.vox.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.vox.frustumCulled = false;
    this.vox.setColorAt(0, this._c1.set(0xffffff)); this.vox.instanceColor.setUsage(THREE.DynamicDrawUsage);
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < VN; i++) this.vox.setMatrixAt(i, zero);
    this.scene.add(this.vox);
    this.voxD = { n: VN, p: new Float32Array(VN * 3), v: new Float32Array(VN * 3), r: new Float32Array(VN * 3), w: new Float32Array(VN * 3), s: new Float32Array(VN), age: new Float32Array(VN).fill(1), life: new Float32Array(VN), next: 0 };
    this.flashes = [];
    for (let i = 0; i < 8; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
      sp.visible = false; this.scene.add(sp); this.flashes.push({ s: sp, age: 1 });
    }
    // sparks: square pixels that fly off every cut and drip from hot claws
    const S = (this.spark = { n: SPARKS, p: new Float32Array(SPARKS * 3), v: new Float32Array(SPARKS * 3), c: new Float32Array(SPARKS * 4), age: new Float32Array(SPARKS).fill(1), life: new Float32Array(SPARKS).fill(1), next: 0, live: false });
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(S.p, 3).setUsage(THREE.DynamicDrawUsage));
    sg.setAttribute('color', new THREE.BufferAttribute(S.c, 4).setUsage(THREE.DynamicDrawUsage));
    this.sparkMat = new THREE.PointsMaterial({ size: 0.016, vertexColors: true, transparent: true, depthWrite: false, fog: false });
    this.sparkPts = new THREE.Points(sg, this.sparkMat); this.sparkPts.frustumCulled = false; this.scene.add(this.sparkPts);
    // miss sprites
    this.missCanvas = mkCanvas(256, 96); this.missTex = canvasTex(this.missCanvas);
    this.sprites = [];
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.missTex, transparent: true, depthWrite: false, fog: false }));
      sp.scale.set(0.5, 0.19, 1); sp.visible = false; this.scene.add(sp);
      this.sprites.push({ s: sp, age: 1 });
    }
    // hud (waybar)
    this.hudCanvas = mkCanvas(1600, 88); this.hudCtx = this.hudCanvas.getContext('2d'); this.hudTex = canvasTex(this.hudCanvas);
    this.hud = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.154), new THREE.MeshBasicMaterial({ map: this.hudTex, transparent: true, fog: false, depthWrite: false }));
    this.hud.position.set(0, 0.32, -2.3); this.hud.rotation.x = -0.55; this.hud.visible = false; this.scene.add(this.hud);
    // banner
    this.banCanvas = mkCanvas(1024, 256); this.banCtx = this.banCanvas.getContext('2d'); this.banTex = canvasTex(this.banCanvas);
    this.banner = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: this.banTex, transparent: true, fog: false, depthWrite: false }));
    this.banner.position.set(0, 2.75, -6); this.banner.visible = false; this.scene.add(this.banner);
    // vr results
    this.resGroup = new THREE.Group(); this.resGroup.visible = false; this.scene.add(this.resGroup);
    this.resCanvas = mkCanvas(1024, 640); this.resTex = canvasTex(this.resCanvas);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: this.resTex, fog: false }));
    panel.position.set(0, 2.0, -2.7); this.resGroup.add(panel);
    this.menu = [['RETRY', 'retry', -0.75], ['NEXT', 'next', 0], ['EXIT', 'exit', 0.75]].map(([label, action, x]) => {
      const side = new THREE.MeshBasicMaterial(), face = new THREE.MeshBasicMaterial();
      const mesh = new THREE.Mesh(this.noteGeo, [side, side, side, side, face, side]);
      mesh.position.set(x, 1.1, -1.3); this.resGroup.add(mesh);
      return { label, action, mesh, side, face, x };
    });
  }
  _initControllers() {
    for (let i = 0; i < 2; i++) {
      const c = this.renderer.xr.getController(i);
      c.addEventListener('connected', (e) => {
        let h = e.data.handedness === 'left' ? 'L' : e.data.handedness === 'right' ? 'R' : this.ctrl.R ? 'L' : 'R';
        c.userData.src = e.data; c.userData.hand = h;
        this.ctrl[h] = c;
        const cl = this.claw?.[h];
        if (cl) { cl.group.position.set(0, 0, 0); cl.group.rotation.set(0, 0, 0); cl.group.scale.setScalar(1); c.add(cl.group); cl.group.visible = true; cl.fresh = true; }
      });
      c.addEventListener('disconnected', () => {
        const h = c.userData.hand;
        if (h && this.ctrl[h] === c) { this.ctrl[h] = null; const cl = this.claw?.[h]; if (cl) { this.scene.add(cl.group); cl.group.visible = false; } }
      });
      this.rig.add(c);
    }
  }
  _bindInput() {
    const el = this.renderer.domElement, p = this.pointer;
    const mv = (e) => {
      const r = el.getBoundingClientRect();
      p.nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      p.ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      if (!p.has) { p.has = true; p.reset = true; }
    };
    el.addEventListener('pointermove', mv);
    el.addEventListener('pointerdown', (e) => { mv(e); p.reset = true; });
    el.addEventListener('pointerleave', () => { p.has = false; });
    this._key = (e) => {
      if (e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return;
      if (this.paused) this.resume(); else this.pause();
    };
    window.addEventListener('keydown', this._key);
  }
  _resize() {
    if (this.renderer.xr.isPresenting) return;
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  /* -------- world */
  _worldMats() {
    const w = this.world;
    this.handCol = { L: w.left, R: w.right };
    const blend = w.light ? THREE.NormalBlending : THREE.AdditiveBlending;
    for (const h of HANDS) {
      const m = this.noteMats[h], c = this.handCol[h];
      for (const [mat, kind] of [[m.side, 'side'], [m.fa, 'arrow'], [m.fd, 'dot']]) { mat.map?.dispose(); mat.map = neonFace(c, kind); mat.needsUpdate = true; }
      m.halo.map?.dispose(); m.halo.map = glowTex(c); m.halo.blending = blend; m.halo.opacity = w.light ? 0.35 : 0.55; m.halo.needsUpdate = true;
    }
    this.badCol = w.muted;
    this.bombEdge.color.set(w.light ? w.left : w.text);
    this.bombHalo.map?.dispose(); this.bombHalo.map = glowTex(w.light ? w.left : w.text); this.bombHalo.blending = blend; this.bombHalo.needsUpdate = true;
    this.sparkMat.blending = blend; this.sparkMat.needsUpdate = true;
    const ring = squareRingTex();
    this.flashes.forEach((f) => { f.s.material.map = ring; f.s.material.blending = blend; f.s.material.needsUpdate = true; });
    const x = this.missCanvas.getContext('2d');
    x.clearRect(0, 0, 256, 96); drawPixelString(x, 'MISS', w.muted, 256, 96); this.missTex.needsUpdate = true;
    const menuCol = { retry: w.left, next: w.f[3], exit: w.right };
    for (const m of this.menu) {
      const col = menuCol[m.action];
      m.face.map?.dispose(); m.face.map = neonFace(col, 'label', m.label); m.face.needsUpdate = true;
      m.side.map?.dispose(); m.side.map = neonFace(col, 'side'); m.side.needsUpdate = true;
      m.color = col;
    }
    this._buildMark();
  }
  _buildMark() {
    const prevState = this.mark?.state;
    if (this.mark) { this.scene.remove(this.mark.mesh); this.mark.mesh.geometry.dispose(); this.mark.mesh.material.dispose(); }
    const lab = glyphRows('BEAT'), PX = 4, PY = 3, COLS = 81 + PX * 2, ROWS = PY + 19 + 3 + 5 + PY, S = 0.3;
    const cells = [];
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const by = y - PY, bx = x - PX, ly = y - (PY + 22);
      let kind = 0;
      if (by >= 0 && by < 19 && bx >= 0 && bx < 81 && BITMAP[by][bx] === '1') kind = 1;
      if (ly >= 0 && ly < 5 && bx >= 0 && bx < lab[0].length && lab[ly][bx] === '1') kind = 2;
      cells.push({ x, y, kind, hx: (x - (COLS - 1) / 2) * S, hy: MARK.y + ((ROWS - 1) / 2 - y) * S, seed: Math.random(), px: 0, py: 0, pz: 0, vx: 0, vy: 0, vz: 0 });
    }
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(S * 0.84, S * 0.84, S * 0.84), new THREE.MeshBasicMaterial({ fog: false }), cells.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
    mesh.setColorAt(0, this._c1.set(0)); mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(mesh);
    const state = prevState === 'hidden' || prevState === 'explode' ? 'hidden' : 'idle';
    this.mark = { mesh, cells, ramp: this.world.f.map((c) => new THREE.Color(c)), cols: COLS, rows: ROWS, S, state, t: 0 };
    mesh.visible = state !== 'hidden';
  }
  _markUpdate(dt) {
    const M = this.mark;
    if (!M || M.state === 'hidden') return;
    M.t += dt;
    const o = this._dummy, R = M.ramp, col = this._c2, S = M.S, time = this.t;
    let mx = -999, my = -999;
    if (!this.renderer.xr.isPresenting && this.pointer.has) {
      const pt = this._rayAt(this.pointer.o, this.pointer.d, MARK.z, this._p2);
      mx = pt.x / S + (M.cols - 1) / 2; my = (M.rows - 1) / 2 - (pt.y - MARK.y) / S;
    }
    const sweep = (((time * 0.2) % 1.7) - 0.35) * (M.cols + M.rows * 1.6);
    const beat = Math.exp(-((time % 0.75) / 0.75) * 5);
    let alive = false;
    for (let i = 0; i < M.cells.length; i++) {
      const c = M.cells[i];
      const dx = c.x - mx, dy = c.y - my, d = Math.sqrt(dx * dx + dy * dy), near = d < 8 ? 1 - d / 8 : 0;
      const sw = Math.exp(-Math.pow((c.x + c.y * 1.6 - sweep) / 4, 2));
      let e, scale, z = MARK.z;
      if (c.kind === 1) { e = Math.max(near, sw * 0.9); col.copy(e > 0.55 ? R[5] : e > 0.2 ? R[4] : R[3]); scale = 1 + e * 0.2 + beat * 0.06; z += e * 1.4; }
      else if (c.kind === 2) { e = near; col.copy(e > 0.35 ? R[5] : R[4]); scale = 0.9 + e * 0.25; z += e * 0.9; }
      else {
        const tw = 0.5 + 0.5 * Math.sin(time * 1.4 + c.seed * 60);
        e = Math.max(near * 0.9, tw > 0.985 ? 0.55 : 0, sw * 0.3);
        col.copy(R[1]).lerp(R[2], e); scale = 0.2 + e * 0.55; z += e * 0.5;
      }
      let x = c.hx, y = c.hy, rx = 0, ry = 0;
      if (M.state === 'explode') {
        const k = M.t;
        x = c.px + c.vx * k; y = c.py + c.vy * k - 3 * k * k; z = c.pz + c.vz * k;
        rx = k * c.vy * 0.4; ry = k * c.vx * 0.4;
        scale *= Math.max(0, 1 - k / 1.6);
        if (k < 1.6) alive = true;
      } else if (M.state === 'gather') {
        const k = clamp((M.t - (c.x / M.cols) * 0.6) / 0.9, 0, 1), e2 = 1 - Math.pow(1 - k, 3);
        x = c.px + (c.hx - c.px) * e2; y = c.py + (c.hy - c.py) * e2; z = c.pz + (z - c.pz) * e2;
        scale *= e2;
        if (k < 1) alive = true;
      }
      o.position.set(x, y, z); o.rotation.set(rx, ry, 0); o.scale.setScalar(scale); o.updateMatrix();
      M.mesh.setMatrixAt(i, o.matrix); M.mesh.setColorAt(i, col);
    }
    M.mesh.instanceMatrix.needsUpdate = true; M.mesh.instanceColor.needsUpdate = true;
    if (M.state === 'explode' && !alive) { M.state = 'hidden'; M.mesh.visible = false; }
    if (M.state === 'gather' && !alive) M.state = 'idle';
  }
  _markExplode() {
    const M = this.mark;
    if (!M || M.state === 'hidden' || M.state === 'explode') return;
    M.state = 'explode'; M.t = 0;
    for (const c of M.cells) {
      c.px = c.hx; c.py = c.hy; c.pz = MARK.z;
      c.vx = c.hx * (0.5 + Math.random()) + (Math.random() - 0.5) * 8;
      c.vy = (c.hy - MARK.y) * (0.8 + Math.random()) + (Math.random() - 0.5) * 8 + 3;
      c.vz = 6 + Math.random() * 20;
    }
  }
  _markGather() {
    const M = this.mark;
    if (!M || M.state === 'idle' || M.state === 'gather') return;
    M.state = 'gather'; M.t = 0; M.mesh.visible = true;
    for (const c of M.cells) {
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 30;
      c.px = c.hx + Math.cos(a) * r; c.py = c.hy + Math.sin(a) * r * 0.6; c.pz = MARK.z - 10 - Math.random() * 30;
    }
  }
  _burst(x, y, z, cx, cy, hex, grid = 4, power = 1) {
    const D = this.voxD, q = NOTE / grid, px = -cy, py = cx;
    this._c1.set(hex);
    for (let i = 0; i < grid; i++) for (let j = 0; j < grid; j++) for (let k = 0; k < grid; k++) {
      const id = D.next, b = id * 3;
      D.next = (D.next + 1) % D.n;
      const ox = (i - (grid - 1) / 2) * q, oy = (j - (grid - 1) / 2) * q, oz = (k - (grid - 1) / 2) * q;
      const side = Math.sign(ox * px + oy * py) || (Math.random() < 0.5 ? -1 : 1), sp = (1.5 + Math.random() * 3) * power;
      D.p[b] = x + ox; D.p[b + 1] = y + oy; D.p[b + 2] = z + oz;
      D.v[b] = px * side * sp + ox * 9 * power + cx * 1.2 + (Math.random() - 0.5);
      D.v[b + 1] = py * side * sp + oy * 9 * power + cy * 1.2 + (Math.random() - 0.5) + 0.6;
      D.v[b + 2] = oz * 9 + 1 + Math.random() * 2.5;
      D.r[b] = D.r[b + 1] = D.r[b + 2] = 0;
      D.w[b] = (Math.random() - 0.5) * 14; D.w[b + 1] = (Math.random() - 0.5) * 14; D.w[b + 2] = (Math.random() - 0.5) * 14;
      D.s[id] = q * (0.7 + Math.random() * 0.4); D.age[id] = 0; D.life[id] = 0.55 + Math.random() * 0.65;
      const f = Math.random();
      this._c2.copy(this._c1);
      if (f < 0.28) this._c2.lerp(WHITE, 0.65); else if (f < 0.5) this._c2.multiplyScalar(0.5);
      this.vox.setColorAt(id, this._c2);
    }
    this.vox.instanceColor.needsUpdate = true;
    this.voxActive = true;
  }
  _voxUpdate(dt) {
    if (!this.voxActive) return;
    const D = this.voxD, o = this._dummy, drag = 1 - Math.min(1, dt * 1.6);
    let any = false;
    for (let i = 0; i < D.n; i++) {
      if (D.age[i] >= D.life[i]) continue;
      D.age[i] += dt;
      if (D.age[i] >= D.life[i]) { o.scale.setScalar(0); o.updateMatrix(); this.vox.setMatrixAt(i, o.matrix); continue; }
      any = true;
      const b = i * 3;
      D.v[b + 1] -= 3.5 * dt;
      D.v[b] *= drag; D.v[b + 1] *= drag; D.v[b + 2] *= drag;
      D.p[b] += D.v[b] * dt; D.p[b + 1] += D.v[b + 1] * dt; D.p[b + 2] += D.v[b + 2] * dt;
      D.r[b] += D.w[b] * dt; D.r[b + 1] += D.w[b + 1] * dt; D.r[b + 2] += D.w[b + 2] * dt;
      o.position.set(D.p[b], D.p[b + 1], D.p[b + 2]); o.rotation.set(D.r[b], D.r[b + 1], D.r[b + 2]);
      o.scale.setScalar(D.s[i] * Math.pow(1 - D.age[i] / D.life[i], 0.6)); o.updateMatrix();
      this.vox.setMatrixAt(i, o.matrix);
    }
    this.vox.instanceMatrix.needsUpdate = true;
    if (!any) this.voxActive = false;
  }
  _flash(x, y, z, hex) {
    const f = this.flashes.find((q) => q.age >= 1) || this.flashes[0];
    f.s.position.set(x, y, z); f.s.material.color.set(hex); f.age = 0; f.s.visible = true;
  }
  _buildEnv() {
    const w = this.world, F = w.f.map((c) => new THREE.Color(c));
    if (this.env) { this.scene.remove(this.env); disposeDeep(this.env); }
    const env = (this.env = new THREE.Group());
    this.scene.add(env);
    this.scene.background = F[0].clone();
    this.scene.fog = new THREE.Fog(F[0].clone(), 18, 80);
    this.hemi.color.set(w.text); this.hemi.groundColor.set(w.f[0]); this.hemi.intensity = w.light ? 1.6 : 1.1;
    this._F = F;
    // the sky: one calm gradient in the field colour, and the omarchy.org pixel field wrapped round it
    const dome = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.ShaderMaterial({ uniforms: { top: { value: F[0].clone() }, bottom: { value: F[0].clone().lerp(F[1], 0.25) } }, vertexShader: DOME_VS, fragmentShader: DOME_FS, side: THREE.BackSide, depthWrite: false }));
    dome.renderOrder = -2; env.add(dome);
    const U = (this.fieldU = {
      f0: { value: F[0].clone() }, f1: { value: F[1].clone() }, f2: { value: F[2].clone() },
      time: { value: 0 }, dim: { value: 1 }, pulse: { value: 0 },
      cells: { value: new THREE.Vector2(Math.round((2 * Math.PI * FIELD.r) / FIELD.cell), Math.round(FIELD.h / FIELD.cell)) },
    });
    const field = new THREE.Mesh(new THREE.CylinderGeometry(FIELD.r, FIELD.r, FIELD.h, 180, 1, true), new THREE.ShaderMaterial({ uniforms: U, vertexShader: FIELD_VS, fragmentShader: FIELD_FS, side: THREE.BackSide, depthWrite: false }));
    field.position.y = FIELD.y; field.renderOrder = -1; env.add(field);
    // the floor: a pixel grid in the dim band that fades out at the edge
    const ft = gridTex(w.f[0], w.f[1], w.f[2], w.light ? 0.75 : 0.6); ft.repeat.set(34, 34); ft.anisotropy = this.maxAniso;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(34, 72), new THREE.MeshBasicMaterial({ map: ft, alphaMap: radialTex(0.45), transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = -12; env.add(floor);
    const run = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 44), new THREE.MeshBasicMaterial({ color: F[0].clone().lerp(F[1], 0.45), alphaMap: linearTex(), transparent: true, opacity: 0.85, depthWrite: false }));
    run.rotation.x = -Math.PI / 2; run.position.set(0, 0.004, -20); env.add(run);
    this.edgeMat = new THREE.MeshBasicMaterial({ color: F[2] });
    for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 40), this.edgeMat); e.position.set(sx * 1.33, 0.015, -18); env.add(e); }
    // window frames around the track that breathe on the beat
    this.ringMats = [];
    const box = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 7; i++) {
      const m = new THREE.MeshBasicMaterial({ color: F[1] }); this.ringMats.push(m);
      const g = new THREE.Group(), RW = 9, RH = 6.4, T = 0.06;
      [[0, RH, RW + T, T], [-RW / 2, RH / 2, T, RH], [RW / 2, RH / 2, T, RH]].forEach(([x, y, sx, sy]) => { const b = new THREE.Mesh(box, m); b.position.set(x, y, 0); b.scale.set(sx, sy, T); g.add(b); });
      g.position.z = -9 - i * 6.5; env.add(g);
    }
    // a few drifting pixels for a sense of speed
    const N = 140, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const a = Math.random() * Math.PI * 2, r = 5 + Math.random() * 38;
      pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 16; pos[i * 3 + 2] = Math.sin(a) * r - 20;
    }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: F[2], size: 0.07, transparent: true, opacity: 0.6, depthWrite: false }));
    env.add(this.dust);
    // what the claw chrome reflects
    const et = envCanvas(w), rt = this.pmrem.fromEquirectangular(et);
    et.dispose();
    this.envRT?.dispose(); this.envRT = rt; this.scene.environment = rt.texture;
  }
  _buildClaws() {
    const old = this.claw;
    this.claw = {};
    for (const h of HANDS) {
      const prev = old?.[h];
      const parent = this.ctrl[h] || this.scene;
      if (prev) { prev.group.parent?.remove(prev.group); disposeDeep(prev.group); prev.trails.forEach((t) => { this.scene.remove(t.mesh); t.geo.dispose(); t.mesh.material.dispose(); }); }
      const c = this._makeClaw(h);
      parent.add(c.group);
      c.group.visible = parent !== this.scene;
      c.fresh = true;
      c.ext = c.extTo = this.clawsOut ? 1 : 0;
      this.claw[h] = c;
    }
  }
  _makeClaw(h) {
    const w = this.world, hex = h === 'L' ? w.left : w.right, color = new THREE.Color(hex);
    const blend = w.light ? THREE.NormalBlending : THREE.AdditiveBlending;
    const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
    const n = this.opts.blades, L = this.opts.clawLength, sp = 0.034, W = sp * (n - 1) + 0.056;
    const metal = new THREE.MeshStandardMaterial({ color: w.light ? 0x8d939e : 0x2a2d35, metalness: 0.9, roughness: 0.32 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, metalness: 1, roughness: 0.14, emissive: color, emissiveIntensity: 0.1 });
    const energy = new THREE.MeshBasicMaterial({ color: color.clone(), fog: false });
    const glow = new THREE.MeshBasicMaterial({ map: glowStripTex(), color: color.clone(), transparent: true, opacity: 0.4, blending: blend, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const tipMat = new THREE.SpriteMaterial({ map: glowTex(hex), transparent: true, depthWrite: false, blending: blend, fog: false });
    // knuckle housing: a chamfered block with swept guards, energy ridges and a back plate
    const body = new THREE.Mesh(chamferBox(W, 0.03, 0.075, 0.006), metal); body.position.set(0, -0.004, 0.01); inner.add(body);
    for (const [z, d] of [[-0.022, 0.008], [0.037, 0.004]]) { const r = new THREE.Mesh(new THREE.BoxGeometry(W * 0.84, 0.0035, d), energy); r.position.set(0, 0.0118, z); inner.add(r); }
    const finGeo = finGeometry();
    for (const sx of [-1, 1]) { const fin = new THREE.Mesh(finGeo, metal); fin.position.set(sx * (W / 2 + 0.0012), -0.004, 0.01); inner.add(fin); }
    const plateC = mkCanvas(256, 64), plateT = canvasTex(plateC);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.86, (W * 0.86) / 4), new THREE.MeshBasicMaterial({ map: plateT, fog: false }));
    plate.position.set(0, -0.004, 0.0478); inner.add(plate);
    // blades: chrome talons fanned a little apart, each with a glowing edge, a glow ribbon and a hot tip
    const bladeGeo = bladeGeometry(L), edgeGeo = edgeGeometry(L), glowGeo = glowGeometry(L);
    const collarGeo = new THREE.CylinderGeometry(0.0085, 0.0105, 0.018, 12, 1).rotateX(Math.PI / 2), ringGeo = new THREE.TorusGeometry(0.0098, 0.0016, 6, 20);
    const blades = [], tips = [], local = [], cur = [], prev = [], trails = [];
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * sp;
      const collar = new THREE.Mesh(collarGeo, metal); collar.position.set(x, 0, -0.0365); inner.add(collar);
      const ring = new THREE.Mesh(ringGeo, energy); ring.position.set(x, 0, -0.0458); inner.add(ring);
      const bg = new THREE.Group(); bg.position.set(x, 0, -0.04); bg.rotation.y = -(i - (n - 1) / 2) * 0.09; inner.add(bg);
      bg.add(new THREE.Mesh(bladeGeo, chrome));
      bg.add(new THREE.Mesh(edgeGeo, energy));
      const gm = new THREE.Mesh(glowGeo, glow); gm.renderOrder = 2; bg.add(gm);
      const tip = new THREE.Sprite(tipMat); tip.position.set(0, talonRise(1, L), -L); bg.add(tip); tips.push(tip);
      blades.push(bg);
      const row = [];
      for (let k = 0; k < KS; k++) { const f = 0.15 + (0.85 * k) / (KS - 1); row.push(new THREE.Vector3(0, talonRise(f, L), -f * L)); }
      local.push(row); cur.push(row.map((v) => v.clone())); prev.push(row.map((v) => v.clone()));
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(TRAIL * 2 * 3), alpha = new Float32Array(TRAIL * 2), idx = [];
      for (let j = 0; j < TRAIL - 1; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
      geo.setIndex(idx);
      const mesh = new THREE.Mesh(geo, trailMaterial(color, w.light)); mesh.frustumCulled = false; mesh.visible = false; this.scene.add(mesh);
      trails.push({ mesh, geo, pos, alpha, hb: new Float32Array(TRAIL * 3), ht: new Float32Array(TRAIL * 3) });
    }
    return {
      group: g, inner, blades, tips, n, local, cur, prev, trails, hex, color, mats: { chrome, energy, glow, plateC, plateT },
      vel: new THREE.Vector3(), speed: 0, gain: 0, ok: false, fresh: true, lean: 0, tilt: 0, lx: 0, ly: 0, wasRest: true,
      ext: 0, extTo: 0, ev: 0, flash: 0, glitch: 0, heat: 0, plateLvl: -1,
    };
  }
  // Out at the shing of the countdown, in at the lobby
  _clawsExtend(on) {
    this.clawsOut = on;
    for (const h of HANDS) {
      const c = this.claw?.[h];
      if (!c) continue;
      c.extTo = on ? 1 : 0;
      if (on) c.flash = 1;
    }
  }
  _clawFX(dt, active) {
    const lvl = active ? this.lvl : 0, light = this.world.light;
    for (const h of HANDS) {
      const c = this.claw[h], M = c.mats;
      // an underdamped spring, so the blades overshoot a little when they snap out
      for (let s = dt; s > 0; s -= 1 / 120) {
        const st = Math.min(s, 1 / 120);
        c.ev += ((c.extTo - c.ext) * 900 - c.ev * 26) * st;
        c.ext = clamp(c.ext + c.ev * st, 0, 1.3);
      }
      if (c.extTo === 0 && c.ext < 0.03) { c.ext = 0; c.ev = 0; }
      const e = Math.max(0.03, c.ext), shown = Math.min(1, c.ext);
      for (const b of c.blades) b.scale.set(1, 1, e);
      c.flash = Math.max(0, c.flash - dt * 3.5);
      c.glitch = Math.max(0, c.glitch - dt * 4);
      // heat: the beat, the multiplier and the last good cut all feed the glow
      c.heat = 0.45 + lvl * 0.2 + this.bass * 0.4 + c.flash * 0.9;
      const white = light ? 0 : Math.min(1, c.flash * 0.85 + (lvl === 3 ? 0.22 + 0.12 * Math.sin(this.t * 14) : 0));
      M.energy.color.copy(c.color).lerp(WHITE, white);
      if (c.glitch > 0 && Math.random() < 0.6) M.energy.color.set(this.badCol);
      M.glow.color.copy(M.energy.color);
      M.glow.opacity = clamp((light ? 0.3 : 0.5) * c.heat, 0, 1) * shown;
      M.chrome.emissiveIntensity = 0.05 + 0.16 * c.heat;
      const ts = (0.04 + 0.03 * c.heat) * shown;
      for (const t of c.tips) t.scale.setScalar(ts);
      const j = c.glitch * 0.005;
      c.inner.position.set(j ? (Math.random() - 0.5) * j : 0, j ? (Math.random() - 0.5) * j : 0, 0);
      if (c.plateLvl !== lvl) { c.plateLvl = lvl; drawPlate(M.plateC.getContext('2d'), c.hex, lvl); M.plateT.needsUpdate = true; }
      // embers: the claws burn at the x8 multiplier, and fast swings throw sparks
      if (c.ok && c.ext > 0.9 && c.group.visible) {
        const rate = (lvl === 3 ? 26 : 0) + (c.speed > 4.5 ? 30 : 0);
        if (rate && Math.random() < rate * dt) {
          const T = c.cur[(Math.random() * c.n) | 0][KS - 1];
          this._sparks(T.x, T.y, T.z, c.vel.x * 0.12, c.vel.y * 0.12 + 0.25, c.vel.z * 0.12, 0.7, c.hex, 1, 0.5);
        }
      }
    }
  }
  _sparks(x, y, z, vx, vy, vz, spread, color, count, life) {
    const S = this.spark;
    this._c1.set(color);
    for (let i = 0; i < count; i++) {
      const id = S.next, b = id * 3, q = id * 4;
      S.next = (S.next + 1) % S.n;
      S.p[b] = x; S.p[b + 1] = y; S.p[b + 2] = z;
      S.v[b] = vx + (Math.random() - 0.5) * spread; S.v[b + 1] = vy + (Math.random() - 0.5) * spread; S.v[b + 2] = vz + (Math.random() - 0.5) * spread;
      this._c2.copy(this._c1);
      if (Math.random() < 0.4 && !this.world.light) this._c2.lerp(WHITE, 0.7);
      S.c[q] = this._c2.r; S.c[q + 1] = this._c2.g; S.c[q + 2] = this._c2.b; S.c[q + 3] = 1;
      S.age[id] = 0; S.life[id] = life * (0.6 + Math.random() * 0.8);
    }
    S.live = true;
  }
  _sparkUpdate(dt) {
    const S = this.spark;
    if (!S.live) return;
    const drag = 1 - Math.min(1, dt * 2.5);
    let any = false;
    for (let i = 0; i < S.n; i++) {
      if (S.age[i] >= S.life[i]) continue;
      S.age[i] += dt;
      const b = i * 3, q = i * 4;
      if (S.age[i] >= S.life[i]) { S.c[q + 3] = 0; continue; }
      any = true;
      S.v[b + 1] -= 5 * dt;
      S.v[b] *= drag; S.v[b + 1] *= drag; S.v[b + 2] *= drag;
      S.p[b] += S.v[b] * dt; S.p[b + 1] += S.v[b + 1] * dt; S.p[b + 2] += S.v[b + 2] * dt;
      S.c[q + 3] = 1 - S.age[i] / S.life[i];
    }
    const g = this.sparkPts.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
    if (!any) S.live = false;
  }

  /* -------- frame */
  _tick() {
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;
    if (!this.world) { this.renderer.render(this.scene, this.camera); return; }
    const xr = this.renderer.xr.isPresenting;
    const active = this.phase === 'countdown' || this.phase === 'playing';
    if (this.src && active) this.song = this.actx.currentTime - this.startAt - this.lat;
    if (!xr) this._desktopCamera(dt, active || this.phase === 'loading');
    this.camera.updateMatrixWorld();
    if (!xr) { this._pointerRays(); this._desktopClaws(dt, active); }
    this._clawFX(dt, active);
    this.scene.updateMatrixWorld();
    this._sampleBlades(dt);
    if (active) this._play(dt, xr);
    if (this.menuOn) this._menu(dt);
    this._env(dt, active);
    this._fx(dt);
    this._voxUpdate(dt);
    this._sparkUpdate(dt);
    this._markUpdate(dt);
    this._trails();
    if (this.hud.visible) this._drawHud();
    this._banner(dt);
    if (this.resFX) { this.resFX.tick(dt * 1000); this.resTex.needsUpdate = true; }
    this.renderer.render(this.scene, this.camera);
  }
  _desktopCamera(dt, play) {
    const tp = this._tp, tl = this._tl;
    if (play) { tp.set(0, 1.55, 1.15); tl.set(0, 1.2, -5); }
    else { tp.set(Math.sin(this.t * 0.07) * 1.4, 1.8, 2.6); tl.set(Math.sin(this.t * 0.05) * 5, 10, -60); }
    const k = 1 - Math.exp(-dt * 3);
    this.camera.position.lerp(tp, k); this.camLook.lerp(tl, k);
    this.camera.lookAt(this.camLook);
  }
  _pointerRays() {
    const p = this.pointer;
    p.po.copy(p.o); p.pd.copy(p.d);
    this.camera.getWorldPosition(p.o);
    p.d.set(p.nx, p.ny, 0.5).unproject(this.camera).sub(p.o).normalize();
    if (p.reset) { p.po.copy(p.o); p.pd.copy(p.d); p.reset = false; }
  }
  _rayAt(o, d, z, out) { const t = (z - o.z) / d.z; out.x = o.x + d.x * t; out.y = o.y + d.y * t; return out; }
  _desktopClaws(dt, active) {
    for (const h of HANDS) { const g = this.claw[h].group; g.visible = active; g.scale.setScalar(1.45); }
    if (!active) return;
    const p = this.pointer, pt = this._rayAt(p.o, p.d, HITZ, this._p);
    pt.x = clamp(pt.x, -2.2, 2.2); pt.y = clamp(pt.y, 0.15, 2.9);
    const side = pt.x < -0.03 ? 'L' : pt.x > 0.03 ? 'R' : this.activeHand;
    this.activeHand = side;
    const th = 0.62, d = 0.35 / Math.cos(th), k = Math.min(1, dt * 10);
    for (const h of HANDS) {
      const c = this.claw[h], g = c.group;
      if (h === side && p.has) {
        const vx = (pt.x - c.lx) / Math.max(dt, 1e-3), vy = (pt.y - c.ly) / Math.max(dt, 1e-3);
        if (!c.wasRest) { c.lean += (clamp(-vx * 0.04, -0.6, 0.6) - c.lean) * k; c.tilt += (clamp(vy * 0.02, -0.3, 0.3) - c.tilt) * k; }
        g.position.set(pt.x, pt.y - d * Math.sin(th), HITZ + 0.35);
        g.rotation.set(th + c.tilt, -pt.x * 0.12, c.lean + (h === 'L' ? 0.55 : -0.55));
        if (c.wasRest) c.fresh = true;
        c.wasRest = false; c.lx = pt.x; c.ly = pt.y;
      } else {
        g.position.lerp(this._v.set(h === 'L' ? -0.78 : 0.78, 0.55, -0.5), Math.min(1, dt * 8));
        g.rotation.set(0.35, 0, h === 'L' ? 0.7 : -0.7);
        c.wasRest = true; c.lean = 0; c.tilt = 0;
      }
    }
  }
  _sampleBlades(dt) {
    for (const h of HANDS) {
      const c = this.claw[h];
      if (!c.group.visible || !c.group.parent) { c.ok = false; continue; }
      for (let b = 0; b < c.n; b++) {
        const m = c.blades[b].matrixWorld;
        for (let k = 0; k < KS; k++) { c.prev[b][k].copy(c.cur[b][k]); c.cur[b][k].copy(c.local[b][k]).applyMatrix4(m); }
      }
      const reset = !c.ok || c.fresh;
      if (reset) { for (let b = 0; b < c.n; b++) for (let k = 0; k < KS; k++) c.prev[b][k].copy(c.cur[b][k]); c.vel.set(0, 0, 0); c.gain = 0; }
      c.ok = true;
      const mid = Math.floor(c.n / 2);
      this._v.subVectors(c.cur[mid][KS - 1], c.prev[mid][KS - 1]).divideScalar(Math.max(dt, 1e-3));
      c.vel.lerp(this._v, 0.5); c.speed = c.vel.length();
      for (let b = 0; b < c.n; b++) {
        const tr = c.trails[b], B = c.cur[b][1], T = c.cur[b][KS - 1];
        if (reset) { for (let i = 0; i < TRAIL; i++) { B.toArray(tr.hb, i * 3); T.toArray(tr.ht, i * 3); } }
        else { tr.hb.copyWithin(3, 0, (TRAIL - 1) * 3); tr.ht.copyWithin(3, 0, (TRAIL - 1) * 3); B.toArray(tr.hb, 0); T.toArray(tr.ht, 0); }
      }
      c.fresh = false;
    }
  }
  _trails() {
    for (const h of HANDS) {
      const c = this.claw[h];
      c.gain += (clamp((c.speed - 1.2) / 3, 0, 1) - c.gain) * 0.3;
      for (const tr of c.trails) {
        tr.mesh.visible = c.ok && c.gain > 0.01 && c.ext > 0.5;
        if (!tr.mesh.visible) continue;
        tr.mesh.material.uniforms.heat.value = c.heat;
        for (let i = 0; i < TRAIL; i++) {
          tr.pos.set(tr.hb.subarray(i * 3, i * 3 + 3), i * 6);
          tr.pos.set(tr.ht.subarray(i * 3, i * 3 + 3), i * 6 + 3);
          const a = c.gain * Math.pow(1 - i / (TRAIL - 1), 1.6);
          tr.alpha[i * 2] = a * 0.15; tr.alpha[i * 2 + 1] = a;
        }
        tr.geo.attributes.position.needsUpdate = true; tr.geo.attributes.alpha.needsUpdate = true;
      }
    }
  }

  /* -------- play */
  _spawn(nd) {
    const n = { ...nd };
    if (n.type === 'bomb') {
      let m = this.bombPool.pop();
      if (!m) { m = new THREE.Group(); m.add(new THREE.Mesh(this.bombGeo, this.bombBody)); m.add(new THREE.LineSegments(this.bombEdges, this.bombEdge)); const hs = new THREE.Sprite(this.bombHalo); hs.scale.set(0.9, 0.9, 1); m.add(hs); this.scene.add(m); }
      n.mesh = m;
    } else {
      let m = this.notePool.pop();
      if (!m) { m = new THREE.Mesh(this.noteGeo); const hs = new THREE.Sprite(); hs.scale.set(1.3, 1.3, 1); m.add(hs); m.userData.halo = hs; this.scene.add(m); }
      m.material = this.noteMats[n.hand][n.dir === 8 ? 'dot' : 'arrow'];
      m.userData.halo.material = this.noteMats[n.hand].halo;
      n.mesh = m;
    }
    n.mesh.visible = true; n.mesh.scale.setScalar(1); n.mesh.rotation.set(0, 0, 0);
    n.a = DIRS[n.dir][0];
    n.x = LANES[n.col]; n.y = this.y0 + n.row * ROWG;
    n.z = HITZ - (n.t - this.song) * this.speed; n.zp = n.z;
    n.done = false; n.cut = false;
    this.live.push(n);
  }
  _release(n) {
    if (!n.mesh) return;
    n.mesh.visible = false;
    (n.type === 'bomb' ? this.bombPool : this.notePool).push(n.mesh);
    n.mesh = null;
  }
  _clearNotes() { for (const n of this.live) this._release(n); this.live = []; }
  _stopAudio() { if (this.src) { try { this.src.stop(); } catch {} this.src.disconnect(); this.src = null; } }
  _play(dt, xr) {
    const song = this.song, look = SPAWN / this.speed;
    if (this.phase === 'countdown' && song >= 0) { this.phase = 'playing'; this.cb.onPhase?.('playing'); this.bannerFade = true; }
    while (this.ni < this.map.length && this.map[this.ni].t - song < look) this._spawn(this.map[this.ni++]);
    for (let i = this.live.length - 1; i >= 0; i--) {
      const n = this.live[i];
      if (!n.cut) {
        n.zp = n.z;
        const dn = n.t - song;
        n.z = HITZ - dn * this.speed;
        const f = clamp(dn / look, 0, 1), j = f > 0.72 ? (f - 0.72) / 0.28 : 0, e = j * j;
        n.mesh.position.set(n.x, n.y - e * 1.4, n.z);
        if (n.type === 'note') { n.mesh.rotation.set(0, 0, n.a + e * Math.PI); n.mesh.scale.setScalar(1 - e * 0.5); }
        else { n.mesh.rotation.y += dt * 2; n.mesh.rotation.x += dt * 1.3; }
        if (!n.done && n.z > 0.45) { n.done = true; if (n.type === 'note') this._miss(n); }
      }
      if (n.cut || n.z > 1.8) { this._release(n); this.live.splice(i, 1); }
    }
    if (!this.paused && this.phase === 'playing') { if (xr) this._hitsVR(); else this._hitsDesktop(dt); }
    if (this.phase === 'playing' && song > this.duration + 0.4) this._finish(false);
  }
  _hitsVR() {
    for (const n of this.live) {
      if (n.done || n.z < -2.8 || n.z > 0.8) continue;
      const nx = n.mesh.position.x, ny = n.mesh.position.y, hb = n.type === 'bomb' ? 0.2 : HB;
      for (const h of HANDS) {
        const c = this.claw[h];
        if (!c.ok) continue;
        let hit = null;
        outer: for (let b = 0; b < c.n; b++) for (let k = 0; k < KS; k++) {
          const P = c.cur[b][k], Q = c.prev[b][k];
          for (let s = 0; s <= 4; s++) {
            const u = s / 4, x = Q.x + (P.x - Q.x) * u, y = Q.y + (P.y - Q.y) * u, z = Q.z + (P.z - Q.z) * u, nz = n.zp + (n.z - n.zp) * u;
            if (Math.abs(x - nx) < hb && Math.abs(y - ny) < hb && Math.abs(z - nz) < hb + 0.08) { hit = { x, y }; break outer; }
          }
        }
        if (hit) { if (n.type === 'bomb') this._bomb(n, h); else this._cut(n, h, c.vel.x, c.vel.y, hit.x, hit.y); break; }
      }
    }
  }
  _hitsDesktop(dt) {
    const p = this.pointer;
    if (!p.has) return;
    for (const n of this.live) {
      if (n.done || Math.abs(n.z - HITZ) > this.win) continue;
      const a = this._rayAt(p.po, p.pd, n.z, this._a), b = this._rayAt(p.o, p.d, n.z, this._b);
      const dx = b.x - a.x, dy = b.y - a.y;
      if (dx * dx + dy * dy < 1e-6) continue;
      const nx = n.mesh.position.x, ny = n.mesh.position.y;
      const cp = closestOnSeg(a.x, a.y, b.x, b.y, nx, ny);
      if (n.type === 'bomb') { if (Math.hypot(cp.x - nx, cp.y - ny) < 0.2) this._bomb(n, nx < 0 ? 'L' : 'R'); continue; }
      if (segRect(a.x, a.y, b.x, b.y, nx - HB, ny - HB, nx + HB, ny + HB)) this._cut(n, n.hand, dx / dt, dy / dt, cp.x, cp.y);
    }
  }
  _cut(n, h, vx, vy, hx, hy) {
    const d = DIRS[n.dir], sp = Math.hypot(vx, vy);
    let good = h === n.hand, cx, cy;
    if (n.dir !== 8) {
      cx = d[1]; cy = d[2];
      const dot = sp > 1e-3 ? (vx * cx + vy * cy) / sp : 0;
      if (dot < 0.3 || sp < this.minSp) good = false;
    } else if (sp > 1e-3) { cx = vx / sp; cy = vy / sp; } else { cx = 0; cy = -1; }
    n.done = true; n.cut = true;
    const { x: nx, y: ny, z: nz } = n.mesh.position;
    this._pieces(nx, ny, nz, cx, cy, good ? this.handCol[n.hand] : this.badCol);
    this._burst(nx, ny, nz, cx, cy, good ? this.handCol[n.hand] : this.badCol, good ? 4 : 3, good ? 1 : 0.6);
    if (good) this._flash(nx, ny, nz, this.handCol[n.hand]);
    const cl = this.claw[h];
    if (good) { cl.flash = 1; this._sparks(hx, hy, nz, cx * 2.4, cy * 2.4 + 0.6, 1.4, 3.2, this.handCol[n.hand], 18, 0.55); }
    else { cl.glitch = 1; this._sparks(nx, ny, nz, 0, 0.4, 0.8, 1.6, this.badCol, 8, 0.4); }
    if (good) {
      const spF = clamp((sp - this.spMin) / this.spRange, 0, 1);
      const ctr = 1 - clamp(Math.abs((hx - nx) * cy - (hy - ny) * cx) / HB, 0, 1);
      this._good(Math.round(40 + 45 * spF + 30 * ctr));
      this._sfxHit(nx * 0.6, true); this._haptic(h, 0.5, 35);
    } else {
      this.bad++; this._break(0.1); this._missSprite(nx, ny, nz);
      this._sfxHit(nx * 0.6, false); this._haptic(h, 0.9, 70);
    }
  }
  _bomb(n, h) {
    n.done = true; n.cut = true;
    const { x, y, z } = n.mesh.position;
    this._burst(x, y, z, 0, -1, this.world.light ? this.world.left : this.world.text, 5, 1.6);
    this._flash(x, y, z, this.world.left);
    this.claw[h].glitch = 1.6;
    this._sparks(x, y, z, 0, 1, 1, 5, this.world.light ? this.world.left : this.world.text, 30, 0.7);
    this.bombs++; this._break(0.15); this._sfxBomb(); this._haptic(h, 1, 160);
  }
  _miss(n) { this.misses++; this._break(0.1); this._missSprite(n.mesh.position.x, n.mesh.position.y, n.mesh.position.z); }
  _good(pts) {
    this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.prog++;
    if (this.lvl < 3 && this.prog >= NEED[this.lvl]) { this.lvl++; this.prog = 0; if (this.lvl === 3) this._pop('X8'); }
    this.score += pts * MULT[this.lvl];
    this.hits++; this.cutSum += pts;
    this.energy = Math.min(1, this.energy + 0.015);
    if (COMBO_POPS.includes(this.combo)) this._pop(`COMBO ${this.combo}`);
  }
  _break(amt) {
    this.combo = 0; this.lvl = Math.max(0, this.lvl - 1); this.prog = 0;
    this.energy = Math.max(0, this.energy - amt);
    if (this.energy <= 0 && !this.noFail) this._finish(true);
  }
  _finish(failed) {
    if (this.phase === 'results') return;
    this.phase = 'results';
    if (failed) {
      const now = this.actx.currentTime;
      this.musicGain.gain.setTargetAtTime(0, now, 0.25);
      const src = this.src; this.src = null;
      setTimeout(() => { try { src?.stop(); } catch {} src?.disconnect(); }, 1400);
    } else this._stopAudio();
    this._clearNotes();
    this.hud.visible = false; this._hideBanner();
    const total = this.noteCount;
    const q = total ? (this.hits / total) * 0.75 + (this.hits ? this.cutSum / this.hits / 115 : 0) * 0.25 : 0;
    const r = {
      score: this.score, maxCombo: this.maxCombo, hits: this.hits, misses: this.misses, bad: this.bad, bombs: this.bombs, total, failed,
      fc: !failed && total > 0 && this.hits === total,
      progress: clamp(this.song / this.duration, 0, 1), acc: total ? this.hits / total : 0,
      rank: failed ? 'F' : q >= 0.93 ? 'S' : q >= 0.83 ? 'A' : q >= 0.7 ? 'B' : q >= 0.55 ? 'C' : 'D',
      title: this.track.title, artist: this.track.artist, file: this.track.file,
      world: this.world.name, diff: DIFF_LABEL[this.diff], bpm: Math.round(this.an?.bpm || 0),
    };
    this.results = r;
    if (this.renderer.xr.isPresenting) this._showVRResults(r);
    this.cb.onEnd?.(r);
    this.cb.onPhase?.('results');
  }
  _showVRResults(r) {
    this.resGroup.visible = true; this.menuOn = true; this.menuT = 0;
    const w = this.world, x = this.resCanvas.getContext('2d');
    x.fillStyle = w.f[0]; x.fillRect(0, 0, 1024, 640);
    this.resTex.needsUpdate = true;
    const run = (names) => {
      if (this.phase !== 'results' || !this.resGroup.visible) return;
      const list = (r.failed ? FAIL_FX : r.fc || r.rank === 'S' ? BIG_FX : WIN_FX).filter((n) => names.includes(n));
      this.resFX?.stop();
      this.resFX = runFX(this.resCanvas, { text: resultsText(r), effects: list, loop: true, fixed: true, manual: true, bg: w.f[0], ramp: w.f.slice(1), maxCell: 11, fit: 0.92, fitH: 0.85 });
    };
    loadFX().then(run).catch(() => {
      x.fillStyle = w.f[3]; x.font = `600 44px ${FONT}`; x.textAlign = 'center';
      x.fillText(r.failed ? 'BATTERY DEPLETED' : `RANK ${r.rank}`, 512, 260);
      x.font = `500 30px ${FONT}`; x.fillText(`${r.score.toLocaleString('en-US')} · combo ${r.maxCombo}`, 512, 330);
      this.resTex.needsUpdate = true;
    });
  }
  _hideVRResults() { this.resGroup.visible = false; this.menuOn = false; this.resFX?.stop(); this.resFX = null; }
  _menu(dt) {
    this.menuT += dt;
    this.menu.forEach((m, i) => { m.mesh.position.y = 1.1 + Math.sin(this.t * 2 + i) * 0.03; m.mesh.rotation.y = Math.sin(this.t + i) * 0.15; });
    if (this.menuT < 1.2) return;
    for (const m of this.menu) {
      const P = m.mesh.position;
      for (const h of HANDS) {
        const c = this.claw[h];
        if (!c.ok) continue;
        for (let b = 0; b < c.n; b++) for (let k = 0; k < KS; k++) {
          const A = c.cur[b][k], Q = c.prev[b][k];
          for (let s = 0; s <= 3; s++) {
            const u = s / 3, x = Q.x + (A.x - Q.x) * u, y = Q.y + (A.y - Q.y) * u, z = Q.z + (A.z - Q.z) * u;
            if (Math.abs(x - P.x) < 0.24 && Math.abs(y - P.y) < 0.24 && Math.abs(z - P.z) < 0.24) {
              this._burst(P.x, P.y, P.z, 0, -1, m.color, 5, 1.4); this._flash(P.x, P.y, P.z, m.color);
              this._sfxHit(P.x, true); this._haptic(h, 0.6, 50);
              this._hideVRResults();
              this.cb.onMenu?.(m.action);
              return;
            }
          }
        }
      }
    }
  }

  /* -------- fx */
  _pieces(x, y, z, cx, cy, color, scale = 1) {
    const n = this.opts.blades + 1, w = (NOTE * scale) / n, px = -cy, py = cx, ang = Math.atan2(cy, cx) + Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const p = this.pieces.find((q) => q.age >= q.life) || this.pieces[0];
      const off = (i - (n - 1) / 2) * w;
      p.mesh.position.set(x + px * off, y + py * off, z);
      p.mesh.rotation.set(0, 0, ang);
      p.mesh.scale.set(w * 0.92, NOTE * scale, NOTE * scale);
      p.mat.color.set(color); p.mat.opacity = 1;
      const s = (i - (n - 1) / 2) * 1.6;
      p.v.set(px * s + cx * 0.9, py * s + cy * 0.9 + 0.5, 1.5 + Math.random());
      p.w.set((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      p.age = 0; p.life = 0.45; p.mesh.visible = true;
    }
  }
  _missSprite(x, y, z) {
    const sp = this.sprites.find((q) => q.age >= 1) || this.sprites[0];
    sp.s.position.set(x, y + 0.3, z); sp.age = 0; sp.s.visible = true;
  }
  _fx(dt) {
    for (const p of this.pieces) {
      if (p.age >= p.life) continue;
      p.age += dt;
      if (p.age >= p.life) { p.mesh.visible = false; continue; }
      p.v.y -= 4 * dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.rotation.x += p.w.x * dt; p.mesh.rotation.y += p.w.y * dt; p.mesh.rotation.z += p.w.z * dt;
      p.mat.opacity = 1 - p.age / p.life;
    }
    for (const f of this.flashes) {
      if (f.age >= 1) continue;
      f.age += dt * 3.5;
      if (f.age >= 1) { f.s.visible = false; continue; }
      const sc = 0.5 + f.age * 1.9; f.s.scale.set(sc, sc, 1); f.s.material.opacity = 1 - f.age;
    }
    for (const sp of this.sprites) {
      if (sp.age >= 1) continue;
      sp.age += dt * 1.6;
      if (sp.age >= 1) { sp.s.visible = false; continue; }
      sp.s.position.y += dt * 0.4;
      sp.s.material.opacity = 1 - sp.age;
    }
  }
  _env(dt, active) {
    const tb = active ? this.song : this.t;
    let period = 0.75, b0 = 0;
    if (active && this.an) { period = this.an.period; b0 = this.an.beats[0]?.t || 0; }
    let bass = 0.3 + 0.12 * Math.sin(this.t * 1.7);
    if (active && this.src) { this.analyser.getByteFrequencyData(this.freq); let s = 0; for (let i = 1; i < 7; i++) s += this.freq[i]; bass = s / (6 * 255); }
    this.bass += (bass - this.bass) * Math.min(1, dt * 14);
    const F = this._F;
    this.edgeMat.color.copy(F[2]).lerp(F[3], clamp(this.bass * 1.2 - 0.1, 0, 1));
    for (let i = 0; i < this.ringMats.length; i++) {
      let ph = ((tb - b0 - i * 0.045) / period) % 1;
      if (ph < 0) ph += 1;
      this.ringMats[i].color.copy(F[1]).lerp(F[3], Math.exp(-ph * period * 6) * (active ? 0.7 : 0.4));
    }
    const U = this.fieldU, dimT = active ? 0.72 : 1;
    U.time.value = this.t;
    U.dim.value += (dimT - U.dim.value) * Math.min(1, dt * 2);
    U.pulse.value = active ? clamp(this.bass * 1.4 - 0.3, 0, 1) : 0;
    const pa = this.dust.geometry.attributes.position, sp = dt * (0.5 + this.bass * 3);
    for (let i = 0; i < pa.count; i++) { let z = pa.getZ(i) + sp; if (z > 6) z -= 50; pa.setZ(i, z); }
    pa.needsUpdate = true;
  }

  /* -------- hud + banner */
  _drawHud() {
    const s = this, key = [s.score, s.combo, s.lvl, Math.round(s.energy * 100), Math.floor(Math.max(0, s.song))].join('|');
    if (key === s._hudKey) return;
    s._hudKey = key;
    const w = this.world, x = this.hudCtx, W = 1600, H = 88, cy = H / 2 + 2;
    x.clearRect(0, 0, W, H);
    x.globalAlpha = 0.94; x.fillStyle = w.bg; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
    x.strokeStyle = w.bstr; x.lineWidth = 2; x.strokeRect(1, 1, W - 2, H - 2);
    x.textBaseline = 'middle';
    let px = 16;
    x.font = `600 30px ${FONT}`;
    for (let i = 0; i < 4; i++) {
      const bw = 46;
      if (i === s.lvl) { x.fillStyle = w.brand; x.fillRect(px, 14, bw, H - 28); x.fillStyle = w.ink; }
      else x.fillStyle = i < s.lvl ? w.text : w.muted;
      x.textAlign = 'center'; x.fillText(String(i + 1), px + bw / 2, cy);
      px += bw + 4;
    }
    x.textAlign = 'left'; x.fillStyle = w.brand; x.fillText(`×${MULT[s.lvl]}`, px + 14, cy);
    x.fillStyle = w.muted; x.font = `500 26px ${FONT}`; x.fillText(`${fmtTime(s.song)} / ${fmtTime(s.duration)}`, px + 96, cy);
    x.textAlign = 'center'; x.fillStyle = w.text2;
    let label = `${s.track.title} — ${s.track.artist}`;
    while (x.measureText(label).width > 560 && label.length > 4) label = label.slice(0, -2);
    if (label !== `${s.track.title} — ${s.track.artist}`) label += '…';
    x.fillText(label, W / 2 + 40, cy);
    // battery
    const bx = W - 18 - 64, by = 26, bw2 = 56, bh = 36;
    x.strokeStyle = w.text; x.lineWidth = 3; x.strokeRect(bx, by, bw2, bh); x.fillStyle = w.text; x.fillRect(bx + bw2, by + 11, 6, 14);
    x.fillStyle = s.energy < 0.25 ? w.left : w.brand; x.fillRect(bx + 5, by + 5, (bw2 - 10) * s.energy, bh - 10);
    x.textAlign = 'right'; x.font = `600 30px ${FONT}`; x.fillStyle = w.text;
    let rx = bx - 14;
    x.fillText(`${Math.round(s.energy * 100)}%`, rx, cy);
    rx -= 112;
    x.fillText(s.score.toLocaleString('en-US'), rx, cy);
    rx -= x.measureText(s.score.toLocaleString('en-US')).width + 30;
    x.fillStyle = w.muted; x.font = `500 26px ${FONT}`; x.fillText(`combo ${s.combo}`, rx, cy);
    this.hudTex.needsUpdate = true;
  }
  _bannerText(str) {
    this.popFX?.stop(); this.popFX = null;
    const x = this.banCtx;
    x.clearRect(0, 0, 1024, 256);
    drawPixelString(x, str, this.world.f[3], 1024, 256);
    this.banTex.needsUpdate = true;
    this.banner.visible = true; this.banner.material.opacity = 1;
    this.bannerFade = false; this.bannerHold = 0;
  }
  _pop(text) {
    if (!this.fxNames) return;
    this.popFX?.stop();
    const fx = POP_FX.filter((n) => this.fxNames.includes(n));
    this.popFX = runFX(this.banCanvas, {
      text: pixelText(text), effects: [fx[Math.floor(Math.random() * fx.length)] || 'decrypt'],
      fixed: true, manual: true, bg: null, ramp: this.world.f.slice(1), speed: 3.2, maxCell: 16, fit: 0.92,
      onDone: () => { this.bannerHold = 0.7; },
    });
    this.banner.visible = true; this.banner.material.opacity = 1; this.bannerFade = false; this.bannerHold = 0;
  }
  _hideBanner() { this.popFX?.stop(); this.popFX = null; this.banner.visible = false; this.bannerFade = false; }
  _banner(dt) {
    if (this.phase === 'countdown') {
      const n = Math.ceil(-this.song);
      if (n !== this.lastCount && n >= 1 && n <= 3) { this.lastCount = n; this._bannerText(String(n)); this._sfxTick(); }
      if (this.song > -0.45 && !this.shinged) { this.shinged = true; this._sfxShing(); this._clawsExtend(true); }
    }
    if (!this.banner.visible || this.paused) return;
    if (this.popFX) { this.popFX.tick(dt * 1000); this.banTex.needsUpdate = true; }
    if (this.bannerHold > 0) { this.bannerHold -= dt; if (this.bannerHold <= 0) this.bannerFade = true; }
    if (this.bannerFade) {
      const m = this.banner.material;
      m.opacity -= dt * 3;
      if (m.opacity <= 0) this._hideBanner();
    }
  }

  /* -------- sound + haptics */
  _haptic(h, v, ms) { this.ctrl[h]?.userData.src?.gamepad?.hapticActuators?.[0]?.pulse?.(v, ms); }
  _pan(p) { const c = this.actx; if (!c.createStereoPanner) return this.sfx; const n = c.createStereoPanner(); n.pan.value = clamp(p, -1, 1); n.connect(this.sfx); return n; }
  _sfxHit(pan, good) {
    const c = this.actx, t = c.currentTime, out = this._pan(pan);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = good ? 6500 : 2200; f.Q.value = 1.4;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(good ? 0.9 : 0.6, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.3, 0.12);
    const o = c.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(good ? 3200 : 700, t); o.frequency.exponentialRampToValueAtTime(good ? 2100 : 380, t + 0.15);
    const og = c.createGain(); og.gain.setValueAtTime(good ? 0.12 : 0.1, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(og).connect(out); o.start(t); o.stop(t + 0.22);
  }
  _sfxShing() {
    const c = this.actx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3; f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(9000, t + 0.3);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.7, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    s.connect(f).connect(g).connect(this.sfx); s.start(t, 0, 0.45);
  }
  _sfxTick() {
    const c = this.actx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'square'; o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.1);
  }
  _sfxBomb() {
    const c = this.actx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.4);
    g.gain.setValueAtTime(0.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.5);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g2 = c.createGain(); g2.gain.setValueAtTime(0.5, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    s.connect(f).connect(g2).connect(this.sfx); s.start(t, 0, 0.4);
  }
  _xrEnd() {
    this.session = null;
    for (const h of HANDS) { const c = this.claw[h]; this.scene.add(c.group); c.group.visible = false; c.fresh = true; }
    this.ctrl = { L: null, R: null };
    this._hideVRResults();
    this.camera.position.set(0, 1.9, 2.6); this.camera.rotation.set(0, 0, 0);
    if (this.phase !== 'lobby') this.quit();
    this._resize();
    this.cb.onXR?.(false);
  }
}

