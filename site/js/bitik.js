// Битик: спрайты, еда и комната. Всё рисуется в низком разрешении (1 единица = 1 пиксель арта),
// а потом масштабируется с image-rendering: pixelated.

export const SPRITE_W = 16;
export const SPRITE_H = 17;
export const ROOM_W = 128;
export const ROOM_H = 72;
export const FLOOR_Y = 54;

// Легенда: O контур, B тело, L блик, E глаз, W блик в глазу, C щёчки,
// M рот, S стебель ростка, G листья, F лапки, T слеза
const BASE = [
  "......GG.GG.....",
  ".......GSG......",
  "........S.......",
  "........S.......",
  ".....OOOOOO.....",
  "...OOBBBBBBOO...",
  "..OBBLLBBBBBBO..",
  "..OBLLBBBBBBBO..",
  ".OBBBBBBBBBBBBO.",
  ".OBBWEBBBBWEBBO.",
  ".OBBEEBBBBEEBBO.",
  ".OBCCBBMMBBCCBO.",
  ".OBBBBBBBBBBBBO.",
  "..OBBBBBBBBBBO..",
  "..OBBBBBBBBBBO..",
  "...OOBBBBBBOO...",
  "....OFFOOFFO....",
];

export const PALETTES = {
  normal: { O:"#2b1d3a", B:"#9b7ed9", L:"#c9b6f2", E:"#1a1026", W:"#ffffff", C:"#f29bb8", M:"#5a2a4a", S:"#3f8f4a", G:"#6fd36b", F:"#6a4fa3", T:"#7fd0ff" },
  sad:    { O:"#232634", B:"#7d86a8", L:"#a9b0cc", E:"#151826", W:"#dfe4f5", C:"#9aa2c0", M:"#3a3f55", S:"#4f6b52", G:"#7f9a7d", F:"#5c6488", T:"#7fd0ff" },
  night:  { O:"#1b1430", B:"#6e5aa8", L:"#8f7cc8", E:"#120c20", W:"#ffffff", C:"#b07a9a", M:"#3d2246", S:"#3a7a6a", G:"#8ff7d0", F:"#4b3c80", T:"#7fd0ff" },
};

const row = s => s.split("");
const set = (g, x, y, ch) => { g[y][x] = ch; };

function closeEyes(g) {
  for (const [x, y] of [[4,9],[5,9],[10,9],[11,9]]) set(g, x, y, "B");
  for (const [x, y] of [[4,10],[5,10],[10,10],[11,10]]) set(g, x, y, "E");
}

const MOODS = {
  normal: { pal: "normal", edit() {} },
  happy: { pal: "normal", edit(g) {
    for (const [x, y] of [[4,9],[5,9],[4,10],[5,10],[10,9],[11,9],[10,10],[11,10]]) set(g, x, y, "B");
    set(g,4,9,"E"); set(g,3,10,"E"); set(g,5,10,"E");
    set(g,11,9,"E"); set(g,10,10,"E"); set(g,12,10,"E");
    set(g,7,12,"M"); set(g,8,12,"M");
    g[0] = row(".....GGG.GGG....");
  }},
  sad: { pal: "sad", edit(g) {
    g[0] = row("................");
    g[1] = row("................");
    g[2] = row("........SSG.....");
    g[3] = row("........S..GG...");
    set(g,5,11,"T"); set(g,4,11,"B");
    set(g,7,11,"B"); set(g,8,11,"B");
    set(g,7,12,"M"); set(g,8,12,"M"); set(g,6,13,"M"); set(g,9,13,"M");
  }},
  hungry: { pal: "normal", edit(g) {
    set(g,7,11,"M"); set(g,8,11,"M"); set(g,7,12,"M"); set(g,8,12,"M");
    g[0] = row(".......GG.GG....");
    g[1] = row("........GSG.....");
  }},
  sleep: { pal: "night", edit(g) {
    closeEyes(g);
    set(g,8,11,"B");
  }},
};

export const MOOD_NAMES = Object.keys(MOODS);

export function spriteGrid(mood = "normal", { blink = false } = {}) {
  const m = MOODS[mood] || MOODS.normal;
  const g = BASE.map(row);
  m.edit(g);
  if (blink && mood !== "sleep" && mood !== "happy") closeEyes(g);
  return { grid: g, pal: PALETTES[m.pal] };
}

// Рисует Битика; (x, y) — левый верхний угол в пикселях арта.
// limit — сколько непрозрачных пикселей нарисовать (для сцены «сборки» в видео).
export function drawSprite(ctx, mood, x, y, { blink = false, limit = Infinity, palette } = {}) {
  const { grid, pal } = spriteGrid(mood, { blink });
  const colors = palette || pal;
  let n = 0;
  for (let gy = 0; gy < SPRITE_H; gy++) {
    for (let gx = 0; gx < SPRITE_W; gx++) {
      const ch = grid[gy][gx];
      if (ch === ".") continue;
      if (n++ >= limit) return;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(x + gx, y + gy, 1, 1);
    }
  }
}

