import { Chess } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import {
  analyzePositionOffline,
  flushPendingLessonMoves,
  formatEvalScore,
  LessonMarksController,
  readPendingLessonMoves,
  saveLessonMovesOfflineFirst,
} from '@/lib/lesson-marks';
import p1 from '@/assets/fuerza/clase-1.jpg.asset.json';
import p2 from '@/assets/fuerza/clase-2.jpg.asset.json';
import p3 from '@/assets/fuerza/clase-3.jpg.asset.json';
import p4 from '@/assets/fuerza/clase-4.jpg.asset.json';
import p5 from '@/assets/fuerza/ejercicios-1.jpg.asset.json';
const SOURCE_PAGES = [p1.url, p2.url, p3.url, p4.url, p5.url];
import bakedPositions from './baked-positions.json';
import { parseStoredObject, sanitizeBoardStyle, sanitizePositions, sanitizeTexts } from '@/lesson/storage.js';

const boardMarks = new LessonMarksController('fuerza-de-las-piezas');
let cancelMainEng = null;
const sectionEngCancel = { ejercicio: null, partida: null };

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const lessonUnits = {
 "fuerza": {
  "number": "01",
  "title": "La fuerza de las piezas",
  "page": "Páginas 5–6 · Diagramas A16–A18",
  "text": "La estructura de peones da una fuerza especial a unas piezas y resta valor a otras. Un alfil encerrado por su propia cadena vale mucho menos que uno con diagonales libres; un caballo en un puesto avanzado es una pieza hiperactiva.",
  "question": "En A17, ¿qué estructura es mejor, la blanca o la negra? ¿Qué casilla lo decide?",
  "points": [
   "Busca qué alfil queda cegado por su propia cadena de peones.",
   "Localiza los puestos avanzados: casillas que ningún peón rival puede atacar.",
   "Un peón doblado puede ser bueno si controla un punto fuerte."
  ],
  "position": "A16",
  "audio": "",
  "audioLabel": ""
 },
 "caracter": {
  "number": "02",
  "title": "Carácter de la posición y el plan",
  "page": "Página 6 · Diagrama A19",
  "text": "Para elegir un plan hay que valorar la posición: material, estructura de peones, fuerza de las piezas, seguridad de los reyes y colaboración entre piezas y peones. «Más vale un mal plan que la ausencia de plan».",
  "question": "En A19 juegan negras: ¿defender f2 pasivamente o buscar un golpe táctico?",
  "points": [
   "Haz el balance: material, peones, piezas, reyes y colaboración.",
   "Si hay una secuencia forzada, el plan es calcularla con precisión.",
   "Los planes estratégicos se dividen en fases y se corrigen según la partida."
  ],
  "position": "A19",
  "audio": "",
  "audioLabel": ""
 },
 "mayoria": {
  "number": "03",
  "title": "La mayoría de peones",
  "page": "Página 7 · Diagramas A20–A23",
  "text": "Cuando la única diferencia es la distribución de peones, cada bando juega con su mayoría: uno ataca el enroque, el otro crea un peón pasado en el flanco opuesto. Capablanca contra Marshall es el ejemplo clásico.",
  "question": "En A21, ¿dónde tiene cada bando su mayoría y qué plan sugiere cada una?",
  "points": [
   "Cuenta los peones de cada flanco: 4 contra 3.",
   "Avanza la mayoría para crear un peón pasado.",
   "Los cambios de piezas favorecen al bando cuya mayoría está más lejos del rey."
  ],
  "position": "A21",
  "audio": "",
  "audioLabel": ""
 },
 "pieza": {
  "number": "04",
  "title": "La pieza fuera de juego",
  "page": "Página 8 · Diagramas A24–A25",
  "text": "Que una pieza menor quede fuera de juego puede ser la base de todo un plan estratégico. En la Española el caballo negro de b7 puede quedarse bloqueado; Geller construyó toda la partida a partir de ello.",
  "question": "En A24, ¿qué pieza negra no tiene futuro y cómo la mantendrías fuera de juego?",
  "points": [
   "Identifica la pieza sin casillas útiles.",
   "No le permitas volver al juego: controla sus casillas de regreso.",
   "Con el rival jugando con una pieza menos, ataca en el otro flanco."
  ],
  "position": "A24",
  "audio": "",
  "audioLabel": ""
 }
};

