import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { FICHAS } from "@/routes/clases-avanzadas";

describe("Clases avanzadas · niveles", () => {
  it("lists La fuerza de las piezas as Nivel 1, above Peones bajo presión as Nivel 2", () => {
    expect(FICHAS[0]?.title).toBe("Nivel 1 · La fuerza de las piezas");
    expect(FICHAS[0]?.to).toBe("/fuerza-de-las-piezas");
    expect(FICHAS[1]?.title).toBe("Nivel 2 · Peones bajo presión");
    expect(FICHAS[1]?.to).toBe("/peones-bajo-presion");
  });

  it("has its own page at /fuerza-de-las-piezas", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/fuerza-de-las-piezas").at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
