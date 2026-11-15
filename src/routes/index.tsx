import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Crown, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aula de Ajedrez · Panel de clases" },
      { name: "description", content: "Panel para dar clases de ajedrez: campeones mundiales, Apertura Española y clases avanzadas." },
      { property: "og:title", content: "Aula de Ajedrez · Panel de clases" },
      { property: "og:description", content: "Tres ventanas de clase: campeones, Apertura Española y clases avanzadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const WINDOWS = [
  { to: "/campeones", n: "I", title: "Campeones mundiales", text: "Vida, partidas y legado de los grandes.", count: "1 ficha", icon: Crown },
  { to: "/apertura-espanola", n: "II", title: "Apertura Española", text: "La Ruy López, variante a variante.", count: "1 variante", icon: BookOpen },
  { to: "/clases-avanzadas", n: "III", title: "Clases avanzadas", text: "Niveles con tablero, ejercicios y motor.", count: "1 nivel", icon: GraduationCap },
] as const;

function Index() {
  return (
    <main className="min-h-screen bg-background">
      <header className="aula-header px-6 py-16 text-center">
        <p className="font-display text-sm tracking-[0.4em] text-primary aula-kicker">Panel del profesor</p>
        <h1 className="mt-3 font-display text-5xl font-black uppercase tracking-wide text-primary sm:text-7xl">Aula de Ajedrez</h1>
        <p className="mt-3 text-2xl italic text-muted-foreground aula-intro">Elige una ventana para empezar la clase</p>
      </header>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        {WINDOWS.map(({ to, n, title, text, count, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl transition hover:-translate-y-1 hover:border-primary"
          >
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-wood to-card px-5 py-3">
              <span className="font-display text-2xl font-black text-primary">{n}</span>
              <Icon className="h-6 w-6 text-primary/80" />
            </div>
            <div className="flex flex-1 flex-col p-6">
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-primary">{title}</h2>
              <p className="mt-2 text-muted-foreground">{text}</p>
              <span className="mt-6 inline-block self-start rounded-full border border-primary/40 px-3 py-1 font-mono text-xs text-primary">{count}</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
