import { Chess } from "chess.js";

export type EngineEval = {
  /** Centipawns from White's perspective (+ favors White, - favors Black). */
  cp?: number | undefined;
  /** Mate in N moves from White's perspective (+ White mates, - Black mates). */
  mate?: number | undefined;
  /** Reached search depth (0 for terminal positions). */
  depth: number;
  /** Principal variation moves in SAN notation. */
  line: string[];
  /** Whether the engine is still deepening toward the target depth. */
  searching: boolean;
  /** Set when the current position is already checkmate or a formal draw. */
  terminal?: "white" | "black" | "draw" | undefined;
};

type SearchRequest = {
  id: number;
  fen: string;
  turn: "w" | "b";
  targetDepth: number;
  onUpdate: (ev: EngineEval) => void;
  onError?: ((msg: string) => void) | undefined;
};

const WORKER_URL = "/assets/stockfish/stockfish-19-lite-single.js";
const CACHE_STORAGE_KEY = "chess-school:eval-cache:v1";
const MIN_STABLE_DEPTH = 7;
const MAX_CACHE_ENTRIES = 240;

const memCache = new Map<string, EngineEval>();
let cacheHydrated = false;

function cacheKey(fen: string): string {
  return fen.trim();
}

function hydrateCache(): void {
  if (cacheHydrated || typeof window === "undefined") return;
  cacheHydrated = true;
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
    for (const [fen, val] of Object.entries(parsed)) {
      if (!val || typeof val !== "object") continue;
      const v = val as Record<string, unknown>;
      const depth = typeof v["depth"] === "number" ? v["depth"] : 0;
      const line = Array.isArray(v["line"])
        ? v["line"].filter((x): x is string => typeof x === "string")
        : [];
      const cp = typeof v["cp"] === "number" ? v["cp"] : undefined;
      const mate = typeof v["mate"] === "number" ? v["mate"] : undefined;
      const terminal =
        v["terminal"] === "white" || v["terminal"] === "black" || v["terminal"] === "draw"
          ? v["terminal"]
          : undefined;
      if (cp === undefined && mate === undefined && terminal === undefined) continue;
      memCache.set(fen, { cp, mate, depth, line, searching: false, terminal });
    }
  } catch {
    // Ignorar errores de almacenamiento.
  }
}

function saveCacheEntry(fen: string, ev: EngineEval): void {
  const key = cacheKey(fen);
  const existing = memCache.get(key);
  if (existing && existing.depth > ev.depth) return;
  if (memCache.has(key)) memCache.delete(key);
  memCache.set(key, { ...ev, searching: false });
  while (memCache.size > MAX_CACHE_ENTRIES) {
    const oldest = memCache.keys().next().value;
    if (oldest === undefined) break;
    memCache.delete(oldest);
  }
  if (typeof window === "undefined") return;
  try {
    const serialized: Record<string, EngineEval> = {};
    for (const [k, v] of memCache.entries()) {
      serialized[k] = v;
    }
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignorar cuota llena o modo privado.
  }
}

export function getCachedEval(fen: string, minDepth = 1): EngineEval | null {
  hydrateCache();
  const hit = memCache.get(cacheKey(fen));
  if (!hit || hit.depth < minDepth) return null;
  return hit;
}

export function uciLineToSan(fen: string, uciMoves: string[], maxMoves = 8): string[] {
  const chess = new Chess(fen);
  const out: string[] = [];
  for (const u of uciMoves.slice(0, maxMoves)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) break;
    try {
      const from = u.slice(0, 2);
      const to = u.slice(2, 4);
      const promotion = u[4];
      const mv = chess.move(promotion ? { from, to, promotion } : { from, to });
      out.push(mv.san);
    } catch {
      break;
    }
  }
  return out;
}

export function inspectStaticPosition(fen: string): {
  valid: boolean;
  turn: "w" | "b";
  terminalEval: EngineEval | null;
} {
  let chess: Chess;
  try {
    chess = new Chess(fen);
  } catch {
    return { valid: false, turn: "w", terminalEval: null };
  }

  const pieces = chess.board().flat().filter(Boolean);
  const wKings = pieces.filter((p) => p?.type === "k" && p.color === "w").length;
  const bKings = pieces.filter((p) => p?.type === "k" && p.color === "b").length;
  if (wKings !== 1 || bKings !== 1) {
    return { valid: false, turn: chess.turn(), terminalEval: null };
  }

  const turn = chess.turn();
  if (chess.isCheckmate()) {
    return {
      valid: true,
      turn,
      terminalEval: {
        mate: turn === "w" ? -1 : 1,
        depth: 0,
        line: [],
        searching: false,
        terminal: turn === "w" ? "black" : "white",
      },
    };
  }

  if (chess.isDraw() || chess.isStalemate() || chess.isInsufficientMaterial()) {
    return {
      valid: true,
      turn,
      terminalEval: {
        cp: 0,
        depth: 0,
        line: [],
        searching: false,
        terminal: "draw",
      },
    };
  }

  return { valid: true, turn, terminalEval: null };
}

