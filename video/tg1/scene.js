// ТГ-челлендж «5 дней», интро для TikTok (9:16, ~36 с).
// Ведущий — тот же аниме-герой, тема красная. Голос — Evgeniy Rybakov (eleven_v3).
import { loadHost, drawPose } from "../ep1/host.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const IO = 0.5;                       // голос начинается через полсекунды
const VO_END = IO + 33.96;
const DURATION = VO_END + 2.2;
const CHANNEL = "@мой_канал";         // заменить на настоящий адрес канала
const RED = "#ff4d5e", PINK = "#ffd2d8", GREY = "#c4a9b0";
let LIPS = null;
const t = s => IO + s;                // время по словам из озвучки → время ролика

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (T, a, b) => clamp((T - a) / (b - a));
const easeOut = x => 1 - Math.pow(1 - x, 3);
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
  return w;
}
const mono = (s, x, y, o = {}) => text(s, x, y, { family: "JetBrains Mono", weight: 700, glow: null, ...o });
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
const pop = (T, a, d = .18) => easeOut(prog(T, a, a + d));

// ── фон ─────────────────────────────────────────────────────────────
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
  const r = rng(23); ctx.fillStyle = "rgba(255,120,130,.35)";
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

// ── таймер и счётчик ────────────────────────────────────────────────
const H120 = 120 * 3600, GO = t(32.51);
const timerSecs = T => (T < GO ? H120 : H120 - (T - GO) * 37);   // после «время пошло» — быстрая перемотка
const fmt = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(3 > 0 ? 2 : 2, "0")).join(":"); };
const subs = T => (T >= t(23.41) ? 1 : 0);
function hud(T) {
  const a = clamp((T - .3) / .4);
  mono("ОСТАЛОСЬ", 60, 120, { size: 20, color: "rgba(255,70,90,.6)", align: "left", alpha: a, spacing: 3 });
  text(fmt(timerSecs(T)), 60, 162, { size: 44, family: "JetBrains Mono", weight: 700, color: RED, align: "left", alpha: a, blur: 18, spacing: 2 });
  mono("ПОДПИСЧИКИ", 1020, 120, { size: 20, color: "rgba(255,70,90,.6)", align: "right", alpha: a, spacing: 3 });
  const k = pop(T, t(23.41), .3);
  mono("/ 10 000", 1020, 200, { size: 22, color: "rgba(255,210,216,.6)", align: "right", alpha: a });
  text(String(subs(T)), 1020, 162, { size: 44, family: "JetBrains Mono", weight: 700, color: T >= t(23.41) ? "#9dff8a" : "#fff", align: "right", alpha: a, blur: 18, scale: 1 + .5 * (1 - k) * (T >= t(23.41) ? 1 : 0) });
}

// ── ведущий: крупно снизу ───────────────────────────────────────────
const HS = 2.1;
const CUTS = [[0, "P1"], [t(3.38), "Q4"], [t(6.47), "P4"], [t(10.45), "Q5"], [t(15.02), "Q1"], [t(18.98), "P5"],
  [t(20.98), "P1"], [t(22.26), "P4"], [t(25.5), "Q5"], [t(28.1), "Q1"], [t(32.5), "P1"]];
function mouth(T) {
  if (!LIPS) return 0;
  const s = LIPS.tracks.vo, i = Math.floor((T - IO) * LIPS.fps);
  return i >= 0 && i < s.length ? +s[i] : 0;
}
function drawHost(T, pch) {
  let k = 0; for (let i = 0; i < CUTS.length; i++) if (T >= CUTS[i][0]) k = i;
  const [t0, p] = CUTS[k], m = mouth(T);
  const a = k === 0 ? prog(T, 0, .8) : 1;
  const settle = k ? (1 - easeOut(clamp((T - t0) / .35))) * .045 : 0;
  drawPose(ctx, p, { screenX: 540, scale: HS * (1 + settle + pch), alpha: a, bottom: H + 12, dy: 4 + Math.sin(T * 1.7) * 4 + m * 2.5, mouth: m });
}
function flash(T) {
  let f = 0;
  for (const [c] of CUTS.slice(1)) { const d = T - c; if (d >= 0 && d < .16) f = Math.max(f, .06 * (1 - d / .16)); }
  if (f > 0) { ctx.fillStyle = `rgba(255,40,60,${f})`; ctx.fillRect(0, 0, W, H); }
}
const PUNCHES = [t(0.07), t(3.38), t(20.98), t(23.41), GO];
function punch(T) { let p = 0; for (const s of PUNCHES) { const d = T - s; if (d >= 0 && d < .4) p = Math.max(p, .035 * (1 - d / .4)); } return p; }

