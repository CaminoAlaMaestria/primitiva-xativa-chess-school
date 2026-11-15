import { Chess } from "chess.js";

export type Arrow = { from: string; to: string; color: string };
export type PgnNode = {
  id: number;
  parent: number | null;
  san: string;
  fen: string;
  from?: string | undefined;
  to?: string | undefined;
  ply: number;
  comment: string;
  nags: string[];
  arrows: Arrow[];
  squares: { sq: string; color: string }[];
  children: number[];
};
export type PgnGame = { headers: Record<string, string>; nodes: PgnNode[]; evals: number[] };

const NAG: Record<string, string> = { $1: "!", $2: "?", $3: "!!", $4: "??", $5: "!?", $6: "?!", $10: "=", $14: "⩲", $15: "⩱", $16: "±", $17: "∓", $18: "+−", $19: "−+" };

function parseComment(raw: string, node: PgnNode, game: PgnGame) {
  let text = raw;
  text = text.replace(/\[%cal ([^\]]+)\]/g, (_, list: string) => {
    for (const a of list.split(",")) node.arrows.push({ color: a[0]!, from: a.slice(1, 3), to: a.slice(3, 5) });
    return "";
  });
  text = text.replace(/\[%csl ([^\]]+)\]/g, (_, list: string) => {
    for (const a of list.split(",")) node.squares.push({ color: a[0]!, sq: a.slice(1, 3) });
    return "";
  });
  text = text.replace(/\[%evp ([^\]]+)\]/g, (_, list: string) => {
    game.evals = list.split(",").slice(2).map(Number);
    return "";
  });
  text = text.replace(/\[%[^\]]*\]/g, "").trim();
  if (text) node.comment = node.comment ? `${node.comment} ${text}` : text;
}

export function parsePgn(pgn: string): PgnGame[] {
  return pgn
    .split(/\n\s*\n(?=\[)/)
    .filter((s) => s.trim())
    .map(parseGame);
}

export function parseGame(src: string): PgnGame {
  const headers: Record<string, string> = {};
  const body = src.replace(/^\s*\[(\w+)\s+"([^"]*)"\]\s*$/gm, (_, k: string, v: string) => {
    headers[k] = v;
    return "";
  });
  const start = new Chess();
  const game: PgnGame = { headers, evals: [], nodes: [] };
  const mk = (parent: number | null, san: string, fen: string, ply: number, from?: string, to?: string): number => {
    const id = game.nodes.length;
    game.nodes.push({ id, parent, san, fen, from, to, ply, comment: "", nags: [], arrows: [], squares: [], children: [] });
    if (parent !== null) game.nodes[parent]!.children.push(id);
    return id;
  };
  mk(null, "", start.fen(), 0);
  const tokens = body.match(/\{[^}]*\}|\(|\)|\$\d+|\d+\.+|\*|1-0|0-1|1\/2-1\/2|[^\s(){}]+/g) ?? [];
  let cur = 0;
  const stack: number[] = [];
  for (const t of tokens) {
    if (t.startsWith("{")) parseComment(t.slice(1, -1), game.nodes[cur]!, game);
    else if (t === "(") {
      stack.push(cur);
      cur = game.nodes[cur]!.parent ?? 0;
    } else if (t === ")") cur = stack.pop() ?? 0;
    else if (t.startsWith("$")) game.nodes[cur]!.nags.push(NAG[t] ?? "");
    else if (/^\d+\.+$/.test(t) || ["*", "1-0", "0-1", "1/2-1/2"].includes(t)) continue;
    else {
      const parent = game.nodes[cur]!;
      const c = new Chess(parent.fen);
      const clean = t.replace(/[!?]+$/, "");
      const mv = c.move(clean);
      cur = mk(parent.id, mv.san, c.fen(), parent.ply + 1, mv.from, mv.to);
      const suffix = t.slice(clean.length);
      if (suffix) game.nodes[cur]!.nags.push(suffix);
    }
  }
  return game;
}

/** Mainline node ids from root (excluding root). */
export function mainline(g: PgnGame): number[] {
  const out: number[] = [];
  let n = g.nodes[0]!;
  while (n.children.length) {
    n = g.nodes[n.children[0]!]!;
    out.push(n.id);
  }
  return out;
}

/** SAN path from root to a node. */
export function pathTo(g: PgnGame, id: number): string[] {
  const out: string[] = [];
  let n: PgnNode | undefined = g.nodes[id];
  while (n && n.parent !== null) {
    out.unshift(n.san);
    n = g.nodes[n.parent];
  }
  return out;
}

export function moveLabel(n: PgnNode, force: boolean) {
  const num = Math.ceil(n.ply / 2);
  if (n.ply % 2 === 1) return `${num}. `;
  return force ? `${num}… ` : "";
}
