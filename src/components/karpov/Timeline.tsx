import { useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Lock, Check, Lightbulb, Eye, ArrowRight, RotateCcw } from "lucide-react";

type Milestone = {
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

const MILESTONES: Milestone[] = [
  {
    year: "1969",
    title: "Campeón mundial juvenil",
    text: "Con 18 años, Kárpov gana el Mundial juvenil de Estocolmo y anuncia al mundo que viene una nueva estrella soviética.",
    game: "Kárpov – Payrhuber · Estocolmo 1969",
    moves: "e4 c5 Nf3 d6 g3 Nf6 d3 Nc6 Bg2 g6 O-O Bg7 Re1 O-O c3 Ne8 Na3 f5 Ng5 Nc7 Qb3+ Kh8 exf5 Bxf5",
    solution: "Nf7+",
    question: "Juegan las blancas. El joven Kárpov remató esta miniatura en 15 jugadas. ¿Cómo castigó la debilidad del enroque negro?",
    hint: "Pista: el caballo de g5 tiene un jaque que obliga a la torre a cambiarse… y entonces la dama se la come.",
    success: "¡13.Cf7+! La torre debe capturar el caballo y la dama blanca se la come. Karpov ganó material y la partida poco después.",
  },
  {
    year: "1974",
    title: "Oro en la Olimpiada de Niza",
    text: "Camino del título, Kárpov brilla en la Olimpiada de Niza con la URSS y firma una de sus partidas modelo contra Unzicker.",
    game: "Kárpov – Unzicker · Olimpiada de Niza 1974",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Nc6 d5 Nd8 a4 Rb8 axb5 axb5 b4 Nb7 Nf1 Bd7 Be3 Ra8 Qd2 Rfc8 Bd3 g6 Ng3 Bf8 Ra2 c4 Bb1 Qd8",
    solution: "Ba7",
    question: "Juegan las blancas. Kárpov encontró una maniobra que paralizó a las torres negras para el resto de la partida. ¿Cuál?",
    hint: "Pista: un alfil se cuela por la columna 'a' hasta la séptima fila, clavando a la torre de a8.",
    success: "¡24.Aa7! El alfil se instala en a7 y las torres negras quedan esposadas. La lección de estrategia más famosa de Kárpov.",
  },
  {
    year: "1975",
    title: "Campeón del mundo",
    text: "Fischer no defiende la corona y Kárpov se convierte en el 12.º campeón mundial. En Milán, su primer gran torneo como campeón, demuestra que el título le queda grande a cualquiera… menos a él.",
    game: "Kárpov – Gligóric · Milán 1975",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 O-O c3 d6 h3 Nb8 d4 Nbd7 Nbd2 Bb7 Bc2 Re8 Nf1 Bf8 Ng3 g6 a4 c5 d5 Nb6 Qe2 Nxa4 Bxa4 bxa4 Rxa4 Bg7 c4 Bc8 Bd2 Rb8 Rb1 Re7 Ne1 Reb7 Nd3 Rb3 Rba1 Ne8 Bc3 Qh4 R1a3 f5 Be1 Qe7 Rxb3 Rxb3 Nc1 Rb8 Nd3 Rb3 f3 Qg5 Kh2 Nf6 Qc2 Rb8 b4 fxe4 Nxe4 Nxe4 fxe4 Qe3 bxc5 Qxe4 cxd6 Bf5 Ra3 Rc8 Rc3 Bf8 Bf2 Bxd6 Qa2 a5 c5 Bd7 Ra3 Bb5 cxd6 Bxd3 d7 Rd8",
    solution: "Rxd3",
    question: "Juegan las blancas. El peón de dama de Kárpov está a dos pasos de coronar, pero el alfil de d3 lo vigila. ¿Cómo lo resolvió el campeón?",
    hint: "Pista: a veces la torre vale menos que un peón a punto de coronar. La torre de a3 puede entregarse.",
    success: "¡48.Txd3! Tras Dxd3 llega 49.d6+ y el peón decide la partida. Gligóric se rindió unas jugadas después.",
  },
  {
    year: "1978",
    title: "Baguio: retiene la corona ante Korchnói",
    text: "En el match más tenso de la historia, contra el desertor Korchnói, Kárpov gana la partida 32 y retiene el título por 6–5.",
    game: "Kárpov – Korchnói · Baguio 1978, partida 32",
    moves: "e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c5 d5 Na6 Bf4 Nc7 a4 b6 Re1 Bb7 Bc4 Nh5 Bg5 Nf6 Qd3 a6 Rad1 Rb8 h3 Nd7 Qe3 Ba8 Bh6 b5 Bxg7 Kxg7 Bf1 Nf6 axb5 axb5 Ne2 Bb7 Ng3 Ra8 c3 Ra4 Bd3 Qa8",
    solution: "e5",
    question: "Juegan las blancas. Korchnói presiona en el flanco de dama, pero Kárpov golpeó primero en el centro. ¿Con qué ruptura?",
    hint: "Pista: el peón de e4 puede avanzar y romper el centro antes de que las piezas negras se organicen.",
    success: "¡25.e5! La ruptura central desorganiza a las negras. Kárpov ganó la partida, el match y conservó la corona del mundo.",
  },
  {
    year: "1981",
    title: "Merano: el título, otra vez ante Korchnói",
    text: "Revancha en Merano: Kárpov arrolla a Korchnói 6–2 y no deja dudas de quién es el campeón.",
    game: "Kárpov – Korchnói · Merano 1981, partida 2",
    moves: "e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Be7 Qe2 Nd6 Bxc6 bxc6 dxe5 Nb7 Nc3 O-O Re1 Nc5 Be3 Ne6 Rad1 d5 exd6 cxd6 Nd4 Bd7 Nf5 d5 Nxe7+ Qxe7 Qd2 Qh4 Ne2 Rfe8 b3 Re7 Ng3 Qf6 f3 Be8 Ne2 h6 Bf2 Qg6 Nc1 d4 Nd3 Qf6 Bg3 Rd7 Re5 Qd8 Rde1 Rd5 Rxd5 Qxd5 Re5 Qd7 Qe1 Rc8 b4 Qd8 Ra5 Qd7 h3 f6 Rxa7 Qd5 Ra5 Qd7 Ra7 Qd5 Ra5 Qd7 Qe4 Bf7 Qf5 Re8 Kh2 Qb7 a3 Rd8 h4 h5 Nf2 Qd7 Ra6 Qe8 Qa5 Bg6 Nd3 Kh7 Qb6 Rc8 a4 Bf5 a5 c5 bxc5 Bxd3 cxd3 Nxc5",
    solution: "Ra7",
    question: "Juegan las blancas. La dama de b6 ya presiona. ¿Qué pieza se suma al ataque invadiendo la séptima fila?",
    hint: "Pista: la torre de a6 puede subir una casilla y apuntar al peón de g7 y al rey.",
    success: "¡53.Ta7! La torre invade la séptima y el ataque contra el rey negro es imparable. Kárpov ganó la partida.",
  },
  {
    year: "1984",
    title: "El match sin fin contra Kaspárov",
    text: "En Moscú comienza el primer match de la gran rivalidad: 48 partidas en cinco meses. Kárpov se puso 5–0, como en esta séptima partida.",
    game: "Kárpov – Kaspárov · Moscú 1984, partida 7",
    moves: "d4 d5 c4 e6 Nf3 c5 cxd5 exd5 g3 Nf6 Bg2 Be7 O-O O-O Nc3 Nc6 Bg5 cxd4 Nxd4 h6 Be3 Re8 Qb3 Na5 Qc2 Bg4 Nf5 Rc8 Nxe7+ Rxe7 Rad1 Qe8 h3 Bh5",
    solution: "Bxd5",
    question: "Juegan las blancas. El peón de d5 parece defendido por el caballo de c6… pero ese caballo está sobrecargado. ¿Qué jugó Kárpov?",
    hint: "Pista: el alfil de g2 puede comerse el peón de d5: si el caballo captura, la torre se lo lleva.",
    success: "¡18.Axd5! Kárpov gana un peón limpio: tras Cxd5, Txd5. Ganó la partida y se puso 4–0 en el match.",
  },
  {
    year: "1987",
    title: "Sevilla: 13 millones ante la TVE",
    text: "El cuarto match contra Kaspárov se juega en Sevilla y España lo sigue en directo. Kárpov gana la partida 23 y se pone a un paso de recuperar la corona.",
    game: "Kárpov – Kaspárov · Sevilla 1987, partida 23",
    moves: "c4 c5 Nf3 Nf6 Nc3 d5 cxd5 Nxd5 d4 Nxc3 bxc3 g6 e3 Bg7 Bd3 O-O O-O Qc7 Rb1 b6 Qe2 Rd8 Be4 Ba6 c4 Nc6 d5 f5 Bd3 e5 e4 Nd4 Nxd4 cxd4 Bg5 Rf8 Rfc1 Rac8 Bd2 Rf7 a4 fxe4 Qxe4 Rcf8 f3 Bc8 a5 Bf5 Qe2 Re8 Be4 Bf8 Qd3 Bc5 Ra1 Qd7 Re1 Qc8 Kh1 Rc7 Rab1 Kg7 Rec1 Bxe4 fxe4 Rf7 Qg3 bxa5 Bxa5 Rf4 Re1 Qa6 Bd2 Rf7 Qd3 Ref8 h3 Rf2 Ra1 Qf6 Rg1 h5 Ra5 Qe7 Rb1 h4 Ra6 R8f7 Rc6 Qf8 Rg1 Be7 Re6 Kh7 Be1 Rf1 Bd2 Bc5 Rc6 R7f3 gxf3 Rxf3 Rc7+ Kh8",
    solution: "Bh6",
    question: "Juegan las blancas. Kaspárov ha sacrificado una torre buscando complicaciones. ¿Qué jugada tranquila deja al rey negro sin respiración?",
    hint: "Pista: el alfil de d2 puede ir a h6 para atacar la dama y amenazar g7.",
    success: "¡53.Ah6! Amenaza mate en g7 y gana la dama. Kárpov ganó, aunque Kaspárov empató el match en la última partida.",
  },
  {
    year: "1994",
    title: "Linares: el torneo perfecto",
    text: "Con 42 años, Kárpov hace 11/13 en Linares, 2,5 puntos por delante de Kaspárov: una de las mejores actuaciones de la historia.",
    game: "Kárpov – Topálov · Linares 1994",
    moves: "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O Na5 Bd3 b6 Qd2 e5 Bh6 cxd4 Bxg7 Kxg7 cxd4 exd4 Rac1 Qd6 f4 f6 f5 Qe5 Nf4 g5 Nh5+ Kg8 h4 h6 hxg5 hxg5 Rf3 Kf7",
    solution: "Nxf6",
    question: "Juegan las blancas. El rey negro se ha quedado sin escudo de peones. ¿Con qué sacrificio lo remató Kárpov?",
    hint: "Pista: el caballo de h5 puede entregarse en f6 para dejar al rey negro completamente desnudo.",
    success: "¡24.Cxf6!! El caballo se sacrifica y el rey negro queda cazado en pleno centro. La joya de Linares 1994.",
  },
  {
    year: "1996",
    title: "Elista: campeón FIDE a los 45 años",
    text: "Kárpov vence a Gata Kamsky por 10,5–7,5 y defiende el título mundial de la FIDE con la técnica de siempre.",
    game: "Kárpov – Kamsky · Elista 1996, partida 7",
    moves: "d4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5 Ne7 b4 Nh5 Re1 h6 Nd2 Nf4 Bf1 a5 bxa5 Rxa5 Nb3 Ra8 c5 f5 cxd6 cxd6 Nd2 g5 Rb1 g4 Qb3 fxe4 Ndxe4 Kh8 Be3 Nf5 Bb6 Qe7 Qb4 Rf7 a4 Bf8 Be3 Nh5 Rbc1 Nf6 Bb6 h5 Nxf6 Qxf6 Ne4 Qg6 a5 Ng7 Bb5 Bf5 Ng3 Bc8 Rc3 h4 Bd3 Nf5 Nxf5 Bxf5 Bxf5 Qxf5 Rc4 Rg7 Qb1 Qh5 Qd1 h3 Ree4 hxg2 Rxg4 Rh7 h4 Be7 f3 Rg8 Bf2 Rhg7 Qe2 Bd8 Be1 Qf7 Qd3 Qh5 Qe4 Qh6 Qf5 Bxa5 Rxg7 Bb6+ Kxg2 Qxg7+ Rg4 Qe7 Qh5+ Qh7",
    solution: "Rxg8+",
    question: "Juegan las blancas. Las negras acaban de cubrir el jaque con la dama. ¿Cómo gana Kárpov material decisivo?",
    hint: "Pista: la torre de g4 puede capturar en g8 con jaque.",
    success: "¡54.Txg8+! Tras Rxg8 las blancas quedan con una pieza de más. Kárpov ganó y encarriló el match.",
  },
  {
    year: "Final",
    title: "La curiosidad del yogur",
    text: "Último reto: una de las anécdotas más famosas de Kárpov, la del Mundial de Baguio 1978 contra Korchnói.",
    game: "",
    moves: "",
    solution: "",
    question: "Durante una partida de Baguio 1978, el equipo de Kárpov le llevó un yogur. ¿Por qué protestó Korchnói?",
    options: [
      "Porque estaba prohibido comer en la sala de juego",
      "Porque el yogur podía ser un mensaje en clave para Kárpov",
      "Porque Kárpov lo comía haciendo ruido para distraerle",
      "Porque él también quería un yogur y no se lo dieron",
    ],
    answer: 1,
    hint: "Pista: la desconfianza entre ambos equipos era total; cualquier detalle podía esconder una señal.",
    success: "¡Correcto! Korchnói sospechaba que el color o la hora del yogur de arándanos eran un mensaje en clave. Desde entonces se reguló hasta el postre.",
  },
];

function QuizCard({ m, onSolved }: { m: Milestone; onSolved: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const solved = picked === m.answer;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-primary/50 bg-muted p-4">
        <p className="font-display text-xs tracking-widest text-primary">La pregunta final</p>
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
            <p><b className="text-destructive">No es esa.</b> {m.hint}</p>
          </div>
        )
      )}
    </div>
  );
}

