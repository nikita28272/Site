"""Разметка озвучки: для каждого блока из script.json находит начало и конец каждой фразы.
Берём N−1 самых длинных пауз внутри блока (N — число фраз) — это границы между фразами.
python3 -I video/align.py video/ep1 > video/ep1/timings.json
"""
import json, re, subprocess, sys
from pathlib import Path

ep = Path(sys.argv[1])
script = json.loads((ep / "script.json").read_text())


def silences(path):
    out = subprocess.run(["ffmpeg", "-i", str(path), "-af", "silencedetect=noise=-35dB:d=0.12", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", out)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", out)]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True).stdout)
    return list(zip(starts, ends)), dur


def from_words(words, n):
    """Границы фраз по тегам пауз в выравнивании ElevenLabs."""
    phrases, cur = [], []
    for w in words:
        t = w["text"]
        if t in ("[pause]", "[short", "[long"):
            if cur: phrases.append(cur); cur = []
            continue
        if t.startswith("[") or t.endswith("]"):
            continue
        cur.append(w)
    if cur: phrases.append(cur)
    if len(phrases) != n:
        return None
    return [(ph[0]["start"], ph[-1]["end"]) for ph in phrases]


result = {}
for b in script["blocks"]:
    path = ep / "assets" / "vo" / f"{b['id']}.mp3"
    if not path.exists():
        continue
    wpath = ep / "assets" / "words" / f"{b['id']}.json"
    if wpath.exists():
        _, dur = silences(path)
        spans = from_words(json.loads(wpath.read_text())["words"], len(b["phrases"]))
        if spans:
            result[b["id"]] = {"duration": round(dur, 3), "source": "words",
                               "phrases": [{"t0": round(a, 3), "t1": round(z, 3), "cap": p["cap"]} for (a, z), p in zip(spans, b["phrases"])]}
            continue
        print(f"! {b['id']}: не совпало число фраз по словам", file=sys.stderr)
    sil, dur = silences(path)
    # тишина в начале и в конце — не граница
    speech_start = sil[0][1] if sil and sil[0][0] < 0.05 else 0.0
    speech_end = sil[-1][0] if sil and sil[-1][1] > dur - 0.05 else dur
    inner = [s for s in sil if s[0] > speech_start + 0.05 and s[1] < speech_end - 0.05]
    n = len(b["phrases"])
    cuts = sorted(sorted(inner, key=lambda s: s[1] - s[0], reverse=True)[: n - 1])
    starts = [speech_start] + [c[1] for c in cuts]
    ends = [c[0] for c in cuts] + [speech_end]
    if len(starts) != n:
        print(f"! {b['id']}: найдено {len(starts)} фраз из {n}", file=sys.stderr)
    result[b["id"]] = {
        "duration": round(dur, 3), "source": "silence",
        "phrases": [{"t0": round(s, 3), "t1": round(e, 3), "cap": p["cap"]} for s, e, p in zip(starts, ends, b["phrases"])],
    }
json.dump(result, sys.stdout, ensure_ascii=False, indent=1)
