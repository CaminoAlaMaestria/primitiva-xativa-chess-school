import { createFileRoute } from "@tanstack/react-router";
import { BackToPanel } from "@/components/aula/Section";
import { useState } from "react";
import { Crown, Users, GraduationCap, Trophy, Swords, Star, Mic, Printer, Baby, Landmark, Grip, Crosshair, Castle, BookOpen, Medal, History } from "lucide-react";
import { GameViewer, type Game } from "@/components/karpov/GameViewer";
import { Timeline } from "@/components/karpov/Timeline";
import { PodcastPlayer } from "@/components/karpov/PodcastPlayer";

export const Route = createFileRoute("/karpov")({
  head: () => ({
    meta: [
      { title: "Anatoli Kárpov — Ficha interactiva de una leyenda" },
      { name: "description", content: "Infancia, maestros, títulos mundiales, la rivalidad con Kaspárov, Linares 1994 y partidas jugada a jugada." },
      { property: "og:title", content: "Anatoli Kárpov — Ficha interactiva" },
      { property: "og:description", content: "La vida y las partidas de Kárpov, con tablero interactivo y el contexto del podcast JAQUEa2." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const GAMES: Game[] = [
  {
    title: "Kárpov – Unzicker",
    event: "Olimpiada de Niza, 1974 · Ruy López",
    result: "1-0",
    intro: "La partida modelo del estilo Kárpov: sin sacrificios espectaculares, solo una presión que va asfixiando al rival.",
    moves: "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3 Na5 Bc2 c5 d4 Qc7 Nbd2 Nc6 d5 Nd8 a4 Rb8 axb5 axb5 b4 Nb7 Nf1 Bd7 Be3 Ra8 Qd2 Rfc8 Bd3 g6 Ng3 Bf8 Ra2 c4 Bb1 Qd8 Ba7 Ne8 Bc2 Nc7 Rea1 Qe7 Bb1 Be8 Ne2 Nd8 Nh2 Bg7 f4 f6 f5 g5 Bc2 Bf7 Ng3 Nb7 Bd1 h6 Bh5 Qe8 Qd1 Nd8 Ra3 Kf8 R1a2 Kg8 Ng4 Kf8 Ne3 Kg8 Bxf7+ Nxf7 Qh5 Nd8 Qg6 Kf8 Nh5",
    notes: {
      5: "La Española cerrada, terreno donde Kárpov se sentía en casa.",
      25: "13.d5: Kárpov cierra el centro. Ahora la batalla será por espacio en el flanco de dama.",
      29: "15.axb5: abre la columna 'a', que será su autopista.",
      31: "16.b4!: fija el peón de c5 y quita casillas al caballo negro.",
      47: "24.Ba7!: el alfil se mete en territorio enemigo y paraliza a las torres negras.",
      51: "26.Rea1: doblar torres en la columna abierta. Las negras no tienen jugadas útiles.",
      59: "30.f4: con el flanco de dama dominado, Kárpov abre un segundo frente en el rey.",
      61: "31.f5: el peón gana espacio y encierra a las piezas negras.",
      69: "35.Bh5: cambiar el alfil defensor de las casillas blancas.",
      81: "41.Bxf7+: elimina el último defensor de las casillas claras.",
      83: "42.Qh5 y 43.Qg6: la dama entra por los huecos que el plan fue creando.",
      87: "44.Nh5: Unzicker se rinde. Ante la amenaza Nxf6 no hay defensa. Una obra maestra de estrategia.",
    },
  },
  {
    title: "Kárpov – Topálov",
    event: "Linares, 1994 · Defensa Grünfeld",
    result: "1-0 (fragmento)",
    intro: "En Linares 1994 Kárpov hizo 11/13 y quedó 2,5 puntos por delante de Kaspárov. Esta es su partida más brillante del torneo.",
    moves: "d4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Bc4 c5 Ne2 Nc6 Be3 O-O O-O Na5 Bd3 b6 Qd2 e5 Bh6 cxd4 Bxg7 Kxg7 cxd4 exd4 Rac1 Qd6 f4 f6 f5 Qe5 Nf4 g5 Nh5+ Kg8 h4 h6 hxg5 hxg5 Rf3 Kf7 Nxf6 Kxf6 Rh3 Rg8 Rh6+ Kf7 Rh7+ Ke8 Rcc7 Kd8",
    notes: {
      9: "Grünfeld de cambio: las blancas levantan un gran centro de peones.",
      25: "13.Bh6: cambiar el alfil de g7, el gran defensor del rey negro.",
      33: "17.f4!: Kárpov, el posicional, se lanza al ataque.",
      35: "18.f5: el rey negro empieza a quedarse sin refugio.",
      39: "20.Nh5+: el caballo entra en la casilla clave.",
      41: "21.h4!: abrir más líneas contra el rey.",
      47: "24.Nxf6!!: sacrificio de caballo. El rey negro queda totalmente expuesto.",
      49: "25.Rh3: la torre se une al ataque por la columna 'h'.",
      55: "28.Rcc7: dos torres en la séptima. El rey negro es cazado; Topálov caería poco después.",
    },
  },
];

const STATS = [
  ["12", "Campeón del mundo número"],
  ["1975–85", "Campeón mundial FIDE"],
  ["1993–99", "Campeón FIDE (2.ª etapa)"],
  ["2780", "Elo máximo (1994)"],
  ["≈160", "Torneos ganados"],
  ["5", "Matches mundiales vs. Kaspárov"],
];

function Card({ n, title, icon: Icon, children, className = "" }: { n: number; title: string; icon: typeof Crown; children: React.ReactNode; className?: string }) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-xl ${className}`}>
      <header className="flex items-center gap-3 border-b border-border aula-bar px-5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-display font-black text-primary-foreground">{n}</span>
        <h2 className="font-display text-lg font-bold uppercase tracking-wider text-primary">{title}</h2>
        <Icon className="ml-auto h-5 w-5 text-primary/70" />
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Index() {
  const [g, setG] = useState(0);
  return (
    <main className="min-h-screen bg-background">
      <BackToPanel floating />
      <header className="border-b-2 border-primary/60 bg-card px-6 py-14 text-center">
        <p className="font-display text-sm tracking-[0.4em] text-primary">Campeón del mundo · 1951 – Zlatoúst, URSS</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase tracking-wide text-primary sm:text-7xl">Anatoli Kárpov</h1>
        <p className="mt-3 text-2xl italic text-muted-foreground">La boa constrictor del tablero</p>
        <button onClick={() => window.print()} className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-display text-sm text-primary-foreground print:hidden">
          <Printer className="h-4 w-4" /> Descargar ficha imprimible (PDF)
        </button>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATS.map(([v, l]) => (
            <div key={l} className="rounded-lg border border-primary/40 bg-card p-4 text-center">
              <div className="font-display text-3xl font-black text-primary">{v}</div>
              <div className="mt-1 text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card n={1} title="Infancia" icon={Baby}>
            <p>Nació el 23 de mayo de 1951 en Zlatoúst, ciudad industrial de los Urales. Niño delgado y de salud frágil, aprendió a jugar a los <b className="text-primary">4 años</b> viendo a su padre.</p>
            <p className="mt-3">A los 11 era candidato a maestro y a los 15 ya era maestro, el más joven de la URSS en su momento.</p>
          </Card>
          <Card n={2} title="Familia" icon={Users}>
            <p>Su padre, <b className="text-primary">Evgueni</b>, ingeniero en una fábrica metalúrgica, le enseñó el juego. Su madre, Nina, cuidó de su delicada salud. La familia se mudó a Tula, donde creció.</p>
            <p className="mt-3">Se casó dos veces: de su matrimonio con Irina Kuímova nació su hijo Anatoli (1979) y de su unión con Natalia Bulánova, su hija Sofía (1999).</p>
          </Card>
          <Card n={3} title="Maestros" icon={GraduationCap}>
            <ul className="space-y-3">
              <li><b className="text-primary">Mijaíl Botvínnik</b> — en su escuela, el excampeón dijo que aquel chico "no entiende nada de ajedrez"… pero le enseñó disciplina y estudio serio.</li>
              <li><b className="text-primary">Semión Furman</b> — su entrenador durante años: le dio el repertorio de aperturas y la profundidad estratégica. Su muerte en 1978 fue un golpe duro.</li>
            </ul>
          </Card>
          <Card n={4} title="Hitos" icon={Trophy}>
            <ul className="space-y-2">
              <li><b className="text-primary">1969</b> · Campeón mundial juvenil.</li>
              <li><b className="text-primary">1975</b> · Campeón del mundo sin jugar: Fischer no defiende el título.</li>
              <li><b className="text-primary">1978 y 1981</b> · Retiene la corona ante Korchnói (Baguío y Merano).</li>
              <li><b className="text-primary">1994</b> · Linares: 11/13, uno de los mejores torneos de la historia.</li>
            </ul>
          </Card>
        </div>

        <Card n={5} title="La rivalidad con Kaspárov" icon={Swords}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="font-display text-5xl font-black text-primary">5–0</div>
              <p className="mt-2 text-sm">Kárpov empezó arrasando en el match de 1984. Se jugaba a 6 victorias.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="font-display text-5xl font-black text-primary">48</div>
              <p className="mt-2 text-sm">Partidas en 5 meses, con 40 tablas seguidas. Campomanes anuló el match sin resultado.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="font-display text-5xl font-black text-primary">144</div>
              <p className="mt-2 text-sm">Partidas de match mundial entre ambos (1984–1990). Kaspárov ganó en 1985 con 22 años.</p>
            </div>
          </div>
          <p className="mt-4">Dos estilos y dos Unión Soviéticas: el campeón del sistema, sobrio y posicional, contra el joven dinámico y rebelde de Bakú.</p>
        </Card>

        <Card n={6} title="Partidas famosas" icon={Crown}>
          <div className="mb-5 flex flex-wrap gap-2">
            {GAMES.map((x, i) => (
              <button
                key={x.title}
                onClick={() => setG(i)}
                className={`rounded-md border px-4 py-2 text-left ${g === i ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted hover:border-primary"}`}
              >
                <div className="font-display text-sm font-bold">{x.title}</div>
                <div className="text-xs opacity-80">{x.event}</div>
              </button>
            ))}
          </div>
          <GameViewer game={GAMES[g]!} />
        </Card>

        <Card n={7} title="Cronología: desbloquea su carrera" icon={History}>
          <div className="mb-5 rounded-lg border border-primary/40 bg-secondary px-4 py-3 text-sm">
            <b className="font-display uppercase tracking-wider text-primary">Cómo funciona</b>
            <span className="text-muted-foreground"> — cada hito está cerrado con candado. Resuelve el acertijo de la partida de Kárpov de ese momento para abrir el siguiente.</span>
          </div>
          <Timeline />
        </Card>

        <Card n={8} title="Su legado al ajedrez" icon={Landmark} className="border-2 border-primary/80 shadow-[0_0_60px_-15px_var(--primary)]">
          <div className="mb-5 rounded-lg border border-primary/40 bg-secondary px-4 py-3 text-sm">
            <b className="font-display uppercase tracking-wider text-primary">Sección destacada</b>
            <span className="text-muted-foreground"> — lo que Kárpov dejó escrito en la historia del ajedrez.</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2">
                <Grip className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">La profilaxis, técnica de la boa constrictor</h3>
              </div>
              <p className="mt-2 text-sm">Su sello personal: anticipar los planes del rival y anularlos antes de que nazcan. Como una boa, rodeaba la posición sin dar un solo jaque, apretaba cada casilla libre y solo entonces cerraba la presa. La partida contra Unzicker es la lección en vivo.</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">Las microventajas posicionales</h3>
              </div>
              <p className="mt-2 text-sm">Convirtió en método la acumulación de ventajas mínimas: un peón ligeramente mejor, una casilla débil, una pieza algo más activa. Cada mejora parecía inocua, pero sumadas asfixiaban al rival: enseñó al mundo que la ventaja "pequeña" también gana partidas.</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2">
                <Castle className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">Maestría en los finales técnicos</h3>
              </div>
              <p className="mt-2 text-sm">Sus finales de torre y de peones son material de estudio en todas las escuelas: ganaba posiciones "tabulables" por pura precisión. Con Kárpov, una mitad de punto a la vista era una derrota a las veinte jugadas.</p>
            </div>
            <div className="rounded-lg bg-muted p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">Aportes a las aperturas</h3>
              </div>
              <p className="mt-2 text-sm">Su nombre está en la teoría: la <b className="text-primary">variante Kárpov</b> de la <b className="text-primary">Caro-Kann</b> (4...Af5), línea principal de la defensa durante décadas, lleva su firma, y sus sistemáticas Españolas y Grünfelds fijaron planes que aún se repiten. Demostró que las aperturas "tranquilas" también ganan al más alto nivel.</p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-card p-4">
            <Medal className="h-8 w-8 shrink-0 text-primary" />
            <p className="text-sm"><b className="text-primary">Récord histórico en torneos:</b> más de 160 primeros puestos en torneos de élite, la cifra más alta de la era moderna. Entre 1975 y 1985 ganó todo lo que se podía ganar, y en Linares 1994 firmó con 11/13 una de las actuaciones más dominantes jamás vistas.</p>
          </div>
        </Card>

        <div>
          <Card n={9} title="Su estilo" icon={Star}>
            <ul className="list-inside list-disc space-y-1">
              <li>Prevenir antes que atacar: quitar al rival sus jugadas.</li>
              <li>Mejorar piezas poco a poco.</li>
              <li>Finales técnicos casi perfectos.</li>
              <li>Sangre fría y economía de medios.</li>
            </ul>
          </Card>
        </div>

        <Card n={10} title="Curiosidades y anécdotas" icon={Star}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["El yogur de Baguio (1978)", "En el Mundial contra Korchnói, su equipo le llevó un yogur de arándanos durante una partida. El rival protestó: podía ser un mensaje en clave. Se acordó entonces regular hasta el postre."],
              ["El parapsicólogo de la primera fila", "El doctor Zujar, del equipo soviético, se sentaba mirando fijamente a Korchnói, que lo acusó de hipnotizarle. Korchnói respondió llevando gafas de espejo."],
              ["El match sin fin (1984-85)", "Tras 48 partidas y cinco meses contra Kaspárov, Kárpov estaba visiblemente agotado y más delgado. El presidente de la FIDE suspendió el match sin ganador, algo inédito."],
              ["Coleccionista de sellos", "Es un gran filatélico: reunió una de las colecciones de sellos de ajedrez más importantes del mundo."],
              ["El duelo que nunca existió", "Fue campeón en 1975 sin jugar, porque Fischer no se presentó. Años después ambos se reunieron en secreto para negociar un match que nunca llegó a celebrarse."],
              ["Aprendió de su padre", "Su padre le enseñó a jugar a los cuatro años en Zlatoúst, una ciudad industrial de los Urales. De niño era tan delgado y frágil que pocos imaginaban un futuro campeón."],
              ["13 millones ante la TVE", "Espectadores siguieron en TVE la final del Mundial de Sevilla 1987, que Kaspárov empató 12–12 ganando la última partida para retener el título."],
              ["Anécdotas de la rivalidad", "Desconfianza mutua, equipos de analistas enfrentados, acusaciones de favoritismo político y matches que se alargaban meses: dos visiones opuestas de la URSS frente a frente."],
            ].map(([h, p]) => (
              <div key={h} className="rounded-lg border border-primary/30 bg-muted p-5">
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-primary">{h}</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground">{p}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card n={11} title="Fuente: JAQUEa2 · Ep. 77" icon={Mic}>
          <p className="font-display text-primary">"Anatoli Kárpov, los secretos de una leyenda"</p>
          <PodcastPlayer />
          <a href="https://go.ivoox.com/rf/167204673" target="_blank" rel="noreferrer" className="mt-4 inline-block text-primary underline">Escuchar en iVoox →</a>
        </Card>

        <p className="pt-6 text-center text-xl italic text-primary">"El ajedrez es todo: arte, ciencia y deporte."</p>
      </div>
    </main>
  );
}
