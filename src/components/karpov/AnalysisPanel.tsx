import { useEffect, useState } from "react";
import { Chess } from "chess.js";
import { Cpu, ExternalLink } from "lucide-react";

type Eval = { cp?: number; mate?: number; line: string[] } | null;

function uciToSan(fen: string, uci: string[]) {
  const c = new Chess(fen);
  const out: string[] = [];
  for (const u of uci.slice(0, 8)) {
    try {
      const m = c.move(u[4] ? { from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] } : { from: u.slice(0, 2), to: u.slice(2, 4) });
      out.push(m.san);
    } catch { break; }
  }
  return out;
}

export function AnalysisPanel({ fen }: { fen: string }) {
  const [on, setOn] = useState(true);
  const [ev, setEv] = useState<Eval>(null);
  const [state, setState] = useState<"idle" | "loading" | "none">("idle");

  useEffect(() => {
    if (!on) return;
    const ctrl = new AbortController();
    setState("loading");
    const t = setTimeout(() => {
      fetch(`https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          const pv = d?.pvs?.[0];
          if (!pv) { setEv(null); setState("none"); return; }
          setEv({ cp: pv.cp, mate: pv.mate, line: uciToSan(fen, pv.moves.split(" ")) });
          setState("idle");
        })
        .catch(() => { if (!ctrl.signal.aborted) { setEv(null); setState("none"); } });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [fen, on]);

  const score = ev?.mate != null ? `M${ev.mate}` : ev?.cp != null ? (ev.cp / 100 > 0 ? "+" : "") + (ev.cp / 100).toFixed(2) : "–";
  const pct = ev?.mate != null ? (ev.mate > 0 ? 100 : 0) : ev?.cp != null ? 50 + 50 * (2 / (1 + Math.exp(-ev.cp / 250)) - 1) : 50;

  return (
    <div className="rounded-lg border border-primary/50 bg-card p-4">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-primary" />
        <p className="font-display text-sm tracking-widest text-primary">Módulo de análisis</p>
        <button onClick={() => setOn(!on)} className={`ml-auto rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "border border-border bg-muted text-primary"}`}>
          {on ? "Activado" : "Desactivado"}
        </button>
      </div>
      {on && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-sq-dark">
              <div className="h-full bg-sq-light transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-14 text-right font-mono text-lg font-bold text-primary">{state === "loading" ? "…" : score}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {state === "none" ? "No hay evaluación guardada para esta posición; ábrela en el analizador completo." :
              ev ? <>Mejor línea: <span className="font-mono text-foreground">{ev.line.join(" ")}</span></> : "Calculando…"}
          </p>
          <a href={`https://lichess.org/analysis/standard/${fen.replace(/ /g, "_")}`} target="_blank" rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline">
            Abrir en analizador completo <ExternalLink className="h-3 w-3" />
          </a>
        </>
      )}
    </div>
  );
}
