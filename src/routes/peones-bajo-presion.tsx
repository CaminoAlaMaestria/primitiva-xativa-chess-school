import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import lessonCss from "@/lesson/lesson.css?url";
import bodyHtml from "@/lesson/body.html?raw";

export const Route = createFileRoute("/peones-bajo-presion")({
  head: () => ({
    meta: [
      { title: "Peones bajo presión · Aula de ajedrez" },
      { name: "description", content: "Clase interactiva de ajedrez avanzado: diagramas A30–A39, tablero, variantes y análisis con Stockfish." },
      { property: "og:title", content: "Peones bajo presión · Aula de ajedrez" },
      { property: "og:description", content: "Ficha interactiva de estructura de peones para el aula, con tablero y motor de análisis." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "theme-color", content: "#071d2f" },
    ],
    links: [{ rel: "stylesheet", href: lessonCss }],
  }),
  component: Lesson,
});

function Lesson() {
  useEffect(() => {
    import("@/lesson/app.js")
      .then((m) => m.startLesson())
      .catch((e) => console.error("No se pudo cargar la clase:", e));
  }, []);
  return <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
}
