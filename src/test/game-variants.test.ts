import { beforeEach, describe, expect, it } from "vitest";
import {
  branchHasUnsavedNodes,
  buildGameTree,
  countVariationBranches,
  extractVarNodes,
  getDraftRootId,
  getGameId,
  getLineEndId,
  getMainlineBranchId,
  getMainlineContinuationId,
  getVariationSegmentRootId,
  listSavedVariations,
  markAllDraftsSaved,
  markSubtreeSaved,
  playMoveInTree,
  readLocalVariations,
  removeAllDrafts,
  removeSubtree,
  sanitizeStoredVarNodes,
  setVariationComment,
  writeLocalVariations,
  type Game,
} from "@/lib/game-variants";

const SAMPLE_GAME: Game = {
  id: "test-game-1",
  title: "Blancas – Negras",
  event: "Partida de prueba, 2026",
  result: "1-0",
  intro: "Introducción de prueba.",
  moves: "e4 e5 Nf3 Nc6",
  notes: {
    1: "Apertura clásica.",
    4: "Defensa natural.",
  },
};

describe("Árbol de variantes en partidas famosas", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("construye la partida principal y sigue la línea original sin crear variantes duplicadas", () => {
    const tree = buildGameTree(SAMPLE_GAME);
    expect(tree.mainIds).toHaveLength(5);

    const playMain = playMoveInTree(tree, "m:0", { from: "e2", to: "e4" });
    expect(playMain).not.toBeNull();
    expect(playMain?.created).toBe(false);
    expect(playMain?.nextId).toBe("m:1");
    expect(extractVarNodes(playMain!.nextTree)).toHaveLength(0);
  });

  it("permite jugar movimientos fuera de la partida, continuarlos y crear subvariantes", () => {
    let tree = buildGameTree(SAMPLE_GAME);

    // Tras 1. e4 (m:1), las negras prueban 1... c5 en lugar de 1... e5.
    const v1 = playMoveInTree(tree, "m:1", { from: "c7", to: "c5" });
    expect(v1).not.toBeNull();
    expect(v1?.created).toBe(true);
    tree = v1!.nextTree;
    const c5Node = tree.nodes[v1!.nextId]!;
    expect(c5Node.isMainline).toBe(false);
    expect(c5Node.saved).toBe(false);
    expect(c5Node.san).toBe("c5");
    expect(c5Node.ply).toBe(2);

    // Continuar con 2. Nf3 dentro de la variante.
    const v2 = playMoveInTree(tree, c5Node.id, { from: "g1", to: "f3" });
    expect(v2).not.toBeNull();
    tree = v2!.nextTree;
    expect(tree.nodes[v2!.nextId]?.san).toBe("Nf3");

    // Volver atrás a 1... c5 y abrir una subvariante con 2. d4.
    const sub = playMoveInTree(tree, c5Node.id, { from: "d2", to: "d4" });
    expect(sub).not.toBeNull();
    tree = sub!.nextTree;
    expect(tree.nodes[c5Node.id]?.children).toEqual([v2!.nextId, sub!.nextId]);

    // Guardar solo la línea principal de c5 -> Nf3 y verificar que d4 sigue siendo borrador.
    tree = markSubtreeSaved(tree, v2!.nextId);
    tree = {
      ...tree,
      nodes: {
        ...tree.nodes,
        [c5Node.id]: { ...tree.nodes[c5Node.id]!, saved: true },
      },
    };
    expect(branchHasUnsavedNodes(tree, c5Node.id)).toBe(true);
    expect(getDraftRootId(tree, sub!.nextId)).toBe(sub!.nextId);
    expect(getVariationSegmentRootId(tree, v2!.nextId)).toBe(c5Node.id);
    expect(getVariationSegmentRootId(tree, sub!.nextId)).toBe(sub!.nextId);

    // Guardar todo, poner nota y verificar extracción/recarga.
    tree = markAllDraftsSaved(tree);
    tree = setVariationComment(tree, c5Node.id, "Siciliana para comparar");
    const saved = extractVarNodes(tree, { savedOnly: true });
    expect(saved).toHaveLength(3);

    const reloaded = buildGameTree(SAMPLE_GAME, saved);
    const list = listSavedVariations(reloaded);
    expect(list).toHaveLength(1);
    expect(list[0]?.anchorLabel).toBe("1. e4");
    expect(list[0]?.preview).toContain("1… c5");
    expect(reloaded.nodes[c5Node.id]?.comment).toBe("Siciliana para comparar");
    expect(getMainlineBranchId(reloaded, sub!.nextId)).toBe("m:1");
    expect(getMainlineContinuationId(reloaded, "m:1")).toBe("m:2");
    expect(getLineEndId(reloaded, c5Node.id)).toBe(v2!.nextId);
  });

  it("reutiliza una variante existente al repetir exactamente la misma jugada", () => {
    const first = playMoveInTree(buildGameTree(SAMPLE_GAME), "m:1", { from: "c7", to: "c5" })!;
    const second = playMoveInTree(first.nextTree, "m:1", { from: "c7", to: "c5" })!;
    expect(second.created).toBe(false);
    expect(second.nextId).toBe(first.nextId);
  });

  it("elimina borradores o variantes guardadas de forma segura devolviendo el cursor al padre", () => {
    let tree = buildGameTree(SAMPLE_GAME);
    const v1 = playMoveInTree(tree, "m:1", { from: "c7", to: "c5" })!;
    tree = markSubtreeSaved(v1.nextTree, v1.nextId);
    const draft = playMoveInTree(tree, "m:2", { from: "b1", to: "c3" })!;
    tree = draft.nextTree;

    expect(countVariationBranches(tree)).toEqual({ savedCount: 1, draftCount: 1 });

    const withoutDrafts = removeAllDrafts(tree, draft.nextId);
    expect(withoutDrafts.fallbackId).toBe("m:2");
    expect(countVariationBranches(withoutDrafts.nextTree)).toEqual({
      savedCount: 1,
      draftCount: 0,
    });

    const withoutSaved = removeSubtree(withoutDrafts.nextTree, v1.nextId);
    expect(withoutSaved.fallbackId).toBe("m:1");
    expect(extractVarNodes(withoutSaved.nextTree)).toHaveLength(0);
  });

  it("sanea datos corruptos o jugadas ilegales al cargar desde almacenamiento", () => {
    const structurallyValid = sanitizeStoredVarNodes([
      { id: "v:1", parentId: "m:1", san: "c5", comment: "  Válida  " },
      { id: "v:bad", parentId: "m:1", san: "Qh5" }, // ilegal para negras en jugada 1
      { id: "v:orphan", parentId: "no-existe", san: "d5" },
      { id: "v:missing-san", parentId: "m:1" },
      null,
      123,
    ]);
    expect(structurallyValid).toHaveLength(3);

    const tree = buildGameTree(SAMPLE_GAME, structurallyValid);
    expect(tree.nodes["v:1"]?.saved).toBe(true);
    expect(tree.nodes["v:1"]?.comment).toBe("Válida");
    expect(tree.nodes["v:bad"]).toBeUndefined();
    expect(tree.nodes["v:orphan"]).toBeUndefined();
  });

  it("persiste y recupera variantes en localStorage por identificador de partida", () => {
    const idA = getGameId(SAMPLE_GAME);
    const idB = getGameId({ ...SAMPLE_GAME, id: undefined, event: "Otro torneo" });
    expect(idA).toBe("test-game-1");
    expect(idB).not.toBe(idA);

    writeLocalVariations(idA, [{ id: "v:1", parentId: "m:1", san: "c5", comment: "Nota local" }]);
    expect(readLocalVariations(idA)).toHaveLength(1);
    expect(readLocalVariations(idB)).toHaveLength(0);
  });
});
