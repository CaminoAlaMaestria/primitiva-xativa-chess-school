import { Chess } from 'chess.js';
import { supabase } from '@/integrations/supabase/client';
import bakedPositions from './baked-positions.json';
import { parseStoredObject, sanitizeBoardStyle, sanitizePositions, sanitizeTexts } from './storage.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const lessonUnits = {
  debilitar: {
    number: '01',
    title: 'Cómo se debilitan los peones',
    page: 'Páginas 9–10 · Diagramas A30–A34',
    text: 'Las debilidades estructurales no aparecen solas: se provocan. La primera tarea es descubrir qué peón sostiene a los demás y cómo obligarlo a avanzar, cambiar o quedar aislado.',
    question: 'En A30, ¿qué peón negro sostiene la posición y qué avance blanco puede quitarle apoyo?',
    points: ['Provoca un avance para desconectar los peones de su posible apoyo.', 'Busca un cambio que deje un peón retrasado o doblado.', 'Solo ataca una debilidad cuando tus piezas tienen casillas de entrada.'],
    position: 'A30',
    audio: 'assets/audio/debilitar.mp3',
    audioLabel: 'Unidad 01 · cómo se debilitan'
  },
  casos: {
    number: '02',
    title: 'Del defecto al plan',
    page: 'Página 10 · Diagramas A33–A34',
    text: 'Una debilidad solo pesa cuando se convierte en una ruta de invasión. Los ejemplos de esta página muestran cómo un sacrificio o un avance puede abrir un sector y dejar un peón retrasado como blanco estable.',
    question: 'Antes de calcular, nombra la columna que quieres abrir y la pieza que ocupará la casilla de invasión.',
    points: ['Fija el objetivo: no persigas un peón que aún puede avanzar.', 'Calcula el cambio que elimina su mejor defensor.', 'Después de la ruptura, coloca una pieza delante del peón atrasado.'],
    position: 'A33',
    audio: 'assets/audio/introduccion.mp3',
    audioLabel: 'Unidad 02 · convertir una debilidad en plan'
  },
  doblados: {
    number: '03',
    title: 'Complejos de peones doblados',
    page: 'Página 11 · Diagramas A35–A36',
    text: 'Los peones doblados suelen debilitar casillas y dificultar la coordinación, pero el veredicto depende de la posición. A veces ofrecen columna abierta, espacio o actividad suficiente como compensación.',
    question: '¿Qué casilla queda sin un peón que pueda defenderla? ¿Qué pieza puede ocuparla?',
    points: ['Distingue el defecto fijo de una debilidad que aún puede avanzar.', 'Compara la actividad de las piezas con las casillas debilitadas.', 'Observa qué columna se abre después del cambio de peones.'],
    position: 'A36',
    audio: 'assets/audio/doblados.mp3',
    audioLabel: 'Unidad 03 · peones doblados'
  },
  centro: {
    number: '04',
    title: 'Peones doblados en el centro',
    page: 'Página 12 · Diagramas A37–A39',
    text: 'Cuando los peones doblados centrales se separan de su cadena, aparecen objetivos tácticos y estratégicos. El plan eficaz combina presión sobre el peón, cambios adecuados y una segunda debilidad.',
    question: 'En A39, ¿qué captura parece antiposicional pero crea una columna y nuevos puntos de ataque?',
    points: ['Ataca primero el peón que limita la movilidad rival.', 'No simplifiques sin comprobar quién aprovecha la columna abierta.', 'Busca una segunda debilidad antes de intentar recuperarlo todo.'],
    position: 'A39',
    audio: 'assets/audio/centro.mp3',
    audioLabel: 'Unidad 04 · peones doblados en el centro'
  }
};

