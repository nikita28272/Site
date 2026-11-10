import { BITIK_X, BITIK_Y, FOOD_W, drawRoom, drawSprite, drawFood } from "./bitik.js";
import { fetchState, fetchEvents, feed, hungerNow, serverNow, joinPresence } from "./net.js";

// Серия 2: Битик один на всех. Сытость хранится в Supabase, голод (−1%/мин) считает каждый браузер сам.
const POLL_MS = 5000;
const HAPPY_MS = 2500;

const canvas = document.getElementById("room");
const ctx = canvas.getContext("2d");
const bar = document.getElementById("hungerBar");
const value = document.getElementById("hungerValue");
const statusEl = document.getElementById("status");
const feedBtn = document.getElementById("feed");
const onlineEl = document.getElementById("online");
const feedList = document.getElementById("feedList");
const totalEl = document.getElementById("total");

function storage(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function store(key, v) { try { localStorage.setItem(key, v); } catch {} }

let clientId = storage("bitik-client", null);
if (!clientId) { clientId = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()); store("bitik-client", clientId); }

let state = null;            // { hunger, updatedAt, feedsTotal }
let events = [];
let online = null;
let offline = false;
let cooldownUntil = Number(storage("bitik-cooldown", 0));
let happyUntil = 0;
let pending = false;
const foods = [];
const hearts = [];

async function refresh() {
  try {
    const [s, e] = await Promise.all([fetchState(), fetchEvents()]);
    if (!pending) state = s;
    events = e;
    offline = false;
  } catch {
    offline = true;
  }
}

function mood(now) {
  if (now < happyUntil) return "happy";
  if (!state) return "normal";
  const h = hungerNow(state);
  if (h <= 0) return "sad";
  if (h < 35) return "hungry";
  return "normal";
}

const STATUS = {
  happy: "Ням! Битик счастлив",
  normal: "Битик ждёт гостей",
  hungry: "Битик голоден… урчит живот",
  sad: "Битику грустно. Про него забыли",
};

const ago = t => {
  const s = Math.max(0, Math.round((serverNow() - t) / 1000));
  if (s < 60) return "только что";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} мин назад`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} ч назад` : `${Math.round(h / 24)} д назад`;
};
const fmtWait = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

let lastListHtml = "";
function updateUI(m) {
  const h = state ? Math.round(hungerNow(state)) : null;
  bar.style.width = (h ?? 0) + "%";
  bar.classList.toggle("low", h !== null && h < 35 && h > 0);
  bar.classList.toggle("empty", h === 0);
  value.textContent = h === null ? "…" : h + "%";
  statusEl.textContent = offline ? "Нет связи с Битиком. Пробую ещё раз…" : STATUS[m];

  const wait = cooldownUntil - Date.now();
  feedBtn.disabled = pending || foods.length > 0 || wait > 0 || !state;
  feedBtn.textContent = wait > 0 ? `Через ${fmtWait(wait)}` : "Покормить";

  onlineEl.textContent = online === null ? "" : online <= 1 ? "Сейчас с Битиком только ты" : `Сейчас с Битиком: ${online}`;
  totalEl.textContent = state ? `Покормили всего: ${state.feedsTotal}` : "";

  const html = events.length
    ? events.map(e => `<li>🍎 Кто-то покормил Битика <span>${ago(e.at)}</span></li>`).join("")
    : "<li>Пока никто не кормил. Будь первым!</li>";
  if (html !== lastListHtml) { feedList.innerHTML = html; lastListHtml = html; }
}

feedBtn.addEventListener("click", async () => {
  if (feedBtn.disabled) return;
  pending = true;
  updateUI(mood(Date.now()));
  try {
    const res = await feed(clientId);
    if (res.ok) {
      foods.push({ x: BITIK_X + 5, y: -FOOD_W, vy: 0, newHunger: res.hunger, total: res.feeds_total });
      cooldownUntil = Date.now() + 3 * 60 * 1000;
    } else if (res.wait) {
      cooldownUntil = Date.now() + res.wait * 1000;
    }
    store("bitik-cooldown", String(cooldownUntil));
  } catch {
    offline = true;
  }
  pending = false;
});

function eat(f) {
  state = { hunger: f.newHunger, updatedAt: serverNow(), feedsTotal: f.total ?? (state?.feedsTotal ?? 0) };
  happyUntil = Date.now() + HAPPY_MS;
  for (let i = 0; i < 4; i++) hearts.push({ x: BITIK_X + 2 + i * 3.5, y: BITIK_Y + 2, vy: -(6 + i * 2), life: 1.2 });
  refresh();
}

function drawHeart(x, y) {
  ctx.fillStyle = "#f29bb8";
  for (const [dx, dy] of [[0,0],[2,0],[0,1],[1,1],[2,1],[1,2]]) ctx.fillRect(Math.round(x) + dx, Math.round(y) + dy, 1, 1);
}

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  const now = Date.now();

  for (let i = foods.length - 1; i >= 0; i--) {
    const f = foods[i];
    f.vy += 140 * dt; f.y += f.vy * dt;
    if (f.y >= BITIK_Y + 1) { foods.splice(i, 1); eat(f); }
  }
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i]; h.y += h.vy * dt; h.life -= dt;
    if (h.life <= 0) hearts.splice(i, 1);
  }

  const m = mood(now);
  const sec = t / 1000;
  const bob = m === "sad" ? 0 : (Math.floor(sec * (m === "happy" ? 4 : 2)) % 2 ? -1 : 0);
  drawRoom(ctx, { t: sec });
  ctx.fillStyle = "rgba(0,0,0,.35)";
  ctx.fillRect(BITIK_X + 3, BITIK_Y + 16, 10, 1);
  drawSprite(ctx, m, BITIK_X, BITIK_Y + bob, { blink: (sec % 3.7) < 0.14 });
  for (const f of foods) drawFood(ctx, f.x, f.y);
  for (const h of hearts) drawHeart(h.x, h.y);

  updateUI(m);
  requestAnimationFrame(frame);
}

refresh();
setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
joinPresence(clientId, n => { online = n; });
requestAnimationFrame(frame);
