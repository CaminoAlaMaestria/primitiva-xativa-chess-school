import type { Milestone } from "@/components/karpov/Timeline";

const BASE = "e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O";

export const EXERCISES: Milestone[] = [
  {
    year: "1",
    title: "Contragolpe en el centro",
    text: "",
    game: "Estudio #1 · 5...Cxe4 6.d4 b5 7.Ab3 exd4 8.Te1 d5",
    moves: `${BASE} Nxe4 d4 b5 Bb3 exd4 Re1 d5`,
    solution: "Nc3",
    question: "Juegan las blancas. El caballo de e4 parece bien defendido por el peón de d5. ¿Cómo lo atacas otra vez?",
    hint: "Pista: una pieza menor que aún no ha salido se ofrece en una casilla 'atacada' por el peón de d4.",
    success: "¡9.Cc3! Si 9...dxc3?? 10.Axd5 y la clavada en la columna 'e' destroza a las negras.",
  },
  {
    year: "2",
    title: "Castigar la codicia",
    text: "",
    game: "Estudio #1 · …9.Cc3 dxc3??",
    moves: `${BASE} Nxe4 d4 b5 Bb3 exd4 Re1 d5 Nc3 dxc3`,
    solution: "Bxd5",
    question: "Juegan las blancas. Las negras se comieron el caballo. ¿Cuál es el golpe decisivo?",
    hint: "Pista: el alfil de b3 apunta a d5, que sostiene al caballo clavado en e4.",
    success: "¡10.Axd5! El caballo de e4 cae y la columna 'e' se abre contra el rey negro: +−.",
  },
  {
    year: "3",
    title: "Sacrificio en f7",
    text: "",
    game: "Estudio #1 · 7...Cxe4 8.axb5 Ce7",
    moves: `${BASE} b5 Bb3 Bc5 a4 Nxe4 axb5 Ne7`,
    solution: "Bxf7+",
    question: "Juegan las blancas. Las negras han tomado el peón de e4. ¿Cómo explotas el punto más débil del campo negro?",
    hint: "Pista: el alfil de b3 lleva toda la partida mirando a g8… y f7 está en medio.",
    success: "¡9.Axf7+! Rxf7 10.Cxe5+ y tras 10...Rg8 11.Df3 la dama ataca la torre de a8 y el caballo de e4.",
  },
  {
    year: "4",
    title: "El alfil intermedio",
    text: "",
    game: "Estudio #1 · línea principal, 12...Cxe4",
    moves: `${BASE} b5 Bb3 Bc5 a4 Rb8 c3 d6 d4 Bb6 a5 Ba7 h3 O-O Be3 Nxe4`,
    solution: "Bd5",
    question: "Juegan las blancas. El caballo negro acaba de comerse el peón de e4. ¿Qué jugada recupera el material con ventaja?",
    hint: "Pista: ataca a la vez al caballo de e4 y al de c6 con una sola pieza.",
    success: "¡13.Ad5! Doble ataque a los dos caballos negros; las blancas recuperan el peón con iniciativa.",
  },
  {
    year: "5",
    title: "La dama al centro",
    text: "",
    game: "Estudio #2 · 10...Cxa5? 11.Txa5 Axa5 12.dxe5 Cxe4",
    moves: `${BASE} b5 Bb3 Bc5 a4 Rb8 c3 d6 d4 Bb6 a5 Nxa5 Rxa5 Bxa5 dxe5 Nxe4`,
    solution: "Qd5",
    question: "Juegan las blancas. El caballo de e4 ha comido un peón. ¿Qué jugada de dama lo deja sin escapatoria?",
    hint: "Pista: la dama puede atacar el caballo y f7 a la vez desde el centro.",
    success: "¡13.Dd5! El caballo de e4 está atacado y f7 también; tras 13...Ae6 14.Dxe4 las blancas quedan mejor.",
  },
  {
    year: "6",
    title: "¡¡El salto del caballo!!",
    text: "",
    game: "Estudio #2 · …16.Dg4 Ac4 17.Dxg7 Axf1",
    moves: `${BASE} b5 Bb3 Bc5 a4 Rb8 c3 d6 d4 Bb6 a5 Nxa5 Rxa5 Bxa5 dxe5 Nxe4 Qd5 Be6 Qxe4 Bxb3 Nd4 d5 Qg4 Bc4 Qxg7 Bxf1`,
    solution: "Nc6",
    question: "Juegan las blancas. Las negras se acaban de comer la torre de f1. Encuentra la jugada genial que gana la dama.",
    hint: "Pista: el caballo de d4 tiene un salto que ataca a la vez a la dama de d8 y a la torre de b8.",
    success: "¡¡18.Cc6!! Si 18...Dd7 19.Dxh8#; si 18...Dc8 19.Dxh8+ Rd7 20.Cxb8+ y caen la dama y todo lo demás.",
  },
  {
    year: "7",
    title: "Ataque al rey sin enroque",
    text: "",
    game: "Estudio #2 · …17.Dxg4 gxf5",
    moves: `${BASE} b5 Bb3 Bc5 a4 Rb8 c3 d6 d4 Bb6 a5 Nxa5 Rxa5 Bxa5 dxe5 Ng4 Bg5 Qd7 e6 fxe6 Nd4 e5 Nf5 g6 Qxg4 gxf5`,
    solution: "Qh5+",
    question: "Juegan las blancas. Las negras se comieron el caballo de f5. ¿Cómo empieza la cacería del rey?",
    hint: "Pista: un jaque de dama por la diagonal h5–e8, con el alfil de b3 vigilando g8.",
    success: "¡18.Dh5+! Rf8 19.Ah6+ Re7 20.Df7+ Rd8 21.Ag5+ De7 22.Dxe7#. Mate forzado.",
  },
  {
    year: "8",
    title: "Explotar las debilidades",
    text: "",
    game: "Estudio #3 · 13...f6 14.exf6 gxf6 15.Ah4 c5",
    moves: `${BASE} b5 Bb3 Bc5 a4 Rb8 c3 d6 d4 Bb6 a5 Nxa5 Rxa5 Bxa5 dxe5 Ng4 Bg5 f6 exf6 gxf6 Bh4 c5`,
    solution: "Bd5",
    question: "Juegan las blancas. La posición negra está llena de casillas débiles. ¿Dónde se instala el alfil para dominar el tablero?",
    hint: "Pista: una casilla central que ya no puede atacar ningún peón negro.",
    success: "¡16.Ad5! +−. El alfil domina la gran diagonal y las piezas negras quedan descoordinadas: la partida se cae a pedazos.",
  },
];