const FILES = "abcdefgh";

function PuzzleBoard({ m, onSolved }: { m: Milestone; onSolved: () => void }) {
  const chess = useMemo(() => {
    const c = new Chess();
    for (const mv of m.moves.split(" ")) c.move(mv);
    return c;
  }, [m]);

  const [solved, setSolved] = useState(false);
  const [sel, setSel] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const board = chess.board();
  const targets = useMemo(
    () => (sel ? chess.moves({ square: sel as Square, verbose: true }).map((x) => x.to as string) : []),
    [chess, sel],
  );

  const finish = (from: string, to: string) => {
    setLastMove({ from, to });
    setSolved(true);
    setSel(null);
    onSolved();
  };

  const click = (name: string) => {
    if (solved) return;
    setWrong(false);
    if (sel && targets.includes(name)) {
      const mv = chess.move({ from: sel as Square, to: name as Square, promotion: "q" });
      if (mv && mv.san.replace(/[+#]$/, "") === m.solution.replace(/[+#]$/, "")) {
        finish(mv.from, mv.to);
      } else {
        chess.undo();
        setAttempts((a) => a + 1);
        setWrong(true);
        setShowHint(true);
        setSel(null);
      }
      return;
    }
    const piece = chess.get(name as never);
    if (piece && piece.color === chess.turn()) {
      setSel(name === sel ? null : name);
    } else {
      setSel(null);
    }
  };

  const reveal = () => {
    const sol = chess.moves({ verbose: true }).find((x) => x.san.replace(/[+#]$/, "") === m.solution.replace(/[+#]$/, ""));
    if (sol) {
      chess.move(sol);
      finish(sol.from, sol.to);
    }
  };

  const reset = () => {
    if (solved) return;
    setSel(null);
    setWrong(false);
    setShowHint(false);
    setAttempts(0);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div>
        <div className="rounded-lg bg-wood p-3 shadow-2xl">
          <div className="grid grid-cols-8 overflow-hidden rounded-sm border border-border">
            {board.map((row, r) =>
              row.map((sq, f) => {
                const name = FILES[f]! + (8 - r);
                const light = (r + f) % 2 === 0;
                const isSel = sel === name;
                const isTarget = targets.includes(name);
                const isLast = lastMove && (lastMove.from === name || lastMove.to === name);
                return (
                  <button
                    key={name}
                    onClick={() => click(name)}
                    className={`relative aspect-square ${light ? "bg-sq-light" : "bg-sq-dark"} ${solved ? "cursor-default" : "cursor-pointer"}`}
                    aria-label={`Casilla ${name}`}
                  >
                    {(isSel || isLast) && <div className="absolute inset-0 bg-primary/50" />}
                    {isTarget && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`rounded-full bg-primary/60 ${sq ? "h-full w-full border-4 border-primary/60 bg-transparent" : "h-1/4 w-1/4"}`} />
                      </div>
                    )}
                    {sq && (
                      <img
                        src={`/pieces/${sq.color}${sq.type.toUpperCase()}.svg`}
                        alt=""
                        className="relative h-full w-full"
                        draggable={false}
                      />
                    )}
                    {f === 0 && <span className="absolute left-0.5 top-0 font-mono text-[10px] text-wood">{8 - r}</span>}
                    {r === 7 && <span className="absolute bottom-0 right-1 font-mono text-[10px] text-wood">{FILES[f]}</span>}
                  </button>
                );
              }),
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">{m.game}</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-primary/50 bg-muted p-4">
          <p className="font-display text-xs tracking-widest text-primary">El acertijo del hito</p>
          <p className="mt-2 leading-snug">{m.question}</p>
        </div>

        {solved ? (
          <div className="rounded-lg border-2 border-primary bg-primary/10 p-4">
            <p className="flex items-center gap-2 font-display font-bold text-primary">
              <Check className="h-5 w-5" /> ¡Correcto!
            </p>
            <p className="mt-2 text-sm">{m.success}</p>
          </div>
        ) : (
          <>
            {wrong && (
              <div className="rounded-lg border border-destructive/60 bg-destructive/10 p-4 text-sm">
                <b className="text-destructive">Esa no es la jugada de Kárpov.</b> Inténtalo de nuevo: toca una pieza blanca y luego la casilla de destino.
              </div>
            )}
            {showHint && !solved && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/40 bg-card p-4 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>{m.hint}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!showHint && (
                <button
                  onClick={() => setShowHint(true)}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary hover:bg-wood"
                >
                  <Lightbulb className="h-4 w-4" /> Pedir pista
                </button>
              )}
              {attempts >= 3 && (
                <button
                  onClick={reveal}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-primary hover:bg-wood"
                >
                  <Eye className="h-4 w-4" /> Ver la jugada
                </button>
              )}
              {(attempts > 0 || sel) && (
                <button
                  onClick={reset}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-wood"
                >
                  <RotateCcw className="h-4 w-4" /> Reiniciar
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Toca una pieza blanca y después la casilla de destino para hacer tu jugada.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function Timeline() {
  const [unlocked, setUnlocked] = useState(1);
  const [active, setActive] = useState(0);
  const [solvedSet, setSolvedSet] = useState<Set<number>>(new Set());

  const markSolved = (i: number) => {
    setSolvedSet((s) => new Set(s).add(i));
    setUnlocked((u) => Math.max(u, i + 2));
  };

  const m = MILESTONES[active]!;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,300px)_1fr]">
      <ol className="relative space-y-1 border-l-2 border-primary/30 pl-4">
        {MILESTONES.map((x, i) => {
          const isLocked = i >= unlocked;
          const isSolved = solvedSet.has(i);
          const isActive = i === active;
          return (
            <li key={x.year}>
              <button
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
                  {isSolved ? <Check className="h-3 w-3" /> : isLocked ? <Lock className="h-3 w-3" /> : null}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-lg font-black text-primary">{x.year}</span>
                  <span className="font-display text-sm font-bold">{x.title}</span>
                </div>
                {isLocked && <p className="mt-1 text-xs text-muted-foreground">Resuelve el acertijo anterior para desbloquear</p>}
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
          <PuzzleBoard key={active} m={m} onSolved={() => markSolved(active)} />
        )}
        {solvedSet.has(active) && active + 1 < MILESTONES.length && (
          <button
            onClick={() => setActive(active + 1)}
            className="mt-4 flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-display font-bold text-primary-foreground hover:opacity-90"
          >
            Siguiente hito: {MILESTONES[active + 1]!.year} <ArrowRight className="h-4 w-4" />
          </button>
        )}
        {solvedSet.size === MILESTONES.length && (
          <p className="mt-4 rounded-lg border-2 border-primary bg-primary/10 p-4 text-center font-display font-bold text-primary">
            ¡Cronología completa! Has recorrido toda la carrera de Kárpov, jugada a jugada.
          </p>
        )}
      </div>
    </div>
  );
}
