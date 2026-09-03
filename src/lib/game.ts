export const ROW_WIDTHS: number[] = [8, 8, 10, 10, 10, 8, 8];
export const MAX_COLS = 10;
export const ROWS = 7;

/** Column offset for a row within the 10-wide grid. */
export const rowOffset = (row: number) => (MAX_COLS - ROW_WIDTHS[row]) / 2;

export const isPlayable = (row: number, col: number) => {
  if (row < 0 || row >= ROWS) return false;
  const off = rowOffset(row);
  return col >= off && col < off + ROW_WIDTHS[row];
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

export const targetRows = (player: Player) => (player === 1 ? [5, 6] : [0, 1]);

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
    for (let i = 0; i < ROW_WIDTHS[row]; i++) {
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

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

/** Straight-line moves of exactly `steps`, path on-board and unobstructed. */
export function validMoves(pieces: Piece[], piece: Piece, steps: number) {
  const moves: Array<{ row: number; col: number }> = [];
  if (piece.home) return moves;
  for (const [dr, dc] of DIRS) {
    let r = piece.row;
    let c = piece.col;
    let ok = true;
    for (let s = 1; s <= steps; s++) {
      r += dr;
      c += dc;
      if (!isPlayable(r, c)) {
        ok = false;
        break;
      }
      const occupant = pieceAt(pieces, r, c);
      if (occupant && s < steps) {
        ok = false;
        break;
      }
      if (occupant && s === steps && occupant.player === piece.player) {
        ok = false;
        break;
      }
    }
    if (ok) moves.push({ row: r, col: c });
  }
  return moves;
}

export const isHomeSquare = (player: Player, row: number) =>
  targetRows(player).includes(row);

export const homeCount = (pieces: Piece[], player: Player) =>
  pieces.filter((p) => p.player === player && p.home).length;
