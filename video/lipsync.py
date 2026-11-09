"""Дорожки липсинка: уровень открытия рта (0/1/2) на каждый кадр по громкости озвучки.
python3 -I video/lipsync.py video/ep1/assets/vo_intro.mp3 video/ep1/assets/vo/*.mp3 > video/ep1/lipsync.json
Ключ — имя файла без расширения.
"""
import array, json, math, os, subprocess, sys

FPS = 30
SR = 16000


def levels(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         check=True, capture_output=True).stdout
    a = array.array("h", raw)
    hop = SR // FPS
    rms = []
    for i in range(0, len(a), hop):
        chunk = a[i:i + hop]
        rms.append(math.sqrt(sum(x * x for x in chunk) / max(1, len(chunk))) if chunk else 0.0)
    ref = sorted(rms)[int(len(rms) * 0.95)] or 1.0
    out, prev, hold = [], 0, 0
    for r in rms:
        v = r / ref
        lvl = 2 if v > 0.55 else 1 if v > 0.16 else 0
        # анимешная «флапалка»: на длинных гласных чередуем 1 и 2, каждая фаза держится ≥2 кадров
        if lvl == 2 and prev == 2 and hold >= 3:
            lvl = 1
        if lvl != prev and hold < 2:
            lvl = prev
        hold = hold + 1 if lvl == prev else 1
        out.append(lvl)
        prev = lvl
    return "".join(map(str, out))


json.dump({"fps": FPS, "tracks": {os.path.splitext(os.path.basename(p))[0]: levels(p) for p in sys.argv[1:]}}, sys.stdout)