const positions = {
 "A16": {
  "page": 1,
  "title": "El alfil cegado",
  "subtitle": "Puesto avanzado en e4",
  "fen": "6k1/pp3ppp/2p1p3/3p4/3P1P2/P1P1P3/1P4PP/6K1 w - - 0 1",
  "note": "<b>Observa:</b> un alfil blanco en c1 quedaría cegado por su cadena a3–b2–c3–d4–e3–f4. Las negras tienen un puesto avanzado en <b>e4</b>; e5 no es punto fuerte blanco porque ...f6 lo controla. (Reyes añadidos para poder mover.)",
  "unit": "fuerza",
  "line": []
 },
 "A17": {
  "page": 1,
  "title": "¿Qué estructura es mejor?",
  "subtitle": "El punto fuerte d5",
  "fen": "6k1/p4pp1/1p5p/2p1p3/2P1P3/2P2P2/PP4P1/6K1 w - - 0 1",
  "note": "<b>Pregunta:</b> las blancas tienen un peón doblado, pero c4 y e4 dominan <b>d5</b>. Un caballo allí no se puede cambiar sin crear un peón pasado. (Reyes añadidos para poder mover.)",
  "unit": "fuerza",
  "line": []
 },
 "A18": {
  "page": 2,
  "title": "Mayoría contenida",
  "subtitle": "Puntos fuertes en c4 y c5",
  "fen": "6k1/p4ppp/2p5/1p1p4/1P1P4/4P3/P4PPP/6K1 w - - 0 1",
  "note": "<b>Discute:</b> b4 frena la mayoría negra pero debilita para siempre <b>c4</b>. Las blancas tienen su punto fuerte en <b>c5</b>: ¿qué caballo llegará antes? (Reyes añadidos para poder mover.)",
  "unit": "fuerza",
  "line": []
 },
 "A19": {
  "page": 2,
  "title": "Un plan táctico",
  "subtitle": "Juegan negras · el doble del caballo",
  "fen": "8/7p/2kn2p1/2r5/P2K4/2N5/5p1P/5R2 b - - 0 1",
  "note": "<b>Calcula:</b> defender f2 pasivamente pierde el peón. Busca la secuencia 1...Cf5+ 2.Rd3 Txc3+! 3.Rxc3 Ce3! 4.Txf2 Cd1+.",
  "unit": "caracter",
  "line": [
   "d6f5",
   "d4d3",
   "c5c3",
   "d3c3",
   "f5e3",
   "f1f2",
   "e3d1"
  ]
 },
 "A20": {
  "page": 3,
  "title": "Variante Abierta de la Española",
  "subtitle": "Mayorías en flancos opuestos",
  "fen": "3r1rk1/2pqbppp/p1n1b3/1p1pP3/8/1BP1BN2/PP1Q1PPP/3R1RK1 w - - 0 1",
  "note": "<b>Planes:</b> las blancas atacan el enroque (Ac2, Dd3, Cg5) y preparan f2–f4–f5; las negras crean contrajuego en el flanco de dama con ...Ca5, ...c5 y ...d4.",
  "unit": "mayoria",
  "line": []
 },
 "A21": {
  "page": 3,
  "title": "Marshall – Capablanca",
  "subtitle": "Nueva York 1909 · tras 15...O-O",
  "fen": "r4rk1/pp2qppp/4b3/2p5/8/4PQP1/PP3PBP/R4RK1 w - - 0 16",
  "note": "<b>Material igualado:</b> la única diferencia son las mayorías (blancas en el rey, negras en la dama). Marshall no encuentra un plan; Capablanca sí.",
  "unit": "mayoria",
  "line": [
   "f1c1",
   "a8b8",
   "f3e4",
   "e7c7",
   "c1c3",
   "b7b5",
   "a2a3",
   "c5c4",
   "g2f3",
   "f8d8",
   "a1d1"
  ]
 },
 "A22": {
  "page": 3,
  "title": "Capablanca implementa su plan",
  "subtitle": "Tras 21.Td1",
  "fen": "1r1r2k1/p1q2ppp/4b3/1p6/2p1Q3/P1R1PBP1/1P3P1P/3R2K1 b - - 0 21",
  "note": "<b>Plan:</b> cambiar piezas y hacer valer la mayoría del flanco de dama.",
  "unit": "mayoria",
  "line": [
   "d8d1",
   "f3d1",
   "b8d8",
   "d1f3",
   "g7g6",
   "e4c6",
   "c7e5",
   "c6e4",
   "e5e4",
   "f3e4",
   "d8d1",
   "g1g2",
   "a7a5"
  ]
 },
 "A23": {
  "page": 3,
  "title": "La mayoría decide",
  "subtitle": "Técnica impecable de Capablanca",
  "fen": "6k1/5p1p/4b1p1/pp6/2p1B3/P1R1P1P1/1P3PKP/3r4 w - - 0 28",
  "note": "<b>Observa:</b> los peones negros avanzan para crear un pasado mientras los blancos ni se han movido.",
  "unit": "mayoria",
  "line": [
   "c3c2",
   "b5b4",
   "a3b4",
   "a5b4",
   "e4f3",
   "d1b1",
   "f3e2",
   "b4b3",
   "c2d2",
   "b1c1",
   "e2d1",
   "c4c3",
   "b2c3",
   "b3b2",
   "d2b2",
   "c1d1",
   "b2c2",
   "e6f5",
   "c2b2",
   "d1c1",
   "b2b3",
   "f5e4",
   "g2h3",
   "c1c2",
   "f2f4",
   "h7h5",
   "g3g4",
   "h5g4",
   "h3g4",
   "c2h2"
  ]
 },
 "A24": {
  "page": 4,
  "title": "Geller – Mecking",
  "subtitle": "Palma de Mallorca 1970 · tras 19...a5",
  "fen": "r1r2bk1/1nqb1ppp/3p1n2/pp1PpN2/1Pp1P3/2P4P/P1B2PPN/R1BQR1K1 w - - 0 20",
  "note": "<b>La pieza fuera de juego:</b> toda la estrategia blanca gira en torno a dejar el caballo de b7 sin perspectivas. 20.Te3! controla c3 y apunta a g3.",
  "unit": "pieza",
  "line": [
   "e1e3",
   "a5b4",
   "c3b4",
   "d7f5",
   "e4f5",
   "c4c3",
   "h2g4",
   "f8e7",
   "g4f6",
   "e7f6",
   "e3e4"
  ]
 },
 "A25": {
  "page": 4,
  "title": "El remate de Geller",
  "subtitle": "Tras 47...h6",
  "fen": "3b2k1/3q1np1/3p3p/3PpPPQ/1P2B3/P1p1B3/5P2/6K1 w - - 0 48",
  "note": "<b>Remata:</b> 48.f6! y las negras se rindieron. Si 48...gxf6 49.gxh6 Cg5 50.Axg5 fxg5 51.Dg6+ Rh8 52.Af5 De7 53.Ae6.",
  "unit": "pieza",
  "line": [
   "f5f6",
   "g7f6",
   "g5h6",
   "f7g5",
   "e3g5",
   "f6g5",
   "h5g6",
   "g8h8",
   "e4f5",
   "d7e7",
   "f5e6"
  ]
 },
 "A26": {
  "page": 0,
  "fen": "r2qr1k1/1b2bp2/p2p1np1/1pnPp1Bp/P1p1P3/R1P2NNP/1PBQ1PP1/4R1K1 b - - 0 21",
  "line": [
   "a8b8",
   "e1a1",
   "f6h7",
   "g5e3",
   "e7f6",
   "g3e2",
   "h7f8",
   "e2c1",
   "f8d7",
   "a4b5",
   "a6b5",
   "b2b4",
   "c4b3",
   "c1b3",
   "d8c7",
   "b3c5",
   "d7c5",
   "d2e2",
   "b7c8"
  ],
  "note": "¿Por qué no deben temer las blancas a 21...Cxa4?",
  "group": "ejercicio",
  "title": "¿Temer a ...Cxa4?",
  "subtitle": "Topalov – Van der Sterren, Amberes 1997",
  "question": "¿Por qué no deben temer las blancas a 21...Cxa4?",
  "solution": "El caballo de c5 es la mejor pieza negra: las blancas cambiarían con gusto su alfil de c2 por él. Después de <b>21...Tb8</b> 22.Tea1 Ch7 23.Ae3 Af6 24.Ce2 Cf8 25.Cc1! Cfd7 26.axb5 axb5 27.b4! cxb3 28.Cxb3 Dc7 29.Cxc5 Cxc5 30.De2 Ac8, el alfil está en mejor diagonal, pero corta la comunicación de las torres y las blancas ya pueden entrar en séptima."
 },
 "A27": {
  "page": 0,
  "fen": "5rk1/p3Q1p1/2bN1p1p/1p1q1P2/2p5/2P4P/PP2R1PK/8 w - - 0 29",
  "line": [
   "h2g3",
   "a7a5",
   "g3h4",
   "g7g6",
   "e2e3",
   "d5g2",
   "e3g3",
   "g2f2",
   "f5g6",
   "f2f4",
   "g3g4",
   "f4f2",
   "h4h5"
  ],
  "note": "Las negras, maniatadas, acaban de jugar 28...b5. ¿Podría trazar un plan efectivo para las blancas?",
  "group": "ejercicio",
  "title": "Un plan con el rey",
  "subtitle": "Teichmann – consulta, Glasgow 1902",
  "question": "Las negras, maniatadas, acaban de jugar 28...b5. ¿Podría trazar un plan efectivo para las blancas?",
  "solution": "Increíble demostración: <b>29.Rg3!</b> a5 30.Rh4! El rey se lanza al ataque. 30...g6 31.Te3! La clave: la torre se incorpora al ataque (no 31.fxg6?? Dg5#). 31...Dxg2 32.Tg3! Df2 33.fxg6 Df4+ 34.Tg4 Df2+ 35.Rh5! 1-0."
 },
 "A28": {
  "page": 0,
  "fen": "r5k1/ppp2rpp/2b1p3/3nBpq1/3P4/2PBP3/P1Q2PPP/2KR3R b - - 0 15",
  "line": [
   "b7b5",
   "h1g1",
   "g5e7",
   "d1f1",
   "e7a3",
   "c1d2",
   "b5b4",
   "c3c4",
   "c6a4"
  ],
  "note": "Juegan negras. Las blancas tienen pareja de alfiles, pero su enroque es débil. ¿Cómo lo pondría en evidencia?",
  "group": "ejercicio",
  "title": "Debilidades en el enroque",
  "subtitle": "Teichmann – Chigorin, Cambridge Springs 1904",
  "question": "Juegan negras. Las blancas tienen pareja de alfiles, pero su enroque es débil. ¿Cómo lo pondría en evidencia?",
  "solution": "Caballo y alfil negros están coordinados y la dama pasa rápido al flanco de dama. <b>15...b5!</b> fuerza la apertura de la columna b o la penetración de las piezas: 16.Thg1 De7! 17.Tdf1 Da3+ 18.Rd2 b4 19.c4 Aa4! y las blancas se rindieron poco después."
 },
 "A29": {
  "page": 0,
  "fen": "1rq3k1/Rp1n1bpp/2p1p3/1PPp1pP1/3P1P1P/2QNP3/3KB3/8 w - - 0 29",
  "line": [
   "b5b6",
   "f7e8",
   "d3c1",
   "d7f8",
   "c1b3",
   "e6e5",
   "d4e5",
   "f8e6",
   "e2d3",
   "g7g6",
   "h4h5",
   "e8f7",
   "b3a5",
   "e6d8",
   "e5e6",
   "c8e6",
   "h5h6"
  ],
  "note": "Las blancas presionan c6 y ahora b7. ¿Cuál es el plan más eficaz para materializar su superioridad estratégica?",
  "group": "ejercicio",
  "title": "Fijar el punto b7",
  "subtitle": "Maróczy – Süchting, Barmen 1905",
  "question": "Las blancas presionan c6 y ahora b7. ¿Cuál es el plan más eficaz para materializar su superioridad estratégica?",
  "solution": "Llevar el caballo a a5 vía c1–b3 y jugar Cxb7. Primero hay que fijar b7: <b>29.b6!</b> Ae8 30.Cc1 Cf8 31.Cb3 e5 32.dxe5 Ce6 33.Ad3 g6 34.h5 Af7 35.Ca5 Cd8 36.e6! Dxe6 37.h6 y las negras abandonaron poco después."
 },
 "F1": {
  "page": 0,
  "fen": "r4rk1/pp2qppp/4b3/2p5/8/4PQP1/PP3PBP/R4RK1 w - - 0 16",
  "line": [
   "f1c1",
   "a8b8",
   "f3e4",
   "e7c7",
   "c1c3",
   "b7b5",
   "a2a3",
   "c5c4",
   "g2f3",
   "f8d8",
   "a1d1",
   "d8d1",
   "f3d1",
   "b8d8",
   "d1f3",
   "g7g6",
   "e4c6",
   "c7e5",
   "c6e4",
   "e5e4",
   "f3e4",
   "d8d1",
   "g1g2",
   "a7a5",
   "c3c2",
   "b5b4",
   "a3b4",
   "a5b4",
   "e4f3",
   "d1b1",
   "f3e2",
   "b4b3",
   "c2d2",
   "b1c1",
   "e2d1",
   "c4c3",
   "b2c3",
   "b3b2",
   "d2b2",
   "c1d1",
   "b2c2",
   "e6f5",
   "c2b2",
   "d1c1",
   "b2b3",
   "f5e4",
   "g2h3",
   "c1c2",
   "f2f4",
   "h7h5",
   "g3g4",
   "h5g4",
   "h3g4",
   "c2h2"
  ],
  "note": "Marshall no encuentra un plan; Capablanca hace valer su mayoría del flanco de dama hasta crear un peón pasado decisivo.",
  "group": "partida",
  "unitLabel": "03 · Mayoría de peones",
  "title": "Marshall – Capablanca",
  "subtitle": "Nueva York 1909 · 0-1 · desde la jugada 16",
  "question": "Marshall no encuentra un plan; Capablanca hace valer su mayoría del flanco de dama hasta crear un peón pasado decisivo.",
  "solution": "Con ...b5, ...c4 y los cambios de piezas mayores, la mayoría negra avanza sola. Las blancas tienen su mayoría en el flanco de rey, pero sus peones ni siquiera se han movido."
 },
 "F2": {
  "page": 0,
  "fen": "r1r2bk1/1nqb1ppp/3p1n2/pp1PpN2/1Pp1P3/2P4P/P1B2PPN/R1BQR1K1 w - - 0 20",
  "line": [
   "e1e3",
   "a5b4",
   "c3b4",
   "d7f5",
   "e4f5",
   "c4c3",
   "h2g4",
   "f8e7",
   "g4f6",
   "e7f6",
   "e3e4",
   "c7d7",
   "d1f3",
   "c8c7",
   "h3h4",
   "d7e7",
   "g2g3",
   "b7d8",
   "a2a3",
   "c7c8",
   "a1b1",
   "c8c7",
   "f3e2",
   "a8b8",
   "b1b3",
   "e7d7",
   "e2f3",
   "f6e7",
   "e4e3",
   "e7f6",
   "e3e4",
   "f6e7",
   "g3g4",
   "f7f6",
   "e4e3",
   "d8f7",
   "b3c3",
   "b8c8",
   "c2e4",
   "e7d8",
   "c1d2",
   "c7c4",
   "c3c4",
   "c8c4",
   "e3c3",
   "d8b6",
   "c3c4",
   "b5c4",
   "g4g5",
   "f6g5",
   "h4g5",
   "b6d8",
   "f3h5",
   "c4c3",
   "d2e3",
   "h7h6",
   "f5f6"
  ],
  "note": "Geller deja el caballo de b7 fuera de juego y, con las piezas negras pasivas, lanza la avalancha de peones contra el rey.",
  "group": "partida",
  "unitLabel": "04 · Pieza fuera de juego",
  "title": "Geller – Mecking",
  "subtitle": "Interzonal de Palma de Mallorca 1970 · 1-0 · desde la jugada 20",
  "question": "Geller deja el caballo de b7 fuera de juego y, con las piezas negras pasivas, lanza la avalancha de peones contra el rey.",
  "solution": "«Si desapareciesen todas las piezas excepto el alfil de c2 y el caballo de b7, las negras podrían rendirse» (Geller). Tras 48.f6! las negras abandonaron."
 }
};
const originalMoves = Object.fromEntries(Object.entries(positions).map(([key, position]) => [key, position.moves ? [...position.moves] : []]));
const originalFens = Object.fromEntries(Object.entries(positions).map(([key, position]) => [key, position.fen]));
const originalLines = Object.fromEntries(Object.entries(positions).map(([key, position]) => [key, [...position.line]]));