const positions = {
  A30: {
    page: 1, title: 'La idea de Lasker', subtitle: 'Cadena de peones bajo presión',
    fen: 'r4k2/pp2qppp/1bn2n2/8/3p4/1Q3NP1/PP1BPPBP/R2R2K1 w - - 0 15',
    note: '<b>Objetivo:</b> provocar el avance o la ruptura que deje a las negras con peones menos coordinados. Calcula 15.a4 y pregunta qué cambia en el flanco de dama.',
    line: ['a2a4', 'f6e4', 'a4a5', 'b6c5'],
    unit: 'debilitar'
  },
  A31: {
    page: 1, title: 'La presión continúa', subtitle: 'Pieza activa y peón objetivo',
    fen: '2r2rk1/p4ppp/2n5/2b5/3pn3/1Q3NP1/1P2PPBP/R2RB1K1 w - - 0 19',
    note: '<b>Pregunta de cálculo:</b> las piezas negras son activas, pero ¿qué punto queda vulnerable si la iniciativa blanca persiste?',
    line: [], unit: 'debilitar'
  },
  A32: {
    page: 2, title: 'El peón pasado no basta', subtitle: 'Actividad frente a estructura',
    fen: '8/p5p1/1b3B2/3k1p1P/n7/3p2P1/8/1R3K2 b - - 0 41',
    note: '<b>Discute:</b> un peón pasado puede ser una ventaja, pero no si permite debilitar a su propio ejército. Compara rey, torres y casillas de bloqueo.',
    line: [], unit: 'debilitar'
  },
  A33: {
    page: 2, title: 'Abrir el flanco de dama', subtitle: 'La ruptura como argumento dinámico',
    fen: 'r1b1r1k1/1p3pbp/1qpp1np1/p1n5/2P1P3/2N3P1/PPQ1N1BP/3R1RK1 b - - 0 14',
    note: '<b>Plan temático:</b> la ruptura ...a4 trata de dislocar la cadena blanca a2–b3–c4. Identifica qué casilla se vuelve accesible después.',
    line: ['a5a4'], unit: 'casos'
  },
  A34: {
    page: 3, title: 'Centralización decisiva', subtitle: 'Las casillas débiles atraen a las piezas',
    fen: '6k1/1p3p1p/2p1b1p1/2P1n3/3qP3/1r6/1NQ2PBP/2R3K1 b - - 0 31',
    note: '<b>Observa:</b> la dama negra domina el centro. Busca la casilla de invasión que queda disponible cuando el caballo blanco no puede sostenerla.',
    line: [], unit: 'casos'
  },
  A36: {
    page: 3, title: 'Columnas c y f', subtitle: 'Peones doblados y rey enrocado',
    fen: '6rr/ppqbbpkp/3p2n1/3p3Q/3P1P1N/3B1RN1/PPP3PP/5RK1 w - - 0 1',
    note: '<b>Diagnóstico:</b> la estructura protege al rey, pero el caballo encerrado y las columnas abiertas reclaman atención. Formula un plan para ambos bandos.',
    line: [], unit: 'doblados'
  },
  A37: {
    page: 4, title: 'Doblar para atacar', subtitle: 'Táctica nacida de una debilidad crónica',
    fen: 'r4b1k/2pqbpp1/1p5p/p1nPP3/5B2/5NRP/PPBQ1PP1/6K1 w - - 0 24',
    note: '<b>Momento crítico:</b> la actividad blanca presiona contra el enroque. Prueba 24.Qd4 y explica por qué los peones del rey negro ya no son una fortaleza.',
    line: ['d2d4', 'e7f6'], unit: 'centro'
  },
  A38: {
    page: 4, title: 'El precio de un peón', subtitle: 'Cambio, ruptura y casilla de bloqueo',
    fen: '5b1k/2pb1p2/3p1p2/p1nP4/1r3B2/1P2R2P/P1B2PP1/6K1 b - - 0 29',
    note: '<b>Antes de jugar:</b> valora qué bando obtiene las mejores casillas después de los cambios. El material aislado no cuenta toda la historia.',
    line: [], unit: 'centro'
  },
  A39: {
    page: 4, title: 'Peones doblados en el centro', subtitle: 'Crear problemas antes de recuperar material',
    fen: '3q3k/7p/p3pnnp/1p1p4/2pPP3/2P1N1PP/PPB1QP2/6K1 w - - 0 27',
    note: '<b>Ejercicio:</b> considera 27.Bb3. Aunque entrega un alfil tras ...cxb3, puede abrir líneas y transformar la estructura negra en varios objetivos.',
    line: ['c2b3', 'c4b3', 'a2b3'], unit: 'centro'
  }
};


