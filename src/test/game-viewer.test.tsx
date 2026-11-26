import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GameViewer, type Game } from "@/components/karpov/GameViewer";

const TEST_GAME_A: Game = {
  id: "test-viewer-a",
  title: "Partida A",
  event: "Xàtiva, 2026",
  result: "1-0",
  intro: "Posición de salida de prueba.",
  moves: "e4 e5",
  notes: {
    1: "Apertura de rey.",
  },
};

const TEST_GAME_B: Game = {
  id: "test-viewer-b",
  title: "Partida B",
  event: "Xàtiva, 2026",
  result: "0-1",
  intro: "Segunda partida de prueba.",
  moves: "d4 d5",
  notes: {},
};

const PROMO_GAME: Game = {
  id: "test-promo",
  title: "Final de promoción",
  event: "Estudio, 2026",
  result: "1-0",
  intro: "Demostración de coronación.",
  moves: "e4 d5 exd5 Nf6 d6 Ng8 dxe7 Nc6",
  notes: {},
};

describe("GameViewer con jugadas de análisis y variantes guardadas", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      json: async () => null,
    } as Response);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("permite jugar fuera de la partida en el tablero, añadir nota, guardar la variante y conservarla tras recargar", async () => {
    const view = render(<GameViewer game={TEST_GAME_A} />);

    // Avanza a 1. e4 desde la posición inicial usando el botón Siguiente.
    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    expect(screen.getByText(/Jugada 1\. e4/)).toBeInTheDocument();

    // Juega una respuesta que no estaba en la partida (1... c5).
    fireEvent.click(screen.getByRole("button", { name: /Casilla c7/i }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla c5/i }));

    expect(screen.getByText(/Variante de análisis · 1… c5/)).toBeInTheDocument();
    expect(screen.getByText("Borrador sin guardar")).toBeInTheDocument();

    // Añade una nota y guarda la variante en la partida.
    fireEvent.click(screen.getByRole("button", { name: /Añadir nota/i }));
    fireEvent.change(screen.getByLabelText("Nota de la variante"), {
      target: { value: "Alternativa aguda" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guardar variante en la partida/i }));

    expect(await screen.findByText(/Variante guardada/)).toBeInTheDocument();
    expect(screen.getAllByText("Alternativa aguda").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Variantes guardadas \(1\):/)).toBeInTheDocument();

    // Al desmontar y volver a renderizar, la variante guardada debe seguir en la partida.
    view.unmount();
    render(<GameViewer game={TEST_GAME_A} />);

    const chip = await screen.findByRole("button", { name: /tras 1\. e4: 1… c5/i });
    fireEvent.click(chip);
    expect(screen.getByText(/Variante de análisis · 1… c5/)).toBeInTheDocument();
    expect(screen.getAllByText("Alternativa aguda").length).toBeGreaterThanOrEqual(2);

    // Se puede eliminar la variante guardada con confirmación.
    fireEvent.click(screen.getByRole("button", { name: /Eliminar variante/i }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmar/i }));
    expect(await screen.findByText(/Variante eliminada de la partida/)).toBeInTheDocument();
    expect(screen.queryByText(/Variantes guardadas/i)).not.toBeInTheDocument();
  });

  it("mantiene las variantes aisladas por partida al cambiar de pestaña", async () => {
    const view = render(<GameViewer game={TEST_GAME_A} />);

    fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla c7/i }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla c5/i }));
    fireEvent.click(screen.getByRole("button", { name: /Guardar variante en la partida/i }));
    expect(await screen.findByText(/Variantes guardadas \(1\):/)).toBeInTheDocument();

    // Cambia a la partida B: no debe mostrar variantes de la partida A.
    view.rerender(<GameViewer game={TEST_GAME_B} />);
    expect(screen.queryByText(/Variantes guardadas/i)).not.toBeInTheDocument();
    expect(screen.getByText("Segunda partida de prueba.")).toBeInTheDocument();

    // Vuelve a la partida A: su variante sigue ahí.
    view.rerender(<GameViewer game={TEST_GAME_A} />);
    expect(await screen.findByText(/Variantes guardadas \(1\):/)).toBeInTheDocument();
  });

  it("muestra selector de promoción al coronar un peón y permite girar el tablero", () => {
    render(<GameViewer game={PROMO_GAME} />);

    fireEvent.click(screen.getByRole("button", { name: "Final" }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla e7/i }));
    fireEvent.click(screen.getByRole("button", { name: /Casilla d8/i }));

    expect(screen.getByRole("dialog", { name: /Elegir pieza de promoción/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Caballo/i }));
    expect(screen.getByText(/Variante de análisis · 5\. exd8=N/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Girar tablero" }));
    const buttons = screen.getAllByRole("button", { name: /^Casilla /i });
    expect(buttons[0]).toHaveAttribute("aria-label", expect.stringContaining("Casilla h1"));
  });
});
