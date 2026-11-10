// Shorts 2 (9:16): интро серии 2 «Онлайн» + призыв смотреть полную серию.
// Озвучка и липсинк — из video/ep2, звуки и музыка — из video/ep1.
import { SPRITE_W, SPRITE_H, FOOD_W, drawSprite, drawFood } from "../../site/js/bitik.js";
import { loadHost, drawPose } from "../ep1/host.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const IO = 0.5;
const RED = "#ff4d5e", GREEN = "#6fd36b";
let LIPS = null, PH = [], VO_END = 21, END = 27, DURATION = 27;
const P = i => IO + PH[i].t0;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (T, a, b) => clamp((T - a) / (b - a));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const win = (T, a, b, f = 0.25) => clamp(Math.min((T - a) / f, (b - T) / f));
const lerp = (a, b, p) => a + (b - a) * p;
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

function text(str, x, y, o = {}) {
  let { size = 64, weight = 900, family = "Unbounded", color = "#fff", glow = "rgba(255,70,90,.5)", blur = 28,
    align = "center", alpha = 1, scale = 1, spacing = 0, maxW = 1000 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.letterSpacing = spacing + "px";
  const w = ctx.measureText(str).width;
  if (w > maxW) { size = Math.floor(size * maxW / w); ctx.font = `${weight} ${size}px "${family}"`; }
  ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.textAlign = align; ctx.textBaseline = "middle";
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur; }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0);
  ctx.shadowBlur = 0; ctx.fillText(str, 0, 0);
  ctx.restore();
}
const mono = (s, x, y, o = {}) => text(s, x, y, { family: "JetBrains Mono", weight: 700, glow: null, ...o });
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

const sb = new OffscreenCanvas(SPRITE_W, SPRITE_H), sctx = sb.getContext("2d");
function bitik(mood, cx, bottom, s, alpha = 1, blink = false) {
  if (alpha <= 0) return;
  sctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  drawSprite(sctx, mood, 0, 0, { blink });
  const w = SPRITE_W * s, h = SPRITE_H * s;
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha;
  ctx.drawImage(sb, Math.round(cx - w / 2), Math.round(bottom - h), w, h); ctx.restore();
}
function heart(x, y, s, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#f29bb8"; for (const [dx, dy] of [[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]]) ctx.fillRect(x + dx * s, y + dy * s, s, s); ctx.restore(); }
function apple(x, y, s, a = 1) { const b = new OffscreenCanvas(FOOD_W, 7); drawFood(b.getContext("2d"), 0, 0); ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = false; ctx.drawImage(b, x, y, FOOD_W * s, 7 * s); ctx.restore(); }

// фон
function background(T) {
  ctx.fillStyle = "#050306"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,80,100,.045)"; ctx.lineWidth = 1; ctx.beginPath();
  const off = (T * 6) % 64;
  for (let x = -64 + off; x < W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const g = ctx.createRadialGradient(540, 1500, 60, 540, 1500, 1100);
  g.addColorStop(0, "rgba(130,10,28,.45)"); g.addColorStop(1, "rgba(130,10,28,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = rng(11); ctx.fillStyle = "rgba(255,120,130,.35)";
  for (let i = 0; i < 40; i++) {
    const x = (r() * W + T * (8 + r() * 14)) % W, y = (r() * H - T * (6 + r() * 10) + H * 10) % H;
    ctx.globalAlpha = .25 + .25 * Math.sin(T * 2 + i); ctx.fillRect(x, y, 3, 3);
  }
  ctx.globalAlpha = 1;
}
function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .8);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.6)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const H40 = 40 * 3600 + 12 * 60 + 37;
const timerSecs = T => (T < P(7) ? H40 : H40 - (T - P(7)));
const fmt = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };
function hud(T) {
  const a = clamp((T - .3) / .4) * (1 - prog(T, VO_END, VO_END + .3));
  mono("ТАЙМЕР", 60, 120, { size: 20, color: "rgba(255,70,90,.6)", align: "left", alpha: a, spacing: 3 });
  text(fmt(timerSecs(T)), 60, 162, { size: 44, family: "JetBrains Mono", weight: 700, color: RED, align: "left", alpha: a, blur: 18, spacing: 2 });
  mono("СЕРИЯ 2 · ОНЛАЙН", 1020, 140, { size: 22, color: "rgba(255,210,216,.55)", align: "right", alpha: a, spacing: 3 });
}