// Ejercicios (Ejercicios 3 · Nivel avanzado) y partidas famosas: se muestran en sus propias secciones.
Object.assign(positions, {
 "A40": {
  "page": 0,
  "fen": "6k1/1n2R1pp/3p1p2/2pP1P1P/1bP4N/7P/rB6/6K1 w - - 0 36",
  "line": [
   "h5h6",
   "a2b2",
   "e7g7",
   "g8h8",
   "g7b7",
   "b4c3",
   "b7d7",
   "h8g8",
   "d7d8",
   "g8f7",
   "d8h8",
   "c3d4",
   "g1f1"
  ],
  "note": "¿Podría sugerir un plan decisivo para las blancas?",
  "group": "ejercicio",
  "title": "Plan decisivo para las blancas",
  "subtitle": "Anand–Shirov, Groninga 1997",
  "question": "¿Podría sugerir un plan decisivo para las blancas?",
  "solution": "Las blancas ganan con <b>36.h6!</b> Txb2 (si 36...gxh6, 37.Axf6 y las blancas hacen estragos en la séptima fila, en combinación con su peón pasado) 37.Txg7+ Rh8 38.Txb7 Ac3 39.Td7 Rg8 40.Td8+ Rf7 41.Th8 Ad4+ 42.Rf1. Ahora cae el peón h7 y el blanco de h6 es imparable."
 },
 "A41": {
  "page": 0,
  "fen": "r1bqnrk1/p4ppp/1p1pp3/n1p5/2PPP3/P1PBB1N1/5PPP/R2Q1RK1 b - - 0 12",
  "line": [
   "c8a6"
  ],
  "note": "Las blancas acaban de jugar 12.Cg3. ¿Cuál es el plan correcto para las negras?",
  "group": "ejercicio",
  "title": "Contra los peones doblados",
  "subtitle": "Defensa Nimzoindia · tras 12.Cg3",
  "question": "Las blancas acaban de jugar 12.Cg3. ¿Cuál es el plan correcto para las negras?",
  "solution": "Las negras deben atacar los peones doblados de la columna c con ...<b>Aa6</b>, ...Dd7, ...Da4 y, en un momento dado, ...cxd4 y ...Tc8. Además deben neutralizar el avance del peón f blanco con ...f5."
 },
 "A42": {
  "page": 0,
  "fen": "r2rnbk1/pp3ppp/5p2/q1pP1N1Q/2P2P2/1P6/PB4PP/4RRK1 w - - 0 21",
  "line": [
   "e1e8",
   "d8e8",
   "f5h6",
   "g7h6",
   "h5g4"
  ],
  "note": "¿Puedes encontrar un plan táctico que resuelva rápidamente la partida a favor de las blancas?",
  "group": "ejercicio",
  "title": "Remate táctico",
  "subtitle": "Las negras acaban de jugar 20...Da5",
  "question": "¿Puedes encontrar un plan táctico que resuelva rápidamente la partida a favor de las blancas?",
  "solution": "Se gana de inmediato con <b>21.Txe8!</b> Txe8 22.Ch6+! gxh6 (si 22...Rh8, 23.Dxf7 Ae7 24.Dg8+! Txg8 25.Cf7#) 23.Dg4+ (1-0), pues si 23...Ag7, 24.Axf6. Sin el peón doblado en f7 la combinación no serviría: la dama podría proteger g7."
 },
 "A43": {
  "page": 0,
  "fen": "r2qk2r/2pbnpbp/p1pp2p1/8/B1P1P3/2N5/PP3PPP/R1BQ1RK1 w kq - 0 11",
  "line": [
   "c4c5",
   "e7c8",
   "c1e3",
   "e8g8",
   "d1d2",
   "d8e7",
   "a1d1",
   "f8e8",
   "f2f4",
   "f7f5",
   "e4f5",
   "g6f5",
   "f1e1",
   "d6c5"
  ],
  "note": "Juegan blancas. ¿Hay algún plan para explotar la debilidad estructural de los peones doblados?",
  "group": "ejercicio",
  "title": "Explotar c7–c6–d6",
  "subtitle": "Boleslavsky–Fine, radio URSS/EE.UU. 1945",
  "question": "Juegan blancas. ¿Hay algún plan para explotar la debilidad estructural de los peones doblados?",
  "solution": "<b>11.c5!</b> Cc8 (no 11...dxc5 por 12.Ae3 y 13.Axc5, ni 11...d5 por 12.exd5 cxd5 13.Cxd5!) 12.Ae3 O-O 13.Dd2 De7 14.Tad1 Te8 15.f4! f5 16.exf5 gxf5 17.Tfe1 dxc5. Las negras se quedan con peones doblados en el peor caso: en columna abierta. Las blancas ganaron en 41 jugadas."
 },
 "G1": {
  "page": 0,
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "line": [
   "c2c4",
   "e7e6",
   "g1f3",
   "d7d5",
   "d2d4",
   "g8f6",
   "b1c3",
   "f8e7",
   "c1g5",
   "e8g8",
   "e2e3",
   "h7h6",
   "g5h4",
   "b7b6",
   "c4d5",
   "f6d5",
   "h4e7",
   "d8e7",
   "c3d5",
   "e6d5",
   "a1c1",
   "c8e6",
   "d1a4",
   "c7c5",
   "a4a3",
   "f8c8",
   "f1b5",
   "a7a6",
   "d4c5",
   "b6c5",
   "e1g1",
   "a8a7",
   "b5e2",
   "b8d7",
   "f3d4",
   "e7f8",
   "d4e6",
   "f7e6",
   "e3e4",
   "d5d4",
   "f2f4",
   "f8e7",
   "e4e5",
   "c8b8",
   "e2c4",
   "g8h8",
   "a3h3",
   "d7f8",
   "b2b3",
   "a6a5",
   "f4f5",
   "e6f5",
   "f1f5",
   "f8h7",
   "c1f1",
   "e7d8",
   "h3g3",
   "a7e7",
   "h2h4",
   "b8b7",
   "e5e6",
   "b7c7",
   "g3e5",
   "d8e8",
   "a2a4",
   "e8d8",
   "f1f2",
   "d8e8",
   "f2f3",
   "e8d8",
   "c4d3",
   "d8e8",
   "e5e4",
   "h7f6",
   "f5f6",
   "g7f6",
   "f3f6",
   "h8g8",
   "d3c4",
   "g8h8",
   "e4f4"
  ],
  "note": "Mira cómo Fischer presiona los peones colgantes c5–d5 hasta obligarlos a avanzar y deja una casilla e6 y un peón débil.",
  "group": "partida",
  "unitLabel": "01 · Debilitar",
  "title": "Fischer – Spassky",
  "subtitle": "Reikiavik 1972, partida 6 · 1-0",
  "question": "Mira cómo Fischer presiona los peones colgantes c5–d5 hasta obligarlos a avanzar y deja una casilla e6 y un peón débil.",
  "solution": "Tras 20.e4 d4 21.f4 los peones negros ya no pueden moverse juntos: el centro queda fijado y las blancas atacan por el flanco de rey con f5 y e6."
 },
 "G2": {
  "page": 0,
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "line": [
   "e2e4",
   "c7c5",
   "g1f3",
   "e7e6",
   "d2d4",
   "c5d4",
   "f3d4",
   "a7a6",
   "f1d3",
   "b8c6",
   "d4c6",
   "b7c6",
   "e1g1",
   "d7d5",
   "c2c4",
   "g8f6",
   "c4d5",
   "c6d5",
   "e4d5",
   "e6d5",
   "b1c3",
   "f8e7",
   "d1a4",
   "d8d7",
   "f1e1",
   "d7a4",
   "c3a4",
   "c8e6",
   "c1e3",
   "e8g8",
   "e3c5",
   "f8e8",
   "c5e7",
   "e8e7",
   "b2b4",
   "g8f8",
   "a4c5",
   "e6c8",
   "f2f3",
   "e7a7",
   "e1e5",
   "c8d7",
   "c5d7",
   "a7d7",
   "a1c1",
   "d7d6",
   "c1c7",
   "f6d7",
   "e5e2",
   "g7g6",
   "g1f2",
   "h7h5",
   "f3f4",
   "h5h4",
   "f2f3",
   "f7f5",
   "f3e3",
   "d5d4",
   "e3d2",
   "d7b6",
   "e2e7",
   "b6d5",
   "e7f7",
   "f8e8",
   "c7b7",
   "d5b4",
   "d3c4"
  ],
  "note": "Fischer convierte el peón aislado de d5 en un objetivo y usa sus torres en la séptima.",
  "group": "partida",
  "unitLabel": "02 · Del defecto al plan",
  "title": "Fischer – Petrosian",
  "subtitle": "Buenos Aires 1971, partida 7 · 1-0",
  "question": "Fischer convierte el peón aislado de d5 en un objetivo y usa sus torres en la séptima.",
  "solution": "Los cambios de damas y alfiles dejan a las negras con un peón débil; 22.Cxd7+ elimina el mejor defensor y 24.Tc7 invade. El plan nace de la debilidad."
 },
 "G3": {
  "page": 0,
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "line": [
   "d2d4",
   "g8f6",
   "c2c4",
   "e7e6",
   "b1c3",
   "f8b4",
   "g1f3",
   "c7c5",
   "e2e3",
   "b8c6",
   "f1d3",
   "b4c3",
   "b2c3",
   "d7d6",
   "e3e4",
   "e6e5",
   "d4d5",
   "c6e7",
   "f3h4",
   "h7h6",
   "f2f4",
   "e7g6",
   "h4g6",
   "f7g6",
   "f4e5",
   "d6e5",
   "c1e3",
   "b7b6",
   "e1g1",
   "e8g8",
   "a2a4",
   "a7a5",
   "a1b1",
   "c8d7",
   "b1b2",
   "a8b8",
   "b2f2",
   "d8e7",
   "d3c2",
   "g6g5",
   "e3d2",
   "e7e8",
   "d2e1",
   "e8g6",
   "d1d3",
   "f6h5",
   "f2f8",
   "b8f8",
   "f1f8",
   "g8f8",
   "c2d1",
   "h5f4",
   "d3c2",
   "d7a4"
  ],
  "note": "Fischer cambia en c3 para dejar peones doblados y luego bloquea la estructura para atacarlos.",
  "group": "partida",
  "unitLabel": "03 · Peones doblados",
  "title": "Spassky – Fischer",
  "subtitle": "Reikiavik 1972, partida 5 · 0-1",
  "question": "Fischer cambia en c3 para dejar peones doblados y luego bloquea la estructura para atacarlos.",
  "solution": "Con 8...e5 cierra el centro; los peones c3–c4 quedan fijos e inmóviles. El final llega con 27...Axa4, aprovechando las piezas desviadas."
 },
 "G4": {
  "page": 0,
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "line": [
   "d2d4",
   "g8f6",
   "c2c4",
   "e7e6",
   "b1c3",
   "f8b4",
   "e2e3",
   "d7d5",
   "a2a3",
   "b4c3",
   "b2c3",
   "c7c5",
   "c4d5",
   "e6d5",
   "f1d3",
   "e8g8",
   "g1e2",
   "b7b6",
   "e1g1",
   "c8a6",
   "d3a6",
   "b8a6",
   "c1b2",
   "d8d7",
   "a3a4",
   "f8e8",
   "d1d3",
   "c5c4",
   "d3c2",
   "a6b8",
   "a1e1",
   "b8c6",
   "e2g3",
   "c6a5",
   "f2f3",
   "a5b3",
   "e3e4",
   "d7a4",
   "e4e5",
   "f6d7",
   "c2f2",
   "g7g6",
   "f3f4",
   "f7f5",
   "e5f6",
   "d7f6",
   "f4f5",
   "e8e1",
   "f1e1",
   "a8e8",
   "e1e6",
   "e8e6",
   "f5e6",
   "g8g7",
   "f2f4",
   "a4e8",
   "f4e5",
   "e8e7",
   "b2a3",
   "e7a3",
   "g3h5",
   "g6h5",
   "e5g5",
   "g7f8",
   "g5f6",
   "f8g8",
   "e6e7",
   "a3c1",
   "g1f2",
   "c1c2",
   "f2g3",
   "c2d3",
   "g3h4",
   "d3e4",
   "h4h5",
   "e4e2",
   "h5h4",
   "e2e4",
   "g2g4",
   "e4e1",
   "h4h5"
  ],
  "note": "Las blancas tienen peones doblados en c, pero los usan para empujar e4–e5 y f4–f5 en el centro.",
  "group": "partida",
  "unitLabel": "04 · Doblados en el centro",
  "title": "Botvinnik – Capablanca",
  "subtitle": "AVRO 1938 · 1-0",
  "question": "Las blancas tienen peones doblados en c, pero los usan para empujar e4–e5 y f4–f5 en el centro.",
  "solution": "El avance central abre líneas contra el rey; 30.Aa3!! desvía la dama y la combinación con 31.Ch5+ es una de las más célebres de la historia."
 }
});

