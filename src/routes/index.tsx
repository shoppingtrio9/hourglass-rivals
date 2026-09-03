import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  MAX_COLS,
  ROWS,
  rowWidth,
  createPieces,
  homeCount,
  isHomeSquare,
  pieceAt,
  rowOffset,
  validMoves,
  type Piece,
  type Player,
} from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hourglass Duel — 2-Player Ludo/Chess Hybrid" },
      {
        name: "description",
        content:
          "A pass-and-play mobile board game: roll the dice, march 16 pieces across an hourglass board, capture rivals and get everyone home first.",
      },
      { property: "og:title", content: "Hourglass Duel — 2-Player Board Game" },
      {
        property: "og:description",
        content:
          "Pass-and-play dice board game on a 7-row hourglass grid. Move, capture and race all 16 pieces home.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});

const PLAYER_LABEL: Record<Player, string> = { 1: "Player 1", 2: "Player 2" };

function Game() {
  const [pieces, setPieces] = useState<Piece[]>(createPieces);
  const [turn, setTurn] = useState<Player>(1);
  const [dice, setDice] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [captured, setCaptured] = useState<string | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);

  const selected = pieces.find((p) => p.id === selectedId) ?? null;

  const moves = useMemo(
    () => (selected && dice ? validMoves(pieces, selected, dice) : []),
    [selected, dice, pieces],
  );

  const reset = useCallback(() => {
    setPieces(createPieces());
    setTurn(1);
    setDice(null);
    setSelectedId(null);
    setMoveCount(0);
    setCaptured(null);
    setWinner(null);
  }, []);

  const roll = () => {
    if (rolling || dice !== null || winner) return;
    setRolling(true);
    const value = 1 + Math.floor(Math.random() * 6);
    window.setTimeout(() => {
      setDice(value);
      setRolling(false);
    }, 450);
  };

  const anyMoveAvailable = useMemo(() => {
    if (!dice) return true;
    return pieces.some(
      (p) => p.player === turn && !p.home && validMoves(pieces, p, dice).length > 0,
    );
  }, [pieces, dice, turn]);

  const endTurn = () => {
    setDice(null);
    setSelectedId(null);
    setTurn((t) => (t === 1 ? 2 : 1));
  };

  const tapSquare = (row: number, col: number) => {
    if (winner) return;
    const occupant = pieceAt(pieces, row, col);
    const isDest = moves.some((m) => m.row === row && m.col === col);

    if (isDest && selected && dice) {
      const victim = occupant && occupant.player !== selected.player ? occupant : null;
      if (victim) {
        setCaptured(victim.id);
        window.setTimeout(() => setCaptured(null), 450);
      }
      const next = pieces.map((p) => {
        if (p.id === selected.id) {
          const home = isHomeSquare(p.player, row);
          return { ...p, row, col, home };
        }
        if (victim && p.id === victim.id) {
          return { ...p, row: p.startRow, col: p.startCol, home: false };
        }
        return p;
      });
      setPieces(next);
      setMoveCount((m) => m + 1);
      if (homeCount(next, selected.player) === 16) {
        setWinner(selected.player);
        setDice(null);
        setSelectedId(null);
        return;
      }
      endTurn();
      return;
    }

    if (occupant && occupant.player === turn && !occupant.home && dice) {
      setSelectedId(occupant.id === selectedId ? null : occupant.id);
      return;
    }
    setSelectedId(null);
  };

  const p1Home = homeCount(pieces, 1);
  const p2Home = homeCount(pieces, 2);

  return (
    <main className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-center font-display text-lg tracking-wide text-primary">
          Hourglass Duel
        </h1>
        <div
          className={`mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 ${
            turn === 1 ? "border-p1 bg-p1/15" : "border-p2 bg-p2/15"
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Turn</p>
            <p className="truncate font-display text-base">{PLAYER_LABEL[turn]}</p>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p>
              <span className="text-p1-glow">P1</span> {p1Home}/16 home
            </p>
            <p>
              <span className="text-p2-glow">P2</span> {p2Home}/16 home
            </p>
          </div>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-2 py-3">
        <div className="w-full max-w-[420px] rounded-3xl bg-board p-2 shadow-lg">
          {Array.from({ length: ROWS }, (_, row) => {
            const off = rowOffset(row);
            return (
              <div
                key={row}
                className="grid gap-[2px] py-[1px]"
                style={{ gridTemplateColumns: `repeat(${MAX_COLS}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: rowWidth(row) }, (_, i) => {
                  const col = off + i;
                  const piece = pieceAt(pieces, row, col);
                  const isDest = moves.some((m) => m.row === row && m.col === col);
                  const isSel = piece && piece.id === selectedId;
                  const goal1 = isHomeSquare(1, row);
                  const goal2 = isHomeSquare(2, row);
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => tapSquare(row, col)}
                      style={{ gridColumnStart: col + 1 }}
                      className={`relative aspect-square min-h-0 touch-manipulation rounded-[6px] transition-colors ${
                        goal1 || goal2 ? "bg-board-goal/50" : (row + col) % 2 === 0 ? "bg-board-square" : "bg-board-square-alt"
                      } ${isDest ? "ring-2 ring-valid" : ""}`}
                      aria-label={`row ${row + 1} column ${col + 1}`}
                    >
                      {isDest && !piece && (
                        <span className="absolute inset-0 m-auto h-1/3 w-1/3 animate-pop rounded-full bg-valid" />
                      )}
                      {piece && (
                        <span
                          className={`absolute inset-[10%] rounded-full border-2 ${
                            piece.player === 1
                              ? "border-p1-glow bg-p1"
                              : "border-p2-glow bg-p2"
                          } ${isSel ? "ring-2 ring-primary" : ""} ${
                            captured === piece.id ? "animate-capture-flash" : "animate-pop"
                          } ${piece.home ? "opacity-70 border-dashed" : ""}`}
                        >
                          {piece.home && (
                            <span className="absolute inset-0 grid place-items-center text-[8px] font-bold text-primary-foreground">
                              ★
                            </span>
                          )}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      <footer className="sticky bottom-0 space-y-3 border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Moves: {moveCount}</span>
          <span>
            {dice === null
              ? "Roll to start your turn"
              : selected
                ? `Tap a highlighted square (${dice})`
                : `Tap one of your pieces (${dice})`}
          </span>
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <div
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-secondary font-display text-2xl ${
              rolling ? "animate-dice-roll" : ""
            }`}
          >
            {rolling ? "?" : (dice ?? "–")}
          </div>
          <button
            type="button"
            onClick={roll}
            disabled={dice !== null || rolling || !!winner}
            className="h-16 min-h-[44px] w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            Roll Dice
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={endTurn}
            disabled={dice === null || !!winner}
            className="h-12 min-h-[44px] rounded-xl border border-border bg-secondary text-sm font-semibold text-secondary-foreground active:scale-95 disabled:opacity-40"
          >
            {anyMoveAvailable ? "Skip Turn" : "No Moves — Skip"}
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-12 min-h-[44px] rounded-xl border border-destructive/60 bg-destructive/15 text-sm font-semibold text-foreground active:scale-95"
          >
            Reset Game
          </button>
        </div>
      </footer>

      {winner && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary bg-card p-6 text-center">
            <p className="font-display text-2xl text-primary">
              {PLAYER_LABEL[winner]} Wins!
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              All 16 pieces made it home in {moveCount} moves.
            </p>
            <button
              type="button"
              onClick={reset}
              className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
