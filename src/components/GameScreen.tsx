import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Gift, Coins } from "lucide-react";
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
import { payoutWin, rollLuckyReward, placeStake, getCoins, type LuckyReward } from "@/lib/coins";
import { App } from "@capacitor/app";
import { getSelectedSkin, getSkinById } from "@/lib/skins";
import { getProfileName, addMatchRecord, recordMatchResult, buildPublicProfile } from "@/lib/profile";
import {
  subscribeRoom,
  pushGameState,
  markRoomFinished,
  normalizeOnlineState,
  markRoomLeft,
  trackPresence,
  writeProfile,
  RECONNECT_GRACE_SECONDS,
  HEARTBEAT_STALE_MS,
  type PublicProfile,
  requestRematch,
  startRematch,
  chargeStakeOnce,
  payoutStakeOnce,
  type OnlineGameState,
} from "@/lib/online";


export type GameMode = "local" | "bot" | "online";

export type OnlineSession = {
  code: string;
  myPlayer: Player;
  names: Record<Player, string>;
  /** Coins each player puts in (0 = free room). */
  stake: number;
};

type Props = {
  mode: GameMode;
  rules?: RuleSet | undefined;
  settings: Settings;
  stake?: number | undefined;
  luckyShot?: boolean | undefined;
  online?: OnlineSession | undefined;
  onExit: () => void;
};

