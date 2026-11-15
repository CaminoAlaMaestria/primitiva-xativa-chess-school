export interface BoardStyle {
  light: string;
  dark: string;
  theme: string;
}

export interface StoredPosition {
  fen: string;
  [key: string]: unknown;
}

export declare const DEFAULT_BOARD_STYLE: BoardStyle;
export declare const PIECE_THEMES: string[];

export declare function isPlainObject(value: unknown): boolean;
export declare function parseStoredObject(raw: unknown): Record<string, unknown> | null;
export declare function sanitizePositions(
  stored: unknown,
  validKeys: string[],
  isValidFen: (fen: string) => boolean,
): { positions: Record<string, StoredPosition>; changed: boolean };
export declare function sanitizeTexts(stored: unknown, unitKeys: string[]): Record<string, string>;
export declare function sanitizeBoardStyle(stored: unknown): BoardStyle;
