import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { SectionPage, type Ficha } from "@/components/aula/Section";

export const FICHAS: Ficha[] = [
  { title: "Variante Arcángel", subtitle: "Estudio interactivo · C78 · 3 partidas y 8 ejercicios", to: "/arcangel" },
];

export const Route = createFileRoute("/apertura-espanola")({
  head: () => ({
    meta: [
      { title: "Apertura Española · Aula de Ajedrez" },
      { name: "description", content: "Variantes de la Apertura Española (Ruy López) para clase." },
      { property: "og:title", content: "Apertura Española · Aula de Ajedrez" },
      { property: "og:description", content: "Fichas de variantes de la Ruy López." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SectionPage
      kicker="Ventana 2"
      title="Apertura Española"
      intro="1.e4 e5 2.Cf3 Cc6 3.Ab5 — variante a variante."
      icon={<BookOpen className="h-12 w-12" />}
      fichas={FICHAS}
    />
  ),
});
