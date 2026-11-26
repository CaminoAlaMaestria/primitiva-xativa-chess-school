import { Chess, type Square } from "chess.js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type Game = {
  id?: string | undefined;
  title: string;
  event: string;
  result: string;
  moves: string;
  notes: Record<number, string>;
  intro: string;
};

export type BoardMarkColor = "G" | "R" | "Y" | "B";
export type ArrowMark = { from: string; to: string; color: BoardMarkColor };
export type SquareMark = { sq: string; color: BoardMarkColor };

export const VALID_NAGS = ["!", "!!", "?", "??", "!?", "?!"] as const;
export type MoveNag = (typeof VALID_NAGS)[number];

export type NodeAnnotation = {
  nags?: string[] | undefined;
  arrows?: ArrowMark[] | undefined;
  squares?: SquareMark[] | undefined;
  comment?: string | undefined;
};

export type SavedVarNode = {
  id: string;
  parentId: string;
  san: string;
  comment?: string | undefined;
  nags?: string[] | undefined;
  arrows?: ArrowMark[] | undefined;
  squares?: SquareMark[] | undefined;
};

export type VarNodeInput = SavedVarNode & {
  saved?: boolean | undefined;
};

export type StoredGameAnalysis = {
  version: 2;
  updatedAt: string;
  variations: SavedVarNode[];
  mainAnnotations: Record<string, NodeAnnotation>;
};

export type MoveNode = {
  id: string;
  parentId: string | null;
  san: string;
  fen: string;
  from?: string | undefined;
  to?: string | undefined;
  ply: number;
  isMainline: boolean;
  saved: boolean;
  comment?: string | undefined;
  baseComment?: string | undefined;
  nags: string[];
  arrows: ArrowMark[];
  squares: SquareMark[];
  children: string[];
};

export type GameTree = {
  nodes: Record<string, MoveNode>;
  rootId: string;
  mainIds: string[];
};

export type SavedVariationSummary = {
  rootId: string;
  anchorLabel: string;
  preview: string;
};

const LEGACY_STORAGE_PREFIX = "chess-school:game-variants:";
const LEGACY_DIRTY_PREFIX = "chess-school:game-variants-dirty:";
const ANALYSIS_STORAGE_PREFIX = "chess-school:analysis:";
const PENDING_SYNC_KEY = "chess-school:pending-sync:v1";
const START_FEN = new Chess().fen();

const VALID_COLORS = new Set<BoardMarkColor>(["G", "R", "Y", "B"]);
const SQUARE_RE = /^[a-h][1-8]$/;

let autoSyncRegistered = false;
let flushingPromise: Promise<void> | null = null;

function createVarId(): string {
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getGameId(game: Pick<Game, "id" | "title" | "event">): string {
  if (game.id && game.id.trim()) return game.id.trim();
  return `${game.title}-${game.event}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getGameScopeKey(game: Pick<Game, "id" | "title" | "event">): string {
  return `game:${getGameId(game)}`;
}

export function getMoveLabel(node: Pick<MoveNode, "ply">, forceNumber: boolean): string {
  if (node.ply <= 0) return "";
  const num = Math.ceil(node.ply / 2);
  if (node.ply % 2 === 1) return `${num}. `;
  return forceNumber ? `${num}… ` : "";
}

export function sanitizeArrowMarks(raw: unknown): ArrowMark[] {
  if (!Array.isArray(raw)) return [];
  const out: ArrowMark[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const from = typeof r["from"] === "string" ? r["from"] : "";
    const to = typeof r["to"] === "string" ? r["to"] : "";
    const color = r["color"] as BoardMarkColor;
    if (!SQUARE_RE.test(from) || !SQUARE_RE.test(to) || from === to) continue;
    if (!VALID_COLORS.has(color)) continue;
    const key = `${from}-${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ from, to, color });
  }
  return out;
}

export function sanitizeSquareMarks(raw: unknown): SquareMark[] {
  if (!Array.isArray(raw)) return [];
  const out: SquareMark[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const sq = typeof r["sq"] === "string" ? r["sq"] : "";
    const color = r["color"] as BoardMarkColor;
    if (!SQUARE_RE.test(sq) || !VALID_COLORS.has(color)) continue;
    if (seen.has(sq)) continue;
    seen.add(sq);
    out.push({ sq, color });
  }
  return out;
}