function readStored(key, fallback) {
  try {
    const parsed = parseStoredObject(localStorage.getItem(key));
    return parsed === null ? fallback : parsed;
  } catch { return fallback; }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* almacenamiento no disponible */ }
}

const { positions: storedPositions, changed: storedChanged } = sanitizePositions(
  readStored('fuerza-piezas-positions', {}),
  Object.keys(positions),
  fen => validityOf(fen) === null
);
Object.entries(storedPositions).forEach(([key, value]) => {
  positions[key].fen = value.fen;
  positions[key].line = [];
});
if (storedChanged) writeStored('fuerza-piezas-positions', storedPositions);

let activeUnit = 'fuerza';
let activePosition = 'A16';
let baseFen = positions[activePosition].fen;
let game;
try { game = new Chess(baseFen); } catch { baseFen = originalFens[activePosition]; positions[activePosition].fen = baseFen; game = new Chess(baseFen); }
let orientation = 'white';
let selectedSquare = null;
let selectedMoves = [];
let isReplaying = false;
// Partida anotada del diagrama activo: [{ uci, san, nag }] y cursor = jugadas mostradas.
let lineMoves = [];
let cursor = 0;
const NAGS = ['!', '!!', '?', '??', '!?', '?!'];
function sanitizeMoves(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  try {
    const g = new Chess(baseFen);
    for (const m of raw) {
      if (!m || typeof m.uci !== 'string') break;
      const mv = g.move({ from: m.uci.slice(0,2), to: m.uci.slice(2,4), promotion: m.uci[4] || 'q' });
      if (!mv) break;
      out.push({ uci: m.uci, san: mv.san, nag: NAGS.includes(m.nag) ? m.nag : '' });
    }
  } catch { /* jugada no válida: se corta la línea */ }
  return out;
}
function goToPly(ply) {
  if (isReplaying) return;
  cursor = Math.max(0, Math.min(ply, lineMoves.length));
  game = new Chess(baseFen);
  for (const m of lineMoves.slice(0, cursor)) game.move({ from: m.uci.slice(0,2), to: m.uci.slice(2,4), promotion: m.uci[4] || 'q' });
  selectedSquare = null; selectedMoves = [];
  const cur = lineMoves[cursor - 1];
  $('#boardHint').textContent = cur ? `Jugada ${Math.ceil(cursor/2)}: ${cur.san}${cur.nag}` : 'Posición inicial del diagrama.';
  renderBoard();
  clearEngineDisplay('La posición ha cambiado. Vuelve a analizar cuando tengas un nuevo plan.');
}
function setNag(nag) {
  const m = lineMoves[cursor - 1];
  if (!m) { $('#boardHint').textContent = 'Selecciona primero una jugada.'; return; }
  m.nag = m.nag === nag ? '' : nag;
  renderMoveLog();
}
function saveMoves() {
  const key = activePosition;
  const moves = lineMoves.map(({ uci, nag }) => ({ uci, nag }));
  positions[key].moves = moves;
  $('#movesStatus').textContent = 'Guardando partida…';
  saveLessonMovesOfflineFirst('fuerza-de-las-piezas', key, positions[key].fen, moves).then((res) => {
    $('#movesStatus').textContent = res.cloud
      ? `Partida de ${key} guardada aquí y en la nube.`
      : `Partida de ${key} guardada localmente · se subirá al volver internet.`;
  });
}
let boardEditMode = false;
let editTool = null;
let textEditMode = false;
let engine = null;
let engineReady = false;
let engineLines = new Map();
let currentDepth = 12;
let sourcePage = 1;
let boardSettings = sanitizeBoardStyle(readStored('fuerza-piezas-board-style', {}));
const textOverrides = sanitizeTexts(readStored('fuerza-piezas-texts', {}), Object.keys(lessonUnits));

// Las rutas se calculan desde el documento para funcionar igual en Vite, Lovable y una vista previa estática.
function assetUrl(path) {
  return new URL(path, document.baseURI).toString();
}
function pieceImage(piece) {
  const color = piece.color === 'w' ? 'w' : 'b';
  return assetUrl(`assets/pieces/${boardSettings.theme}/${color}${piece.type.toUpperCase()}.svg`);
}

function applyBoardStyle() {
  document.documentElement.style.setProperty('--cream-square', boardSettings.light);
  document.documentElement.style.setProperty('--blue-square', boardSettings.dark);
  const lightInput = $('#lightSquareColor');
  const darkInput = $('#darkSquareColor');
  const themeSelect = $('#pieceTheme');
  if (lightInput) lightInput.value = boardSettings.light;
  if (darkInput) darkInput.value = boardSettings.dark;
  if (themeSelect) themeSelect.value = boardSettings.theme;
  renderPiecePalette();
  renderBoard();
}

function saveBoardStyle() {
  writeStored('fuerza-piezas-board-style', boardSettings);
}

function displaySide() {
  return game.turn() === 'w' ? 'Blancas' : 'Negras';
}

function getBoardSquares() {
  const files = orientation === 'white' ? ['a','b','c','d','e','f','g','h'] : ['h','g','f','e','d','c','b','a'];
  const ranks = orientation === 'white' ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
  return ranks.flatMap(rank => files.map(file => `${file}${rank}`));
}

function colorFor(square) {
  const files = 'abcdefgh';
  return ((files.indexOf(square[0]) + Number(square[1])) % 2 === 1) ? 'dark' : 'light';
}

let mainEng = false, mainEngFen = '';
function updateMainEngine(force) {
  const out = document.getElementById('mainEngOut'), btn = document.getElementById('mainEngToggle');
  if (!out || !btn) return;
  btn.textContent = mainEng ? 'Activado' : 'Desactivado'; btn.classList.toggle('on', mainEng);
  if (!mainEng) {
    if (cancelMainEng) { cancelMainEng(); cancelMainEng = null; }
    out.textContent = 'Motor apagado.';
    mainEngFen = '';
    return;
  }
  const reqFen = game.fen(); if (!force && reqFen === mainEngFen) return; mainEngFen = reqFen;
  if (cancelMainEng) { cancelMainEng(); cancelMainEng = null; }
  out.textContent = 'Analizando localmente sin conexión…';
  cancelMainEng = analyzePositionOffline(
    reqFen,
    13,
    (ev) => {
      if (!mainEng || mainEngFen !== reqFen) return;
      const score = formatEvalScore(ev);
      const tail = ev.terminal ? '' : `<span>Mejor línea: ${ev.line.join(' ')} (prof. ${ev.depth})</span>`;
      out.innerHTML = `<b class="kv-eng-score">${score}</b>${tail}`;
    },
    (err) => {
      if (mainEng && mainEngFen === reqFen) out.textContent = err || 'No se pudo analizar la posición.';
    },
  );
}
function renderBoard() {
  setTimeout(() => updateMainEngine(false), 0);
  const board = $('#chessboard');
  const history = game.history({ verbose: true });
  const lastMove = history.at(-1);
  const legalDestinations = new Map(selectedMoves.map(move => [move.to, move]));
  board.innerHTML = '';

  getBoardSquares().forEach((square, index) => {
    const piece = game.get(square);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `square ${colorFor(square)}`;
    cell.dataset.square = square;
    cell.setAttribute('aria-label', piece ? `${square}: ${piece.color === 'w' ? 'pieza blanca' : 'pieza negra'} ${piece.type}` : `${square}: casilla vacía`);
    if (square === selectedSquare) cell.classList.add('selected');
    if (lastMove && (square === lastMove.from || square === lastMove.to)) cell.classList.add('last-move');
    if (legalDestinations.has(square)) cell.classList.add(legalDestinations.get(square).captured ? 'capture' : 'legal');

    const rankIndex = Math.floor(index / 8);
    const fileIndex = index % 8;
    if (fileIndex === 0) {
      const rank = document.createElement('span');
      rank.className = 'coord-rank';
      rank.textContent = square[1];
      cell.append(rank);
    }
    if (rankIndex === 7) {
      const file = document.createElement('span');
      file.className = 'coord-file';
      file.textContent = square[0];
      cell.append(file);
    }
    if (piece) {
      const icon = document.createElement('span');
      icon.className = 'piece';
      icon.style.backgroundImage = `url("${pieceImage(piece)}")`;
      icon.setAttribute('aria-hidden', 'true');
      cell.append(icon);
    }
    cell.addEventListener('click', () => handleSquare(square));
    board.append(cell);
  });
  const markKey = `${activePosition}:${cursor}`;
  const boardCol = board.closest('.board-col');
  let marksHost = document.getElementById('mainMarksToolbar');
  if (!marksHost && boardCol) {
    marksHost = document.createElement('div');
    marksHost.id = 'mainMarksToolbar';
    boardCol.append(marksHost);
  }
  const redrawMain = () => renderBoard();
  boardMarks.decorateBoard(board, markKey, orientation === 'black', redrawMain);
  boardMarks.renderToolbar(marksHost, markKey, redrawMain);
  $('#turnLabel').textContent = boardEditMode ? 'Edición' : (game.isGameOver() ? 'Partida terminada' : displaySide());
  renderMoveLog();
}

