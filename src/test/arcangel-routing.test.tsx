import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { FICHAS } from "@/routes/apertura-espanola";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("Variante Arcángel", () => {
  it("has its own page at /arcangel instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/arcangel");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("is unlocked in Apertura Española and opens the /arcangel page", () => {
    const arcangel = FICHAS.find((f) => f.title === "Variante Arcángel");

    expect(arcangel?.to).toBe("/arcangel");
  });
});
