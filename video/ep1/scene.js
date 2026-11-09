// Серия 1 «Рождение» (~4 мин). Детерминированная сцена: window.renderAt(t) рисует кадр для момента t (с).
// Тайминги фраз — timings.json (video/align.py), липсинк — lipsync.json (video/lipsync.py).
import {
  SPRITE_W, SPRITE_H, ROOM_W, ROOM_H, BITIK_X, BITIK_Y, FOOD_W, FLOOR_Y,
  drawSprite, drawRoom, drawFood, countPixels, spriteGrid, PALETTES,
} from "../../site/js/bitik.js";
import { loadHost, drawPose } from "./host.js";

const W = 1920, H = 1080;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");

const IO = 0.5;      // старт озвучки интро
const BO = 31.5;     // старт части «создание»
const GAP = 0.7;     // пауза между блоками
const ORDER = ["rules", "pixels", "sprout", "room", "hunger", "button", "test", "outro"];
let BLK = {};        // id → { start, end, ph: [{t0, t1, cap}] } в абсолютном времени
let DURATION = 60;
let LIPS = null;
let TRACKS = [];

// ── утилиты ─────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (T, a, b) => clamp((T - a) / (b - a));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const win = (T, a, b, f = 0.25) => clamp(Math.min((T - a) / f, (b - T) / f));
const lerp = (a, b, p) => a + (b - a) * p;
const RED = "#ff4d5e";
const P = (id, i) => BLK[id].ph[Math.min(i, BLK[id].ph.length - 1)].t0;
const PE = (id, i) => BLK[id].ph[Math.min(i, BLK[id].ph.length - 1)].t1;
const S = id => BLK[id].start;
const E = id => BLK[id].end;
function phase(T, id) { // индекс текущей фразы блока (−1 до начала)
  const ph = BLK[id].ph; let k = -1;
  for (let i = 0; i < ph.length; i++) if (T >= ph[i].t0 - 0.05) k = i;
  return k;
}
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function text(str, x, y, o = {}) {
  const {
    size = 64, weight = 900, family = "Unbounded", color = "#fff",
    glow = "rgba(255,70,90,.5)", blur = 28, align = "center",
    alpha = 1, scale = 1, spacing = 0, baseline = "middle",
  } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.letterSpacing = spacing + "px";
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur; }
  ctx.fillStyle = color;
  ctx.fillText(str, 0, 0);
  ctx.shadowBlur = 0;
  ctx.fillText(str, 0, 0);
  ctx.restore();
}
const mono = (str, x, y, o = {}) => text(str, x, y, { family: "JetBrains Mono", weight: 700, glow: null, ...o });
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

function hexMix(a, b, k) {
  const pa = [1, 3, 5].map(i => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map(i => parseInt(b.slice(i, i + 2), 16));
  return "#" + pa.map((v, i) => Math.round(lerp(v, pb[i], k)).toString(16).padStart(2, "0")).join("");
}
const mixPal = (a, b, k) => Object.fromEntries(Object.keys(a).map(c => [c, hexMix(a[c], b[c], k)]));

// пиксельные спрайты
const spriteBuf = new OffscreenCanvas(SPRITE_W, SPRITE_H);
const sctx = spriteBuf.getContext("2d");
function bitik(mood, cx, bottom, scale, o = {}) {
  const { alpha = 1, limit, blink = false, palette, glitch = 0 } = o;
  sctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  drawSprite(sctx, mood, 0, 0, { blink, limit, palette });
  const w = SPRITE_W * scale, h = SPRITE_H * scale;
  const x = Math.round(cx - w / 2), y = Math.round(bottom - h);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;
  if (glitch) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.filter = "hue-rotate(140deg)"; ctx.drawImage(spriteBuf, x - glitch, y, w, h);
    ctx.filter = "hue-rotate(-90deg)"; ctx.drawImage(spriteBuf, x + glitch, y, w, h);
    ctx.filter = "none"; ctx.globalAlpha = alpha;
  }
  ctx.drawImage(spriteBuf, x, y, w, h);
  ctx.restore();
  return { x, y, w, h };
}
const bob = (T, mood, s = 1) => (mood === "sad" ? 0 : (Math.floor(T * (mood === "happy" ? 4 : 2)) % 2 ? -s : 0));