export function sanitizeNags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<string>(VALID_NAGS);
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && valid.has(item) && !out.includes(item)) {
      out.push(item);
    }
  }
  return out;
}

export function sanitizeAnnotation(raw: unknown): NodeAnnotation | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const nags = sanitizeNags(r["nags"]);
  const arrows = sanitizeArrowMarks(r["arrows"]);
  const squares = sanitizeSquareMarks(r["squares"]);
  const comment =
    typeof r["comment"] === "string" && r["comment"].trim() ? r["comment"].trim() : undefined;
  if (nags.length === 0 && arrows.length === 0 && squares.length === 0 && !comment) {
    return null;
  }
  const out: NodeAnnotation = {};
  if (nags.length > 0) out.nags = nags;
  if (arrows.length > 0) out.arrows = arrows;
  if (squares.length > 0) out.squares = squares;
  if (comment) out.comment = comment;
  return out;
}

export function sanitizeStoredVarNodes(raw: unknown): SavedVarNode[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedVarNode[] = [];
  const seenIds = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const id = typeof rec["id"] === "string" ? rec["id"].trim() : "";
    const parentId = typeof rec["parentId"] === "string" ? rec["parentId"].trim() : "";
    const san = typeof rec["san"] === "string" ? rec["san"].trim() : "";
    if (!id || !parentId || !san || seenIds.has(id)) continue;

    seenIds.add(id);
    const entry: SavedVarNode = { id, parentId, san };
    if (typeof rec["comment"] === "string" && rec["comment"].trim()) {
      entry.comment = rec["comment"].trim();
    }
    const nags = sanitizeNags(rec["nags"]);
    if (nags.length > 0) entry.nags = nags;
    const arrows = sanitizeArrowMarks(rec["arrows"]);
    if (arrows.length > 0) entry.arrows = arrows;
    const squares = sanitizeSquareMarks(rec["squares"]);
    if (squares.length > 0) entry.squares = squares;
    out.push(entry);
  }

  return out;
}

export function createEmptyStoredAnalysis(): StoredGameAnalysis {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    variations: [],
    mainAnnotations: {},
  };
}

export function hasStoredAnalysisContent(analysis: StoredGameAnalysis): boolean {
  return analysis.variations.length > 0 || Object.keys(analysis.mainAnnotations).length > 0;
}

export function sanitizeStoredAnalysis(raw: unknown): StoredGameAnalysis {
  // Backward compatibility with v1 array payload (`SavedVarNode[]`).
  if (Array.isArray(raw)) {
    return {
      version: 2,
      updatedAt: new Date(0).toISOString(),
      variations: sanitizeStoredVarNodes(raw),
      mainAnnotations: {},
    };
  }
  if (!raw || typeof raw !== "object") {
    return createEmptyStoredAnalysis();
  }
  const r = raw as Record<string, unknown>;
  const variations = sanitizeStoredVarNodes(r["variations"] ?? r["nodes"]);
  const mainAnnotations: Record<string, NodeAnnotation> = {};
  const rawMain = r["mainAnnotations"];
  if (rawMain && typeof rawMain === "object" && !Array.isArray(rawMain)) {
    for (const [k, val] of Object.entries(rawMain)) {
      if (!/^m:\d+$/.test(k)) continue;
      const ann = sanitizeAnnotation(val);
      if (ann) mainAnnotations[k] = ann;
    }
  }
  const updatedAt =
    typeof r["updatedAt"] === "string" && r["updatedAt"]
      ? r["updatedAt"]
      : new Date().toISOString();

  return {
    version: 2,
    updatedAt,
    variations,
    mainAnnotations,
  };
}

