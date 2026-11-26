import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpDown,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  CornerLeftUp,
} from "lucide-react";
import { AnalysisPanel } from "./AnalysisPanel";
import { InteractiveBoard, PgnMarksToolbar, type BoardToolMode } from "./PgnBoard";
import {
  fetchCloudStudyMarks,
  isScopePendingSync,
  readStudyMarks,
  registerOfflineAutoSync,
  saveStudyMarksOfflineFirst,
  type ArrowMark,
  type BoardMarkColor,
  type SquareMark,
  type StudyMarksMap,
} from "@/lib/game-variants";
import { moveLabel, type PgnGame, type PgnNode } from "@/lib/pgn";

function EvalGraph({ evals, ply }: { evals: number[]; ply: number }) {
  if (!evals.length) return null;
  const w = 300,
    h = 60,
    clamp = (v: number) => Math.max(-400, Math.min(400, v));
  const pts = evals
    .map((v, i) => `${(i / (evals.length - 1)) * w},${h / 2 - (clamp(v) / 400) * (h / 2)}`)
    .join(" ");
  const x = (Math.min(ply, evals.length - 1) / (evals.length - 1)) * w;
  return (
    <div className="rounded-lg border border-border bg-card p-2">
      <p className="mb-1 font-display text-[10px] uppercase tracking-widest text-muted-foreground">
        Gráfica de evaluación (línea principal)
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-14 w-full" preserveAspectRatio="none">
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="var(--border)" strokeWidth="1" />
        <polyline points={pts} fill="none" stroke="var(--primary)" strokeWidth="2" />
        <line
          x1={x}
          y1="0"
          x2={x}
          y2={h}
          stroke="var(--primary)"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

function defaultStudyKey(game: PgnGame): string {
  const w = game.headers["White"] ?? "study";
  const b = game.headers["Black"] ?? String(game.nodes.length);
  const raw = `${w}-${b}-${game.nodes.length}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `study-marks:${raw}`;
}

export function PgnStudyViewer({
  game,
  intro,
  studyId,
}: {
  game: PgnGame;
  intro?: string | undefined;
  studyId?: string | undefined;
}) {
  const scopeKey = useMemo(
    () => (studyId ? `study-marks:${studyId}` : defaultStudyKey(game)),
    [studyId, game],
  );

  const [cur, setCur] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [toolMode, setToolMode] = useState<BoardToolMode>("arrow");
  const [markColor, setMarkColor] = useState<BoardMarkColor>("G");
  const [customMarks, setCustomMarks] = useState<StudyMarksMap>({});
  const [pendingSync, setPendingSync] = useState(false);

  useEffect(() => {
    setCur(0);
  }, [game]);

  useEffect(() => {
    let cancelled = false;
    registerOfflineAutoSync();
    const local = readStudyMarks(scopeKey);
    setCustomMarks(local);
    setPendingSync(isScopePendingSync(scopeKey));

    const onSyncChange = (ev: Event) => {
      const detail = (ev as CustomEvent<{ scopeKey?: string; pending?: boolean }>).detail;
      if (detail?.scopeKey === scopeKey) setPendingSync(Boolean(detail.pending));
    };
    window.addEventListener("chess-school:sync-change", onSyncChange);

    void (async () => {
      if (isScopePendingSync(scopeKey)) {
        const res = await saveStudyMarksOfflineFirst(scopeKey, local);
        if (!cancelled) setPendingSync(res.pending);
        return;
      }
      const cloud = await fetchCloudStudyMarks(scopeKey);
      if (cancelled || !cloud) return;
      if (cloud.found) {
        setCustomMarks(cloud.marks);
        setPendingSync(false);
      } else if (Object.keys(local).length > 0) {
        const res = await saveStudyMarksOfflineFirst(scopeKey, local);
        if (!cancelled) setPendingSync(res.pending);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("chess-school:sync-change", onSyncChange);
    };
  }, [scopeKey]);

  const nodes = game.nodes;
  const node = nodes[cur]!;

  const go = (id: number | undefined) => id !== undefined && setCur(id);
  const toEnd = () => {
    let n = node;
    while (n.children.length) n = nodes[n.children[0]!]!;
    setCur(n.id);
  };
  const exitVariation = () => {
    let n = node;
    while (n.parent !== null) {
      const p = nodes[n.parent]!;
      if (p.children[0] !== n.id) return setCur(p.id);
      n = p;
    }
  };
  const inVariation = (() => {
    let n = node;
    while (n.parent !== null) {
      if (nodes[n.parent]!.children[0] !== n.id) return true;
      n = nodes[n.parent]!;
    }
    return false;
  })();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowRight") go(node.children[0]);
      if (e.key === "ArrowLeft") go(node.parent ?? undefined);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const persistMarks = async (next: StudyMarksMap) => {
    setCustomMarks(next);
    const res = await saveStudyMarksOfflineFirst(scopeKey, next);
    setPendingSync(res.pending);
  };

  const curKey = String(node.id);
  const curCustom = customMarks[curKey] ?? {};

  const mergedArrows = useMemo<ArrowMark[]>(() => {
    const base = (node.arrows as ArrowMark[]).map((a) => ({
      from: a.from,
      to: a.to,
      color: (["G", "R", "Y", "B"].includes(a.color) ? a.color : "G") as BoardMarkColor,
    }));
    const extra = curCustom.arrows ?? [];
    const map = new Map<string, ArrowMark>();
    for (const a of base) map.set(`${a.from}-${a.to}`, a);
    for (const a of extra) map.set(`${a.from}-${a.to}`, a);
    return [...map.values()];
  }, [node.arrows, curCustom.arrows]);

  const mergedSquares = useMemo<SquareMark[]>(() => {
    const base = node.squares.map((s) => ({
      sq: s.sq,
      color: (["G", "R", "Y", "B"].includes(s.color) ? s.color : "G") as BoardMarkColor,
    }));
    const extra = curCustom.squares ?? [];
    const map = new Map<string, SquareMark>();
    for (const s of base) map.set(s.sq, s);
    for (const s of extra) map.set(s.sq, s);
    return [...map.values()];
  }, [node.squares, curCustom.squares]);

  const activeNags = curCustom.nags ?? node.nags;

  const updateCurrentMark = (updater: (prev: StudyMarksMap[string]) => StudyMarksMap[string]) => {
    const nextEntry = updater(customMarks[curKey] ?? {});
    const hasData =
      Boolean(nextEntry.nags?.length) ||
      Boolean(nextEntry.arrows?.length) ||
      Boolean(nextEntry.squares?.length);
    const next = { ...customMarks };
    if (hasData) next[curKey] = nextEntry;
    else delete next[curKey];
    void persistMarks(next);
  };

  const handleToggleArrow = (arrow: ArrowMark) => {
    updateCurrentMark((prev) => {
      const list = [...(prev.arrows ?? [])];
      const idx = list.findIndex((a) => a.from === arrow.from && a.to === arrow.to);
      if (idx >= 0) {
        if (list[idx]!.color === arrow.color) list.splice(idx, 1);
        else list[idx] = arrow;
      } else {
        list.push(arrow);
      }
      return { ...prev, arrows: list };
    });
  };

  const handleToggleSquare = (mark: SquareMark) => {
    updateCurrentMark((prev) => {
      const list = [...(prev.squares ?? [])];
      const idx = list.findIndex((s) => s.sq === mark.sq);
      if (idx >= 0) {
        if (list[idx]!.color === mark.color) list.splice(idx, 1);
        else list[idx] = mark;
      } else {
        list.push(mark);
      }
      return { ...prev, squares: list };
    });
  };

  const handleToggleNag = (nag: string) => {
    if (node.ply === 0) return;
    updateCurrentMark((prev) => {
      const current = prev.nags ?? node.nags;
      return { ...prev, nags: current.includes(nag) ? [] : [nag] };
    });
  };

  const handleClearOwnMarks = () => {
    updateCurrentMark((prev) => ({ ...prev, arrows: [], squares: [] }));
  };

  const renderLine = (startId: number, depth: number): ReactNode[] => {
    const out: ReactNode[] = [];
    let id: number | undefined = startId;
    let force = true;
    while (id !== undefined) {
      const n: PgnNode = nodes[id]!;
      const nCustom = customMarks[String(n.id)];
      const nags = nCustom?.nags ?? n.nags;
      out.push(
        <span key={`m${id}`}>
          <span className="text-muted-foreground">{moveLabel(n, force)}</span>
          <button
            type="button"
            onClick={() => setCur(n.id)}
            className={`rounded px-1 ${
              cur === n.id
                ? "bg-primary text-primary-foreground"
                : n.comment
                  ? "text-primary underline decoration-dotted"
                  : "hover:bg-muted"
            }`}
          >
            {n.san}
            {nags.join("")}
          </button>{" "}
          {n.comment && (
            <span className="font-body text-sm italic text-muted-foreground">{n.comment} </span>
          )}
        </span>,
      );
      force = !!n.comment;
      const p = n.parent !== null ? nodes[n.parent]! : null;
      if (p && p.children[0] === n.id && p.children.length > 1) {
        for (const alt of p.children.slice(1)) {
          out.push(
            <div
              key={`v${alt}`}
              className={`my-1 border-l-2 pl-3 ${
                depth === 0 ? "border-primary/60 bg-muted/40" : "border-border"
              } rounded-r`}
              style={{ marginLeft: depth * 6 }}
            >
              <span className="text-muted-foreground">( </span>
              {renderLine(alt, depth + 1)}
              <span className="text-muted-foreground">)</span>
            </div>,
          );
        }
        force = true;
      }
      id = n.children[0];
    }
    return out;
  };

  const btn =
    "rounded-md border border-border bg-muted p-2 text-primary hover:bg-wood disabled:opacity-40";
  const main = nodes[0]!.children[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,500px)_1fr]">
      <div className="space-y-3">
        <InteractiveBoard
          fen={node.fen}
          flipped={flipped}
          lastMove={node}
          arrows={mergedArrows}
          squares={mergedSquares}
          toolMode={toolMode === "move" ? "arrow" : toolMode}
          markColor={markColor}
          locked
          onToggleArrow={handleToggleArrow}
          onToggleSquare={handleToggleSquare}
        />

        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            className={btn}
            aria-label="Inicio"
            onClick={() => setCur(0)}
            disabled={cur === 0}
          >
            <ChevronFirst />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Anterior"
            onClick={() => go(node.parent ?? undefined)}
            disabled={cur === 0}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Siguiente"
            onClick={() => go(node.children[0])}
            disabled={!node.children.length}
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Final de la línea"
            onClick={toEnd}
            disabled={!node.children.length}
          >
            <ChevronLast />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Salir de la variante"
            onClick={exitVariation}
            disabled={!inVariation}
          >
            <CornerLeftUp />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Girar tablero"
            onClick={() => setFlipped((f) => !f)}
          >
            <ArrowUpDown />
          </button>
        </div>

        <PgnMarksToolbar
          toolMode={toolMode === "move" ? "arrow" : toolMode}
          onToolModeChange={setToolMode}
          markColor={markColor}
          onMarkColorChange={setMarkColor}
          hasBoardMarks={Boolean(curCustom.arrows?.length || curCustom.squares?.length)}
          onClearBoardMarks={handleClearOwnMarks}
          activeNags={activeNags}
          canEditNag={node.ply > 0}
          onToggleNag={handleToggleNag}
          showMoveTool={false}
        />

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          {pendingSync ? (
            <>
              <CloudOff className="h-3 w-3 text-primary" /> Marcas guardadas offline · pendientes de
              sincronizar
            </>
          ) : (
            <>
              <Cloud className="h-3 w-3 text-primary" /> Estudio original intacto · marcas locales y
              nube sincronizadas
            </>
          )}
        </p>

        {node.children.length > 1 && (
          <div className="rounded-lg border border-primary/40 bg-card p-3 text-sm">
            <p className="font-display text-xs uppercase tracking-widest text-primary">
              Alternativas aquí
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {node.children.map((c, i) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCur(c)}
                  className={`rounded border px-2 py-1 font-mono ${
                    i === 0 ? "border-primary text-primary" : "border-border hover:border-primary"
                  }`}
                >
                  {nodes[c]!.san}
                  {nodes[c]!.nags.join("")} {i === 0 ? "· principal" : ""}
                </button>
              ))}
            </div>
          </div>
        )}
        <EvalGraph evals={game.evals} ply={inVariation ? -1 : node.ply} />
      </div>
      <div className="flex flex-col gap-4">
        <div className="print:hidden">
          <AnalysisPanel fen={node.fen} />
        </div>
        <div className="rounded-lg border border-primary/50 bg-muted p-5">
          <p className="font-display text-xs tracking-widest text-primary">
            {cur === 0
              ? "Posición inicial"
              : `${moveLabel(node, true)}${node.san}${activeNags.join("")}`}
            {inVariation && (
              <span className="ml-2 rounded bg-primary/20 px-2 py-0.5 text-[10px]">VARIANTE</span>
            )}
          </p>
          <p className="mt-2 text-lg leading-snug">
            {node.comment ||
              (cur === 0
                ? intro
                : "Sin comentario en esta jugada. Usa el análisis o explora las variantes.")}
          </p>
        </div>
        <div className="max-h-[28rem] overflow-y-auto rounded-lg border border-border bg-card p-4 font-mono text-sm leading-7">
          {main !== undefined && renderLine(main, 0)}
          <span className="font-semibold text-primary">
            {game.headers["Result"] && game.headers["Result"] !== "*" ? game.headers["Result"] : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
