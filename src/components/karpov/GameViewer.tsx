import { useMemo, useState, useEffect } from "react";
import { Chess } from "chess.js";
import { AnalysisPanel } from "./AnalysisPanel";
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";

export type Game = {
  title: string;
  event: string;
  result: string;
  moves: string;
  notes: Record<number, string>;
  intro: string;
};

const FILES = "abcdefgh";

export function GameViewer({ game }: { game: Game }) {
  const sans = useMemo(() => game.moves.split(" "), [game.moves]);
  const positions = useMemo(() => {
    const c = new Chess();
    const out = [{ board: c.board(), fen: c.fen(), last: null as null | { from: string; to: string } }];
    for (const m of sans) {
      const mv = c.move(m);
      out.push({ board: c.board(), fen: c.fen(), last: { from: mv.from, to: mv.to } });
    }
    return out;
  }, [sans]);
  const [ply, setPly] = useState(0);
  const [auto, setAuto] = useState(false);
  const max = sans.length;

  useEffect(() => setPly(0), [game]);
  useEffect(() => {
    if (!auto) return;
    if (ply >= max) return setAuto(false);
    const t = setTimeout(() => setPly((p) => p + 1), 1100);
    return () => clearTimeout(t);
  }, [auto, ply, max]);

  const { board, last, fen } = positions[Math.min(ply, max)]!;
  let note = game.intro;
  for (let i = ply; i > 0; i--) if (game.notes[i]) { note = game.notes[i]!; break; }

  const btn = "rounded-md border border-border bg-muted p-2 text-primary hover:bg-wood disabled:opacity-40";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
      <div>
        <div className="rounded-lg bg-wood p-3 shadow-2xl">
          <div className="grid grid-cols-8 overflow-hidden rounded-sm border border-border">
            {board.map((row, r) =>
              row.map((sq, f) => {
                const name = FILES[f]! + (8 - r);
                const light = (r + f) % 2 === 0;
                const hl = last && (last.from === name || last.to === name);
                return (
                  <div
                    key={name}
                    className={`relative aspect-square ${light ? "bg-sq-light" : "bg-sq-dark"}`}
                  >
                    {hl && <div className="absolute inset-0 bg-primary/45" />}
                    {sq && (
                      <img
                        src={`/pieces/${sq.color}${sq.type.toUpperCase()}.svg`}
                        alt={`${sq.color === "w" ? "blanca" : "negra"} ${sq.type}`}
                        className="relative h-full w-full"
                        draggable={false}
                      />
                    )}
                    {f === 0 && <span className="absolute left-0.5 top-0 font-mono text-[10px] text-wood">{8 - r}</span>}
                    {r === 7 && <span className="absolute bottom-0 right-1 font-mono text-[10px] text-wood">{FILES[f]}</span>}
                  </div>
                );
              }),
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button className={btn} aria-label="Inicio" onClick={() => setPly(0)} disabled={ply === 0}><ChevronFirst /></button>
          <button className={btn} aria-label="Anterior" onClick={() => setPly(ply - 1)} disabled={ply === 0}><ChevronLeft /></button>
          <button className={btn} aria-label={auto ? "Pausa" : "Reproducir"} onClick={() => setAuto(!auto)}>{auto ? <Pause /> : <Play />}</button>
          <button className={btn} aria-label="Siguiente" onClick={() => setPly(ply + 1)} disabled={ply === max}><ChevronRight /></button>
          <button className={btn} aria-label="Final" onClick={() => setPly(max)} disabled={ply === max}><ChevronLast /></button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <div className="print:hidden"><AnalysisPanel fen={fen} /></div>
        <div className="rounded-lg border border-primary/50 bg-muted p-5">
          <p className="font-display text-xs tracking-widest text-primary">
            {ply === 0 ? "Posición inicial" : `Jugada ${Math.ceil(ply / 2)}${ply % 2 ? "." : "…"} ${sans[ply - 1]}`}
          </p>
          <p className="mt-2 text-lg leading-snug">{note}</p>
        </div>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-border bg-card p-4 font-mono text-sm leading-7">
          {sans.map((m, i) => (
            <span key={i}>
              {i % 2 === 0 && <span className="text-muted-foreground">{i / 2 + 1}. </span>}
              <button
                onClick={() => setPly(i + 1)}
                className={`rounded px-1 ${ply === i + 1 ? "bg-primary text-primary-foreground" : game.notes[i + 1] ? "text-primary underline decoration-dotted" : "hover:bg-muted"}`}
              >
                {m}
              </button>{" "}
            </span>
          ))}
          <span className="font-semibold text-primary">{ply === max ? game.result : ""}</span>
        </div>
      </div>
    </div>
  );
}