function handleSquare(square) {
  if (isReplaying) return;
  if (boardEditMode) {
    editPositionSquare(square);
    return;
  }
  const piece = game.get(square);
  const possible = selectedMoves.find(move => move.to === square);
  if (selectedSquare && possible) {
    try {
      const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
      selectedSquare = null;
      selectedMoves = [];
      if (move) {
        const uci = move.from + move.to + (move.promotion || '');
        if (lineMoves[cursor]?.uci === uci) cursor++;
        else { lineMoves = lineMoves.slice(0, cursor); lineMoves.push({ uci, san: move.san, nag: '' }); cursor++; }
        $('#boardHint').textContent = `${move.san} jugada. Ahora juegan ${displaySide().toLowerCase()}.`;
        renderBoard();
        clearEngineDisplay('La posición ha cambiado. Vuelve a analizar cuando tengas un nuevo plan.');
      }
    } catch (error) {
      $('#boardHint').textContent = 'Ese movimiento no es legal en esta posición.';
      selectedSquare = null;
      selectedMoves = [];
      renderBoard();
    }
    return;
  }
  if (piece && piece.color === game.turn()) {
    selectedSquare = square;
    selectedMoves = game.moves({ square, verbose: true });
    $('#boardHint').textContent = selectedMoves.length ? `${selectedMoves.length} destino${selectedMoves.length === 1 ? '' : 's'} legal${selectedMoves.length === 1 ? '' : 'es'}.` : 'Esta pieza no tiene destinos legales.';
  } else {
    selectedSquare = null;
    selectedMoves = [];
    $('#boardHint').textContent = piece ? 'Es el turno del otro bando.' : 'Selecciona una pieza del bando que juega.';
  }
  renderBoard();
}

function renderPiecePalette() {
  const palette = $('#piecePalette');
  if (!palette) return;
  const options = [
    ['w', 'k'], ['w', 'q'], ['w', 'r'], ['w', 'b'], ['w', 'n'], ['w', 'p'],
    ['b', 'k'], ['b', 'q'], ['b', 'r'], ['b', 'b'], ['b', 'n'], ['b', 'p']
  ];
  const names = { k: 'rey', q: 'dama', r: 'torre', b: 'alfil', n: 'caballo', p: 'peón' };
  palette.innerHTML = options.map(([color, type]) => {
    const token = `${color}${type}`;
    return `<button class="palette-piece ${editTool === token ? 'active' : ''}" data-piece="${token}" title="${names[type]} ${color === 'w' ? 'blanco' : 'negro'}"><span style="background-image:url('${assetUrl(`assets/pieces/${boardSettings.theme}/${color}${type.toUpperCase()}.svg`)}')"></span></button>`;
  }).join('');
  $$('.palette-piece').forEach(button => button.addEventListener('click', () => {
    editTool = button.dataset.piece;
    boardEditMode = true;
    updatePositionEditorUI('Pieza seleccionada. Haz clic en una casilla para colocarla.');
    renderPiecePalette();
    renderBoard();
  }));
}

function validityOf(fen) {
  try { new Chess(fen); return null; } catch (e) { return e instanceof Error ? e.message : 'FEN no válida'; }
}

function updatePositionEditorUI(message = '') {
  const status = $('#editModeStatus');
  const toggle = $('#togglePositionEdit');
  if (!status || !toggle) return;
  status.textContent = boardEditMode ? 'Modo edición' : 'Modo juego';
  status.classList.toggle('editing', boardEditMode);
  toggle.textContent = boardEditMode ? '✓ Terminar edición' : '✎ Editar piezas';
  toggle.classList.toggle('active', boardEditMode);
  $('#eraseTool')?.classList.toggle('active', editTool === 'erase');
  if (message) $('#positionEditorStatus').textContent = message;
  const fen = game.fen();
  const parts = fen.split(' ');
  $('#fenEditor').value = fen;
  $('#editorTurn').value = parts[1];
  ['K', 'Q', 'k', 'q'].forEach(k => { $('#castle' + k).checked = parts[2].includes(k); });
  $('#editorEp').value = parts[3];
  const err = validityOf(fen);
  const box = $('#fenValidity');
  box.hidden = !err;
  box.textContent = err ? `Posición no válida: ${err}` : '';
  $('#savePosition').disabled = !!err;
}

function loadDraft(fen) {
  const next = new Chess(fen, { skipValidation: true });
  game = next;
  baseFen = next.fen();
  selectedSquare = null;
  selectedMoves = [];
  isReplaying = false;
  updatePositionEditorUI();
  renderBoard();
  clearEngineDisplay('La posición ha cambiado. Vuelve a analizar cuando tengas un nuevo plan.');
}
function resetEditedGame(nextGame) { loadDraft(nextGame.fen()); }

function draftFromControls() {
  const parts = game.fen().split(' ');
  parts[1] = $('#editorTurn').value;
  parts[2] = ['K', 'Q', 'k', 'q'].filter(k => $('#castle' + k).checked).join('') || '-';
  const ep = $('#editorEp').value.trim();
  parts[3] = /^[a-h][36]$/.test(ep) ? ep : '-';
  loadDraft(parts.join(' '));
}

function editPositionSquare(square) {
  if (!editTool) {
    $('#boardHint').textContent = 'Elige una pieza o la goma en el editor.';
    updatePositionEditorUI('Elige primero una pieza de la paleta o la goma.');
    return;
  }
  const current = game.get(square);
  const same = current && editTool !== 'erase' && current.color === editTool[0] && current.type === editTool[1];
  game.remove(square);
  if (editTool !== 'erase' && !same) game.put({ color: editTool[0], type: editTool[1] }, square);
  loadDraft(game.fen());
  updatePositionEditorUI(same || editTool === 'erase' ? `Se eliminó la pieza de ${square}.` : `Pieza colocada en ${square}.`);
}

function applyFenFromEditor() {
  const fen = $('#fenEditor').value.trim();
  try {
    loadDraft(fen);
    updatePositionEditorUI('FEN aplicada. Guarda el diagrama si quieres conservar el cambio.');
  } catch {
    updatePositionEditorUI('FEN no legible. Comprueba las ocho filas y los campos finales.');
  }
}

function emptyCurrentBoard() {
  loadDraft('8/8/8/8/8/8/8/8 w - - 0 1');
  editTool = null;
  boardEditMode = true;
  updatePositionEditorUI('Tablero vacío. Coloca los dos reyes antes de analizar.');
  renderPiecePalette();
}

function saveCurrentPosition() {
  if (validityOf(game.fen())) { updatePositionEditorUI('Corrige la posición antes de guardarla.'); return; }
  positions[activePosition].fen = game.fen();
  positions[activePosition].line = [];
  positions[activePosition].moves = [];
  baseFen = game.fen();
  const stored = readStored('fuerza-piezas-positions', {});
  stored[activePosition] = { fen: baseFen };
  writeStored('fuerza-piezas-positions', stored);
  const key = activePosition, fen = baseFen;
  updatePositionEditorUI(`Guardando ${key} en la nube…`);
  supabase.from('diagram_positions').upsert({ key, fen, moves: [], updated_at: new Date().toISOString() }).then(({ error }) => {
    updatePositionEditorUI(error ? `No se pudo guardar en la nube (${key} queda solo en este navegador).` : `${key} guardado en la nube: se verá así en todos los dispositivos.`);
  });
}

function restoreOriginalPosition() {
  positions[activePosition].fen = originalFens[activePosition];
  positions[activePosition].line = [...originalLines[activePosition]];
  const stored = readStored('fuerza-piezas-positions', {});
  delete stored[activePosition];
  writeStored('fuerza-piezas-positions', stored);
  supabase.from('diagram_positions').delete().eq('key', activePosition).then(({ error }) => { if (error) console.error(error); });
  loadPosition(activePosition);
  updatePositionEditorUI('Se restauró la transcripción original del diagrama.');
}

async function copyFen() {
  const fen = game.fen();
  try {
    await navigator.clipboard.writeText(fen);
    updatePositionEditorUI('FEN copiada al portapapeles.');
  } catch {
    $('#fenEditor').select();
    document.execCommand('copy');
    updatePositionEditorUI('FEN preparada para copiar.');
  }
}

function renderMoveLog() {
  const log = $('#moveLog');
  if (!lineMoves.length) {
    log.innerHTML = '<li class="empty-moves">Aún no hay jugadas.</li>';
    return;
  }
  const cell = (i) => {
    const m = lineMoves[i];
    if (!m) return '';
    return `<button class="ply ${i + 1 === cursor ? 'current' : ''}" data-ply="${i + 1}">${m.san}${m.nag ? `<em class="nag">${m.nag}</em>` : ''}</button>`;
  };
  const pairs = [];
  for (let i = 0; i < lineMoves.length; i += 2) pairs.push(`<li><b>${Math.floor(i / 2) + 1}.</b> ${cell(i)} ${cell(i + 1)}</li>`);
  log.innerHTML = pairs.join('');
  log.querySelectorAll('.ply').forEach(b => b.addEventListener('click', () => goToPly(Number(b.dataset.ply))));
  log.querySelector('.ply.current')?.scrollIntoView({ block: 'nearest' });
}

