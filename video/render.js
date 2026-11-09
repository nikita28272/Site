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
const SFX_GAIN = Number(process.env.SFX_GAIN || 0.35); // общая громкость эффектов относительно голоса
const outDir = path.join(__dirname, ep, "out");
fs.mkdirSync(outDir, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".mp3": "audio/mpeg", ".woff2": "font/woff2", ".jpg": "image/jpeg", ".png": "image/png" };
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
  const tracks = await page.evaluate(() => window.AUDIO_TRACKS || []);
  const sfxCues = await page.evaluate(() => window.SFX_CUES || []);

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

  // звук: озвучка по дорожкам, музыка с приглушением под голос, эффекты
  const D = path.join(__dirname, ep);
  const inputs = ["-i", silent];
  const voice = [], fx = [];
  let n = 1;
  for (const tr of tracks) {
    inputs.push("-i", path.join(D, tr.file));
    const ms = Math.round(tr.t * 1000);
    voice.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms}|${ms}[v${n}]`);
    n++;
  }
  for (const c of sfxCues) {
    const f = path.join(D, "assets", "sfx", c.name + ".mp3");
    if (!fs.existsSync(f)) continue;
    inputs.push("-i", f);
    const ms = Math.round(c.t * 1000);
    fx.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${(c.vol * SFX_GAIN).toFixed(3)},adelay=${ms}|${ms}[s${n}]`);
    n++;
  }
  const music = path.join(D, "assets", "music.mp3");
  const hasMusic = fs.existsSync(music);
  if (hasMusic) inputs.push("-stream_loop", "-1", "-i", music);
  const vLabels = voice.map(v => v.slice(v.lastIndexOf("[")));
  const fLabels = fx.map(v => v.slice(v.lastIndexOf("[")));
  const filters = [...voice, ...fx];
  filters.push(`${vLabels.join("")}amix=inputs=${vLabels.length}:normalize=0,asplit=2[vo][vokey]`);
  let bed = "[vo]";
  if (fLabels.length) { filters.push(`${fLabels.join("")}amix=inputs=${fLabels.length}:normalize=0[fx]`); }
  if (hasMusic) {
    filters.push(`[${n}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.2,afade=t=in:d=2,afade=t=out:st=${(duration - 3).toFixed(2)}:d=3[mus]`);
    filters.push(`[mus][vokey]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=400[duck]`);
  }
  const mixIn = ["[vo]", ...(fLabels.length ? ["[fx]"] : []), ...(hasMusic ? ["[duck]"] : [])];
  if (!hasMusic) filters[filters.length - (fLabels.length ? 2 : 1)] = filters[filters.length - (fLabels.length ? 2 : 1)].replace(",asplit=2[vo][vokey]", "[vo]");
  filters.push(`${mixIn.join("")}amix=inputs=${mixIn.length}:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  const final = path.join(outDir, `${ep}.mp4`);
  await new Promise((res, rej) => {
    const p = spawn("ffmpeg", ["-y", "-v", "error", ...inputs, "-filter_complex", filters.join(";"),
      "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", String(duration), final], { stdio: "inherit" });
    p.on("close", c => (c === 0 ? res() : rej(new Error("ffmpeg mux " + c))));
  });
  console.log("готово:", final);
})();