// ведущий: крупно снизу
const HS = 2.1;
let TRACK = [];
function buildTrack() {
  TRACK = [
    { p: "P1", t0: 0, t1: P(1) - .05, enter: "fade" },
    { p: "P4", t0: P(1) - .05, t1: P(3) - .05, enter: "cut" },
    { p: "Q1", t0: P(3) - .05, t1: P(5) - .05, enter: "cut" },
    { p: "P5", t0: P(5) - .05, t1: P(6) - .05, enter: "cut" },
    { p: "Q5", t0: P(6) - .05, t1: P(7) - .05, enter: "cut" },
    { p: "P1", t0: P(7) - .05, t1: VO_END + .2, enter: "cut" },
  ];
}
function mouth(T) {
  if (!LIPS) return 0;
  const s = LIPS.tracks.intro, i = Math.floor((T - IO) * LIPS.fps);
  return i >= 0 && i < s.length ? +s[i] : 0;
}
function drawHost(T, pch) {
  const m = mouth(T);
  for (const seg of TRACK) {
    if (T < seg.t0 || T > seg.t1 + .35) continue;
    const next = TRACK.find(s => Math.abs(s.t0 - seg.t1) < .02);
    let a = 1, dx = 0;
    if (seg.enter === "fade") a = prog(T, seg.t0, seg.t0 + .8);
    if (T > seg.t1) { if (next) continue; const k = prog(T, seg.t1, seg.t1 + .35); a *= 1 - k; dx += k * 200; }
    const settle = seg.enter === "cut" ? (1 - easeOut(clamp((T - seg.t0) / .35))) * .045 : 0;
    drawPose(ctx, seg.p, { screenX: 540 + dx, scale: HS * (1 + settle + pch), alpha: a, bottom: H + 12, dy: 4 + Math.sin(T * 1.7) * 4 + m * 2.5, mouth: m });
  }
}
function flash(T) {
  let f = 0;
  for (const s of TRACK) if (s.enter === "cut") { const d = T - s.t0; if (d >= 0 && d < .16) f = Math.max(f, .06 * (1 - d / .16)); }
  if (f > 0) { ctx.fillStyle = `rgba(255,40,60,${f})`; ctx.fillRect(0, 0, W, H); }
}
let PUNCHES = [];
function punch(T) { let p = 0; for (const t of PUNCHES) { const d = T - t; if (d >= 0 && d < .4) p = Math.max(p, .03 * (1 - d / .4)); } return p; }

// субтитры — посередине, над головой ведущего
function captions(T) {
  for (let i = 0; i < PH.length; i++) {
    const t0 = P(i), t1 = i + 1 < PH.length ? P(i + 1) : VO_END;
    if (T < t0 || T > t1) continue;
    const pop = easeOut(prog(T, t0, t0 + .16));
    const o = i === 7 ? { size: 120 } : i === 2 ? { color: "#c9ffbf", glow: "rgba(111,211,107,.7)" } : {};
    text(PH[i].cap, 540, 820, { size: 76, ...o, scale: 1 + .22 * (1 - pop), alpha: pop, maxW: 980 });
  }
}

