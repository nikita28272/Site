// Ведущий: 12 поз из двух листов (PNG с прозрачностью), появление по таймлайну и липсинк по озвучке.
const D2R = Math.PI / 180;

// Лист 1536×1024, сетка 3×2 по 512 px. cell — [лист, столбец, ряд].
// anchor — центр лица, mouth — линия рта (центр, ширина, наклон, изгиб) в пикселях листа.
export const POSES = {
  P1: { cell: [1, 0, 0], anchor: [300, 250], mouth: { x: 297, y: 325, w: 42, a: 0, arc: -2 } },          // анфас
  P2: { cell: [1, 1, 0], anchor: [900, 200], mouth: { x: 923, y: 256, w: 24, a: -16 * D2R, arc: -1 } },  // профиль, взгляд вверх
  P3: { cell: [1, 2, 0], anchor: [1290, 240], mouth: null },                                             // рука у рта — думает
  P4: { cell: [1, 0, 1], anchor: [270, 740], mouth: { x: 255, y: 795, w: 45, a: -12 * D2R, arc: -3 } },  // наклон головы
  P5: { cell: [1, 1, 1], anchor: [790, 780], mouth: { x: 793, y: 871, w: 38, a: -3 * D2R, arc: 0 } },    // глаза закрыты
  P6: { cell: [1, 2, 1], anchor: [1280, 720], mouth: null },                                             // спиной
  Q1: { cell: [2, 0, 0], anchor: [320, 230], mouth: { x: 311, y: 296, w: 45, a: 0, arc: -2 } },          // анфас, прищур
  Q2: { cell: [2, 1, 0], anchor: [900, 180], mouth: { x: 919, y: 239, w: 26, a: -16 * D2R, arc: -1 } },  // профиль
  Q3: { cell: [2, 2, 0], anchor: [1280, 250], mouth: null },                                             // ладонь у лица
  Q4: { cell: [2, 0, 1], anchor: [250, 770], mouth: { x: 247, y: 832, w: 31, a: 0, arc: 0 } },           // исподлобья
  Q5: { cell: [2, 1, 1], anchor: [790, 750], mouth: { x: 778, y: 785, w: 40, a: -23 * D2R, arc: -3 } },  // голова назад, свысока
  Q6: { cell: [2, 2, 1], anchor: [1290, 720], mouth: null },                                             // спиной
};

const sheets = {};
const cache = {};

export async function loadHost(url1, url2) {
  const load = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  sheets[1] = await load(url1);
  sheets[2] = await load(url2);
  for (const [k, p] of Object.entries(POSES)) {
    const [s, c, r] = p.cell;
    const cv = new OffscreenCanvas(512, 512);
    cv.getContext("2d").drawImage(sheets[s], c * 512, r * 512, 512, 512, 0, 0, 512, 512);
    cache[k] = cv;
  }
}

// Рот: 0 — закрыт (исходная линия), 1 — приоткрыт, 2 — открыт.
function drawMouth(ctx, m, level) {
  if (level <= 0) return;
  const hw = m.w * (level === 2 ? 0.40 : 0.44);
  const depth = m.w * (level === 2 ? 0.40 : 0.19);
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
  ctx.lineWidth = Math.max(1.4, m.w * 0.05);
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.restore();
}

// Рисует позу: лицо на screenX, нижний край ячейки — у нижнего края экрана (срез плеч уходит за кадр).
export function drawPose(ctx, key, { screenX, scale, alpha = 1, dx = 0, dy = 0, mouth = 0, bottom = 1092, glow = 1 }) {
  const p = POSES[key];
  const img = cache[key];
  if (!img || alpha <= 0) return;
  const [s, c, r] = p.cell;
  const x0 = c * 512, y0 = r * 512;
  const left = screenX - (p.anchor[0] - x0) * scale + dx;
  const top = bottom - 512 * scale + Math.max(0, dy);
  ctx.save();
  ctx.globalAlpha = alpha;
  // мягкое красное свечение за головой
  if (glow > 0) {
    const gx = left + (p.anchor[0] - x0) * scale, gy = top + (p.anchor[1] - y0) * scale;
    const g = ctx.createRadialGradient(gx, gy, 30 * scale, gx, gy, 330 * scale);
    g.addColorStop(0, `rgba(190,20,40,${0.32 * glow})`);
    g.addColorStop(1, "rgba(190,20,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(gx - 340 * scale, gy - 340 * scale, 680 * scale, 680 * scale);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0);
  if (p.mouth && mouth > 0) {
    ctx.translate(-x0, -y0);
    drawMouth(ctx, p.mouth, mouth);
  }
  ctx.restore();
}

export const POSE_KEYS = Object.keys(POSES);
