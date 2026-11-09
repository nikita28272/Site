import {
  ROOM_W, ROOM_H, BITIK_X, BITIK_Y, FOOD_W,
  drawRoom, drawSprite, drawFood,
} from "./bitik.js";

// Серия 1: всё живёт в браузере (localStorage). В серии 2 состояние переедет на сервер и станет общим.
const STORAGE_KEY = "bitik-state-v1";
const DECAY_MS = 60_000;      // −1% сытости каждую минуту: от 100 до 0 за 100 минут
const FEED_AMOUNT = 15;
const HAPPY_MS = 2500;

const canvas = document.getElementById("room");
const ctx = canvas.getContext("2d");
const bar = document.getElementById("hungerBar");
const value = document.getElementById("hungerValue");
const statusEl = document.getElementById("status");
const feedBtn = document.getElementById("feed");

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s && typeof s.hunger === "number") return s;
  } catch {}
  return { hunger: 100, updatedAt: Date.now() };
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

const state = load();
let happyUntil = 0;
const foods = [];
const hearts = [];

function tickHunger(now) {
  const steps = Math.floor((now - state.updatedAt) / DECAY_MS);
  if (steps > 0) {
    state.hunger = Math.max(0, state.hunger - steps);
    state.updatedAt += steps * DECAY_MS;
    save();
  }
}

function mood(now) {
  if (now < happyUntil) return "happy";
  if (state.hunger <= 0) return "sad";
  if (state.hunger < 35) return "hungry";
  return "normal";
}

const STATUS = {
  happy: "Ням! Битик счастлив",
  normal: "Битик ждёт гостей",
  hungry: "Битик голоден… урчит живот",
  sad: "Битику грустно. Про него забыли",
};

function updateUI(m) {
  const h = Math.round(state.hunger);
  bar.style.width = h + "%";
  bar.classList.toggle("low", h < 35 && h > 0);
  bar.classList.toggle("empty", h === 0);
  value.textContent = h + "%";
  statusEl.textContent = STATUS[m];
  feedBtn.disabled = foods.length > 0;
}

feedBtn.addEventListener("click", () => {
  if (foods.length) return;
  foods.push({ x: BITIK_X + 5, y: -FOOD_W, vy: 0 });
  updateUI(mood(Date.now()));
});

function eat(now) {
  state.hunger = Math.min(100, state.hunger + FEED_AMOUNT);
  state.updatedAt = now;
  save();
  happyUntil = now + HAPPY_MS;
  for (let i = 0; i < 4; i++) {
    hearts.push({ x: BITIK_X + 2 + i * 3.5, y: BITIK_Y + 2, vy: -(6 + i * 2), life: 1.2 });
  }
}

function drawHeart(x, y) {
  ctx.fillStyle = "#f29bb8";
  const px = [[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]];
  for (const [dx, dy] of px) ctx.fillRect(Math.round(x) + dx, Math.round(y) + dy, 1, 1);
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  const now = Date.now();
  tickHunger(now);

  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    f.vy += 140 * dt;
    f.y += f.vy * dt;
    if (f.y >= BITIK_Y + 1) { foods.splice(i, 1); eat(now); }
  }
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i];
    h.y += h.vy * dt;
    h.life -= dt;
    if (h.life <= 0) hearts.splice(i, 1);
  }

  const m = mood(now);
  const sec = t / 1000;
  const bob = m === "sad" ? 0 : (Math.floor(sec * (m === "happy" ? 4 : 2)) % 2 ? -1 : 0);
  const blink = (sec % 3.7) < 0.14;

  drawRoom(ctx, { t: sec });
  // тень
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(BITIK_X + 3, BITIK_Y + 16, 10, 1);
  drawSprite(ctx, m, BITIK_X, BITIK_Y + bob, { blink });
  for (const f of foods) drawFood(ctx, f.x, f.y);
  for (const h of hearts) drawHeart(h.x, h.y);

  updateUI(m);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
