import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Chess, type Square } from "chess.js";
import {
  ArrowUpDown,
  BookmarkCheck,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  CornerLeftUp,
  MessageSquarePlus,
  Pause,
  Play,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { AnalysisPanel } from "./AnalysisPanel";
import { InteractiveBoard, PgnMarksToolbar, type BoardToolMode } from "./PgnBoard";
import {
  branchHasUnsavedNodes,
  buildGameTree,
  clearNodeBoardMarks,
  countVariationBranches,
  createEmptyStoredAnalysis,
  describeLine,
  extractMainAnnotations,
  extractStoredAnalysis,
  extractVarNodes,
  fetchCloudAnalysis,
  getDraftRootId,
  getGameId,
  getGameScopeKey,
  getLineEndId,
  getMainlineBranchId,
  getMainlineContinuationId,
  getMoveLabel,
  getVariationChildrenIds,
  getVariationSegmentRootId,
  hasStoredAnalysisContent,
  isScopePendingSync,
  listSavedVariations,
  markAllDraftsSaved,
  markSubtreeSaved,
  playMoveInTree,
  readLocalAnalysis,
  registerOfflineAutoSync,
  removeAllDrafts,
  removeSubtree,
  saveAnalysisOfflineFirst,
  setVariationComment,
  toggleBoardArrow,
  toggleBoardSquare,
  toggleMoveNag,
  writeLocalAnalysis,
  type ArrowMark,
  type BoardMarkColor,
  type Game,
  type GameTree,
  type MoveNode,
  type NodeAnnotation,
  type SquareMark,
  type VarNodeInput,
} from "@/lib/game-variants";

export type { Game };

function mergeMainAnnotations(
  savedMain: Record<string, NodeAnnotation>,
  tree: GameTree | undefined,
): Record<string, NodeAnnotation> {
  if (!tree) return savedMain;
  return {
    ...savedMain,
    ...extractMainAnnotations(tree),
  };
}

export function GameViewer({ game }: { game: Game }) {
  const gameId = useMemo(() => getGameId(game), [game]);
  const scopeKey = useMemo(() => getGameScopeKey(game), [game]);

  const [treesByGame, setTreesByGame] = useState<Record<string, GameTree>>({});
  const [curByGame, setCurByGame] = useState<Record<string, string>>({});
  const hydratedRef = useRef<Set<string>>(new Set());

  const tree = useMemo(
    () => treesByGame[gameId] ?? buildGameTree(game),
    [treesByGame, gameId, game],
  );
  const rawCurId = curByGame[gameId] ?? tree.rootId;
  const node: MoveNode = tree.nodes[rawCurId] ?? tree.nodes[tree.rootId]!;
  const curId = node.id;

  const [auto, setAuto] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [toolMode, setToolMode] = useState<BoardToolMode>("move");
  const [markColor, setMarkColor] = useState<BoardMarkColor>("G");

  const setCurrentTree = (nextTree: GameTree, nextCurId?: string) => {
    setTreesByGame((prev) => ({ ...prev, [gameId]: nextTree }));
    if (nextCurId !== undefined) {
      setCurByGame((prev) => ({ ...prev, [gameId]: nextCurId }));
    }
  };

  const setCurId = useCallback(
    (nextCurId: string) => {
      setCurByGame((prev) => ({ ...prev, [gameId]: nextCurId }));
    },
    [gameId],
  );

  // Reset transient UI controls when switching between games.
  useEffect(() => {
    setAuto(false);
    setSelected(null);
    setPendingPromo(null);
    setStatusMsg("");
    setEditingNote(false);
    setConfirmDeleteId(null);
    setConfirmReset(false);
  }, [gameId]);

  // Clear square selection & transient prompts when changing move node.
  useEffect(() => {
    setSelected(null);
    setPendingPromo(null);
    setEditingNote(false);
    setConfirmDeleteId(null);
    setConfirmReset(false);
    setNoteInput(node.isMainline ? "" : (node.comment ?? ""));
  }, [curId, node.isMainline, node.comment]);

  // Listen to background sync status updates for this game.
  useEffect(() => {
    registerOfflineAutoSync();
    setPendingSync(isScopePendingSync(scopeKey));

    const onSyncChange = (ev: Event) => {
      const detail = (ev as CustomEvent<{ scopeKey?: string; pending?: boolean }>).detail;
      if (detail?.scopeKey === scopeKey) {
        setPendingSync(Boolean(detail.pending));
        if (!detail.pending) {
          setStatusMsg("Cambios locales sincronizados automáticamente con la nube.");
        }
      }
    };
    window.addEventListener("chess-school:sync-change", onSyncChange);
    return () => window.removeEventListener("chess-school:sync-change", onSyncChange);
  }, [scopeKey]);

  // Load saved variations & annotations after mount (prevents SSR hydration mismatch) and sync with cloud.
  useEffect(() => {
    let cancelled = false;
    const localSaved = readLocalAnalysis(scopeKey);

    const mergeSavedIntoTree = (
      savedNodes: VarNodeInput[],
      savedMain: Record<string, NodeAnnotation>,
    ) => {
      setTreesByGame((prev) => {
        const existing = prev[gameId];
        const drafts: VarNodeInput[] = existing
          ? extractVarNodes(existing).filter((v) => !existing.nodes[v.id]?.saved)
          : [];
        const combined: VarNodeInput[] = [
          ...savedNodes.map((n) => ({ ...n, saved: true })),
          ...drafts.map((n) => ({ ...n, saved: false })),
        ];
        return {
          ...prev,
          [gameId]: buildGameTree(game, combined, mergeMainAnnotations(savedMain, existing)),
        };
      });
    };

    if (!hydratedRef.current.has(gameId) && hasStoredAnalysisContent(localSaved)) {
      mergeSavedIntoTree(localSaved.variations, localSaved.mainAnnotations);
    }
    hydratedRef.current.add(gameId);

    void (async () => {
      if (isScopePendingSync(scopeKey)) {
        const synced = await saveAnalysisOfflineFirst(scopeKey, localSaved);
        if (!cancelled) {
          setPendingSync(synced.pending);
          if (synced.cloud) {
            setStatusMsg("Análisis locales sincronizados con la nube.");
          }
        }
        return;
      }

      const cloud = await fetchCloudAnalysis(scopeKey);
      if (cancelled || !cloud) return;

      if (cloud.found) {
        writeLocalAnalysis(scopeKey, cloud.analysis);
        mergeSavedIntoTree(cloud.analysis.variations, cloud.analysis.mainAnnotations);
        setPendingSync(false);
      } else if (hasStoredAnalysisContent(localSaved)) {
        const synced = await saveAnalysisOfflineFirst(scopeKey, localSaved);
        if (!cancelled) setPendingSync(synced.pending);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameId, scopeKey, game]);

  const chess = useMemo(() => new Chess(node.fen), [node.fen]);

  const legalTargets = useMemo(() => {
    const map = new Map<string, { captured: boolean; promotion: boolean }>();
    if (!selected) return map;
    for (const mv of chess.moves({ square: selected, verbose: true })) {
      const prev = map.get(mv.to);
      map.set(mv.to, {
        captured: Boolean(mv.captured) || Boolean(prev?.captured),
        promotion: Boolean(mv.promotion) || Boolean(prev?.promotion),
      });
    }
    return map;
  }, [chess, selected]);

  const nextStepId = useMemo(
    () => (node.isMainline ? getMainlineContinuationId(tree, node.id) : node.children[0]),
    [tree, node],
  );

  // Auto-playback follows the active line (mainline or current variation).
  useEffect(() => {
    if (!auto) return;
    if (!nextStepId) {
      setAuto(false);
      return;
    }
    const t = setTimeout(() => setCurId(nextStepId), 1100);
    return () => clearTimeout(t);
  }, [auto, nextStepId, setCurId]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowRight") {
        if (nextStepId) setCurId(nextStepId);
      } else if (e.key === "ArrowLeft") {
        if (node.parentId) setCurId(node.parentId);
      } else if (e.key === "ArrowUp" || e.key === "Home") {
        setCurId(tree.rootId);
      } else if (e.key === "ArrowDown" || e.key === "End") {
        setCurId(getLineEndId(tree, node.id));
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nextStepId, node.parentId, node.id, tree, setCurId]);

  const executeMove = (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
    const result = playMoveInTree(tree, node.id, { from, to, promotion });
    if (!result) return;
    setCurrentTree(result.nextTree, result.nextId);
    setSelected(null);
    setPendingPromo(null);
    if (result.created) {
      setStatusMsg("");
    }
  };

  const handleSquareClick = (name: string) => {
    setAuto(false);
    setPendingPromo(null);

    if (selected && legalTargets.has(name)) {
      const info = legalTargets.get(name)!;
      if (info.promotion) {
        setPendingPromo({ from: selected, to: name as Square });
        return;
      }
      executeMove(selected, name as Square);
      return;
    }

    const piece = chess.get(name as Square);
    if (piece && piece.color === chess.turn()) {
      setSelected(selected === name ? null : (name as Square));
    } else {
      setSelected(null);
    }
  };

  const persistTree = async (nextTree: GameTree, successLabel: string) => {
    const payload = extractStoredAnalysis(nextTree);
    const res = await saveAnalysisOfflineFirst(scopeKey, payload);
    setPendingSync(res.pending);
    setStatusMsg(
      res.cloud
        ? `${successLabel} (guardado en este equipo y en la nube).`
        : `${successLabel} (guardado localmente · se sincronizará al volver internet).`,
    );
  };

  const handleToggleNag = (nag: string) => {
    if (node.ply === 0) return;
    const nextTree = toggleMoveNag(tree, node.id, nag);
    setCurrentTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Signo PGN actualizado");
    } else {
      setStatusMsg("Signo PGN añadido al borrador.");
    }
  };

  const handleToggleArrow = (arrow: ArrowMark) => {
    const nextTree = toggleBoardArrow(tree, node.id, arrow);
    setCurrentTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Flecha actualizada");
    } else {
      setStatusMsg("Flecha añadida al borrador.");
    }
  };

  const handleToggleSquare = (mark: SquareMark) => {
    const nextTree = toggleBoardSquare(tree, node.id, mark);
    setCurrentTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Casilla marcada");
    } else {
      setStatusMsg("Casilla añadida al borrador.");
    }
  };

  const handleClearBoardMarks = () => {
    const nextTree = clearNodeBoardMarks(tree, node.id);
    setCurrentTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Marcas limpiadas");
    } else {
      setStatusMsg("Marcas del borrador limpiadas.");
    }
  };

  const handleSaveCurrentVariation = async () => {
    let workingTree = tree;
    if (editingNote && !node.isMainline) {
      workingTree = setVariationComment(workingTree, node.id, noteInput);
      setEditingNote(false);
    }
    const draftRootId = getDraftRootId(workingTree, node.id);
    if (!draftRootId) {
      const nextTree = markSubtreeSaved(workingTree, node.id);
      setCurrentTree(nextTree);
      await persistTree(nextTree, "Variante grabada en la partida");
      return;
    }
    const nextTree = markSubtreeSaved(workingTree, draftRootId);
    setCurrentTree(nextTree);
    await persistTree(nextTree, "Variante grabada en la partida");
  };

  const handleSaveAllDrafts = async () => {
    const nextTree = markAllDraftsSaved(tree);
    setCurrentTree(nextTree);
    await persistTree(nextTree, "Todas las variantes grabadas en la partida");
  };

  const handleDiscardCurrentDraft = () => {
    const draftRootId = getDraftRootId(tree, node.id);
    if (!draftRootId) return;
    const { nextTree, fallbackId } = removeSubtree(tree, draftRootId);
    setCurrentTree(nextTree, fallbackId);
    setStatusMsg("Borrador descartado.");
  };

  const handleDiscardAllDrafts = () => {
    const { nextTree, fallbackId } = removeAllDrafts(tree, node.id);
    setCurrentTree(nextTree, fallbackId);
    setStatusMsg("Borradores descartados.");
  };

  const handleDeleteSavedVariation = async (segmentRootId: string) => {
    const { nextTree, fallbackId } = removeSubtree(tree, segmentRootId);
    setCurrentTree(nextTree, fallbackId);
    setConfirmDeleteId(null);
    await persistTree(nextTree, "Variante eliminada de la partida");
  };

  const handleRestoreOriginalGame = async () => {
    const cleanTree = buildGameTree(game);
    setCurrentTree(cleanTree, node.isMainline ? node.id : cleanTree.rootId);
    setConfirmReset(false);
    const res = await saveAnalysisOfflineFirst(scopeKey, createEmptyStoredAnalysis());
    setPendingSync(res.pending);
    setStatusMsg(
      res.cloud
        ? "Partida restaurada a su forma original intacta (y sincronizada)."
        : "Partida restaurada a su forma original intacta en este equipo.",
    );
  };

  const handleSaveNote = async () => {
    if (node.isMainline) return;
    const nextTree = setVariationComment(tree, node.id, noteInput);
    setCurrentTree(nextTree);
    setEditingNote(false);
    if (node.saved) {
      await persistTree(nextTree, "Nota actualizada");
    } else {
      setStatusMsg(
        "Nota añadida al borrador. Pulsa «Guardar variante» para fijarla en la partida.",
      );
    }
  };

  // Determine the note to display in the main commentary box.
  let activeNote = game.intro;
  if (node.isMainline) {
    let walk: MoveNode | undefined = node;
    while (walk && walk.ply > 0) {
      if (walk.comment) {
        activeNote = walk.comment;
        break;
      }
      walk = walk.parentId ? tree.nodes[walk.parentId] : undefined;
    }
  } else {
    activeNote =
      node.comment ||
      "Jugada fuera de la partida original. Sigue moviendo piezas para explorar o guárdala como variante de análisis.";
  }

  const { savedCount, draftCount } = useMemo(() => countVariationBranches(tree), [tree]);
  const savedSummaries = useMemo(() => listSavedVariations(tree), [tree]);
  const hasSavedAnnotations = useMemo(
    () => savedCount > 0 || Object.keys(extractMainAnnotations(tree)).length > 0,
    [savedCount, tree],
  );
  const draftRootId = useMemo(() => getDraftRootId(tree, node.id), [tree, node.id]);
  const segmentRootId = useMemo(() => getVariationSegmentRootId(tree, node.id), [tree, node.id]);
  const branchHasDrafts = useMemo(
    () => !node.isMainline && (Boolean(draftRootId) || branchHasUnsavedNodes(tree, node.id)),
    [tree, node.id, node.isMainline, draftRootId],
  );
  const continuationIds = useMemo(() => {
    if (!node.isMainline) return node.children;
    const mainNext = getMainlineContinuationId(tree, node.id);
    const vars = getVariationChildrenIds(tree, node.id);
    return mainNext ? [mainNext, ...vars] : vars;
  }, [tree, node]);

  const btn =
    "rounded-md border border-border bg-muted p-2 text-primary hover:bg-wood disabled:opacity-40";
  const firstMainId = getMainlineContinuationId(tree, tree.rootId);
  const rootExtraVars = getVariationChildrenIds(tree, tree.rootId);

  const renderMoveAnnotations = (n: MoveNode) => {
    const hasBoardMarks = n.arrows.length > 0 || n.squares.length > 0;
    return (
      <>
        {n.nags.length > 0 && (
          <span className="ml-0.5 font-bold text-primary">{n.nags.join("")}</span>
        )}
        {hasBoardMarks && (
          <span
            className="ml-0.5 inline-block text-[10px] text-primary"
            title="Posición con flechas o casillas marcadas"
          >
            ◆
          </span>
        )}
      </>
    );
  };

  const renderVariationTree = (startId: string, depth: number): ReactNode[] => {
    const out: ReactNode[] = [];
    let id: string | undefined = startId;
    let force = true;

    while (id !== undefined) {
      const n: MoveNode | undefined = tree.nodes[id];
      if (!n) break;

      const isCurrent = curId === n.id;
      out.push(
        <span key={`vn-${n.id}`}>
          <span className="text-muted-foreground">{getMoveLabel(n, force)}</span>
          <button
            type="button"
            onClick={() => setCurId(n.id)}
            className={`rounded px-1 ${
              isCurrent
                ? "bg-primary text-primary-foreground"
                : n.comment
                  ? "text-primary underline decoration-dotted"
                  : "hover:bg-secondary/60"
            }`}
          >
            {n.san}
            {renderMoveAnnotations(n)}
          </button>{" "}
          {n.comment && (
            <span className="font-sans text-xs italic text-muted-foreground">{n.comment} </span>
          )}
        </span>,
      );
      force = Boolean(n.comment);

      const parent = n.parentId ? tree.nodes[n.parentId] : undefined;
      if (
        parent &&
        !parent.isMainline &&
        parent.children[0] === n.id &&
        parent.children.length > 1
      ) {
        for (const subId of parent.children.slice(1)) {
          const subNode = tree.nodes[subId];
          if (!subNode) continue;
          out.push(
            <div
              key={`sub-${subId}`}
              className={`my-1 rounded-r border-l-2 py-1 pl-3 ${
                subNode.saved
                  ? "border-primary/70 bg-secondary/40"
                  : "border-dashed border-accent bg-accent/20"
              }`}
              style={{ marginLeft: Math.min(depth + 1, 3) * 8 }}
            >
              <span className="text-muted-foreground">( </span>
              {renderVariationTree(subId, depth + 1)}
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

  const renderMainline = (): ReactNode[] => {
    const out: ReactNode[] = [];

    if (!firstMainId && rootExtraVars.length > 0) {
      for (const vid of rootExtraVars) {
        const vNode = tree.nodes[vid];
        if (!vNode) continue;
        out.push(
          <div
            key={`rv-${vid}`}
            className={`my-1.5 rounded-r border-l-2 py-1.5 pl-3 ${
              vNode.saved
                ? "border-primary/70 bg-secondary/40"
                : "border-dashed border-accent bg-accent/20"
            }`}
          >
            <span className="mr-1.5 inline-block rounded bg-card px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
              {vNode.saved ? "Análisis" : "Borrador"}
            </span>
            {renderVariationTree(vid, 0)}
          </div>,
        );
      }
      return out;
    }

    let id: string | undefined = firstMainId;
    let force = false;
    while (id !== undefined) {
      const n: MoveNode | undefined = tree.nodes[id];
      if (!n) break;

      const isCurrent = curId === n.id;
      const showLabel = n.ply % 2 === 1 || force;
      out.push(
        <span key={`mn-${n.id}`}>
          {showLabel && <span className="text-muted-foreground">{getMoveLabel(n, true)}</span>}
          <button
            type="button"
            onClick={() => setCurId(n.id)}
            className={`rounded px-1 ${
              isCurrent
                ? "bg-primary text-primary-foreground"
                : n.comment
                  ? "text-primary underline decoration-dotted"
                  : "hover:bg-secondary/60"
            }`}
          >
            {n.san}
            {renderMoveAnnotations(n)}
          </button>{" "}
        </span>,
      );

      const parent = n.parentId ? tree.nodes[n.parentId] : undefined;
      const siblingVars = parent ? getVariationChildrenIds(tree, parent.id) : [];
      const nextMainId = getMainlineContinuationId(tree, n.id);
      const endVars = !nextMainId ? getVariationChildrenIds(tree, n.id) : [];

      for (const vid of siblingVars) {
        const vNode = tree.nodes[vid];
        if (!vNode) continue;
        out.push(
          <div
            key={`v-${vid}`}
            className={`my-1.5 rounded-r border-l-2 py-1.5 pl-3 ${
              vNode.saved
                ? "border-primary/70 bg-secondary/40"
                : "border-dashed border-accent bg-accent/20"
            }`}
          >
            <span className="mr-1.5 inline-block rounded bg-card px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
              {vNode.saved ? "Análisis" : "Borrador"}
            </span>
            {renderVariationTree(vid, 0)}
          </div>,
        );
      }

      force = siblingVars.length > 0;

      if (endVars.length > 0) {
        for (const vid of endVars) {
          const vNode = tree.nodes[vid];
          if (!vNode) continue;
          out.push(
            <div
              key={`ev-${vid}`}
              className={`my-1.5 rounded-r border-l-2 py-1.5 pl-3 ${
                vNode.saved
                  ? "border-primary/70 bg-secondary/40"
                  : "border-dashed border-accent bg-accent/20"
              }`}
            >
              <span className="mr-1.5 inline-block rounded bg-card px-1.5 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-primary">
                {vNode.saved ? "Análisis" : "Borrador"}
              </span>
              {renderVariationTree(vid, 0)}
            </div>,
          );
        }
      }

      id = nextMainId;
    }

    return out;
  };

  const lastMainId = tree.mainIds[tree.mainIds.length - 1];
  const turnSide = chess.turn() === "w" ? "Blancas" : "Negras";
  const isCheckmateOrStalemate = chess.isGameOver();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_1fr]">
      <div className="space-y-3">
        <InteractiveBoard
          fen={node.fen}
          flipped={flipped}
          selected={selected}
          lastMove={node.from && node.to ? { from: node.from, to: node.to } : null}
          legalTargets={legalTargets}
          arrows={node.arrows}
          squares={node.squares}
          toolMode={toolMode}
          markColor={markColor}
          pendingPromo={pendingPromo}
          onSelectPromotion={(from, to, piece) => executeMove(from, to, piece)}
          onCancelPromotion={() => setPendingPromo(null)}
          onSquareClick={handleSquareClick}
          onToggleArrow={handleToggleArrow}
          onToggleSquare={handleToggleSquare}
        />

        <div className="flex flex-wrap items-center justify-center gap-2 print:hidden">
          <button
            type="button"
            className={btn}
            aria-label="Inicio"
            onClick={() => setCurId(tree.rootId)}
            disabled={curId === tree.rootId}
          >
            <ChevronFirst />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Anterior"
            onClick={() => node.parentId && setCurId(node.parentId)}
            disabled={!node.parentId}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={btn}
            aria-label={auto ? "Pausa" : "Reproducir"}
            onClick={() => setAuto(!auto)}
            disabled={!nextStepId && !auto}
          >
            {auto ? <Pause /> : <Play />}
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Siguiente"
            onClick={() => nextStepId && setCurId(nextStepId)}
            disabled={!nextStepId}
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Final"
            onClick={() => setCurId(getLineEndId(tree, node.id))}
            disabled={!nextStepId}
          >
            <ChevronLast />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Salir de variante"
            title="Volver a la partida principal"
            onClick={() => setCurId(getMainlineBranchId(tree, node.id))}
            disabled={node.isMainline}
          >
            <CornerLeftUp />
          </button>
          <button
            type="button"
            className={btn}
            aria-label="Girar tablero"
            title="Girar tablero"
            onClick={() => setFlipped((f) => !f)}
          >
            <ArrowUpDown />
          </button>
        </div>

        <PgnMarksToolbar
          toolMode={toolMode}
          onToolModeChange={setToolMode}
          markColor={markColor}
          onMarkColorChange={setMarkColor}
          hasBoardMarks={node.arrows.length > 0 || node.squares.length > 0}
          onClearBoardMarks={handleClearBoardMarks}
          activeNags={node.nags}
          canEditNag={node.ply > 0}
          onToggleNag={handleToggleNag}
        />

        <p className="text-center text-xs text-muted-foreground print:hidden">
          {isCheckmateOrStalemate
            ? "Posición final · no hay jugadas legales."
            : `Turno: ${turnSide} · Toca una pieza en el tablero para probar jugadas fuera de la partida.`}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="print:hidden">
          <AnalysisPanel fen={node.fen} />
        </div>

        <div className="rounded-lg border border-primary/50 bg-muted p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-xs tracking-widest text-primary">
              {curId === tree.rootId
                ? "Posición inicial"
                : node.isMainline
                  ? `Jugada ${getMoveLabel(node, true)}${node.san}${node.nags.join("")}`
                  : `Variante de análisis · ${getMoveLabel(node, true)}${node.san}${node.nags.join("")}`}
            </p>
            {!node.isMainline && (
              <span className="rounded-full border border-primary/60 px-2.5 py-0.5 font-mono text-[11px] text-primary">
                {branchHasDrafts ? "Borrador sin guardar" : "Variante guardada"}
              </span>
            )}
          </div>
          <p className="mt-2 text-lg leading-snug">{activeNote}</p>
        </div>

        {(!node.isMainline ||
          draftCount > 0 ||
          savedSummaries.length > 0 ||
          hasSavedAnnotations ||
          pendingSync ||
          Boolean(statusMsg)) && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-4 text-sm print:hidden">
            {!node.isMainline && (
              <div className="flex flex-wrap items-center gap-2">
                {branchHasDrafts ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSaveCurrentVariation()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                    >
                      <Save className="h-3.5 w-3.5" /> Guardar variante en la partida
                    </button>
                    {draftRootId && (
                      <button
                        type="button"
                        onClick={handleDiscardCurrentDraft}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Descartar borrador
                      </button>
                    )}
                  </>
                ) : (
                  segmentRootId && (
                    <>
                      {confirmDeleteId === segmentRootId ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-1.5">
                          <span className="text-xs font-semibold text-destructive">
                            ¿Borrar variante ({describeLine(tree, segmentRootId, 3)})?
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDeleteSavedVariation(segmentRootId)}
                            className="rounded bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground"
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(segmentRootId)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:border-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Eliminar variante
                        </button>
                      )}
                    </>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setEditingNote((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary"
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />{" "}
                  {node.comment ? "Editar nota" : "Añadir nota"}
                </button>
              </div>
            )}

            {editingNote && !node.isMainline && (
              <div className="flex flex-wrap gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleSaveNote();
                    }
                  }}
                  placeholder="Escribe una explicación para esta jugada…"
                  aria-label="Nota de la variante"
                  className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveNote()}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                >
                  Guardar nota
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNote(false)}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground"
                >
                  Cancelar
                </button>
              </div>
            )}

            {node.isMainline && draftCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-accent bg-accent/20 px-3 py-2">
                <span className="text-xs font-semibold text-foreground">
                  Tienes {draftCount} {draftCount === 1 ? "variante" : "variantes"} de análisis sin
                  guardar en esta partida.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSaveAllDrafts()}
                    className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground"
                  >
                    <Save className="h-3 w-3" /> Guardar todo
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardAllDrafts}
                    className="rounded border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            )}

            {savedSummaries.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wider text-primary">
                  <BookmarkCheck className="h-3.5 w-3.5" /> Variantes guardadas (
                  {savedSummaries.length}):
                </span>
                {savedSummaries.map((s) => (
                  <button
                    key={s.rootId}
                    type="button"
                    onClick={() => setCurId(s.rootId)}
                    className={`rounded-md border px-2 py-0.5 font-mono text-xs transition ${
                      segmentRootId === s.rootId
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/40 bg-secondary/50 text-foreground hover:border-primary"
                    }`}
                  >
                    tras {s.anchorLabel}: {s.preview}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {pendingSync ? (
                  <>
                    <CloudOff className="h-3.5 w-3.5 text-primary" />
                    Guardado localmente · pendiente de nube
                  </>
                ) : (
                  <>
                    <Cloud className="h-3.5 w-3.5 text-primary" />
                    Partida original intacta
                  </>
                )}
              </span>

              {hasSavedAnnotations &&
                (confirmReset ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-destructive">
                      ¿Borrar todas tus variantes y marcas de esta partida?
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleRestoreOriginalGame()}
                      className="rounded bg-destructive px-2 py-0.5 font-bold text-destructive-foreground"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="rounded border border-border bg-card px-2 py-0.5 text-foreground"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 font-semibold text-muted-foreground hover:border-destructive hover:text-destructive"
                  >
                    <RotateCcw className="h-3 w-3" /> Restaurar original
                  </button>
                ))}
            </div>

            {statusMsg && (
              <p className="text-xs font-semibold text-primary" aria-live="polite">
                {statusMsg}
              </p>
            )}
          </div>
        )}

        {continuationIds.length > 1 && (
          <div className="rounded-lg border border-primary/40 bg-card p-3 text-sm print:hidden">
            <p className="font-display text-xs uppercase tracking-widest text-primary">
              Alternativas aquí
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {continuationIds.map((cid) => {
                const c = tree.nodes[cid];
                if (!c) return null;
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => setCurId(cid)}
                    className={`rounded border px-2.5 py-1 font-mono text-xs ${
                      c.isMainline
                        ? "border-primary font-bold text-primary hover:bg-secondary/40"
                        : c.saved
                          ? "border-primary/50 bg-secondary/40 text-foreground hover:border-primary"
                          : "border-dashed border-accent bg-accent/20 text-foreground hover:border-primary"
                    }`}
                  >
                    {getMoveLabel(c, true)}
                    {c.san}
                    {c.nags.join("")}{" "}
                    <span className="font-sans opacity-75">
                      · {c.isMainline ? "partida" : c.saved ? "análisis" : "borrador"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border bg-card p-4 font-mono text-sm leading-7">
          {renderMainline()}
          <span className="font-semibold text-primary">
            {curId === lastMainId ? game.result : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
