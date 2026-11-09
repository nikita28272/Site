// Shorts 1 (9:16): интро серии 1 «Рождение» + призыв смотреть полную серию.
// Озвучка, липсинк, звуки и музыка берутся из video/ep1.
import { SPRITE_W, SPRITE_H, FOOD_W, drawSprite, drawFood, countPixels } from "../../site/js/bitik.js";
import { loadHost, drawPose } from "../ep1/host.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const IO = 0.5, GO = IO + 25.1, END = IO + 31.2;
const DURATION = END;
const RED = "#ff4d5e";
let LIPS = null;

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
function bitik(mood, cx, bottom, s, o = {}) {
  const { alpha = 1, limit, blink = false, glitch = 0 } = o;
  sctx.clearRect(0, 0, SPRITE_W, SPRITE_H);
  drawSprite(sctx, mood, 0, 0, { blink, limit });
  const w = SPRITE_W * s, h = SPRITE_H * s, x = Math.round(cx - w / 2), y = Math.round(bottom - h);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha;
  if (glitch) {
    ctx.globalAlpha = alpha * .6;
    ctx.filter = "hue-rotate(140deg)"; ctx.drawImage(sb, x - glitch, y, w, h);
    ctx.filter = "hue-rotate(-90deg)"; ctx.drawImage(sb, x + glitch, y, w, h);
    ctx.filter = "none"; ctx.globalAlpha = alpha;
  }
  ctx.drawImage(sb, x, y, w, h); ctx.restore();
}
function heart(x, y, s, a) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#f29bb8"; for (const [dx, dy] of [[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]]) ctx.fillRect(x + dx * s, y + dy * s, s, s); ctx.restore(); }
function apple(x, y, s) { const b = new OffscreenCanvas(FOOD_W, 7); drawFood(b.getContext("2d"), 0, 0); ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(b, x, y, FOOD_W * s, 7 * s); ctx.restore(); }
function sproutIcon(x, y, s) {
  ctx.fillStyle = "#6fd36b"; for (const [dx, dy] of [[0,0],[1,0],[3,0],[4,0],[1,1],[3,1]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
  ctx.fillStyle = "#3f8f4a"; for (const [dx, dy] of [[2,1],[2,2],[2,3]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
}

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
  const r = rng(7); ctx.fillStyle = "rgba(255,120,130,.35)";
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
const H48 = 48 * 3600;
const timerSecs = T => (T < GO ? H48 : H48 - (T - GO));
const fmt = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };
function hud(T) {
  const a = clamp((T - .3) / .4);
  mono("ТАЙМЕР", 60, 120, { size: 20, color: "rgba(255,70,90,.6)", align: "left", alpha: a, spacing: 3 });
  text(fmt(timerSecs(T)), 60, 162, { size: 44, family: "JetBrains Mono", weight: 700, color: RED, align: "left", alpha: a, blur: 18, spacing: 2 });
}

// ведущий: крупно снизу
const HS = 2.1;
const TRACK = [
  { p: "P1", t0: 0, t1: 3.0, enter: "fade" },
  { p: "P4", t0: 3.0, t1: 8.55, enter: "cut" },
  { p: "P5", t0: IO + 15.9, t1: IO + 17.95, enter: "slide" },
  { p: "P2", t0: IO + 17.95, t1: IO + 20.9, enter: "cut" },
  { p: "Q1", t0: IO + 24.9, t1: IO + 26.85, enter: "cut" },
  { p: "Q6", t0: IO + 26.85, t1: END + 1, enter: "cut" },
];
function mouth(T) {
  if (!LIPS) return 0;
  const s = LIPS.tracks.vo_intro, i = Math.floor((T - IO) * LIPS.fps);
  return i >= 0 && i < s.length ? +s[i] : 0;
}
function drawHost(T, pch) {
  const m = mouth(T);
  for (const seg of TRACK) {
    if (T < seg.t0 || T > seg.t1 + .35) continue;
    const next = TRACK.find(s => Math.abs(s.t0 - seg.t1) < .02);
    let a = 1, dx = 0;
    if (seg.enter === "slide") { const k = easeOut(prog(T, seg.t0, seg.t0 + .45)); a = k; dx = (1 - k) * 200; }
    else if (seg.enter === "fade") a = prog(T, seg.t0, seg.t0 + .8);
    if (T > seg.t1) { if (next) continue; const k = prog(T, seg.t1, seg.t1 + .35); a *= 1 - k; dx += k * 200; }
    const settle = seg.enter === "cut" ? (1 - easeOut(clamp((T - seg.t0) / .35))) * .045 : 0;
    drawPose(ctx, seg.p, { screenX: 540 + dx, scale: HS * (1 + settle + pch), alpha: a, bottom: H + 12, dy: 4 + Math.sin(T * 1.7) * 4 + m * 2.5, mouth: m });
  }
}
function flash(T) {
  let f = 0;
  for (const s of TRACK) if (s.enter === "cut") { const d = T - s.t0; if (d >= 0 && d < .16) f = Math.max(f, .07 * (1 - d / .16)); }
  if (f > 0) { ctx.fillStyle = `rgba(255,40,60,${f})`; ctx.fillRect(0, 0, W, H); }
}
const PUNCHES = [IO + 6.05, IO + 19.86, IO + 21.08, GO];
function punch(T) { let p = 0; for (const t of PUNCHES) { const d = T - t; if (d >= 0 && d < .4) p = Math.max(p, .03 * (1 - d / .4)); } return p; }

// субтитры — посередине, над головой ведущего
const GREEN = { color: "#9dff8a", glow: "rgba(111,211,107,.7)" }, GREY = { color: "#b9c3e6", glow: "rgba(125,134,168,.7)" };
const CAPS = [
  { end: IO + 8.1, items: [[IO + 2.77, "СОЗДАТЬ САЙТ"], [IO + 4.2, "ГДЕ ЖИВЁТ СУЩЕСТВО"], [IO + 6.05, "ОДНО", { size: 170 }], [IO + 7.05, "НА ВЕСЬ ИНТЕРНЕТ"]] },
  { end: IO + 11.6, items: [[IO + 8.75, "ЭТО БИТИК"], [IO + 9.83, "ИЗ БИТОГО ПИКСЕЛЯ"]] },
  { end: IO + 15.9, items: [[IO + 12.02, "ПОКОРМИТЕ"], [IO + 12.9, "СЧАСТЛИВ", GREEN], [IO + 14.0, "ЗАБУДЕТЕ"], [IO + 14.8, "ЗАГРУСТИТ", GREY]] },
  { end: IO + 20.9, items: [[IO + 16.24, "ЗАБУДУТ СОВСЕМ"], [IO + 18.53, "ИЗМЕНИТСЯ"], [IO + 19.86, "НАВСЕГДА", { color: "#ffd2d8", glow: "rgba(255,70,100,.85)", blur: 40, size: 130 }]] },
];
function captions(T) {
  for (const g of CAPS) {
    if (T < g.items[0][0] || T > g.end + .2) continue;
    let cur = null; for (const it of g.items) if (T >= it[0]) cur = it;
    const o = cur[2] || {}, pop = easeOut(prog(T, cur[0], cur[0] + .16));
    text(cur[1], 540, 780, { size: 84, ...o, scale: 1 + .22 * (1 - pop), alpha: pop * clamp((g.end + .2 - T) / .2), maxW: 980 });
  }
}

// сцены
function bigTimer(T) {
  const a = win(T, IO, IO + 2.4, .3);
  if (a > 0) text(fmt(H48), 540, 520, { size: 150, alpha: a, blur: 50, scale: 1 + .08 * (1 - easeOut(prog(T, IO, IO + .3))) });
  if (a > 0) text("ЧАСОВ, ЧТОБЫ…", 540, 680, { size: 52, color: "#ffd2d8", alpha: a * prog(T, IO + .6, IO + .9), glow: null });
  const b = win(T, GO, IO + 26.9, .25);
  if (b > 0) {
    text(fmt(timerSecs(T)), 540, 480, { size: 150, alpha: b, blur: 50 });
    text("ПОЕХАЛИ", 540, 680, { size: 110, alpha: b * easeOut(prog(T, GO, GO + .15)), scale: 1 + .25 * (1 - easeOut(prog(T, GO, GO + .15))) });
  }
}
const BX = 540, BB = 1480, BS = 22, TOTAL = countPixels("normal");
function scBitik(T) {
  const a = win(T, IO + 8.6, IO + 21.1, .3);
  if (a <= 0) return;
  const tBorn = IO + 8.75, tAsm = IO + 9.15;
  const by = T > IO + 15.9 ? lerp(BB, 700, ease(prog(T, IO + 15.9, IO + 16.6))) : BB;
  const sc = T > IO + 15.9 ? lerp(BS, 10, ease(prog(T, IO + 15.9, IO + 16.6))) : BS;
  if (T < tAsm) {
    if (T < tBorn) return;
    const f = Math.floor(T * 20);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = f % 3 ? (f % 2 ? "#ff3df2" : "#7de3ff") : "#fff";
    ctx.shadowColor = RED; ctx.shadowBlur = 40; ctx.fillRect(BX - BS / 2, by - 9 * BS, BS, BS); ctx.restore();
    return;
  }
  const limit = Math.floor(TOTAL * easeOut(prog(T, tAsm, IO + 10.8)));
  let mood = "normal", glitch = 0;
  const tFood = IO + 12.02, tEat = IO + 12.75, tForget = IO + 14.0;
  if (T >= tEat && T < tForget) mood = "happy";
  if (T >= tForget) mood = "sad";
  if (T >= IO + 18.53 && T < IO + 19.4) glitch = Math.floor(T * 30) % 2 ? 14 : -8;
  if (T >= IO + 19.86 && T < IO + 20.3) glitch = 20;
  const bob = mood === "sad" ? 0 : (Math.floor(T * (mood === "happy" ? 4 : 2)) % 2 ? -sc : 0);
  ctx.save(); ctx.globalAlpha = a * .5; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.ellipse(BX, by + 8, 8 * sc, 22, 0, 0, 7); ctx.fill(); ctx.restore();
  bitik(mood, BX, by + bob, sc, { alpha: a, limit, blink: mood === "normal" && (T % 3.1) < .12, glitch });
  if (T >= tFood && T < tEat) { const p = prog(T, tFood, tEat); apple(BX - 3 * BS, lerp(900, BB - 15 * BS, p * p), BS); }
  if (T >= tEat && T < tEat + 1.3) { const d = T - tEat; for (let i = 0; i < 4; i++) heart(BX - 130 + i * 75, BB - 330 - d * (100 + i * 30), 16, clamp(1.3 - d)); }
}
function teaser(T) {
  const a = win(T, IO + 16.6, IO + 21.1, .3);
  if (a <= 0) return;
  const y = lerp(250, 210, easeOut(prog(T, IO + 16.6, IO + 17.1))), x = 140, w = 800;
  ctx.save(); ctx.globalAlpha = a;
  rr(x, y, w, 150, 18); ctx.fillStyle = "rgba(16,10,14,.9)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,70,90,.4)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = RED; ctx.fillRect(x, y + 22, 5, 106);
  ctx.fillStyle = "rgba(111,211,107,.15)"; rr(x + 30, y + 30, 90, 90, 14); ctx.fill(); sproutIcon(x + 50, y + 52, 10);
  ctx.restore();
  text("ВО ЧТО ОН ВЫРАСТЕТ", x + 150, y + 62, { size: 38, weight: 700, align: "left", alpha: a, glow: null, maxW: 620 });
  mono("ЗА 48 ЧАСОВ", x + 150, y + 108, { size: 20, color: "#a8909a", align: "left", alpha: a, spacing: 3 });
  ctx.save(); ctx.globalAlpha = a; ctx.filter = "blur(12px)"; ctx.fillStyle = "#ff3b4f";
  ctx.fillRect(x + 60, y + 175, 220, 44); ctx.fillRect(x + 300, y + 175, 200, 44); ctx.fillRect(x + 520, y + 175, 160, 44);
  ctx.filter = "none"; ctx.restore();
  mono("покажу в конце", 540, y + 255, { size: 26, weight: 400, color: RED, alpha: a * (.6 + .4 * Math.sin(T * 5)), spacing: 2 });
}
function equation(T) {
  const a = win(T, IO + 21.08, IO + 24.9, .25);
  if (a <= 0) return;
  const p1 = easeOut(prog(T, IO + 21.08, IO + 21.3)), p2 = easeOut(prog(T, IO + 21.3, IO + 21.55)), p3 = easeOut(prog(T, IO + 21.55, IO + 21.8));
  text("1", 540, 420, { size: 300, alpha: a * p1, blur: 60, scale: 1.2 - .2 * p1 });
  text("САЙТ", 540, 640, { size: 100, alpha: a * p1, blur: 30 });
  ctx.save(); ctx.globalAlpha = a * p2; ctx.fillStyle = "#ffd6db"; ctx.fillRect(480, 760, 120, 22); ctx.fillRect(480, 820, 120, 22); ctx.restore();
  text("48:00", 540, 1010, { size: 220, alpha: a * p3, blur: 50, maxW: 1000 });
  text("ЧАСОВ", 540, 1200, { size: 100, color: RED, glow: "rgba(255,40,60,.9)", alpha: a * p3, blur: 30 });
  text("0 СТРОК КОДА НА СТАРТЕ", 540, 1400, { size: 48, weight: 700, color: "#c4a9b0", alpha: a * easeOut(prog(T, IO + 21.92, IO + 22.2)), glow: null });
}
function endCard(T) {
  const a = win(T, IO + 26.9, END + 1, .3);
  if (a <= 0) return;
  const g = T < IO + 27.3 ? (Math.floor(T * 30) % 2 ? 10 : -10) : 0;
  mono("СЕРИЯ 1", 540 + g, 380, { size: 36, color: RED, alpha: a, spacing: 10 });
  text("РОЖДЕНИЕ", 540 - g, 500, { size: 130, alpha: a, blur: 50, maxW: 980 });
  const c = a * easeOut(prog(T, IO + 27.7, IO + 28.1));
  if (c > 0) {
    ctx.save(); ctx.globalAlpha = c; rr(140, 640, 800, 120, 60); ctx.fillStyle = "#e2445c"; ctx.fill(); ctx.restore();
    text("ПОЛНАЯ СЕРИЯ — НА КАНАЛЕ", 540, 700, { size: 40, color: "#1a0f14", glow: null, alpha: c, maxW: 720 });
  }
}

function renderAt(T) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  background(T);
  const p = punch(T);
  drawHost(T, p);
  ctx.save();
  if (p > 0) { ctx.translate(W / 2, H / 2); ctx.scale(1 + p, 1 + p); ctx.translate(-W / 2, -H / 2); }
  bigTimer(T); scBitik(T); teaser(T); equation(T); endCard(T); captions(T);
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
  LIPS = await (await fetch("../ep1/lipsync.json")).json();
  window.DURATION = DURATION;
  window.AUDIO_TRACKS = [{ key: "vo_intro", file: "../ep1/assets/vo_intro.mp3", t: IO }];
  window.SFX_DIR = "../ep1/assets/sfx";
  window.MUSIC = "../ep1/assets/music.mp3";
  const c = [];
  const add = (t, name, vol) => c.push({ t, name, vol });
  add(IO + 15.85, "whoosh", .15);
  for (const t of PUNCHES) add(t, "boom", .55);
  for (let i = 0; i < 6; i++) add(GO + i, "tick", .35);
  add(IO + 8.75, "glitch", .35); add(IO + 18.53, "glitch", .35);
  add(IO + 9.15, "sparkle", .4); add(IO + 12.75, "chomp", .5);
  add(IO + 27.7, "pop", .4);
  window.SFX_CUES = c;
  const q = new URLSearchParams(location.search);
  if (q.has("t")) renderAt(parseFloat(q.get("t")));
  else if (!q.has("static")) { const st = performance.now(); const loop = () => { renderAt(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  window.READY = true;
}
init();