function lessonMarkup(unit) {
  return `
    <span class="section-kicker">UNIDAD ${unit.number}</span>
    <h2 data-edit-block="title">${unit.title}</h2>
    <p class="page-reference">${unit.page}</p>
    <p data-edit-block="intro">${unit.text}</p>
    <div class="focus-question"><b>Reto para el grupo</b><p data-edit-block="question">${unit.question}</p></div>
    <ul class="plan-points" data-edit-block="points">${unit.points.map((point, index) => `<li><span>${index + 1}</span><div>${point}</div></li>`).join('')}</ul>
    <button class="open-position" id="openUnitPosition">Abrir ${unit.position} en el tablero →</button>
  `;
}

function setTextEditState() {
  const lesson = $('#lessonContent');
  lesson.classList.toggle('editing', textEditMode);
  lesson.querySelectorAll('[data-edit-block]').forEach(element => {
    element.contentEditable = String(textEditMode);
    element.spellcheck = textEditMode;
  });
  const button = $('#toggleTextEdit');
  const status = $('#textEditorStatus');
  if (button) button.textContent = textEditMode ? '✓ Terminar edición de texto' : '✎ Activar edición de texto';
  if (status) {
    status.textContent = textEditMode ? 'Modo edición activo: escribe directamente en los bloques marcados.' : 'Modo lectura';
    status.classList.toggle('editing', textEditMode);
  }
}

function storeCurrentLesson() {
  if (!textEditMode) return;
  textOverrides[activeUnit] = $('#lessonContent').innerHTML;
  writeStored('fuerza-piezas-texts', textOverrides);
}

function renderLesson() {
  const unit = lessonUnits[activeUnit];
  $('#lessonContent').innerHTML = textOverrides[activeUnit] || lessonMarkup(unit);
  $('#audioLabel').textContent = unit.audioLabel;
  const audio = $('#lessonAudio');
  audio.pause();
  audio.currentTime = 0;
  if (unit.audio) audio.src = unit.audio; else audio.removeAttribute('src');
  $('#playAudio').textContent = '▶';
  $('#openUnitPosition')?.addEventListener('click', () => loadPosition(unit.position, true));
  setTextEditState();
  $('#lessonContent').addEventListener('input', () => {
    if (textEditMode) {
      textOverrides[activeUnit] = $('#lessonContent').innerHTML;
      writeStored('fuerza-piezas-texts', textOverrides);
      $('#textSaveStatus').textContent = 'Cambios de texto guardados automáticamente en este navegador.';
    }
  });
}

function renderUnitTabs() {
  $$('.lesson-tab').forEach(tab => {
    const isActive = tab.dataset.unit === activeUnit;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });
}

function renderDiagramList() {
  const list = $('#diagramList');
  list.innerHTML = Object.entries(positions).filter(([, position]) => !position.group).map(([key, position]) => `
    <button class="diagram-button ${key === activePosition ? 'active' : ''}" data-position="${key}">
      ${key}<small>pág. ${position.page + 4}</small>
    </button>`).join('');
  $$('.diagram-button').forEach(button => button.addEventListener('click', () => loadPosition(button.dataset.position)));
}

function renderExtraSections() {
  const card = (key, p, i) => `
    <article class="extra-card ${key === activePosition ? 'active' : ''}">
      <span class="concept-number">${p.group === 'partida' ? p.unitLabel : key}</span>
      <h3>${p.title}</h3><small>${p.subtitle}</small>
      <p>${p.question}</p>
      <div class="extra-actions">
        <button class="extra-load" data-extra="${key}">${p.group === 'partida' ? '▶ Abrir partida' : '♟ Resolver en el tablero'}</button>
      </div>
      <details><summary>${p.group === 'partida' ? 'Idea clave' : 'Ver solución'}</summary><p>${p.solution}</p></details>
    </article>`;
  const fill = (id, group) => {
    const el = $(id); if (!el) return;
    el.innerHTML = Object.entries(positions).filter(([, p]) => p.group === group).map(([k, p], i) => card(k, p, i)).join('');
  };
  fill('#exerciseList', 'ejercicio');
  fill('#famousList', 'partida');
  renderSectionViewer('ejercicio');
  renderSectionViewer('partida');
  $$('.extra-load').forEach(b => b.addEventListener('click', () => loadPosition(b.dataset.extra, true)));
}

function loadPosition(key, scrollToBoard = false) {
  const position = positions[key];
  if (!position) return;
  activePosition = key;
  baseFen = position.fen;
  try {
    game = new Chess(baseFen);
  } catch (error) {
    console.error(error);
    $('#boardHint').textContent = 'No se ha podido cargar esta posición.';
    return;
  }
  lineMoves = sanitizeMoves(position.moves);
  if (!lineMoves.length && Array.isArray(position.line) && position.line.length) lineMoves = sanitizeMoves(position.line.map(uci => ({ uci })));
  cursor = 0;
  if ($('#movesStatus')) $('#movesStatus').textContent = lineMoves.length ? `${lineMoves.length} jugadas. Usa ▶ o pulsa una jugada para verla.` : '';
  selectedSquare = null;
  selectedMoves = [];
  isReplaying = false;
  $('#positionKicker').textContent = position.group === 'partida' ? `PARTIDA FAMOSA · ${position.unitLabel}` : position.group === 'ejercicio' ? `EJERCICIO · DIAGRAMA ${key}` : `DIAGRAMA ${key} · PÁGINA ${position.page + 4}`;
  $('#positionName').textContent = position.title;
  $('#positionNote').innerHTML = position.note;
  $('#boardHint').textContent = 'Selecciona una pieza para ver sus destinos.';
  renderBoard();
  renderDiagramList();
  renderExtraSections();
  updatePositionEditorUI();
  clearEngineDisplay('Posición cargada. Formula un plan y después consulta el motor.');
  if (scrollToBoard) $('.board-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetBoard() {
  goToPly(0);
}

function undoMove() {
  if (isReplaying) return;
  if (!cursor) { $('#boardHint').textContent = 'No hay jugadas que deshacer.'; return; }
  goToPly(cursor - 1);
}

let mainPlaying = false;
function setMainPlayIcon() { const b = $('#mainPlay'); if (b) { b.textContent = mainPlaying ? '❚❚' : '▷'; b.setAttribute('aria-label', mainPlaying ? 'Pausa' : 'Reproducir'); } }
async function mainPlayToggle() {
  if (mainPlaying) { mainPlaying = false; isReplaying = false; setMainPlayIcon(); return; }
  if (!lineMoves.length) { const line = positions[activePosition].line || []; if (!line.length) { $('#boardHint').textContent = 'Este diagrama no tiene secuencia para reproducir.'; return; }
    const g = new Chess(baseFen); const lm = [];
    for (const u of line) { try { const m = g.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] || 'q' }); if (!m) break; lm.push({ uci: m.from + m.to + (m.promotion || ''), san: m.san, nag: '' }); } catch { break; } }
    lineMoves = lm; goToPly(0); }
  if (cursor >= lineMoves.length) goToPly(0);
  mainPlaying = true; setMainPlayIcon();
  while (mainPlaying && cursor < lineMoves.length) { await sleep(900); if (!mainPlaying) break; goToPly(cursor + 1); }
  mainPlaying = false; setMainPlayIcon();
}
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function replayLine() {
  if (lineMoves.length) {
    goToPly(0);
    isReplaying = true;
    await sleep(500);
    while (isReplaying && cursor < lineMoves.length) { isReplaying = false; goToPly(cursor + 1); isReplaying = true; await sleep(900); }
    isReplaying = false;
    return;
  }
  const line = positions[activePosition].line;
  if (!line.length) {
    $('#boardHint').textContent = 'Este diagrama está preparado como ejercicio libre: crea tu propia variante.';
    return;
  }
  isReplaying = true;
  game = new Chess(baseFen);
  lineMoves = []; cursor = 0;
  selectedSquare = null;
  selectedMoves = [];
  $('#boardHint').textContent = 'Reproduciendo secuencia didáctica…';
  renderBoard();
  await sleep(500);
  for (const uci of line) {
    if (!isReplaying) break;
    try {
      const move = game.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || 'q' });
      if (!move) break;
      lineMoves.push({ uci: move.from + move.to + (move.promotion || ''), san: move.san, nag: '' }); cursor = lineMoves.length;
      $('#boardHint').textContent = `Secuencia: ${move.san}`;
      renderBoard();
      await sleep(780);
    } catch (error) {
      console.warn('Línea no reproducible', uci, error);
      $('#boardHint').textContent = 'La secuencia se detuvo en una jugada no válida.';
      break;
    }
  }
  isReplaying = false;
  $('#boardHint').textContent = 'Secuencia terminada. Modifica la posición o consulta el motor.';
  clearEngineDisplay('La posición ha cambiado. Vuelve a analizar cuando tengas un nuevo plan.');
}

let engineAuto = false, engineAutoTimer = null;
function clearEngineDisplay(message) {
  if (engineAuto && message && !/^(Stockfish necesita|No se pudo)/.test(message)) { clearTimeout(engineAutoTimer); engineAutoTimer = setTimeout(() => { try { analyzePosition(); } catch {} }, 350); }
  engineLines.clear();
  const text = message || 'El motor mostrará aquí evaluación, mejor línea y profundidad.';
  $('#engineOutput').innerHTML = `<div class="engine-empty"><span>♞</span><p>${text}</p></div>`;
}

