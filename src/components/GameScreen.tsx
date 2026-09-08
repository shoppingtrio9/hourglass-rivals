import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Gift } from "lucide-react";
import {
  areAdsRemoved,
  recordMatchCompleted,
  showInterstitialAd,
  showRewardedAd,
} from "@/lib/ads";
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
  type RuleSet,
} from "@/lib/game";
import { chooseBotMove } from "@/lib/bot";
import { playSfx, startMusic, stopMusic, type SfxName } from "@/lib/audio";
import { readProgress, writeProgress, type Settings } from "@/hooks/use-settings";


export type GameMode = "local" | "bot";

type Props = {
  mode: GameMode;
  rules?: RuleSet;
  settings: Settings;
  onExit: () => void;
};

export function GameScreen({ mode, rules = "race", settings, onExit }: Props) {
  const elimination = rules === "elimination";
  const modeLabel = elimination ? "Elimination Mode" : "Race Mode";
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
  const [adPlaying, setAdPlaying] = useState<"rewarded" | "interstitial" | null>(null);
  const [extraRollUsed, setExtraRollUsed] = useState(false);
  const [pendingExtraRoll, setPendingExtraRoll] = useState(false);

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
    () => (selected && points > 0 ? validMoves(pieces, selected, points, rules) : []),
    [selected, points, pieces, rules],
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
    setAdPlaying(null);
    setExtraRollUsed(false);
    setPendingExtraRoll(false);
  }, []);

  // Extra-roll perk is per-turn: re-arm it whenever the turn changes.
  useEffect(() => {
    setExtraRollUsed(false);
    setPendingExtraRoll(false);
  }, [turn]);

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
    list.some(
      (p) => p.player === player && !p.home && validMoves(list, p, pts, rules).length > 0,
    );


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

  const finishMatch = useCallback(
    (win: Player) => {
      setWinner(win);
      setDice(null);
      setPoints(0);
      sfx("win");
      const prog = readProgress();
      writeProgress({
        games: prog.games + 1,
        wins1: prog.wins1 + (win === 1 ? 1 : 0),
        wins2: prog.wins2 + (win === 2 ? 1 : 0),
      });
      // Placeholder interstitial: after every 2nd completed match.
      if (!areAdsRemoved() && recordMatchCompleted()) {
        window.setTimeout(() => {
          setAdPlaying("interstitial");
          showInterstitialAd(() => setAdPlaying(null));
        }, 900);
      }
    },
    [sfx],
  );

  const applyMove = useCallback(
    (piece: Piece, move: Move) => {
      const occupant = pieceAt(pieces, move.row, move.col);
      const victim = occupant && occupant.player !== piece.player ? occupant : null;
      if (victim) {
        sfx("capture");
        if (elimination) {
          // Permanent removal, same vanish effect as reaching the goal.
          setVanishing(victim.id);
          window.setTimeout(() => setVanishing(null), 550);
        } else {
          setCaptured(victim.id);
          window.setTimeout(() => setCaptured(null), 450);
        }
      } else {
        sfx("move");
      }
      const reachedHome = !elimination && isHomeSquare(piece.player, move.row);
      const next = pieces
        .filter((p) => !(elimination && victim && p.id === victim.id))
        .map((p) => {
          if (p.id === piece.id) return { ...p, row: move.row, col: move.col };
          if (!elimination && victim && p.id === victim.id)
            return { ...p, row: p.startRow, col: p.startCol };
          return p;
        });
      setPieces(next);
      setMoveCount((m) => m + 1);
      const remaining = points - move.steps;
      setPoints(remaining);
      setSelectedId(null);

      let boardAfter = next;

      if (elimination && victim) {
        const left = next.filter((p) => p.player === victim.player).length;
        if (left === 0) {
          finishMatch(piece.player);
          return;
        }
      }

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
          finishMatch(piece.player);
          return;
        }
      }

      if (remaining <= 0 || !hasMoveWith(boardAfter, piece.player, remaining)) {
        // A rewarded extra roll lets the human keep the turn and roll again.
        if (pendingExtraRoll && mode === "bot" && piece.player === 1) {
          setPendingExtraRoll(false);
          setDice(null);
          setPoints(0);
        } else {
          endTurn();
        }
      }
    },
    [pieces, points, reached, sfx, endTurn, pendingExtraRoll, mode, elimination, finishMatch],
  );


  // Rewarded ad placeholder: grants one additional roll on the human's turn
  // (bot matches only, once per turn). Swap internals for AdMob later.
  const watchRewarded = useCallback(() => {
    if (adPlaying || extraRollUsed || winner || botTurn || rolling || dice === null) return;
    setExtraRollUsed(true);
    setAdPlaying("rewarded");
    showRewardedAd(
      () => {
        if (points > 0) {
          // Mid-turn: keep remaining points, roll again once they're spent.
          setPendingExtraRoll(true);
        } else {
          setDice(null);
          setPoints(0);
          setSelectedId(null);
        }
      },
      () => setAdPlaying(null),
    );
  }, [adPlaying, extraRollUsed, winner, botTurn, rolling, dice, points]);

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
      const choice = chooseBotMove(pieces, 2, points, rules);
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
  }, [botTurn, winner, rolling, dice, points, pieces, roll, applyMove, endTurn, rules]);

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
  const p1Alive = pieces.filter((p) => p.player === 1).length;
  const p2Alive = pieces.filter((p) => p.player === 2).length;


  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="game-header shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
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
          className={`game-turn-panel mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            turn === 1 ? "border-p1 bg-p1/15" : "border-p2 bg-p2/15"
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Turn · {modeLabel}
            </p>
            <p className="truncate font-display text-base">
              {label[turn]}
              {thinking && botTurn ? " · thinking…" : ""}
            </p>
          </div>
          <div className="shrink-0 text-right text-xs text-muted-foreground">
            <p>
              <span className="text-p1-glow">{label[1]}</span>{" "}
              {elimination ? `${p1Alive} left` : `${p1Home}/${PIECES_PER_PLAYER}`}
            </p>
            <p>
              <span className="text-p2-glow">{label[2]}</span>{" "}
              {elimination ? `${p2Alive} left` : `${p2Home}/${PIECES_PER_PLAYER}`}
            </p>
          </div>

        </div>
      </header>

      <section className="game-board-area flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-2">
        <div className="game-board shrink-0 rounded-3xl bg-board p-2 shadow-lg">
          {Array.from({ length: ROWS }, (_, visualRow) => {
            const row = mode === "bot" ? ROWS - 1 - visualRow : visualRow;
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
                            !elimination && isSafe(piece) ? "opacity-95 shadow-inner" : ""
                          } ${
                            captured === piece.id
                              ? "animate-capture-flash"
                              : vanishing === piece.id
                                ? "animate-vanish"
                                : "animate-pop"
                          }`}
                        >
                          {!elimination && isSafe(piece) && (
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

      <footer className="game-footer shrink-0 space-y-3 border-t border-border bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
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
        {mode === "bot" && !areAdsRemoved() && (
          <button
            type="button"
            onClick={watchRewarded}
            disabled={adPlaying !== null || extraRollUsed || !!winner || botTurn || rolling || dice === null}
            className="flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/10 text-sm font-semibold text-primary active:scale-95 disabled:opacity-40"
          >
            <Gift className="h-4 w-4" />
            {extraRollUsed ? "Extra Move Used" : "Watch Ad for Extra Move"}
          </button>
        )}
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

      {adPlaying && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-background/95 px-6 animate-fade-in">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-4 font-display text-lg text-primary">Ad Playing…</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {adPlaying === "rewarded"
                ? "Your extra move is on the way"
                : "Back to the game in a moment"}
            </p>
          </div>
        </div>
      )}

      {winner && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary bg-card p-6 text-center">
            <p className="font-display text-2xl text-primary">{label[winner]} Wins!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {elimination
                ? `All of ${label[winner === 1 ? 2 : 1]}'s pieces were eliminated in ${moveCount} moves.`
                : `All ${PIECES_PER_PLAYER} pieces made it home in ${moveCount} moves.`}
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
