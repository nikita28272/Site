// Серия 1 «Рождение». Детерминированная сцена: window.renderAt(t) рисует кадр для момента t (в секундах).
// Рендер в MP4 — render.js (Playwright + ffmpeg).
import {
  SPRITE_W, SPRITE_H, ROOM_W, ROOM_H, BITIK_X, BITIK_Y, FOOD_W,
  drawSprite, drawRoom, drawFood, countPixels, spriteGrid, PALETTES,
} from "../../site/js/bitik.js";

const W = 1920, H = 1080;
const cv = document.getElementById("c");
const ctx = cv.getContext("2d");

// ── Тайминг озвучки ────────────────────────────────────────────────
export const IO = 0.5;    // старт озвучки интро
export const BO = 31.5;   // старт озвучки «создания»
export const DURATION = BO + 45.3 + 3.2;
window.DURATION = DURATION;
window.AUDIO = { IO, BO };

// ── Утилиты ─────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const prog = (T, a, b) => clamp((T - a) / (b - a));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const ease = x => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const win = (T, a, b, f = 0.25) => clamp(Math.min((T - a) / f, (b - T) / f));
const lerp = (a, b, p) => a + (b - a) * p;
const CYAN = "#7de3ff";

function text(str, x, y, o = {}) {
  const {
    size = 64, weight = 900, family = "Unbounded", color = "#fff",
    glow = "rgba(125,227,255,.55)", blur = 28, align = "center",
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

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// пиксельные спрайты: рисуем в маленький буфер и масштабируем без сглаживания
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
  if (glitch > 0) {
    ctx.globalAlpha = alpha * 0.6;
    ctx.filter = "hue-rotate(140deg)";
    ctx.drawImage(spriteBuf, x - glitch, y, w, h);
    ctx.filter = "hue-rotate(-90deg)";
    ctx.drawImage(spriteBuf, x + glitch, y, w, h);
    ctx.filter = "none";
    ctx.globalAlpha = alpha;
  }
  ctx.drawImage(spriteBuf, x, y, w, h);
  ctx.restore();
  return { x, y, w, h };
}

const roomBuf = new OffscreenCanvas(ROOM_W, ROOM_H);
const rctx = roomBuf.getContext("2d");

function heart(x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#f29bb8";
  for (const [dx, dy] of [[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
  ctx.restore();
}

function apple(x, y, s) {
  const b = new OffscreenCanvas(FOOD_W, 7);
  drawFood(b.getContext("2d"), 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(b, x, y, FOOD_W * s, 7 * s);
  ctx.restore();
}

// ── Ведущий (картинка пользователя) ────────────────────────────────
let host = null;
function prepareHost(img) {
  const S = 1080;
  const c = new OffscreenCanvas(S, S);
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0, S, S);
  // затемняем фон вокруг лица
  g.globalCompositeOperation = "source-atop";
  const dark = g.createRadialGradient(S * .5, S * .45, S * .18, S * .5, S * .5, S * .72);
  dark.addColorStop(0, "rgba(5,8,18,0)");
  dark.addColorStop(1, "rgba(5,8,18,.85)");
  g.fillStyle = dark;
  g.fillRect(0, 0, S, S);
  g.fillStyle = "rgba(20,40,90,.18)";
  g.fillRect(0, 0, S, S);
  // мягкие края слева и сверху
  g.globalCompositeOperation = "destination-in";
  const lx = g.createLinearGradient(0, 0, S * .32, 0);
  lx.addColorStop(0, "rgba(0,0,0,0)"); lx.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = lx; g.fillRect(0, 0, S, S);
  const ty = g.createLinearGradient(0, 0, 0, S * .18);
  ty.addColorStop(0, "rgba(0,0,0,0)"); ty.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = ty; g.fillRect(0, 0, S, S);
  return c;
}

// ключевые кадры ведущего: прозрачность, сдвиг по x, масштаб
const HOST_KEYS = [
  [0, 0, 0, 1.08], [0.7, 1, 0, 1.04], [9.0, 1, 0, 1.0], [9.6, .4, 220, 1.0],
  [21.2, .4, 220, 1.0], [21.6, 0, 300, 1.0], [25.4, 0, 0, 1.06], [25.8, 1, 0, 1.04],
  [30.6, 1, 0, 1.0], [31.2, 0, 0, 1.0], [31.8, .9, 260, .92], [DURATION, .9, 260, .92],
];
function hostState(T) {
  for (let i = 0; i < HOST_KEYS.length - 1; i++) {
    const [t0, a0, x0, s0] = HOST_KEYS[i], [t1, a1, x1, s1] = HOST_KEYS[i + 1];
    if (T <= t1) {
      const p = ease(prog(T, t0, t1));
      return { a: lerp(a0, a1, p), dx: lerp(x0, x1, p), s: lerp(s0, s1, p) };
    }
  }
  return { a: .9, dx: 260, s: .92 };
}

function drawHost(T, punch) {
  if (!host) return;
  const { a, dx, s } = hostState(T);
  if (a <= 0.01) return;
  const breathe = 1 + 0.006 * Math.sin(T * 1.6);
  const sc = s * breathe * (1 + punch);
  const size = 1080 * sc;
  const x = 1920 - 1080 + 40 + dx + (1080 - size) / 2;
  const y = 1080 - size + Math.sin(T * 0.8) * 4;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(host, x, y, size, size);
  ctx.restore();
}

// ── Фон и HUD ───────────────────────────────────────────────────────
function background(T) {
  ctx.fillStyle = "#05070f";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(90,140,255,.07)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const off = (T * 6) % 64;
  for (let x = -64 + off; x < W; x += 64) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += 64) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  const g = ctx.createRadialGradient(760, 960, 50, 760, 960, 900);
  g.addColorStop(0, "rgba(40,90,210,.30)");
  g.addColorStop(1, "rgba(40,90,210,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function vignette() {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * 1.05);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,.6)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

const H48 = 48 * 3600;
const END_SECS = 40 * 3600 + 12 * 60 + 37;
const GO = IO + 25.1; // «Поехали»
function timerSecs(T) {
  if (T < GO) return H48;
  if (T < BO) return H48 - (T - GO);
  const s0 = H48 - (BO - GO);
  return s0 + (END_SECS - s0) * ease(prog(T, BO, BO + 41));
}
function fmt(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = s % 60;
  return [h, m, sec].map(v => String(v).padStart(2, "0")).join(":");
}

function hud(T) {
  const a = clamp((T - 0.3) / 0.4);
  text("ТАЙМЕР", 72, 58, { size: 15, family: "JetBrains Mono", weight: 700, color: "rgba(125,227,255,.6)", glow: null, align: "left", alpha: a, spacing: 3 });
  text(fmt(timerSecs(T)), 72, 92, { size: 34, family: "JetBrains Mono", weight: 700, color: CYAN, align: "left", alpha: a, blur: 18, spacing: 2 });
}

// ── Субтитры ────────────────────────────────────────────────────────
const C = (t, s, o = {}) => ({ t, s, ...o });
const GREEN = { color: "#9dff8a", glow: "rgba(111,211,107,.7)" };
const GREY = { color: "#b9c3e6", glow: "rgba(125,134,168,.7)" };
const RED = { color: "#ffd2d8", glow: "rgba(255,70,100,.85)", blur: 40 };
const CAPTION_GROUPS = [
  // интро (время = IO + время в озвучке)
  { pos: [640, 950], end: IO + 8.1, items: [C(IO + 2.77, "СОЗДАТЬ САЙТ"), C(IO + 4.2, "ГДЕ ЖИВЁТ СУЩЕСТВО"), C(IO + 6.05, "ОДНО", { size: 150 }), C(IO + 7.05, "НА ВЕСЬ ИНТЕРНЕТ")] },
  { pos: [640, 950], end: IO + 11.6, items: [C(IO + 8.75, "ЭТО БИТИК"), C(IO + 9.83, "ИЗ БИТОГО ПИКСЕЛЯ")] },
  { pos: [640, 950], end: IO + 15.9, items: [C(IO + 12.02, "ПОКОРМИТЕ"), C(IO + 12.9, "СЧАСТЛИВ", GREEN), C(IO + 14.0, "ЗАБУДЕТЕ"), C(IO + 14.8, "ЗАГРУСТИТ", GREY)] },
  { pos: [640, 950], end: IO + 20.9, items: [C(IO + 16.24, "ЗАБУДУТ СОВСЕМ"), C(IO + 18.53, "ИЗМЕНИТСЯ"), C(IO + 19.86, "НАВСЕГДА", { ...RED, size: 110 })] },
  // создание (время = BO + время в озвучке)
  { pos: [600, 1012], size: 50, end: BO + 7.4, items: [C(BO, "НАЧНЁМ"), C(BO + 1.56, "С НЕГО САМОГО"), C(BO + 3.07, "16 × 17 ПИКСЕЛЕЙ"), C(BO + 5.48, "КАЖДЫЙ —"), C(BO + 6.27, "ВРУЧНУЮ")] },
  { pos: [600, 1012], size: 50, end: BO + 18.4, items: [C(BO + 8.02, "РОСТОК"), C(BO + 9.5, "= НАСТРОЕНИЕ"), C(BO + 12.66, "РАСКРЫТ — СЧАСТЛИВ", GREEN), C(BO + 14.66, "ПОНИК — ГРУСТИТ", GREY), C(BO + 16.49, "СВЕТИТСЯ — СПИТ", { color: "#c8fff0", glow: "rgba(143,247,208,.8)" })] },
  { pos: [600, 1012], size: 50, end: BO + 24.3, items: [C(BO + 18.86, "ЕМУ НУЖЕН ДОМ"), C(BO + 20.51, "ТЁМНАЯ КОМНАТА"), C(BO + 21.84, "МЯГКИЙ СВЕТ"), C(BO + 23.08, "ПОЛ ИЗ ДОСОК")] },
  { pos: [600, 1012], size: 50, end: BO + 31.9, items: [C(BO + 24.81, "ТЕПЕРЬ ГЛАВНОЕ"), C(BO + 26.3, "ОН УМЕЕТ ХОТЕТЬ ЕСТЬ"), C(BO + 28.29, "−1% КАЖДУЮ МИНУТУ"), C(BO + 30.38, "И ОН ЭТО ПОКАЗЫВАЕТ")] },
  { pos: [600, 1012], size: 50, end: BO + 36.7, items: [C(BO + 32.19, "ОДНА КНОПКА"), C(BO + 33.47, "ОДНО ДЕЙСТВИЕ"), C(BO + 34.76, "И ПАДАЕТ ЕДА", GREEN)] },
  { pos: [600, 1012], size: 50, end: BO + 40.6, items: [C(BO + 37.15, "БИТИК ЖИВЁТ", GREEN), C(BO + 38.46, "НО ПОКА — ТОЛЬКО У МЕНЯ")] },
  { pos: [760, 960], size: 56, end: DURATION, items: [C(BO + 43.7, "КОРМИТЬ БУДЕТЕ ВЫ", GREEN)] },
];

function captions(T) {
  for (const g of CAPTION_GROUPS) {
    if (T < g.items[0].t || T > g.end + 0.2) continue;
    let cur = null;
    for (const it of g.items) if (T >= it.t) cur = it;
    if (!cur) continue;
    const pop = easeOut(prog(T, cur.t, cur.t + 0.16));
    const fadeOut = clamp((g.end + 0.2 - T) / 0.2);
    text(cur.s, g.pos[0], g.pos[1], {
      size: cur.size || g.size || 66, color: cur.color, glow: cur.glow || "rgba(125,227,255,.5)",
      blur: cur.blur || 26, scale: 1 + 0.22 * (1 - pop), alpha: pop * fadeOut,
    });
  }
}

// «удар» — короткий наезд камеры на акцентных словах
const PUNCHES = [IO + 6.05, IO + 19.86, IO + 21.08, GO];
function punch(T) {
  let p = 0;
  for (const t of PUNCHES) { const d = T - t; if (d >= 0 && d < 0.4) p = Math.max(p, 0.03 * (1 - d / 0.4)); }
  return p;
}

// ── Сцены интро ─────────────────────────────────────────────────────
const BX = 600, BB = 840, BS = 16; // позиция и масштаб Битика в интро
const TOTAL_PX = countPixels("normal");

function introBitik(T) {
  const a = win(T, IO + 8.6, IO + 21.1, 0.3);
  if (a <= 0) return;
  const tBorn = IO + 8.75, tAssemble = IO + 9.15;
  // битый пиксель мигает
  if (T < tAssemble) {
    const on = Math.floor(T * 20) % 3 !== 0;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = on ? (Math.floor(T * 20) % 2 ? "#ff3df2" : CYAN) : "#ffffff";
    ctx.shadowColor = CYAN; ctx.shadowBlur = 30;
    if (T >= tBorn) ctx.fillRect(BX - BS / 2, BB - 9 * BS, BS, BS);
    ctx.restore();
    return;
  }
  const limit = Math.floor(TOTAL_PX * easeOut(prog(T, tAssemble, IO + 10.8)));
  let mood = "normal", glitch = 0;
  const tFood = IO + 12.02, tEat = IO + 12.75, tForget = IO + 14.0;
  if (T >= tEat && T < tForget) mood = "happy";
  if (T >= tForget) mood = "sad";
  if (T >= IO + 18.53 && T < IO + 19.4) glitch = Math.floor(T * 30) % 2 ? 10 : -6;
  if (T >= IO + 19.86 && T < IO + 20.3) glitch = 14;
  const bob = mood === "sad" ? 0 : (Math.floor(T * (mood === "happy" ? 4 : 2)) % 2 ? -BS : 0);
  const blink = mood === "normal" && (T % 3.1) < 0.12;
  // тень
  ctx.save(); ctx.globalAlpha = a * .5; ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(BX, BB + 6, 110, 16, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  bitik(mood, BX, BB + bob, BS, { alpha: a, limit, blink, glitch });
  // яблоко
  if (T >= tFood && T < tEat) {
    const p = prog(T, tFood, tEat);
    apple(BX - 3 * BS, lerp(-120, BB - 15 * BS, p * p), BS);
  }
  // сердечки
  if (T >= tEat && T < tEat + 1.3) {
    const d = T - tEat;
    for (let i = 0; i < 4; i++) heart(BX - 90 + i * 55, BB - 220 - d * (90 + i * 30), 12, clamp(1.3 - d));
  }
}

function sproutIcon(x, y, s) {
  ctx.fillStyle = "#6fd36b";
  for (const [dx, dy] of [[0,0],[1,0],[3,0],[4,0],[1,1],[3,1]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
  ctx.fillStyle = "#3f8f4a";
  for (const [dx, dy] of [[2,1],[2,2],[2,3]]) ctx.fillRect(x + dx * s, y + dy * s, s, s);
}

function teaserCard(T) {
  const a = win(T, IO + 16.24, IO + 21.1, 0.3);
  if (a <= 0) return;
  const slide = easeOut(prog(T, IO + 16.24, IO + 16.7));
  const x = lerp(40, 110, slide), y = 230;
  ctx.save();
  ctx.globalAlpha = a;
  roundRect(x, y, 520, 120, 14);
  ctx.fillStyle = "rgba(12,16,32,.85)"; ctx.fill();
  ctx.strokeStyle = "rgba(125,227,255,.35)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = CYAN; ctx.fillRect(x, y + 18, 4, 84);
  ctx.restore();
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "rgba(111,211,107,.15)";
  roundRect(x + 26, y + 26, 68, 68, 12); ctx.fill();
  sproutIcon(x + 40, y + 42, 8);
  ctx.restore();
  text("ВО ЧТО ОН ВЫРАСТЕТ", x + 116, y + 52, { size: 28, weight: 700, align: "left", alpha: a, glow: null });
  text("ЗА 48 ЧАСОВ", x + 116, y + 86, { size: 15, family: "JetBrains Mono", weight: 700, color: "#8a93b8", align: "left", alpha: a, glow: null, spacing: 3 });
  // размытый «ответ»
  ctx.save();
  ctx.globalAlpha = a;
  ctx.filter = "blur(10px)";
  ctx.fillStyle = "#4aa8ff";
  ctx.fillRect(x + 10, y + 150, 150, 46); ctx.fillRect(x + 180, y + 150, 140, 46); ctx.fillRect(x + 340, y + 150, 90, 46);
  ctx.filter = "none";
  ctx.restore();
  text("покажу в конце", x + 150, y + 238, { size: 18, family: "JetBrains Mono", weight: 400, color: CYAN, alpha: a * (0.6 + 0.4 * Math.sin(T * 5)), blur: 10, spacing: 2 });
}

function bigTimer(T) {
  const a = win(T, IO + 0.0, IO + 2.4, 0.3);
  if (a > 0) text(fmt(H48), 760, 640, { size: 150, family: "Unbounded", weight: 900, color: "#d9f7ff", alpha: a, blur: 50, scale: 1 + 0.08 * (1 - easeOut(prog(T, IO, IO + 0.3))) });
  const b = win(T, GO, IO + 26.9, 0.25);
  if (b > 0) {
    text(fmt(timerSecs(T)), 760, 600, { size: 150, weight: 900, color: "#d9f7ff", alpha: b, blur: 50 });
    text("ПОЕХАЛИ", 760, 770, { size: 84, alpha: b * easeOut(prog(T, GO, GO + 0.15)), scale: 1 + 0.25 * (1 - easeOut(prog(T, GO, GO + 0.15))) });
  }
}

function equation(T) {
  const a = win(T, IO + 21.08, IO + 24.9, 0.25);
  if (a <= 0) return;
  const p1 = easeOut(prog(T, IO + 21.08, IO + 21.3));
  const p2 = easeOut(prog(T, IO + 21.3, IO + 21.55));
  const p3 = easeOut(prog(T, IO + 21.55, IO + 21.8));
  text("1", 430, 470, { size: 300, color: "#f2fbff", alpha: a * p1, blur: 60, scale: 1.2 - .2 * p1 });
  text("САЙТ", 430, 680, { size: 88, color: "#f2fbff", alpha: a * p1, blur: 30 });
  ctx.save(); ctx.globalAlpha = a * p2; ctx.fillStyle = "#c9d6ff";
  ctx.fillRect(805, 520, 90, 18); ctx.fillRect(805, 570, 90, 18); ctx.restore();
  text("48:00", 1370, 490, { size: 170, family: "Unbounded", color: "#f2fbff", alpha: a * p3, blur: 50 });
  text("ЧАСОВ", 1370, 680, { size: 88, color: CYAN, glow: "rgba(77,180,255,.9)", alpha: a * p3, blur: 30 });
  const p4 = easeOut(prog(T, IO + 21.92, IO + 22.2));
  text("0 СТРОК КОДА НА СТАРТЕ", 960, 860, { size: 44, weight: 700, color: "#9aa6d6", alpha: a * p4, glow: null });
}

function titleCard(T) {
  const a = win(T, IO + 26.9, BO - 0.3, 0.3);
  if (a <= 0) return;
  const g = T < IO + 27.3 ? (Math.floor(T * 30) % 2 ? 8 : -8) : 0;
  text("СЕРИЯ 1", 640 + g, 440, { size: 30, family: "JetBrains Mono", weight: 700, color: CYAN, alpha: a, spacing: 8, blur: 16 });
  text("РОЖДЕНИЕ", 640 - g, 545, { size: 140, alpha: a, blur: 50 });
}

// ── Сцены «создания» ────────────────────────────────────────────────
const P = { x: 70, y: 150, w: 1070, h: 810 };

function panel(a) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = "rgba(125,227,255,.18)"; ctx.shadowBlur = 50;
  roundRect(P.x, P.y, P.w, P.h, 18);
  ctx.fillStyle = "#0b0e1b"; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(125,227,255,.22)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

function windowBar(a, title, highlight = 0) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#141a2e";
  roundRect(P.x, P.y, P.w, 50, [18, 18, 0, 0]); ctx.fill();
  ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(P.x + 28 + i * 24, P.y + 25, 7, 0, Math.PI * 2); ctx.fill();
  });
  roundRect(P.x + 120, P.y + 11, 420, 28, 14);
  ctx.fillStyle = "#0b0e1b"; ctx.fill();
  if (highlight > 0) { ctx.strokeStyle = `rgba(255,190,90,${highlight})`; ctx.lineWidth = 3; ctx.shadowColor = "#ffbe5a"; ctx.shadowBlur = 20 * highlight; ctx.stroke(); ctx.shadowBlur = 0; }
  ctx.restore();
  text(title, P.x + 140, P.y + 26, { size: 16, family: "JetBrains Mono", weight: 400, color: "#9aa6d6", align: "left", alpha: a, glow: null });
}

// B1: код спрайта печатается, сетка заполняется
const CODE_ROWS = spriteGrid("normal").grid.map(r => r.join(""));
const CODE_CHARS = CODE_ROWS.length * SPRITE_W;
function sceneSprite(T) {
  const a = win(T, BO - 0.2, BO + 7.6, 0.3);
  if (a <= 0) return;
  panel(a);
  windowBar(a, "bitik.js");
  const p = prog(T, BO + 0.3, BO + 7.0);
  const typed = Math.floor(CODE_CHARS * p);
  const pal = PALETTES.normal;
  const cx = P.x + 40, cy = P.y + 100, lh = 36;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `400 26px "JetBrains Mono"`;
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c792ea"; ctx.fillText("const", cx, cy);
  ctx.fillStyle = "#e6edf3"; ctx.fillText(" BITIK = [", cx + 78, cy);
  for (let r = 0; r < CODE_ROWS.length; r++) {
    const y = cy + (r + 1) * lh * 0.9 + 6;
    const shown = clamp(typed - r * SPRITE_W, 0, SPRITE_W);
    if (shown <= 0) break;
    ctx.fillStyle = "#6b7394"; ctx.fillText('  "', cx, y);
    for (let i = 0; i < shown; i++) {
      const ch = CODE_ROWS[r][i];
      ctx.fillStyle = ch === "." ? "#2c3350" : pal[ch];
      ctx.fillText(ch, cx + 48 + i * 15.6, y);
    }
    if (shown === SPRITE_W) { ctx.fillStyle = "#6b7394"; ctx.fillText('",', cx + 48 + SPRITE_W * 15.6, y); }
    else if (Math.floor(T * 4) % 2) { ctx.fillStyle = CYAN; ctx.fillRect(cx + 48 + shown * 15.6, y - 14, 3, 28); }
  }
  if (typed >= CODE_CHARS) { ctx.fillStyle = "#e6edf3"; ctx.fillText("];", cx, cy + (CODE_ROWS.length + 1) * lh * 0.9 + 6); }
  ctx.restore();
  // сетка
  const cs = 27, gx = P.x + P.w - 40 - cs * SPRITE_W, gy = P.y + 130;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "#070912"; ctx.fillRect(gx, gy, cs * SPRITE_W, cs * SPRITE_H);
  for (let r = 0; r < SPRITE_H; r++) for (let c = 0; c < SPRITE_W; c++) {
    const idx = r * SPRITE_W + c;
    const ch = CODE_ROWS[r][c];
    if (idx < typed && ch !== ".") {
      const age = (typed - idx) / CODE_CHARS * 40;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs);
      if (age < 1) { ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - age)})`; ctx.fillRect(gx + c * cs, gy + r * cs, cs, cs); }
    }
  }
  ctx.strokeStyle = "rgba(125,227,255,.10)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let c = 0; c <= SPRITE_W; c++) { ctx.moveTo(gx + c * cs + .5, gy); ctx.lineTo(gx + c * cs + .5, gy + cs * SPRITE_H); }
  for (let r = 0; r <= SPRITE_H; r++) { ctx.moveTo(gx, gy + r * cs + .5); ctx.lineTo(gx + cs * SPRITE_W, gy + r * cs + .5); }
  ctx.stroke();
  ctx.restore();
  text("16 × 17", gx + cs * SPRITE_W / 2, gy + cs * SPRITE_H + 60, { size: 30, family: "JetBrains Mono", weight: 700, color: CYAN, alpha: a * prog(T, BO + 3.07, BO + 3.3), blur: 14 });
}

// B2: росток = настроение
function sceneSprout(T) {
  const a = win(T, BO + 7.8, BO + 18.5, 0.3);
  if (a <= 0) return;
  panel(a);
  const cx = P.x + P.w / 2, bottom = P.y + P.h - 170;
  const split = easeOut(prog(T, BO + 12.3, BO + 12.8));
  if (split < 1) {
    const s = 26;
    const blink = (T % 2.9) < 0.12;
    const r = bitik("normal", cx, bottom, s, { alpha: a * (1 - split), blink });
    // кольцо вокруг ростка
    const ring = prog(T, BO + 8.02, BO + 8.4);
    if (ring > 0) {
      ctx.save();
      ctx.globalAlpha = a * (1 - split) * ring;
      ctx.strokeStyle = "#9dff8a"; ctx.lineWidth = 5;
      ctx.shadowColor = "#6fd36b"; ctx.shadowBlur = 25;
      ctx.beginPath(); ctx.arc(r.x + 8.5 * s, r.y + 2 * s, 95 + 6 * Math.sin(T * 6), 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    return;
  }
  const states = [["happy", "СЧАСТЛИВ", BO + 12.66, "#9dff8a"], ["sad", "ГРУСТИТ", BO + 14.66, "#b9c3e6"], ["sleep", "СПИТ", BO + 16.49, "#8ff7d0"]];
  states.forEach(([mood, label, t0, col], i) => {
    const x = P.x + 190 + i * 345;
    const on = T >= t0;
    const k = easeOut(prog(T, t0, t0 + 0.2));
    const alpha = a * (on ? 1 : 0.25);
    if (mood === "sleep" && on) {
      ctx.save();
      const g = ctx.createRadialGradient(x, bottom - 15.5 * 14, 5, x, bottom - 15.5 * 14, 90);
      g.addColorStop(0, `rgba(143,247,208,${0.55 * a})`); g.addColorStop(1, "rgba(143,247,208,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 100, bottom - 330, 200, 200);
      ctx.restore();
    }
    const bob = on && mood === "happy" && Math.floor(T * 4) % 2 ? -14 : 0;
    bitik(mood, x, bottom + bob - 10 * k, 14, { alpha });
    text(label, x, bottom + 70, { size: 34, color: on ? col : "#4a5170", alpha: a, glow: on ? col : null, blur: 18 });
    if (mood === "sleep" && on) text("z Z", x + 110, bottom - 300 - 10 * Math.sin(T * 2), { size: 30, family: "JetBrains Mono", color: "#8ff7d0", alpha: a * 0.8, blur: 10 });
  });
}

// B3–B6: браузер с комнатой
const RS = 7.5; // масштаб комнаты
const RX = P.x + (P.w - ROOM_W * RS) / 2, RY = P.y + 72;

function hungerAt(T) {
  if (T < BO + 28.29) return 100;
  if (T < BO + 34.76 + 0.65) return lerp(100, 24, ease(prog(T, BO + 28.29, BO + 30.6)));
  return lerp(24, 39, easeOut(prog(T, BO + 35.41, BO + 35.9)));
}

function sceneRoom(T) {
  const a = win(T, BO + 18.6, BO + 41.4, 0.3);
  if (a <= 0) return;
  panel(a);
  const hl = T > BO + 38.46 ? 0.5 + 0.5 * Math.sin((T - BO - 38.46) * 6) : 0;
  windowBar(a, "localhost:8765", T > BO + 38.46 && T < BO + 40.8 ? hl : 0);

  const wall = prog(T, BO + 20.51, BO + 21.2);
  const light = prog(T, BO + 21.84, BO + 22.3);
  const floor = prog(T, BO + 23.08, BO + 23.6);
  drawRoom(rctx, { wall, floor, light: light * (0.85 + 0.15 * Math.sin(T * 9) * (light < 1 ? 1 : 0)), t: T });

  // Битик появляется вместе с полом
  const hunger = hungerAt(T);
  const tClick = BO + 34.76, tEat = tClick + 0.65;
  let mood = hunger < 35 ? "hungry" : "normal";
  if (T >= tEat && T < tEat + 2.5) mood = "happy";
  if (T >= BO + 37.15) mood = "happy";
  if (floor > 0) {
    rctx.save();
    rctx.globalAlpha = floor;
    rctx.fillStyle = "rgba(0,0,0,.35)";
    rctx.fillRect(BITIK_X + 3, BITIK_Y + 16, 10, 1);
    const bob = Math.floor(T * (mood === "happy" ? 4 : 2)) % 2 ? -1 : 0;
    drawSprite(rctx, mood, BITIK_X, BITIK_Y + bob, { blink: mood !== "happy" && (T % 3.3) < 0.12 });
    rctx.restore();
  }
  if (T >= tClick && T < tEat) {
    const p = prog(T, tClick, tEat);
    drawFood(rctx, BITIK_X + 5, lerp(-FOOD_W, BITIK_Y + 1, p * p));
  }
  ctx.save();
  ctx.globalAlpha = a;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(roomBuf, RX, RY, ROOM_W * RS, ROOM_H * RS);
  ctx.strokeStyle = "#3a2d4f"; ctx.lineWidth = 4; ctx.strokeRect(RX, RY, ROOM_W * RS, ROOM_H * RS);
  ctx.restore();
  if (T >= tEat && T < tEat + 1.3) {
    const d = T - tEat;
    for (let i = 0; i < 4; i++) heart(RX + (BITIK_X + 2 + i * 3.5) * RS, RY + (BITIK_Y + 2) * RS - d * (60 + i * 18), 7, clamp(1.3 - d) * a);
  }

  // шкала сытости
  const ba = a * prog(T, BO + 24.81, BO + 25.2);
  if (ba > 0) {
    const bx = RX, by = RY + ROOM_H * RS + 34, bw = 640;
    text("СЫТОСТЬ", bx, by, { size: 20, family: "JetBrains Mono", weight: 700, color: "#efe8ff", align: "left", alpha: ba, glow: null, spacing: 2 });
    text(Math.round(hunger) + "%", bx + bw, by, { size: 20, family: "JetBrains Mono", weight: 700, color: "#efe8ff", align: "right", alpha: ba, glow: null });
    ctx.save();
    ctx.globalAlpha = ba;
    ctx.fillStyle = "#0b0812"; ctx.fillRect(bx, by + 22, bw, 26);
    ctx.strokeStyle = "#3a2d4f"; ctx.lineWidth = 4; ctx.strokeRect(bx, by + 22, bw, 26);
    const fillW = (bw - 8) * hunger / 100;
    ctx.fillStyle = hunger < 35 ? "#f2b84b" : "#6fd36b";
    ctx.fillRect(bx + 4, by + 26, Math.floor(fillW / 12) * 12, 18);
    ctx.restore();
  }

  // кнопка
  const btA = a * easeOut(prog(T, BO + 32.19, BO + 32.5));
  const bx = RX + ROOM_W * RS - 250, by = RY + ROOM_H * RS + 30, bw = 250, bh = 76;
  if (btA > 0) {
    const pressed = T >= tClick && T < tClick + 0.15 ? 5 : 0;
    ctx.save();
    ctx.globalAlpha = btA;
    ctx.fillStyle = "#2b1d3a"; ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 12);
    ctx.fillStyle = "#8f2537"; ctx.fillRect(bx, by + 6, bw, bh);
    ctx.fillStyle = "#e2445c"; ctx.fillRect(bx, by + pressed, bw, bh - 2);
    ctx.restore();
    text("ПОКОРМИТЬ", bx + bw / 2, by + bh / 2 + pressed, { size: 22, color: "#1a0f14", glow: null, alpha: btA, scale: 1 + 0.15 * (1 - easeOut(prog(T, BO + 32.19, BO + 32.4))) });
  }

  // курсор
  const ca = a * win(T, BO + 33.4, BO + 36.4, 0.2);
  if (ca > 0) {
    const p = ease(prog(T, BO + 33.5, BO + 34.6));
    const x = lerp(RX + 420, bx + bw * 0.6, p), y = lerp(RY + 380, by + bh * 0.6, p);
    ctx.save();
    ctx.globalAlpha = ca;
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 40); ctx.lineTo(22, 37); ctx.lineTo(15, 23); ctx.lineTo(26, 23); ctx.closePath();
    ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#000"; ctx.lineWidth = 2.5; ctx.stroke();
    if (T >= tClick && T < tClick + 0.35) {
      const d = (T - tClick) / 0.35;
      ctx.strokeStyle = `rgba(125,227,255,${1 - d})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, 10 + 40 * d, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

  // окно с кодом голода
  const ka = a * win(T, BO + 26.0, BO + 31.7, 0.25);
  if (ka > 0) {
    const kx = RX + 24, ky = RY + 24, kw = 470, kh = 170;
    ctx.save();
    ctx.globalAlpha = ka;
    roundRect(kx, ky, kw, kh, 12);
    ctx.fillStyle = "rgba(8,10,20,.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(125,227,255,.35)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    const lines = [
      [["setInterval", "#82aaff"], ["(() => {", "#e6edf3"]],
      [["  hunger ", "#e6edf3"], ["-= ", "#c792ea"], ["1", "#f78c6c"]],
      [["}, ", "#e6edf3"], ["60_000", "#f78c6c"], [")", "#e6edf3"]],
    ];
    const total = lines.flat().reduce((n, [s]) => n + s.length, 0);
    let left = Math.floor(total * prog(T, BO + 26.3, BO + 27.9));
    ctx.save();
    ctx.globalAlpha = ka;
    ctx.font = `400 26px "JetBrains Mono"`;
    ctx.textBaseline = "middle";
    lines.forEach((ln, i) => {
      let x = kx + 26;
      for (const [s, col] of ln) {
        const part = s.slice(0, Math.max(0, left));
        left -= s.length;
        ctx.fillStyle = col; ctx.fillText(part, x, ky + 42 + i * 44);
        x += ctx.measureText(s).width;
      }
    });
    ctx.restore();
  }
}

function endCard(T) {
  const a = win(T, BO + 40.9, DURATION + 1, 0.4);
  if (a <= 0) return;
  text("ОСТАЛОСЬ", 760, 360, { size: 26, family: "JetBrains Mono", weight: 700, color: "rgba(125,227,255,.75)", alpha: a, spacing: 8, glow: null });
  text(fmt(END_SECS), 760, 500, { size: 160, color: "#d9f7ff", alpha: a, blur: 50, scale: 1 + 0.06 * (1 - easeOut(prog(T, BO + 40.9, BO + 41.3))) });
  const b = a * easeOut(prog(T, BO + 41.6, BO + 42.0));
  text("СЕРИЯ 2", 760, 680, { size: 26, family: "JetBrains Mono", weight: 700, color: CYAN, alpha: b, spacing: 8, blur: 12 });
  text("ОНЛАЙН", 760, 760, { size: 84, alpha: b, blur: 36 });
}

// ── Кадр ────────────────────────────────────────────────────────────
function renderAt(T) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  background(T);
  const pch = punch(T);
  drawHost(T, pch);
  ctx.save();
  if (pch > 0) { ctx.translate(W / 2, H / 2); ctx.scale(1 + pch, 1 + pch); ctx.translate(-W / 2, -H / 2); }
  bigTimer(T);
  introBitik(T);
  teaserCard(T);
  equation(T);
  titleCard(T);
  sceneSprite(T);
  sceneSprout(T);
  sceneRoom(T);
  endCard(T);
  captions(T);
  ctx.restore();
  hud(T);
  vignette();
  // затемнения в начале, на стыке частей и в конце
  const dip = Math.max(1 - clamp(T / 0.6), win(T, BO - 0.45, BO + 0.15, 0.3), clamp((T - (DURATION - 0.6)) / 0.6));
  if (dip > 0) { ctx.fillStyle = `rgba(0,0,0,${dip})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

window.renderAt = renderAt;

async function init() {
  const fonts = [
    ["Unbounded", "../../site/fonts/unbounded-cyrillic-900-normal.woff2", "900"],
    ["Unbounded", "../../site/fonts/unbounded-latin-900-normal.woff2", "900"],
    ["Unbounded", "../../site/fonts/unbounded-cyrillic-700-normal.woff2", "700"],
    ["Unbounded", "../../site/fonts/unbounded-latin-700-normal.woff2", "700"],
    ["JetBrains Mono", "../../site/fonts/jetbrains-mono-cyrillic-400-normal.woff2", "400"],
    ["JetBrains Mono", "../../site/fonts/jetbrains-mono-latin-400-normal.woff2", "400"],
    ["JetBrains Mono", "../../site/fonts/jetbrains-mono-cyrillic-700-normal.woff2", "700"],
    ["JetBrains Mono", "../../site/fonts/jetbrains-mono-latin-700-normal.woff2", "700"],
  ];
  await Promise.all(fonts.map(async ([fam, url, weight]) => {
    const f = new FontFace(fam, `url(${url})`, { weight });
    await f.load();
    document.fonts.add(f);
  }));
  const img = new Image();
  img.src = "assets/host.jpg";
  await img.decode().then(() => { host = prepareHost(img); }).catch(() => {});
  const q = new URLSearchParams(location.search);
  if (q.has("t")) renderAt(parseFloat(q.get("t")));
  else {
    const start = performance.now();
    const loop = () => { renderAt(((performance.now() - start) / 1000) % DURATION); requestAnimationFrame(loop); };
    if (!q.has("static")) requestAnimationFrame(loop);
  }
  window.READY = true;
}
init();
