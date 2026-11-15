// Saneamiento de lo que la ficha guarda en este navegador.
// Todo valor guardado puede llegar corrupto (edición manual, versión antigua,
// almacenamiento compartido) y nunca debe dejar la clase sin contenido.

export const DEFAULT_BOARD_STYLE = { light: '#f5eacc', dark: '#92c4b7', theme: 'merida' };
export const PIECE_THEMES = ['merida', 'cburnett', 'alpha'];

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// JSON que no sea un objeto (null, [], 'hola', 123, texto roto) se descarta.
export function parseStoredObject(raw) {
  if (typeof raw !== 'string' || raw === '') return null;
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  return isPlainObject(parsed) ? parsed : null;
}

// Solo se conservan posiciones de diagramas conocidos cuyo FEN el motor acepta.
export function sanitizePositions(stored, validKeys, isValidFen) {
  const kept = {};
  let changed = false;
  if (!isPlainObject(stored)) return { positions: kept, changed: true };
  for (const [key, value] of Object.entries(stored)) {
    const fen = isPlainObject(value) ? value.fen : undefined;
    if (validKeys.includes(key) && typeof fen === 'string' && isValidFen(fen)) {
      kept[key] = { ...value, fen };
    } else {
      changed = true;
    }
  }
  return { positions: kept, changed };
}

// Los textos personalizados solo se aceptan como cadenas de unidades conocidas.
export function sanitizeTexts(stored, unitKeys) {
  const kept = {};
  if (!isPlainObject(stored)) return kept;
  for (const [key, value] of Object.entries(stored)) {
    if (unitKeys.includes(key) && typeof value === 'string') kept[key] = value;
  }
  return kept;
}

// Colores y juego de piezas: si uno no sirve, se recupera el valor del aula.
export function sanitizeBoardStyle(stored) {
  const source = isPlainObject(stored) ? stored : {};
  const style = { ...DEFAULT_BOARD_STYLE };
  if (HEX_COLOR.test(String(source.light ?? ''))) style.light = source.light;
  if (HEX_COLOR.test(String(source.dark ?? ''))) style.dark = source.dark;
  if (PIECE_THEMES.includes(source.theme)) style.theme = source.theme;
  return style;
}