// ── субтитры: по фразам, посередине ─────────────────────────────────
const CAPS = [
  [0.07, "ПЯТЬ ДНЕЙ"], [3.38, "НОЛЬ ПОДПИСЧИКОВ"], [6.47, "Я СОЗДАЛ ТЕЛЕГРАМ-КАНАЛ"], [8.61, "У МЕНЯ 120 ЧАСОВ"],
  [10.45, "ЧТОБЫ НАБРАТЬ…"], [11.97, "СТОЛЬКО, СКОЛЬКО ПОЛУЧИТСЯ"], [15.02, "БЕЗ РЕКЛАМЫ"], [15.85, "БЕЗ БОТОВ"],
  [17.19, "БЕЗ НАКРУТОК"], [18.98, "ТОЛЬКО Я…"], [20.98, "И ТЫ", { size: 130 }], [22.26, "КАЖДЫЙ, КТО ПОДПИШЕТСЯ"],
  [23.4, "+1 НА СЧЁТЧИКЕ", { color: "#c9ffbf", glow: "rgba(111,211,107,.7)" }], [25.5, "ЧЕРЕЗ 5 ДНЕЙ"], [26.6, "ФИНАЛЬНАЯ ЦИФРА"],
  [28.1, "ССЫЛКА В ПРОФИЛЕ"], [30.09, "ПОСМОТРИМ, НА ЧТО МЫ СПОСОБНЫ"], [32.5, "ВРЕМЯ ПОШЛО", { size: 110 }],
].map(([s, c, o]) => [t(s), c, o || {}]);
function captions(T) {
  for (let i = 0; i < CAPS.length; i++) {
    const [t0, cap, o] = CAPS[i], t1 = i + 1 < CAPS.length ? CAPS[i + 1][0] : VO_END + 1;
    if (T < t0 || T > t1) continue;
    const k = pop(T, t0, .16);
    text(cap, 540, 830, { size: 76, ...o, scale: 1 + .22 * (1 - k), alpha: k * clamp((VO_END + 1.3 - T) / .3), maxW: 980 });
  }
}

// ── иконки ──────────────────────────────────────────────────────────
function plane(cx, cy, s, a = 1, col = "#fff") { // бумажный самолётик
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(s, s); ctx.fillStyle = col;
  ctx.beginPath(); ctx.moveTo(-40, -4); ctx.lineTo(42, -36); ctx.lineTo(26, 36); ctx.lineTo(4, 16); ctx.lineTo(-6, 34); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.moveTo(-8, 10); ctx.lineTo(42, -36); ctx.lineTo(4, 16); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function strike(x0, x1, y, k, a) { if (k <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = RED; ctx.lineWidth = 12; ctx.lineCap = "round"; ctx.shadowColor = RED; ctx.shadowBlur = 18; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, k), y); ctx.stroke(); ctx.restore(); }

