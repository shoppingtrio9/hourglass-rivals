import {
  isHomeSquare,
  isSafe,
  pieceAt,
  targetRows,
  validMoves,
  type Move,
  type Piece,
  type Player,
} from "@/lib/game";

const MAX_DICE = 3;

const opponentOf = (p: Player): Player => (p === 1 ? 2 : 1);

/** Distance (in rows) from a square to the nearest target row for the player. */
const rowDistance = (player: Player, row: number) => {
  const targets = targetRows(player);
  return Math.min(...targets.map((t) => Math.abs(t - row)));
};

/** Can any enemy piece reach (row, col) within MAX_DICE points on this board? */
function isThreatened(board: Piece[], player: Player, row: number, col: number) {
  const enemy = opponentOf(player);
  return board.some((p) => {
    if (p.player !== enemy || p.home) return false;
    return validMoves(board, p, MAX_DICE).some((m) => m.row === row && m.col === col);
  });
}

export type BotChoice = { pieceId: string; move: Move };

/**
 * Greedy-but-strategic selection: pick the highest scoring single move for the
 * remaining points, preferring captures, escapes, safe advances and cheap steps
 * so leftover points can be spent on another piece.
 */
export function chooseBotMove(
  board: Piece[],
  player: Player,
  points: number,
): BotChoice | null {
  let best: { score: number; choice: BotChoice } | null = null;

  for (const piece of board) {
    if (piece.player !== player || piece.home) continue;
    const exposedNow = !isSafe(piece) && isThreatened(board, player, piece.row, piece.col);

    for (const move of validMoves(board, piece, points)) {
      const victim = pieceAt(board, move.row, move.col);
      const after = board
        .filter((p) => !(victim && p.id === victim.id))
        .map((p) => (p.id === piece.id ? { ...p, row: move.row, col: move.col } : p));

      let score = 0;

      if (victim && victim.player !== player) {
        // Capturing is the strongest single play; value sending back a runner.
        score += 120 + (rowDistance(victim.player, victim.startRow) - rowDistance(victim.player, victim.row)) * 8;
      }

      if (isHomeSquare(player, move.row)) score += 200;

      // Advance toward the opponent's rows.
      score += (rowDistance(player, piece.row) - rowDistance(player, move.row)) * 14;

      // Safety.
      const landsSafe = isSafe({ ...piece, row: move.row });
      const landsThreatened =
        !landsSafe && isThreatened(after, player, move.row, move.col);
      if (landsThreatened) score -= 55;
      if (exposedNow && !landsThreatened) score += 45;

      // Spend points efficiently so several pieces can act in one turn.
      score -= (move.steps - 1) * 4;
      // Slight nudge to keep pieces off the far edges where options shrink.
      score += Math.random() * 2;

      if (!best || score > best.score) best = { score, choice: { pieceId: piece.id, move } };
    }
  }

  return best?.choice ?? null;
}
