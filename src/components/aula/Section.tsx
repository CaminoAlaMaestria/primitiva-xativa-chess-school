import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Lock } from "lucide-react";
import type { ReactNode } from "react";

export type Ficha = { title: string; subtitle: string; to?: "/karpov" | "/kasparov" | "/peones-bajo-presion" | "/arcangel" | "/fuerza-de-las-piezas" };

export function BackToPanel({ floating = false }: { floating?: boolean }) {
  return (
    <Link
      to="/"
      className={
        floating
          ? "fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-primary/60 bg-card/95 px-4 py-2 font-display text-xs uppercase tracking-wider text-primary shadow-xl backdrop-blur print:hidden"
          : "inline-flex items-center gap-2 font-display text-xs uppercase tracking-wider text-primary hover:underline"
      }
    >
      <ArrowLeft className="h-4 w-4" /> Panel
    </Link>
  );
}

export function SectionPage({ kicker, title, intro, fichas, icon }: { kicker: string; title: string; intro: string; fichas: Ficha[]; icon: ReactNode }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="aula-header px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <BackToPanel />
          <div className="mt-6 flex items-center gap-4">
            <div className="text-primary">{icon}</div>
            <div>
              <p className="font-display text-xs tracking-[0.4em] text-primary aula-kicker">{kicker}</p>
              <h1 className="font-display text-4xl font-black uppercase tracking-wide text-primary sm:text-5xl">{title}</h1>
            </div>
          </div>
          <p className="mt-4 text-xl italic text-muted-foreground aula-intro">{intro}</p>
        </div>
      </header>
      <ul className="mx-auto max-w-4xl space-y-3 px-4 py-10">
        {fichas.map((f, i) => {
          const body = (
            <>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display font-black text-primary-foreground">{i + 1}</span>
              <div className="min-w-0">
                <div className="font-display text-lg font-bold uppercase tracking-wider text-primary">{f.title}</div>
                <div className="text-muted-foreground">{f.subtitle}</div>
              </div>
              {f.to ? <ChevronRight className="ml-auto h-5 w-5 text-primary" /> : <Lock className="ml-auto h-5 w-5 text-muted-foreground" />}
            </>
          );
          return (
            <li key={f.title}>
              {f.to ? (
                <Link to={f.to} className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-xl transition hover:border-primary">
                  {body}
                </Link>
              ) : (
                <div className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-5 opacity-80">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
