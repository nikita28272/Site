// ТГ-челлендж «5 дней», интро для TikTok (9:16, ~36 с).
// Ведущий — тот же аниме-герой, тема красная. Голос — Evgeniy Rybakov (eleven_v3).
import { loadHost, drawPose } from "../ep1/host.js";

const W = 1080, H = 1920;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const IO = 0.4;                       // голос начинается чуть позже кадра
const VO_END = IO + 27.0;
const DURATION = VO_END + 1.6;
const CHANNEL = "t.me/za5days";
const BEAT = 60 / 130;                // темп музыки
const MUSIC_FILE = new URLSearchParams(location.search).get("music") || "assets/music.mp3"; // нет файла — ролик без музыки
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
const H120 = 120 * 3600, GO = t(25.82);
const timerSecs = T => (T < GO ? H120 : H120 - (T - GO) * 37);   // после «время пошло» — быстрая перемотка
const fmt = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };
const PLUS = t(17.9);
const subs = T => (T >= PLUS ? 1 : 0);
function hud(T) {
  const a = clamp((T - .2) / .3);
  mono("ОСТАЛОСЬ", 60, 120, { size: 20, color: "rgba(255,70,90,.6)", align: "left", alpha: a, spacing: 3 });
  text(fmt(timerSecs(T)), 60, 162, { size: 44, family: "JetBrains Mono", weight: 700, color: RED, align: "left", alpha: a, blur: 18, spacing: 2 });
  mono("ПОДПИСЧИКИ", 1020, 120, { size: 20, color: "rgba(255,70,90,.6)", align: "right", alpha: a, spacing: 3 });
  const k = pop(T, PLUS, .3), on = T >= PLUS;
  text(String(subs(T)), 1020, 162, { size: 44, family: "JetBrains Mono", weight: 700, color: on ? "#9dff8a" : "#fff", align: "right", alpha: a, blur: 18, scale: 1 + .6 * (1 - k) * (on ? 1 : 0) });
  mono("/ 10 000", 1020, 200, { size: 22, color: "rgba(255,210,216,.6)", align: "right", alpha: a });
  // полоса прогресса к цели
  ctx.save(); ctx.globalAlpha = a; rr(60, 226, 960, 8, 4); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fill();
  if (on) { rr(60, 226, 12, 8, 4); ctx.fillStyle = "#9dff8a"; ctx.fill(); }
  ctx.restore();
}

// ── ведущий: крупно снизу, частая смена поз ─────────────────────────
const HS = 2.1;
const CUTS = [[0, "P1"], [t(2.06), "Q4"], [t(4.17), "P4"], [t(6.59), "Q1"], [t(7.75), "Q5"], [t(10.54), "Q1"], [t(12.56), "Q4"],
  [t(13.99), "P5"], [t(15.28), "P1"], [t(16.66), "P4"], [t(19.73), "Q5"], [t(22.77), "Q1"], [t(23.92), "P4"], [GO, "P1"]];
function mouth(T) {
  if (!LIPS) return 0;
  const s = LIPS.tracks.vo, i = Math.floor((T - IO) * LIPS.fps);
  return i >= 0 && i < s.length ? +s[i] : 0;
}
function drawHost(T, pch) {
  let k = 0; for (let i = 0; i < CUTS.length; i++) if (T >= CUTS[i][0]) k = i;
  const [t0, p] = CUTS[k], m = mouth(T);
  const a = k === 0 ? prog(T, 0, .4) : 1;
  const settle = k ? (1 - easeOut(clamp((T - t0) / .3))) * .07 : 0;
  const beat = .012 * Math.max(0, 1 - ((T - IO) % BEAT) / (BEAT * .5));
  drawPose(ctx, p, { screenX: 540, scale: HS * (1 + settle + pch + beat), alpha: a, bottom: H + 12, dy: 4 + Math.sin(T * 2.4) * 5 + m * 2.5, mouth: m });
}
function flash(T) {
  let f = 0;
  for (const [c] of CUTS.slice(1)) { const d = T - c; if (d >= 0 && d < .14) f = Math.max(f, .07 * (1 - d / .14)); }
  for (const c of PUNCHES) { const d = T - c; if (d >= 0 && d < .18) f = Math.max(f, .16 * (1 - d / .18)); }
  if (f > 0) { ctx.fillStyle = `rgba(255,40,60,${f})`; ctx.fillRect(0, 0, W, H); }
}
const PUNCHES = [t(0.02), t(2.06), t(6.59), t(8.4), t(10.54), t(11.7), t(12.56), t(15.28), PLUS, t(19.73), t(22.77), GO];
function punch(T) { let p = 0; for (const s of PUNCHES) { const d = T - s; if (d >= 0 && d < .35) p = Math.max(p, .05 * (1 - d / .35)); } return p; }
function shake(T) { // короткая тряска камеры на ударах
  let k = 0; for (const s of PUNCHES) { const d = T - s; if (d >= 0 && d < .25) k = Math.max(k, 1 - d / .25); }
  if (!k) return [0, 0];
  const r = rng(Math.floor(T * 60) + 3); return [(r() - .5) * 26 * k, (r() - .5) * 26 * k];
}