// сцены (верхняя половина кадра)
const CX = 540;
function scLaptop(T) {
  const a = win(T, .3, P(2) - .1, .3); if (a <= 0) return;
  const y0 = 300;
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = "#c4a9b0"; ctx.lineWidth = 8;
  rr(CX - 330, y0, 660, 400, 22); ctx.stroke();
  ctx.fillStyle = "#c4a9b0"; rr(CX - 400, y0 + 412, 800, 20, 8); ctx.fill(); ctx.restore();
  mono("localhost", CX - 300, y0 + 365, { size: 24, color: "#c4a9b0", align: "left", alpha: a });
  const out = easeOut(prog(T, P(1), P(1) + .9));
  const bx = CX, by = y0 + 370 - out * 180;
  if (out > 0) { // Битик выпрыгивает из экрана
    ctx.save(); ctx.globalAlpha = a * out * .5; ctx.strokeStyle = RED; ctx.lineWidth = 3; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(CX, y0 + 360); ctx.lineTo(CX, by - 120); ctx.stroke(); ctx.restore();
  }
  bitik(out > .5 ? "happy" : "normal", bx, by, 12, a, (T % 3.1) < .12);
}
function scGlobe(T) {
  const a = win(T, P(2) - .2, P(4) - .1, .3); if (a <= 0) return;
  const r = rng(5), cy = 460;
  const fed = T > P(3) + .5;
  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2 + r() * .1, d = 300 + r() * 110, x = CX + Math.cos(ang) * d, y = cy + Math.sin(ang) * d * .75;
    const k = easeOut(prog(T, P(2) + r() * 1.2, P(2) + r() * 1.2 + .3));
    ctx.save(); ctx.globalAlpha = a * k;
    ctx.strokeStyle = fed ? "rgba(111,211,107,.35)" : "rgba(255,90,110,.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX, cy); ctx.lineTo(x, y); ctx.stroke();
    ctx.fillStyle = fed ? GREEN : "#ff8a96"; ctx.beginPath(); ctx.arc(x, y, 10, 0, 7); ctx.fill(); ctx.restore();
  }
  const tf = P(3) + .1;
  if (T > tf && T < tf + .7) { const p = prog(T, tf, tf + .7); apple(CX - 30, lerp(140, cy + 40, p * p), 10, a); }
  bitik(fed ? "happy" : "normal", CX, cy + 110 + (fed && Math.floor(T * 4) % 2 ? -10 : 0), 12, a, !fed && (T % 3.1) < .12);
  if (fed) { const d = T - (P(3) + .5); for (let i = 0; i < 4; i++) heart(CX - 150 + i * 90, cy - 120 - d * (90 + i * 25), 14, a * clamp(1.4 - d)); }
}
function scHome(T) {
  const a = win(T, P(4) - .1, P(5) - .1, .3); if (a <= 0) return;
  const x = 150, y = 280, w = 780, h = 460, k = easeOut(prog(T, P(4) - .1, P(4) + .3));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(CX, y + h / 2); ctx.scale(.9 + .1 * k, .9 + .1 * k); ctx.translate(-CX, -(y + h / 2));
  rr(x, y, w, h, 20); ctx.fillStyle = "rgba(16,10,14,.92)"; ctx.fill(); ctx.strokeStyle = "rgba(255,70,90,.4)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#ff5f57"; ctx.beginPath(); ctx.arc(x + 32, y + 32, 9, 0, 7); ctx.fill();
  ctx.fillStyle = "#febc2e"; ctx.beginPath(); ctx.arc(x + 60, y + 32, 9, 0, 7); ctx.fill();
  ctx.fillStyle = "#28c840"; ctx.beginPath(); ctx.arc(x + 88, y + 32, 9, 0, 7); ctx.fill();
  rr(x + 120, y + 14, w - 150, 38, 19); ctx.fillStyle = "rgba(255,255,255,.07)"; ctx.fill();
  ctx.restore();
  const caret = Math.floor(T * 2.5) % 2 ? "|" : " ";
  mono("https://" + caret, x + 145, y + 34, { size: 24, color: "#c4a9b0", align: "left", alpha: a });
  text("?", CX, y + 250, { size: 200, alpha: a * .9, color: "#ffd2d8", blur: 40 });
  bitik("normal", CX + 250, y + h - 30, 7, a);
}
function scPrice(T) {
  const a = win(T, P(5) - .1, P(6) - .1, .3); if (a <= 0) return;
  const k = easeOut(prog(T, P(5) + .3, P(5) + .6));
  mono("свой сервер", CX, 330, { size: 34, color: "#c4a9b0", alpha: a, spacing: 4 });
  text("1 470 ₽", CX, 480, { size: 170, alpha: a, scale: 1 + .12 * (1 - k), glow: "rgba(255,40,60,.85)", blur: 50 });
  text("в месяц", CX, 620, { size: 54, color: "#ffd2d8", glow: null, alpha: a });
}
function scTimer(T) {
  const a = win(T, P(6) - .1, VO_END + .1, .25); if (a <= 0) return;
  mono("ОСТАЛОСЬ", CX, 330, { size: 30, color: "rgba(255,70,90,.8)", alpha: a, spacing: 10 });
  text(fmt(timerSecs(T)), CX, 480, { size: 160, alpha: a, blur: 50, maxW: 1000, scale: 1 + .08 * (1 - easeOut(prog(T, P(6), P(6) + .3))) });
}
function endCard(T) {
  const a = win(T, VO_END + .1, END + 1, .3); if (a <= 0) return;
  const t0 = VO_END + .1;
  const g = T < t0 + .4 ? (Math.floor(T * 30) % 2 ? 10 : -10) : 0;
  mono("СЕРИЯ 2", 540 + g, 400, { size: 38, color: RED, alpha: a, spacing: 10 });
  text("ОНЛАЙН", 540 - g, 530, { size: 150, alpha: a, blur: 50, maxW: 980 });
  mono("как я обошёлся без сервера", 540, 650, { size: 30, color: "#ffd2d8", alpha: a * prog(T, t0 + .4, t0 + .8) });
  bitik("happy", 540, 1060 + (Math.floor(T * 4) % 2 ? -10 : 0), 16, a * prog(T, t0 + .3, t0 + .7));
  const c = a * easeOut(prog(T, t0 + .9, t0 + 1.3));
  if (c > 0) {
    ctx.save(); ctx.globalAlpha = c; rr(140, 1170, 800, 120, 60); ctx.fillStyle = "#e2445c"; ctx.fill(); ctx.restore();
    text("ПОЛНАЯ СЕРИЯ — НА КАНАЛЕ", 540, 1230, { size: 40, color: "#1a0f14", glow: null, alpha: c, maxW: 720 });
  }
  const d = a * easeOut(prog(T, t0 + 1.6, t0 + 2));
  if (d > 0) text("BITIK.SITE", 540, 1400, { size: 72, alpha: d, blur: 30 });
  if (d > 0) mono("покорми его сам", 540, 1480, { size: 28, color: "#c4a9b0", alpha: d });
}

