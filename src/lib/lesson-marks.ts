import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  isScopePendingSync,
  markScopePendingSync,
  clearScopePendingSync,
  registerOfflineAutoSync,
  sanitizeArrowMarks,
  sanitizeSquareMarks,
  type ArrowMark,
  type BoardMarkColor,
  type SquareMark,
} from "./game-variants";
import { analyzePositionOffline, formatEvalScore } from "./stockfish-engine";

export { analyzePositionOffline, formatEvalScore };

export type LessonToolMode = "move" | "arrow" | "square";

type MarksBucket = Record<string, { arrows: ArrowMark[]; squares: SquareMark[] }>;

const FILES = "abcdefgh";
const COLOR_HEX: Record<BoardMarkColor, string> = {
  G: "#2ea043",
  R: "#d93829",
  Y: "#e2b007",
  B: "#2b7de9",
};

function sqCenter(sq: string, flipped: boolean): { x: number; y: number } {
  const f = FILES.indexOf(sq[0]!);
  const r = 8 - Number(sq[1]);
  return {
    x: (flipped ? 7 - f : f) + 0.5,
    y: (flipped ? 7 - r : r) + 0.5,
  };
}

function sanitizeMarksBucket(raw: unknown): MarksBucket {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const clean: MarksBucket = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== "string" || !k.trim() || !v || typeof v !== "object") continue;
    const rec = v as Record<string, unknown>;
    const arrows = sanitizeArrowMarks(rec["arrows"]);
    const squares = sanitizeSquareMarks(rec["squares"]);
    if (arrows.length > 0 || squares.length > 0) {
      clean[k] = { arrows, squares };
    }
  }
  return clean;
}

export class LessonMarksController {
  readonly scopeKey: string;
  private readonly storageKey: string;
  private buckets: MarksBucket = {};
  toolMode: LessonToolMode = "move";
  color: BoardMarkColor = "G";
  private arrowOrigin: string | null = null;
  private hydrated = false;

  constructor(lessonSlug: string) {
    this.scopeKey = `lesson-marks:${lessonSlug}`;
    this.storageKey = `chess-school:lesson-board-marks:${lessonSlug}`;
  }

  initSync(onCloudLoaded?: () => void): void {
    registerOfflineAutoSync();
    if (!this.hydrated) {
      this.hydrated = true;
      this.loadLocal();
    }

    const syncFromOnline = () => {
      if (isScopePendingSync(this.scopeKey)) {
        void this.persistCloud();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("online", syncFromOnline);
    }

    void (async () => {
      if (isScopePendingSync(this.scopeKey)) {
        await this.persistCloud();
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      try {
        const { data, error } = await supabase
          .from("diagram_positions")
          .select("moves")
          .eq("key", this.scopeKey)
          .maybeSingle();
        if (error) return;
        if (data?.moves) {
          this.buckets = sanitizeMarksBucket(data.moves);
          this.saveLocal();
          onCloudLoaded?.();
        } else if (Object.keys(this.buckets).length > 0) {
          await this.persistCloud();
        }
      } catch {
        // Offline fallback.
      }
    })();
  }

  private loadLocal(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) return;
      this.buckets = sanitizeMarksBucket(JSON.parse(raw));
    } catch {
      // Ignorar errores de almacenamiento.
    }
  }

