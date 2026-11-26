import { useEffect, useState } from "react";
import { Cpu, Gauge } from "lucide-react";
import {
  analyzePositionOffline,
  formatEvalScore,
  getCachedEval,
  type EngineEval,
} from "@/lib/stockfish-engine";

export { formatEvalScore };

export function evalBarPercent(ev: EngineEval | null): number {
  if (!ev) return 50;
  if (ev.terminal === "white") return 100;
  if (ev.terminal === "black") return 0;
  if (ev.terminal === "draw") return 50;
  if (ev.mate !== undefined) return ev.mate > 0 ? 100 : 0;
  if (ev.cp !== undefined) {
    const raw = 50 + 50 * (2 / (1 + Math.exp(-ev.cp / 300)) - 1);
    return Math.max(4, Math.min(96, raw));
  }
  return 50;
}

export function AnalysisPanel({
  fen,
  defaultOn = true,
}: {
  fen: string;
  defaultOn?: boolean | undefined;
}) {
  const [on, setOn] = useState(defaultOn);
  const [targetDepth, setTargetDepth] = useState(13);
  const [ev, setEv] = useState<EngineEval | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setTargetDepth(13);
    setErrorMsg(null);
    setEv(getCachedEval(fen));
  }, [fen]);

  useEffect(() => {
    if (!on) return;
    setErrorMsg(null);
    const cancel = analyzePositionOffline(
      fen,
      targetDepth,
      (nextEval) => {
        setEv(nextEval);
      },
      (err) => {
        setErrorMsg(err);
      },
    );
    return cancel;
  }, [fen, on, targetDepth]);

  const score = formatEvalScore(ev);
  const pct = evalBarPercent(ev);
  const isComputing = Boolean(on && !errorMsg && (!ev || ev.searching));

  return (
    <div className="rounded-lg border border-primary/50 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Cpu className="h-5 w-5 text-primary" />
        <p className="font-display text-sm tracking-widest text-primary">
          Módulo de análisis local
        </p>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
          Stockfish 19 · sin internet
        </span>
        <button
          type="button"
          onClick={() => setOn((v) => !v)}
          className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${
            on
              ? "bg-primary text-primary-foreground"
              : "border border-border bg-card text-primary hover:bg-secondary/50"
          }`}
        >
          {on ? "Activado" : "Desactivado"}
        </button>
      </div>

      {on && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <div
              className="h-3.5 flex-1 overflow-hidden rounded-full border border-border bg-sq-dark"
              aria-label="Barra de valoración"
            >
              <div
                className="h-full bg-sq-light transition-[width] duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-16 text-right font-mono text-lg font-bold text-primary">
              {ev ? score : "…"}
            </span>
          </div>

          {errorMsg ? (
            <p className="mt-2 text-xs text-muted-foreground">{errorMsg}</p>
          ) : ev ? (
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {ev.terminal === "white" ? (
                <p>Jaque mate: ganan las blancas.</p>
              ) : ev.terminal === "black" ? (
                <p>Jaque mate: ganan las negras.</p>
              ) : ev.terminal === "draw" ? (
                <p>Posición de tablas reglamentarias.</p>
              ) : (
                <p>
                  Mejor línea:{" "}
                  <span className="font-mono text-foreground">{ev.line.join(" ")}</span>
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span>
                  Valoración desde blancas · Profundidad {ev.depth}
                  {isComputing ? " (calculando…)" : ""}
                </span>
                {!ev.terminal && !ev.searching && targetDepth < 16 && (
                  <button
                    type="button"
                    onClick={() => setTargetDepth(16)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-secondary/50 px-2 py-0.5 font-semibold text-foreground hover:border-primary"
                  >
                    <Gauge className="h-3 w-3" /> Profundizar (16)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Analizando localmente sin conexión…
            </p>
          )}
        </>
      )}
    </div>
  );
}