export function buildGameTree(
  game: Game,
  varNodes: VarNodeInput[] = [],
  mainAnnotations: Record<string, NodeAnnotation> = {},
): GameTree {
  const chess = new Chess();
  const rootId = "m:0";
  const rootAnn = mainAnnotations[rootId];
  const nodes: Record<string, MoveNode> = {
    [rootId]: {
      id: rootId,
      parentId: null,
      san: "",
      fen: chess.fen(),
      ply: 0,
      isMainline: true,
      saved: true,
      comment: rootAnn?.comment,
      nags: rootAnn?.nags ? [...rootAnn.nags] : [],
      arrows: rootAnn?.arrows ? [...rootAnn.arrows] : [],
      squares: rootAnn?.squares ? [...rootAnn.squares] : [],
      children: [],
    },
  };
  const mainIds: string[] = [rootId];

  const sans = game.moves.trim().split(/\s+/).filter(Boolean);
  let prevId = rootId;
  for (let i = 0; i < sans.length; i++) {
    const token = sans[i]!;
    let mv;
    try {
      mv = chess.move(token);
    } catch {
      break;
    }
    const ply = i + 1;
    const id = `m:${ply}`;
    const baseComment = game.notes[ply];
    const ann = mainAnnotations[id];
    nodes[id] = {
      id,
      parentId: prevId,
      san: mv.san,
      fen: chess.fen(),
      from: mv.from,
      to: mv.to,
      ply,
      isMainline: true,
      saved: true,
      baseComment,
      comment: ann?.comment ?? baseComment,
      nags: ann?.nags ? [...ann.nags] : [],
      arrows: ann?.arrows ? [...ann.arrows] : [],
      squares: ann?.squares ? [...ann.squares] : [],
      children: [],
    };
    nodes[prevId]!.children.push(id);
    mainIds.push(id);
    prevId = id;
  }

  // Attach variation nodes in topological passes so parents resolve before children.
  const pending = [...varNodes];
  let progressed = true;
  while (pending.length > 0 && progressed) {
    progressed = false;
    for (let i = 0; i < pending.length;) {
      const v = pending[i]!;
      const parent = nodes[v.parentId];
      if (!parent) {
        i++;
        continue;
      }
      pending.splice(i, 1);

      if (nodes[v.id]) {
        progressed = true;
        continue;
      }

      const branchChess = new Chess(parent.fen);
      let mv;
      try {
        mv = branchChess.move(v.san);
      } catch {
        progressed = true;
        continue;
      }

      const duplicate = parent.children.some((cid) => nodes[cid]?.san === mv.san);
      if (duplicate) {
        progressed = true;
        continue;
      }

      nodes[v.id] = {
        id: v.id,
        parentId: v.parentId,
        san: mv.san,
        fen: branchChess.fen(),
        from: mv.from,
        to: mv.to,
        ply: parent.ply + 1,
        isMainline: false,
        saved: v.saved ?? true,
        comment: v.comment,
        nags: v.nags ? [...v.nags] : [],
        arrows: v.arrows ? [...v.arrows] : [],
        squares: v.squares ? [...v.squares] : [],
        children: [],
      };
      parent.children.push(v.id);
      progressed = true;
    }
  }

  return { nodes, rootId, mainIds };
}