  private saveLocal(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.buckets));
    } catch {
      // Ignorar.
    }
  }

  private async persistCloud(): Promise<void> {
    markScopePendingSync(this.scopeKey);
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    try {
      const { error } = await supabase.from("diagram_positions").upsert({
        key: this.scopeKey,
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: this.buckets as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        clearScopePendingSync(this.scopeKey);
      }
    } catch {
      // Queda en cola pendiente hasta recuperar conexión.
    }
  }

  getMarks(mapKey: string): { arrows: ArrowMark[]; squares: SquareMark[] } {
    return this.buckets[mapKey] ?? { arrows: [], squares: [] };
  }

  toggleArrow(mapKey: string, arrow: ArrowMark): void {
    if (arrow.from === arrow.to) return;
    const prev = this.getMarks(mapKey);
    const nextArrows = [...prev.arrows];
    const idx = nextArrows.findIndex((a) => a.from === arrow.from && a.to === arrow.to);
    if (idx >= 0) {
      if (nextArrows[idx]!.color === arrow.color) nextArrows.splice(idx, 1);
      else nextArrows[idx] = arrow;
    } else {
      nextArrows.push(arrow);
    }
    this.setBucket(mapKey, nextArrows, prev.squares);
  }

  toggleSquare(mapKey: string, sq: string, color: BoardMarkColor): void {
    const prev = this.getMarks(mapKey);
    const nextSquares = [...prev.squares];
    const idx = nextSquares.findIndex((s) => s.sq === sq);
    if (idx >= 0) {
      if (nextSquares[idx]!.color === color) nextSquares.splice(idx, 1);
      else nextSquares[idx] = { sq, color };
    } else {
      nextSquares.push({ sq, color });
    }
    this.setBucket(mapKey, prev.arrows, nextSquares);
  }

  clearMarks(mapKey: string): void {
    delete this.buckets[mapKey];
    this.saveLocal();
    void this.persistCloud();
  }

  private setBucket(mapKey: string, arrows: ArrowMark[], squares: SquareMark[]): void {
    if (arrows.length === 0 && squares.length === 0) {
      delete this.buckets[mapKey];
    } else {
      this.buckets[mapKey] = { arrows, squares };
    }
    this.saveLocal();
    void this.persistCloud();
  }

  /** Apply visual squares & SVG arrows onto `.chessboard` or `.kv-board` and bind right-click/tool events. */
  decorateBoard(
    boardEl: HTMLElement | null,
    mapKey: string,
    flipped: boolean,
    onRedraw: () => void,
  ): void {
    if (!boardEl) return;
    const { arrows, squares } = this.getMarks(mapKey);

    boardEl.style.position = "relative";

    const sqMap = new Map(squares.map((s) => [s.sq, s.color]));
    const sqCells = boardEl.querySelectorAll<HTMLElement>("[data-square], [data-sq]");
    for (const cell of sqCells) {
      const sq = cell.dataset["square"] || cell.dataset["sq"];
      if (!sq) continue;
      cell.querySelectorAll(".pgn-sq-mark").forEach((el) => el.remove());
      const c = sqMap.get(sq);
      if (c) {
        const tint = document.createElement("span");
        tint.className = "pgn-sq-mark";
        tint.style.background = COLOR_HEX[c];
        cell.appendChild(tint);
      }
      if (this.arrowOrigin === sq) {
        cell.classList.add("pgn-arrow-origin");
      } else {
        cell.classList.remove("pgn-arrow-origin");
      }
    }

    boardEl.querySelectorAll(".pgn-arrow-svg").forEach((el) => el.remove());
    if (arrows.length > 0) {
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 8 8");
      svg.setAttribute("class", "pgn-arrow-svg");
      svg.setAttribute("aria-hidden", "true");

      const defs = document.createElementNS(ns, "defs");
      for (const [code, hex] of Object.entries(COLOR_HEX)) {
        const marker = document.createElementNS(ns, "marker");
        marker.setAttribute("id", `lm-ah-${code}`);
        marker.setAttribute("markerWidth", "3.2");
        marker.setAttribute("markerHeight", "3.2");
        marker.setAttribute("refX", "1.4");
        marker.setAttribute("refY", "1.6");
        marker.setAttribute("orient", "auto");
        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", "M0,0 L3.2,1.6 L0,3.2 z");
        path.setAttribute("fill", hex);
        marker.appendChild(path);
        defs.appendChild(marker);
      }
      svg.appendChild(defs);

      for (const a of arrows) {
        const p = sqCenter(a.from, flipped);
        const q = sqCenter(a.to, flipped);
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy) || 1;
        const endX = q.x - (dx / len) * 0.22;
        const endY = q.y - (dy / len) * 0.22;

        const line = document.createElementNS(ns, "line");
        line.setAttribute("x1", String(p.x));
        line.setAttribute("y1", String(p.y));
        line.setAttribute("x2", String(endX));
        line.setAttribute("y2", String(endY));
        line.setAttribute("stroke", COLOR_HEX[a.color] ?? COLOR_HEX.G);
        line.setAttribute("stroke-width", "0.16");
        line.setAttribute("stroke-opacity", "0.88");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("marker-end", `url(#lm-ah-${a.color})`);
        svg.appendChild(line);
      }

      boardEl.appendChild(svg);
    }

    const findSquareFromEvent = (ev: Event): string | null => {
      const target = ev.target as HTMLElement | null;
      const cell = target?.closest<HTMLElement>("[data-square], [data-sq]");
      return cell?.dataset["square"] || cell?.dataset["sq"] || null;
    };

    boardEl.oncontextmenu = (ev) => {
      ev.preventDefault();
    };

    let rightFrom: string | null = null;
    boardEl.onmousedown = (ev) => {
      if (ev.button === 2) {
        rightFrom = findSquareFromEvent(ev);
      }
    };
    boardEl.onmouseup = (ev) => {
      if (ev.button === 2 && rightFrom) {
        const to = findSquareFromEvent(ev);
        const from = rightFrom;
        rightFrom = null;
        if (!to) return;
        const currentKey = boardEl.dataset["marksKey"] || mapKey;
        const redrawFn = (boardEl as HTMLElement & { __redrawMarks?: () => void }).__redrawMarks;
        if (from === to) this.toggleSquare(currentKey, to, this.color);
        else this.toggleArrow(currentKey, { from, to, color: this.color });
        redrawFn?.();
      }
    };

    if (boardEl.dataset["marksCaptureBound"] !== "1") {
      boardEl.dataset["marksCaptureBound"] = "1";
      boardEl.addEventListener(
        "click",
        (ev) => {
          if (this.toolMode === "move") return;
          const sq = findSquareFromEvent(ev);
          if (!sq) return;
          ev.stopPropagation();
          ev.preventDefault();
          const currentKey = boardEl.dataset["marksKey"] || mapKey;
          const redrawFn = (boardEl as HTMLElement & { __redrawMarks?: () => void }).__redrawMarks;
          if (this.toolMode === "square") {
            this.arrowOrigin = null;
            this.toggleSquare(currentKey, sq, this.color);
            redrawFn?.();
            return;
          }
          if (!this.arrowOrigin) {
            this.arrowOrigin = sq;
            redrawFn?.();
          } else if (this.arrowOrigin === sq) {
            this.arrowOrigin = null;
            redrawFn?.();
          } else {
            this.toggleArrow(currentKey, { from: this.arrowOrigin, to: sq, color: this.color });
            this.arrowOrigin = null;
            redrawFn?.();
          }
        },
        true,
      );
    }
    boardEl.dataset["marksKey"] = mapKey;
    (boardEl as HTMLElement & { __redrawMarks?: () => void }).__redrawMarks = onRedraw;
  }

  renderToolbar(containerEl: HTMLElement | null, mapKey: string, onRedraw: () => void): void {
    if (!containerEl) return;
    const { arrows, squares } = this.getMarks(mapKey);
    const hasMarks = arrows.length > 0 || squares.length > 0;

    containerEl.innerHTML = `
      <div class="pgn-marks-bar">
        <span class="pgn-marks-label">Marcas PGN:</span>
        <button type="button" data-tool="move" class="pgn-tool-btn ${this.toolMode === "move" ? "active" : ""}">Mover</button>
        <button type="button" data-tool="arrow" class="pgn-tool-btn ${this.toolMode === "arrow" ? "active" : ""}">Flecha</button>
        <button type="button" data-tool="square" class="pgn-tool-btn ${this.toolMode === "square" ? "active" : ""}">Cuadro</button>
        <span class="pgn-color-group">
          ${(["G", "R", "Y", "B"] as const)
            .map(
              (c) =>
                `<button type="button" data-color="${c}" aria-label="Color ${c}" class="pgn-color-dot ${
                  this.color === c ? "active" : ""
                }" style="background:${COLOR_HEX[c]}"></button>`,
            )
            .join("")}
        </span>
        <button type="button" data-clear class="pgn-tool-btn pgn-clear-btn" ${
          hasMarks ? "" : "disabled"
        }>Limpiar</button>
      </div>
    `;

    containerEl.querySelectorAll<HTMLButtonElement>("[data-tool]").forEach((b) => {
      b.onclick = () => {
        this.toolMode = (b.dataset["tool"] as LessonToolMode) || "move";
        this.arrowOrigin = null;
        this.renderToolbar(containerEl, mapKey, onRedraw);
        onRedraw();
      };
    });
    containerEl.querySelectorAll<HTMLButtonElement>("[data-color]").forEach((b) => {
      b.onclick = () => {
        this.color = (b.dataset["color"] as BoardMarkColor) || "G";
        this.renderToolbar(containerEl, mapKey, onRedraw);
      };
    });
    const clearBtn = containerEl.querySelector<HTMLButtonElement>("[data-clear]");
    if (clearBtn) {
      clearBtn.onclick = () => {
        this.arrowOrigin = null;
        this.clearMarks(mapKey);
        this.renderToolbar(containerEl, mapKey, onRedraw);
        onRedraw();
      };
    }
  }
}

// ---------- Offline-first queue for lesson move saving (`saveMoves`) ----------

type PendingLessonMoves = Record<
  string,
  { fen: string; moves: Array<{ uci: string; nag: string }> }
>;

export function readPendingLessonMoves(lessonSlug: string): PendingLessonMoves {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`chess-school:lesson-pending-moves:${lessonSlug}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as PendingLessonMoves)
      : {};
  } catch {
    return {};
  }
}

