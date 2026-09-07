export const ROW_WIDTHS: number[] = [4, 4, 6, 6, 6, 4, 4];
export const MAX_COLS = 6;
export const ROWS = 7;

/** Column offset for a row within the widest row. */
export const rowWidth = (row: number) => ROW_WIDTHS[row] ?? 0;
export const rowOffset = (row: number) => (MAX_COLS - rowWidth(row)) / 2;

export const isPlayable = (row: number, col: number) => {
  if (row < 0 || row >= ROWS) return false;
  const off = rowOffset(row);
  return col >= off && col < off + rowWidth(row);
};

export type Player = 1 | 2;

export type Piece = {
  id: string;
  player: Player;
  row: number;
  col: number;
  startRow: number;
  startCol: number;
  home: boolean;
};

export const startRows = (player: Player) => (player === 1 ? [0, 1] : [5, 6]);
export const targetRows = (player: Player) => (player === 1 ? [5, 6] : [0, 1]);

export const PIECES_PER_PLAYER = 8;

export function createPieces(): Piece[] {
  const pieces: Piece[] = [];
  const setup: Array<[Player, number]> = [
    [1, 0],
    [1, 1],
    [2, 5],
    [2, 6],
  ];
  for (const [player, row] of setup) {
    const off = rowOffset(row);
    for (let i = 0; i < rowWidth(row); i++) {
      const col = off + i;
      pieces.push({
        id: `p${player}-${row}-${col}`,
        player,
        row,
        col,
        startRow: row,
        startCol: col,
        home: false,
      });
    }
  }
  return pieces;
}

export const pieceAt = (pieces: Piece[], row: number, col: number) =>
  pieces.find((p) => p.row === row && p.col === col);

/** A piece sitting in its own starting rows is safe: cannot be captured or passed. */
export const isSafe = (piece: Piece) => startRows(piece.player).includes(piece.row);

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export type Move = { row: number; col: number; steps: number };

/** Which rule set a match is played under. */
export type RuleSet = "race" | "elimination";

/**
 * All straight-line destinations reachable using between 1 and `maxSteps` points.
 * Paths must stay on-board and unobstructed. Under the "race" rules a safe piece
 * (one resting in its own home rows) also blocks movement and cannot be captured;
 * under "elimination" rules safe zones are disabled entirely.
 */
export function validMoves(
  pieces: Piece[],
  piece: Piece,
  maxSteps: number,
  rules: RuleSet = "race",
): Move[] {
  const safeMatters = rules === "race";
  const moves: Move[] = [];
  if (piece.home || maxSteps <= 0) return moves;
  for (const [dr, dc] of DIRS) {
    let r = piece.row;
    let c = piece.col;
    for (let s = 1; s <= maxSteps; s++) {
      r += dr;
      c += dc;
      if (!isPlayable(r, c)) break;
      const occupant = pieceAt(pieces, r, c);
      if (occupant) {
        if (occupant.player === piece.player || (safeMatters && isSafe(occupant))) break;
        moves.push({ row: r, col: c, steps: s });
        break; // cannot continue past a piece
      }
      moves.push({ row: r, col: c, steps: s });
    }
  }
  return moves;
}


export const isHomeSquare = (player: Player, row: number) =>
  targetRows(player).includes(row);

export const homeCount = (pieces: Piece[], player: Player) =>
  pieces.filter((p) => p.player === player && p.home).length;
