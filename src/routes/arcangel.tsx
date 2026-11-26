import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpen, Clapperboard, Cpu, Crown, Dumbbell, History, Lightbulb, Sparkles, Check } from "lucide-react";
import { ARCANGEL_PGN } from "@/data/arcangel-pgn";
import { CARUANA_CARLSEN, EXERCISES } from "@/data/arcangel";
import { parseGame, parsePgn } from "@/lib/pgn";
import { PgnStudyViewer } from "@/components/karpov/PgnStudyViewer";
import { LineVideo } from "@/components/karpov/LineVideo";
import { PuzzleBoard } from "@/components/karpov/Timeline";
import { BackToPanel } from "@/components/aula/Section";

export const Route = createFileRoute("/arcangel")({
  head: () => ({
    meta: [
      { title: "Variante Arcángel de la Española — Estudio interactivo" },
      { name: "description", content: "Dashboard de la Apertura Española, variante Arcángel (C78): tres partidas de estudio con variantes, vídeos, análisis, ejercicios y Caruana–Carlsen 2017." },
      { property: "og:title", content: "Variante Arcángel — Estudio interactivo" },
      { property: "og:description", content: "Líneas principales en vídeo, tablero de análisis con variantes, ejercicios y la partida Caruana–Carlsen, Isla de Man 2017." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArcangelPage,
});

const STUDY = parsePgn(ARCANGEL_PGN);
const LABELS = [
  { title: "Estudio #1 · El ataque con 9.Cc3 y 9.Axf7+", intro: "Partida 1: las trampas tras 5...Cxe4 y 7...Cxe4, y la línea principal con 7.a4 Tb8 hasta 16.cxd4." },
  { title: "Estudio #2 · El error 10...Cxa5?", intro: "Partida 2: qué pasa si las negras toman en a5. Sacrificios en d5, c6 y un ataque directo al rey." },
  { title: "Estudio #3 · Debilidades decisivas", intro: "Partida 3: tras 13...f6 la estructura negra se rompe y las blancas cazan al rey en el centro." },
];

const STATS = [
  ["C78", "Código ECO"],
  ["5…b5 6.Ab3 Ac5", "Jugadas clave"],
  ["3", "Partidas de estudio"],
  ["8", "Ejercicios"],
  ["2017", "Caruana–Carlsen"],
];

function Section({ n, title, icon: Icon, children }: { n: number | string; title: string; icon: typeof Crown; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xl">
      <header className="flex items-center gap-3 border-b border-border aula-bar px-5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-black text-primary-foreground">{n}</span>
        <h2 className="font-display text-lg font-bold uppercase tracking-wider text-primary">{title}</h2>
        <Icon className="ml-auto h-5 w-5 text-primary/70" />
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Tabs({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {LABELS.map((l, i) => (
        <button key={i} onClick={() => onChange(i)} className={`rounded-md border px-4 py-2 text-left font-display text-sm font-bold ${value === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:border-primary"}`}>
          {l.title}
        </button>
      ))}
    </div>
  );
}

function Exercises() {
  const [i, setI] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const ex = EXERCISES[i]!;
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {EXERCISES.map((e, k) => (
          <button key={k} onClick={() => setI(k)} className={`flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm ${i === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:border-primary"}`}>
            {done.has(k) && <Check className="h-3.5 w-3.5" />}
            {e.year}. {e.title}
          </button>
        ))}
      </div>
      <p className="mb-3 text-sm text-muted-foreground">Resueltos: <b className="text-primary">{done.size}/{EXERCISES.length}</b></p>
      <PuzzleBoard
        key={i}
        m={ex}
        scopeKey={`arcangel:exercise:${ex.year}`}
        initialSolved={done.has(i)}
        onSolved={() => setDone((d) => new Set(d).add(i))}
      />
      {done.has(i) && i < EXERCISES.length - 1 && (
        <button onClick={() => setI(i + 1)} className="mt-4 rounded-md bg-primary px-4 py-2 font-display text-sm text-primary-foreground">Siguiente ejercicio →</button>
      )}
    </div>
  );
}

function ArcangelPage() {
  const [g, setG] = useState(0);
  const famous = useMemo(() => parseGame(CARUANA_CARLSEN), []);
  return (
    <main className="theme-projector min-h-screen bg-background">
      <header className="border-b-2 border-primary/60 bg-card px-6 py-12 text-center">
        <BackToPanel />
        <p className="mt-4 font-display text-sm tracking-[0.4em] text-primary">Apertura Española · C78</p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-wide text-primary sm:text-6xl">Variante Arcángel</h1>
        <p className="mt-3 text-xl italic text-muted-foreground">1.e4 e5 2.Cf3 Cc6 3.Ab5 a6 4.Aa4 Cf6 5.0-0 b5 6.Ab3 Ac5</p>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATS.map(([v, l]) => (
            <div key={l} className="rounded-lg border border-primary/40 bg-card p-4 text-center">
              <div className="font-display text-2xl font-black text-primary">{v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Section n="H" title="Historia de la variante" icon={History}>
            <p>Su nombre viene de <b className="text-primary">Arcángel (Arkhangelsk)</b>, la ciudad del norte de Rusia cuyos jugadores la analizaron a fondo en los años 50 y 60. La forma clásica es 5...b5 6.Ab3 Ab7; la que estudias aquí, con <b className="text-primary">6...Ac5</b>, es la llamada <b className="text-primary">Arcángel moderna</b> o Neo‑Arcángel.</p>
            <p className="mt-3">La idea negra: desarrollar el alfil a la diagonal activa a7–g1 y presionar f2 en vez de defenderse pasivamente. Jugadores de élite como Shírov, Beliavski o Carlsen la han llevado a la máxima competición.</p>
          </Section>
          <Section n="A" title="Anécdotas e ideas" icon={Lightbulb}>
            <ul className="space-y-3">
              <li><b className="text-primary">La trampa del peón e4.</b> Comerlo con 5...Cxe4 o 7...Cxe4 parece gratis, pero el estudio #1 muestra cómo 9.Cc3! o 9.Axf7+! lo castigan.</li>
              <li><b className="text-primary">7.a4 Tb8, el duelo clave.</b> Las blancas atacan b5 y las negras lo sostienen con la torre: de ahí nacen casi todas las líneas modernas.</li>
              <li><b className="text-primary">Carlsen, en la Isla de Man 2017.</b> Ganó con esta variante al número 2 del mundo, Caruana, y se llevó el torneo.</li>
            </ul>
          </Section>
        </div>

        <Section n={1} title="Vídeos: las líneas principales" icon={Clapperboard}>
          <p className="mb-5 text-sm text-muted-foreground">Cada vídeo reproduce la línea principal de una partida del estudio con sus explicaciones como subtítulos. Puedes pausar, avanzar y cambiar la velocidad.</p>
          <div className="grid gap-6 lg:grid-cols-3">
            {STUDY.map((game, i) => (
              <LineVideo key={i} game={game} title={`Línea ${i + 1}`} chapter={LABELS[i]?.title.split("·")[1]?.trim() ?? ""} />
            ))}
          </div>
        </Section>

        <Section n={2} title="Tablero de análisis con variantes" icon={Cpu}>
          <p className="mb-4 text-sm text-muted-foreground">Toca cualquier jugada, incluidas variantes y subvariantes (en los recuadros con borde). Las flechas y casillas de colores son las del estudio original. Usa las flechas del teclado para avanzar.</p>
          <Tabs value={g} onChange={setG} />
          <PgnStudyViewer game={STUDY[g]!} intro={LABELS[g]?.intro} studyId={`arcangel-study-${g + 1}`} />
        </Section>

        <Section n={3} title="Ejercicios del estudio" icon={Dumbbell}>
          <p className="mb-4 text-sm text-muted-foreground">Posiciones sacadas de las tres partidas. Toca una pieza blanca y luego su casilla de destino. Si fallas verás una pista.</p>
          <Exercises />
        </Section>

        <Section n={4} title="Partida famosa: Caruana – Carlsen" icon={Crown}>
          <div className="mb-5 rounded-lg border border-primary/40 bg-secondary px-4 py-3 text-sm">
            <b className="font-display uppercase tracking-wider text-primary">Isle of Man Masters 2017 · Ronda 8 · C78 · 0‑1</b>
            <span className="text-muted-foreground"> — Caruana probó la novedad 15.g4, pero Carlsen reorganizó sus piezas, rompió con 26...d5! y remató con 35...Af4.</span>
          </div>
          <PgnStudyViewer
            game={famous}
            studyId="arcangel-caruana-carlsen-2017"
            intro="Fabiano Caruana (blancas) contra Magnus Carlsen (negras). Avanza jugada a jugada para ver cómo la Arcángel moderna se convierte en una clase de coordinación."
          />
        </Section>

      </div>
    </main>
  );
}
