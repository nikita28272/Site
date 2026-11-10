// Серия 2 «Онлайн». Интро с ведущим крупно → «экран компьютера» с окнами, курсором и ведущим в кружке → финал.
// Тайминги фраз — timings.json (align.py), липсинк — lipsync.json. Блоки без озвучки получают оценочную длину.
import {
  SPRITE_W, SPRITE_H, ROOM_W, ROOM_H, BITIK_X, BITIK_Y, FOOD_W,
  drawSprite, drawRoom, drawFood,
} from "../../site/js/bitik.js";
import { loadHost, drawPose, POSES } from "../ep1/host.js";

const W = 1920, H = 1080;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");
const ORDER = ["intro", "server", "domain", "memory", "feed", "guard", "online", "search", "outro"];
const DESK = ["server", "domain", "memory", "feed", "guard", "online", "search"];
const STEP = { server: "сервер", domain: "домен", memory: "база", feed: "кнопка", guard: "защита", online: "онлайн", search: "поиск" };
const T0 = 0.6, GAP = 0.8;
const RED = "#ff4d5e", GREEN = "#9dff8a";
let BLK = {}, DURATION = 60, LIPS = null, TRACKS = [];

// ── утилиты ─────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (T, a, b) => clamp((T - a) / (b - a));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const win = (T, a, b, f = .25) => clamp(Math.min((T - a) / f, (b - T) / f));
const lerp = (a, b, p) => a + (b - a) * p;
const P = (id, i) => BLK[id].ph[Math.min(i, BLK[id].ph.length - 1)].t0;
const S = id => BLK[id].start, E = id => BLK[id].end;
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function text(str, x, y, o = {}) {
  let { size = 64, weight = 900, family = "Unbounded", color = "#fff", glow = "rgba(255,70,90,.5)", blur = 28,
    align = "center", alpha = 1, scale = 1, spacing = 0, maxW = 0 } = o;
  if (alpha <= 0) return;
  ctx.save();
  ctx.font = `${weight} ${size}px "${family}"`;
  ctx.letterSpacing = spacing + "px";
  if (maxW) { const w = ctx.measureText(str).width; if (w > maxW) { size = Math.floor(size * maxW / w); ctx.font = `${weight} ${size}px "${family}"`; } }
  ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.textAlign = align; ctx.textBaseline = "middle";
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur; }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0);
  ctx.shadowBlur = 0; ctx.fillText(str, 0, 0);
  ctx.restore();
}
const mono = (s, x, y, o = {}) => text(s, x, y, { family: "JetBrains Mono", weight: 400, glow: null, ...o });
const ui = (s, x, y, o = {}) => text(s, x, y, { family: "JetBrains Mono", weight: 700, glow: null, ...o });

const sb = new OffscreenCanvas(SPRITE_W, SPRITE_H), sctx = sb.getContext("2d");
function bitik(mood, cx, bottom, s, alpha = 1) {
  sctx.clearRect(0, 0, SPRITE_W, SPRITE_H); drawSprite(sctx, mood, 0, 0);
  ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sb, Math.round(cx - SPRITE_W * s / 2), Math.round(bottom - SPRITE_H * s), SPRITE_W * s, SPRITE_H * s); ctx.restore();
}
const bob = (T, mood) => (mood === "sad" ? 0 : Math.floor(T * (mood === "happy" ? 4 : 2)) % 2 ? -1 : 0);