/** Parse one Stockfish UCI info line into White-perspective EngineEval, filtering unstable bounds. */
export function parseUciInfoLine(line: string, fen: string, turn: "w" | "b"): EngineEval | null {
  if (!line.startsWith("info ")) return null;
  // Aspiration fail-high/fail-low bounds cause sudden fake jumps ("vaivenes").
  if (/\b(upperbound|lowerbound)\b/.test(line)) return null;

  const depthMatch = line.match(/\bdepth (\d+)/);
  const multiMatch = line.match(/\bmultipv (\d+)/);
  const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
  const pvMatch = line.match(/\bpv (.+)$/);
  if (!depthMatch || !scoreMatch || !pvMatch) return null;
  if (multiMatch && Number(multiMatch[1]) !== 1) return null;

  const depth = Number(depthMatch[1]);
  const rawScore = Number(scoreMatch[2]);
  const sign = turn === "w" ? 1 : -1;
  const sanMoves = uciLineToSan(fen, pvMatch[1]!.trim().split(/\s+/).filter(Boolean));
  if (sanMoves.length === 0) return null;

  if (scoreMatch[1] === "mate") {
    return {
      mate: rawScore * sign,
      depth,
      line: sanMoves,
      searching: true,
    };
  }

  return {
    cp: rawScore * sign,
    depth,
    line: sanMoves,
    searching: true,
  };
}

class StockfishCoordinator {
  private worker: Worker | null = null;
  private initialized = false;
  private ready = false;
  private waitingReadyOk = false;
  private isSearching = false;
  private stopSent = false;
  private seq = 0;
  private active: SearchRequest | null = null;
  private desired: SearchRequest | null = null;
  private pendingEval: EngineEval | null = null;
  private lastEmittedDepth = 0;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  private clearSafetyTimer(): void {
    if (this.safetyTimer !== null) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }

  private ensureWorker(): boolean {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return false;
    }
    if (this.worker) return true;

