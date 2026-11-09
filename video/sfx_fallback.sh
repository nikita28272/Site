#!/usr/bin/env bash
# Простые синтезированные звуки-заглушки для тех эффектов, которых ещё нет из ElevenLabs.
# Существующие файлы не трогает.
set -e
D="${1:-video/ep1/assets/sfx}"; mkdir -p "$D"
mk() { [ -f "$D/$1.mp3" ] || ffmpeg -v error -y -f lavfi -i "$2" -ac 2 -ar 48000 -b:a 160k "$D/$1.mp3"; }
mk tick    "aevalsrc=0.8*sin(2*PI*2200*t)*exp(-120*t)+0.4*sin(2*PI*900*t)*exp(-90*t):d=0.12"
mk click   "aevalsrc=0.9*sin(2*PI*1600*t)*exp(-180*t)+0.3*(random(0)-0.5)*exp(-200*t):d=0.08"
mk pop     "aevalsrc=0.8*sin(2*PI*(500+1500*t)*t)*exp(-25*t):d=0.18"
mk chomp   "aevalsrc=0.7*sin(2*PI*220*t)*exp(-14*t)*(1+0.5*sin(2*PI*30*t))+0.5*sin(2*PI*660*t)*exp(-20*t):d=0.3"
mk chime   "aevalsrc=0.4*sin(2*PI*1046*t)*exp(-3*t)+0.3*sin(2*PI*1568*t)*exp(-4*t)+0.2*sin(2*PI*2093*t)*exp(-5*t):d=1.2"
mk sparkle "aevalsrc=0.3*sin(2*PI*(1800+2400*t)*t)*exp(-3*t)*(0.6+0.4*sin(2*PI*28*t)):d=1.0"
mk glitch  "aevalsrc=0.5*sin(2*PI*(300+1800*mod(floor(t*40)\,5))*t)*mod(floor(t*55)\,2):d=0.45"
mk denied  "aevalsrc=0.5*sin(2*PI*180*t)*exp(-8*t)+0.3*sin(2*PI*120*t)*exp(-8*t):d=0.25"
mk switch  "aevalsrc=0.9*(random(0)-0.5)*exp(-90*t)+0.5*sin(2*PI*1200*t)*exp(-150*t):d=0.1"
mk typing  "aevalsrc=0.6*(random(0)-0.5)*exp(-70*mod(t\,0.093))*gt(mod(t*7.3\,1)\,0.15):d=2.6"
mk clock   "aevalsrc=0.6*sin(2*PI*2400*t)*exp(-150*mod(t\,0.5)):d=2.5"
echo "sfx: $(ls "$D" | wc -l) файлов"
