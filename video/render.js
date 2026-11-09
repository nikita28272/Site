// Рендер серии в MP4.
//   node video/render.js ep1                 — полный рендер (1920×1080, 30 fps)
//   node video/render.js ep1 --stills 1,5,9  — только кадры в PNG для проверки
// Нужны: Playwright (Chromium) и ffmpeg. Сцену отдаёт встроенный статический сервер.
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const ep = process.argv[2] || "ep1";
const stillsArg = process.argv.indexOf("--stills");
const FPS = Number(process.env.FPS || 30);
const outDir = path.join(__dirname, ep, "out");
fs.mkdirSync(outDir, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png" };
function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { "content-type": TYPES[path.extname(p)] || "application/octet-stream" });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(srv));
  });
}

(async () => {
  const srv = await serve();
  const url = `http://localhost:${srv.address().port}/video/${ep}/index.html?static`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", e => console.error("pageerror:", e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.READY === true);
  const duration = await page.evaluate(() => window.DURATION);
  const audio = await page.evaluate(() => window.AUDIO);

  const grab = t => page.evaluate(t => {
    window.renderAt(t);
    return document.getElementById("c").toDataURL("image/jpeg", 0.93).split(",")[1];
  }, t);

  if (stillsArg > 0) {
    for (const t of process.argv[stillsArg + 1].split(",").map(Number)) {
      const b64 = await page.evaluate(t => { window.renderAt(t); return document.getElementById("c").toDataURL("image/png").split(",")[1]; }, t);
      const f = path.join(outDir, `still_${t.toFixed(2)}.png`);
      fs.writeFileSync(f, Buffer.from(b64, "base64"));
      console.log(f);
    }
    await browser.close(); srv.close();
    return;
  }

  const silent = path.join(outDir, "video_silent.mp4");
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", silent], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.ceil(duration * FPS);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const buf = Buffer.from(await grab(i / FPS), "base64");
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % (FPS * 5) === 0) console.log(`кадр ${i}/${frames} (${((Date.now() - t0) / 1000).toFixed(0)} с)`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  await browser.close(); srv.close();

  // звук: озвучка + лёгкие эффекты
  const A = path.join(__dirname, ep, "assets");
  const sfx = path.join(__dirname, ep, "sfx.json");
  const cues = fs.existsSync(sfx) ? JSON.parse(fs.readFileSync(sfx, "utf8")) : [];
  const inputs = ["-i", silent, "-i", path.join(A, "vo_intro.mp3"), "-i", path.join(A, "vo_build.mp3")];
  const filters = [
    `[1:a]adelay=${Math.round(audio.IO * 1000)}|${Math.round(audio.IO * 1000)},volume=1.0[v1]`,
    `[2:a]adelay=${Math.round(audio.BO * 1000)}|${Math.round(audio.BO * 1000)},volume=1.0[v2]`,
  ];
  const mixIn = ["[v1]", "[v2]"];
  cues.forEach((c, i) => {
    inputs.push("-f", "lavfi", "-i", c.src);
    const ms = Math.round(c.t * 1000);
    filters.push(`[${3 + i}:a]aformat=channel_layouts=mono,adelay=${ms}|${ms},volume=${c.vol ?? 0.3}[s${i}]`);
    mixIn.push(`[s${i}]`);
  });
  filters.push(`${mixIn.join("")}amix=inputs=${mixIn.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  const final = path.join(outDir, `${ep}.mp4`);
  await new Promise((res, rej) => {
    const p = spawn("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", filters.join(";"),
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(duration), final], { stdio: "inherit" });
    p.on("close", c => (c === 0 ? res() : rej(new Error("ffmpeg mux " + c))));
  });
  console.log("готово:", final);
})();
