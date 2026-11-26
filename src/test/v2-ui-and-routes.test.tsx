import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...rest
    }: {
      children: ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => (
      <a href={typeof to === "string" ? to : "#"} {...rest}>
        {children}
      </a>
    ),
  };
});

import { GameViewer, type Game } from "@/components/karpov/GameViewer";
import { PuzzleBoard, type Milestone } from "@/components/karpov/Timeline";
import { Route as KarpovRoute } from "@/routes/karpov";
import { Route as KasparovRoute } from "@/routes/kasparov";

const TEST_GAME: Game = {
  id: "test-pgn-marks",
  title: "Partida con marcas",
  event: "Xàtiva 2026",
  result: "1-0",
  intro: "Inicio original.",
  moves: "e4 e5",
  notes: { 1: "Nota original 1." },
};

const TEST_MILESTONE: Milestone = {
  year: "1994",
  title: "Prueba táctica",
  text: "Posición de prueba.",
  game: "Blancas – Negras · Prueba",
  moves: "e4 e5 Nf3 Nc6 Bb5",
  solution: "a6",
  question: "Juegan las negras. ¿Cuál es la respuesta clásica?",
  hint: "Pista: a7-a6.",
  success: "¡3...a6!",
};

describe("Tableros v2: signos PGN, flechas, colores, cronología y orden de fichas", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("permite poner signos PGN, flechas y casillas de color en GameViewer y restaurar el original", async () => {
    const view = render(<GameViewer game={TEST_GAME} />);

    // Avanza a 1. e4 y marca la jugada con !!
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: "Signo !!" }));
    expect(screen.getByText(/Jugada 1\. e4!!/)).toBeInTheDocument();

    // Selecciona modo Flecha, color Rojo y dibuja una flecha e4 -> f7.
    fireEvent.click(screen.getByRole("button", { name: /Flecha/i }));
    fireEvent.click(screen.getByRole("button", { name: /Color Rojo/i }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla e4/i }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla f7/i }));
    expect(document.querySelectorAll("svg line").length).toBeGreaterThanOrEqual(1);

    // Recarga y verifica que !! y la flecha se mantienen.
    view.unmount();
    render(<GameViewer game={TEST_GAME} />);
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/Jugada 1\. e4!!/)).toBeInTheDocument();
    expect(document.querySelectorAll("svg line").length).toBeGreaterThanOrEqual(1);

    // Restaura la partida original intacta.
    fireEvent.click(screen.getByRole("button", { name: /Restaurar original/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/i }));
    expect(
      await screen.findByText(/Partida restaurada a su forma original intacta/),
    ).toBeInTheDocument();
    expect(document.querySelectorAll("svg line").length).toBe(0);
    expect(screen.getByText("Nota original 1.")).toBeInTheDocument();
  });

  it("en Cronología (PuzzleBoard) permite analizar y guardar variantes fuera de la partida sin alterar el reto", async () => {
    const onSolved = vi.fn();
    const view = render(
      <PuzzleBoard
        m={TEST_MILESTONE}
        scopeKey="timeline:test:1994"
        player="Kárpov"
        onSolved={onSolved}
      />,
    );

    // Entra en modo análisis libre sin haber resuelto el reto todavía.
    fireEvent.click(screen.getByRole("button", { name: /Analizar fuera del reto/i }));

    // Juega una alternativa fuera de la solución (3... Cf6 en lugar de 3... a6).
    fireEvent.click(screen.getByRole("button", { name: /Casilla g8/i }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla f6/i }));
    expect(screen.getByText(/Variante en el hito · 3… Nf6/)).toBeInTheDocument();

    // Guarda la variante en el hito y verifica persistencia al recargar.
    fireEvent.click(screen.getByRole("button", { name: /Guardar variante en el hito/i }));
    expect(await screen.findByText(/Variantes guardadas \(1\):/)).toBeInTheDocument();

    view.unmount();
    render(
      <PuzzleBoard
        m={TEST_MILESTONE}
        scopeKey="timeline:test:1994"
        player="Kárpov"
        onSolved={onSolved}
      />,
    );
    expect(await screen.findByText(/Variantes guardadas \(1\):/)).toBeInTheDocument();

    // El reto original sigue intacto y se puede resolver normalmente con 3... a6.
    expect(onSolved).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /Casilla a7/i }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla a6/i }));
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/¡Correcto!/)).toBeInTheDocument();
  });

  it("reordena las secciones 6–10 en Kárpov y Kaspárov (6 Legado, 7 Estilo, 8 Curiosidades, 9 Partidas, 10 Cronología)", () => {
    const KarpovPage = KarpovRoute.options.component!;
    const { container: karpovContainer, unmount } = render(<KarpovPage />);
    const karpovHeadings = [...karpovContainer.querySelectorAll("section header h2")].map((h) =>
      h.textContent?.trim(),
    );
    expect(karpovHeadings.slice(5, 10)).toEqual([
      "Su legado al ajedrez",
      "Su estilo",
      "Curiosidades y anécdotas",
      "Partidas famosas",
      "Cronología: desbloquea su carrera",
    ]);
    unmount();

    const KasparovPage = KasparovRoute.options.component!;
    const { container: kasparovContainer } = render(<KasparovPage />);
    const kasparovHeadings = [...kasparovContainer.querySelectorAll("section header h2")].map((h) =>
      h.textContent?.trim(),
    );
    expect(kasparovHeadings.slice(5, 10)).toEqual([
      "Su legado al ajedrez",
      "Su estilo",
      "Curiosidades y anécdotas",
      "Partidas famosas",
      "Cronología: desbloquea su carrera",
    ]);
  });
});
