import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import {
  MAX_COLS,
  ROWS,
  PIECES_PER_PLAYER,
  rowWidth,
  createPieces,
  isHomeSquare,
  isSafe,
  pieceAt,
  rowOffset,
  validMoves,
  type Piece,
  type Player,
} from "@/lib/game";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hourglass Duel — 2-Player Dice Board Game" },
      {
        name: "description",
        content:
          "A pass-and-play mobile board game: roll 1-3, split your points across pieces, dodge safe zones and race all 8 pieces home.",
      },
      { property: "og:title", content: "Hourglass Duel — 2-Player Board Game" },
      {
        property: "og:description",
        content:
          "Pass-and-play dice board game on a 7-row hourglass grid. Split dice points, capture rivals and get all 8 pieces home.",
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
  const [points, setPoints] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [captured, setCaptured] = useState<string | null>(null);
  const [vanishing, setVanishing] = useState<string | null>(null);
  const [reached, setReached] = useState<Record<Player, number>>({ 1: 0, 2: 0 });
  const [winner, setWinner] = useState<Player | null>(null);

  const selected = pieces.find((p) => p.id === selectedId) ?? null;

  const moves = useMemo(
    () => (selected && points > 0 ? validMoves(pieces, selected, points) : []),
    [selected, points, pieces],
  );

  const reset = useCallback(() => {
    setPieces(createPieces());
    setTurn(1);
    setDice(null);
    setPoints(0);
    setSelectedId(null);
    setMoveCount(0);
    setCaptured(null);
    setVanishing(null);
    setReached({ 1: 0, 2: 0 });
    setWinner(null);
  }, []);

  const roll = () => {
    if (rolling || dice !== null || winner) return;
    setRolling(true);
    const value = 1 + Math.floor(Math.random() * 3);
    window.setTimeout(() => {
      setDice(value);
      setPoints(value);
      setRolling(false);
    }, 450);
  };

  const hasMoveWith = (list: Piece[], player: Player, pts: number) =>
    pts > 0 &&
    list.some((p) => p.player === player && !p.home && validMoves(list, p, pts).length > 0);

  const anyMoveAvailable = useMemo(
    () => (dice === null ? true : hasMoveWith(pieces, turn, points)),
    [pieces, points, dice, turn],
  );

  const endTurn = () => {
    setDice(null);
    setPoints(0);
    setSelectedId(null);
    setTurn((t) => (t === 1 ? 2 : 1));
  };

  const tapSquare = (row: number, col: number) => {
    if (winner) return;
    const occupant = pieceAt(pieces, row, col);
    const move = moves.find((m) => m.row === row && m.col === col);

    if (move && selected && points > 0) {
      const victim = occupant && occupant.player !== selected.player ? occupant : null;
      if (victim) {
        setCaptured(victim.id);
        window.setTimeout(() => setCaptured(null), 450);
      }
      const reachedHome = isHomeSquare(selected.player, row);
      const next = pieces.map((p) => {
        if (p.id === selected.id) return { ...p, row, col };
        if (victim && p.id === victim.id)
          return { ...p, row: p.startRow, col: p.startCol };
        return p;
      });
      setPieces(next);
      setMoveCount((m) => m + 1);
      const remaining = points - move.steps;
      setPoints(remaining);
      setSelectedId(null);

      let boardAfter = next;
      if (reachedHome) {
        setVanishing(selected.id);
        const newTotal = reached[selected.player] + 1;
        setReached((r) => ({ ...r, [selected.player]: newTotal }));
        window.setTimeout(() => {
          setPieces((prev) => prev.filter((p) => p.id !== selected.id));
          setVanishing(null);
        }, 550);
        boardAfter = next.filter((p) => p.id !== selected.id);
        if (newTotal === PIECES_PER_PLAYER) {
          setWinner(selected.player);
          setDice(null);
          setPoints(0);
          return;
        }
      }

      if (remaining <= 0 || !hasMoveWith(boardAfter, turn, remaining)) endTurn();
      return;
    }

    if (occupant && occupant.player === turn && !occupant.home && points > 0) {
      setSelectedId(occupant.id === selectedId ? null : occupant.id);
      return;
    }
    setSelectedId(null);
  };

  const p1Home = reached[1];
  const p2Home = reached[2];

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
              <span className="text-p1-glow">P1</span> {p1Home}/{PIECES_PER_PLAYER} home
            </p>
            <p>
              <span className="text-p2-glow">P2</span> {p2Home}/{PIECES_PER_PLAYER} home
            </p>
          </div>
        </div>
      </header>

      <section className="flex flex-1 items-center justify-center px-2 py-3">
        <div
          className="rounded-3xl bg-board p-2 shadow-lg"
          style={{ width: "min(100%, 380px, calc((100dvh - 340px) * 6 / 7))" }}
        >
          {Array.from({ length: ROWS }, (_, row) => {
            const off = rowOffset(row);
            return (
              <div
                key={row}
                className="grid gap-[3px] py-[1.5px]"
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
                      className={`relative aspect-square min-h-0 touch-manipulation rounded-[8px] transition-colors ${
                        goal1 || goal2
                          ? "bg-board-goal/50"
                          : (row + col) % 2 === 0
                            ? "bg-board-square"
                            : "bg-board-square-alt"
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
                            isSafe(piece) ? "opacity-95 shadow-inner" : ""
                          } ${
                            captured === piece.id
                              ? "animate-capture-flash"
                              : vanishing === piece.id
                                ? "animate-vanish"
                                : "animate-pop"
                          }`}
                        >
                          {isSafe(piece) && (
                            <span className="absolute inset-0 grid place-items-center text-[9px] text-foreground/70">
                              ✦
                            </span>
                          )}
                          {vanishing === piece.id && (
                            <span className="absolute -inset-1 grid place-items-center text-xs animate-sparkle">
                              ✦
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
                ? `Tap a highlighted square`
                : `Tap one of your pieces`}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Points left
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: dice ?? 0 }, (_, i) => (
              <span
                key={i}
                className={`h-3 w-3 rounded-full ${i < points ? "bg-valid" : "bg-muted"}`}
              />
            ))}
            <span className="ml-2 font-display text-sm">
              {dice === null ? "–" : `${points}/${dice}`}
            </span>
          </div>
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
              All {PIECES_PER_PLAYER} pieces made it home in {moveCount} moves.
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
