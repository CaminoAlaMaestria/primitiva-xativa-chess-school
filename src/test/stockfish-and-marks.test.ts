import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildGameTree,
  clearNodeBoardMarks,
  clearScopePendingSync,
  extractMainAnnotations,
  extractStoredAnalysis,
  flushPendingSync,
  getPendingSyncScopes,
  isScopePendingSync,
  markScopePendingSync,
  playMoveInTree,
  readLocalAnalysis,
  sanitizeStoredAnalysis,
  saveAnalysisOfflineFirst,
  toggleBoardArrow,
  toggleBoardSquare,
  toggleMoveNag,
  type Game,
} from "@/lib/game-variants";
import { formatEvalScore, inspectStaticPosition, parseUciInfoLine } from "@/lib/stockfish-engine";

const GAME: Game = {
  id: "test-marks-game",
  title: "Blancas – Negras",
  event: "Xàtiva 2026",
  result: "1-0",
  intro: "Partida original intacta.",
  moves: "e4 e5 Nf3 Nc6",
  notes: { 1: "Nota original 1." },
};

describe("Stockfish local: estabilidad sin vaivenes", () => {
  it("filtra líneas upperbound/lowerbound que causan vaivenes en la valoración", () => {
    const startFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const upper = parseUciInfoLine(
      "info depth 10 seldepth 14 multipv 1 score cp 245 upperbound nodes 5000 pv e2e4 e7e5",
      startFen,
      "w",
    );
    const lower = parseUciInfoLine(
      "info depth 10 seldepth 14 multipv 1 score cp -180 lowerbound nodes 5000 pv d2d4 d7d5",
      startFen,
      "w",
    );
    expect(upper).toBeNull();
    expect(lower).toBeNull();
  });

  it("normaliza la valoración siempre desde el punto de vista de las blancas", () => {
    // Tras 1. e4 (turno de negras): si el motor dice +45 cp para negras, desde blancas es -45 cp (-0.45).
    const afterE4 = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    const ev = parseUciInfoLine(
      "info depth 12 multipv 1 score cp 45 nodes 12000 pv c7c5 g1f3",
      afterE4,
      "b",
    );
    expect(ev).not.toBeNull();
    expect(ev?.cp).toBe(-45);
    expect(ev?.line).toEqual(["c5", "Nf3"]);
    expect(formatEvalScore(ev)).toBe("-0.45");

    // Mate en 2 para las negras -> -M2 desde blancas.
    const mateBlack = parseUciInfoLine(
      "info depth 14 multipv 1 score mate 2 nodes 9000 pv c7c5 g1f3",
      afterE4,
      "b",
    );
    expect(mateBlack?.mate).toBe(-2);
    expect(formatEvalScore(mateBlack)).toBe("-M2");
  });

  it("evita -0.00 en posiciones igualadas y detecta mate o ahogado estáticamente", () => {
    expect(formatEvalScore({ cp: -3, depth: 12, line: ["e4"], searching: false })).toBe("0.00");
    expect(formatEvalScore({ cp: 125, depth: 12, line: ["e4"], searching: false })).toBe("+1.25");

    // Mate del loco: ganan negras (0-1).
    const foolMate = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
    const s1 = inspectStaticPosition(foolMate);
    expect(s1.valid).toBe(true);
    expect(s1.terminalEval?.terminal).toBe("black");
    expect(formatEvalScore(s1.terminalEval!)).toBe("0-1");

    // Ahogado elemental: rey negro ahogado en a8.
    const stalemate = "k7/2Q5/1K6/8/8/8/8/8 b - - 0 1";
    const s2 = inspectStaticPosition(stalemate);
    expect(s2.terminalEval?.terminal).toBe("draw");
    expect(formatEvalScore(s2.terminalEval!)).toBe("0.00");
  });
});