export function GameScreen({ mode, rules = "race", settings, stake, luckyShot, online, onExit }: Props) {
  const elimination = rules === "elimination";
  const skin = getSkinById(getSelectedSkin());
  const modeLabel = elimination ? "Elimination Mode" : "Race Mode";
  const label: Record<Player, string> =
    mode === "online" && online
      ? online.names
      : {
          1: getProfileName(),
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
  const [luckyReward, setLuckyReward] = useState<LuckyReward | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [opponentLeft, setOpponentLeft] = useState(false);

  // When true, the next state change came from Firebase — don't echo it back.

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

  useEffect(() => {
    const listener = App.addListener("backButton", () => {
      setConfirmExit(true);
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  const selected = pieces.find((p) => p.id === selectedId) ?? null;
  const botTurn = mode === "bot" && turn === 2;
  // Online presence: opponent offline → pause; my connection lost → pause.
  const [oppOffline, setOppOffline] = useState(false);
  const [myConnLost, setMyConnLost] = useState(false);
  const [graceLeft, setGraceLeft] = useState(RECONNECT_GRACE_SECONDS);
  const [forfeit, setForfeit] = useState<null | "opponent-left" | "opponent-timeout" | "me-timeout">(null);
  const [oppProfile, setOppProfile] = useState<PublicProfile | null>(null);
  const [showVs, setShowVs] = useState(mode === "online");
  const paused = mode === "online" && (oppOffline || myConnLost);
  const myTurn =
    mode !== "online" || !online || (turn === online.myPlayer && !paused && !forfeit);

  // Online sync. We track the last state known to be in Firebase (serialized)
  // and only push when local state differs from it. This avoids the old
  // boolean "suppress" flag getting stuck when an echoed snapshot causes no
  // re-render (which silently swallowed the next local roll/move), and stops
  // the default mount state from overwriting the room before it's loaded.
  const lastSynced = useRef<string | null>(null);
  const onlineWinnerRef = useRef<Player | null>(null);
  const oppLastBeat = useRef(Date.now());
  const [round, setRound] = useState(0);
  const [rematch, setRematch] = useState<Partial<Record<Player, boolean>>>({});
  const onlineStake = mode === "online" && online ? online.stake : 0;

  useEffect(() => {
    if (mode !== "online" || !online) return;
    lastSynced.current = null;
    const unsub = subscribeRoom(online.code, (room) => {
      if (!room) return;
      if (room.status === "left" && room.leftBy !== online.myPlayer) {
        // Leaving mid-match is a forfeit; leaving after the result is just leaving.
        if (!onlineWinnerRef.current && !room.settled) {
          setOpponentLeft(true);
          setForfeit((f) => f ?? "opponent-left");
          if (online.stake > 0) payoutStakeOnce(online.code, room.round ?? 1, online.stake);
        }
        return;
      }
      const opp: Player = online.myPlayer === 1 ? 2 : 1;
      if (room.profiles?.[opp]) setOppProfile(room.profiles[opp]!);
      const pres = room.presence?.[opp];
      if (pres) {
        oppLastBeat.current = Date.now();
        setOppOffline(pres.online === false);
      }
      setRound(room.round ?? 1);
      setRematch(room.rematch ?? {});
      if (room.rematch?.[1] && room.rematch?.[2] && online.myPlayer === 1) {
        void startRematch(online.code, (room.round ?? 1) + 1);
      }
      if (!room.state) return;
      const s = normalizeOnlineState(room.state);
      const key = JSON.stringify(s);
      if (key === lastSynced.current) return;
      lastSynced.current = key;
      setPieces(s.pieces);
      setTurn(s.turn);
      setDice(s.dice);
      setPoints(s.points);
      setMoveCount(s.moveCount);
      setReached(s.reached);
      setWinner(s.winner);
      setSelectedId(null);
    });
    return unsub;
  }, [mode, online]);

  useEffect(() => {
    if (mode !== "online" || !online) return;
    if (lastSynced.current === null) return; // room not loaded yet
    const state = normalizeOnlineState({ pieces, turn, dice, points, moveCount, reached, winner });
    const key = JSON.stringify(state);
    if (key === lastSynced.current) return;
    lastSynced.current = key;
    const p = winner ? markRoomFinished(online.code, state) : pushGameState(online.code, state);
    p.catch((e) => console.error("Online sync failed:", e));
  }, [mode, online, pieces, turn, dice, points, moveCount, reached, winner]);

  onlineWinnerRef.current = winner;

  // Online stakes: charge each player once per round when the match starts.
  useEffect(() => {
    if (mode !== "online" || !online || !round || online.stake <= 0) return;
    chargeStakeOnce(online.code, round, online.stake);
  }, [mode, online, round]);

  // Online stakes: the winner's device collects the pot exactly once.
  useEffect(() => {
    if (mode !== "online" || !online || !round || !winner || online.stake <= 0) return;
    if (winner === online.myPlayer) payoutStakeOnce(online.code, round, online.stake);
  }, [mode, online, round, winner]);

  // Online: share my public profile and track presence for both players.
  useEffect(() => {
    if (mode !== "online" || !online) return;
    void writeProfile(online.code, online.myPlayer, buildPublicProfile(skin)).catch(() => {});
    return trackPresence(online.code, online.myPlayer, (c) => setMyConnLost(!c));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, online]);

  // Heartbeat staleness: treat the opponent as offline if beats stop arriving.
  useEffect(() => {
    if (mode !== "online" || !online) return;
    const t = window.setInterval(() => {
      if (Date.now() - oppLastBeat.current > HEARTBEAT_STALE_MS) setOppOffline(true);
    }, 2000);
    return () => window.clearInterval(t);
  }, [mode, online]);

  // Reconnect countdown while either side is offline; forfeit when it runs out.
  useEffect(() => {
    if (!paused || winner || forfeit) {
      setGraceLeft(RECONNECT_GRACE_SECONDS);
      return;
    }
    const t = window.setInterval(() => setGraceLeft((g) => Math.max(0, g - 1)), 1000);
    return () => window.clearInterval(t);
  }, [paused, winner, forfeit]);

  useEffect(() => {
    if (mode !== "online" || !online || !paused || winner || forfeit || graceLeft > 0) return;
    const opp: Player = online.myPlayer === 1 ? 2 : 1;
    if (myConnLost) {
      setForfeit("me-timeout");
      setWinner(opp); // syncs when we're back; the opponent already claimed it
    } else {
      setForfeit("opponent-timeout");
      setWinner(online.myPlayer); // pushes finished + settled; payout effect pays once
    }
  }, [mode, online, paused, winner, forfeit, graceLeft, myConnLost]);

  // Hide the VS intro after a moment.
  useEffect(() => {
    if (!showVs) return;
    const t = window.setTimeout(() => setShowVs(false), 3500);
    return () => window.clearTimeout(t);
  }, [showVs]);



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

  const playAgain = useCallback(() => {
    if (mode === "bot" && !luckyShot && stake) {
      if (!placeStake(stake)) return;
    }
    reset();
  }, [mode, luckyShot, stake, reset]);

  // Extra-roll perk is per-turn: re-arm it whenever the turn changes.
  useEffect(() => {
    setExtraRollUsed(false);
    setPendingExtraRoll(false);
  }, [turn]);

  const roll = useCallback(() => {
    if (rolling || dice !== null || winner || !myTurn) return;
    setRolling(true);
    sfx("roll");
    const value = 1 + Math.floor(Math.random() * 3);
    window.setTimeout(() => {
      setDice(value);
      setPoints(value);
      setRolling(false);
    }, 450);
  }, [rolling, dice, winner, sfx, myTurn]);

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
  useEffect(() => {
    if (winner || botTurn || dice === null || points <= 0 || anyMoveAvailable) return;
    const t = window.setTimeout(() => endTurn(), 900);
    return () => window.clearTimeout(t);
  }, [winner, botTurn, dice, points, anyMoveAvailable, endTurn]);


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
      let reward: LuckyReward | null = null;
      if (mode === "bot" && luckyShot && win === 1) {
        reward = rollLuckyReward();
        setLuckyReward(reward);
      } else if (mode === "bot" && stake && win === 1) {
        payoutWin(stake);
      }
      recordMatchResult(win === 1);
      addMatchRecord({
        date: new Date().toISOString(),
        mode,
        rules,
        result: win === 1 ? "win" : "loss",
        stake,
        payout: reward?.type === "coins" ? reward.amount : stake && win === 1 ? stake * 2 : undefined,
      });
      // Placeholder interstitial: after every 2nd completed match.
      if (!areAdsRemoved() && recordMatchCompleted()) {
        window.setTimeout(() => {
          setAdPlaying("interstitial");
          showInterstitialAd(() => setAdPlaying(null));
        }, 900);
      }
    },
    [sfx, mode, stake, rules, luckyShot],
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
    if (winner || botTurn || !myTurn) return;
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
  // My pieces use my equipped skin + Player-1 palette; the opponent always
  // gets the other palette, so the two sides never share a colour.
  const myColorPlayer: Player = mode === "online" && online ? online.myPlayer : 1;
  // Opponent's real equipped colour; falls back to the default opponent palette
  // when they use the default skin or the same colour as me.
  const oppSkinStyle =
    mode === "online" && oppProfile?.skinColor && oppProfile.skinColor !== skin.color
      ? { backgroundColor: oppProfile.skinColor, borderColor: oppProfile.skinGlow }
      : undefined;
  const p1Alive = pieces.filter((p) => p.player === 1).length;
  const p2Alive = pieces.filter((p) => p.player === 2).length;


  return (
    <main className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="game-header shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmExit(true)}
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
        {mode === "bot" && luckyShot && (
          <div className="mt-2 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs font-semibold text-sky-400">
            <Coins className="h-3.5 w-3.5" />
            Lucky Match
          </div>
        )}
        {onlineStake > 0 && (
          <div className="mt-2 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Coins className="h-3.5 w-3.5" />
            {onlineStake.toLocaleString()} Coin Match
          </div>
        )}
        {mode === "bot" && !luckyShot && stake && (
          <div className="mt-2 mx-auto flex w-fit items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Coins className="h-3.5 w-3.5" />
            {stake.toLocaleString()} Coin Match
          </div>
        )}
        <div
          className={`game-turn-panel mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
            turn === myColorPlayer ? "border-p1 bg-p1/15" : "border-p2 bg-p2/15"
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
        {mode === "online" && oppProfile && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs">
            <span
              className="h-4 w-4 shrink-0 rounded-full border-2 bg-p2 border-p2-glow"
              style={oppSkinStyle}
            />
            <span className="truncate font-semibold" style={{ color: oppProfile.frameColor }}>
              {oppProfile.name}
            </span>
            {oppProfile.title && <span className="truncate text-muted-foreground">· {oppProfile.title}</span>}
            <span className="ml-auto shrink-0 text-muted-foreground">
              🏆 {oppProfile.trophies} · {oppProfile.totalWins}W
            </span>
          </div>
        )}
      </header>

      <section className="game-board-area flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-2">
        <div className="game-board shrink-0 rounded-3xl bg-board p-2 shadow-lg">
          {Array.from({ length: ROWS }, (_, visualRow) => {
            // Player 1 starts at the top rows, so whoever is "me" (Player 1 vs bot,
            // or my seat online) gets the board flipped to sit at the bottom.
            const flip = mode === "bot" || (mode === "online" && online?.myPlayer === 1);
            const row = flip ? ROWS - 1 - visualRow : visualRow;
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
                          style={
                            piece.player === myColorPlayer
                              ? skin.color
                                ? { backgroundColor: skin.color, borderColor: skin.glow }
                                : undefined
                              : oppSkinStyle
                          }
                          className={`absolute inset-[10%] rounded-full border-2 ${
                            piece.player === myColorPlayer
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
              : mode === "online" && !myTurn
                ? `Waiting for ${label[turn]}…`
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
            disabled={dice !== null || rolling || !!winner || botTurn || !myTurn}
            className="h-16 min-h-[44px] w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
          >
            Roll Dice
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

      {confirmExit && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-background/90 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary bg-card p-6 text-center">
            <p className="font-display text-lg text-primary">Exit Match?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Your progress in this match will be lost.
            </p>
            <button
              type="button"
              onClick={() => {
                if (mode === "online" && online) void markRoomLeft(online.code, online.myPlayer);
                onExit();
              }}
              className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95"
            >
              {mode === "online" ? "Leave Match" : "Exit"}
            </button>
            <button
              type="button"
              onClick={() => setConfirmExit(false)}
              className="mt-3 h-12 w-full rounded-2xl border border-border bg-secondary text-sm font-semibold active:scale-95"
            >
              Keep Playing
            </button>
          </div>
        </div>
      )}
      {opponentLeft && (
        <div className="fixed inset-0 z-[65] grid place-items-center bg-background/95 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-primary bg-card p-6 text-center">
            <p className="font-display text-2xl text-primary">Opponent left. You win!</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {oppProfile?.name ?? "Your opponent"} quit the match.
            </p>
            {onlineStake > 0 && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold">
                <Coins className="h-4 w-4 text-primary" />
                You won {(onlineStake * 2).toLocaleString()} coins!
              </p>
            )}
            <button
              type="button"
              onClick={onExit}
              className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
      {mode === "online" && paused && !winner && !forfeit && !opponentLeft && (
        <div className="fixed inset-0 z-[62] grid place-items-center bg-background/90 px-6 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center">
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-4 font-display text-lg text-primary">
              {myConnLost ? "Connection lost. Reconnecting…" : "Opponent disconnected"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {myConnLost
                ? "Check your internet. If you don't reconnect in time, you lose by forfeit."
                : "Waiting for them to reconnect…"}
            </p>
            <p className="mt-3 font-display text-3xl">{graceLeft}s</p>
          </div>
        </div>
      )}
      {mode === "online" && showVs && oppProfile && !winner && (
        <div
          className="fixed inset-0 z-[61] grid place-items-center bg-background/95 px-6 animate-fade-in"
          onClick={() => setShowVs(false)}
        >
          <div className="w-full max-w-sm space-y-4 text-center">
            <ProfileCard p={buildPublicProfile(skin)} fallback="p1" />
            <p className="font-display text-3xl text-primary">VS</p>
            <ProfileCard p={oppProfile} fallback="p2" />
            <p className="text-xs text-muted-foreground">Tap to start</p>
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
            {mode === "bot" && luckyShot && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold">
                <Coins className="h-4 w-4 text-primary" />
                {winner === 1
                  ? luckyReward
                    ? `You won ${luckyReward.amount.toLocaleString()} ${luckyReward.type}!`
                    : null
                  : "No loss — try again anytime!"}
              </p>
            )}
            {mode === "bot" && !luckyShot && stake && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold">
                <Coins className="h-4 w-4 text-primary" />
                {winner === 1
                  ? `You won ${(stake * 2).toLocaleString()} coins!`
                  : `The bot took your ${stake.toLocaleString()} coins.`}
              </p>
            )}
            {mode === "online" && online && onlineStake > 0 && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold">
                <Coins className="h-4 w-4 text-primary" />
                {winner === online.myPlayer
                  ? `You won ${(onlineStake * 2).toLocaleString()} coins!`
                  : `You lost ${onlineStake.toLocaleString()} coins.`}
              </p>
            )}
            {mode === "online" && online && (
              <button
                type="button"
                disabled={!!rematch[online.myPlayer] || (onlineStake > 0 && getCoins() < onlineStake)}
                onClick={() => void requestRematch(online.code, online.myPlayer)}
                className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95 disabled:opacity-40"
              >
                {onlineStake > 0 && getCoins() < onlineStake
                  ? "Not enough coins"
                  : rematch[online.myPlayer]
                    ? rematch[online.myPlayer === 1 ? 2 : 1]
                      ? "Starting…"
                      : "Waiting for opponent…"
                    : rematch[online.myPlayer === 1 ? 2 : 1]
                      ? "Opponent wants a rematch — Play Again"
                      : "Play Again"}
              </button>
            )}
            {mode !== "online" && !luckyShot && (
              <button
                type="button"
                onClick={playAgain}
                className="mt-6 h-14 w-full rounded-2xl bg-primary font-display text-lg text-primary-foreground active:scale-95"
              >
                Play Again
              </button>
            )}
            <button
              type="button"
              onClick={onExit}
              onClickCapture={() => {
                if (mode === "online" && online) void markRoomLeft(online.code, online.myPlayer);
              }}
              className={`h-12 w-full rounded-2xl border border-border bg-secondary text-sm font-semibold active:scale-95 ${luckyShot ? "mt-6" : "mt-3"}`}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function ProfileCard({ p, fallback }: { p: PublicProfile; fallback: "p1" | "p2" }) {
  return (
    <div
      className="rounded-3xl border-2 bg-card p-4 text-left"
      style={{ borderColor: p.frameColor }}
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-10 w-10 shrink-0 rounded-full border-2 ${fallback === "p1" ? "bg-p1 border-p1-glow" : "bg-p2 border-p2-glow"}`}
          style={p.skinColor ? { backgroundColor: p.skinColor, borderColor: p.skinGlow } : undefined}
        />
        <div className="min-w-0">
          <p className="truncate font-display text-lg">{p.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {p.title ?? "No title yet"} · {p.skinName} · {p.frameName}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-secondary/60 py-1.5"><p className="font-display text-base">{p.trophies}</p>Trophies</div>
        <div className="rounded-xl bg-secondary/60 py-1.5"><p className="font-display text-base">{p.totalWins}</p>Wins</div>
        <div className="rounded-xl bg-secondary/60 py-1.5"><p className="font-display text-base">{p.bestWinStreak}</p>Best streak</div>
      </div>
      {p.topTrophies.length > 0 && (
        <p className="mt-2 truncate text-xs text-muted-foreground">🏆 {p.topTrophies.join(" · ")}</p>
      )}
    </div>
  );
}