function heart(x, y, s, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#f29bb8";
  for (const [dx, dy] of [[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
  ctx.restore();
}
function bigHeart(cx, cy, s, alpha) {
  const M = [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."];
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = "#e2445c"; ctx.shadowColor = "#ff2040"; ctx.shadowBlur = 40;
  M.forEach((r, y) => [...r].forEach((c, x) => { if (c === "X") ctx.fillRect(cx + (x - 3.5) * s, cy + (y - 3) * s, s, s); }));
  ctx.shadowBlur = 0; ctx.fillStyle = "#ff9aa8"; ctx.fillRect(cx - 2.5 * s, cy - 2 * s, s, s);
  ctx.restore();
}
function sproutIcon(x, y, s) {
  ctx.fillStyle = "#6fd36b";
  for (const [dx, dy] of [[0,0],[1,0],[3,0],[4,0],[1,1],[3,1]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
  ctx.fillStyle = "#3f8f4a";
  for (const [dx, dy] of [[2,1],[2,2],[2,3]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
}
function appleAt(x, y, s) {
  const b = new OffscreenCanvas(FOOD_W, 7);
  drawFood(b.getContext("2d"), 0, 0);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(b, x, y, FOOD_W * s, 7 * s); ctx.restore();
}
function cursor(x, y, a, clickT, T) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 40); ctx.lineTo(22, 37); ctx.lineTo(15, 23); ctx.lineTo(26, 23); ctx.closePath();
  ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2.5; ctx.stroke();
  for (const c of [].concat(clickT || [])) {
    if (T >= c && T < c + 0.35) {
      const d = (T - c) / 0.35;
      ctx.strokeStyle = `rgba(255,90,110,${1 - d})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 10 + 40 * d, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
}
function codeBox(x, y, w, lines, typedFrac, a, size = 26) {
  if (a <= 0) return;
  const lh = size * 1.7;
  ctx.save(); ctx.globalAlpha = a;
  rr(x, y, w, 30 + lines.length * lh, 12);
  ctx.fillStyle = "rgba(12,8,12,.94)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,70,90,.35)"; ctx.lineWidth = 2; ctx.stroke();
  const total = lines.flat().reduce((n, [s]) => n + s.length, 0);
  let left = Math.floor(total * typedFrac);
  ctx.font = `400 ${size}px "JetBrains Mono"`; ctx.textBaseline = "middle";
  lines.forEach((ln, i) => {
    let cx = x + 24;
    for (const [s, col] of ln) {
      ctx.fillStyle = col; ctx.fillText(s.slice(0, Math.max(0, left)), cx, y + 15 + lh * (i + .5));
      left -= s.length; cx += ctx.measureText(s).width;
    }
  });
  ctx.restore();
}

// ── фон, HUD ────────────────────────────────────────────────────────
function background(T) {
  ctx.fillStyle = "#050306"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,80,100,.045)"; ctx.lineWidth = 1; ctx.beginPath();
  const off = (T * 6) % 64;
  for (let x = -64 + off; x < W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const g = ctx.createRadialGradient(760, 980, 50, 760, 980, 950);
  g.addColorStop(0, "rgba(130,10,28,.42)"); g.addColorStop(1, "rgba(130,10,28,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // плавающая пыль
  const r = rng(7);
  ctx.fillStyle = "rgba(255,120,130,.35)";
  for (let i = 0; i < 40; i++) {
    const x = (r() * W + T * (8 + r() * 14)) % W, y = (r() * H - T * (6 + r() * 10) + H * 10) % H;
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(T * 2 + i);
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.62)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const H48 = 48 * 3600, END_SECS = 40 * 3600 + 12 * 60 + 37, GO = IO + 25.1;
function timerSecs(T) {
  if (T < GO) return H48;
  if (T < BO) return H48 - (T - GO);
  const s0 = H48 - (BO - GO);
  return s0 + (END_SECS - s0) * ease(prog(T, BO, P("outro", 7)));
}
const fmt = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };
function hud(T) {
  const a = clamp((T - 0.3) / 0.4);
  mono("ТАЙМЕР", 72, 58, { size: 15, color: "rgba(255,70,90,.6)", align: "left", alpha: a, spacing: 3 });
  text(fmt(timerSecs(T)), 72, 92, { size: 34, family: "JetBrains Mono", weight: 700, color: RED, align: "left", alpha: a, blur: 18, spacing: 2 });
  // прогресс по блокам
  if (T > BO) {
    const k = ORDER.findIndex(id => T < E(id) + GAP);
    ORDER.forEach((id, i) => {
      ctx.fillStyle = i < k || k < 0 ? "rgba(255,77,94,.9)" : i === k ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.15)";
      ctx.fillRect(72 + i * 26, 118, 20, 4);
    });
  }
}

// ── ведущий ─────────────────────────────────────────────────────────
// Режимы раскладки: talk — ведущий крупно справа; panel — окно слева, ведущий меньше.
const LAYOUT = { talk: { x: 1380, s: 2.0 }, panel: { x: 1590, s: 1.62 }, title: { x: 1440, s: 2.0 } };
const BLOCK_MODE = { rules: "talk", pixels: "panel", sprout: "panel", room: "panel", hunger: "panel", button: "panel", test: "panel", outro: "talk" };
const BLOCK_POSES = {
  rules:  [[0, "P1"], [1, "Q1"], [3, "P4"], [4, "P5"], [6, "Q4"]],
  pixels: [[0, "P4"], [3, "P1"], [4, "Q1"], [9, "Q5"], [10, "P4"]],
  sprout: [[0, "P2"], [1, "P1"], [3, "Q1"], [6, "P5"], [8, "Q4"]],
  room:   [[0, "P2"], [2, "Q2"], [3, "P1"], [4, "Q5"], [5, "P1"], [7, "Q1"]],
  hunger: [[0, "P1"], [2, "Q1"], [4, "P3"], [5, "Q2"], [7, "P4"], [8, "Q4"], [9, "P5"]],
  button: [[0, "Q1"], [2, "P1"], [4, "P4"], [6, "Q4"], [8, "Q3"]],
  test:   [[0, "P1"], [3, "Q1"], [6, "Q5"], [7, "Q2"], [9, "P4"]],
  outro:  [[0, "P1"], [2, "P5"], [3, "Q4"], [4, "Q1"], [7, "P6"], [8, "P1"]],
};
let TRACK = [];
function buildTrack() {
  const t = [
    { p: "P1", t0: 0.0, x: 1440, s: 2.0, enter: "fade" },          // «У меня сорок восемь часов»
    { p: "P4", t0: 3.0, x: 1440, s: 2.05, enter: "cut" },          // «…ОДНО. На весь интернет»
    { p: null, t0: 8.55 },                                         // Битик в кадре один
    { p: "P5", t0: IO + 15.9, x: 1480, s: 2.0, enter: "slide" },   // «А если про него забудут совсем…»
    { p: "P2", t0: IO + 17.95, x: 1420, s: 2.0, enter: "cut" },    // «…изменится. Навсегда.»
    { p: null, t0: IO + 20.9 },                                    // 1 САЙТ = 48:00
    { p: "Q1", t0: IO + 24.9, x: 1440, s: 2.0, enter: "cut" },     // «Поехали»
    { p: "Q6", t0: IO + 26.85, x: 1460, s: 2.0, enter: "cut" },    // заставка, спиной
  ];
  for (const id of ORDER) {
    const L = LAYOUT[BLOCK_MODE[id]];
    BLOCK_POSES[id].forEach(([i, p], k) => {
      t.push({ p, t0: (k === 0 ? S(id) - 0.35 : P(id, i) - 0.12), x: L.x, s: L.s, enter: k === 0 && id === "rules" ? "slide" : "cut" });
    });
  }
  t.push({ p: null, t0: DURATION + 5 });
  for (let i = 0; i < t.length - 1; i++) t[i].t1 = t[i + 1].t0;
  TRACK = t.filter(s => s.p);
}
function mouthLevel(T) {
  if (!LIPS) return 0;
  let m = 0;
  for (const tr of TRACKS) {
    const s = LIPS.tracks[tr.key]; if (!s) continue;
    const i = Math.floor((T - tr.t) * LIPS.fps);
    if (i >= 0 && i < s.length) m = Math.max(m, +s[i]);
  }
  return m;
}
function drawHost(T, punchAmt) {
  const m = mouthLevel(T);
  for (const seg of TRACK) {
    if (T < seg.t0 - 0.01 || T > seg.t1 + 0.35) continue;
    const next = TRACK.find(s => Math.abs(s.t0 - seg.t1) < 0.02);
    let alpha = 1, dx = 0;
    if (seg.enter === "slide") { const k = easeOut(prog(T, seg.t0, seg.t0 + 0.45)); alpha = k; dx = (1 - k) * 180; }
    else if (seg.enter === "fade") alpha = prog(T, seg.t0, seg.t0 + 0.8);
    if (T > seg.t1) {
      if (next) continue;
      const k = prog(T, seg.t1, seg.t1 + 0.35); alpha *= 1 - k; dx += k * 160;
    }
    const settle = seg.enter === "cut" ? (1 - easeOut(clamp((T - seg.t0) / 0.35))) * 0.045 : 0;
    drawPose(ctx, seg.p, {
      screenX: seg.x + dx, scale: seg.s * (1 + settle + punchAmt), alpha,
      dy: 4 + Math.sin(T * 1.7) * 4 + m * 2.5, mouth: m,
    });
  }
}
function hostFlash(T) {
  let f = 0;
  for (const s of TRACK) if (s.enter === "cut") { const d = T - s.t0; if (d >= 0 && d < 0.16) f = Math.max(f, 0.07 * (1 - d / 0.16)); }
  if (f > 0) { ctx.fillStyle = `rgba(255,40,60,${f})`; ctx.fillRect(0, 0, W, H); }
}

// ── субтитры ────────────────────────────────────────────────────────
const C = (t, s, o = {}) => ({ t, s, ...o });
const GREEN = { color: "#9dff8a", glow: "rgba(111,211,107,.7)" };
const GREY = { color: "#b9c3e6", glow: "rgba(125,134,168,.7)" };
const REDC = { color: "#ffd2d8", glow: "rgba(255,70,100,.85)", blur: 40 };
let CAPTIONS = [];
const CAP_STYLE = {
  "СЧАСТЛИВ": GREEN, "+15%": GREEN, "СЕРДЕЧКИ": GREEN, "55% — СЧАСТЛИВ": GREEN, "РАБОТАЕТ": GREEN, "БИТИК ЖИВЁТ": GREEN,
  "КОРМИТЬ БУДЕТЕ ВЫ": GREEN, "РАСКРЫТ — СЧАСТЛИВ": GREEN, "ПОНИК — ГРУСТИТ": GREY, "0% — ГРУСТНО": GREY,
  "ПЛОХО БУДЕТ ВСЕМ": GREY, "ОДНА ЖИЗНЬ": REDC, "ГЛАВНАЯ ПРОБЛЕМА": REDC,
};
function buildCaptions() {
  const g = [
    { pos: [620, 950], end: IO + 8.1, items: [C(IO + 2.77, "СОЗДАТЬ САЙТ"), C(IO + 4.2, "ГДЕ ЖИВЁТ СУЩЕСТВО"), C(IO + 6.05, "ОДНО", { size: 150 }), C(IO + 7.05, "НА ВЕСЬ ИНТЕРНЕТ")] },
    { pos: [620, 950], end: IO + 11.6, items: [C(IO + 8.75, "ЭТО БИТИК"), C(IO + 9.83, "ИЗ БИТОГО ПИКСЕЛЯ")] },
    { pos: [620, 950], end: IO + 15.9, items: [C(IO + 12.02, "ПОКОРМИТЕ"), C(IO + 12.9, "СЧАСТЛИВ", GREEN), C(IO + 14.0, "ЗАБУДЕТЕ"), C(IO + 14.8, "ЗАГРУСТИТ", GREY)] },
    { pos: [620, 950], end: IO + 20.9, items: [C(IO + 16.24, "ЗАБУДУТ СОВСЕМ"), C(IO + 18.53, "ИЗМЕНИТСЯ"), C(IO + 19.86, "НАВСЕГДА", { ...REDC, size: 110 })] },
  ];
  for (const id of ORDER) {
    const talk = BLOCK_MODE[id] === "talk";
    g.push({
      pos: talk ? [560, 975] : [605, 1015], size: talk ? 60 : 48, end: E(id) + 0.2,
      items: BLK[id].ph.map(p => C(p.t0, p.cap, CAP_STYLE[p.cap] || {})),
    });
  }
  CAPTIONS = g;
}
function captions(T) {
  for (const g of CAPTIONS) {
    if (T < g.items[0].t || T > g.end + 0.2) continue;
    let cur = null;
    for (const it of g.items) if (T >= it.t) cur = it;
    if (!cur) continue;
    const pop = easeOut(prog(T, cur.t, cur.t + 0.16));
    let size = cur.size || g.size || 66;
    ctx.font = `900 ${size}px "Unbounded"`;
    const maxW = (g.pos[0] - 50) * 2;
    const wpx = ctx.measureText(cur.s).width;
    if (wpx > maxW) size = Math.floor(size * maxW / wpx);
    text(cur.s, g.pos[0], g.pos[1], {
      size, color: cur.color, glow: cur.glow || "rgba(255,70,90,.5)",
      blur: cur.blur || 26, scale: 1 + 0.22 * (1 - pop), alpha: pop * clamp((g.end + 0.2 - T) / 0.2),
    });
  }
}
let PUNCHES = [];
function punch(T) {
  let p = 0;
  for (const t of PUNCHES) { const d = T - t; if (d >= 0 && d < 0.4) p = Math.max(p, 0.03 * (1 - d / 0.4)); }
  return p;
}

// ── интро (как в первой версии) ────────────────────────────────────
const BX = 600, BB = 840, BS = 16, TOTAL_PX = countPixels("normal");
function introBitik(T) {
  const a = win(T, IO + 8.6, IO + 21.1, 0.3);
  if (a <= 0) return;
  const tBorn = IO + 8.75, tAssemble = IO + 9.15;
  if (T < tAssemble) {
    if (T < tBorn) return;
    const f = Math.floor(T * 20);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = f % 3 ? (f % 2 ? "#ff3df2" : "#7de3ff") : "#fff";
    ctx.shadowColor = RED; ctx.shadowBlur = 30; ctx.fillRect(BX - BS / 2, BB - 9 * BS, BS, BS); ctx.restore();
    return;
  }
  const limit = Math.floor(TOTAL_PX * easeOut(prog(T, tAssemble, IO + 10.8)));
  let mood = "normal", glitch = 0;
  const tFood = IO + 12.02, tEat = IO + 12.75, tForget = IO + 14.0;
  if (T >= tEat && T < tForget) mood = "happy";
  if (T >= tForget) mood = "sad";
  if (T >= IO + 18.53 && T < IO + 19.4) glitch = Math.floor(T * 30) % 2 ? 10 : -6;
  if (T >= IO + 19.86 && T < IO + 20.3) glitch = 14;
  ctx.save(); ctx.globalAlpha = a * .5; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(BX, BB + 6, 110, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  bitik(mood, BX, BB + bob(T, mood, BS), BS, { alpha: a, limit, blink: mood === "normal" && (T % 3.1) < 0.12, glitch });
  if (T >= tFood && T < tEat) { const p = prog(T, tFood, tEat); appleAt(BX - 3 * BS, lerp(-120, BB - 15 * BS, p * p), BS); }
  if (T >= tEat && T < tEat + 1.3) { const d = T - tEat; for (let i = 0; i < 4; i++) heart(BX - 90 + i * 55, BB - 220 - d * (90 + i * 30), 12, clamp(1.3 - d)); }
}
function teaserCard(T) {
  const a = win(T, IO + 16.24, IO + 21.1, 0.3);
  if (a <= 0) return;
  const x = lerp(40, 110, easeOut(prog(T, IO + 16.24, IO + 16.7))), y = 230;
  ctx.save(); ctx.globalAlpha = a;
  rr(x, y, 520, 120, 14); ctx.fillStyle = "rgba(16,10,14,.88)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,70,90,.35)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = RED; ctx.fillRect(x, y + 18, 4, 84);
  ctx.fillStyle = "rgba(111,211,107,.15)"; rr(x + 26, y + 26, 68, 68, 12); ctx.fill();
  sproutIcon(x + 40, y + 42, 8);
  ctx.restore();
  text("ВО ЧТО ОН ВЫРАСТЕТ", x + 116, y + 52, { size: 28, weight: 700, align: "left", alpha: a, glow: null });
  mono("ЗА 48 ЧАСОВ", x + 116, y + 86, { size: 15, color: "#a8909a", align: "left", alpha: a, spacing: 3 });
  ctx.save(); ctx.globalAlpha = a; ctx.filter = "blur(10px)"; ctx.fillStyle = "#ff3b4f";
  ctx.fillRect(x + 10, y + 150, 150, 46); ctx.fillRect(x + 180, y + 150, 140, 46); ctx.fillRect(x + 340, y + 150, 90, 46);
  ctx.filter = "none"; ctx.restore();
  mono("покажу в конце", x + 150, y + 238, { size: 18, weight: 400, color: RED, alpha: a * (0.6 + 0.4 * Math.sin(T * 5)), spacing: 2 });
}
function bigTimer(T) {
  const a = win(T, IO, IO + 2.4, 0.3);
  if (a > 0) text(fmt(H48), 700, 640, { size: 150, alpha: a, blur: 50, scale: 1 + 0.08 * (1 - easeOut(prog(T, IO, IO + 0.3))) });
  const b = win(T, GO, IO + 26.9, 0.25);
  if (b > 0) {
    text(fmt(timerSecs(T)), 700, 600, { size: 150, alpha: b, blur: 50 });
    text("ПОЕХАЛИ", 700, 770, { size: 84, alpha: b * easeOut(prog(T, GO, GO + 0.15)), scale: 1 + 0.25 * (1 - easeOut(prog(T, GO, GO + 0.15))) });
  }
}
function equation(T) {
  const a = win(T, IO + 21.08, IO + 24.9, 0.25);
  if (a <= 0) return;
  const p1 = easeOut(prog(T, IO + 21.08, IO + 21.3)), p2 = easeOut(prog(T, IO + 21.3, IO + 21.55)), p3 = easeOut(prog(T, IO + 21.55, IO + 21.8));
  text("1", 430, 470, { size: 300, alpha: a * p1, blur: 60, scale: 1.2 - .2 * p1 });
  text("САЙТ", 430, 680, { size: 88, alpha: a * p1, blur: 30 });
  ctx.save(); ctx.globalAlpha = a * p2; ctx.fillStyle = "#ffd6db"; ctx.fillRect(805, 520, 90, 18); ctx.fillRect(805, 570, 90, 18); ctx.restore();
  text("48:00", 1370, 490, { size: 170, alpha: a * p3, blur: 50 });
  text("ЧАСОВ", 1370, 680, { size: 88, color: RED, glow: "rgba(255,40,60,.9)", alpha: a * p3, blur: 30 });
  text("0 СТРОК КОДА НА СТАРТЕ", 960, 860, { size: 44, weight: 700, color: "#c4a9b0", alpha: a * easeOut(prog(T, IO + 21.92, IO + 22.2)), glow: null });
}
function titleCard(T) {
  const a = win(T, IO + 26.9, BO - 0.2, 0.3);
  if (a <= 0) return;
  const g = T < IO + 27.3 ? (Math.floor(T * 30) % 2 ? 8 : -8) : 0;
  mono("СЕРИЯ 1", 600 + g, 450, { size: 30, color: RED, alpha: a, spacing: 8 });
  text("РОЖДЕНИЕ", 600 - g, 545, { size: 116, alpha: a, blur: 50 });
}

// ── окно (панель) ───────────────────────────────────────────────────
const PN = { x: 70, y: 150, w: 1070, h: 810 };
function panel(a) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = "rgba(255,70,90,.18)"; ctx.shadowBlur = 50;
  rr(PN.x, PN.y, PN.w, PN.h, 18); ctx.fillStyle = "#0d0a0f"; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(255,70,90,.22)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
function windowBar(a, title, highlight = 0) {
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "#1a1217"; rr(PN.x, PN.y, PN.w, 50, [18, 18, 0, 0]); ctx.fill();
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(PN.x + 28 + i * 24, PN.y + 25, 7, 0, Math.PI * 2); ctx.fill(); });
  rr(PN.x + 120, PN.y + 11, 420, 28, 14); ctx.fillStyle = "#0d0a0f"; ctx.fill();
  if (highlight > 0) { ctx.strokeStyle = `rgba(255,190,90,${highlight})`; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.restore();
  mono(title, PN.x + 140, PN.y + 26, { size: 16, weight: 400, color: "#c4a9b0", align: "left", alpha: a });
}

// ── блок 1: правила (talk) ─────────────────────────────────────────
const NET = (() => { const r = rng(42); const pts = []; for (let i = 0; i < 34; i++) { const a = (i / 34) * Math.PI * 2 + r() * 0.15; const k = 0.75 + r() * 0.35; pts.push([Math.cos(a) * 380 * k, Math.sin(a) * 250 * k, r()]); } return pts; })();
function sceneRules(T) {
  const id = "rules"; const a = win(T, S(id) - 0.2, E(id) + 0.4, 0.3);
  if (a <= 0) return;
  const cx = 540, cy = 520;
  const head = win(T, S(id) - 0.2, P(id, 1), 0.3);
  if (head > 0) { mono("ПРАВИЛО №0", cx, 380, { size: 26, color: RED, alpha: a * head, spacing: 6 }); text("ПРАВИЛА", cx, 480, { size: 120, alpha: a * head, blur: 40 }); }
  const net = a * win(T, P(id, 1), P(id, 6) + 0.3, 0.35);
  if (net > 0) {
    const tokyo = 6, you = 23;
    const fade = prog(T, P(id, 4), P(id, 5) + 0.8);
    NET.forEach(([x, y, r], i) => {
      const on = easeOut(prog(T, P(id, 1) + r * 1.2, P(id, 1) + r * 1.2 + 0.3));
      const dead = fade > r;
      ctx.save(); ctx.globalAlpha = net * on * (dead ? 0.35 : 1);
      ctx.strokeStyle = dead ? "rgba(140,140,160,.25)" : "rgba(255,90,110,.28)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - 60); ctx.lineTo(cx + x, cy + y); ctx.stroke();
      ctx.fillStyle = dead ? "#666a7a" : i === you && T > P(id, 3) + 1.6 && T < P(id, 4) ? "#9dff8a" : "#ff8a96";
      ctx.beginPath(); ctx.arc(cx + x, cy + y, i === tokyo || i === you ? 11 : 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    const lab = net * win(T, P(id, 3), P(id, 4), 0.2);
    if (lab > 0) {
      mono("ТОКИО", cx + NET[tokyo][0], cy + NET[tokyo][1] - 30, { size: 20, color: "#ffd2d8", alpha: lab });
      mono("ТЫ", cx + NET[you][0], cy + NET[you][1] + 34, { size: 22, color: "#9dff8a", alpha: lab * prog(T, P(id, 3) + 1.5, P(id, 3) + 1.7) });
      const pulse = (x0, y0, x1, y1, t0) => { const k = prog(T, t0, t0 + 0.6); if (k > 0 && k < 1) { ctx.fillStyle = "#fff"; ctx.shadowColor = RED; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(lerp(x0, x1, k), lerp(y0, y1, k), 9, 0, 7); ctx.fill(); ctx.shadowBlur = 0; } };
      pulse(cx + NET[tokyo][0], cy + NET[tokyo][1], cx, cy - 60, P(id, 3) + 0.3);
      pulse(cx, cy - 60, cx + NET[you][0], cy + NET[you][1], P(id, 3) + 1.0);
    }
    let mood = "normal";
    if (T > P(id, 3) + 0.9 && T < P(id, 4)) mood = "happy";
    if (T > P(id, 4) + 0.9) mood = "sad";
    bitik(mood, cx, cy + 20 + bob(T, mood, 10), 10, { alpha: net });
  }
  const lf = a * win(T, P(id, 6), E(id) + 0.4, 0.35);
  if (lf > 0) {
    const beat = 1 + 0.08 * Math.max(0, Math.sin(T * 7)) * (T > P(id, 7) ? 1 : 0.3);
    ctx.save(); ctx.translate(cx, 470); ctx.scale(beat, beat); bigHeart(0, 0, 34, lf); ctx.restore();
    mono(T < P(id, 7) ? "НАЧАТЬ ЗАНОВО?" : "× 1", cx, 700, { size: 40, color: T < P(id, 7) ? "#8f7f86" : "#ffd2d8", alpha: lf });
    if (T < P(id, 7)) { ctx.save(); ctx.globalAlpha = lf; ctx.strokeStyle = RED; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx - 190, 700); ctx.lineTo(cx + 190, 700); ctx.stroke(); ctx.restore(); }
  }
}

// ── блок 2: пиксели ────────────────────────────────────────────────
const CODE_ROWS = spriteGrid("normal").grid.map(r => r.join(""));
const CODE_CHARS = CODE_ROWS.length * SPRITE_W;
function scenePixels(T) {
  const id = "pixels"; const a = win(T, S(id) - 0.3, E(id) + 0.3, 0.3);
  if (a <= 0) return;
  panel(a); windowBar(a, "bitik.js");
  const k = phase(T, id);
  const typed = Math.floor(CODE_CHARS * prog(T, P(id, 1) + 0.2, P(id, 3) + 2.2));
  const HL = { 4: "B", 5: "O", 6: "E", 7: "G", 8: "." }[k] || null;
  const swap = T > P(id, 10) + 0.4;
  const rows = CODE_ROWS.map(r => r.split(""));
  if (swap) { rows[9][4] = "B"; rows[9][5] = "B"; rows[9][10] = "B"; rows[9][11] = "B"; }
  const changed = (r, c) => swap && r === 9 && (c === 4 || c === 5 || c === 10 || c === 11);
  const pal = PALETTES.normal;
  const match = ch => !HL || ch === HL || (HL === "E" && ch === "W") || (HL === "G" && ch === "S");
  const cx = PN.x + 40, cy = PN.y + 100, lh = 36;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = `400 26px "JetBrains Mono"`; ctx.textBaseline = "middle";
  ctx.fillStyle = "#c792ea"; ctx.fillText("const", cx, cy);
  ctx.fillStyle = "#e6edf3"; ctx.fillText(" BITIK = [", cx + 78, cy);
  for (let r = 0; r < rows.length; r++) {
    const y = cy + (r + 1) * lh * 0.9 + 6;
    const shown = clamp(typed - r * SPRITE_W, 0, SPRITE_W);
    if (shown <= 0) break;
    ctx.globalAlpha = a; ctx.fillStyle = "#6b7394"; ctx.fillText('  "', cx, y);
    for (let i = 0; i < shown; i++) {
      const ch = rows[r][i];
      ctx.globalAlpha = a * (match(ch) ? 1 : 0.18);
      ctx.fillStyle = changed(r, i) ? "#ff5a6e" : ch === "." ? (HL === "." ? "#e6edf3" : "#2c3350") : pal[ch];
      ctx.fillText(ch, cx + 48 + i * 15.6, y);
    }
    ctx.globalAlpha = a;
    if (shown === SPRITE_W) { ctx.fillStyle = "#6b7394"; ctx.fillText('",', cx + 48 + SPRITE_W * 15.6, y); }
    else if (Math.floor(T * 4) % 2) { ctx.fillStyle = RED; ctx.fillRect(cx + 48 + shown * 15.6, y - 14, 3, 28); }
  }
  if (typed >= CODE_CHARS) { ctx.fillStyle = "#e6edf3"; ctx.fillText("];", cx, cy + (rows.length + 1) * lh * 0.9 + 6); }
  ctx.restore();
  const cs = 27, gx = PN.x + PN.w - 40 - cs * SPRITE_W, gy = PN.y + 130;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "#08060a"; ctx.fillRect(gx, gy, cs * SPRITE_W, cs * SPRITE_H);
  for (let r = 0; r < SPRITE_H; r++) for (let c = 0; c < SPRITE_W; c++) {
    const idx = r * SPRITE_W + c, ch = rows[r][c];
    if (idx >= typed) continue;
    if (ch === ".") {
      if (HL === ".") { ctx.globalAlpha = a * (0.5 + 0.3 * Math.sin(T * 6 + idx)); ctx.strokeStyle = "rgba(255,255,255,.5)"; ctx.strokeRect(gx + c * cs + 4, gy + r * cs + 4, cs - 8, cs - 8); }
      continue;
    }
    ctx.globalAlpha = a * (match(ch) ? 1 : 0.15);
    ctx.fillStyle = pal[ch]; ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs);
    if (changed(r, c)) { ctx.globalAlpha = a * (0.4 + 0.4 * Math.sin(T * 10)); ctx.fillStyle = "#ff5a6e"; ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs); }
    const age = (typed - idx) / CODE_CHARS * 40;
    if (age < 1) { ctx.globalAlpha = a * 0.7 * (1 - age); ctx.fillStyle = "#fff"; ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs); }
  }
  ctx.globalAlpha = a; ctx.strokeStyle = "rgba(255,70,90,.10)"; ctx.lineWidth = 1; ctx.beginPath();
  for (let c = 0; c <= SPRITE_W; c++) { ctx.moveTo(gx + c * cs + .5, gy); ctx.lineTo(gx + c * cs + .5, gy + cs * SPRITE_H); }
  for (let r = 0; r <= SPRITE_H; r++) { ctx.moveTo(gx, gy + r * cs + .5); ctx.lineTo(gx + cs * SPRITE_W, gy + r * cs + .5); }
  ctx.stroke(); ctx.restore();
  const lab = HL ? { B: "B = тело", O: "O = контур", E: "E = глаза", G: "G = листья", ".": ". = пусто" }[HL] : k >= 1 ? "16 × 17" : "";
  if (lab) mono(lab, gx + cs * SPRITE_W / 2, gy + cs * SPRITE_H + 60, { size: 30, color: RED, alpha: a, glow: "rgba(255,70,90,.6)", blur: 14 });
}

// ── блок 3: росток ─────────────────────────────────────────────────
function sceneSprout(T) {
  const id = "sprout"; const a = win(T, S(id) - 0.3, E(id) + 0.3, 0.3);
  if (a <= 0) return;
  panel(a);
  const cx = PN.x + PN.w / 2, bottom = PN.y + PN.h - 170;
  const three = win(T, P(id, 3) - 0.25, P(id, 6) - 0.1, 0.25);
  const single = 1 - three;
  if (single > 0.01) {
    const s = 24;
    const morph = ease(prog(T, P(id, 6) + 0.6, P(id, 7) + 1.2));
    const pal = mixPal(PALETTES.normal, PALETTES.sad, morph);
    const mood = morph > 0.6 ? "sad" : "normal";
    const sx = T > P(id, 8) ? cx + 200 : cx;
    const r = bitik(mood, sx, bottom + (mood === "sad" ? 0 : bob(T, "normal", s)), s, { alpha: a * single, blink: (T % 2.9) < 0.12, palette: pal });
    const ring = a * single * win(T, P(id, 1), P(id, 3), 0.25);
    if (ring > 0) {
      ctx.save(); ctx.globalAlpha = ring; ctx.strokeStyle = "#9dff8a"; ctx.lineWidth = 5; ctx.shadowColor = "#6fd36b"; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.arc(r.x + 8.5 * s, r.y + 2 * s, 90 + 6 * Math.sin(T * 6), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      mono("НЕ АНТЕННА", r.x + 8.5 * s + 140, r.y + 10, { size: 22, color: "#9dff8a", align: "left", alpha: ring });
    }
    const nm = a * single * win(T, P(id, 8), E(id) + 0.3, 0.25);
    if (nm > 0) {
      text("73%", cx - 260, bottom - 230, { size: 120, color: "#8f7f86", glow: null, alpha: nm });
      ctx.save(); ctx.globalAlpha = nm; ctx.strokeStyle = RED; ctx.lineWidth = 10; ctx.lineCap = "round";
      const k = easeOut(prog(T, P(id, 8) + 0.9, P(id, 8) + 1.2));
      ctx.beginPath(); ctx.moveTo(cx - 400, bottom - 180); ctx.lineTo(lerp(cx - 400, cx - 120, k), lerp(bottom - 180, bottom - 290, k)); ctx.stroke(); ctx.restore();
    }
  }
  if (three > 0.01) {
    const st = [["happy", "СЧАСТЛИВ", P(id, 3), "#9dff8a"], ["sad", "ГРУСТИТ", P(id, 4), "#b9c3e6"], ["sleep", "СПИТ", P(id, 5), "#8ff7d0"]];
    st.forEach(([mood, label, t0, col], i) => {
      const x = PN.x + 190 + i * 345, on = T >= t0, al = a * three * (on ? 1 : 0.25);
      if (mood === "sleep" && on) {
        ctx.save(); const g = ctx.createRadialGradient(x, bottom - 15.5 * 14, 5, x, bottom - 15.5 * 14, 90);
        g.addColorStop(0, `rgba(143,247,208,${0.55 * al})`); g.addColorStop(1, "rgba(143,247,208,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 100, bottom - 330, 200, 200); ctx.restore();
        mono("z Z", x + 110, bottom - 300 - 10 * Math.sin(T * 2), { size: 30, color: "#8ff7d0", alpha: al * .8 });
      }
      bitik(mood, x, bottom + (on && mood === "happy" ? bob(T, "happy", 14) : 0) - 10 * easeOut(prog(T, t0, t0 + 0.2)), 14, { alpha: al });
      text(label, x, bottom + 70, { size: 34, color: on ? col : "#4a3a40", alpha: a * three, glow: on ? col : null, blur: 18 });
    });
  }
}

// ── браузер с комнатой (блоки 4–7) ─────────────────────────────────
const roomBuf = new OffscreenCanvas(ROOM_W, ROOM_H);
const rctx = roomBuf.getContext("2d");
const RS = 7.5, RX = PN.x + (PN.w - ROOM_W * RS) / 2, RY = PN.y + 72;
const BAR = { x: RX, y: RY + ROOM_H * RS + 34, w: 640 };
const BTN = { x: RX + ROOM_W * RS - 250, y: RY + ROOM_H * RS + 30, w: 250, h: 76 };
const roomToScreen = (x, y) => [RX + x * RS, RY + y * RS];

function drawBrowserRoom(T, a, st) {
  // st: { wall, floor, light, mood, showBitik, apple: y|null, hearts: t|null, dim }
  drawRoom(rctx, { wall: st.wall ?? 1, floor: st.floor ?? 1, light: st.light ?? 1, t: T });
  if (st.showBitik ?? true) {
    rctx.save(); rctx.globalAlpha = st.floor ?? 1;
    rctx.fillStyle = "rgba(0,0,0,.35)"; rctx.fillRect(BITIK_X + 3, BITIK_Y + 16, 10, 1);
    drawSprite(rctx, st.mood, BITIK_X, BITIK_Y + bob(T, st.mood), { blink: st.mood !== "happy" && (T % 3.3) < 0.12 });
    rctx.restore();
  }
  if (st.apple != null) drawFood(rctx, BITIK_X + 5, st.apple);
  ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(roomBuf, RX, RY, ROOM_W * RS, ROOM_H * RS);
  ctx.strokeStyle = "#3a2d4f"; ctx.lineWidth = 4; ctx.strokeRect(RX, RY, ROOM_W * RS, ROOM_H * RS);
  if (st.dim) { ctx.fillStyle = `rgba(5,3,6,${st.dim})`; ctx.fillRect(RX, RY, ROOM_W * RS, ROOM_H * RS); }
  ctx.restore();
  if (st.hearts != null && T >= st.hearts && T < st.hearts + 1.3) {
    const d = T - st.hearts;
    for (let i = 0; i < 4; i++) heart(RX + (BITIK_X + 2 + i * 3.5) * RS, RY + (BITIK_Y + 2) * RS - d * (60 + i * 18), 7, clamp(1.3 - d) * a);
  }
}
function hungerBar(a, h, o = {}) {
  if (a <= 0) return;
  const { marker = 0, delta = null, deltaA = 0 } = o;
  mono("СЫТОСТЬ", BAR.x, BAR.y, { size: 20, color: "#efe8ff", align: "left", alpha: a, spacing: 2 });
  mono(Math.round(h) + "%", BAR.x + BAR.w, BAR.y, { size: 20, color: "#efe8ff", align: "right", alpha: a });
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "#0b0812"; ctx.fillRect(BAR.x, BAR.y + 22, BAR.w, 26);
  ctx.strokeStyle = "#3a2d4f"; ctx.lineWidth = 4; ctx.strokeRect(BAR.x, BAR.y + 22, BAR.w, 26);
  const fw = (BAR.w - 8) * clamp(h / 100);
  ctx.fillStyle = h <= 0 ? "#e2445c" : h < 35 ? "#f2b84b" : "#6fd36b";
  ctx.fillRect(BAR.x + 4, BAR.y + 26, Math.floor(fw / 12) * 12, 18);
  if (marker > 0) {
    const mx = BAR.x + 4 + (BAR.w - 8) * 0.35;
    ctx.globalAlpha = a * marker; ctx.fillStyle = "#f2b84b"; ctx.fillRect(mx - 1, BAR.y + 14, 3, 42);
    ctx.restore(); mono("35%", mx, BAR.y + 72, { size: 16, color: "#f2b84b", alpha: a * marker }); ctx.save();
  }
  ctx.restore();
  if (delta && deltaA > 0) text(delta, BAR.x + BAR.w - 40, BAR.y - 40, { size: 44, color: delta[0] === "+" ? "#9dff8a" : "#ff8a96", glow: null, alpha: a * deltaA });
}
function feedButton(T, a, disabled, pressT) {
  if (a <= 0) return;
  const pressed = [].concat(pressT || []).some(t => T >= t && T < t + 0.15) ? 5 : 0;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "#2b1d3a"; ctx.fillRect(BTN.x - 4, BTN.y - 4, BTN.w + 8, BTN.h + 12);
  ctx.fillStyle = disabled ? "#3d3438" : "#8f2537"; ctx.fillRect(BTN.x, BTN.y + 6, BTN.w, BTN.h);
  ctx.fillStyle = disabled ? "#6b5a60" : "#e2445c"; ctx.fillRect(BTN.x, BTN.y + pressed, BTN.w, BTN.h - 2);
  ctx.restore();
  text("ПОКОРМИТЬ", BTN.x + BTN.w / 2, BTN.y + BTN.h / 2 + pressed, { size: 22, color: disabled ? "#2a2226" : "#1a0f14", glow: null, alpha: a });
}
function tabClosed(T, a, t0, t1, minutes) {
  // затемнение «вкладка закрыта» с часами
  const k = a * win(T, t0, t1, 0.3);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = "#070508"; ctx.fillRect(RX, RY, ROOM_W * RS, ROOM_H * RS); ctx.restore();
  const cx = RX + ROOM_W * RS / 2, cy = RY + 230;
  ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = "#efe8ff"; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx, cy, 80, 0, Math.PI * 2); ctx.stroke();
  const ang = (T - t0) * 9;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ang) * 62, cy - Math.cos(ang) * 62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(ang / 12) * 40, cy - Math.cos(ang / 12) * 40); ctx.stroke();
  ctx.restore();
  mono("ВКЛАДКА ЗАКРЫТА", cx, cy + 140, { size: 26, color: "#8f7f86", alpha: k, spacing: 4 });
  mono(`прошло ${Math.round(minutes * prog(T, t0 + 0.3, t1 - 0.3))} мин`, cx, cy + 185, { size: 30, color: RED, alpha: k });
}
const fall = (T, t0, dur) => (T >= t0 && T < t0 + dur ? lerp(-FOOD_W, BITIK_Y + 1, Math.pow(prog(T, t0, t0 + dur), 2)) : null);

function sceneRoom(T) {
  const id = "room"; const a = win(T, S(id) - 0.3, E(id) + 0.3, 0.3);
  if (a <= 0) return;
  panel(a); windowBar(a, "localhost:8765");
  const wall = prog(T, P(id, 1), P(id, 1) + 0.6), light = prog(T, P(id, 5), P(id, 5) + 0.4), floor = prog(T, P(id, 6), P(id, 6) + 0.5);
  drawBrowserRoom(T, a, { wall, light: light * (light < 1 ? 0.85 + 0.15 * Math.sin(T * 9) : 1), floor, mood: "normal", showBitik: floor > 0 });
  const ring = (x0, y0, x1, y1, t0, t1, label) => {
    const k = a * win(T, t0, t1, 0.25); if (k <= 0) return;
    const [sx, sy] = roomToScreen(x0, y0), [ex, ey] = roomToScreen(x1, y1);
    ctx.save(); ctx.globalAlpha = k; ctx.strokeStyle = "#ffd36b"; ctx.lineWidth = 4; ctx.shadowColor = "#ffbe5a"; ctx.shadowBlur = 20;
    rr(sx - 12, sy - 12, ex - sx + 24, ey - sy + 24, 12); ctx.stroke(); ctx.restore();
    if (label) mono(label, (sx + ex) / 2, ey + 44, { size: 22, color: "#ffd36b", alpha: k });
  };
  ring(12, 12, 36, 34, P(id, 2), P(id, 3), "★ мерцают");
  ring(92, 17, 114, 28, P(id, 3), P(id, 5), T > P(id, 4) ? "родственник?" : "родственник");
  const dims = a * win(T, P(id, 7), E(id) + 0.3, 0.3);
  if (dims > 0) {
    ctx.save(); ctx.globalAlpha = dims * 0.35; ctx.strokeStyle = "rgba(255,255,255,.4)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= ROOM_W; x += 4) { ctx.moveTo(RX + x * RS, RY); ctx.lineTo(RX + x * RS, RY + ROOM_H * RS); }
    for (let y = 0; y <= ROOM_H; y += 4) { ctx.moveTo(RX, RY + y * RS); ctx.lineTo(RX + ROOM_W * RS, RY + y * RS); }
    ctx.stroke(); ctx.restore();
    mono("← 128 →", RX + ROOM_W * RS / 2, RY + ROOM_H * RS + 40, { size: 30, color: "#ffd36b", alpha: dims });
    mono("72", RX - 36, RY + ROOM_H * RS / 2, { size: 30, color: "#ffd36b", alpha: dims });
  }
}

function sceneHunger(T) {
  const id = "hunger"; const a = win(T, S(id) - 0.3, E(id) + 0.3, 0.3);
  if (a <= 0) return;
  panel(a); windowBar(a, "localhost:8765");
  const tClose = P(id, 5), tOpen = P(id, 7);
  let h = 100;
  h = lerp(100, 97, prog(T, P(id, 2), P(id, 3)));
  if (T > tOpen + 0.3) h = lerp(97, 50, ease(prog(T, tOpen + 0.3, tOpen + 1.4)));
  if (T > P(id, 8)) h = lerp(50, 30, ease(prog(T, P(id, 8), P(id, 8) + 0.6)));
  if (T > P(id, 9)) h = lerp(30, 0, ease(prog(T, P(id, 9), P(id, 9) + 0.5)));
  const mood = h <= 0 ? "sad" : h < 35 ? "hungry" : "normal";
  drawBrowserRoom(T, a, { mood });
  tabClosed(T, a, tClose + 0.4, tOpen + 0.2, 47);
  hungerBar(a, h, { marker: prog(T, P(id, 8), P(id, 8) + 0.3), delta: T < tOpen + 2.5 && T > tOpen + 0.3 ? "−47%" : T > P(id, 2) && T < P(id, 4) ? "−1%" : null, deltaA: 1 });
  codeBox(RX + 24, RY + 24, 500, [
    [["setInterval", "#82aaff"], ["(() => {", "#e6edf3"]],
    [["  hunger ", "#e6edf3"], ["-= ", "#c792ea"], ["1", "#f78c6c"]],
    [["}, ", "#e6edf3"], ["60_000", "#f78c6c"], [")", "#e6edf3"]],
  ], prog(T, P(id, 2) + 0.2, P(id, 2) + 1.8), a * win(T, P(id, 2), P(id, 5), 0.25));
  codeBox(RX + 24, RY + 24, 640, [
    [["// уходя, запоминаем время", "#6b7394"]],
    [["state.", "#e6edf3"], ["updatedAt", "#82aaff"], [" = ", "#c792ea"], ["Date.now()", "#ffcb6b"]],
    [["// вернулся: прошло минут", "#6b7394"]],
    [["(now - updatedAt) / ", "#e6edf3"], ["60_000", "#f78c6c"]],
  ], prog(T, P(id, 6), P(id, 7) + 1.5), a * win(T, P(id, 6), P(id, 8), 0.25), 24);
  const hundred = a * win(T, P(id, 3), P(id, 4), 0.25);
  if (hundred > 0) text("100% = 100 МИН", RX + ROOM_W * RS / 2, RY + 300, { size: 64, alpha: hundred, blur: 30 });
}

function sceneButton(T) {
  const id = "button"; const a = win(T, S(id) - 0.3, E(id) + 0.3, 0.3);
  if (a <= 0) return;
  panel(a); windowBar(a, "localhost:8765");
  const c1 = P(id, 2) + 0.35, land1 = c1 + 0.7;
  const c2 = P(id, 6) + 0.15, land2 = c2 + 2.4;
  const spam = [c2 + 0.5, c2 + 0.85, c2 + 1.2, c2 + 1.55, c2 + 1.9];
  let h = 40;
  if (T > land1) h = lerp(40, 55, easeOut(prog(T, land1, land1 + 0.4)));
  if (T > land2) h = lerp(55, 70, easeOut(prog(T, land2, land2 + 0.4)));
  let mood = "normal";
  if ((T > land1 && T < land1 + 2.6) || (T > P(id, 4) && T < P(id, 6)) || (T > land2 && T < land2 + 2.5)) mood = "happy";
  const apple = fall(T, c1, 0.7) ?? fall(T, c2, 2.4);
  drawBrowserRoom(T, a, { mood, apple, hearts: T > land2 ? land2 : T > P(id, 5) - 0.1 ? P(id, 5) : land1 });
  hungerBar(a, h, { delta: (T > land1 && T < land1 + 1.6) || (T > P(id, 4) && T < P(id, 5)) ? "+15%" : null, deltaA: 1 });
  const disabled = (T >= c1 && T < land1) || (T >= c2 && T < land2);
  feedButton(T, a * easeOut(prog(T, P(id, 0), P(id, 0) + 0.3)), disabled, [c1, c2, ...spam]);
  const ca = a * win(T, P(id, 2) - 0.5, E(id), 0.2);
  const tx = BTN.x + BTN.w * 0.6, ty = BTN.y + BTN.h * 0.6;
  const p = ease(prog(T, P(id, 2) - 0.5, c1 - 0.05));
  cursor(lerp(RX + 420, tx, p), lerp(RY + 380, ty, p), ca, [c1, c2, ...spam], T);
  for (const s of spam) {
    const k = a * win(T, s, s + 0.5, 0.1);
    if (k > 0) mono("✕", tx + 40 + (s - c2) * 30, ty - 50 - (T - s) * 60, { size: 30, color: RED, alpha: k });
  }
  if (T > c2 && T < land2) mono("ЗАБЛОКИРОВАНО", BTN.x + BTN.w / 2, BTN.y - 26, { size: 18, color: "#ff8a96", alpha: a });
}

function sceneTest(T) {
  const id = "test"; const a = win(T, S(id) - 0.3, E(id) + 0.3, 0.3);
  if (a <= 0) return;
  panel(a); windowBar(a, "localhost:8765");
  const clicks = [P(id, 3), P(id, 4), P(id, 5)];
  let h = T < P(id, 1) + 0.4 ? 70 : 10;
  clicks.forEach((c, i) => { if (T > c + 0.55) h = lerp(10 + 15 * i, 25 + 15 * i, easeOut(prog(T, c + 0.55, c + 0.85))); });
  if (T > P(id, 8)) h = lerp(55, 52, prog(T, P(id, 8), P(id, 8) + 0.3));
  let apple = null; for (const c of clicks) apple = apple ?? fall(T, c, 0.55);
  const mood = T > P(id, 6) - 0.2 ? "happy" : h < 35 ? "hungry" : "normal";
  drawBrowserRoom(T, a, { mood, apple, hearts: T > clicks[2] + 0.55 ? clicks[2] + 0.55 : null });
  tabClosed(T, a, P(id, 7) + 0.1, P(id, 8) - 0.05, 3);
  hungerBar(a, h, { marker: 1, delta: T > P(id, 8) && T < P(id, 9) + 0.3 ? "−3%" : null, deltaA: 1 });
  feedButton(T, a, false, clicks);
  cursor(BTN.x + BTN.w * 0.6, BTN.y + BTN.h * 0.6, a * win(T, P(id, 3) - 0.3, P(id, 6) + 0.5, 0.2), clicks, T);
  codeBox(RX + 24, RY + 24, 420, [[[">", "#ff5a6e"], [" hunger = ", "#e6edf3"], ["10", "#f78c6c"]]], prog(T, P(id, 1), P(id, 1) + 0.8), a * win(T, P(id, 1) - 0.1, P(id, 3), 0.2), 26);
  const ok = a * win(T, P(id, 9), E(id) + 0.3, 0.2);
  if (ok > 0) {
    const k = easeOut(prog(T, P(id, 9), P(id, 9) + 0.25));
    ctx.save(); ctx.globalAlpha = ok; ctx.translate(RX + ROOM_W * RS / 2, RY + 250); ctx.rotate(-0.12); ctx.scale(1.6 - 0.6 * k, 1.6 - 0.6 * k);
    ctx.strokeStyle = "#9dff8a"; ctx.lineWidth = 8; rr(-260, -70, 520, 140, 16); ctx.stroke(); ctx.restore();
    text("✓ РАБОТАЕТ", RX + ROOM_W * RS / 2, RY + 250, { size: 64, color: "#9dff8a", glow: "rgba(111,211,107,.8)", alpha: ok });
  }
}

// ── блок 8: финал (talk) ───────────────────────────────────────────
function sceneOutro(T) {
  const id = "outro"; const a = win(T, S(id) - 0.2, DURATION + 1, 0.3);
  if (a <= 0) return;
  const cx = 540, cy = 560;
  const one = a * win(T, S(id) - 0.2, P(id, 3), 0.3);
  if (one > 0) {
    const lap = easeOut(prog(T, P(id, 1), P(id, 1) + 0.4));
    if (lap > 0) {
      ctx.save(); ctx.globalAlpha = one * lap; ctx.strokeStyle = "#c4a9b0"; ctx.lineWidth = 6;
      rr(cx - 260, cy - 300, 520, 330, 18); ctx.stroke();
      ctx.fillStyle = "#c4a9b0"; ctx.fillRect(cx - 320, cy + 40, 640, 14); ctx.restore();
      mono("localhost", cx, cy - 270, { size: 20, color: "#c4a9b0", alpha: one * lap });
    }
    bitik("happy", cx, cy + bob(T, "happy", 10), 10, { alpha: one });
  }
  const many = a * win(T, P(id, 3), P(id, 4), 0.3);
  if (many > 0) {
    for (let i = 0; i < 6; i++) {
      const x = cx - 300 + (i % 3) * 300, y = cy - 140 + Math.floor(i / 3) * 260;
      const k = easeOut(prog(T, P(id, 3) + i * 0.12, P(id, 3) + i * 0.12 + 0.25));
      ctx.save(); ctx.globalAlpha = many * k; ctx.strokeStyle = "#8f7f86"; ctx.lineWidth = 3; rr(x - 110, y - 120, 220, 150, 10); ctx.stroke(); ctx.restore();
      bitik("normal", x, y + 10, 5, { alpha: many * k });
    }
    const x = easeOut(prog(T, P(id, 3) + 2.6, P(id, 3) + 2.9));
    if (x > 0) { ctx.save(); ctx.globalAlpha = many * x; ctx.strokeStyle = RED; ctx.lineWidth = 14; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx - 420, cy - 280); ctx.lineTo(cx + 420, cy + 180); ctx.moveTo(cx + 420, cy - 280); ctx.lineTo(cx - 420, cy + 180); ctx.stroke(); ctx.restore(); }
  }
  const srv = a * win(T, P(id, 4), P(id, 7), 0.3);
  if (srv > 0) {
    const r = rng(9);
    const people = Array.from({ length: 24 }, (_, i) => { const ang = (i / 24) * Math.PI * 2; return [cx + Math.cos(ang) * (330 + r() * 60), cy + 40 + Math.sin(ang) * (230 + r() * 40), r()]; });
    people.forEach(([x, y, d]) => {
      const k = easeOut(prog(T, P(id, 4) + d, P(id, 4) + d + 0.3));
      ctx.save(); ctx.globalAlpha = srv * k; ctx.strokeStyle = "rgba(255,90,110,.3)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = "#ff8a96"; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.restore();
    });
    ctx.save(); ctx.globalAlpha = srv; ctx.fillStyle = "#1a1217"; ctx.strokeStyle = RED; ctx.lineWidth = 4;
    rr(cx - 150, cy - 110, 300, 200, 24); ctx.fill(); ctx.stroke(); ctx.restore();
    mono("СЕРВЕР", cx, cy - 80, { size: 20, color: RED, alpha: srv, spacing: 4 });
    bitik("happy", cx, cy + 60 + bob(T, "happy", 6), 6, { alpha: srv });
    const sb = srv * prog(T, P(id, 5), P(id, 5) + 0.3);
    if (sb > 0) {
      ctx.save(); ctx.globalAlpha = sb; ctx.fillStyle = "#0b0812"; ctx.fillRect(cx - 200, cy + 130, 400, 26);
      ctx.fillStyle = "#6fd36b"; ctx.fillRect(cx - 196, cy + 134, 300, 18); ctx.restore();
      mono("ОБЩАЯ СЫТОСТЬ", cx, cy + 180, { size: 18, color: "#efe8ff", alpha: sb });
    }
    const cnt = srv * prog(T, P(id, 6), P(id, 6) + 0.3);
    if (cnt > 0) text("РЯДОМ: " + Math.round(128 * ease(prog(T, P(id, 6), P(id, 6) + 1.5))), cx, cy - 220, { size: 48, alpha: cnt, blur: 24 });
  }
  const end = a * win(T, P(id, 7) - 0.1, DURATION + 1, 0.4);
  if (end > 0) {
    mono("ОСТАЛОСЬ", 560, 330, { size: 26, color: "rgba(255,70,90,.75)", alpha: end, spacing: 8 });
    text(fmt(END_SECS), 560, 470, { size: 160, alpha: end, blur: 50 });
    const b = end * easeOut(prog(T, P(id, 7) + 0.6, P(id, 7) + 1.0));
    mono("СЕРИЯ 2", 560, 650, { size: 26, color: RED, alpha: b, spacing: 8 });
    text("ОНЛАЙН", 560, 735, { size: 84, alpha: b, blur: 36 });
  }
}

// ── кадр ────────────────────────────────────────────────────────────
function renderAt(T) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  background(T);
  const pch = punch(T);
  drawHost(T, pch);
  ctx.save();
  if (pch > 0) { ctx.translate(W / 2, H / 2); ctx.scale(1 + pch, 1 + pch); ctx.translate(-W / 2, -H / 2); }
  bigTimer(T); introBitik(T); teaserCard(T); equation(T); titleCard(T);
  if (T > BO - 1) {
    sceneRules(T); scenePixels(T); sceneSprout(T); sceneRoom(T);
    sceneHunger(T); sceneButton(T); sceneTest(T); sceneOutro(T);
  }
  captions(T);
  ctx.restore();
  hud(T);
  hostFlash(T);
  vignette();
  const dip = Math.max(1 - clamp(T / 0.6), win(T, BO - 0.45, BO + 0.15, 0.3), clamp((T - (DURATION - 0.8)) / 0.8));
  if (dip > 0) { ctx.fillStyle = `rgba(0,0,0,${dip})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
window.renderAt = renderAt;

async function init() {
  const fonts = [
    ["Unbounded", "unbounded-cyrillic-900-normal", "900"], ["Unbounded", "unbounded-latin-900-normal", "900"],
    ["Unbounded", "unbounded-cyrillic-700-normal", "700"], ["Unbounded", "unbounded-latin-700-normal", "700"],
    ["JetBrains Mono", "jetbrains-mono-cyrillic-400-normal", "400"], ["JetBrains Mono", "jetbrains-mono-latin-400-normal", "400"],
    ["JetBrains Mono", "jetbrains-mono-cyrillic-700-normal", "700"], ["JetBrains Mono", "jetbrains-mono-latin-700-normal", "700"],
  ];
  await Promise.all(fonts.map(async ([fam, f, weight]) => { const ff = new FontFace(fam, `url(../../site/fonts/${f}.woff2)`, { weight }); await ff.load(); document.fonts.add(ff); }));
  await loadHost("assets/hero1.png", "assets/hero2.png");
  LIPS = await (await fetch("lipsync.json")).json();
  const tim = await (await fetch("timings.json")).json();
  let t = BO;
  TRACKS = [{ key: "vo_intro", file: "assets/vo_intro.mp3", t: IO }];
  for (const id of ORDER) {
    const b = tim[id];
    BLK[id] = { start: t, end: t + b.duration, ph: b.phrases.map(p => ({ t0: t + p.t0, t1: t + p.t1, cap: p.cap })) };
    TRACKS.push({ key: id, file: `assets/vo/${id}.mp3`, t });
    t += b.duration + GAP;
  }
  DURATION = BLK.outro.end + 3.2;
  PUNCHES = [IO + 6.05, IO + 19.86, IO + 21.08, GO, P("rules", 7), P("sprout", 3), P("test", 9), P("outro", 7)];
  buildTrack(); buildCaptions();
  window.DURATION = DURATION;
  window.AUDIO_TRACKS = TRACKS;
  window.SFX_CUES = buildSfx();
  const q = new URLSearchParams(location.search);
  if (q.has("t")) renderAt(parseFloat(q.get("t")));
  else if (!q.has("static")) { const st = performance.now(); const loop = () => { renderAt(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  window.READY = true;
}

// звуковые эффекты: имя → файл assets/sfx/<имя>.mp3
function buildSfx() {
  const c = [];
  const add = (t, name, vol = 0.5) => c.push({ t, name, vol });
  // свист только при входе ведущего и на стыках блоков, не на каждой смене позы
  for (const id of ORDER) add(S(id) - 0.35, "whoosh", 0.15);
  for (const s of TRACK) if (s.enter === "slide") add(s.t0 - 0.05, "whoosh", 0.15);
  for (const t of PUNCHES) add(t, "boom", 0.55);
  for (let i = 0; i < 6; i++) add(GO + i, "tick", 0.35);
  add(IO + 8.75, "glitch", 0.35); add(IO + 18.53, "glitch", 0.35);
  add(IO + 9.15, "sparkle", 0.4);
  add(IO + 12.75, "chomp", 0.5);
  add(P("pixels", 1), "typing", 0.35); add(P("pixels", 10) + 0.4, "glitch", 0.25);
  add(P("sprout", 3), "chime", 0.3);
  add(P("room", 5), "switch", 0.5);
  add(P("hunger", 2), "typing", 0.3); add(P("hunger", 5) + 0.4, "clock", 0.4); add(P("hunger", 6), "typing", 0.3);
  const b = "button";
  add(P(b, 0), "pop", 0.4); add(P(b, 2) + 0.35, "click", 0.5); add(P(b, 2) + 1.05, "chomp", 0.5);
  [0.5, 0.85, 1.2, 1.55, 1.9].forEach(d => add(P(b, 6) + 0.15 + d, "denied", 0.3));
  add(P(b, 6) + 2.55, "chomp", 0.5);
  [3, 4, 5].forEach(i => { add(P("test", i), "click", 0.5); add(P("test", i) + 0.55, "chomp", 0.4); });
  add(P("test", 7) + 0.1, "clock", 0.4); add(P("test", 9), "chime", 0.4);
  add(P("outro", 3) + 2.6, "denied", 0.4);
  return c;
}
init();
