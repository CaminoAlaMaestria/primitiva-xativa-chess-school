import { useMemo, useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Eraser, MousePointerClick, MoveUpRight, Square as SquareIcon } from "lucide-react";
import {
  VALID_NAGS,
  type ArrowMark,
  type BoardMarkColor,
  type SquareMark,
} from "@/lib/game-variants";

export type BoardToolMode = "move" | "arrow" | "square";

const FILES = "abcdefgh";

const MARK_COLORS: Array<{
  id: BoardMarkColor;
  label: string;
  cssVar: string;
  swatch: string;
}> = [
  { id: "G", label: "Verde", cssVar: "var(--mark-g)", swatch: "#2ea043" },
  { id: "R", label: "Rojo", cssVar: "var(--mark-r)", swatch: "#d93829" },
  { id: "Y", label: "Amarillo", cssVar: "var(--mark-y)", swatch: "#e2b007" },
  { id: "B", label: "Azul", cssVar: "var(--mark-b)", swatch: "#2b7de9" },
];

const COLOR_MAP: Record<BoardMarkColor, string> = {
  G: "var(--mark-g)",
  R: "var(--mark-r)",
  Y: "var(--mark-y)",
  B: "var(--mark-b)",
};

const NAG_TITLES: Record<string, string> = {
  "!": "Buena jugada (!)",
  "!!": "Jugada brillante (!!)",
  "?": "Error / mala jugada (?)",
  "??": "Error grave (??)",
  "!?": "Jugada interesante (!?)",
  "?!": "Jugada dudosa (?!)",
};

const PROMO_PIECES: Array<{ type: "q" | "r" | "b" | "n"; label: string }> = [
  { type: "q", label: "Dama" },
  { type: "r", label: "Torre" },
  { type: "b", label: "Alfil" },
  { type: "n", label: "Caballo" },
];

function squareCenter(sq: string, flipped: boolean): { x: number; y: number } {
  const f = FILES.indexOf(sq[0]!);
  const r = 8 - Number(sq[1]);
  const vc = flipped ? 7 - f : f;
  const vr = flipped ? 7 - r : r;
  return { x: vc + 0.5, y: vr + 0.5 };
}