describe("Marcas PGN, overlay intacto y cola offline -> nube", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("añade y alterna signos PGN, flechas y casillas sin alterar la partida original", () => {
    let tree = buildGameTree(GAME);

    // Anotar jugada 1. e4 con "!", flecha verde e4->f7 y casilla roja f7.
    tree = toggleMoveNag(tree, "m:1", "!");
    tree = toggleBoardArrow(tree, "m:1", { from: "e4", to: "f7", color: "G" });
    tree = toggleBoardSquare(tree, "m:1", { sq: "f7", color: "R" });

    expect(tree.nodes["m:1"]?.nags).toEqual(["!"]);
    expect(tree.nodes["m:1"]?.arrows).toEqual([{ from: "e4", to: "f7", color: "G" }]);
    expect(tree.nodes["m:1"]?.squares).toEqual([{ sq: "f7", color: "R" }]);
    // Nota original intacta.
    expect(tree.nodes["m:1"]?.baseComment).toBe("Nota original 1.");
    expect(GAME.notes[1]).toBe("Nota original 1.");

    // Recolorar la misma flecha y luego quitarla al repetir color.
    tree = toggleBoardArrow(tree, "m:1", { from: "e4", to: "f7", color: "B" });
    expect(tree.nodes["m:1"]?.arrows).toEqual([{ from: "e4", to: "f7", color: "B" }]);
    tree = toggleBoardArrow(tree, "m:1", { from: "e4", to: "f7", color: "B" });
    expect(tree.nodes["m:1"]?.arrows).toEqual([]);

    // Limpiar marcas de m:1 mantiene el signo PGN "!" intacto.
    tree = clearNodeBoardMarks(tree, "m:1");
    expect(tree.nodes["m:1"]?.squares).toEqual([]);
    expect(tree.nodes["m:1"]?.nags).toEqual(["!"]);

    // Extraer y reconstruir desde JSON guardado.
    const v = playMoveInTree(tree, "m:1", { from: "c7", to: "c5" })!;
    tree = toggleMoveNag(v.nextTree, v.nextId, "!?");
    tree = {
      ...tree,
      nodes: { ...tree.nodes, [v.nextId]: { ...tree.nodes[v.nextId]!, saved: true } },
    };

    const stored = extractStoredAnalysis(tree);
    expect(Object.keys(extractMainAnnotations(tree))).toEqual(["m:1"]);
    const sanitized = sanitizeStoredAnalysis(JSON.parse(JSON.stringify(stored)));
    const rebuilt = buildGameTree(GAME, sanitized.variations, sanitized.mainAnnotations);
    expect(rebuilt.nodes["m:1"]?.nags).toEqual(["!"]);
    expect(rebuilt.nodes[v.nextId]?.nags).toEqual(["!?"]);
  });

  it("guarda sin internet en cola local y sincroniza automáticamente al recuperar conexión", async () => {
    const scope = "game:offline-sync-test";
    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });

    const payload = sanitizeStoredAnalysis({
      version: 2,
      updatedAt: "2026-11-26T10:00:00.000Z",
      variations: [{ id: "v-1", parentId: "m:1", san: "c5", nags: ["!"] }],
      mainAnnotations: { "m:1": { squares: [{ sq: "d5", color: "Y" }] } },
    });

    const offlineRes = await saveAnalysisOfflineFirst(scope, payload);
    expect(offlineRes.local).toBe(true);
    expect(offlineRes.cloud).toBe(false);
    expect(offlineRes.pending).toBe(true);
    expect(isScopePendingSync(scope)).toBe(true);
    expect(getPendingSyncScopes()).toContain(scope);
    expect(readLocalAnalysis(scope).variations[0]?.san).toBe("c5");

    // Marcar manualmente como pendiente otro scope y limpiar tras verificar.
    markScopePendingSync("game:extra");
    expect(getPendingSyncScopes()).toContain("game:extra");
    clearScopePendingSync("game:extra");

    // Sin config de Supabase en entorno de test jsdom, flushPendingSync no arroja error y mantiene seguro lo pendiente.
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    await expect(flushPendingSync()).resolves.toMatchObject({ synced: 0 });

    Object.defineProperty(navigator, "onLine", { value: originalOnline, configurable: true });
    vi.restoreAllMocks();
  });
});
