import { createFileRoute } from "@tanstack/react-router";
import { Crown } from "lucide-react";
import { SectionPage } from "@/components/aula/Section";

export const Route = createFileRoute("/campeones")({
  head: () => ({
    meta: [
      { title: "Campeones mundiales · Aula de Ajedrez" },
      { name: "description", content: "Fichas de los campeones del mundo de ajedrez para clase." },
      { property: "og:title", content: "Campeones mundiales · Aula de Ajedrez" },
      { property: "og:description", content: "Vida, partidas y legado de los campeones del mundo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SectionPage
      kicker="Ventana 1"
      title="Campeones mundiales"
      intro="Vida, partidas y legado de quienes llevaron la corona."
      icon={<Crown className="h-12 w-12" />}
      fichas={[{ title: "Anatoli Kárpov", subtitle: "Ajedrez y vida · 12.º campeón del mundo", to: "/karpov" }, { title: "Garri Kaspárov", subtitle: "Ajedrez y vida · 13.º campeón del mundo", to: "/kasparov" }]}
    />
  ),
});