function renderAt(T) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  background(T);
  const p = punch(T);
  drawHost(T, p);
  ctx.save();
  if (p > 0) { ctx.translate(W / 2, H / 2); ctx.scale(1 + p, 1 + p); ctx.translate(-W / 2, -H / 2); }
  scLaptop(T); scGlobe(T); scHome(T); scPrice(T); scTimer(T); endCard(T); captions(T);
  ctx.restore();
  hud(T); flash(T); vignette();
  const dip = Math.max(1 - clamp(T / .5), clamp((T - (DURATION - .6)) / .6));
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
  await loadHost("../ep1/assets/hero1.png", "../ep1/assets/hero2.png");
  LIPS = await (await fetch("../ep2/lipsync.json")).json();
  const tim = await (await fetch("../ep2/timings.json")).json();
  PH = tim.intro.phrases;
  VO_END = IO + tim.intro.duration;
  END = VO_END + 5.6; DURATION = END;
  buildTrack();
  PUNCHES = [P(5) + .3, P(6), P(7)];
  window.DURATION = DURATION;
  window.AUDIO_TRACKS = [{ key: "intro", file: "../ep2/assets/vo/intro.mp3", t: IO }];
  window.SFX_DIR = "../ep1/assets/sfx";
  window.MUSIC = "../ep1/assets/music.mp3";
  const c = [];
  const add = (t, name, vol) => c.push({ t, name, vol });
  add(P(1), "whoosh", .15); add(P(2), "sparkle", .3);
  add(P(3) + .1, "pop", .3); add(P(3) + .8, "chomp", .45);
  add(P(4), "typing", .25);
  for (const t of PUNCHES) add(t, "boom", .5);
  for (let i = 0; i < 2; i++) add(P(7) + i, "tick", .3);
  add(VO_END + .1, "glitch", .3); add(VO_END + 1, "pop", .4); add(VO_END + 1.7, "chime", .35);
  window.SFX_CUES = c;
  const q = new URLSearchParams(location.search);
  if (q.has("t")) renderAt(parseFloat(q.get("t")));
  else if (!q.has("static")) { const st = performance.now(); const loop = () => { renderAt(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  window.READY = true;
}
init();