function writePendingLessonMoves(lessonSlug: string, pending: PendingLessonMoves): void {
  if (typeof window === "undefined") return;
  try {
    const k = `chess-school:lesson-pending-moves:${lessonSlug}`;
    if (Object.keys(pending).length === 0) window.localStorage.removeItem(k);
    else window.localStorage.setItem(k, JSON.stringify(pending));
  } catch {
    // Ignorar.
  }
}

export async function saveLessonMovesOfflineFirst(
  lessonSlug: string,
  diagramKey: string,
  fen: string,
  moves: Array<{ uci: string; nag: string }>,
): Promise<{ local: boolean; cloud: boolean }> {
  const pending = readPendingLessonMoves(lessonSlug);
  pending[diagramKey] = { fen, moves };
  writePendingLessonMoves(lessonSlug, pending);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { local: true, cloud: false };
  }

  try {
    const { error } = await supabase.from("diagram_positions").upsert({
      key: diagramKey,
      fen,
      moves: moves as unknown as Json,
      updated_at: new Date().toISOString(),
    });
    if (!error) {
      const rest = readPendingLessonMoves(lessonSlug);
      delete rest[diagramKey];
      writePendingLessonMoves(lessonSlug, rest);
      return { local: true, cloud: true };
    }
  } catch {
    // Offline fallback.
  }
  return { local: true, cloud: false };
}

export async function flushPendingLessonMoves(lessonSlug: string): Promise<number> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return 0;
  const pending = readPendingLessonMoves(lessonSlug);
  let synced = 0;
  for (const [diagramKey, entry] of Object.entries(pending)) {
    try {
      const { error } = await supabase.from("diagram_positions").upsert({
        key: diagramKey,
        fen: entry.fen,
        moves: entry.moves as unknown as Json,
        updated_at: new Date().toISOString(),
      });
      if (!error) {
        delete pending[diagramKey];
        synced++;
      }
    } catch {
      break;
    }
  }
  writePendingLessonMoves(lessonSlug, pending);
  return synced;
}