export function playMoveInTree(
  tree: GameTree,
  currentId: string,
  move: { from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" | undefined },
): { nextTree: GameTree; nextId: string; created: boolean } | null {
  const current = tree.nodes[currentId];
  if (!current) return null;

  let mv;
  const chess = new Chess(current.fen);
  try {
    mv = chess.move(
      move.promotion
        ? { from: move.from, to: move.to, promotion: move.promotion }
        : { from: move.from, to: move.to },
    );
  } catch {
    return null;
  }

  const existingId = current.children.find((cid) => tree.nodes[cid]?.san === mv.san);
  if (existingId) {
    return { nextTree: tree, nextId: existingId, created: false };
  }

  const newId = createVarId();
  const nextNodes: Record<string, MoveNode> = {
    ...tree.nodes,
    [currentId]: {
      ...current,
      children: [...current.children, newId],
    },
    [newId]: {
      id: newId,
      parentId: currentId,
      san: mv.san,
      fen: chess.fen(),
      from: mv.from,
      to: mv.to,
      ply: current.ply + 1,
      isMainline: false,
      saved: false,
      nags: [],
      arrows: [],
      squares: [],
      children: [],
    },
  };

  return {
    nextTree: { ...tree, nodes: nextNodes },
    nextId: newId,
    created: true,
  };
}

export function getMainlineContinuationId(tree: GameTree, nodeId: string): string | undefined {
  const node = tree.nodes[nodeId];
  if (!node) return undefined;
  return node.children.find((cid) => tree.nodes[cid]?.isMainline);
}

export function getVariationChildrenIds(tree: GameTree, nodeId: string): string[] {
  const node = tree.nodes[nodeId];
  if (!node) return [];
  return node.children.filter((cid) => {
    const child = tree.nodes[cid];
    return Boolean(child && !child.isMainline);
  });
}

export function getMainlineBranchId(tree: GameTree, nodeId: string): string {
  let cur = tree.nodes[nodeId];
  while (cur && !cur.isMainline && cur.parentId) {
    cur = tree.nodes[cur.parentId];
  }
  return cur?.id ?? tree.rootId;
}

export function getLineEndId(tree: GameTree, nodeId: string): string {
  let cur = tree.nodes[nodeId];
  while (cur && cur.children.length > 0) {
    const nextId = cur.isMainline ? getMainlineContinuationId(tree, cur.id) : cur.children[0];
    if (!nextId || !tree.nodes[nextId]) break;
    cur = tree.nodes[nextId];
  }
  return cur?.id ?? nodeId;
}

export function getVariationSegmentRootId(tree: GameTree, nodeId: string): string | null {
  const initial = tree.nodes[nodeId];
  if (!initial || initial.isMainline) return null;
  let cur: MoveNode = initial;
  while (cur.parentId) {
    const parent: MoveNode | undefined = tree.nodes[cur.parentId];
    if (!parent || parent.isMainline) return cur.id;
    if (parent.children[0] !== cur.id) return cur.id;
    cur = parent;
  }
  return cur.id;
}

export function getDraftRootId(tree: GameTree, nodeId: string): string | null {
  const initial = tree.nodes[nodeId];
  if (!initial || initial.isMainline || initial.saved) return null;
  let cur: MoveNode = initial;
  while (cur.parentId) {
    const parent: MoveNode | undefined = tree.nodes[cur.parentId];
    if (!parent || parent.isMainline || parent.saved) return cur.id;
    cur = parent;
  }
  return cur.id;
}

export function branchHasUnsavedNodes(tree: GameTree, rootId: string): boolean {
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const node = tree.nodes[id];
    if (!node) continue;
    if (!node.saved) return true;
    for (const cid of node.children) stack.push(cid);
  }
  return false;
}

export function markSubtreeSaved(tree: GameTree, rootId: string): GameTree {
  const nextNodes = { ...tree.nodes };
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    const node = nextNodes[id];
    if (!node) continue;
    nextNodes[id] = { ...node, saved: true };
    for (const cid of node.children) stack.push(cid);
  }
  return { ...tree, nodes: nextNodes };
}

export function markAllDraftsSaved(tree: GameTree): GameTree {
  const nextNodes: Record<string, MoveNode> = {};
  for (const [id, node] of Object.entries(tree.nodes)) {
    nextNodes[id] = node.saved ? node : { ...node, saved: true };
  }
  return { ...tree, nodes: nextNodes };
}

export function removeSubtree(
  tree: GameTree,
  rootToRemoveId: string,
): { nextTree: GameTree; fallbackId: string } {
  const target = tree.nodes[rootToRemoveId];
  if (!target || target.isMainline) {
    return { nextTree: tree, fallbackId: tree.rootId };
  }

  const toDelete = new Set<string>();
  const stack = [rootToRemoveId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    if (toDelete.has(id)) continue;
    toDelete.add(id);
    const node = tree.nodes[id];
    if (node) {
      for (const cid of node.children) stack.push(cid);
    }
  }

  const nextNodes: Record<string, MoveNode> = {};
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (toDelete.has(id)) continue;
    nextNodes[id] = {
      ...node,
      children: node.children.filter((cid) => !toDelete.has(cid)),
    };
  }

  const fallbackId = target.parentId && nextNodes[target.parentId] ? target.parentId : tree.rootId;
  return { nextTree: { ...tree, nodes: nextNodes }, fallbackId };
}

export function removeAllDrafts(
  tree: GameTree,
  currentId: string,
): { nextTree: GameTree; fallbackId: string } {
  const toDelete = new Set<string>();
  for (const node of Object.values(tree.nodes)) {
    if (!node.isMainline && !node.saved) toDelete.add(node.id);
  }
  if (toDelete.size === 0) {
    return { nextTree: tree, fallbackId: currentId };
  }

  let fallback: MoveNode | undefined = tree.nodes[currentId];
  while (fallback && toDelete.has(fallback.id)) {
    fallback = fallback.parentId ? tree.nodes[fallback.parentId] : undefined;
  }

  const nextNodes: Record<string, MoveNode> = {};
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (toDelete.has(id)) continue;
    nextNodes[id] = {
      ...node,
      children: node.children.filter((cid) => !toDelete.has(cid)),
    };
  }

  return {
    nextTree: { ...tree, nodes: nextNodes },
    fallbackId: fallback?.id ?? tree.rootId,
  };
}

