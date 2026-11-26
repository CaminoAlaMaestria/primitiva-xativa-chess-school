import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Chess, type Square } from "chess.js";
import {
  ArrowUpDown,
  BookmarkCheck,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Compass,
  CornerLeftUp,
  Eye,
  Lightbulb,
  Lock,
  MessageSquarePlus,
  RotateCcw,
  Save,
  Trash2,
  ArrowRight,
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

export type Milestone = {
  year: string;
  title: string;
  text: string;
  game: string;
  moves: string;
  solution: string;
  question: string;
  hint: string;
  success: string;
  options?: string[];
  answer?: number;
};

export const MILESTONES: Milestone[] = [
  {
    year: "1969",
    title: "Campeón mundial juvenil",
    text: "Con 18 años, Kárpov gana el Mundial juvenil de Estocolmo y anuncia al mundo que viene una nueva estrella soviética.",
    game: "Kárpov – Payrhuber · Estocolmo 1969",
    moves:
      "e4 c5 Nf3 d6 g3 Nf6 d3 Nc6 Bg2 g6 O-O Bg7 Re1 O-O c3 Ne8 Na3 f5 Ng5 Nc7 Qb3+ Kh8 exf5 Bxf5",
    solution: "Nf7+",
    question:
      "Juegan las blancas. El joven Kárpov remató esta miniatura en 15 jugadas. ¿Cómo castigó la debilidad del enroque negro?",
    hint: "Pista: el caballo de g5 tiene un jaque que obliga a la torre a cambiarse… y entonces la dama se la come.",
    success:
      "¡13.Cf7+! La torre debe capturar el caballo y la dama blanca se la come. Karpov ganó material y la partida poco después.",
  },
  {
    year: "1974",
    title: "Oro en la Olimpiada de Niza",
    text: "Camino del título, Kárpov brilla en la Olimpiada de Niza con la URSS y firma una de sus partidas modelo contra Unzicker.",
    game: "Kárpov – Unzicker · Olimpiada de Niza 1974",
    moves:
      "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Nc6 d5 Nd8 a4 Rb8 axb5 axb5 b4 Nb7 Nf1 Bd7 Be3 Ra8 Qd2 Rfc8 Bd3 g6 Ng3 Bf8 Ra2 c4 Bb1 Qd8",
    solution: "Ba7",
    question:
      "Juegan las blancas. Kárpov encontró una maniobra que paralizó a las torres negras para el resto de la partida. ¿Cuál?",
    hint: "Pista: un alfil se cuela por la columna 'a' hasta la séptima fila, clavando a la torre de a8.",
    success:
      "¡24.Aa7! El alfil se instala en a7 y las torres negras quedan esposadas. La lección de estrategia más famosa de Kárpov.",
  },
  {
    year: "1975",
    title: "Campeón del mundo",
    text: "Fischer no defiende la corona y Kárpov se convierte en el 12.º campeón mundial. En Milán, su primer gran torneo como campeón, demuestra que el título le queda grande a cualquiera… menos a él.",
    game: "Kárpov – Gligóric · Milán 1975",
    moves:
      "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d6 h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 Nb6 Qe2 Nxa4 Bxa4 bxa4 Rxa4 Bg7 c4 Bc8 Bd2 Rb8 Rb1 Re7 Ne1 Reb7 Nd3 Rb3 Rba1 Ne8 Bc3 Qh4 R1a3 f5 Be1 Qe7 Rxb3 Rxb3 Nc1 Rb8 Nd3 Rb3 f3 Qg5 Kh2 Nf6 Qc2 Rb8 b4 fxe4 Nxe4 Nxe4 fxe4 Qe3 bxc5 Qxe4 cxd6 Bf5 Ra3 Rc8 Rc3 Bf8 Bf2 Bxd6 Qa2 a5 c5 Bd7 Ra3 Bb5 cxd6 Bxd3 d7 Rd8",
    solution: "Rxd3",
    question:
      "Juegan las blancas. El peón de dama de Kárpov está a dos pasos de coronar, pero el alfil de d3 lo vigila. ¿Cómo lo resolvió el campeón?",
    hint: "Pista: a veces la torre vale menos que un peón a punto de coronar. La torre de a3 puede entregarse.",
    success:
      "¡48.Txd3! Tras Dxd3 llega 49.d6+ y el peón decide la partida. Gligóric se rindió unas jugadas después.",
  },
  {
    year: "1978",
    title: "Baguio: retiene la corona ante Korchnói",
    text: "En el match más tenso de la historia, contra el desertor Korchnói, Kárpov gana la partida 32 y retiene el título por 6–5.",
    game: "Kárpov – Korchnói · Baguio 1978, partida 32",
    moves:
      "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c5 d5 Na6 Bf4 Nc7 a4 b6 Re1 Bb7 Bc4 Nh5 Bg5 Nf6 Qd3 a6 Rad1 Rb8 h3 Nd7 Qe3 Ba8 Bh6 b5 Bxg7 Kxg7 Bf1 Nf6 axb5 axb5 Ne2 Bb7 Ng3 Ra8 c3 Ra4 Bd3 Qa8",
    solution: "e5",
    question:
      "Juegan las blancas. Korchnói presiona en el flanco de dama, pero Kárpov golpeó primero en el centro. ¿Con qué ruptura?",
    hint: "Pista: el peón de e4 puede avanzar y romper el centro antes de que las piezas negras se organicen.",
    success:
      "¡25.e5! La ruptura central desorganiza a las negras. Kárpov ganó la partida, el match y conservó la corona del mundo.",
  },
  {
    year: "1981",
    title: "Merano: el título, otra vez ante Korchnói",
    text: "Revancha en Merano: Kárpov arrolla a Korchnói 6–2 y no deja dudas de quién es el campeón.",
    game: "Kárpov – Korchnói · Merano 1981, partida 2",
    moves:
      "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Be7 Qe2 Nd6 Bxc6 bxc6 dxe5 Nb7 Nc3 O-O Re1 Nc5 Be3 Ne6 Rad1 d5 exd6 cxd6 Nd4 Bd7 Nf5 d5 Nxe7+ Qxe7 Qd2 Qh4 Ne2 Rfe8 b3 Re7 Ng3 Qf6 f3 Be8 Ne2 h6 Bf2 Qg6 Nc1 d4 Nd3 Qf6 Bg3 Rd7 Re5 Qd8 Rde1 Rd5 Rxd5 Qxd5 Re5 Qd7 Qe1 Rc8 b4 Qd8 Ra5 Qd7 h3 f6 Rxa7 Qd5 Ra5 Qd7 Ra7 Qd5 Ra5 Qd7 Qe4 Bf7 Qf5 Re8 Kh2 Qb7 a3 Rd8 h4 h5 Nf2 Qd7 Ra6 Qe8 Qa5 Bg6 Nd3 Kh7 Qb6 Rc8 a4 Bf5 a5 c5 bxc5 Bxd3 cxd3 Nxc5",
    solution: "Ra7",
    question:
      "Juegan las blancas. La dama de b6 ya presiona. ¿Qué pieza se suma al ataque invadiendo la séptima fila?",
    hint: "Pista: la torre de a6 puede subir una casilla y apuntar al peón de g7 y al rey.",
    success:
      "¡53.Ta7! La torre invade la séptima y el ataque contra el rey negro es imparable. Kárpov ganó la partida.",
  },
  {
    year: "1984",
    title: "El match sin fin contra Kaspárov",
    text: "En Moscú comienza el primer match de la gran rivalidad: 48 partidas en cinco meses. Kárpov se puso 5–0, como en esta séptima partida.",
    game: "Kárpov – Kaspárov · Moscú 1984, partida 7",
    moves:
      "d4 d5 c4 e6 Nf3 c5 cxd5 exd5 g3 Nf6 Bg2 Be7 O-O O-O Nc3 Nc6 Bg5 cxd4 Nxd4 h6 Be3 Re8 Qb3 Na5 Qc2 Bg4 Nf5 Rc8 Nxe7+ Rxe7 Rad1 Qe8 h3 Bh5",
    solution: "Bxd5",
    question:
      "Juegan las blancas. El peón de d5 parece defendido por el caballo de c6… pero ese caballo está sobrecargado. ¿Qué jugó Kárpov?",
    hint: "Pista: el alfil de g2 puede comerse el peón de d5: si el caballo captura, la torre se lo lleva.",
    success:
      "¡18.Axd5! Kárpov gana un peón limpio: tras Cxd5, Txd5. Ganó la partida y se puso 4–0 en el match.",
  },
  {
    year: "1987",
    title: "Sevilla: 13 millones ante la TVE",
    text: "El cuarto match contra Kaspárov se juega en Sevilla y España lo sigue en directo. Kárpov gana la partida 23 y se pone a un paso de recuperar la corona.",
    game: "Kárpov – Kaspárov · Sevilla 1987, partida 23",
    moves:
      "c4 c5 Nf3 Nf6 Nc3 d5 cxd5 Nxd5 d4 Nxc3 bxc3 g6 e3 Bg7 Bd3 O-O O-O Qc7 Rb1 b6 Qe2 Rd8 Be4 Ba6 c4 Nc6 d5 f5 Bd3 e5 e4 Nd4 Nxd4 cxd4 Bg5 Rf8 Rfc1 Rac8 Bd2 Rf7 a4 fxe4 Qxe4 Rcf8 f3 Bc8 a5 Bf5 Qe2 Re8 Be4 Bf8 Qd3 Bc5 Ra1 Qd7 Re1 Qc8 Kh1 Rc7 Rab1 Kg7 Rec1 Bxe4 fxe4 Rf7 Qg3 bxa5 Bxa5 Rf4 Re1 Qa6 Bd2 Rf7 Qd3 Ref8 h3 Rf2 Ra1 Qf6 Rg1 h5 Ra5 Qe7 Rb1 h4 Ra6 R8f7 Rc6 Qf8 Rg1 Be7 Re6 Kh7 Be1 Rf1 Bd2 Bc5 Rc6 R7f3 gxf3 Rxf3 Rc7+ Kh8",
    solution: "Bh6",
    question:
      "Juegan las blancas. Kaspárov ha sacrificado una torre buscando complicaciones. ¿Qué jugada tranquila deja al rey negro sin respiración?",
    hint: "Pista: el alfil de d2 puede ir a h6 para atacar la dama y amenazar g7.",
    success:
      "¡53.Ah6! Amenaza mate en g7 y gana la dama. Kárpov ganó, aunque Kaspárov empató el match en la última partida.",
  },
  {
    year: "1994",
    title: "Linares: el torneo perfecto",
    text: "Con 42 años, Kárpov hace 11/13 en Linares, 2,5 puntos por delante de Kaspárov: una de las mejores actuaciones de la historia.",
    game: "Kárpov – Topálov · Linares 1994",
    moves:
      "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O Na5 Bd3 b6 Qd2 e5 Bh6 cxd4 Bxg7 Kxg7 cxd4 exd4 Rac1 Qd6 f4 f6 f5 Qe5 Nf4 g5 Nh5+ Kg8 h4 h6 hxg5 hxg5 Rf3 Kf7",
    solution: "Nxf6",
    question:
      "Juegan las blancas. El rey negro se ha quedado sin escudo de peones. ¿Con qué sacrificio lo remató Kárpov?",
    hint: "Pista: el caballo de h5 puede entregarse en f6 para dejar al rey negro completamente desnudo.",
    success:
      "¡24.Cxf6!! El caballo se sacrifica y el rey negro queda cazado en pleno centro. La joya de Linares 1994.",
  },
  {
    year: "1996",
    title: "Elista: campeón FIDE a los 45 años",
    text: "Kárpov vence a Gata Kamsky por 10,5–7,5 y defiende el título mundial de la FIDE con la técnica de siempre.",
    game: "Kárpov – Kamsky · Elista 1996, partida 7",
    moves:
      "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4 Nh5 Re1 h6 Nd2 Nf4 Bf1 a5 bxa5 Rxa5 Nb3 Ra8 c5 f5 cxd6 cxd6 Nd2 g5 Rb1 g4 Qb3 fxe4 Ndxe4 Kh8 Be3 Nf5 Bb6 Qe7 Qb4 Rf7 a4 Bf8 Be3 Nh5 Rbc1 Nf6 Bb6 h5 Nxf6 Qxf6 Ne4 Qg6 a5 Ng7 Bb5 Bf5 Ng3 Bc8 Rc3 h4 Bd3 Nf5 Nxf5 Bxf5 Bxf5 Qxf5 Rc4 Rg7 Qb1 Qh5 Qd1 h3 Ree4 hxg2 Rxg4 Rh7 h4 Be7 f3 Rg8 Bf2 Rhg7 Qe2 Bd8 Be1 Qf7 Qd3 Qh5 Qe4 Qh6 Qf5 Bxa5 Rxg7 Bb6+ Kxg2 Qxg7+ Rg4 Qe7 Qh5+ Qh7",
    solution: "Rxg8+",
    question:
      "Juegan las blancas. Las negras acaban de cubrir el jaque con la dama. ¿Cómo gana Kárpov material decisivo?",
    hint: "Pista: la torre de g4 puede capturar en g8 con jaque.",
    success:
      "¡54.Txg8+! Tras Rxg8 las blancas quedan con una pieza de más. Kárpov ganó y encarriló el match.",
  },
  {
    year: "Final",
    title: "La curiosidad del yogur",
    text: "Último reto: una de las anécdotas más famosas de Kárpov, la del Mundial de Baguio 1978 contra Korchnói.",
    game: "",
    moves: "",
    solution: "",
    question:
      "Durante una partida de Baguio 1978, el equipo de Kárpov le llevó un yogur. ¿Por qué protestó Korchnói?",
    options: [
      "Porque estaba prohibido comer en la sala de juego",
      "Porque el yogur podía ser un mensaje en clave para Kárpov",
      "Porque Kárpov lo comía haciendo ruido para distraerle",
      "Porque él también quería un yogur y no se lo dieron",
    ],
    answer: 1,
    hint: "Pista: la desconfianza entre ambos equipos era total; cualquier detalle podía esconder una señal.",
    success:
      "¡Correcto! Korchnói sospechaba que el color o la hora del yogur de arándanos eran un mensaje en clave. Desde entonces se reguló hasta el postre.",
  },
];

function slugifyScope(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function milestoneToGame(
  m: Milestone,
  solved: boolean,
): {
  game: Game;
  puzzlePly: number;
} {
  const preTokens = m.moves.trim().split(/\s+/).filter(Boolean);
  const puzzlePly = preTokens.length;
  const fullMoves =
    solved && m.solution.trim() ? [...preTokens, m.solution.trim()].join(" ") : preTokens.join(" ");

  const notes: Record<number, string> = {};
  if (solved && m.solution.trim()) {
    notes[puzzlePly + 1] = m.success;
  }

  return {
    game: {
      id: `milestone-${slugifyScope(`${m.year}-${m.title}`)}`,
      title: `${m.year} · ${m.title}`,
      event: m.game,
      result: "*",
      intro: m.text,
      moves: fullMoves,
      notes,
    },
    puzzlePly,
  };
}

function QuizCard({ m, onSolved }: { m: Milestone; onSolved: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const solved = picked === m.answer;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-primary/50 bg-muted p-4">
        <p className="font-display text-xs tracking-widest text-primary">La pregunta del hito</p>
        <p className="mt-2 leading-snug">{m.question}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {m.options!.map((o, i) => (
          <button
            key={o}
            disabled={solved}
            onClick={() => {
              setPicked(i);
              if (i === m.answer) onSolved();
            }}
            className={`rounded-md border px-4 py-3 text-left text-sm ${
              picked === i
                ? i === m.answer
                  ? "border-primary bg-primary/15"
                  : "border-destructive bg-destructive/10"
                : "border-border bg-card hover:border-primary"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
      {solved ? (
        <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
          <p className="flex items-center gap-2 font-display font-bold text-primary">
            <Check className="h-5 w-5" /> ¡Correcto!
          </p>
          <p className="mt-2 text-sm">{m.success}</p>
        </div>
      ) : (
        picked !== null && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              <b className="text-destructive">No es esa.</b> {m.hint}
            </p>
          </div>
        )
      )}
    </div>
  );
}

export function PuzzleBoard({
  m,
  onSolved,
  player = "Kárpov",
  scopeKey: propScopeKey,
  initialSolved = false,
}: {
  m: Milestone;
  onSolved: () => void;
  player?: string | undefined;
  scopeKey?: string | undefined;
  initialSolved?: boolean | undefined;
}) {
  const scopeKey = useMemo(
    () =>
      propScopeKey ||
      `timeline:${slugifyScope(player)}:${slugifyScope(`${m.year}-${m.game || m.title}`)}`,
    [propScopeKey, player, m.year, m.game, m.title],
  );

  const [solved, setSolved] = useState(initialSolved);
  const [freeExplore, setFreeExplore] = useState(initialSolved);
  const [flipped, setFlipped] = useState(false);
  const [sel, setSel] = useState<Square | null>(null);
  const [pendingPromo, setPendingPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [toolMode, setToolMode] = useState<BoardToolMode>("move");
  const [markColor, setMarkColor] = useState<BoardMarkColor>("G");

  const { game: baseGame, puzzlePly } = useMemo(() => milestoneToGame(m, solved), [m, solved]);

  const [tree, setTree] = useState<GameTree>(() => buildGameTree(baseGame));
  const [curId, setCurId] = useState<string>(() => `m:${puzzlePly}`);
  const hydratedRef = useRef<string | null>(null);
  const baseGameRef = useRef<Game>(baseGame);
  baseGameRef.current = baseGame;

  // Sync solved state if Timeline restores saved completion from localStorage.
  useEffect(() => {
    if (initialSolved && !solved) {
      setSolved(true);
      setFreeExplore(true);
    }
  }, [initialSolved, solved]);

  // Rebuild tree cleanly when `solved` toggles so the official solution move joins mainline intact.
  useEffect(() => {
    setTree((prev) => {
      const existingVars: VarNodeInput[] = extractVarNodes(prev).map((v) => ({
        ...v,
        saved: prev.nodes[v.id]?.saved ?? true,
      }));
      const existingMain = extractMainAnnotations(prev);
      return buildGameTree(baseGame, existingVars, existingMain);
    });
  }, [baseGame]);

  // Hydrate saved variations & PGN marks from localStorage and sync with Supabase after mount.
  useEffect(() => {
    let cancelled = false;
    registerOfflineAutoSync();
    setPendingSync(isScopePendingSync(scopeKey));

    const currentBaseGame = baseGameRef.current;
    const localSaved = readLocalAnalysis(scopeKey);
    if (hydratedRef.current !== scopeKey) {
      hydratedRef.current = scopeKey;
      if (hasStoredAnalysisContent(localSaved)) {
        setTree(
          buildGameTree(
            currentBaseGame,
            localSaved.variations.map((v) => ({ ...v, saved: true })),
            localSaved.mainAnnotations,
          ),
        );
      }
    }

    const onSyncChange = (ev: Event) => {
      const detail = (ev as CustomEvent<{ scopeKey?: string; pending?: boolean }>).detail;
      if (detail?.scopeKey === scopeKey) {
        setPendingSync(Boolean(detail.pending));
        if (!detail.pending) {
          setStatusMsg("Variantes locales sincronizadas con la nube.");
        }
      }
    };
    window.addEventListener("chess-school:sync-change", onSyncChange);

    void (async () => {
      if (isScopePendingSync(scopeKey)) {
        const synced = await saveAnalysisOfflineFirst(scopeKey, localSaved);
        if (!cancelled) {
          setPendingSync(synced.pending);
          if (synced.cloud) setStatusMsg("Variantes locales sincronizadas con la nube.");
        }
        return;
      }

      const cloud = await fetchCloudAnalysis(scopeKey);
      if (cancelled || !cloud) return;

      if (cloud.found) {
        writeLocalAnalysis(scopeKey, cloud.analysis);
        setTree((prev) => {
          const drafts: VarNodeInput[] = extractVarNodes(prev)
            .filter((v) => !prev.nodes[v.id]?.saved)
            .map((v) => ({ ...v, saved: false }));
          return buildGameTree(
            baseGameRef.current,
            [...cloud.analysis.variations.map((v) => ({ ...v, saved: true })), ...drafts],
            { ...cloud.analysis.mainAnnotations, ...extractMainAnnotations(prev) },
          );
        });
        setPendingSync(false);
      } else if (hasStoredAnalysisContent(localSaved)) {
        const synced = await saveAnalysisOfflineFirst(scopeKey, localSaved);
        if (!cancelled) setPendingSync(synced.pending);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("chess-school:sync-change", onSyncChange);
    };
  }, [scopeKey]);

  const node: MoveNode =
    tree.nodes[curId] ?? tree.nodes[`m:${puzzlePly}`] ?? tree.nodes[tree.rootId]!;
  const chess = useMemo(() => new Chess(node.fen), [node.fen]);

  useEffect(() => {
    setSel(null);
    setPendingPromo(null);
    setEditingNote(false);
    setConfirmDeleteId(null);
    setConfirmReset(false);
    setNoteInput(node.isMainline ? "" : (node.comment ?? ""));
  }, [node.id, node.isMainline, node.comment]);

  const legalTargets = useMemo(() => {
    const map = new Map<string, { captured: boolean; promotion: boolean }>();
    if (!sel) return map;
    for (const mv of chess.moves({ square: sel, verbose: true })) {
      const prev = map.get(mv.to);
      map.set(mv.to, {
        captured: Boolean(mv.captured) || Boolean(prev?.captured),
        promotion: Boolean(mv.promotion) || Boolean(prev?.promotion),
      });
    }
    return map;
  }, [chess, sel]);

  const canExplore = solved || freeExplore;

  const nextStepId = useMemo(
    () => (node.isMainline ? getMainlineContinuationId(tree, node.id) : node.children[0]),
    [tree, node],
  );

  const persistTree = useCallback(
    async (nextTree: GameTree, label: string) => {
      const payload = extractStoredAnalysis(nextTree);
      const res = await saveAnalysisOfflineFirst(scopeKey, payload);
      setPendingSync(res.pending);
      setStatusMsg(
        res.cloud
          ? `${label} (guardado aquí y en la nube).`
          : `${label} (guardado localmente · se subirá al volver internet).`,
      );
    },
    [scopeKey],
  );

  const executeFreeMove = (from: Square, to: Square, promotion?: "q" | "r" | "b" | "n") => {
    const result = playMoveInTree(tree, node.id, { from, to, promotion });
    if (!result) return;
    setTree(result.nextTree);
    setCurId(result.nextId);
    setSel(null);
    setPendingPromo(null);
    if (result.created) setStatusMsg("");
  };

  const handleSquareClick = (name: string) => {
    setPendingPromo(null);

    if (!canExplore) {
      // Strict puzzle-answer mode before solving (while keeping PGN marks usable).
      setWrong(false);
      if (sel && legalTargets.has(name)) {
        const c = new Chess(node.fen);
        const mv = c.move({ from: sel, to: name as Square, promotion: "q" });
        if (mv && mv.san.replace(/[+#]$/, "") === m.solution.replace(/[+#]$/, "")) {
          const solvedGame = milestoneToGame(m, true).game;
          const nextTree = buildGameTree(
            solvedGame,
            extractVarNodes(tree).map((v) => ({ ...v, saved: tree.nodes[v.id]?.saved ?? true })),
            extractMainAnnotations(tree),
          );
          setSolved(true);
          setFreeExplore(true);
          setTree(nextTree);
          setCurId(`m:${puzzlePly + 1}`);
          setSel(null);
          onSolved();
        } else {
          setAttempts((a) => a + 1);
          setWrong(true);
          setShowHint(true);
          setSel(null);
        }
        return;
      }

      const piece = chess.get(name as Square);
      if (piece && piece.color === chess.turn()) {
        setSel(name === sel ? null : (name as Square));
      } else {
        setSel(null);
      }
      return;
    }

    // Free variation exploration mode.
    if (sel && legalTargets.has(name)) {
      const info = legalTargets.get(name)!;
      if (info.promotion) {
        setPendingPromo({ from: sel, to: name as Square });
        return;
      }
      executeFreeMove(sel, name as Square);
      return;
    }

    const piece = chess.get(name as Square);
    if (piece && piece.color === chess.turn()) {
      setSel(name === sel ? null : (name as Square));
    } else {
      setSel(null);
    }
  };

  const reveal = () => {
    const c = new Chess(tree.nodes[`m:${puzzlePly}`]?.fen ?? node.fen);
    const sol = c
      .moves({ verbose: true })
      .find((x) => x.san.replace(/[+#]$/, "") === m.solution.replace(/[+#]$/, ""));
    if (!sol) return;
    const solvedGame = milestoneToGame(m, true).game;
    const nextTree = buildGameTree(
      solvedGame,
      extractVarNodes(tree).map((v) => ({ ...v, saved: tree.nodes[v.id]?.saved ?? true })),
      extractMainAnnotations(tree),
    );
    setSolved(true);
    setFreeExplore(true);
    setTree(nextTree);
    setCurId(`m:${puzzlePly + 1}`);
    setSel(null);
    onSolved();
  };

  const resetPuzzleAttempt = () => {
    if (solved) return;
    setCurId(`m:${puzzlePly}`);
    setSel(null);
    setWrong(false);
    setShowHint(false);
    setAttempts(0);
    setFreeExplore(false);
  };

  const enterExploreMode = () => {
    setFreeExplore(true);
    setWrong(false);
    setSel(null);
  };

  const returnToPuzzlePrompt = () => {
    setFreeExplore(false);
    setCurId(`m:${puzzlePly}`);
    setSel(null);
    setWrong(false);
  };

  const handleToggleNag = (nag: string) => {
    if (node.ply === 0) return;
    const nextTree = toggleMoveNag(tree, node.id, nag);
    setTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Signo PGN actualizado");
    } else {
      setStatusMsg("Signo PGN añadido al borrador.");
    }
  };

  const handleToggleArrow = (arrow: ArrowMark) => {
    const nextTree = toggleBoardArrow(tree, node.id, arrow);
    setTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Flecha actualizada");
    } else {
      setStatusMsg("Flecha añadida al borrador.");
    }
  };

  const handleToggleSquare = (mark: SquareMark) => {
    const nextTree = toggleBoardSquare(tree, node.id, mark);
    setTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Casilla marcada");
    } else {
      setStatusMsg("Casilla añadida al borrador.");
    }
  };

  const handleClearBoardMarks = () => {
    const nextTree = clearNodeBoardMarks(tree, node.id);
    setTree(nextTree);
    if (node.saved) {
      void persistTree(nextTree, "Marcas limpiadas");
    } else {
      setStatusMsg("Marcas del borrador limpiadas.");
    }
  };

  const handleSaveCurrentVariation = async () => {
    let working = tree;
    if (editingNote && !node.isMainline) {
      working = setVariationComment(working, node.id, noteInput);
      setEditingNote(false);
    }
    const draftRoot = getDraftRootId(working, node.id);
    const nextTree = markSubtreeSaved(working, draftRoot ?? node.id);
    setTree(nextTree);
    await persistTree(nextTree, "Variante guardada en el hito");
  };

  const handleSaveAllDrafts = async () => {
    const nextTree = markAllDraftsSaved(tree);
    setTree(nextTree);
    await persistTree(nextTree, "Variantes guardadas en el hito");
  };

  const handleDiscardCurrentDraft = () => {
    const draftRoot = getDraftRootId(tree, node.id);
    if (!draftRoot) return;
    const { nextTree, fallbackId } = removeSubtree(tree, draftRoot);
    setTree(nextTree);
    setCurId(fallbackId);
    setStatusMsg("Borrador descartado.");
  };

  const handleDiscardAllDrafts = () => {
    const { nextTree, fallbackId } = removeAllDrafts(tree, node.id);
    setTree(nextTree);
    setCurId(fallbackId);
    setStatusMsg("Borradores descartados.");
  };

  const handleDeleteSavedVariation = async (segmentRootId: string) => {
    const { nextTree, fallbackId } = removeSubtree(tree, segmentRootId);
    setTree(nextTree);
    setCurId(fallbackId);
    setConfirmDeleteId(null);
    await persistTree(nextTree, "Variante eliminada del hito");
  };

  const handleSaveNote = async () => {
    if (node.isMainline) return;
    const nextTree = setVariationComment(tree, node.id, noteInput);
    setTree(nextTree);
    setEditingNote(false);
    if (node.saved) {
      await persistTree(nextTree, "Nota actualizada");
    } else {
      setStatusMsg("Nota añadida al borrador. Pulsa «Guardar variante» para fijarla.");
    }
  };

  const handleRestoreOriginal = async () => {
    const cleanTree = buildGameTree(baseGame);
    setTree(cleanTree);
    setCurId(node.isMainline ? node.id : `m:${puzzlePly}`);
    setConfirmReset(false);
    const res = await saveAnalysisOfflineFirst(scopeKey, createEmptyStoredAnalysis());
    setPendingSync(res.pending);
    setStatusMsg(
      res.cloud
        ? "Hito restaurado a su línea original intacta."
        : "Hito restaurado a su línea original en este equipo.",
    );
  };

  const { savedCount, draftCount } = useMemo(() => countVariationBranches(tree), [tree]);
  const savedSummaries = useMemo(() => listSavedVariations(tree), [tree]);
  const hasSavedOverlay = useMemo(
    () => savedCount > 0 || Object.keys(extractMainAnnotations(tree)).length > 0,
    [savedCount, tree],
  );
  const draftRootId = useMemo(() => getDraftRootId(tree, node.id), [tree, node.id]);
  const segmentRootId = useMemo(() => getVariationSegmentRootId(tree, node.id), [tree, node.id]);
  const branchHasDrafts = useMemo(
    () => !node.isMainline && (Boolean(draftRootId) || branchHasUnsavedNodes(tree, node.id)),
    [tree, node.id, node.isMainline, draftRootId],
  );

  const btn =
    "rounded-md border border-border bg-muted p-2 text-primary hover:bg-wood disabled:opacity-40";

  const renderVariationTree = (startId: string, depth: number): ReactNode[] => {
    const out: ReactNode[] = [];
    let id: string | undefined = startId;
    let force = true;
    while (id !== undefined) {
      const n: MoveNode | undefined = tree.nodes[id];
      if (!n) break;
      const isCurrent = node.id === n.id;
      out.push(
        <span key={`tv-${n.id}`}>
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
            {n.nags.join("")}
            {(n.arrows.length > 0 || n.squares.length > 0) && (
              <span className="ml-0.5 text-[10px] text-primary">◆</span>
            )}
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
          const sub = tree.nodes[subId];
          if (!sub) continue;
          out.push(
            <div
              key={`tsub-${subId}`}
              className={`my-1 rounded-r border-l-2 py-1 pl-3 ${
                sub.saved
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

  // Render mainline moves visible up to current state (hide solution ply if not solved yet).
  const renderMilestoneLine = (): ReactNode[] => {
    const out: ReactNode[] = [];
    let id: string | undefined = getMainlineContinuationId(tree, tree.rootId);
    let force = false;
    while (id !== undefined) {
      const n: MoveNode | undefined = tree.nodes[id];
      if (!n) break;
      const isCurrent = node.id === n.id;
      const showLabel = n.ply % 2 === 1 || force;
      out.push(
        <span key={`tm-${n.id}`}>
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
            {n.nags.join("")}
            {(n.arrows.length > 0 || n.squares.length > 0) && (
              <span className="ml-0.5 text-[10px] text-primary">◆</span>
            )}
          </button>{" "}
        </span>,
      );

      const parent = n.parentId ? tree.nodes[n.parentId] : undefined;
      const siblingVars = parent ? getVariationChildrenIds(tree, parent.id) : [];
      const nextMain = getMainlineContinuationId(tree, n.id);
      const endVars = !nextMain ? getVariationChildrenIds(tree, n.id) : [];

      for (const vid of siblingVars) {
        const vNode = tree.nodes[vid];
        if (!vNode) continue;
        out.push(
          <div
            key={`tvbox-${vid}`}
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

      for (const vid of endVars) {
        const vNode = tree.nodes[vid];
        if (!vNode) continue;
        out.push(
          <div
            key={`tevbox-${vid}`}
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

      id = nextMain;
    }
    return out;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,440px)_1fr]">
      <div className="space-y-3">
        <InteractiveBoard
          fen={node.fen}
          flipped={flipped}
          selected={sel}
          lastMove={node.from && node.to ? { from: node.from, to: node.to } : null}
          legalTargets={legalTargets}
          arrows={node.arrows}
          squares={node.squares}
          toolMode={toolMode}
          markColor={markColor}
          pendingPromo={pendingPromo}
          onSelectPromotion={(from, to, piece) => executeFreeMove(from, to, piece)}
          onCancelPromotion={() => setPendingPromo(null)}
          onSquareClick={handleSquareClick}
          onToggleArrow={handleToggleArrow}
          onToggleSquare={handleToggleSquare}
        />

        {canExplore && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 print:hidden">
            <button
              type="button"
              className={btn}
              aria-label="Inicio"
              onClick={() => setCurId(tree.rootId)}
              disabled={node.id === tree.rootId}
            >
              <ChevronFirst className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btn}
              aria-label="Anterior"
              onClick={() => node.parentId && setCurId(node.parentId)}
              disabled={!node.parentId}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btn}
              aria-label="Siguiente"
              onClick={() => nextStepId && setCurId(nextStepId)}
              disabled={!nextStepId}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btn}
              aria-label="Final"
              onClick={() => setCurId(getLineEndId(tree, node.id))}
              disabled={!nextStepId}
            >
              <ChevronLast className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btn}
              aria-label="Salir de variante"
              title="Volver a la línea del hito"
              onClick={() => setCurId(getMainlineBranchId(tree, node.id))}
              disabled={node.isMainline}
            >
              <CornerLeftUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={btn}
              aria-label="Girar tablero"
              title="Girar tablero"
              onClick={() => setFlipped((f) => !f)}
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>
        )}

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

        <p className="text-center text-xs text-muted-foreground">{m.game}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-primary/50 bg-muted p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-xs tracking-widest text-primary">
              {canExplore && !node.isMainline
                ? `Variante en el hito · ${getMoveLabel(node, true)}${node.san}${node.nags.join("")}`
                : "El acertijo del hito"}
            </p>
            {!solved && (
              <button
                type="button"
                onClick={freeExplore ? returnToPuzzlePrompt : enterExploreMode}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                  freeExplore
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-primary/50 bg-card text-primary hover:border-primary"
                }`}
              >
                <Compass className="h-3 w-3" />
                {freeExplore ? "Volver al reto" : "Analizar fuera del reto"}
              </button>
            )}
          </div>
          <p className="mt-2 leading-snug">
            {!node.isMainline && node.comment ? node.comment : m.question}
          </p>
        </div>

        {solved ? (
          <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
            <p className="flex items-center gap-2 font-display font-bold text-primary">
              <Check className="h-5 w-5" /> ¡Correcto!
            </p>
            <p className="mt-2 text-sm">{m.success}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Ya puedes mover piezas fuera de la partida original para explorar y guardar variantes
              de análisis en este hito.
            </p>
          </div>
        ) : freeExplore ? (
          <div className="rounded-lg border border-primary/40 bg-card p-3 text-xs text-muted-foreground">
            Modo análisis libre activo: juega cualquier alternativa en el tablero y guárdala sin
            alterar la partida original. Pulsa{" "}
            <button
              type="button"
              onClick={returnToPuzzlePrompt}
              className="font-semibold text-primary underline"
            >
              Volver al reto
            </button>{" "}
            cuando quieras responder el acertijo.
          </div>
        ) : (
          <>
            {wrong && (
              <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm">
                <b className="text-destructive">Esa no es la jugada de {player}.</b> Inténtalo de
                nuevo: toca una pieza y luego la casilla de destino, o activa «Analizar fuera del
                reto» para probar variantes.
              </div>
            )}
            {showHint && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-card p-4 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>{m.hint}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!showHint && (
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary hover:bg-wood"
                >
                  <Lightbulb className="h-4 w-4" /> Pedir pista
                </button>
              )}
              {attempts >= 3 && (
                <button
                  type="button"
                  onClick={reveal}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary hover:bg-wood"
                >
                  <Eye className="h-4 w-4" /> Ver la jugada
                </button>
              )}
              {(attempts > 0 || sel) && (
                <button
                  type="button"
                  onClick={resetPuzzleAttempt}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-wood"
                >
                  <RotateCcw className="h-4 w-4" /> Reiniciar
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Toca una pieza y después la casilla de destino para resolver el reto.
            </p>
          </>
        )}

        {canExplore && (
          <div className="print:hidden">
            <AnalysisPanel fen={node.fen} defaultOn={false} />
          </div>
        )}

        {(canExplore ||
          draftCount > 0 ||
          savedSummaries.length > 0 ||
          hasSavedOverlay ||
          pendingSync ||
          Boolean(statusMsg)) && (
          <div className="space-y-3 rounded-lg border border-border bg-card p-3.5 text-sm print:hidden">
            {!node.isMainline && (
              <div className="flex flex-wrap items-center gap-2">
                {branchHasDrafts ? (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSaveCurrentVariation()}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
                    >
                      <Save className="h-3.5 w-3.5" /> Guardar variante en el hito
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
                  placeholder="Nota sobre esta variante…"
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
              </div>
            )}

            {node.isMainline && draftCount > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed border-accent bg-accent/20 px-3 py-2">
                <span className="text-xs font-semibold text-foreground">
                  Tienes {draftCount} {draftCount === 1 ? "variante" : "variantes"} sin guardar en
                  este hito.
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
                    onClick={() => {
                      setFreeExplore(true);
                      setCurId(s.rootId);
                    }}
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
                    Hito original intacto
                  </>
                )}
              </span>

              {hasSavedOverlay &&
                (confirmReset ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-destructive">
                      ¿Borrar variantes y marcas guardadas en este hito?
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleRestoreOriginal()}
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

        {canExplore && (
          <div className="max-h-52 overflow-y-auto rounded-lg border border-border bg-card p-3 font-mono text-xs leading-6">
            {renderMilestoneLine()}
          </div>
        )}
      </div>
    </div>
  );
}

export function Timeline({
  milestones: list = MILESTONES,
  player = "Kárpov",
  scopePrefix,
}: {
  milestones?: Milestone[] | undefined;
  player?: string | undefined;
  scopePrefix?: string | undefined;
} = {}) {
  const progressKey = useMemo(
    () => `chess-school:timeline-progress:${slugifyScope(scopePrefix ?? player)}`,
    [scopePrefix, player],
  );

  const [unlocked, setUnlocked] = useState(1);
  const [active, setActive] = useState(0);
  const [solvedSet, setSolvedSet] = useState<Set<number>>(new Set());

  // Restore solved progress from localStorage after mount (SSR-safe).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(progressKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        const clean = parsed.filter(
          (x): x is number => typeof x === "number" && x >= 0 && x < list.length,
        );
        if (clean.length > 0) {
          setSolvedSet(new Set(clean));
          const maxSolved = Math.max(...clean);
          setUnlocked(Math.min(list.length, Math.max(1, maxSolved + 2)));
        }
      }
    } catch {
      // Ignorar errores de almacenamiento.
    }
  }, [progressKey, list.length]);

  const markSolved = (i: number) => {
    setSolvedSet((s) => {
      const next = new Set(s).add(i);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(progressKey, JSON.stringify([...next]));
        } catch {
          // Ignorar.
        }
      }
      return next;
    });
    setUnlocked((u) => Math.max(u, i + 2));
  };

  const m = list[active]!;
  const milestoneScope = `timeline:${slugifyScope(scopePrefix ?? player)}:${slugifyScope(m.year)}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
      <ol className="relative space-y-1 border-l-2 border-primary/30 pl-4">
        {list.map((x, i) => {
          const isLocked = i >= unlocked;
          const isSolved = solvedSet.has(i);
          const isActive = i === active;
          return (
            <li key={x.year}>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setActive(i)}
                className={`relative w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                  isActive
                    ? "border-primary bg-primary/15"
                    : isLocked
                      ? "border-border bg-muted/50 opacity-60"
                      : "border-border bg-card hover:border-primary"
                }`}
              >
                <span
                  className={`absolute -left-[27px] top-4 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    isSolved
                      ? "border-primary bg-primary text-primary-foreground"
                      : isLocked
                        ? "border-border bg-muted text-muted-foreground"
                        : "border-primary bg-background text-primary"
                  }`}
                >
                  {isSolved ? (
                    <Check className="h-3 w-3" />
                  ) : isLocked ? (
                    <Lock className="h-3 w-3" />
                  ) : null}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-black text-primary">{x.year}</span>
                  <span className="font-display text-sm font-bold">{x.title}</span>
                </div>
                {isLocked && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Resuelve el acertijo anterior para desbloquear
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      <div>
        <div className="mb-4 rounded-lg bg-muted p-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-black text-primary">{m.year}</span>
            <h3 className="font-display text-lg font-bold">{m.title}</h3>
          </div>
          <p className="mt-2 text-sm">{m.text}</p>
        </div>
        {m.options ? (
          <QuizCard key={active} m={m} onSolved={() => markSolved(active)} />
        ) : (
          <PuzzleBoard
            key={milestoneScope}
            m={m}
            player={player}
            scopeKey={milestoneScope}
            initialSolved={solvedSet.has(active)}
            onSolved={() => markSolved(active)}
          />
        )}
        {solvedSet.has(active) && active + 1 < list.length && (
          <button
            type="button"
            onClick={() => setActive(active + 1)}
            className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-display font-bold text-primary-foreground hover:opacity-90"
          >
            Siguiente hito: {list[active + 1]!.year} <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {solvedSet.size === list.length && (
          <p className="mt-4 rounded-lg border-2 border-primary bg-primary/10 p-4 text-center font-display font-bold text-primary">
            ¡Cronología completa! Has recorrido toda la carrera de {player}, jugada a jugada.
          </p>
        )}
      </div>
    </div>
  );
}