export function InteractiveBoard({
  fen,
  flipped = false,
  selected = null,
  lastMove = null,
  legalTargets,
  arrows = [],
  squares = [],
  toolMode = "move",
  markColor = "G",
  locked = false,
  pendingPromo = null,
  onSelectPromotion,
  onCancelPromotion,
  onSquareClick,
  onToggleArrow,
  onToggleSquare,
}: {
  fen: string;
  flipped?: boolean | undefined;
  selected?: Square | string | null | undefined;
  lastMove?: { from?: string | undefined; to?: string | undefined } | null | undefined;
  legalTargets?: Map<string, { captured: boolean; promotion?: boolean }> | undefined;
  arrows?: ArrowMark[] | undefined;
  squares?: SquareMark[] | undefined;
  toolMode?: BoardToolMode | undefined;
  markColor?: BoardMarkColor | undefined;
  locked?: boolean | undefined;
  pendingPromo?: { from: Square; to: Square } | null | undefined;
  onSelectPromotion?:
    ((from: Square, to: Square, piece: "q" | "r" | "b" | "n") => void) | undefined;
  onCancelPromotion?: (() => void) | undefined;
  onSquareClick?: ((sqName: string) => void) | undefined;
  onToggleArrow?: ((arrow: ArrowMark) => void) | undefined;
  onToggleSquare?: ((mark: SquareMark) => void) | undefined;
}) {
  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = useMemo(() => chess.board(), [chess]);
  const [arrowAnchor, setArrowAnchor] = useState<string | null>(null);
  const rightDownRef = useRef<string | null>(null);

  const handleLeftClick = (name: string) => {
    if (toolMode === "square") {
      setArrowAnchor(null);
      onToggleSquare?.({ sq: name, color: markColor });
      return;
    }
    if (toolMode === "arrow") {
      if (!arrowAnchor) {
        setArrowAnchor(name);
      } else if (arrowAnchor === name) {
        setArrowAnchor(null);
      } else {
        onToggleArrow?.({ from: arrowAnchor, to: name, color: markColor });
        setArrowAnchor(null);
      }
      return;
    }
    setArrowAnchor(null);
    if (!locked) {
      onSquareClick?.(name);
    }
  };

  return (
    <div className="relative rounded-lg bg-wood p-3 shadow-2xl">
      <div
        className="relative grid grid-cols-8 overflow-hidden rounded-sm border border-border select-none"
        onContextMenu={(e) => {
          if (onToggleArrow || onToggleSquare) e.preventDefault();
        }}
      >
        {Array.from({ length: 8 }, (_, vr) =>
          Array.from({ length: 8 }, (_, vc) => {
            const r = flipped ? 7 - vr : vr;
            const f = flipped ? 7 - vc : vc;
            const sq = board[r]![f]!;
            const name = FILES[f]! + (8 - r);
            const light = (r + f) % 2 === 0;
            const isSelected = selected === name || arrowAnchor === name;
            const isLast =
              Boolean(lastMove?.from && lastMove?.to) &&
              (lastMove?.from === name || lastMove?.to === name);
            const targetInfo = toolMode === "move" && !locked ? legalTargets?.get(name) : undefined;
            const mark = squares.find((s) => s.sq === name);
            const canClick =
              toolMode !== "move" ||
              (!locked &&
                (Boolean(targetInfo) ||
                  Boolean(sq && sq.color === chess.turn()) ||
                  Boolean(selected)));

            return (
              <button
                key={name}
                type="button"
                onClick={() => handleLeftClick(name)}
                onMouseDown={(e) => {
                  if (e.button === 2) {
                    rightDownRef.current = name;
                  }
                }}
                onMouseUp={(e) => {
                  if (e.button === 2 && rightDownRef.current) {
                    const from = rightDownRef.current;
                    rightDownRef.current = null;
                    if (from === name) {
                      onToggleSquare?.({ sq: name, color: markColor });
                    } else {
                      onToggleArrow?.({ from, to: name, color: markColor });
                    }
                  }
                }}
                aria-label={
                  sq
                    ? `Casilla ${name}: ${sq.color === "w" ? "blanca" : "negra"} ${sq.type}`
                    : `Casilla ${name}`
                }
                className={`relative aspect-square ${light ? "bg-sq-light" : "bg-sq-dark"} ${
                  canClick ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {(isSelected || isLast) && <div className="absolute inset-0 bg-primary/45" />}
                {mark && (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-55"
                    style={{ background: COLOR_MAP[mark.color] }}
                  />
                )}
                {targetInfo && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div
                      className={
                        targetInfo.captured
                          ? "h-[84%] w-[84%] rounded-full border-4 border-primary/70"
                          : "h-1/4 w-1/4 rounded-full bg-primary/65"
                      }
                    />
                  </div>
                )}
                {sq && (
                  <img
                    src={`/pieces/${sq.color}${sq.type.toUpperCase()}.svg`}
                    alt={`${sq.color === "w" ? "blanca" : "negra"} ${sq.type}`}
                    className="relative h-full w-full"
                    draggable={false}
                  />
                )}
                {vc === 0 && (
                  <span className="pointer-events-none absolute left-0.5 top-0 font-mono text-[10px] text-wood">
                    {8 - r}
                  </span>
                )}
                {vr === 7 && (
                  <span className="pointer-events-none absolute bottom-0 right-1 font-mono text-[10px] text-wood">
                    {FILES[f]}
                  </span>
                )}
              </button>
            );
          }),
        )}

        {arrows.length > 0 && (
          <svg
            viewBox="0 0 8 8"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              {MARK_COLORS.map((c) => (
                <marker
                  key={c.id}
                  id={`pgn-ah-${c.id}`}
                  markerWidth="3.2"
                  markerHeight="3.2"
                  refX="1.4"
                  refY="1.6"
                  orient="auto"
                >
                  <path d="M0,0 L3.2,1.6 L0,3.2 z" fill={c.cssVar} />
                </marker>
              ))}
            </defs>
            {arrows.map((a, i) => {
              const p = squareCenter(a.from, flipped);
              const q = squareCenter(a.to, flipped);
              const dx = q.x - p.x;
              const dy = q.y - p.y;
              const len = Math.hypot(dx, dy) || 1;
              const endX = q.x - (dx / len) * 0.22;
              const endY = q.y - (dy / len) * 0.22;
              return (
                <line
                  key={`${a.from}-${a.to}-${i}`}
                  x1={p.x}
                  y1={p.y}
                  x2={endX}
                  y2={endY}
                  stroke={COLOR_MAP[a.color] ?? COLOR_MAP.G}
                  strokeWidth="0.16"
                  strokeOpacity="0.88"
                  strokeLinecap="round"
                  markerEnd={`url(#pgn-ah-${a.color})`}
                />
              );
            })}
          </svg>
        )}
      </div>

      {pendingPromo && onSelectPromotion && (
        <div
          role="dialog"
          aria-label="Elegir pieza de promoción"
          className="absolute inset-0 z-30 flex items-center justify-center rounded-lg bg-primary/70 p-4 backdrop-blur-xs"
        >
          <div className="rounded-xl border border-border bg-card p-4 text-center shadow-2xl">
            <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">
              Promoción de peón
            </p>
            <div className="mt-3 flex gap-2">
              {PROMO_PIECES.map((p) => (
                <button
                  key={p.type}
                  type="button"
                  onClick={() => onSelectPromotion(pendingPromo.from, pendingPromo.to, p.type)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-border bg-secondary/40 p-2 hover:border-primary"
                >
                  <img
                    src={`/pieces/${chess.turn()}${p.type.toUpperCase()}.svg`}
                    alt={p.label}
                    className="h-10 w-10"
                  />
                  <span className="text-xs font-semibold text-foreground">{p.label}</span>
                </button>
              ))}
            </div>
            {onCancelPromotion && (
              <button
                type="button"
                onClick={onCancelPromotion}
                className="mt-3 text-xs text-muted-foreground underline"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function PgnMarksToolbar({
  toolMode,
  onToolModeChange,
  markColor,
  onMarkColorChange,
  hasBoardMarks,
  onClearBoardMarks,
  activeNags = [],
  canEditNag = false,
  onToggleNag,
  showMoveTool = true,
}: {
  toolMode: BoardToolMode;
  onToolModeChange: (m: BoardToolMode) => void;
  markColor: BoardMarkColor;
  onMarkColorChange: (c: BoardMarkColor) => void;
  hasBoardMarks: boolean;
  onClearBoardMarks: () => void;
  activeNags?: string[] | undefined;
  canEditNag?: boolean | undefined;
  onToggleNag?: ((nag: string) => void) | undefined;
  showMoveTool?: boolean | undefined;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-xs print:hidden">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-display text-[11px] font-bold uppercase tracking-wider text-primary">
          Marcas PGN:
        </span>
        {showMoveTool && (
          <button
            type="button"
            onClick={() => onToolModeChange("move")}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-semibold ${
              toolMode === "move"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:border-primary"
            }`}
          >
            <MousePointerClick className="h-3.5 w-3.5" /> Mover
          </button>
        )}
        <button
          type="button"
          onClick={() => onToolModeChange("arrow")}
          className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-semibold ${
            toolMode === "arrow"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary"
          }`}
        >
          <MoveUpRight className="h-3.5 w-3.5" /> Flecha
        </button>
        <button
          type="button"
          onClick={() => onToolModeChange("square")}
          className={`inline-flex items-center gap-1 rounded border px-2 py-1 font-semibold ${
            toolMode === "square"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary"
          }`}
        >
          <SquareIcon className="h-3.5 w-3.5" /> Cuadro
        </button>

        <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

        <div className="flex items-center gap-1" role="group" aria-label="Color de marca">
          {MARK_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onMarkColorChange(c.id)}
              aria-label={`Color ${c.label}`}
              aria-pressed={markColor === c.id}
              title={`Color ${c.label}`}
              className={`h-6 w-6 rounded-full border-2 transition ${
                markColor === c.id
                  ? "scale-110 border-primary ring-2 ring-primary/40"
                  : "border-border"
              }`}
              style={{ backgroundColor: c.swatch }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onClearBoardMarks}
          disabled={!hasBoardMarks}
          className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 font-semibold text-foreground hover:border-destructive hover:text-destructive disabled:opacity-40"
        >
          <Eraser className="h-3.5 w-3.5" /> Limpiar
        </button>
      </div>

      {onToggleNag && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-display text-[11px] font-bold uppercase tracking-wider text-primary">
            Signos:
          </span>
          {VALID_NAGS.map((nag) => {
            const active = activeNags.includes(nag);
            return (
              <button
                key={nag}
                type="button"
                disabled={!canEditNag}
                onClick={() => onToggleNag(nag)}
                title={NAG_TITLES[nag] ?? nag}
                aria-label={`Signo ${nag}`}
                aria-pressed={active}
                className={`min-w-8 rounded border px-2 py-0.5 font-mono text-xs font-bold transition disabled:opacity-40 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-secondary/40 text-foreground hover:border-primary"
                }`}
              >
                {nag}
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {toolMode === "arrow"
              ? "Toca origen y destino en el tablero"
              : toolMode === "square"
                ? "Toca cualquier casilla para colorear"
                : "Clic derecho: cuadro · Arrastrar derecho: flecha"}
          </span>
        </div>
      )}
    </div>
  );
}