function formatEvaluation(type, raw) {
  if (type === 'mate') return raw > 0 ? `#${raw}` : `#${raw}`;
  const value = Number(raw) / 100;
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

function uciLineToSan(pv, fen) {
  let clone;
  try { clone = new Chess(fen); } catch { return pv; }
  const sans = [];
  for (const uci of pv.trim().split(/\s+/).slice(0, 8)) {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) continue;
    try {
      const move = clone.move({ from: uci.slice(0,2), to: uci.slice(2,4), promotion: uci[4] || 'q' });
      if (move) sans.push(move.san);
    } catch { break; }
  }
  return sans.length ? sans.join('  ') : pv;
}

function renderEngineLines(depth = null) {
  if (!engineLines.size) return;
  const lines = [...engineLines.entries()].sort((a,b) => a[0] - b[0]).slice(0, 3);
  $('#engineOutput').innerHTML = `
    <div class="analysis-lines">
      ${lines.map(([multi, data]) => `<span class="pv-number">${multi}</span><span class="pv-moves">${uciLineToSan(data.pv, data.fen)}</span><span class="eval">${formatEvaluation(data.type, data.score)}</span>`).join('')}
    </div>
    <div class="engine-progress">Profundidad ${depth || Math.max(...lines.map(([, item]) => item.depth))} · principal variation · las cifras positivas favorecen al bando que evalúa el motor.</div>`;
}

function initEngine() {
  const badge = $('.engine-badge');
  const status = $('#engineStatus');
  const analyzeButton = $('#analyzeBtn');
  analyzeButton.disabled = true;
  try {
    engine = new Worker(assetUrl('assets/stockfish/stockfish-19-lite-single.js'));
    engine.onmessage = ({ data }) => {
      if (typeof data !== 'string') {
        if (data && data.percent !== undefined) {
          status.textContent = `Cargando motor ${Math.round(data.percent * 100)}%…`;
        }
        return;
      }
      if (data === 'uciok') {
        engine.postMessage('setoption name MultiPV value 3');
        engine.postMessage('isready');
        return;
      }
      if (data === 'readyok') {
        engineReady = true;
        badge.classList.remove('working');
        badge.classList.add('ready');
        status.textContent = 'Stockfish 19 listo';
        analyzeButton.disabled = false;
        return;
      }
      if (data.startsWith('info ')) {
        if (/\b(upperbound|lowerbound)\b/.test(data)) return;
        const depthMatch = data.match(/\bdepth (\d+)/);
        const multiMatch = data.match(/\bmultipv (\d+)/);
        const scoreMatch = data.match(/\bscore (cp|mate) (-?\d+)/);
        const pvMatch = data.match(/\bpv (.+)$/);
        if (depthMatch && scoreMatch && pvMatch) {
          const multi = Number(multiMatch?.[1] || 1);
          const sign = game.turn() === 'w' ? 1 : -1;
          engineLines.set(multi, {
            depth: Number(depthMatch[1]),
            type: scoreMatch[1],
            score: Number(scoreMatch[2]) * sign,
            pv: pvMatch[1],
            fen: game.fen()
          });
          renderEngineLines(Number(depthMatch[1]));
        }
        return;
      }
      if (data.startsWith('bestmove')) {
        badge.classList.remove('working');
        badge.classList.add('ready');
        status.textContent = 'Stockfish 19 listo';
        $('#analyzeBtn').disabled = false;
        $('#stopBtn').disabled = true;
      }
    };
    engine.onerror = () => {
      engineReady = false;
      badge.classList.remove('working', 'ready');
      status.textContent = 'Motor no disponible';
      clearEngineDisplay('No se pudo iniciar Stockfish en este navegador. El tablero sigue funcionando.');
    };
    engine.postMessage('uci');
  } catch (error) {
    console.error(error);
    status.textContent = 'Motor no disponible';
  }
}

function analyzePosition() {
  if (!engine || !engineReady) return;
  const pieces = game.board().flat().filter(Boolean);
  if (pieces.filter(piece => piece.type === 'k' && piece.color === 'w').length !== 1 || pieces.filter(piece => piece.type === 'k' && piece.color === 'b').length !== 1) {
    clearEngineDisplay('Stockfish necesita exactamente un rey blanco y un rey negro. Completa la posición en el editor antes de analizar.');
    return;
  }
  const badge = $('.engine-badge');
  engineLines.clear();
  badge.classList.remove('ready');
  badge.classList.add('working');
  $('#engineStatus').textContent = `Analizando a profundidad ${currentDepth}…`;
  $('#analyzeBtn').disabled = true;
  $('#stopBtn').disabled = false;
  $('#engineOutput').innerHTML = '<div class="engine-empty"><span>✦</span><p>Stockfish está examinando variantes…</p></div>';
  engine.postMessage('stop');
  engine.postMessage('setoption name MultiPV value 3');
  engine.postMessage(`position fen ${game.fen()}`);
  engine.postMessage(`go depth ${currentDepth}`);
}

function stopAnalysis() {
  if (!engine) return;
  engine.postMessage('stop');
  $('#stopBtn').disabled = true;
  $('#analyzeBtn').disabled = !engineReady;
  $('.engine-badge').classList.remove('working');
  if (engineReady) $('.engine-badge').classList.add('ready');
  $('#engineStatus').textContent = 'Análisis detenido';
}

function changeOrientation() {
  orientation = orientation === 'white' ? 'black' : 'white';
  renderBoard();
}

function toggleFullscreen() {
  const panel = $('.board-panel');
  if (document.fullscreenElement) document.exitFullscreen();
  else panel.requestFullscreen?.();
}

document.addEventListener('fullscreenchange', () => {
  const panel = $('.board-panel');
  const isFullscreen = document.fullscreenElement === panel;
  panel.classList.toggle('board-fullscreen', isFullscreen);
  $('#fullscreenBtn').textContent = isFullscreen ? '⛶ Salir de pantalla' : '⛶ Pantalla completa';
});

function setSourcePage(next) {
  sourcePage = ((next - 1 + SOURCE_PAGES.length) % SOURCE_PAGES.length) + 1;
  $('#sourceTitle').textContent = (sourcePage === 5 ? 'Ejercicios 2' : `Página ${sourcePage + 4}`);
  $('#sourceImage').src = SOURCE_PAGES[sourcePage - 1];
  $('#sourceCounter').textContent = `${sourcePage} / ${SOURCE_PAGES.length}`;
}

function openSources() {
  $('#sourceModal').classList.add('open');
  $('#sourceModal').setAttribute('aria-hidden', 'false');
}
function closeSources() {
  $('#sourceModal').classList.remove('open');
  $('#sourceModal').setAttribute('aria-hidden', 'true');
}

function openDrawer(id) {
  closeDrawers();
  const drawer = $(`#${id}`);
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  $('#drawerBackdrop').classList.add('open');
  if (id === 'boardEditor') {
    updatePositionEditorUI();
    renderPiecePalette();
  }
}
function closeDrawers() {
  $$('.editor-drawer').forEach(drawer => {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  });
  $('#drawerBackdrop')?.classList.remove('open');
}

function textTargetElement() {
  const target = $('#textTarget').value;
  if (target === 'selection') return null;
  return $(`#lessonContent [data-edit-block="${target}"]`);
}
function selectionIsInLesson() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  return $('#lessonContent').contains(range.commonAncestorContainer);
}
function rememberTextChange(message) {
  textOverrides[activeUnit] = $('#lessonContent').innerHTML;
  writeStored('fuerza-piezas-texts', textOverrides);
  if (message) $('#textSaveStatus').textContent = message;
}
function execTextCommand(command, value) {
  return typeof document.execCommand === 'function' ? document.execCommand(command, false, value) : false;
}
function applyTextCommand(command, value) {
  if (!textEditMode) {
    textEditMode = true;
    setTextEditState();
  }
  const target = textTargetElement();
  const hasSelection = selectionIsInLesson();
  execTextCommand('styleWithCSS', true);
  if (hasSelection && execTextCommand(command, value)) {
    // El navegador aplicó el formato a la selección actual.
  } else if (target) {
    if (command === 'bold') target.style.fontWeight = target.style.fontWeight === '800' ? '400' : '800';
    if (command === 'foreColor') target.style.color = value;
    if (command === 'fontName') target.style.fontFamily = value;
  } else {
    $('#textSaveStatus').textContent = 'Selecciona un texto o elige un bloque en “Aplicar a”.';
    return;
  }
  rememberTextChange('Formato actualizado y guardado en este navegador.');
}
function applyTextSize(size) {
  if (!textEditMode) {
    textEditMode = true;
    setTextEditState();
  }
  const target = textTargetElement();
  if (selectionIsInLesson() && execTextCommand('fontSize', '7')) {
    const fonts = [...$('#lessonContent').querySelectorAll('font[size="7"]')];
    fonts.forEach(font => { font.style.fontSize = `${size}px`; font.removeAttribute('size'); });
  } else if (target) {
    target.style.fontSize = `${size}px`;
  } else {
    $('#textSaveStatus').textContent = 'Selecciona un texto o elige un bloque para cambiar el tamaño.';
    return;
  }
  rememberTextChange('Tamaño actualizado y guardado en este navegador.');
}
function resetTextFormatting() {
  const target = textTargetElement();
  if (!target) {
    $('#textSaveStatus').textContent = 'Elige un bloque para restaurar su formato.';
    return;
  }
  target.removeAttribute('style');
  rememberTextChange('Formato del bloque restaurado.');
}
function restoreCurrentText() {
  delete textOverrides[activeUnit];
  writeStored('fuerza-piezas-texts', textOverrides);
  renderLesson();
  $('#textSaveStatus').textContent = 'Se restauró el texto original de esta unidad.';
}

