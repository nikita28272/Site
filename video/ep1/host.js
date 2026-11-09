// Ведущий: позы из листа персонажа, появление по таймлайну и липсинк по озвучке.
const D2R = Math.PI / 180;

// Координаты — в пикселях исходных картинок (лист 1254×1254 и аватар 1254×1254).
// anchor — центр лица, mouth — линия рта (центр, ширина, наклон, изгиб).
export const POSES = {
  A:  { src: "sheet",  crop: [0, 0, 700, 640],     anchor: [380, 260],  mouth: { x: 390, y: 343, w: 47, a: 0,        arc: -3 } },
  B:  { src: "sheet",  crop: [705, 0, 1254, 640],  anchor: [1000, 250], mouth: { x: 1103, y: 284, w: 28, a: -16 * D2R, arc: -1 } },
  C:  { src: "sheet",  crop: [0, 650, 470, 1254],  anchor: [250, 920],  mouth: { x: 265, y: 1006, w: 33, a: 0,       arc: 0 } },
  D:  { src: "sheet",  crop: [445, 650, 885, 1254], anchor: [650, 880], mouth: { x: 650, y: 934, w: 38, a: -13 * D2R, arc: -1 } },
  E:  { src: "sheet",  crop: [885, 650, 1254, 1254], anchor: [1080, 820], mouth: null },
  AV: { src: "avatar", crop: [0, 0, 1254, 1254],   anchor: [700, 500],  mouth: { x: 720, y: 614, w: 68, a: 8 * D2R,  arc: 0 } },
};

const sources = {};
const cache = {};

function feathered(img, [x0, y0, x1, y1], round) {
  const w = x1 - x0, h = y1 - y0;
  const c = new OffscreenCanvas(w, h);
  const g = c.getContext("2d");
  g.drawImage(img, x0, y0, w, h, 0, 0, w, h);
  g.globalCompositeOperation = "destination-in";
  if (round) {
    const r = g.createRadialGradient(w / 2, h / 2, w * 0.40, w / 2, h / 2, w * 0.5);
    r.addColorStop(0, "rgba(0,0,0,1)"); r.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  } else {
    const f = 70;
    const lx = g.createLinearGradient(0, 0, w, 0);
    lx.addColorStop(0, "rgba(0,0,0,0)"); lx.addColorStop(f / w, "rgba(0,0,0,1)");
    lx.addColorStop(1 - f / w, "rgba(0,0,0,1)"); lx.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = lx; g.fillRect(0, 0, w, h);
    const ty = g.createLinearGradient(0, 0, 0, h);
    ty.addColorStop(0, "rgba(0,0,0,0)"); ty.addColorStop(40 / h, "rgba(0,0,0,1)"); ty.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = ty; g.fillRect(0, 0, w, h);
  }
  return c;
}

export async function loadHost(sheetUrl, avatarUrl) {
  const load = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  sources.sheet = await load(sheetUrl);
  sources.avatar = await load(avatarUrl);
  for (const [k, p] of Object.entries(POSES)) cache[k] = feathered(sources[p.src], p.crop, k === "AV");
}

// Рот: 0 — закрыт (исходная линия), 1 — приоткрыт, 2 — открыт.
function drawMouth(ctx, m, level) {
  if (level <= 0) return;
  const hw = m.w * (level === 2 ? 0.40 : 0.44);
  const depth = m.w * (level === 2 ? 0.42 : 0.2);
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.a);
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.quadraticCurveTo(0, m.arc * 2, hw, 0);
  ctx.quadraticCurveTo(hw * 0.7, depth * 1.35, 0, depth * 1.35);
  ctx.quadraticCurveTo(-hw * 0.7, depth * 1.35, -hw, 0);
  ctx.closePath();
  ctx.fillStyle = "#2a0d12";
  ctx.fill();
  if (level === 2) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#7a2a35";
    ctx.beginPath();
    ctx.ellipse(0, depth * 1.35, hw * 0.6, depth * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = "#160609";
  ctx.lineWidth = Math.max(1.6, m.w * 0.05);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

// Рисует позу так, чтобы низ кадра позы стоял на нижнем краю экрана, а лицо было на screenX.
export function drawPose(ctx, key, { screenX, scale, alpha = 1, dx = 0, dy = 0, mouth = 0, bottom = 1085 }) {
  const p = POSES[key];
  const img = cache[key];
  if (!img || alpha <= 0) return;
  const [x0, y0, x1, y1] = p.crop;
  const left = screenX - (p.anchor[0] - x0) * scale + dx;
  const top = (key === "AV" ? 540 - (p.anchor[1] - y0) * scale : bottom - (y1 - y0) * scale) + dy;
  ctx.save();
  ctx.globalAlpha = alpha;
  // красная подсветка сзади
  const gx = left + (p.anchor[0] - x0) * scale, gy = top + (p.anchor[1] - y0) * scale;
  const glow = ctx.createRadialGradient(gx, gy, 40 * scale, gx, gy, 420 * scale);
  glow.addColorStop(0, "rgba(170,15,35,.30)");
  glow.addColorStop(1, "rgba(170,15,35,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(gx - 450 * scale, gy - 450 * scale, 900 * scale, 900 * scale);
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  if (p.mouth && mouth > 0) {
    ctx.translate(-x0, -y0);
    drawMouth(ctx, p.mouth, mouth);
  }
  ctx.restore();
}