export function setVariationComment(tree: GameTree, nodeId: string, comment: string): GameTree {
  const node = tree.nodes[nodeId];
  if (!node) return tree;
  const trimmed = comment.trim();
  const nextComment = trimmed || (node.isMainline ? node.baseComment : undefined);
  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: {
        ...node,
        comment: nextComment,
      },
    },
  };
}

export function toggleMoveNag(tree: GameTree, nodeId: string, nag: string): GameTree {
  const node = tree.nodes[nodeId];
  if (!node || node.ply === 0) return tree;
  const hasSame = node.nags.includes(nag);
  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: {
        ...node,
        nags: hasSame ? [] : [nag],
      },
    },
  };
}

export function toggleBoardArrow(tree: GameTree, nodeId: string, arrow: ArrowMark): GameTree {
  const node = tree.nodes[nodeId];
  if (!node || arrow.from === arrow.to) return tree;
  const idx = node.arrows.findIndex((a) => a.from === arrow.from && a.to === arrow.to);
  const nextArrows = [...node.arrows];
  if (idx >= 0) {
    if (nextArrows[idx]!.color === arrow.color) {
      nextArrows.splice(idx, 1);
    } else {
      nextArrows[idx] = arrow;
    }
  } else {
    nextArrows.push(arrow);
  }
  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: {
        ...node,
        arrows: nextArrows,
      },
    },
  };
}

export function toggleBoardSquare(tree: GameTree, nodeId: string, mark: SquareMark): GameTree {
  const node = tree.nodes[nodeId];
  if (!node) return tree;
  const idx = node.squares.findIndex((s) => s.sq === mark.sq);
  const nextSquares = [...node.squares];
  if (idx >= 0) {
    if (nextSquares[idx]!.color === mark.color) {
      nextSquares.splice(idx, 1);
    } else {
      nextSquares[idx] = mark;
    }
  } else {
    nextSquares.push(mark);
  }
  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: {
        ...node,
        squares: nextSquares,
      },
    },
  };
}

export function clearNodeBoardMarks(tree: GameTree, nodeId: string): GameTree {
  const node = tree.nodes[nodeId];
  if (!node) return tree;
  return {
    ...tree,
    nodes: {
      ...tree.nodes,
      [nodeId]: {
        ...node,
        arrows: [],
        squares: [],
      },
    },
  };
}

export function extractVarNodes(
  tree: GameTree,
  options?: { savedOnly?: boolean | undefined },
): SavedVarNode[] {
  const savedOnly = options?.savedOnly ?? false;
  const out: SavedVarNode[] = [];
  const visited = new Set<string>();
  const queue: string[] = [tree.rootId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = tree.nodes[id];
    if (!node) continue;

    if (!node.isMainline && node.parentId) {
      if (!savedOnly || node.saved) {
        const entry: SavedVarNode = {
          id: node.id,
          parentId: node.parentId,
          san: node.san,
        };
        if (node.comment) entry.comment = node.comment;
        if (node.nags.length > 0) entry.nags = [...node.nags];
        if (node.arrows.length > 0) entry.arrows = [...node.arrows];
        if (node.squares.length > 0) entry.squares = [...node.squares];
        out.push(entry);
      }
    }
    for (const cid of node.children) queue.push(cid);
  }

  return out;
}

export function extractMainAnnotations(tree: GameTree): Record<string, NodeAnnotation> {
  const out: Record<string, NodeAnnotation> = {};
  for (const id of tree.mainIds) {
    const n = tree.nodes[id];
    if (!n) continue;
    const customComment = n.comment && n.comment !== n.baseComment ? n.comment.trim() : undefined;
    if (n.nags.length === 0 && n.arrows.length === 0 && n.squares.length === 0 && !customComment) {
      continue;
    }
    const ann: NodeAnnotation = {};
    if (n.nags.length > 0) ann.nags = [...n.nags];
    if (n.arrows.length > 0) ann.arrows = [...n.arrows];
    if (n.squares.length > 0) ann.squares = [...n.squares];
    if (customComment) ann.comment = customComment;
    out[id] = ann;
  }
  return out;
}