    try {
      const worker = new Worker(WORKER_URL);
      worker.onmessage = (ev: MessageEvent<unknown>) => {
        if (typeof ev.data !== "string") return;
        this.handleLine(ev.data.trim());
      };
      worker.onerror = () => {
        this.clearSafetyTimer();
        this.ready = false;
        this.initialized = false;
        this.isSearching = false;
        this.waitingReadyOk = false;
        this.worker = null;
        const target = this.desired ?? this.active;
        this.active = null;
        this.desired = null;
        target?.onError?.("No se pudo cargar Stockfish local en este navegador.");
      };
      this.worker = worker;
      this.initialized = false;
      this.ready = false;
      this.waitingReadyOk = true;
      worker.postMessage("uci");
      return true;
    } catch {
      return false;
    }
  }

  private beginFence(): void {
    if (!this.worker || !this.initialized) return;
    if (this.isSearching) {
      if (!this.stopSent) {
        this.stopSent = true;
        this.worker.postMessage("stop");
      }
      return;
    }
    if (!this.waitingReadyOk) {
      this.waitingReadyOk = true;
      this.worker.postMessage("isready");
    }
  }

  private startDesiredSearch(): void {
    if (!this.worker || !this.ready || !this.desired) return;
    const req = this.desired;
    this.active = req;
    this.pendingEval = null;
    this.lastEmittedDepth = 0;
    this.isSearching = true;
    this.stopSent = false;
    this.clearSafetyTimer();

    const maxMs = req.targetDepth >= 15 ? 4500 : 2600;
    this.safetyTimer = setTimeout(() => {
      if (this.active?.id === req.id && this.isSearching && !this.stopSent) {
        this.stopSent = true;
        this.worker?.postMessage("stop");
      }
    }, maxMs);

    this.worker.postMessage(`position fen ${req.fen}`);
    this.worker.postMessage(`go depth ${req.targetDepth}`);
  }

  private handleLine(line: string): void {
    if (line === "uciok") {
      this.initialized = true;
      this.worker?.postMessage("setoption name MultiPV value 1");
      this.worker?.postMessage("isready");
      return;
    }

    if (line === "readyok") {
      this.ready = true;
      this.waitingReadyOk = false;
      this.isSearching = false;
      this.stopSent = false;
      if (this.desired) {
        this.startDesiredSearch();
      }
      return;
    }

    if (this.waitingReadyOk || !this.initialized || !this.active) {
      if (line.startsWith("bestmove")) {
        this.clearSafetyTimer();
        this.isSearching = false;
        this.stopSent = false;
        this.active = null;
        this.pendingEval = null;
        if (this.desired && this.ready && !this.waitingReadyOk) {
          this.beginFence();
        }
      }
      return;
    }

    const req = this.active;
    const stillCurrent = this.desired?.id === req.id;

    if (line.startsWith("info ")) {
      if (!stillCurrent) return;
      const parsed = parseUciInfoLine(line, req.fen, req.turn);
      if (!parsed) return;
      this.pendingEval = parsed;

      if (
        (parsed.depth >= MIN_STABLE_DEPTH || parsed.mate !== undefined) &&
        parsed.depth >= this.lastEmittedDepth
      ) {
        this.lastEmittedDepth = parsed.depth;
        req.onUpdate(parsed);
      }
      return;
    }

    if (line.startsWith("bestmove")) {
      this.clearSafetyTimer();
      this.isSearching = false;
      this.stopSent = false;
      this.active = null;

      if (stillCurrent && this.pendingEval) {
        const finalEval: EngineEval = { ...this.pendingEval, searching: false };
        saveCacheEntry(req.fen, finalEval);
        req.onUpdate(finalEval);
      }
      this.pendingEval = null;

      if (this.desired && this.desired.id !== req.id) {
        this.beginFence();
      } else if (this.desired && this.desired.id === req.id) {
        this.desired = null;
      }
    }
  }

  request(
    fen: string,
    targetDepth: number,
    onUpdate: (ev: EngineEval) => void,
    onError?: (msg: string) => void,
  ): () => void {
    const id = ++this.seq;
    const staticInfo = inspectStaticPosition(fen);
    if (!staticInfo.valid) {
      onError?.("Posición no válida para analizar.");
      return () => {};
    }

    if (staticInfo.terminalEval) {
      onUpdate(staticInfo.terminalEval);
      this.desired = null;
      if (this.isSearching && !this.stopSent) {
        this.stopSent = true;
        this.worker?.postMessage("stop");
      }
      return () => {};
    }

    const cached = getCachedEval(fen, targetDepth);
    if (cached) {
      onUpdate({ ...cached, searching: false });
      this.desired = null;
      if (this.isSearching && !this.stopSent) {
        this.stopSent = true;
        this.worker?.postMessage("stop");
      }
      return () => {};
    }

    // Show shallow cache immediately while deepening to targetDepth so UI doesn't jump to blank.
    const shallowCached = getCachedEval(fen, 1);
    if (shallowCached) {
      onUpdate({ ...shallowCached, searching: true });
    }

    if (!this.ensureWorker()) {
      onError?.("El motor local funciona en el navegador con Web Workers.");
      return () => {};
    }

    this.desired = {
      id,
      fen,
      turn: staticInfo.turn,
      targetDepth,
      onUpdate,
      onError,
    };

    if (this.ready && !this.isSearching && !this.waitingReadyOk) {
      this.startDesiredSearch();
    } else {
      this.beginFence();
    }

    return () => {
      if (this.desired?.id === id) {
        this.desired = null;
        if (this.isSearching && !this.stopSent) {
          this.stopSent = true;
          this.worker?.postMessage("stop");
        }
      }
    };
  }
}

const coordinator = new StockfishCoordinator();

export function formatEvalScore(ev: EngineEval | null): string {
  if (!ev) return "–";
  if (ev.terminal === "white") return "1-0";
  if (ev.terminal === "black") return "0-1";
  if (ev.terminal === "draw") return "0.00";
  if (ev.mate !== undefined) {
    if (ev.mate > 0) return `+M${ev.mate}`;
    return `-M${Math.abs(ev.mate)}`;
  }
  if (ev.cp !== undefined) {
    if (Math.abs(ev.cp) < 5) return "0.00";
    const pawns = ev.cp / 100;
    return `${pawns > 0 ? "+" : ""}${pawns.toFixed(2)}`;
  }
  return "–";
}

export function analyzePositionOffline(
  fen: string,
  targetDepth = 13,
  onUpdate: (ev: EngineEval) => void,
  onError?: (msg: string) => void,
): () => void {
  return coordinator.request(fen, targetDepth, onUpdate, onError);
}
