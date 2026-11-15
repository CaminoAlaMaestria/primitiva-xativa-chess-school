import { Chess } from "chess.js";
import type { Arrow } from "@/lib/pgn";

const FILES = "abcdefgh";
const COLOR: Record<string, string> = { G: "var(--mark-g)", R: "var(--mark-r)", Y: "var(--mark-y)", B: "var(--mark-b)" };

function center(sq: string) {
  return { x: FILES.indexOf(sq[0]!) + 0.5, y: 8 - Number(sq[1]) + 0.5 };
}

export function MeridaBoard({
  fen,
  last,
  arrows = [],
  squares = [],
}: {
  fen: string;
  last?: { from?: string | undefined; to?: string | undefined } | null;
  arrows?: Arrow[];
  squares?: { sq: string; color: string }[];
}) {
  const board = new Chess(fen).board();
  return (
    <div className="rounded-lg bg-wood p-3 shadow-2xl">
      <div className="relative grid grid-cols-8 overflow-hidden rounded-sm border border-border">
        {board.map((row, r) =>
          row.map((sq, f) => {
            const name = FILES[f]! + (8 - r);
            const light = (r + f) % 2 === 0;
            const hl = last && (last.from === name || last.to === name);
            const mark = squares.find((s) => s.sq === name);
            return (
              <div key={name} className={`relative aspect-square ${light ? "bg-sq-light" : "bg-sq-dark"}`}>
                {hl && <div className="absolute inset-0 bg-primary/45" />}
                {mark && <div className="absolute inset-0 opacity-50" style={{ background: COLOR[mark.color] }} />}
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
        {arrows.length > 0 && (
          <svg viewBox="0 0 8 8" className="pointer-events-none absolute inset-0 h-full w-full">
            <defs>
              {Object.entries(COLOR).map(([k, c]) => (
                <marker key={k} id={`ah-${k}`} markerWidth="3" markerHeight="3" refX="1.6" refY="1.5" orient="auto">
                  <path d="M0,0 L3,1.5 L0,3 z" fill={c} />
                </marker>
              ))}
            </defs>
            {arrows.map((a, i) => {
              const p = center(a.from);
              const q = center(a.to);
              return (
                <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={COLOR[a.color] ?? COLOR["G"]} strokeWidth="0.16" strokeOpacity="0.85" strokeLinecap="round" markerEnd={`url(#ah-${a.color})`} />
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