// ── сцены (верх кадра, 230–720) ─────────────────────────────────────
const CX = 540;
function scDays(T) { // «Пять дней»
  const a = win(T, t(0), t(3.3), .25); if (a <= 0) return;
  const k = pop(T, t(0.07), .3);
  text("5", CX, 400, { size: 330, alpha: a, blur: 60, scale: 1.3 - .3 * k });
  text("ДНЕЙ", CX, 620, { size: 96, alpha: a * k, color: PINK, blur: 20 });
}
function scZero(T) { // «Ноль подписчиков»
  const a = win(T, t(3.3), t(6.4), .2); if (a <= 0) return;
  const g = T < t(3.9) ? (Math.floor(T * 30) % 2 ? 14 : -10) : 0;
  if (g) { text("0", CX - g, 420, { size: 360, alpha: a * .5, color: "#7de3ff", glow: null }); text("0", CX + g, 420, { size: 360, alpha: a * .5, color: "#ff3df2", glow: null }); }
  text("0", CX, 420, { size: 360, alpha: a, blur: 60 });
  mono("подписчиков", CX, 640, { size: 40, color: GREY, alpha: a, spacing: 6 });
}
function channelCard(T, a, y, n, sub) {
  const x = 120, w = 840, h = 230;
  ctx.save(); ctx.globalAlpha = a;
  rr(x, y, w, h, 28); ctx.fillStyle = "rgba(18,10,14,.94)"; ctx.fill(); ctx.strokeStyle = "rgba(255,70,90,.45)"; ctx.lineWidth = 2; ctx.stroke();
  const g = ctx.createLinearGradient(x + 40, y + 45, x + 180, y + 185); g.addColorStop(0, "#ff5a6c"); g.addColorStop(1, "#a3122a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 110, y + 115, 72, 0, 7); ctx.fill(); ctx.restore();
  plane(x + 108, y + 118, .95, a);
  text("10 ТЫСЯЧ ЗА 5 ДНЕЙ", x + 220, y + 82, { size: 40, align: "left", alpha: a, glow: null, maxW: 580 });
  mono(CHANNEL, x + 220, y + 132, { size: 26, color: GREY, align: "left", alpha: a });
  mono(sub, x + 220, y + 180, { size: 28, color: n > 0 ? "#9dff8a" : PINK, align: "left", alpha: a });
}
function scChannel(T) { // «Я создал Телеграм-канал»
  const a = win(T, t(6.4), t(8.55), .25); if (a <= 0) return;
  const k = easeOut(prog(T, t(6.47), t(6.47) + .4));
  channelCard(T, a, lerp(520, 330, k), 0, "0 подписчиков");
  // самолётик пролетает по дуге
  const p = prog(T, t(6.47), t(7.8));
  if (p > 0 && p < 1) plane(lerp(-80, 1160, p), 260 - Math.sin(p * Math.PI) * 120, .8, a, PINK);
}
function scHours(T) { // «120 часов, чтобы набрать… столько, сколько получится»
  const a = win(T, t(8.55), t(14.9), .25); if (a <= 0) return;
  text(fmt(H120), CX, 360, { size: 150, alpha: a, blur: 50, scale: 1 + .08 * (1 - pop(T, t(9.49), .3)) });
  if (T >= t(10.45)) { // слот-машина с цифрами
    const b = a * pop(T, t(10.45), .2), spin = T < t(12.62);
    const r = rng(Math.floor(T * 18) + 1);
    const num = spin ? String(Math.floor(r() * 99999)).padStart(5, "0") : "?????";
    ctx.save(); ctx.globalAlpha = b; rr(190, 480, 700, 190, 26); ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.fill(); ctx.strokeStyle = "rgba(255,70,90,.4)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    text(num, CX, 578, { size: 120, family: "JetBrains Mono", weight: 700, alpha: b, color: spin ? PINK : "#fff", blur: 30 });
  }
}
function scNo(T) { // «Без рекламы. Без ботов. Без накруток.»
  const a = win(T, t(14.95), t(18.9), .25); if (a <= 0) return;
  const rows = [["РЕКЛАМА", 15.02, 15.69], ["БОТЫ", 15.85, 17.13], ["НАКРУТКИ", 17.19, 18.0]];
  rows.forEach(([w, s, e], i) => {
    const y = 330 + i * 140, b = a * pop(T, t(s), .15);
    const tw = text(w, CX, y, { size: 92, alpha: b, color: "#e9dfe2", glow: null }) || 0;
    strike(CX - tw / 2 - 20, CX + tw / 2 + 20, y, easeOut(prog(T, t(s) + .2, t(s) + .45)), b);
  });
}
function scYouMe(T) { // «Только я… и ты»
  const a = win(T, t(18.9), t(22.2), .25); if (a <= 0) return;
  text("Я", 250, 450, { size: 240, alpha: a, blur: 40 });
  const b = a * pop(T, t(21.1), .25);
  text("+", 470, 450, { size: 140, alpha: b, color: RED, glow: "rgba(255,40,60,.9)" });
  text("ТЫ", 770, 450, { size: 240, alpha: b, blur: 60, color: PINK, scale: 1.4 - .4 * pop(T, t(21.1), .25) });
}
function scPlusOne(T) { // «Каждый, кто подпишется — плюс один на этом счётчике. Через пять дней — финальная цифра»
  const a = win(T, t(22.2), t(28.0), .25); if (a <= 0) return;
  const after = T >= t(23.41), fin = T >= t(25.5);
  const n = fin ? "???" : after ? "1" : "0";
  const k = pop(T, t(23.41), .35);
  ctx.save(); if (fin) ctx.filter = `blur(${Math.round(10 * pop(T, t(25.5), .4))}px)`;
  text(n, CX, 420, { size: 300, alpha: a, blur: 60, color: after && !fin ? "#c9ffbf" : "#fff", glow: after && !fin ? "rgba(111,211,107,.8)" : "rgba(255,70,90,.5)", scale: after && !fin ? 1.25 - .25 * k : 1 });
  ctx.restore();
  mono("подписчиков", CX, 620, { size: 40, color: GREY, alpha: a, spacing: 6 });
  if (after && T < t(25.4)) { const d = T - t(23.41); text("+1", 800, 300 - d * 120, { size: 90, color: "#9dff8a", glow: "rgba(111,211,107,.9)", alpha: a * clamp(1.6 - d) }); }
  if (fin) mono("ДЕНЬ 5 · ФИНАЛ", CX, 220, { size: 30, color: RED, alpha: a * pop(T, t(26.6), .3), spacing: 6 });
}
function scLink(T) { // «Ссылка — в профиле. Посмотрим, на что мы способны»
  const a = win(T, t(28.0), t(32.45), .25); if (a <= 0) return;
  channelCard(T, a, 400, 1, "1 подписчик");
  const b = a * pop(T, t(28.1), .3), bob = Math.sin(T * 7) * 12;
  ctx.save(); ctx.globalAlpha = b; rr(270, 250 + bob, 540, 100, 50); ctx.fillStyle = "#e2445c"; ctx.fill(); ctx.restore();
  text("ССЫЛКА В ПРОФИЛЕ ↑", CX, 300 + bob, { size: 36, color: "#1a0f14", glow: null, alpha: b, maxW: 480 });
}
function scGo(T) { // «Время пошло»
  const a = win(T, t(32.45), DURATION + 1, .25); if (a <= 0) return;
  mono("ОСТАЛОСЬ", CX, 300, { size: 32, color: "rgba(255,70,90,.85)", alpha: a, spacing: 10 });
  text(fmt(timerSecs(T)), CX, 440, { size: 150, alpha: a, blur: 50, maxW: 1000, scale: 1 + .08 * (1 - pop(T, GO, .3)) });
  mono("ДЕНЬ 1 / 5", CX, 580, { size: 34, color: PINK, alpha: a * pop(T, GO + .4, .3), spacing: 6 });
}

function renderAt(T) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  background(T);
  const p = punch(T);
  drawHost(T, p);
  ctx.save();
  if (p > 0) { ctx.translate(W / 2, H / 2); ctx.scale(1 + p, 1 + p); ctx.translate(-W / 2, -H / 2); }
  scDays(T); scZero(T); scChannel(T); scHours(T); scNo(T); scYouMe(T); scPlusOne(T); scLink(T); scGo(T); captions(T);
  ctx.restore();
  hud(T); flash(T); vignette();
  const dip = Math.max(1 - clamp(T / .4), clamp((T - (DURATION - .5)) / .5));
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
  LIPS = await (await fetch("lipsync.json")).json();
  window.DURATION = DURATION;
  window.AUDIO_TRACKS = [{ key: "vo", file: "assets/vo.mp3", t: IO }];
  window.SFX_DIR = "../ep1/assets/sfx";
  window.MUSIC = "../ep1/assets/music.mp3";
  const c = [], add = (s, name, vol) => c.push({ t: s, name, vol });
  add(t(0.07), "boom", .55); add(t(3.38), "glitch", .4); add(t(6.47), "whoosh", .25); add(t(7.0), "pop", .35);
  for (let i = 0; i < 8; i++) add(t(10.45) + i * .26, "tick", .25);
  add(t(12.62), "boom", .35);
  for (const s of [15.22, 16.05, 17.39]) add(t(s), "denied", .35);
  add(t(20.98), "boom", .5); add(t(23.41), "pop", .5); add(t(23.45), "sparkle", .35);
  add(t(25.5), "glitch", .3); add(t(28.1), "chime", .4);
  add(GO, "boom", .55); for (let i = 0; i < 3; i++) add(GO + .4 + i * .5, "tick", .3);
  window.SFX_CUES = c;
  const q = new URLSearchParams(location.search);
  if (q.has("t")) renderAt(parseFloat(q.get("t")));
  else if (!q.has("static")) { const st = performance.now(); const loop = () => { renderAt(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  window.READY = true;
}
init();