// Cambios del profesor incorporados al proyecto: viajan con cualquier copia o remix.
Object.entries(bakedPositions).forEach(([key, value]) => {
  if (!positions[key]) return;
  positions[key].fen = value.fen;
  positions[key].moves = value.moves;
  positions[key].line = value.moves.map(m => m.uci);
});
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
  readStored('peones-bajo-presion-positions', {}),
  Object.keys(positions),
  fen => validityOf(fen) === null
);
Object.entries(storedPositions).forEach(([key, value]) => {
  positions[key].fen = value.fen;
  positions[key].line = [];
});
if (storedChanged) writeStored('peones-bajo-presion-positions', storedPositions);

let activeUnit = 'debilitar';
let activePosition = 'A30';
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
  supabase.from('diagram_positions').upsert({ key, fen: positions[key].fen, moves, updated_at: new Date().toISOString() }).then(({ error }) => {
    $('#movesStatus').textContent = error ? 'No se pudo guardar la partida.' : `Partida de ${key} guardada en la nube.`;
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
let boardSettings = sanitizeBoardStyle(readStored('peones-bajo-presion-board-style', {}));
const textOverrides = sanitizeTexts(readStored('peones-bajo-presion-texts', {}), Object.keys(lessonUnits));

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
  writeStored('peones-bajo-presion-board-style', boardSettings);
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

function renderBoard() {
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
  const stored = readStored('peones-bajo-presion-positions', {});
  stored[activePosition] = { fen: baseFen };
  writeStored('peones-bajo-presion-positions', stored);
  const key = activePosition, fen = baseFen;
  updatePositionEditorUI(`Guardando ${key} en la nube…`);
  supabase.from('diagram_positions').upsert({ key, fen, moves: [], updated_at: new Date().toISOString() }).then(({ error }) => {
    updatePositionEditorUI(error ? `No se pudo guardar en la nube (${key} queda solo en este navegador).` : `${key} guardado en la nube: se verá así en todos los dispositivos.`);
  });
}

function restoreOriginalPosition() {
  positions[activePosition].fen = originalFens[activePosition];
  positions[activePosition].line = [...originalLines[activePosition]];
  const stored = readStored('peones-bajo-presion-positions', {});
  delete stored[activePosition];
  writeStored('peones-bajo-presion-positions', stored);
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
  writeStored('peones-bajo-presion-texts', textOverrides);
}

function renderLesson() {
  const unit = lessonUnits[activeUnit];
  $('#lessonContent').innerHTML = textOverrides[activeUnit] || lessonMarkup(unit);
  $('#audioLabel').textContent = unit.audioLabel;
  const audio = $('#lessonAudio');
  audio.pause();
  audio.currentTime = 0;
  audio.src = unit.audio;
  $('#playAudio').textContent = '▶';
  $('#openUnitPosition')?.addEventListener('click', () => loadPosition(unit.position, true));
  setTextEditState();
  $('#lessonContent').addEventListener('input', () => {
    if (textEditMode) {
      textOverrides[activeUnit] = $('#lessonContent').innerHTML;
      writeStored('peones-bajo-presion-texts', textOverrides);
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
      ${key}<small>pág. ${position.page + 8}</small>
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
  $('#positionKicker').textContent = position.group === 'partida' ? `PARTIDA FAMOSA · ${position.unitLabel}` : position.group === 'ejercicio' ? `EJERCICIO · DIAGRAMA ${key}` : `DIAGRAMA ${key} · PÁGINA ${position.page + 8}`;
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

function clearEngineDisplay(message) {
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
        const depthMatch = data.match(/\bdepth (\d+)/);
        const multiMatch = data.match(/\bmultipv (\d+)/);
        const scoreMatch = data.match(/\bscore (cp|mate) (-?\d+)/);
        const pvMatch = data.match(/\bpv (.+)$/);
        if (depthMatch && scoreMatch && pvMatch) {
          const multi = Number(multiMatch?.[1] || 1);
          engineLines.set(multi, {
            depth: Number(depthMatch[1]),
            type: scoreMatch[1],
            score: Number(scoreMatch[2]),
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
  sourcePage = ((next - 1 + 4) % 4) + 1;
  $('#sourceTitle').textContent = `Página ${sourcePage + 8}`;
  $('#sourceImage').src = `assets/pdf-pages/page-${sourcePage}.png`;
  $('#sourceCounter').textContent = `${sourcePage} / 4`;
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
  writeStored('peones-bajo-presion-texts', textOverrides);
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
  writeStored('peones-bajo-presion-texts', textOverrides);
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

  $('#mainFirst').addEventListener('click', () => $('#firstPly').click());
  $('#mainPrev').addEventListener('click', () => $('#prevPly').click());
  $('#mainPlay').addEventListener('click', () => $('#replayLine').click());
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
  [renderUnitTabs, renderLesson, renderDiagramList, () => loadPosition(activePosition), initializeEvents, applyBoardStyle, initEngine]
    .forEach(step => { try { step(); } catch (error) { console.error('Error al iniciar la clase:', error); } });
  syncCloudPositions();
}

async function syncCloudPositions() {
  try {
    const { data, error } = await supabase.from('diagram_positions').select('key, fen, moves');
    if (error || !data) return;
    const cloudKeys = new Set();
    const local = {};
    data.forEach(({ key, fen, moves }) => {
      if (!positions[key] || validityOf(fen) !== null) return;
      cloudKeys.add(key);
      local[key] = { fen };
      positions[key].fen = fen;
      positions[key].line = [];
      positions[key].moves = Array.isArray(moves) ? moves : [];
    });
    Object.keys(positions).forEach(key => {
      if (!cloudKeys.has(key)) { positions[key].moves = [...originalMoves[key]]; positions[key].fen = originalFens[key]; positions[key].line = [...originalLines[key]]; }
    });
    writeStored('peones-bajo-presion-positions', local);
    renderDiagramList();
    loadPosition(activePosition);
  } catch (error) { console.error('No se pudieron cargar las posiciones de la nube:', error); }
}


// Visor estilo Kárpov para Ejercicios y Partidas famosas (no modifica los datos guardados).
const sectionState = { ejercicio: { key: null, ply: 0 }, partida: { key: null, ply: 0 } };
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
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const name = 'abcdefgh'[c] + (8 - r);
    const pc = rows[r][c];
    const light = (r + c) % 2 === 0;
    const hl = last && (name === last.from || name === last.to);
    sq += `<div class="kv-sq ${light ? 'l' : 'd'} ${hl ? 'hl' : ''}">${c === 0 ? `<i class="kv-rank">${8 - r}</i>` : ''}${r === 7 ? `<i class="kv-file">${'abcdefgh'[c]}</i>` : ''}${pc ? `<img src="${pieceImage(pc)}" alt="" draggable="false">` : ''}</div>`;
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
  const label = group === 'partida' ? 'Idea clave' : 'Solución';
  host.innerHTML = `
    <div class="kv-tabs">${entries.map(([k, x]) => `<button class="kv-tab ${k === st.key ? 'on' : ''}" data-key="${k}"><b>${x.title}</b><small>${x.subtitle || k}</small></button>`).join('')}</div>
    <div class="kv-grid">
      <div class="kv-left">
        <div class="kv-board">${sq}</div>
        <div class="kv-nav">
          <button data-nav="first" aria-label="Inicio">⏮</button><button data-nav="prev" aria-label="Anterior">◀</button><button data-nav="play" aria-label="Reproducir">▷</button><button data-nav="next" aria-label="Siguiente">▶</button><button data-nav="last" aria-label="Final">⏭</button>
        </div>
      </div>
      <div class="kv-right">
        <div class="kv-comment"><span>${last ? `Jugada ${Math.ceil((st.ply + (blackFirst ? 1 : 0)) / 2)}. ${last.san}` : (group === 'partida' ? 'Partida famosa' : 'Ejercicio ' + st.key)}</span><p>${p.question || p.note || ''}</p></div>
        <details class="kv-sol"><summary>${label}</summary><p>${p.solution || ''}</p></details>
        <div class="kv-notation">${notation || '<em>Sin jugadas: analiza la posición en el tablero.</em>'}</div>
        <button class="kv-open" data-open="${st.key}">♟ Abrir en el tablero de análisis</button>
      </div>
    </div>`;
  host.querySelectorAll('.kv-tab').forEach(b => b.addEventListener('click', () => { stopSectionPlay(group); st.key = b.dataset.key; st.ply = 0; renderSectionViewer(group); }));
  host.querySelectorAll('.kv-mv').forEach(b => b.addEventListener('click', () => { stopSectionPlay(group); st.ply = Number(b.dataset.ply); renderSectionViewer(group); }));
  host.querySelector('.kv-open').addEventListener('click', () => loadPosition(st.key, true));
  host.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.nav;
    if (a === 'play') { if (st.timer) stopSectionPlay(group); else { if (st.ply >= moves.length) st.ply = 0; st.timer = setInterval(() => { if (st.ply >= sectionMoves(positions[st.key]).length) return stopSectionPlay(group); st.ply++; renderSectionViewer(group); }, 900); } return; }
    stopSectionPlay(group);
    st.ply = a === 'first' ? 0 : a === 'last' ? moves.length : a === 'prev' ? st.ply - 1 : st.ply + 1;
    renderSectionViewer(group);
  }));
}
function stopSectionPlay(group) { const st = sectionState[group]; if (st.timer) { clearInterval(st.timer); st.timer = null; } }