export function countPixels(mood = "normal") {
  return spriteGrid(mood).grid.flat().filter(c => c !== ".").length;
}

// Еда — маленькое пиксельное яблоко.
const FOOD = [
  "...G.",
  "..SG.",
  ".RRRR",
  "RRhRRR",
  "RRRRRR",
  "RRRRRR",
  ".RRRR.",
];
const FOOD_PAL = { R:"#e2445c", h:"#ffb3be", S:"#5a3a22", G:"#6fd36b" };
export const FOOD_W = 6;
export const FOOD_H = 7;

export function drawFood(ctx, x, y) {
  FOOD.forEach((r, fy) => [...r].forEach((ch, fx) => {
    if (ch === ".") return;
    ctx.fillStyle = FOOD_PAL[ch];
    ctx.fillRect(Math.round(x) + fx, Math.round(y) + fy, 1, 1);
  }));
}

// Комната. wall / floor / light — от 0 до 1, чтобы в видео комнату можно было «строить» по частям.
export function drawRoom(ctx, { wall = 1, floor = 1, light = 1, t = 0 } = {}) {
  ctx.fillStyle = "#0b0812";
  ctx.fillRect(0, 0, ROOM_W, ROOM_H);

  ctx.save();
  ctx.globalAlpha = wall;
  ctx.fillStyle = "#1d1530";
  ctx.fillRect(0, 0, ROOM_W, FLOOR_Y);
  ctx.fillStyle = "#221a38";
  for (let x = 2; x < ROOM_W; x += 8) ctx.fillRect(x, 0, 2, FLOOR_Y);
  // плинтус
  ctx.fillStyle = "#2e2346";
  ctx.fillRect(0, FLOOR_Y - 2, ROOM_W, 2);
  // окно с ночным небом
  ctx.fillStyle = "#3a2d4f";
  ctx.fillRect(12, 12, 24, 22);
  ctx.fillStyle = "#101a3d";
  ctx.fillRect(14, 14, 20, 18);
  ctx.fillStyle = "#3a2d4f";
  ctx.fillRect(23, 14, 2, 18);
  ctx.fillRect(14, 22, 20, 2);
  ctx.fillStyle = "#cfd8ff";
  for (const [sx, sy, ph] of [[16,16,0],[20,19,1.3],[29,17,2.1],[31,27,.7],[17,28,1.8]]) {
    if (Math.sin(t * 2 + ph) > -0.3) ctx.fillRect(sx, sy, 1, 1);
  }
  ctx.fillStyle = "#f3e6b0";
  ctx.fillRect(28, 25, 3, 3);
  // полка с горшком
  ctx.fillStyle = "#3b2a22";
  ctx.fillRect(92, 26, 22, 2);
  ctx.fillStyle = "#6fd36b";
  ctx.fillRect(98, 19, 2, 3); ctx.fillRect(101, 18, 2, 4); ctx.fillRect(96, 20, 2, 2);
  ctx.fillStyle = "#b5654a";
  ctx.fillRect(97, 22, 7, 4);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = floor;
  ctx.fillStyle = "#3b2a22";
  ctx.fillRect(0, FLOOR_Y, ROOM_W, ROOM_H - FLOOR_Y);
  ctx.fillStyle = "#2c1f19";
  for (let y = FLOOR_Y + 4, i = 0; y < ROOM_H; y += 5, i++) {
    ctx.fillRect(0, y, ROOM_W, 1);
    for (let x = (i % 2) * 11; x < ROOM_W; x += 22) ctx.fillRect(x, y - 4, 1, 4);
  }
  ctx.fillStyle = "#4a3529";
  ctx.fillRect(0, FLOOR_Y, ROOM_W, 1);
  ctx.restore();

  if (light > 0) {
    ctx.save();
    ctx.globalAlpha = light;
    // провод и абажур
    ctx.fillStyle = "#2e2346";
    ctx.fillRect(63, 0, 1, 9);
    ctx.fillStyle = "#e8c46a";
    ctx.fillRect(60, 9, 8, 2);
    ctx.fillRect(58, 11, 12, 3);
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(62, 14, 4, 1);
    // конус света
    const grad = ctx.createLinearGradient(0, 14, 0, FLOOR_Y + 8);
    grad.addColorStop(0, "rgba(255,226,150,0.22)");
    grad.addColorStop(1, "rgba(255,226,150,0.06)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(58, 14); ctx.lineTo(70, 14);
    ctx.lineTo(98, FLOOR_Y + 8); ctx.lineTo(30, FLOOR_Y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// Битик стоит на полу по центру комнаты.
export const BITIK_X = 56;
export const BITIK_Y = FLOOR_Y - SPRITE_H + 3;
