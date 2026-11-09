# Битик — питомец интернета

Сайт, на котором живёт одно существо на всех, и YouTube-сериал о том, как он создаётся.

- `CONCEPT.md` — замысел, существо, механики
- `EPISODES.md` — план 4 серий и сценарий серии 1
- `site/` — сам сайт (открыть через любой статический сервер: `python3 -m http.server`, затем `/site/`)
- `video/` — сцены серий и рендер в MP4

## Рендер серии

Нужны Node.js, Playwright (Chromium) и ffmpeg.

```bash
# ведущий: video/ep1/assets/host_sheet.png (5 поз) и host_avatar.png; липсинк: python3 video/lipsync.py vo_intro.mp3 vo_build.mp3 > lipsync.json
node video/render.js ep1                  # полный рендер → video/ep1/out/ep1.mp4
node video/render.js ep1 --stills 5,40,70 # отдельные кадры для проверки
```

Сцену можно посмотреть вживую в браузере: `/video/ep1/index.html` (или `?t=40` — один кадр).
Озвучка — ElevenLabs, голос Egor (`video/ep1/assets/vo_*.mp3`), эффекты — `video/ep1/sfx.json`.