function initializeEvents() {
  $$('.lesson-tab').forEach(tab => tab.addEventListener('click', () => {
    storeCurrentLesson();
    activeUnit = tab.dataset.unit;
    renderUnitTabs();
    renderLesson();
  }));
  $('#playAudio').addEventListener('click', () => {
    const audio = $('#lessonAudio');
    if (audio.paused) audio.play(); else audio.pause();
  });
  $('#lessonAudio').addEventListener('play', () => { $('#playAudio').textContent = '❚❚'; });
  $('#lessonAudio').addEventListener('pause', () => { $('#playAudio').textContent = '▶'; });
  $('#lessonAudio').addEventListener('ended', () => { $('#playAudio').textContent = '▶'; });
  $('#resetBoard').addEventListener('click', resetBoard);
  $('#undoMove').addEventListener('click', undoMove);
  $('#replayLine').addEventListener('click', replayLine);
  $('#clearLog').addEventListener('click', () => { lineMoves = []; goToPly(0); });
  $('#firstPly').addEventListener('click', () => goToPly(0));
  $('#prevPly').addEventListener('click', () => goToPly(cursor - 1));
  $('#nextPly').addEventListener('click', () => goToPly(cursor + 1));
  $('#lastPly').addEventListener('click', () => goToPly(lineMoves.length));
  $$('.nag-button').forEach(b => b.addEventListener('click', () => setNag(b.dataset.nag)));
  $('#saveMoves').addEventListener('click', saveMoves);
  $('#flipBoard').addEventListener('click', changeOrientation);
  $('#fullscreenBtn').addEventListener('click', toggleFullscreen);
  $('#depthRange').addEventListener('input', (event) => {
    currentDepth = Number(event.target.value);
    $('#depthValue').textContent = currentDepth;
  });
  $('#analyzeBtn').addEventListener('click', analyzePosition);
  $('#stopBtn').addEventListener('click', stopAnalysis);
  $('#openSourceBtn').addEventListener('click', openSources);
  $('#closeSourceBtn').addEventListener('click', closeSources);
  $('#prevSource').addEventListener('click', () => setSourcePage(sourcePage - 1));
  $('#nextSource').addEventListener('click', () => setSourcePage(sourcePage + 1));
  $('#sourceModal').addEventListener('click', event => { if (event.target.id === 'sourceModal') closeSources(); });

  $('#openBoardEditorBtn').addEventListener('click', () => openDrawer('boardEditor'));
  $('#closeBoardEditorBtn').addEventListener('click', closeDrawers);
  $('#openTextEditorBtn').addEventListener('click', () => openDrawer('textEditor'));
  $('#closeTextEditorBtn').addEventListener('click', closeDrawers);
  $('#drawerBackdrop').addEventListener('click', closeDrawers);
  $('#pieceTheme').addEventListener('change', event => {
    boardSettings.theme = event.target.value;
    saveBoardStyle();
    applyBoardStyle();
  });
  $('#lightSquareColor').addEventListener('input', event => {
    boardSettings.light = event.target.value;
    saveBoardStyle();
    applyBoardStyle();
  });
  $('#darkSquareColor').addEventListener('input', event => {
    boardSettings.dark = event.target.value;
    saveBoardStyle();
    applyBoardStyle();
  });
  $$('.preset-row button').forEach(button => button.addEventListener('click', () => {
    const palettes = {
      projector: { light: '#fff1c6', dark: '#126a8c' },
      wood: { light: '#f0d9b5', dark: '#b58863' },
      slate: { light: '#d7e1e7', dark: '#456577' }
    };
    Object.assign(boardSettings, palettes[button.dataset.preset]);
    saveBoardStyle();
    applyBoardStyle();
  }));
  $('#resetBoardStyle').addEventListener('click', () => {
    boardSettings = { light: '#f5eacc', dark: '#92c4b7', theme: 'merida' };
    saveBoardStyle();
    applyBoardStyle();
  });
  $('#togglePositionEdit').addEventListener('click', () => {
    boardEditMode = !boardEditMode;
    if (!boardEditMode) editTool = null;
    updatePositionEditorUI(boardEditMode ? 'Modo edición activo. Selecciona una pieza y modifica el tablero.' : 'Modo juego activado.');
    renderPiecePalette();
    renderBoard();
  });
  $('#eraseTool').addEventListener('click', () => {
    boardEditMode = true;
    editTool = 'erase';
    updatePositionEditorUI('Goma seleccionada. Haz clic en una casilla para eliminar la pieza.');
    renderPiecePalette();
    renderBoard();
  });
  $('#emptyBoard').addEventListener('click', emptyCurrentBoard);
  $('#startPosition').addEventListener('click', () => { loadDraft('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'); updatePositionEditorUI('Posición inicial colocada.'); });
  $('#editorFlip').addEventListener('click', changeOrientation);
  ['#editorTurn', '#castleK', '#castleQ', '#castlek', '#castleq', '#editorEp'].forEach(id => $(id).addEventListener('change', draftFromControls));
  $('#applyFen').addEventListener('click', applyFenFromEditor);
  $('#copyFen').addEventListener('click', copyFen);
  $('#savePosition').addEventListener('click', saveCurrentPosition);
  $('#restorePosition').addEventListener('click', restoreOriginalPosition);

  $('#toggleTextEdit').addEventListener('click', () => {
    textEditMode = !textEditMode;
    setTextEditState();
    $('#textSaveStatus').textContent = textEditMode ? 'Escribe directamente en los bloques marcados. Los cambios se guardan automáticamente.' : 'Modo lectura activado.';
  });
  $('#textColor').addEventListener('input', event => applyTextCommand('foreColor', event.target.value));
  $('#fontFamily').addEventListener('change', event => applyTextCommand('fontName', event.target.value));
  $('#textSize').addEventListener('input', event => {
    $('#textSizeLabel').textContent = `${event.target.value} px`;
    applyTextSize(event.target.value);
  });
  $('#textBold').addEventListener('click', () => applyTextCommand('bold'));
  $('#resetTextFormat').addEventListener('click', resetTextFormatting);
  $('#saveText').addEventListener('click', () => {
    rememberTextChange('Textos guardados en este navegador.');
  });
  $('#restoreText').addEventListener('click', restoreCurrentText);

  let teacherOk = false;
  ['#openBoardEditorBtn', '#openTextEditorBtn', '#saveMoves', '#savePosition', '#saveText'].forEach(id => {
    const b = $(id); if (!b) return;
    b.addEventListener('click', (e) => {
      if (teacherOk) return;
      const pw = window.prompt('Contraseña del profesor:');
      if (pw === '2222') { teacherOk = true; document.body.classList.add('teacher-ok'); return; }
      e.stopImmediatePropagation(); e.preventDefault();
      if (pw !== null) window.alert('Contraseña incorrecta.');
    }, true);
  });
  $('#engineToggle').addEventListener('click', () => {
    engineAuto = !engineAuto;
    const b = $('#engineToggle'); b.setAttribute('aria-pressed', String(engineAuto));
    b.textContent = engineAuto ? '⏻ Motor encendido' : '⏻ Motor apagado';
    b.classList.toggle('on', engineAuto);
    if (engineAuto) analyzePosition(); else stopAnalysis();
  });
  $('#mainFirst').addEventListener('click', () => $('#firstPly').click());
  $('#mainPrev').addEventListener('click', () => $('#prevPly').click());
  $('#mainPlay').addEventListener('click', mainPlayToggle);
  $('#mainEngToggle')?.addEventListener('click', () => { mainEng = !mainEng; updateMainEngine(true); });
  $('#mainNext').addEventListener('click', () => $('#nextPly').click());
  $('#mainLast').addEventListener('click', () => $('#lastPly').click());
  let activeBoard = 'main';
  [['main', '.board-panel'], ['ejercicio', '#exerciseViewer'], ['partida', '#famousViewer']].forEach(([k, sel]) => {
    const el = $(sel); if (!el) return;
    el.addEventListener('pointerdown', () => { activeBoard = k; });
    el.addEventListener('pointerenter', () => { activeBoard = k; });
  });
  document.addEventListener('keydown', event => {
    const t = event.target;
    const typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const map = { ArrowLeft: 'prev', ArrowRight: 'next', ArrowUp: 'first', ArrowDown: 'last', Home: 'first', End: 'last' };
    if (!typing && map[event.key]) {
      event.preventDefault();
      const a = map[event.key];
      if (activeBoard === 'main') {
        ({ prev: '#prevPly', next: '#nextPly', first: '#firstPly', last: '#lastPly' })[a] && $(({ prev: '#prevPly', next: '#nextPly', first: '#firstPly', last: '#lastPly' })[a]).click();
      } else {
        const host = $(activeBoard === 'partida' ? '#famousViewer' : '#exerciseViewer');
        host?.querySelector(`[data-nav="${a}"]`)?.click();
      }
      return;
    }
    if (event.key === 'Escape') {
      closeSources();
      closeDrawers();
    }
  });
}

let lessonStarted = false;
export function startLesson() {
  if (lessonStarted) return;
  lessonStarted = true;
  boardMarks.initSync(() => {
    renderBoard();
    renderSectionViewer('ejercicio');
    renderSectionViewer('partida');
  });
  window.addEventListener('online', () => {
    flushPendingLessonMoves('fuerza-de-las-piezas').then((n) => {
      if (n > 0) syncCloudPositions();
    });
  });
  [renderUnitTabs, renderLesson, renderDiagramList, () => loadPosition(activePosition), initializeEvents, applyBoardStyle, initEngine]
    .forEach(step => { try { step(); } catch (error) { console.error('Error al iniciar la clase:', error); } });
  syncCloudPositions();
}