export function extractStoredAnalysis(tree: GameTree): StoredGameAnalysis {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    variations: extractVarNodes(tree, { savedOnly: true }),
    mainAnnotations: extractMainAnnotations(tree),
  };
}

export function listSavedVariations(tree: GameTree): SavedVariationSummary[] {
  const summaries: SavedVariationSummary[] = [];

  const collect = (nodeId: string) => {
    const node = tree.nodes[nodeId];
    if (!node) return;
    if (node.isMainline) {
      const vars = getVariationChildrenIds(tree, node.id).filter((cid) => tree.nodes[cid]?.saved);
      for (const vid of vars) {
        const vNode = tree.nodes[vid]!;
        const anchorLabel =
          node.ply === 0
            ? "Inicio"
            : `${getMoveLabel(node, true)}${node.san}${node.nags.join("")}`.trim();
        const previewMoves: string[] = [];
        let cur: MoveNode | undefined = vNode;
        let steps = 0;
        while (cur && cur.saved && steps < 4) {
          previewMoves.push(`${getMoveLabel(cur, steps === 0)}${cur.san}${cur.nags.join("")}`);
          const nextId: string | undefined = cur.children[0];
          cur = nextId ? tree.nodes[nextId] : undefined;
          steps++;
        }
        if (cur && cur.saved) previewMoves.push("…");
        summaries.push({
          rootId: vid,
          anchorLabel,
          preview: previewMoves.join(" "),
        });
      }
      const nextMain = getMainlineContinuationId(tree, node.id);
      if (nextMain) collect(nextMain);
    }
  };

  collect(tree.rootId);
  return summaries;
}

export function countVariationBranches(tree: GameTree): { savedCount: number; draftCount: number } {
  let savedCount = 0;
  let draftCount = 0;
  for (const node of Object.values(tree.nodes)) {
    if (node.isMainline || !node.parentId) continue;
    const parent = tree.nodes[node.parentId];
    if (!parent) continue;
    const isBranchRoot = parent.isMainline || parent.children[0] !== node.id;
    if (!isBranchRoot) continue;
    if (node.saved) savedCount++;
    else draftCount++;
  }
  return { savedCount, draftCount };
}

export function describeLine(tree: GameTree, rootId: string, maxMoves = 5): string {
  const parts: string[] = [];
  let cur = tree.nodes[rootId];
  let count = 0;
  while (cur && count < maxMoves) {
    parts.push(`${getMoveLabel(cur, count === 0)}${cur.san}${cur.nags.join("")}`);
    const nextId: string | undefined = cur.children[0];
    cur = nextId ? tree.nodes[nextId] : undefined;
    count++;
  }
  if (cur) parts.push("…");
  return parts.join(" ");
}

// ---------- Local storage & offline-first cloud sync queue ----------

function legacyGameIdFromScope(scopeKey: string): string | null {
  return scopeKey.startsWith("game:") ? scopeKey.slice(5) : null;
}

export function readLocalAnalysis(scopeKey: string): StoredGameAnalysis {
  if (typeof window === "undefined") return createEmptyStoredAnalysis();
  try {
    const raw = window.localStorage.getItem(`${ANALYSIS_STORAGE_PREFIX}${scopeKey}`);
    if (raw) {
      return sanitizeStoredAnalysis(JSON.parse(raw));
    }
    const legacyId = legacyGameIdFromScope(scopeKey);
    if (legacyId) {
      const legacyRaw = window.localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${legacyId}`);
      if (legacyRaw) {
        return sanitizeStoredAnalysis(JSON.parse(legacyRaw));
      }
    }
  } catch {
    // Ignorar errores de almacenamiento o JSON inválido.
  }
  return createEmptyStoredAnalysis();
}

export function writeLocalAnalysis(scopeKey: string, analysis: StoredGameAnalysis): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${ANALYSIS_STORAGE_PREFIX}${scopeKey}`, JSON.stringify(analysis));
    const legacyId = legacyGameIdFromScope(scopeKey);
    if (legacyId) {
      window.localStorage.setItem(
        `${LEGACY_STORAGE_PREFIX}${legacyId}`,
        JSON.stringify(analysis.variations),
      );
    }
  } catch {
    // Ignorar errores de cuota o modo privado.
  }
}

