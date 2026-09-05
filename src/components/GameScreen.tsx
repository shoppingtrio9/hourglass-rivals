import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
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
  type Move,
  type Piece,
  type Player,
} from "@/lib/game";
import { chooseBotMove } from "@/lib/bot";
import { playSfx, startMusic, stopMusic, type SfxName } from "@/lib/audio";
import { readProgress, writeProgress, type Settings } from "@/hooks/use-settings";

export type GameMode = "local" | "bot";

type Props = {
  mode: GameMode;
  settings: Settings;
  onExit: () => void;
};

export function GameScreen({ mode, settings, onExit }: Props) {
  const label: Record<Player, string> = {
    1: mode === "bot" ? "You" : "Player 1",
    2: mode === "bot" ? "Bot" : "Player 2",
  };

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
  const [thinking, setThinking] = useState(false);

  const sfx = useCallback(
    (name: SfxName) => {
      if (settings.sfx) playSfx(name);
    },
    [settings.sfx],
  );

  useEffect(() => {
    if (settings.music) startMusic();
    else stopMusic();
    return () => stopMusic();
  }, [settings.music]);

  const selected = pieces.find((p) => p.id === selectedId) ?? null;
  const botTurn = mode === "bot" && turn === 2;

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

  const roll = useCallback(() => {
    if (rolling || dice !== null || winner) return;
    setRolling(true);
    sfx("roll");
    const value = 1 + Math.floor(Math.random() * 3);
    window.setTimeout(() => {
      setDice(value);
      setPoints(value);
      setRolling(false);
    }, 450);
  }, [rolling, dice, winner, sfx]);

  const hasMoveWith = (list: Piece[], player: Player, pts: number) =>
    pts > 0 &&
    list.some((p) => p.player === player && !p.home && validMoves(list, p, pts).length > 0);

  const anyMoveAvailable = useMemo(
    () => (dice === null ? true : hasMoveWith(pieces, turn, points)),
    [pieces, points, dice, turn],
  );

  const endTurn = useCallback(() => {
    setDice(null);
    setPoints(0);
    setSelectedId(null);
    setTurn((t) => (t === 1 ? 2 : 1));
  }, []);

  const winnerRef = useRef<Player | null>(null);
  winnerRef.current = winner;

  const applyMove = useCallback(
    (piece: Piece, move: Move) => {
      const occupant = pieceAt(pieces, move.row, move.col);
      const victim = occupant && occupant.player !== piece.player ? occupant : null;
      if (victim) {
        setCaptured(victim.id);
        sfx("capture");
        window.setTimeout(() => setCaptured(null), 450);
      } else {
        sfx("move");
      }
      const reachedHome = isHomeSquare(piece.player, move.row);
      const next = pieces.map((p) => {
        if (p.id === piece.id) return { ...p, row: move.row, col: move.col };
        if (victim && p.id === victim.id) return { ...p, row: p.startRow, col: p.startCol };
        return p;
      });
      setPieces(next);
      setMoveCount((m) => m + 1);
      const remaining = points - move.steps;
      setPoints(remaining);
      setSelectedId(null);

      let boardAfter = next;
      if (reachedHome) {
        sfx("goal");
        setVanishing(piece.id);
        const newTotal = reached[piece.player] + 1;
        setReached((r) => ({ ...r, [piece.player]: newTotal }));
        window.setTimeout(() => {
          setPieces((prev) => prev.filter((p) => p.id !== piece.id));
          setVanishing(null);
        }, 550);
        boardAfter = next.filter((p) => p.id !== piece.id);
        if (newTotal === PIECES_PER_PLAYER) {
          setWinner(piece.player);
          setDice(null);
          setPoints(0);
          sfx("win");
          const prog = readProgress();
          writeProgress({
            games: prog.games + 1,
            wins1: prog.wins1 + (piece.player === 1 ? 1 : 0),
            wins2: prog.wins2 + (piece.player === 2 ? 1 : 0),
          });
          return;
        }
      }

      if (remaining <= 0 || !hasMoveWith(boardAfter, piece.player, remaining)) endTurn();
    },
    [pieces, points, reached, sfx, endTurn],
  );

  // Bot driver: rolls, then spends its points one move at a time.
  useEffect(() => {
    if (!botTurn || winner || rolling) return;
    if (dice === null) {
      setThinking(true);
      const t = window.setTimeout(() => roll(), 600);
      return () => window.clearTimeout(t);
    }
    if (points <= 0) return;
    setThinking(true);
    const t = window.setTimeout(() => {
      const choice = chooseBotMove(pieces, 2, points);
      if (!choice) {
        endTurn();
        setThinking(false);
        return;
      }
      const piece = pieces.find((p) => p.id === choice.pieceId);
      if (!piece) {
        endTurn();
        setThinking(false);
        return;
      }
      applyMove(piece, choice.move);
      setThinking(false);
    }, 700);
    return () => window.clearTimeout(t);
  }, [botTurn, winner, rolling, dice, points, pieces, roll, applyMove, endTurn]);

  useEffect(() => {
    if (!botTurn) setThinking(false);
  }, [botTurn]);

  const tapSquare = (row: number, col: number) => {
    if (winner || botTurn) return;
    const occupant = pieceAt(pieces, row, col);
    const move = moves.find((m) => m.row === row && m.col === col);

    if (move && selected && points > 0) {
      applyMove(selected, move);
      return;
    }

    if (occupant && occupant.player === turn && !occupant.home && points > 0) {
      sfx("tap");
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExit}
            aria-label="Back to menu"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-secondary active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center font-display text-base tracking-wide text-primary">
            {mode === "bot" ? "Vs Bot" : "Hourglass Duel"}
          </h1>
          <span className="h-11 w-11" />
        </div>
        <div
          className={`mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            turn === 1 ? "border-p1 bg-p1/15" : "border-p2 bg-p2/15"
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Turn</p>
            <p className="truncate font-display text-base">
              {label[turn]}
              {thinking && botTurn ? " · thinking…" : ""}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p>
              <span className="text-p1-glow">{label[1]}</span> {p1Home}/{PIECES_PER_PLAYER}
            </p>
            <p>
              <span className="text-p2-glow">{label[2]}</span> {p2Home}/{PIECES_PER_PLAYER}
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
            {botTurn
              ? "Bot is playing…"
              : dice === null
                ? "Roll to start your turn"
                : selected
                  ? "Tap a highlighted square"
                  : "Tap one of your pieces"}
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
            disabled={dice !== null || rolling || !!winner || botTurn}
            className="h-16 min-h-[44px] w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            Roll Dice
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={endTurn}
            disabled={dice === null || !!winner || botTurn}
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
            <p className="font-display text-2xl text-primary">{label[winner]} Wins!</p>
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
            <button
              type="button"
              onClick={onExit}
              className="mt-3 h-12 w-full rounded-2xl border border-border bg-secondary text-sm font-semibold active:scale-95"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
