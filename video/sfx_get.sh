#!/usr/bin/env bash
# Скачать звук ElevenLabs и подрезать: убрать тишину в начале, ограничить длину, плавно погасить хвост.
# video/sfx_get.sh <имя> <макс. длина, с> <url>
set -e
D=video/ep1/assets/sfx; mkdir -p $D/raw
[ -n "$3" ] && curl -sS -o "$D/raw/$1.mp3" "$3"
ffmpeg -v error -y -i "$D/raw/$1.mp3" -af "silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:$2,afade=t=out:st=$(awk "BEGIN{print $2*0.7}"):d=$(awk "BEGIN{print $2*0.3}")" -ac 2 -ar 48000 -b:a 160k "$D/$1.mp3"
echo "$1 $(ffprobe -v error -show_entries format=duration -of csv=p=0 $D/$1.mp3)"
