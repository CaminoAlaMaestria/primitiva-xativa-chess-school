import { createFileRoute } from "@tanstack/react-router";
import { BackToPanel } from "@/components/aula/Section";
import { useState } from "react";
import songAsset from "@/assets/el-ogro-tortura-mental.m4a.asset.json";
import coverAsset from "@/assets/el-ogro-caratula.png.asset.json";
import docAsset from "@/assets/kasparov-documental.mp3.asset.json";
import { Crown, Users, GraduationCap, Trophy, Swords, Star, Printer, Baby, Landmark, Zap, Cpu, BookOpen, Medal, History, Youtube, Flame, Music } from "lucide-react";
import { GameViewer, type Game } from "@/components/karpov/GameViewer";
import { Timeline } from "@/components/karpov/Timeline";
import { KASPAROV_MILESTONES } from "@/components/karpov/kasparov-milestones";

export const Route = createFileRoute("/kasparov")({
  head: () => ({
    meta: [
      { title: "Garri Kaspárov — Ficha interactiva del Ogro de Bakú" },
      { name: "description", content: "Infancia, maestros, títulos, la rivalidad con Kárpov, Deep Blue y partidas jugada a jugada de Garri Kaspárov." },
      { property: "og:title", content: "Garri Kaspárov — Ficha interactiva" },
      { property: "og:description", content: "La vida y las partidas de Kaspárov, con tablero interactivo y documental." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Kasparov,
});

const VIDEO_ID = "QgObauNfRz0";

const GAMES: Game[] = [
  {
    title: "Kaspárov – Topálov",
    event: "Wijk aan Zee, 1999 · Defensa Pirc",
    result: "1-0",
    intro: "«La Inmortal de Kaspárov»: una combinación de 15 jugadas que persigue al rey negro por todo el tablero.",
    moves: "e4 d6 d4 Nf6 Nc3 g6 Be3 Bg7 Qd2 c6 f3 b5 Nge2 Nbd7 Bh6 Bxh6 Qxh6 Bb7 a3 e5 O-O-O Qe7 Kb1 a6 Nc1 O-O-O Nb3 exd4 Rxd4 c5 Rd1 Nb6 g3 Kb8 Na5 Ba8 Bh3 d5 Qf4+ Ka7 Rhe1 d4 Nd5 Nbxd5 exd5 Qd6 Rxd4 cxd4 Re7+ Kb6 Qxd4+ Kxa5 b4+ Ka4 Qc3 Qxd5 Ra7 Bb7 Rxb7 Qc4 Qxf6 Kxa3 Qxa6+ Kxb4 c3+ Kxc3 Qa1+ Kd2 Qb2+ Kd1 Bf1 Rd2 Rd7 Rxd7 Bxc4 bxc4 Qxh8 Rd3 Qa8 c3 Qa4+ Ke1 f4 f5 Kc1 Rd2 Qa7",
    notes: {
      20: "11.O-O-O: enroques opuestos, la partida será una carrera de ataques.",
      35: "18.Na5: el caballo se instala junto al rey negro.",
      46: "24.Rxd4!!: el sacrificio que da nombre a la partida.",
      48: "25.Re7+: el rey negro es arrastrado hacia el centro del tablero.",
      52: "27.b4+: el rey negro se ve obligado a avanzar hasta territorio blanco.",
      58: "30.Rxb7: la torre sigue sacrificándose para abrir líneas.",
      66: "34.Qa1+: el rey negro llega a d1, la casilla del rey blanco.",
      87: "44.Qa7: Topálov abandona. Una de las partidas más bellas de la historia.",
    },
  },
  {
    title: "Kárpov – Kaspárov",
    event: "Mundial de Moscú, 1985 · Partida 16 · Siciliana",
    result: "0-1",
    intro: "El famoso «caballo pulpo» en d3: una pieza clavada en el corazón de la posición blanca que paraliza a Kárpov.",
    moves: "e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nb5 d6 c4 Nf6 N1c3 a6 Na3 d5 cxd5 exd5 exd5 Nb4 Be2 Bc5 O-O O-O Bf3 Bf5 Bg5 Re8 Qd2 b5 Rad1 Nd3 Nab1 h6 Bh4 b4 Na4 Bd6 Bg3 Rc8 b3 g5 Bxd6 Qxd6 g3 Nd7 Bg2 Qf6 a3 a5 axb4 axb4 Qa2 Bg6 d6 g4 Qd2 Kg7 f3 Qxd6 fxg4 Qd4+ Kh1 Nf6 Rf4 Ne4 Qxd3 Nf2+ Rxf2 Bxd3 Rfd2 Qe3 Rxd3 Rc1 Nb2 Qf2 Nd2 Rxd1+ Nxd1 Re1+",
    notes: {
      15: "8...d5!?: Kaspárov sacrifica un peón por iniciativa (Gambito Kaspárov).",
      31: "16...Nd3!: el «caballo pulpo» se clava en d3 y ya no se moverá.",
      35: "18...b4: los caballos blancos quedan arrinconados.",
      67: "34.Qxd3: Kárpov por fin elimina el caballo… pero la combinación ya está en marcha.",
      79: "40...Re1+: las blancas abandonan. Kaspárov toma ventaja y será campeón con 22 años.",
    },
  },
];

const STATS = [
  ["13", "Campeón del mundo número"],
  ["1985–2000", "Campeón mundial"],
  ["22", "Años al ser campeón"],
  ["2851", "Elo máximo (1999)"],
  ["255", "Meses n.º 1 del mundo"],
  ["5", "Matches mundiales vs. Kárpov"],
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

function Legacy({ icon: Icon, title, children }: { icon: typeof Crown; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary">{title}</h3>
      </div>
      <p className="mt-2 text-sm">{children}</p>
    </div>
  );
}

function Kasparov() {
  const [g, setG] = useState(0);
  return (
    <main className="karpov-contrast min-h-screen bg-background">
      <BackToPanel floating />
      <header className="border-b-2 border-primary/60 bg-card px-6 py-14 text-center">
        <p className="font-display text-sm tracking-[0.4em] text-primary">Campeón del mundo · 1963 – Bakú, URSS</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase tracking-wide text-primary sm:text-7xl">Garri Kaspárov</h1>
        <p className="mt-3 text-2xl italic text-muted-foreground">El Ogro de Bakú</p>
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
            <p>Nació el 13 de abril de 1963 en Bakú. De niño resolvía los problemas de ajedrez del periódico que leían sus padres, y aprendió a jugar a los <b className="text-primary">6 años</b>.</p>
            <p className="mt-3">Con 10 años entró en la escuela de Botvínnik y con 12 ya era campeón juvenil de la URSS.</p>
          </Card>
          <Card n={2} title="Familia" icon={Users}>
            <p>Su padre, <b className="text-primary">Kim Weinstein</b>, murió cuando Garri tenía 7 años. Su madre, <b className="text-primary">Klara Kasparián</b>, ingeniera, fue su gran apoyo y le acompañó en toda su carrera.</p>
            <p className="mt-3">Con 12 años adoptó el apellido de su madre, en su forma rusa: Kaspárov.</p>
          </Card>
          <Card n={3} title="Maestros" icon={GraduationCap}>
            <ul className="space-y-3">
              <li><b className="text-primary">Mijaíl Botvínnik</b> — el excampeón le enseñó el método de estudio y la preparación profunda de aperturas.</li>
              <li><b className="text-primary">Aleksandr Nikitin</b> — su entrenador durante años, quien le preparó para el asalto al título.</li>
              <li><b className="text-primary">Aleksandr Shakárov</b> — su analista y compañero de trabajo inseparable.</li>
            </ul>
          </Card>
          <Card n={4} title="Hitos" icon={Trophy}>
            <ul className="space-y-2">
              <li><b className="text-primary">1980</b> · Campeón mundial juvenil y gran maestro.</li>
              <li><b className="text-primary">1985</b> · Campeón del mundo con 22 años, el más joven de la historia hasta entonces.</li>
              <li><b className="text-primary">1999</b> · Elo 2851, récord que duró 14 años.</li>
              <li><b className="text-primary">1996–97</b> · Sus matches contra Deep Blue dan la vuelta al mundo.</li>
            </ul>
          </Card>
        </div>

        <Card n={5} title="La rivalidad con Kárpov" icon={Swords}>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="font-display text-5xl font-black text-primary">0–5</div>
              <p className="mt-2 text-sm">Empezó perdiendo 5 partidas en 1984, pero resistió y ganó 3 de las últimas.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="font-display text-5xl font-black text-primary">13–11</div>
              <p className="mt-2 text-sm">Resultado del Mundial de 1985: Kaspárov se proclama campeón.</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <div className="font-display text-5xl font-black text-primary">12–12</div>
              <p className="mt-2 text-sm">Sevilla 1987: retiene el título ganando la última partida.</p>
            </div>
          </div>
          <p className="mt-4">El joven rebelde de Bakú, agresivo y dinámico, contra el campeón del sistema soviético. Jugaron 144 partidas de match mundial.</p>
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
            <span className="text-muted-foreground"> — cada hito está cerrado con candado. Resuelve el acertijo de la partida de Kaspárov de ese momento para abrir el siguiente.</span>
          </div>
          <Timeline milestones={KASPAROV_MILESTONES} player="Kaspárov" />
        </Card>

        <Card n={8} title="Su legado al ajedrez" icon={Landmark} className="border-2 border-primary/80">
          <div className="grid gap-4 md:grid-cols-2">
            <Legacy icon={Zap} title="El ajedrez dinámico">Demostró que la iniciativa vale más que el material: sacrificaba peones y piezas por actividad y presión constante.</Legacy>
            <Legacy icon={BookOpen} title="Preparación de aperturas">Revolucionó el estudio de aperturas con análisis profundos; el Gambito Kaspárov o su uso de la Najdorf y la India de Rey marcaron época.</Legacy>
            <Legacy icon={Cpu} title="Ajedrez y ordenadores">Fue el primero en usar bases de datos a gran escala y protagonizó los históricos duelos con Deep Blue. Después creó el «ajedrez avanzado» humano + máquina: en 1998 jugó en León contra Topálov con la ayuda del módulo Fritz 5.</Legacy>
            <Legacy icon={GraduationCap} title="Divulgación">Su serie de libros «Mis geniales predecesores» repasa a todos los campeones del mundo y es obra de referencia.</Legacy>
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-primary/40 bg-card p-4">
            <Medal className="h-8 w-8 shrink-0 text-primary" />
            <p className="text-sm"><b className="text-primary">Récord histórico:</b> número 1 del mundo durante 255 meses entre 1984 y 2005, y ganador de 15 torneos de élite seguidos.</p>
          </div>
        </Card>

        <Card n={9} title="Su estilo" icon={Flame}>
          <ul className="list-inside list-disc space-y-1">
            <li>Ataque y energía: buscar siempre la iniciativa.</li>
            <li>Cálculo profundo y combinaciones brillantes.</li>
            <li>Preparación de aperturas incansable.</li>
            <li>Gran espíritu competitivo y fuerza psicológica.</li>
          </ul>
        </Card>

        <Card n={10} title="Curiosidades y anécdotas" icon={Star}>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ["El problema del periódico", "Con 5 años sorprendió a sus padres resolviendo un problema de ajedrez del periódico que ellos no habían logrado resolver."],
              ["El reloj en la muñeca", "Antes de una jugada decisiva solía ponerse el reloj de pulsera en la muñeca: sus rivales aprendieron a temer ese gesto."],
              ["Contra Deep Blue", "En 1997 perdió contra un ordenador de IBM; llegó a acusar al equipo de intervención humana y pidió la revancha, que nunca se jugó."],
              ["Contra el mundo (1999)", "Jugó una partida por internet contra más de 50.000 personas de 75 países que votaban cada jugada. Ganó tras 62 jugadas."],
              ["Ogro de Bakú", "Su apodo se debe a su ciudad natal y a la fuerza con la que aplastaba a sus rivales."],
              ["Vida política", "Tras retirarse en 2005 se dedicó a la política en Rusia y a la defensa de los derechos humanos."],
            ].map(([h, p]) => (
              <div key={h} className="rounded-lg border border-primary/30 bg-muted p-5">
                <h3 className="font-display text-base font-bold uppercase tracking-wide text-primary">{h}</h3>
                <p className="mt-3 text-base leading-relaxed text-foreground">{p}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card n={11} title="Fuente: Gambito de Dama · Documental" icon={Youtube}>
          <p className="font-display text-primary">"Garri Kaspárov: biografía, estilo, frases y curiosidades"</p>
          <audio className="mt-4 w-full" controls preload="auto" src={docAsset.url}>
            Tu navegador no puede reproducir este audio.
          </audio>
          <a href={`https://www.youtube.com/watch?v=${VIDEO_ID}`} target="_blank" rel="noreferrer" className="mt-4 inline-block text-primary underline">Ver en YouTube →</a>
        </Card>


        <Card n={12} title="Canción: El Ogro y su tortura mental" icon={Music}>
          <p className="font-display text-primary">Una balada a lo Alejandro Sanz sobre la vida de Kaspárov.</p>
          <img src={coverAsset.url} alt="Carátula de la canción El Ogro y su tortura mental" className="mx-auto mt-4 w-full max-w-xs rounded-lg border border-primary/50" />
          <audio className="mt-4 w-full" controls preload="auto" src={songAsset.url}>
            Tu navegador no puede reproducir este audio.
          </audio>
        </Card>

        <p className="pt-6 text-center text-xl italic text-primary">"El ajedrez es la tortura mental."</p>
      </div>
    </main>
  );
}
