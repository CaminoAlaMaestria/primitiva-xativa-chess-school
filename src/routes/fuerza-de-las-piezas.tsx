import { createFileRoute } from "@tanstack/react-router";
import { BackToPanel } from "@/components/aula/Section";
import { useEffect } from "react";
import lessonCss from "@/lesson/lesson.css?url";
import bodyHtml from "@/lesson-fuerza/body.html?raw";

export const Route = createFileRoute("/fuerza-de-las-piezas")({
  head: () => ({
    meta: [
      { title: "La fuerza de las piezas · Aula de ajedrez" },
      { name: "description", content: "Nivel 1: la fuerza de las piezas según la estructura de peones, el plan y la mayoría, con diagramas A16–A29." },
      { property: "og:title", content: "La fuerza de las piezas · Aula de ajedrez" },
      { property: "og:description", content: "Ficha interactiva: estructura de peones, carácter de la posición y plan, con ejercicios y partidas." },
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
    import("@/lesson-fuerza/app.js")
      .then((m) => m.startLesson())
      .catch((e) => console.error("No se pudo cargar la clase:", e));
  }, []);
  return (
    <>
      <BackToPanel floating />
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
