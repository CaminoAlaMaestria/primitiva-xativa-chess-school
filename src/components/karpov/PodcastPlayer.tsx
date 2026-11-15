import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw, Rewind, FastForward } from "lucide-react";

const SRC = "https://www.ivoox.com/listen_mn_167204673_1.mp3";
const RATES = [1, 1.25, 1.5, 1.75, 2];
const START = 5 * 60 + 23;
const END = 30 * 60 + 50;

const fmt = (s: number) => {
  if (!isFinite(s)) return "--:--";
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};
const clamp = (v: number) => Math.max(START, Math.min(END, v));

export function PodcastPlayer() {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(START);
  const [rate, setRate] = useState(1);

  useEffect(() => { if (ref.current) ref.current.playbackRate = rate; }, [rate]);

  const seek = (v: number) => { const a = ref.current; if (a) { a.currentTime = clamp(v); setT(clamp(v)); } };
  const skip = (s: number) => { const a = ref.current; if (a) seek(a.currentTime + s); };
  const toggle = () => {
    const a = ref.current; if (!a) return;
    if (a.paused) {
      if (a.currentTime < START || a.currentTime >= END - 0.5) a.currentTime = START;
      void a.play();
    } else a.pause();
  };
  const btn = "flex items-center gap-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary hover:bg-wood";

  return (
    <div className="mt-4 rounded-lg border border-primary/50 bg-wood/40 p-4">
      <audio
        ref={ref}
        src={SRC}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.currentTime >= END) { a.pause(); a.currentTime = END; }
          else if (a.currentTime < START) a.currentTime = START;
          setT(a.currentTime);
        }}
        onLoadedMetadata={(e) => { e.currentTarget.currentTime = START; e.currentTarget.playbackRate = rate; }}
      />
      <p className="mb-3 inline-block rounded-full border border-primary/60 px-3 py-1 font-mono text-xs text-primary">
        Tramo sobre Kárpov · 5:23 – 30:50
      </p>
      <div className="flex items-center gap-3">
        <button onClick={toggle} aria-label={playing ? "Pausa" : "Reproducir"} className="rounded-full bg-primary p-3 text-primary-foreground">
          {playing ? <Pause /> : <Play />}
        </button>
        <input
          type="range" min={START} max={END} step={1} value={clamp(t)}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1 accent-primary" aria-label="Posición del audio"
        />
        <span className="font-mono text-sm text-muted-foreground">{fmt(clamp(t))} / {fmt(END)}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button className={btn} onClick={() => skip(-300)}><Rewind className="h-4 w-4" />5 min</button>
        <button className={btn} onClick={() => skip(-15)}><RotateCcw className="h-4 w-4" />15 s</button>
        <button className={btn} onClick={() => skip(30)}>30 s<RotateCw className="h-4 w-4" /></button>
        <button className={btn} onClick={() => skip(60)}>1 min<RotateCw className="h-4 w-4" /></button>
        <button className={btn} onClick={() => skip(300)}>5 min<FastForward className="h-4 w-4" /></button>
        <span className="ml-auto text-sm text-muted-foreground">Velocidad</span>
        {RATES.map((r) => (
          <button key={r} onClick={() => setRate(r)}
            className={`rounded-md px-2 py-1 text-sm ${rate === r ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-primary"}`}>
            {r}×
          </button>
        ))}
      </div>
    </div>
  );
}
