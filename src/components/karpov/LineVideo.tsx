import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { MeridaBoard } from "./MeridaBoard";
import { mainline, moveLabel, type PgnGame } from "@/lib/pgn";

const SPEEDS = [0.5, 1, 1.5, 2];

/** "Vídeo" de la línea principal: reproduce automáticamente con subtítulos. */
export function LineVideo({ game, title, chapter }: { game: PgnGame; title: string; chapter: string }) {
  const line = useMemo(() => [0, ...mainline(game)], [game]);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const n = game.nodes[line[i]!]!;
  const max = line.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (i >= max) return setPlaying(false);
    const hold = game.nodes[line[i]!]!.comment ? 3200 : 1300;
    const t = setTimeout(() => setI((x) => x + 1), hold / speed);
    return () => clearTimeout(t);
  }, [playing, i, max, speed, game, line]);

  return (
    <div className="overflow-hidden rounded-xl border border-primary/50 bg-background shadow-2xl">
      <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-wood to-card px-4 py-2">
        <span className="font-display text-sm font-bold uppercase tracking-wider text-primary">{title}</span>
        <span className="text-xs text-muted-foreground">{chapter}</span>
      </div>
      <div className="relative p-4">
        <div className="mx-auto max-w-sm">
          <MeridaBoard fen={n.fen} last={n} arrows={n.arrows} squares={n.squares} />
        </div>
        {!playing && i === 0 && (
          <button onClick={() => setPlaying(true)} aria-label="Reproducir vídeo" className="absolute inset-0 flex items-center justify-center bg-background/40">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl"><Play className="h-10 w-10" /></span>
          </button>
        )}
        <div className="mt-3 min-h-[4.5rem] rounded-md bg-card/90 px-4 py-2 text-center">
          <p className="font-display text-xs text-primary">{i === 0 ? "Posición inicial" : `${moveLabel(n, true)}${n.san}${n.nags.join("")}`}</p>
          <p className="text-base italic leading-snug">{n.comment || (i === 0 ? "Pulsa play para ver la línea principal." : "")}</p>
        </div>
      </div>
      <div className="space-y-2 border-t border-border bg-card px-4 py-3">
        <input type="range" min={0} max={max} value={i} onChange={(e) => setI(Number(e.target.value))} className="w-full accent-primary" aria-label="Avance del vídeo" />
        <div className="flex items-center gap-2">
          <button onClick={() => (i >= max ? (setI(0), setPlaying(true)) : setPlaying(!playing))} className="rounded-md bg-primary p-2 text-primary-foreground" aria-label={playing ? "Pausa" : "Reproducir"}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={() => { setI(0); setPlaying(false); }} className="rounded-md border border-border p-2 text-primary" aria-label="Reiniciar"><RotateCcw className="h-4 w-4" /></button>
          <span className="font-mono text-xs text-muted-foreground">{i}/{max} jugadas</span>
          <div className="ml-auto flex gap-1">
            {SPEEDS.map((s) => (
              <button key={s} onClick={() => setSpeed(s)} className={`rounded px-2 py-1 font-mono text-xs ${speed === s ? "bg-primary text-primary-foreground" : "border border-border"}`}>{s}×</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
