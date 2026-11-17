import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { SectionPage, type Ficha } from "@/components/aula/Section";

export const FICHAS: Ficha[] = [
  { title: "Nivel 1 · La fuerza de las piezas", subtitle: "Diagramas A16–A29: estructura, plan y mayoría de peones", to: "/fuerza-de-las-piezas" },
  { title: "Nivel 2 · Peones bajo presión", subtitle: "Diagramas A30–A43, tablero, variantes y Stockfish", to: "/peones-bajo-presion" },
];

export const Route = createFileRoute("/clases-avanzadas")({
  head: () => ({
    meta: [
      { title: "Clases avanzadas · Aula de Ajedrez" },
      { name: "description", content: "Niveles de clases avanzadas de ajedrez con tablero y análisis." },
      { property: "og:title", content: "Clases avanzadas · Aula de Ajedrez" },
      { property: "og:description", content: "Niveles interactivos de ajedrez avanzado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SectionPage
      kicker="Ventana 3"
      title="Clases avanzadas"
      intro="Niveles que iremos ampliando poco a poco."
      icon={<GraduationCap className="h-12 w-12" />}
      fichas={FICHAS}
    />
  ),
});