// ── субтитры: по фразам, посередине ─────────────────────────────────
const CAPS = [
  [0.02, ""], [2.06, ""], [4.17, "Я СОЗДАЛ ТЕЛЕГРАМ-КАНАЛ"], [6.59, "СЕЙЧАС В НЁМ — НОЛЬ"],
  [7.75, ""], [9.0, "ЧТОБЫ ЭТО ИСПРАВИТЬ"], [10.54, ""], [11.7, ""],
  [12.56, ""], [13.99, ""], [15.28, ""], [16.66, "КАЖДЫЙ, КТО ПОДПИШЕТСЯ"],
  [17.9, ""], [19.73, "ЧЕРЕЗ 5 ДНЕЙ УЗНАЕМ"], [21.0, "ПОЛУЧИЛОСЬ ИЛИ НЕТ"],
  [22.77, ""], [23.92, "ПОСМОТРИМ, НА ЧТО МЫ СПОСОБНЫ"], [25.82, "ВРЕМЯ ПОШЛО!", { size: 110 }],
].map(([s, c, o]) => [t(s), c, o || {}]);
function captions(T) {
  for (let i = 0; i < CAPS.length; i++) {
    const [t0, cap, o] = CAPS[i], t1 = i + 1 < CAPS.length ? CAPS[i + 1][0] : VO_END + 1;
    if (!cap || T < t0 || T > t1) continue; // пустая подпись — текст уже есть в кадре
    const k = pop(T, t0, .12);
    text(cap, 540, 830, { size: 76, ...o, scale: 1 + .3 * (1 - k), alpha: k * clamp((VO_END + 1.2 - T) / .3), maxW: 980 });
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

// ── сцены (верх кадра, 260–720) ─────────────────────────────────────
const CX = 540;
function scGoal(T) { // «Десять тысяч подписчиков. За пять дней.»
  const a = win(T, 0, t(4.1), .2); if (a <= 0) return;
  const k = pop(T, t(0.02), .3);
  // цифры «набегают» до 10 000
  const n = Math.round(10000 * easeOut(prog(T, t(0.02), t(1.3))));
  text(n.toLocaleString("ru-RU").replace(/ /g, " "), CX, 400, { size: 210, alpha: a, blur: 60, scale: 1.3 - .3 * k, maxW: 1000 });
  const b = a * pop(T, t(2.06), .2);
  text("ЗА 5 ДНЕЙ", CX, 600, { size: 96, alpha: b, color: PINK, blur: 24, scale: 1.4 - .4 * pop(T, t(2.06), .2) });
}
function channelCard(T, a, y, n, sub) {
  const x = 100, w = 880, h = 230;
  ctx.save(); ctx.globalAlpha = a;
  rr(x, y, w, h, 28); ctx.fillStyle = "rgba(24,30,40,.96)"; ctx.fill(); ctx.strokeStyle = "rgba(255,70,90,.45)"; ctx.lineWidth = 2; ctx.stroke();
  const g = ctx.createLinearGradient(0, y + 40, 0, y + 190); g.addColorStop(0, "#f08aa3"); g.addColorStop(1, "#d25f7c");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 110, y + 115, 74, 0, 7); ctx.fill(); ctx.restore();
  text("10", x + 110, y + 118, { size: 56, alpha: a, glow: null });
  text("10.000 за ПЯТЬ ДНЕЙ", x + 220, y + 80, { size: 40, align: "left", alpha: a, glow: null, maxW: 620 });
  mono(CHANNEL, x + 220, y + 132, { size: 28, color: "#8fb8ff", align: "left", alpha: a });
  mono(sub, x + 220, y + 180, { size: 28, color: n > 0 ? "#9dff8a" : PINK, align: "left", alpha: a });
}
function scChannel(T) { // «Я создал Телеграм-канал — и сейчас в нём ноль»
  const a = win(T, t(4.1), t(7.7), .2); if (a <= 0) return;
  const k = easeOut(prog(T, t(4.17), t(4.17) + .35));
  const zero = T >= t(6.59);
  channelCard(T, a, lerp(560, zero ? 250 : 330, k), 0, "0 подписчиков");
  const p = prog(T, t(4.17), t(5.4));
  if (p > 0 && p < 1) plane(lerp(-80, 1160, p), 250 - Math.sin(p * Math.PI) * 110, .8, a, PINK);
  if (zero) {
    const b = a * pop(T, t(6.59), .15), g = T < t(6.59) + .45 ? (Math.floor(T * 30) % 2 ? 14 : -10) : 0;
    if (g) { text("0", CX - g, 600, { size: 200, alpha: b * .5, color: "#7de3ff", glow: null }); text("0", CX + g, 600, { size: 200, alpha: b * .5, color: "#ff3df2", glow: null }); }
    text("0", CX, 600, { size: 200, alpha: b, blur: 50, scale: 1.4 - .4 * pop(T, t(6.59), .15) });
  }
}
function scHours(T) { // «У меня сто двадцать часов, чтобы это исправить»
  const a = win(T, t(7.7), t(10.45), .2); if (a <= 0) return;
  text(fmt(H120), CX, 380, { size: 130, alpha: a, blur: 50, maxW: 900, scale: 1 + .06 * (1 - pop(T, t(8.4), .3)) });
  const b = a * pop(T, t(9.0), .2);
  ctx.save(); ctx.globalAlpha = b; rr(140, 520, 800, 34, 17); ctx.fillStyle = "rgba(255,255,255,.08)"; ctx.fill();
  const fill = 800 * easeOut(prog(T, t(9.0), t(10.2)));
  rr(140, 520, Math.max(34, fill), 34, 17); const g = ctx.createLinearGradient(140, 0, 940, 0); g.addColorStop(0, "#e2445c"); g.addColorStop(1, "#9dff8a"); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  mono("0", 140, 600, { size: 30, color: GREY, align: "left", alpha: b });
  mono("10 000", 940, 600, { size: 30, color: "#9dff8a", align: "right", alpha: b });
}
function scNo(T) { // «Без рекламы. Без ботов. Без накруток.»
  const a = win(T, t(10.45), t(13.9), .2); if (a <= 0) return;
  const rows = [["РЕКЛАМА", 10.54], ["БОТЫ", 11.7], ["НАКРУТКИ", 12.56]];
  rows.forEach(([w, s], i) => {
    const y = 340 + i * 140, b = a * pop(T, t(s), .12);
    const tw = text(w, CX, y, { size: 92, alpha: b, color: "#e9dfe2", glow: null, scale: 1.3 - .3 * pop(T, t(s), .12) }) || 0;
    strike(CX - tw / 2 - 20, CX + tw / 2 + 20, y, easeOut(prog(T, t(s) + .15, t(s) + .35)), b);
  });
}
function scYouMe(T) { // «Только я… и ты»
  const a = win(T, t(13.9), t(16.6), .2); if (a <= 0) return;
  text("Я", 250, 450, { size: 240, alpha: a * pop(T, t(13.99), .15), blur: 40 });
  const b = a * pop(T, t(15.28), .2);
  text("+", 470, 450, { size: 140, alpha: b, color: RED, glow: "rgba(255,40,60,.9)" });
  text("ТЫ", 770, 450, { size: 240, alpha: b, blur: 60, color: PINK, scale: 1.5 - .5 * pop(T, t(15.28), .2) });
}
function scPlusOne(T) { // «Каждый, кто подпишется — плюс один. Через пять дней узнаем: получилось или нет»
  const a = win(T, t(16.6), t(22.7), .2); if (a <= 0) return;
  const after = T >= PLUS, fin = T >= t(19.73);
  const k = pop(T, PLUS, .3);
  if (!fin) {
    text(after ? "1" : "0", CX, 420, { size: 300, alpha: a, blur: 60, color: after ? "#c9ffbf" : "#fff", glow: after ? "rgba(111,211,107,.8)" : "rgba(255,70,90,.5)", scale: after ? 1.3 - .3 * k : 1 });
    mono("подписчиков", CX, 620, { size: 40, color: GREY, alpha: a, spacing: 6 });
    if (after) { const d = T - PLUS; for (let i = 0; i < 5; i++) text("+1", 200 + i * 170, 330 - d * (150 + i * 40), { size: 70, color: "#9dff8a", glow: "rgba(111,211,107,.9)", alpha: a * clamp(1.4 - d) * (i % 2 ? .7 : 1) }); }
  } else {
    const q = pop(T, t(19.73), .2), blink = Math.floor((T - t(19.73)) / .3) % 2;
    mono("ДЕНЬ 5 · ФИНАЛ", CX, 290, { size: 32, color: RED, alpha: a * q, spacing: 6 });
    text("10 000", CX - 70, 440, { size: 160, alpha: a * q, blur: 50, scale: 1.3 - .3 * q });
    text("?", 950, 430, { size: 190, color: RED, glow: "rgba(255,40,60,.9)", alpha: a * q * (T >= t(21.0) ? (blink ? 1 : .35) : 1) });
    if (T >= t(21.0)) { const b = a * pop(T, t(21.0), .2); text("✓", 380, 620, { size: 90, color: "#9dff8a", glow: "rgba(111,211,107,.8)", alpha: b }); text("✕", 700, 620, { size: 90, color: RED, glow: "rgba(255,40,60,.8)", alpha: b }); }
  }
}
function scLink(T) { // «Ссылка — в профиле. Посмотрим, на что мы способны»
  const a = win(T, t(22.7), t(25.75), .2); if (a <= 0) return;
  channelCard(T, a, 420, 1, "1 подписчик");
  const b = a * pop(T, t(22.77), .25), bob = Math.sin(T * 9) * 14;
  ctx.save(); ctx.globalAlpha = b; rr(250, 270 + bob, 580, 104, 52); ctx.fillStyle = "#e2445c"; ctx.fill(); ctx.restore();
  text("ССЫЛКА В ПРОФИЛЕ ↑", CX, 322 + bob, { size: 38, color: "#1a0f14", glow: null, alpha: b, maxW: 520 });
}
function scGo(T) { // «Время пошло»
  const a = win(T, t(25.75), DURATION + 1, .2); if (a <= 0) return;
  mono("ОСТАЛОСЬ", CX, 300, { size: 32, color: "rgba(255,70,90,.85)", alpha: a, spacing: 10 });
  text(fmt(timerSecs(T)), CX, 440, { size: 150, alpha: a, blur: 50, maxW: 1000, scale: 1.2 - .2 * pop(T, GO, .3) });
  mono("ДЕНЬ 1 / 5 · t.me/za5days", CX, 580, { size: 30, color: PINK, alpha: a * pop(T, GO + .3, .3), spacing: 2 });
}

function renderAt(T) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  background(T);
  const p = punch(T), [sx, sy] = shake(T);
  ctx.save(); ctx.translate(sx, sy);
  drawHost(T, p);
  if (p > 0) { ctx.translate(W / 2, H / 2); ctx.scale(1 + p, 1 + p); ctx.translate(-W / 2, -H / 2); }
  scGoal(T); scChannel(T); scHours(T); scNo(T); scYouMe(T); scPlusOne(T); scLink(T); scGo(T); captions(T);
  ctx.restore();
  hud(T); flash(T); vignette();
  const dip = Math.max(1 - clamp(T / .25), clamp((T - (DURATION - .4)) / .4));
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
  window.MUSIC = MUSIC_FILE;
  const c = [], add = (s, name, vol) => c.push({ t: s, name, vol });
  for (const s of PUNCHES) add(s, "boom", .4);
  add(t(4.17), "whoosh", .25); add(t(4.6), "chime", .22); add(t(6.59), "glitch", .4);
  add(t(9.0), "sparkle", .3);
  for (const s of [10.69, 11.85, 12.71]) add(t(s), "denied", .35);
  add(PLUS + .02, "chime", .4); add(PLUS + .05, "sparkle", .35);
  add(t(21.0), "glitch", .3); add(t(22.9), "chime", .4);
  for (let i = 0; i < 3; i++) add(GO + .4 + i * .5, "tick", .3);
  window.SFX_CUES = c;
  const q = new URLSearchParams(location.search);
  if (q.has("t")) renderAt(parseFloat(q.get("t")));
  else if (!q.has("static")) { const st = performance.now(); const loop = () => { renderAt(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  window.READY = true;
}
init();