// ── фон серии (интро/финал) и HUD ──────────────────────────────────
function stageBg(T) {
  ctx.fillStyle = "#050306"; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,80,100,.045)"; ctx.lineWidth = 1; ctx.beginPath();
  const off = (T * 6) % 64;
  for (let x = -64 + off; x < W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const g = ctx.createRadialGradient(760, 980, 50, 760, 980, 950);
  g.addColorStop(0, "rgba(130,10,28,.42)"); g.addColorStop(1, "rgba(130,10,28,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
const H40 = 40 * 3600 + 12 * 60 + 37, HEND = 27 * 3600 + 48 * 60 + 5;
function timerSecs(T) {
  if (!BLK.intro) return H40;
  const go = P("intro", 7);
  if (T < go) return H40;
  return lerp(H40, HEND, ease(prog(T, go + 1.5, P("outro", 4))));
}
const fmt = s => { s = Math.max(0, Math.floor(s)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(v => String(v).padStart(2, "0")).join(":"); };
function hud(T, desk) {
  const a = clamp((T - .3) / .4);
  const x = desk ? W - 72 : 72, al = desk ? "right" : "left";
  ui("ТАЙМЕР", x, 50, { size: 14, color: "rgba(255,70,90,.6)", align: al, alpha: a, spacing: 3 });
  text(fmt(timerSecs(T)), x, 82, { size: desk ? 28 : 34, family: "JetBrains Mono", weight: 700, color: RED, align: al, alpha: a, blur: 18, spacing: 2 });
}

// ── ведущий ─────────────────────────────────────────────────────────
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
// крупно: интро и финал
const BIG = { intro: [[0, "P1"], [2, "P4"], [4, "Q5"], [5, "P5"], [7, "Q1"]], outro: [[0, "P1"], [2, "Q1"], [3, "P4"], [4, "Q5"], [6, "P1"]] };
function bigPose(T) {
  for (const id of ["intro", "outro"]) {
    if (!BLK[id] || T < S(id) - .3 || T > E(id) + 3.5) continue;
    let p = BIG[id][0][1], t0 = S(id) - .3;
    for (const [i, k] of BIG[id]) if (T >= P(id, i) - .1) { p = k; t0 = P(id, i) - .1; }
    return { p, t0, id };
  }
  return null;
}
function drawBigHost(T, a) {
  const b = bigPose(T); if (!b || a <= 0) return;
  const m = mouthLevel(T);
  const settle = (1 - easeOut(clamp((T - b.t0) / .35))) * .045;
  drawPose(ctx, b.p, { screenX: 1400, scale: 2.0 * (1 + settle), alpha: a, dy: 4 + Math.sin(T * 1.7) * 4 + m * 2.5, mouth: m });
}
// кружок в углу на «экране компьютера»
const CAM = { x: 1740, y: 870, r: 140 };
const CAM_POSES = ["P1", "Q1", "P4", "Q5", "P1", "Q4", "Q1"];
function drawFacecam(T, a) {
  if (a <= 0) return;
  const id = DESK.find(d => T >= S(d) - .5 && T < E(d) + GAP) || "server";
  const k = Math.max(0, BLK[id].ph.findLastIndex(p => T >= p.t0 - .1));
  const key = CAM_POSES[(DESK.indexOf(id) * 3 + Math.floor(k / 2)) % CAM_POSES.length];
  const pz = POSES[key], s = .78;
  const [, , r] = pz.cell, ay = pz.anchor[1] - r * 512;
  const m = mouthLevel(T);
  ctx.save(); ctx.globalAlpha = a;
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(CAM.x, CAM.y, CAM.r, 0, 7); ctx.fillStyle = "#14080c"; ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); ctx.beginPath(); ctx.arc(CAM.x, CAM.y, CAM.r - 4, 0, 7); ctx.clip();
  const g = ctx.createRadialGradient(CAM.x, CAM.y - 20, 10, CAM.x, CAM.y, CAM.r);
  g.addColorStop(0, "#5a0f1c"); g.addColorStop(1, "#14080c"); ctx.fillStyle = g; ctx.fillRect(CAM.x - CAM.r, CAM.y - CAM.r, CAM.r * 2, CAM.r * 2);
  drawPose(ctx, key, { screenX: CAM.x, scale: s, bottom: CAM.y + 25 + (512 - ay) * s, dy: m * 1.5 + Math.sin(T * 1.7) * 2, mouth: m, glow: 0 });
  ctx.restore();
  ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(CAM.x, CAM.y, CAM.r - 2, 0, 7); ctx.stroke();
  // «в эфире»
  if (m > 0) { ctx.strokeStyle = `rgba(255,77,94,${.25 + .2 * m})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(CAM.x, CAM.y, CAM.r + 8 + m * 3, 0, 7); ctx.stroke(); }
  ctx.restore();
}

// ── рабочий стол ────────────────────────────────────────────────────
function wallpaper(T) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#1a0508"); g.addColorStop(.5, "#3a0a12"); g.addColorStop(1, "#0b0306");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const waves = [["#5e0f1d", 560, .0011], ["#8f1a2c", 690, .0014], ["#2a070d", 820, .0009]];
  waves.forEach(([c, base, f], i) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, base + Math.sin(x * f * 3 + i + T * .05) * 120 - x * .18);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  });
  ctx.fillStyle = "rgba(255,200,205,.10)"; ctx.beginPath();
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, 690 + Math.sin(x * .0042 + 1 + T * .05) * 120 - x * .18 - 6);
  ctx.lineTo(W, 0); ctx.lineTo(W, 0); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(0, 0, W, H);
}
const DOCK = [["browser", "#ff6b6b"], ["editor", "#6ba6ff"], ["terminal", "#2b2b2b"], ["files", "#f2c14e"], ["bitik", "#9b7ed9"]];
function dock(active) {
  const n = DOCK.length, s = 64, gap = 14, w = n * s + (n + 1) * gap, x0 = (W - w) / 2, y0 = H - 92;
  ctx.save(); rr(x0, y0, w, s + 2 * gap, 22); ctx.fillStyle = "rgba(30,20,24,.55)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.lineWidth = 1.5; ctx.stroke();
  DOCK.forEach(([k, c], i) => {
    const x = x0 + gap + i * (s + gap), y = y0 + gap;
    rr(x, y, s, s, 14); ctx.fillStyle = c; ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.9)";
    if (k === "browser") { ctx.beginPath(); ctx.arc(x + 32, y + 32, 18, 0, 7); ctx.lineWidth = 4; ctx.strokeStyle = "#fff"; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 14, y + 32); ctx.lineTo(x + 50, y + 32); ctx.stroke(); }
    if (k === "editor") { ctx.font = '700 26px "JetBrains Mono"'; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("</>", x + 32, y + 33); }
    if (k === "terminal") { ctx.font = '700 24px "JetBrains Mono"'; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = GREEN; ctx.fillText(">_", x + 32, y + 33); }
    if (k === "files") { ctx.fillStyle = "#c48e2a"; rr(x + 14, y + 20, 36, 26, 4); ctx.fill(); }
    if (k === "bitik") { sctx.clearRect(0, 0, 16, 17); drawSprite(sctx, "happy", 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(sb, x + 12, y + 10, 40, 42); }
    if (active === k) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x + 32, y + s + 8, 3, 0, 7); ctx.fill(); }
  });
  ctx.restore();
}
function stepLabel(T, id, a) {
  const n = DESK.indexOf(id) + 1;
  const k = easeOut(prog(T, S(id) - .3, S(id) + .2));
  ctx.save(); ctx.globalAlpha = a * k;
  rr(36, 26, 330, 52, 12); ctx.fillStyle = "rgba(20,10,14,.82)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.stroke();
  ctx.restore();
  ui(`ШАГ ${n}`, 60, 53, { size: 18, color: "rgba(255,130,140,.85)", align: "left", alpha: a * k, spacing: 3 });
  text(STEP[id], 150, 53, { size: 26, weight: 700, align: "left", alpha: a * k, glow: null });
}
// окно программы: возвращает прямоугольник содержимого
function windowFrame(x, y, w, h, title, a, kind = "app") {
  if (a <= 0) return null;
  const k = easeOut(clamp(a));
  ctx.save(); ctx.globalAlpha = clamp(a);
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(.94 + .06 * k, .94 + .06 * k); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = "rgba(0,0,0,.6)"; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18;
  rr(x, y, w, h, 14); ctx.fillStyle = kind === "terminal" ? "#0c0a0d" : "#17141a"; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = "rgba(255,255,255,.09)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = kind === "terminal" ? "#151216" : "#1f1b22"; rr(x, y, w, 44, [14, 14, 0, 0]); ctx.fill();
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + 24 + i * 22, y + 22, 7, 0, 7); ctx.fill(); });
  ctx.restore();
  return { x, y: y + 44, w, h: h - 44, a: clamp(a), title, tx: x + w / 2, ty: y + 22 };
}
function browser(x, y, w, h, url, a, lock = 0) {
  const r = windowFrame(x, y, w, h, "", a); if (!r) return null;
  ctx.save(); ctx.globalAlpha = r.a;
  rr(x + 110, y + 9, w - 220, 27, 14); ctx.fillStyle = "#0f0c11"; ctx.fill();
  ctx.restore();
  const lx = x + 130;
  if (lock > 0) ui("🔒", lx, y + 23, { size: 14, alpha: r.a * lock, align: "left" });
  mono(url, lx + (lock > 0 ? 24 : 0), y + 23, { size: 15, color: "#cbb8bf", align: "left", alpha: r.a });
  return r;
}
function titled(r, title) { if (r) ui(title, r.tx, r.ty, { size: 15, color: "#a8949b", alpha: r.a }); }
function cursor(x, y, a, clicks, T) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y);
  for (const c of [].concat(clicks || [])) if (T >= c && T < c + .35) {
    const d = (T - c) / .35; ctx.strokeStyle = `rgba(255,90,110,${1 - d})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 10 + 36 * d, 0, 7); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(14, 36); ctx.lineTo(19, 33); ctx.lineTo(13, 21); ctx.lineTo(23, 21); ctx.closePath();
  ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
// путь курсора: [[t, x, y], …]
function cursorAt(T, path) {
  if (T <= path[0][0]) return [path[0][1], path[0][2]];
  for (let i = 0; i < path.length - 1; i++) {
    const [t0, x0, y0] = path[i], [t1, x1, y1] = path[i + 1];
    if (T <= t1) { const p = ease(prog(T, t0, t1)); return [lerp(x0, x1, p), lerp(y0, y1, p)]; }
  }
  const l = path[path.length - 1]; return [l[1], l[2]];
}
// печать кода с подсветкой: строки — массивы [текст, цвет]
function code(r, lines, frac, o = {}) {
  if (!r) return;
  const { size = 22, x0 = 24, y0 = 30, lh = size * 1.6, num = true } = o;
  const total = lines.flat().reduce((n, [s]) => n + s.length, 0);
  let left = Math.floor(total * frac);
  ctx.save(); ctx.globalAlpha = r.a; ctx.font = `400 ${size}px "JetBrains Mono"`; ctx.textBaseline = "middle";
  lines.forEach((ln, i) => {
    const y = r.y + y0 + i * lh;
    if (num) { ctx.fillStyle = "#4d4349"; ctx.textAlign = "right"; ctx.fillText(String(i + 1), r.x + x0 + 22, y); ctx.textAlign = "left"; }
    let x = r.x + x0 + (num ? 44 : 0);
    for (const [s, c] of ln) { ctx.fillStyle = c; ctx.fillText(s.slice(0, Math.max(0, left)), x, y); left -= s.length; x += ctx.measureText(s).width; }
  });
  ctx.restore();
}
const K = { kw: "#c792ea", fn: "#82aaff", str: "#c3e88d", num: "#f78c6c", tx: "#e6edf3", cm: "#6b6470", red: "#ff6b7a", ok: GREEN };

// мини-сайт Битика внутри окна
const roomBuf = new OffscreenCanvas(ROOM_W, ROOM_H), rctx = roomBuf.getContext("2d");
function miniSite(r, T, st) {
  if (!r) return;
  const pad = 20, rw = r.w - pad * 2, rh = rw * 9 / 16;
  drawRoom(rctx, { t: T });
  rctx.fillStyle = "rgba(0,0,0,.35)"; rctx.fillRect(BITIK_X + 3, BITIK_Y + 16, 10, 1);
  drawSprite(rctx, st.mood, BITIK_X, BITIK_Y + bob(T, st.mood));
  if (st.apple != null) drawFood(rctx, BITIK_X + 5, st.apple);
  ctx.save(); ctx.globalAlpha = r.a; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(roomBuf, r.x + pad, r.y + pad, rw, rh);
  if (st.online) {
    rr(r.x + pad + 10, r.y + pad + 10, 260, 30, 6); ctx.fillStyle = "rgba(13,10,20,.85)"; ctx.fill();
  }
  ctx.restore();
  if (st.online) ui(st.online, r.x + pad + 22, r.y + pad + 25, { size: 15, color: "#6fd36b", align: "left", alpha: r.a });
  const by = r.y + pad + rh + 24, bw = rw - 200;
  ui("СЫТОСТЬ", r.x + pad, by, { size: 15, color: "#efe8ff", align: "left", alpha: r.a });
  ui(Math.round(st.h) + "%", r.x + pad + bw, by, { size: 15, color: "#efe8ff", align: "right", alpha: r.a });
  ctx.save(); ctx.globalAlpha = r.a;
  ctx.fillStyle = "#0b0812"; ctx.fillRect(r.x + pad, by + 16, bw, 18);
  ctx.fillStyle = st.h < 35 ? "#f2b84b" : "#6fd36b"; ctx.fillRect(r.x + pad + 3, by + 19, (bw - 6) * st.h / 100, 12);
  const bx = r.x + pad + bw + 20, bww = rw - bw - 20;
  const dis = !!st.wait;
  ctx.fillStyle = dis ? "#4a3d42" : "#e2445c"; rr(bx, by - 6, bww, 48, 6); ctx.fill();
  ctx.restore();
  text(st.wait || "ПОКОРМИТЬ", bx + bww / 2, by + 18, { size: 16, color: dis ? "#1c1518" : "#1a0f14", glow: null, alpha: r.a });
  if (st.feed) {
    const fy = by + 70;
    st.feed.forEach((s, i) => mono("🍎 " + s, r.x + pad, fy + i * 28, { size: 15, color: "#d6cde8", align: "left", alpha: r.a * (s ? 1 : 0) }));
  }
  return { btn: [bx + bww / 2, by + 18] };
}

// ── сцены рабочего стола ────────────────────────────────────────────
function sceneServer(T) {
  const id = "server"; const a = win(T, S(id) - .3, E(id) + .5, .3); if (a <= 0) return;
  const r = browser(300, 150, 1100, 700, "hosting.example/servers/new", a);
  if (!r) return;
  text("Новый облачный сервер", r.x + 40, r.y + 50, { size: 30, weight: 700, align: "left", glow: null, alpha: a });
  const rows = [["ОС", "Ubuntu"], ["CPU", "1 × 3.3 ГГц"], ["RAM", "1 ГБ"], ["NVMe", "15 ГБ"], ["Конфигурация", "1 180 ₽/мес"], ["Бэкапы", "90 ₽/мес"], ["Публичный IP", "200 ₽/мес"]];
  rows.forEach(([k, v], i) => {
    const y = r.y + 120 + i * 50, show = prog(T, S(id) + .2 + i * .25, S(id) + .4 + i * .25);
    ui(k, r.x + 60, y, { size: 22, weight: 400, color: "#9d8a91", align: "left", alpha: a * show });
    ui(v, r.x + r.w - 60, y, { size: 22, color: "#efe8ff", align: "right", alpha: a * show });
  });
  const ty = r.y + 120 + rows.length * 50 + 30;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.fillRect(r.x + 60, ty - 30, r.w - 120, 2); ctx.restore();
  const big = easeOut(prog(T, P(id, 3), P(id, 3) + .3));
  text("Итого", r.x + 60, ty + 10, { size: 30, weight: 700, align: "left", glow: null, alpha: a });
  text("1 470 ₽/мес", r.x + r.w - 60, ty + 10, { size: 30 + 16 * big, align: "right", glow: big ? "rgba(255,70,90,.8)" : null, alpha: a });
  const strike = easeOut(prog(T, P(id, 5), P(id, 5) + .35));
  if (strike > 0) {
    ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = RED; ctx.lineWidth = 8; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(r.x + r.w - 420, ty + 10); ctx.lineTo(r.x + r.w - 420 + 380 * strike, ty + 10); ctx.stroke(); ctx.restore();
  }
  const alt = a * prog(T, P(id, 6), P(id, 6) + .4);
  if (alt > 0) {
    ctx.save(); ctx.globalAlpha = alt; rr(1430, 360, 400, 220, 18); ctx.fillStyle = "rgba(20,10,14,.92)"; ctx.fill(); ctx.strokeStyle = "rgba(111,211,107,.5)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ui("СЕРВЕР   ✕", 1630, 420, { size: 26, color: "#ff8a96", alpha: alt });
    ui("АДРЕС    ✓", 1630, 480, { size: 26, color: GREEN, alpha: alt * prog(T, P(id, 7), P(id, 7) + .3) });
    mono("найти сайт = знать адрес", 1630, 535, { size: 17, color: "#a8949b", alpha: alt });
  }
  const path = [[S(id), 900, 980], [P(id, 2), 900, 760], [P(id, 3) - .2, r.x + r.w - 220, ty + 10], [P(id, 6), r.x + r.w - 220, ty + 10]];
  const [cx, cy] = cursorAt(T, path); cursor(cx, cy, a, [], T);
}

function sceneDomain(T) {
  const id = "domain"; const a = win(T, S(id) - .3, E(id) + .5, .3); if (a <= 0) return;
  // окно регистратора: поиск домена
  const a1 = a * win(T, S(id) - .3, P(id, 4) - .1, .3);
  const r1 = browser(260, 150, 1150, 640, "registrar.example/domains", a1);
  let clicks = [];
  if (r1) {
    text("Найдите домен", r1.x + 50, r1.y + 60, { size: 32, weight: 700, align: "left", glow: null, alpha: a1 });
    ctx.save(); ctx.globalAlpha = a1; rr(r1.x + 50, r1.y + 110, r1.w - 100, 64, 12); ctx.fillStyle = "#0f0c11"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.15)"; ctx.stroke(); ctx.restore();
    const q = "bitik".slice(0, Math.floor(5 * prog(T, S(id) + .2, S(id) + 1.2)));
    mono(q + (Math.floor(T * 3) % 2 ? "|" : ""), r1.x + 74, r1.y + 142, { size: 26, color: "#fff", align: "left", alpha: a1 });
    const res = [["bitik.ru", "занят", "#8f7f86"], ["bitik.site", "свободен", GREEN], ["bitik-pet.ru", "свободен", GREEN]];
    res.forEach(([d, s, c], i) => {
      const y = r1.y + 230 + i * 74, sh = a1 * prog(T, P(id, 1) - .2 + i * .15, P(id, 1) + i * .15);
      const hl = i === 1 && T > P(id, 1);
      ctx.save(); ctx.globalAlpha = sh; rr(r1.x + 50, y - 30, r1.w - 100, 60, 10); ctx.fillStyle = hl ? "rgba(255,77,94,.14)" : "rgba(255,255,255,.03)"; ctx.fill(); ctx.restore();
      text(d, r1.x + 80, y, { size: 26, weight: 700, align: "left", glow: null, alpha: sh });
      ui(s, r1.x + r1.w - 280, y, { size: 20, color: c, align: "left", alpha: sh });
      if (i === 1) { ctx.save(); ctx.globalAlpha = sh; rr(r1.x + r1.w - 170, y - 22, 110, 44, 8); ctx.fillStyle = T > P(id, 2) ? "#3a8f43" : "#e2445c"; ctx.fill(); ctx.restore(); ui(T > P(id, 2) ? "✓" : "Купить", r1.x + r1.w - 115, y, { size: 18, color: "#fff", alpha: sh }); }
    });
    ui("1 год · без лишних услуг", r1.x + 80, r1.y + 480, { size: 18, color: "#a8949b", align: "left", alpha: a1 * prog(T, P(id, 2), P(id, 2) + .3) });
    clicks = [P(id, 2)];
    const [cx, cy] = cursorAt(T, [[S(id), 700, 960], [P(id, 1), r1.x + 300, r1.y + 320], [P(id, 2) - .05, r1.x + r1.w - 115, r1.y + 304]]);
    cursor(cx, cy, a1, clicks, T);
  }
  // GitHub Pages / DNS
  const a2 = a * win(T, P(id, 3) - .1, P(id, 5) + .2, .3);
  const r2 = windowFrame(200, 130, 900, 620, "", a2); titled(r2, "Хостинг сайта · Pages");
  if (r2) {
    text("Сайт → бесплатный хостинг", r2.x + 40, r2.y + 50, { size: 26, weight: 700, align: "left", glow: null, alpha: a2 });
    code(r2, [[["# публикуем папку site/", K.cm]], [["source", K.fn], [": ", K.tx], ["GitHub Actions", K.str]], [["custom_domain", K.fn], [": ", K.tx], ["bitik.site", K.str]], [["price", K.fn], [": ", K.tx], ["0 ₽", K.num]]], prog(T, P(id, 3) + .2, P(id, 3) + 2.4), { y0: 110, size: 24 });
  }
  const a3 = a * win(T, P(id, 4) - .1, P(id, 5) + .8, .3);
  const r3 = windowFrame(820, 230, 900, 540, "", a3); titled(r3, "DNS · bitik.site");
  if (r3) {
    const recs = [["A", "@", "185.199.108.153"], ["A", "@", "185.199.109.153"], ["A", "@", "185.199.110.153"], ["A", "@", "185.199.111.153"], ["CNAME", "www", "username.github.io."]];
    ui("ТИП", r3.x + 40, r3.y + 40, { size: 15, color: "#7d6c73", align: "left", alpha: a3 });
    ui("ИМЯ", r3.x + 170, r3.y + 40, { size: 15, color: "#7d6c73", align: "left", alpha: a3 });
    ui("ЗНАЧЕНИЕ", r3.x + 290, r3.y + 40, { size: 15, color: "#7d6c73", align: "left", alpha: a3 });
    recs.forEach(([t, n, v], i) => {
      const sh = a3 * easeOut(prog(T, P(id, 4) + .3 + i * .4, P(id, 4) + .5 + i * .4));
      const y = r3.y + 100 + i * 70;
      ctx.save(); ctx.globalAlpha = sh; rr(r3.x + 24, y - 26, r3.w - 48, 52, 8); ctx.fillStyle = "rgba(255,255,255,.04)"; ctx.fill(); ctx.restore();
      ui(t, r3.x + 40, y, { size: 22, color: "#ffd36b", align: "left", alpha: sh });
      ui(n, r3.x + 170, y, { size: 22, color: "#efe8ff", align: "left", alpha: sh });
      mono(v, r3.x + 290, y, { size: 22, color: "#c3e88d", align: "left", alpha: sh });
    });
  }
  // замочек
  const a4 = a * win(T, P(id, 5) - .1, E(id) + .5, .3);
  const r4 = browser(380, 200, 1000, 600, "bitik.site", a4, prog(T, P(id, 6), P(id, 6) + .3));
  if (r4) {
    const wait = T < P(id, 6);
    if (wait) {
      const sp = (T * 6) % (Math.PI * 2);
      ctx.save(); ctx.globalAlpha = a4; ctx.strokeStyle = RED; ctx.lineWidth = 8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(r4.x + r4.w / 2, r4.y + 240, 50, sp, sp + 4); ctx.stroke(); ctx.restore();
      ui("проверка DNS…", r4.x + r4.w / 2, r4.y + 340, { size: 22, color: "#a8949b", alpha: a4 });
    } else {
      const k = easeOut(prog(T, P(id, 6), P(id, 6) + .3));
      text("🔒", r4.x + r4.w / 2, r4.y + 220, { size: 120 * (0.6 + 0.4 * k), glow: "rgba(111,211,107,.6)", alpha: a4 });
      text("HTTPS", r4.x + r4.w / 2, r4.y + 360, { size: 56, color: GREEN, glow: "rgba(111,211,107,.6)", alpha: a4 * k });
      ui("DNS check successful ✓", r4.x + r4.w / 2, r4.y + 440, { size: 20, color: GREEN, alpha: a4 * k });
    }
  }
}

function sceneMemory(T) {
  const id = "memory"; const a = win(T, S(id) - .3, E(id) + .5, .3); if (a <= 0) return;
  // схема: браузеры → база
  const dg = a * win(T, S(id) - .3, P(id, 5) - .1, .3);
  if (dg > 0) {
    const db = [1240, 470];
    const users = [[420, 260], [380, 520], [440, 780]];
    users.forEach(([x, y], i) => {
      const sh = dg * easeOut(prog(T, S(id) + i * .2, S(id) + .3 + i * .2));
      ctx.save(); ctx.globalAlpha = sh; rr(x - 130, y - 85, 260, 170, 14); ctx.fillStyle = "#17141a"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.12)"; ctx.stroke(); ctx.restore();
      bitik("normal", x, y + 40, 5, sh);
      mono(["Москва", "Казань", "Новосибирск"][i], x, y - 60, { size: 16, color: "#a8949b", alpha: sh });
      const link = dg * prog(T, P(id, 1), P(id, 1) + .5);
      if (link > 0) {
        ctx.save(); ctx.globalAlpha = link; ctx.strokeStyle = "rgba(255,90,110,.6)"; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -T * 40;
        ctx.beginPath(); ctx.moveTo(x + 130, y); ctx.lineTo(db[0] - 150, db[1]); ctx.stroke(); ctx.restore();
      }
    });
    const dk = dg * easeOut(prog(T, P(id, 1), P(id, 1) + .4));
    ctx.save(); ctx.globalAlpha = dk;
    for (let i = 2; i >= 0; i--) { ctx.fillStyle = i === 0 ? "#e2445c" : "#8f2537"; ctx.beginPath(); ctx.ellipse(db[0], db[1] - 60 + i * 60, 140, 40, 0, 0, 7); ctx.fill(); ctx.fillRect(db[0] - 140, db[1] - 60 + i * 60, 280, 60); }
    ctx.fillStyle = "#ff8a96"; ctx.beginPath(); ctx.ellipse(db[0], db[1] - 60, 140, 40, 0, 0, 7); ctx.fill();
    ctx.restore();
    text("БАЗА", db[0], db[1] + 40, { size: 36, alpha: dk });
    ui("одна сытость на всех", db[0], db[1] + 170, { size: 22, color: "#ffd2d8", alpha: dk * prog(T, P(id, 2), P(id, 2) + .3) });
    const fr = dg * prog(T, P(id, 3), P(id, 3) + .3);
    if (fr > 0) { ctx.save(); ctx.globalAlpha = fr; rr(db[0] - 150, db[1] - 220, 300, 56, 12); ctx.fillStyle = "#3a8f43"; ctx.fill(); ctx.restore(); ui("бесплатный тариф", db[0], db[1] - 192, { size: 20, color: "#fff", alpha: fr }); }
  }
  // таблица из одной строки
  const tb = a * win(T, P(id, 4) - .1, P(id, 5) + .2, .3);
  const r1 = windowFrame(500, 300, 920, 330, "", tb); titled(r1, "bitik_state");
  if (r1) {
    ["id", "hunger", "updated_at"].forEach((h, i) => ui(h, r1.x + 60 + i * 260, r1.y + 50, { size: 20, color: "#7d6c73", align: "left", alpha: tb }));
    ["1", "77", "13:08:08"].forEach((v, i) => ui(v, r1.x + 60 + i * 260, r1.y + 130, { size: 40, color: i === 1 ? GREEN : "#efe8ff", align: "left", alpha: tb * prog(T, P(id, 4) + .3 + i * .2, P(id, 4) + .5 + i * .2) }));
    mono("— всего одна строка", r1.x + 60, r1.y + 220, { size: 20, color: "#a8949b", align: "left", alpha: tb });
  }
  // код голода в браузере
  const ed = a * win(T, P(id, 5) - .1, E(id) + .5, .3);
  const r2 = windowFrame(330, 190, 1180, 520, "", ed); titled(r2, "net.js — голод считает браузер");
  code(r2, [
    [["// сытость сейчас = сытость тогда − минуты с тех пор", K.cm]],
    [["export const ", K.kw], ["hungerNow", K.fn], [" = s =>", K.tx]],
    [["  Math.", K.tx], ["max", K.fn], ["(", K.tx], ["0", K.num], [", s.hunger - (now() - s.updatedAt) / ", K.tx], ["60000", K.num], [")", K.tx]],
    [["", K.tx]],
    [["// база не тратит ни одного сообщения на голод", K.cm]],
  ], prog(T, P(id, 5) + .2, P(id, 6) + .5), { y0: 50, size: 24 });
  const lim = ed * prog(T, P(id, 6), P(id, 6) + .4);
  if (lim > 0) {
    ctx.save(); ctx.globalAlpha = lim; rr(r2.x + 60, r2.y + 320, 640, 34, 8); ctx.fillStyle = "#0b0812"; ctx.fill();
    ctx.fillStyle = "#6fd36b"; ctx.fillRect(r2.x + 64, r2.y + 324, 632 * .04, 26); ctx.restore();
    ui("лимит бесплатного тарифа: занято 4%", r2.x + 60, r2.y + 390, { size: 20, color: "#a8949b", align: "left", alpha: lim });
  }
}

function sceneFeed(T) {
  const id = "feed"; const a = win(T, S(id) - .3, E(id) + .5, .3); if (a <= 0) return;
  const click = P(id, 1) + .3, land = click + .8;
  let h = 77; if (T > land) h = lerp(77, 92, easeOut(prog(T, land, land + .5)));
  const apple = T > click && T < land ? lerp(-FOOD_W, BITIK_Y + 1, Math.pow(prog(T, click, land), 2)) : null;
  const mood = T > land && T < land + 3 ? "happy" : "normal";
  const r1 = browser(80, 150, 760, 680, "bitik.site", a, 1);
  const r2 = browser(1080, 150, 760, 680, "bitik.site", a * prog(T, P(id, 5) - .4, P(id, 5)), 1);
  const ui1 = miniSite(r1, T, { h, mood, apple });
  miniSite(r2, T, { h, mood, apple });
  ui("ТЫ", 460, 125, { size: 20, color: "#ffd2d8", alpha: a });
  ui("ДРУГОЙ ГОРОД", 1460, 125, { size: 20, color: "#ffd2d8", alpha: a * prog(T, P(id, 5) - .4, P(id, 5)) });
  // пакет до базы и обратно
  const pk = (t0, x0, y0, x1, y1) => { const k = prog(T, t0, t0 + .5); if (k > 0 && k < 1) { ctx.save(); ctx.fillStyle = "#fff"; ctx.shadowColor = RED; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(lerp(x0, x1, k), lerp(y0, y1, k), 10, 0, 7); ctx.fill(); ctx.restore(); } };
  const dbx = 960, dby = 470;
  const dbA = a * win(T, P(id, 1) - .2, P(id, 3), .3);
  if (dbA > 0) { ctx.save(); ctx.globalAlpha = dbA; ctx.fillStyle = "#e2445c"; ctx.beginPath(); ctx.ellipse(dbx, dby, 60, 20, 0, 0, 7); ctx.fill(); ctx.fillRect(dbx - 60, dby, 120, 70); ctx.fillStyle = "#ff8a96"; ctx.beginPath(); ctx.ellipse(dbx, dby, 60, 20, 0, 0, 7); ctx.fill(); ctx.restore(); ui("+15%", dbx, dby + 110, { size: 24, color: GREEN, alpha: dbA * prog(T, P(id, 2), P(id, 2) + .3) }); }
  if (ui1) { pk(click, ui1.btn[0], ui1.btn[1], dbx, dby); pk(click + .5, dbx, dby, 460, 400); pk(click + .5, dbx, dby, 1460, 400); }
  const num = a * win(T, P(id, 3), E(id) + .5, .2);
  if (num > 0) text(T < P(id, 4) ? "77%" : "92%", 960, 900, { size: 80, color: T < P(id, 4) ? "#fff" : GREEN, alpha: num, scale: 1 + .2 * (1 - easeOut(prog(T, P(id, 4), P(id, 4) + .2))) });
  if (ui1) { const [cx, cy] = cursorAt(T, [[S(id), 500, 900], [click - .1, ui1.btn[0], ui1.btn[1]]]); cursor(cx, cy, a, [click], T); }
}

function sceneGuard(T) {
  const id = "guard"; const a = win(T, S(id) - .3, E(id) + .5, .3); if (a <= 0) return;
  const c0 = S(id) + .4, spam = [P(id, 1) + .1, P(id, 1) + .35, P(id, 1) + .6, P(id, 1) + .85];
  const left = Math.max(0, 180 - (T - c0));
  const wait = T > c0 + .1 ? `ЧЕРЕЗ ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")}` : null;
  const r1 = browser(120, 150, 900, 760, "bitik.site", a, 1);
  const u = miniSite(r1, T, { h: 92, mood: "normal", wait });
  if (u) { const [cx, cy] = cursorAt(T, [[S(id), 600, 950], [c0 - .1, u.btn[0], u.btn[1]]]); cursor(cx, cy, a, [c0, ...spam], T); spam.forEach(s => { const k = win(T, s, s + .5, .1); if (k > 0) ui("✕", u.btn[0] + 50, u.btn[1] - 40 - (T - s) * 60, { size: 26, color: RED, alpha: a * k }); }); }
  const tA = a * win(T, P(id, 4) - .2, E(id) + .5, .3);
  const r2 = windowFrame(1060, 300, 760, 460, "", tA, "terminal"); titled(r2, "терминал");
  code(r2, [
    [["$ ", K.ok], ["curl … /rpc/bitik_feed", K.tx]],
    [['{"ok": false, "wait": 180}', K.red]],
    [["", K.tx]],
    [["$ ", K.ok], ["curl -X PATCH … hunger=100", K.tx]],
    [["[]   ", K.red], ["// 0 строк изменено", K.cm]],
  ], prog(T, P(id, 4), P(id, 6) + .6), { y0: 40, size: 22, num: false });
}

function sceneOnline(T) {
  const id = "online"; const a = win(T, S(id) - .3, E(id) + .5, .3); if (a <= 0) return;
  const n = T < P(id, 2) ? 1 : T < P(id, 2) + 1 ? 2 : T < P(id, 2) + 2 ? 5 : 12;
  const feed = [
    T > P(id, 3) ? "Кто-то покормил Битика · 3 мин назад" : "",
    T > P(id, 3) + .3 ? "Кто-то покормил Битика · 4 мин назад" : "",
    T > P(id, 5) ? "Кто-то покормил Битика · только что" : "",
  ];
  if (T > P(id, 5)) feed.unshift(feed.pop());
  const r = browser(360, 120, 1200, 830, "bitik.site", a, 1);
  miniSite(r, T, { h: 88, mood: n > 2 ? "happy" : "normal", online: T > P(id, 2) - .2 ? (n <= 1 ? "Сейчас с Битиком только ты" : `Сейчас с Битиком: ${n}`) : null, feed });
  const tag = a * win(T, P(id, 4), P(id, 5) + .2, .2);
  if (tag > 0) ui("← мои тесты", 1180, 920, { size: 20, color: "#ffd36b", align: "left", alpha: tag });
}

function sceneSearch(T) {
  const id = "search"; const a = win(T, S(id) - .3, E(id) + .5, .3); if (a <= 0) return;
  const eA = a * win(T, S(id) - .3, P(id, 2), .3);
  const r1 = windowFrame(300, 160, 1250, 560, "", eA); titled(r1, "index.html");
  code(r1, [
    [["<title>", K.red], ["Битик — один питомец на весь интернет", K.tx], ["</title>", K.red]],
    [["<meta ", K.red], ["name", K.fn], ["=", K.tx], ['"description"', K.str], [" …>", K.red]],
    [["<meta ", K.red], ["property", K.fn], ["=", K.tx], ['"og:image"', K.str], [" …>", K.red]],
    [["", K.tx]],
    [["robots.txt → ", K.cm], ["Sitemap: https://bitik.site/sitemap.xml", K.str]],
  ], prog(T, P(id, 1) - .3, P(id, 1) + 2.2), { y0: 50, size: 22 });
  const wA = a * win(T, P(id, 2) - .1, E(id) + .5, .3);
  const r2 = browser(420, 180, 1080, 620, "webmaster.example/sites", wA, 1);
  if (r2) {
    text("Вебмастер", r2.x + 50, r2.y + 60, { size: 32, weight: 700, align: "left", glow: null, alpha: wA });
    [["Сайт", "https://bitik.site"], ["Права", "подтверждены ✓"], ["Sitemap", "найден в robots.txt"], ["Индексация", "Яндекс зайдёт сам"]].forEach(([k, v], i) => {
      const sh = wA * prog(T, P(id, 2) + .3 + i * .4, P(id, 2) + .5 + i * .4), y = r2.y + 150 + i * 80;
      ui(k, r2.x + 60, y, { size: 22, weight: 400, color: "#9d8a91", align: "left", alpha: sh });
      ui(v, r2.x + 360, y, { size: 24, color: i === 1 ? GREEN : "#efe8ff", align: "left", alpha: sh });
    });
  }
}

// ── интро и финал (крупный ведущий) ─────────────────────────────────
function sceneIntro(T) {
  const id = "intro"; const a = win(T, -1, E(id) + .2, .3); if (a <= 0) return;
  const cx = 600;
  const lap = win(T, S(id), P(id, 2) - .1, .3);
  if (lap > 0) {
    ctx.save(); ctx.globalAlpha = lap; ctx.strokeStyle = "#c4a9b0"; ctx.lineWidth = 6; rr(cx - 260, 290, 520, 330, 18); ctx.stroke(); ctx.fillStyle = "#c4a9b0"; ctx.fillRect(cx - 320, 630, 640, 14); ctx.restore();
    ui("localhost", cx, 320, { size: 20, color: "#c4a9b0", alpha: lap });
    const out = prog(T, P(id, 1), P(id, 1) + 1);
    bitik("happy", cx, 600 - out * 40, 10, lap);
  }
  const globe = win(T, P(id, 2) - .2, P(id, 4) - .1, .3);
  if (globe > 0) {
    const r = rng(5);
    for (let i = 0; i < 30; i++) {
      const ang = (i / 30) * Math.PI * 2, d = 230 + r() * 80, x = cx + Math.cos(ang) * d, y = 470 + Math.sin(ang) * d * .7;
      const k = easeOut(prog(T, P(id, 2) + r(), P(id, 2) + r() + .3));
      ctx.save(); ctx.globalAlpha = globe * k; ctx.strokeStyle = "rgba(255,90,110,.3)"; ctx.beginPath(); ctx.moveTo(cx, 420); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = T > P(id, 3) + .6 ? GREEN : "#ff8a96"; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill(); ctx.restore();
    }
    bitik(T > P(id, 3) + .4 ? "happy" : "normal", cx, 520, 9, globe);
  }
  const price = win(T, P(id, 4) - .1, P(id, 6) - .1, .3);
  if (price > 0) {
    text("1 470 ₽", cx, 470, { size: 150, alpha: price, scale: 1 + .1 * (1 - easeOut(prog(T, P(id, 5), P(id, 5) + .3))), glow: "rgba(255,40,60,.8)" });
    text("в месяц", cx, 590, { size: 48, color: "#ffd2d8", glow: null, alpha: price });
  }
  const tm = win(T, P(id, 6) - .1, E(id) + .2, .25);
  if (tm > 0) {
    text(fmt(timerSecs(T)), cx, 470, { size: 150, alpha: tm, blur: 50 });
    text("ПОЕХАЛИ", cx, 640, { size: 84, alpha: tm * easeOut(prog(T, P(id, 7), P(id, 7) + .15)) });
  }
}
function sceneOutro(T) {
  const id = "outro"; const a = win(T, S(id) - .2, DURATION + 1, .3); if (a <= 0) return;
  const site = win(T, S(id) - .2, P(id, 4) - .1, .3);
  if (site > 0) {
    text("BITIK.SITE", 600, 420, { size: 120, alpha: site, blur: 50, scale: 1 + .08 * (1 - easeOut(prog(T, P(id, 2), P(id, 2) + .3))) });
    bitik("happy", 600, 700 + bob(T, "happy") * 8, 12, site);
    if (T > P(id, 3)) ui("ссылка в описании ↓", 600, 790, { size: 26, color: "#ffd2d8", alpha: site });
  }
  const end = win(T, P(id, 4) - .1, DURATION + 1, .4);
  if (end > 0) {
    ui("ОСТАЛОСЬ", 560, 300, { size: 24, color: "rgba(255,70,90,.75)", alpha: end, spacing: 8 });
    text(fmt(HEND), 560, 430, { size: 150, alpha: end, blur: 50 });
    ui("СЕРИЯ 3", 560, 600, { size: 26, color: RED, alpha: end, spacing: 8 });
    text("ЖИЗНЬ", 560, 685, { size: 90, alpha: end, blur: 36 });
    ui("день и ночь · сон · игры", 560, 770, { size: 24, color: "#ffd2d8", alpha: end * prog(T, P(id, 5), P(id, 5) + .3) });
  }
}

// ── субтитры ────────────────────────────────────────────────────────
function captions(T, desk) {
  for (const id of ORDER) {
    const b = BLK[id]; if (!b || T < b.ph[0].t0 || T > b.end + .3) continue;
    // в финале название сайта и так крупно на экране — субтитры не дублируем
    if (id === "outro" && T < P("outro", 4) - .1) continue;
    if (id === "domain" && T >= P("domain", 1) && T < P("domain", 2)) continue;
    let cur = null; for (const p of b.ph) if (T >= p.t0) cur = p;
    if (!cur) continue;
    const pop = easeOut(prog(T, cur.t0, cur.t0 + .16)), fade = clamp((b.end + .3 - T) / .3);
    if (desk) {
      ctx.save(); ctx.font = '900 40px "Unbounded"'; const w = Math.min(1300, ctx.measureText(cur.cap).width) + 60;
      ctx.globalAlpha = pop * fade * .85; rr(960 - w / 2, 870, w, 64, 32); ctx.fillStyle = "rgba(10,4,7,.8)"; ctx.fill(); ctx.restore();
      text(cur.cap, 960, 903, { size: 40, scale: 1 + .15 * (1 - pop), alpha: pop * fade, maxW: 1300, blur: 20 });
    }
    else text(cur.cap, 600, 960, { size: 60, scale: 1 + .22 * (1 - pop), alpha: pop * fade, maxW: 1080 });
  }
}

// ── кадр ────────────────────────────────────────────────────────────
// камера на рабочем столе: лёгкие наезды на ключевых моментах
function camera(T) {
  const keys = [];
  const add = (t, z, x, y) => keys.push([t, z, x, y]);
  add(S("server") - .5, 1, 960, 540);
  if (BLK.server) { add(P("server", 3) - .2, 1, 960, 540); add(P("server", 3) + .4, 1.28, 1150, 760); add(P("server", 6) - .3, 1.28, 1150, 760); add(P("server", 6) + .3, 1, 960, 540); }
  if (BLK.domain) { add(P("domain", 4) + .2, 1, 960, 540); add(P("domain", 4) + .8, 1.15, 1250, 520); add(P("domain", 5) - .2, 1.15, 1250, 520); add(P("domain", 5) + .3, 1, 960, 540); }
  if (BLK.memory) { add(P("memory", 5) + .2, 1, 960, 540); add(P("memory", 5) + .8, 1.12, 900, 420); add(E("memory"), 1.12, 900, 420); add(E("memory") + .5, 1, 960, 540); }
  if (BLK.feed) { add(P("feed", 3) - .2, 1, 960, 540); add(P("feed", 3) + .3, 1.1, 960, 620); add(E("feed"), 1.1, 960, 620); add(E("feed") + .5, 1, 960, 540); }
  if (BLK.guard) { add(P("guard", 4) - .2, 1, 960, 540); add(P("guard", 4) + .4, 1.2, 1440, 520); add(E("guard"), 1.2, 1440, 520); add(E("guard") + .5, 1, 960, 540); }
  keys.sort((a, b) => a[0] - b[0]);
  let z = 1, x = 960, y = 540;
  for (let i = 0; i < keys.length; i++) {
    const [t0, z0, x0, y0] = keys[i], nx = keys[i + 1];
    if (T >= t0) { if (!nx || T < nx[0]) { if (nx) { const p = ease(prog(T, t0, nx[0])); z = lerp(z0, nx[1], p); x = lerp(x0, nx[2], p); y = lerp(y0, nx[3], p); } else { z = z0; x = x0; y = y0; } } }
  }
  return { z: z * (1 + .004 * Math.sin(T * .5)), x, y };
}
const deskAmount = T => (BLK.server ? clamp(Math.min((T - (S("server") - .6)) / .6, ((BLK.outro ? S("outro") - .2 : 1e9) - T) / .6)) : 0);

function renderAt(T) {
  ctx.save(); ctx.clearRect(0, 0, W, H);
  const d = deskAmount(T);
  if (d < 1) {
    stageBg(T);
    drawBigHost(T, 1 - d);
    sceneIntro(T); sceneOutro(T);
    captions(T, false);
    hud(T, false);
  }
  if (d > 0) {
    ctx.save(); ctx.globalAlpha = d;
    // переход: экран «влетает» из монитора
    const zin = lerp(.7, 1, easeOut(d));
    ctx.translate(W / 2, H / 2); ctx.scale(zin, zin); ctx.translate(-W / 2, -H / 2);
    const cam = camera(T);
    wallpaper(T);
    const id = DESK.find(k => BLK[k] && T >= S(k) - .5 && T < E(k) + GAP) || "server";
    ctx.save();
    ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
    sceneServer(T); sceneDomain(T); sceneMemory(T); sceneFeed(T); sceneGuard(T); sceneOnline(T); sceneSearch(T);
    ctx.restore();
    dock({ server: "browser", domain: "browser", memory: "editor", feed: "browser", guard: "terminal", online: "bitik", search: "editor" }[id]);
    stepLabel(T, id, 1);
    captions(T, true);
    drawFacecam(T, 1);
    hud(T, true);
    ctx.restore();
  }
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .5, W / 2, H / 2, H * 1.1);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.5)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const dip = Math.max(1 - clamp(T / .6), clamp((T - (DURATION - .8)) / .8));
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
  const tim = await (await fetch("timings.json")).json();
  const script = await (await fetch("script.json")).json();
  let t = T0;
  TRACKS = [];
  for (const id of ORDER) {
    let b = tim[id];
    if (!b) { // ещё не озвучено: оценка длины по тексту
      const sb = script.blocks.find(x => x.id === id); let x = 0;
      b = { duration: 0, phrases: sb.phrases.map(p => { const d = p.say.length / 13 + .2, ph = { t0: x, t1: x + d, cap: p.cap }; x += d + .6; return ph; }) };
      b.duration = x;
    } else TRACKS.push({ key: id, file: `assets/vo/${id}.mp3`, t });
    BLK[id] = { start: t, end: t + b.duration, ph: b.phrases.map(p => ({ t0: t + p.t0, t1: t + p.t1, cap: p.cap })) };
    t += b.duration + GAP;
  }
  DURATION = BLK.outro.end + 3.5;
  window.DURATION = DURATION;
  window.AUDIO_TRACKS = TRACKS;
  window.SFX_DIR = "../ep1/assets/sfx";
  window.MUSIC = "../ep1/assets/music.mp3";
  window.SFX_CUES = buildSfx();
  window.BLOCKS = BLK;
  const q = new URLSearchParams(location.search);
  if (q.has("t")) renderAt(parseFloat(q.get("t")));
  else if (!q.has("static")) { const st = performance.now(); const loop = () => { renderAt(((performance.now() - st) / 1000) % DURATION); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  window.READY = true;
}
function buildSfx() {
  const c = [], add = (t, name, vol = .5) => c.push({ t, name, vol });
  add(P("intro", 5), "boom", .5); add(P("intro", 7), "boom", .55);
  for (let i = 0; i < 4; i++) add(P("intro", 7) + i, "tick", .3);
  add(S("server") - .5, "whoosh", .2);
  for (const id of DESK) if (BLK[id]) add(S(id) - .3, "whoosh", .15);
  add(P("server", 3), "boom", .4); add(P("server", 5), "denied", .4);
  add(S("domain") + .2, "typing", .3); add(P("domain", 2), "click", .5); add(P("domain", 6), "chime", .4);
  add(P("memory", 5) + .2, "typing", .3);
  add(P("feed", 1) + .3, "click", .5); add(P("feed", 1) + 1.1, "chomp", .45); add(P("feed", 4), "chime", .35);
  add(S("guard") + .4, "click", .5); [0, .25, .5, .75].forEach(d => add(P("guard", 1) + .1 + d, "denied", .3)); add(P("guard", 4), "typing", .3);
  add(P("online", 2), "pop", .4);
  add(P("search", 1) - .3, "typing", .3); add(P("search", 2) + .3, "chime", .35);
  add(S("outro"), "whoosh", .2); add(P("outro", 2), "boom", .45); add(P("outro", 4), "boom", .5);
  return c;
}
init();