function readPendingQueue(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PENDING_SYNC_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof k === "string" && typeof v === "string") clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

function writePendingQueue(queue: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(queue).length === 0) {
      window.localStorage.removeItem(PENDING_SYNC_KEY);
    } else {
      window.localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue));
    }
  } catch {
    // Ignorar errores de almacenamiento.
  }
}

function notifySyncChange(scopeKey: string, pending: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("chess-school:sync-change", { detail: { scopeKey, pending } }),
    );
  } catch {
    // Ignorar en entornos sin CustomEvent.
  }
}

export function isScopePendingSync(scopeKey: string): boolean {
  const queue = readPendingQueue();
  if (queue[scopeKey]) return true;
  const legacyId = legacyGameIdFromScope(scopeKey);
  if (legacyId && typeof window !== "undefined") {
    try {
      return window.localStorage.getItem(`${LEGACY_DIRTY_PREFIX}${legacyId}`) === "1";
    } catch {
      return false;
    }
  }
  return false;
}

export function markScopePendingSync(scopeKey: string): void {
  const queue = readPendingQueue();
  queue[scopeKey] = new Date().toISOString();
  writePendingQueue(queue);
  notifySyncChange(scopeKey, true);
}

export function clearScopePendingSync(scopeKey: string): void {
  const queue = readPendingQueue();
  delete queue[scopeKey];
  writePendingQueue(queue);
  const legacyId = legacyGameIdFromScope(scopeKey);
  if (legacyId && typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(`${LEGACY_DIRTY_PREFIX}${legacyId}`);
    } catch {
      // Ignorar.
    }
  }
  notifySyncChange(scopeKey, false);
}

export function getPendingSyncScopes(): string[] {
  const set = new Set<string>(Object.keys(readPendingQueue()));
  if (typeof window !== "undefined") {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(LEGACY_DIRTY_PREFIX) && window.localStorage.getItem(k) === "1") {
          set.add(`game:${k.slice(LEGACY_DIRTY_PREFIX.length)}`);
        }
      }
    } catch {
      // Ignorar.
    }
  }
  return [...set];
}

function hasSupabaseConfig(): boolean {
  try {
    return Boolean(
      (import.meta.env?.["VITE_SUPABASE_URL"] &&
        import.meta.env?.["VITE_SUPABASE_PUBLISHABLE_KEY"]) ||
      (typeof process !== "undefined" &&
        process.env?.["SUPABASE_URL"] &&
        process.env?.["SUPABASE_PUBLISHABLE_KEY"]),
    );
  } catch {
    return false;
  }
}

function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