async function syncCloudPositions() {
  try {
    await flushPendingLessonMoves('fuerza-de-las-piezas');
    const pendingMoves = readPendingLessonMoves('fuerza-de-las-piezas');
    const { data, error } = await supabase.from('diagram_positions').select('key, fen, moves');
    if (error || !data) return;
    const cloudKeys = new Set();
    const local = {};
    data.forEach(({ key, fen, moves }) => {
      if (!positions[key] || validityOf(fen) !== null) return;
      cloudKeys.add(key);
      if (pendingMoves[key]) {
        local[key] = { fen: pendingMoves[key].fen };
        positions[key].fen = pendingMoves[key].fen;
        positions[key].line = [];
        positions[key].moves = pendingMoves[key].moves;
        return;
      }
      local[key] = { fen };
      positions[key].fen = fen;
      positions[key].line = [];
      positions[key].moves = Array.isArray(moves) ? moves : [];
    });
    Object.keys(positions).forEach(key => {
      if (pendingMoves[key]) {
        local[key] = { fen: pendingMoves[key].fen };
        positions[key].fen = pendingMoves[key].fen;
        positions[key].line = [];
        positions[key].moves = pendingMoves[key].moves;
      } else if (!cloudKeys.has(key)) {
        positions[key].moves = [...originalMoves[key]]; positions[key].fen = originalFens[key]; positions[key].line = [...originalLines[key]];
      }
    });
    writeStored('fuerza-piezas-positions', local);
    renderDiagramList();
    loadPosition(activePosition);
  } catch (error) { console.error('No se pudieron cargar las posiciones de la nube:', error); }
}


// Visor estilo Kárpov para Ejercicios y Partidas famosas (no modifica los datos guardados).
const sectionState = { ejercicio: { key: null, ply: 0, solved: {}, pick: null, msg: '' }, partida: { key: null, ply: 0 } };
function sectionMoves(p) {
  const out = [];
  try {
    const g = new Chess(p.fen);
    const raw = Array.isArray(p.moves) && p.moves.length ? p.moves.map(m => m && m.uci) : (p.line || []);
    for (const u of raw) {
      if (typeof u !== 'string') break;
      const mv = g.move({ from: u.slice(0,2), to: u.slice(2,4), promotion: u[4] || 'q' });
      if (!mv) break;
      out.push({ san: mv.san, from: mv.from, to: mv.to, fen: g.fen() });
    }
  } catch { /* línea no válida */ }
  return out;
}
function renderSectionViewer(group) {
  const host = $(group === 'partida' ? '#famousViewer' : '#exerciseViewer');
  if (!host) return;
  const entries = Object.entries(positions).filter(([, p]) => p.group === group);
  if (!entries.length) { host.innerHTML = ''; return; }
  const st = sectionState[group];
  if (!st.key || !positions[st.key]) { st.key = entries[0][0]; st.ply = 0; }
  const p = positions[st.key];
  const moves = sectionMoves(p);
  st.ply = Math.max(0, Math.min(st.ply, moves.length));
  const fen = st.ply ? moves[st.ply - 1].fen : p.fen;
  const last = st.ply ? moves[st.ply - 1] : null;
  let g; try { g = new Chess(fen); } catch { return; }
  const rows = g.board();
  let sq = '';
  for (let vr = 0; vr < 8; vr++) for (let vc = 0; vc < 8; vc++) {
    const r = st.flip ? 7 - vr : vr, c = st.flip ? 7 - vc : vc;
    const name = 'abcdefgh'[c] + (8 - r);
    const pc = rows[r][c];
    const light = (r + c) % 2 === 0;
    const hl = (last && (name === last.from || name === last.to)) || st.pick === name;
    sq += `<div data-sq="${name}" class="kv-sq ${light ? 'l' : 'd'} ${hl ? 'hl' : ''}">${vc === 0 ? `<i class="kv-rank">${8 - r}</i>` : ''}${vr === 7 ? `<i class="kv-file">${'abcdefgh'[c]}</i>` : ''}${pc ? `<img src="${pieceImage(pc)}" alt="" draggable="false">` : ''}</div>`;
  }
  const startNo = Number(p.fen.split(' ')[5]) || 1;
  const blackFirst = p.fen.split(' ')[1] === 'b';
  let notation = '';
  moves.forEach((m, i) => {
    const idx = i + (blackFirst ? 1 : 0);
    if (idx % 2 === 0) notation += `<span class="kv-no">${startNo + idx / 2}.</span>`;
    else if (i === 0) notation += `<span class="kv-no">${startNo}...</span>`;
    notation += `<button class="kv-mv ${i + 1 === st.ply ? 'on' : ''}" data-ply="${i + 1}">${m.san}</button>`;
  });
  const solved = group !== 'ejercicio' || !moves.length || st.solved[st.key];
  if (!solved) notation = `<em>${st.msg || 'Haz la primera jugada en el tablero para ver las jugadas.'}</em>`;
  const label = group === 'partida' ? 'Idea clave' : 'Solución';
  host.innerHTML = `
    <div class="kv-tabs">${entries.map(([k, x]) => `<button class="kv-tab ${k === st.key ? 'on' : ''}" data-key="${k}"><b>${x.title}</b><small>${x.subtitle || k}</small></button>`).join('')}</div>
    <div class="kv-grid">
      <div class="kv-left">
        <div class="kv-board">${sq}</div>
        <div class="kv-nav">
          <button data-nav="first" aria-label="Inicio">⏮</button><button data-nav="prev" aria-label="Anterior">◀</button><button data-nav="play" aria-label="Reproducir">▷</button><button data-nav="next" aria-label="Siguiente">▶</button><button data-nav="last" aria-label="Final">⏭</button><button data-flip aria-label="Girar tablero" title="Girar tablero">⇅</button>
        </div>
        <div class="kv-marks-host"></div>
      </div>
      <div class="kv-right">
        <div class="kv-comment"><span>${last ? `Jugada ${Math.ceil((st.ply + (blackFirst ? 1 : 0)) / 2)}. ${last.san}` : (group === 'partida' ? 'Partida famosa' : 'Ejercicio ' + st.key)}</span><p>${p.question || p.note || ''}</p></div>
        <details class="kv-sol"><summary>${label}</summary><p>${p.solution || ''}</p></details>
        <div class="kv-notation">${notation || '<em>Sin jugadas: analiza la posición en el tablero.</em>'}</div>
        <div class="kv-engine"><div class="kv-engine-head"><span>Módulo de análisis local (Stockfish 19)</span><button class="kv-eng-toggle ${st.eng ? 'on' : ''}" data-eng>${st.eng ? 'Activado' : 'Desactivado'}</button></div><div class="kv-eng-out">${st.eng ? 'Analizando localmente sin conexión…' : 'Motor apagado.'}</div></div>
      </div>
    </div>`;
  const secMarkKey = `${group}:${st.key}:${st.ply}`;
  const redrawSection = () => renderSectionViewer(group);
  boardMarks.decorateBoard(host.querySelector('.kv-board'), secMarkKey, Boolean(st.flip), redrawSection);
  boardMarks.renderToolbar(host.querySelector('.kv-marks-host'), secMarkKey, redrawSection);
  host.querySelectorAll('.kv-tab').forEach(b => b.addEventListener('click', () => { stopSectionPlay(group); st.key = b.dataset.key; st.ply = 0; st.pick = null; st.msg = ''; renderSectionViewer(group); }));
  host.querySelectorAll('.kv-mv').forEach(b => b.addEventListener('click', () => { stopSectionPlay(group); st.ply = Number(b.dataset.ply); renderSectionViewer(group); }));
  if (!solved) host.querySelectorAll('.kv-sq').forEach(d => d.addEventListener('click', () => {
    if (st.ply !== 0) { st.ply = 0; }
    const name = d.dataset.sq, m0 = moves[0];
    if (!st.pick) { if (d.querySelector('img')) { st.pick = name; st.msg = ''; renderSectionViewer(group); } return; }
    if (st.pick === name) { st.pick = null; renderSectionViewer(group); return; }
    if (st.pick === m0.from && name === m0.to) { st.solved[st.key] = true; st.pick = null; st.msg = ''; st.ply = 1; }
    else if (d.querySelector('img') && !(st.pick && name === m0.to)) { st.pick = name; }
    else { st.pick = null; st.msg = 'No es la jugada. ¡Inténtalo de nuevo!'; }
    renderSectionViewer(group);
  }));
  host.querySelector('[data-flip]').addEventListener('click', () => { st.flip = !st.flip; renderSectionViewer(group); });
  host.querySelector('[data-eng]').addEventListener('click', () => { st.eng = !st.eng; renderSectionViewer(group); });
  if (sectionEngCancel[group]) { sectionEngCancel[group](); sectionEngCancel[group] = null; }
  if (st.eng) {
    const out = host.querySelector('.kv-eng-out');
    const reqFen = fen;
    sectionEngCancel[group] = analyzePositionOffline(
      reqFen,
      13,
      (ev) => {
        if (!out || !out.isConnected) return;
        const score = formatEvalScore(ev);
        const tail = ev.terminal ? '' : `<span>Mejor línea: ${ev.line.join(' ')} (prof. ${ev.depth})</span>`;
        out.innerHTML = `<b class="kv-eng-score">${score}</b>${tail}`;
      },
      (err) => {
        if (out && out.isConnected) out.textContent = err || 'No se pudo analizar la posición.';
      },
    );
  }
  host.querySelector(".kv-open")?.addEventListener("click", () => loadPosition(st.key, true));
  host.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.nav;
    if (a === 'play') { if (st.timer) stopSectionPlay(group); else { if (st.ply >= moves.length) st.ply = 0; st.timer = setInterval(() => { if (st.ply >= sectionMoves(positions[st.key]).length) return stopSectionPlay(group); st.ply++; renderSectionViewer(group); }, 900); } return; }
    stopSectionPlay(group);
    st.ply = a === 'first' ? 0 : a === 'last' ? moves.length : a === 'prev' ? st.ply - 1 : st.ply + 1;
    renderSectionViewer(group);
  }));
}
function stopSectionPlay(group) { const st = sectionState[group]; if (st.timer) { clearInterval(st.timer); st.timer = null; } }
