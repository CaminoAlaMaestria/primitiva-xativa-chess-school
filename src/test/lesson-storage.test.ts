import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_BOARD_STYLE,
  parseStoredObject,
  sanitizeBoardStyle,
  sanitizePositions,
  sanitizeTexts,
} from "@/lesson/storage.js";

const isValidFen = (fen: string) => {
  try {
    new Chess(fen);
    return true;
  } catch {
    return false;
  }
};

const DIAGRAMS = ["A30", "A31", "A32", "A33", "A34", "A36", "A37", "A38", "A39"];
const UNITS = ["debilitar", "casos", "doblados", "centro"];

describe("Saneamiento del almacenamiento de la ficha", () => {
  it("descarta JSON guardado que no es un objeto", () => {
    expect(parseStoredObject("null")).toBeNull();
    expect(parseStoredObject("[]")).toBeNull();
    expect(parseStoredObject("12345")).toBeNull();
    expect(parseStoredObject("{no es json")).toBeNull();
    expect(parseStoredObject("")).toBeNull();
    expect(parseStoredObject('{"A30":{"fen":"x"}}')).toEqual({ A30: { fen: "x" } });
  });

  it("conserva las posiciones válidas y devuelve las corruptas al diagrama original", () => {
    const stored = {
      A30: { fen: "" },
      A31: { fen: "8/8/8/8/8/8/8/8 w - - 0 1" },
      A32: { fen: "esto no es un fen" },
      A33: { fen: 12345 },
      A34: { note: "sin campo fen" },
      A36: { fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1" },
      ZZ9: { fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1" },
    };

    const { positions, changed } = sanitizePositions(stored, DIAGRAMS, isValidFen);

    expect(Object.keys(positions)).toEqual(["A36"]);
    expect(positions["A36"]?.fen).toBe("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
    expect(changed).toBe(true);
  });

  it("no reescribe el almacenamiento cuando todo lo guardado es correcto", () => {
    const stored = { A30: { fen: "3q3k/7p/p3pnnp/1p1p4/2pPP3/2P1N1PP/PPB1QP2/6K1 w - - 0 27" } };

    const { positions, changed } = sanitizePositions(stored, DIAGRAMS, isValidFen);

    expect(changed).toBe(false);
    expect(Object.keys(positions)).toEqual(["A30"]);
  });

  it("acepta solo textos de unidades conocidas y en forma de texto", () => {
    const stored = { debilitar: "<b>texto guardado</b>", casos: 12345, inventada: "<i>x</i>", centro: null };

    expect(sanitizeTexts(stored, UNITS)).toEqual({ debilitar: "<b>texto guardado</b>" });
    expect(sanitizeTexts(null, UNITS)).toEqual({});
    expect(sanitizeTexts("[]", UNITS)).toEqual({});
  });

  it("recupera los colores y el juego de piezas del aula cuando son inválidos", () => {
    expect(sanitizeBoardStyle({ light: "noescolor", dark: null, theme: "nodexiste" })).toEqual(DEFAULT_BOARD_STYLE);
    expect(sanitizeBoardStyle("[]")).toEqual(DEFAULT_BOARD_STYLE);
    expect(sanitizeBoardStyle({ light: "#ffffff", dark: "#123456", theme: "cburnett" })).toEqual({
      light: "#ffffff",
      dark: "#123456",
      theme: "cburnett",
    });
  });
});