async function upsertScopeToCloud(scopeKey: string, payload: unknown): Promise<boolean> {
  if (!hasSupabaseConfig() || !isBrowserOnline()) return false;
  try {
    const { error } = await supabase.from("diagram_positions").upsert({
      key: scopeKey,
      fen: START_FEN,
      moves: payload as Json,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function fetchCloudAnalysis(
  scopeKey: string,
): Promise<{ found: boolean; analysis: StoredGameAnalysis } | null> {
  if (!hasSupabaseConfig() || !isBrowserOnline()) return null;
  try {
    const { data, error } = await supabase
      .from("diagram_positions")
      .select("moves")
      .eq("key", scopeKey)
      .maybeSingle();
    if (error) return null;
    if (!data) return { found: false, analysis: createEmptyStoredAnalysis() };
    return { found: true, analysis: sanitizeStoredAnalysis(data.moves) };
  } catch {
    return null;
  }
}

export async function saveAnalysisOfflineFirst(
  scopeKey: string,
  analysis: StoredGameAnalysis,
): Promise<{ local: boolean; cloud: boolean; pending: boolean }> {
  writeLocalAnalysis(scopeKey, analysis);
  markScopePendingSync(scopeKey);
  const cloudOk = await upsertScopeToCloud(scopeKey, analysis);
  if (cloudOk) {
    clearScopePendingSync(scopeKey);
    return { local: true, cloud: true, pending: false };
  }
  return { local: true, cloud: false, pending: true };
}

export async function flushPendingSync(): Promise<{ synced: number; remaining: number }> {
  if (!hasSupabaseConfig() || !isBrowserOnline()) {
    return { synced: 0, remaining: getPendingSyncScopes().length };
  }
  if (flushingPromise) {
    await flushingPromise;
    return { synced: 0, remaining: getPendingSyncScopes().length };
  }

  let synced = 0;
  flushingPromise = (async () => {
    const scopes = getPendingSyncScopes();
    for (const scopeKey of scopes) {
      if (!isBrowserOnline()) break;
      // Support both standard game/timeline analyses and study-board mark maps.
      let payload: unknown = null;
      if (scopeKey.startsWith("study-marks:")) {
        payload = readRawStudyMarks(scopeKey);
      } else {
        payload = readLocalAnalysis(scopeKey);
      }
      const ok = await upsertScopeToCloud(scopeKey, payload);
      if (ok) {
        clearScopePendingSync(scopeKey);
        synced++;
      }
    }
  })();

  try {
    await flushingPromise;
  } finally {
    flushingPromise = null;
  }

  return { synced, remaining: getPendingSyncScopes().length };
}

export function registerOfflineAutoSync(): void {
  if (typeof window === "undefined") return;
  if (!autoSyncRegistered) {
    autoSyncRegistered = true;
    window.addEventListener("online", () => {
      void flushPendingSync();
    });
  }
  if (isBrowserOnline() && getPendingSyncScopes().length > 0) {
    void flushPendingSync();
  }
}

// ---------- Backward-compatible wrappers & study-board marks ----------

export function readLocalVariations(gameId: string): SavedVarNode[] {
  return readLocalAnalysis(`game:${gameId}`).variations;
}

export function writeLocalVariations(gameId: string, nodes: SavedVarNode[]): void {
  const prev = readLocalAnalysis(`game:${gameId}`);
  writeLocalAnalysis(`game:${gameId}`, {
    version: 2,
    updatedAt: new Date().toISOString(),
    variations: nodes,
    mainAnnotations: prev.mainAnnotations,
  });
}

export function hasPendingCloudSync(gameId: string): boolean {
  return isScopePendingSync(`game:${gameId}`);
}

export async function persistVariations(
  gameId: string,
  nodes: SavedVarNode[],
): Promise<{ local: boolean; cloud: boolean }> {
  const prev = readLocalAnalysis(`game:${gameId}`);
  const res = await saveAnalysisOfflineFirst(`game:${gameId}`, {
    version: 2,
    updatedAt: new Date().toISOString(),
    variations: nodes,
    mainAnnotations: prev.mainAnnotations,
  });
  return { local: res.local, cloud: res.cloud };
}

// Marks map keyed by PgnNode id (for static study boards like /arcangel).
export type StudyMarksMap = Record<string, NodeAnnotation>;

export function sanitizeStudyMarksMap(raw: unknown): StudyMarksMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: StudyMarksMap = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!/^\d+$/.test(k)) continue;
    const ann = sanitizeAnnotation(v);
    if (ann) out[k] = ann;
  }
  return out;
}

function readRawStudyMarks(scopeKey: string): StudyMarksMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${ANALYSIS_STORAGE_PREFIX}${scopeKey}`);
    if (!raw) return {};
    return sanitizeStudyMarksMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function readStudyMarks(scopeKey: string): StudyMarksMap {
  return readRawStudyMarks(scopeKey);
}

export async function saveStudyMarksOfflineFirst(
  scopeKey: string,
  marks: StudyMarksMap,
): Promise<{ local: boolean; cloud: boolean; pending: boolean }> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(`${ANALYSIS_STORAGE_PREFIX}${scopeKey}`, JSON.stringify(marks));
    } catch {
      // Ignorar.
    }
  }
  markScopePendingSync(scopeKey);
  const ok = await upsertScopeToCloud(scopeKey, marks);
  if (ok) {
    clearScopePendingSync(scopeKey);
    return { local: true, cloud: true, pending: false };
  }
  return { local: true, cloud: false, pending: true };
}

export async function fetchCloudStudyMarks(
  scopeKey: string,
): Promise<{ found: boolean; marks: StudyMarksMap } | null> {
  if (!hasSupabaseConfig() || !isBrowserOnline()) return null;
  try {
    const { data, error } = await supabase
      .from("diagram_positions")
      .select("moves")
      .eq("key", scopeKey)
      .maybeSingle();
    if (error) return null;
    if (!data) return { found: false, marks: {} };
    return { found: true, marks: sanitizeStudyMarksMap(data.moves) };
  } catch {
    return null;
  }
}