export const CARUANA_CARLSEN = String.raw`[Event "Isle of Man Masters"]
[Site "Douglas IMN"]
[Date "2017.09.30"]
[Round "8"]
[White "Fabiano Caruana"]
[Black "Magnus Carlsen"]
[Result "0-1"]
[ECO "C78"]

{Ronda 8 del Isle of Man Masters 2017: el número 1 contra el número 2 del mundo.} 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O b5 6. Bb3 Bc5 {La Arcángel moderna. Carlsen la elige para buscar juego activo con negras.} 7. c3 d6 8. a4 Rb8 {Por otro orden de jugadas, se llega a la misma posición del estudio.} 9. d4 Bb6 10. a5 Ba7 11. h3 O-O 12. Be3 Ra8 {La torre vuelve a a8: con el peón en a5, el plan ...b4 ya no es urgente y vigila a6.} 13. Re1 h6 14. Nbd2 Re8 15. g4 {¡Novedad! Caruana se lanza a atacar en el flanco de rey.} 15... Qe7 16. Nf1 Nd8 {Una retirada típica: el caballo se reorganiza vía e6 o b7.} 17. Ng3 c5 18. Qd2 c4 19. Bc2 Nh7 20. b4 cxb3 21. Bxb3 Be6 22. Bc2 $6 {Aquí se pierde el hilo. 22.Cf5 mantenía la iniciativa en el flanco de rey.} 22... Rc8 23. Bd3 Nb7 24. Rec1 Qd8 25. Qb2 Nxa5 {Carlsen se come el peón de a5 sin miedo.} 26. Nd2 d5 $1 {Ruptura central: la coordinación negra empieza a hablar.} 27. Re1 Bb8 28. exd5 Bxd5 29. Bf5 Rc6 30. Qa3 Nb7 31. Rad1 exd4 32. Bxd4 Ng5 33. c4 Rxe1+ 34. Rxe1 Be6 35. Qe3 $4 Bf4 $1 {Caruana se rinde: la dama no tiene casillas buenas y la clavada es mortal. "Si alguna vez queréis escribir sobre la coordinación en ajedrez, Magnus acaba de dar la clase magistral" (Jonathan Rowson).} 0-1`;
