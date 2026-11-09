"""Дорожка липсинка: уровень открытия рта (0/1/2) на каждый кадр по громкости озвучки.
python3 video/lipsync.py video/ep1/assets/vo_intro.mp3 video/ep1/assets/vo_build.mp3 > video/ep1/lipsync.json
"""
import json, math, subprocess, sys, array

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
    for i, r in enumerate(rms):
        v = r / ref
        lvl = 2 if v > 0.55 else 1 if v > 0.16 else 0
        # анимешная «флапалка»: на длинных гласных чередуем 1 и 2, держим каждую фазу ≥2 кадров
        if lvl == 2 and prev == 2 and hold >= 3:
            lvl = 1
        if lvl != prev and hold < 2:
            lvl = prev
        hold = hold + 1 if lvl == prev else 1
        out.append(lvl)
        prev = lvl
    return out

intro, build = (levels(p) for p in sys.argv[1:3])
json.dump({"fps": FPS, "intro": "".join(map(str, intro)), "build": "".join(map(str, build))}, sys.stdout)
