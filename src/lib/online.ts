import {
  ref,
  set,
  push,
  get,
  update,
  remove,
  onValue,
  onDisconnect,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { db } from "@/lib/firebase";
import { spendCoins, payoutWin } from "@/lib/coins";
import { ONLINE_STAKES_ENABLED } from "@/lib/features";
import { createPieces, type Piece, type Player, type RuleSet } from "@/lib/game";

/** Serializable match state shared between both players via Firebase. */
export type OnlineGameState = {
  pieces: Piece[];
  turn: Player;
  dice: number | null;
  points: number;
  moveCount: number;
  reached: Record<Player, number>;
  winner: Player | null;
};

export type RoomStatus = "waiting" | "active" | "finished" | "left";

export type Room = {
  status: RoomStatus;
  rules: RuleSet;
  hostName: string;
  guestName?: string;
  /** Which player left, when status === "left". */
  leftBy?: Player;
  createdAt: number;
  state: OnlineGameState;
  /** Coin stake per player (0 = free room). */
  stake?: number;
  /** Match counter; increments on every rematch. */
  round?: number;
  /** True once the current round's result has been settled. */
  settled?: boolean;
  /** Rematch requests for the next round. */
  rematch?: Partial<Record<Player, boolean>>;
  /** Public, non-sensitive profile each player shares with the opponent. */
  profiles?: Partial<Record<Player, PublicProfile>>;
  /** Presence per player: online flag + heartbeat. */
  presence?: Partial<Record<Player, { online?: boolean; lastSeen?: number }>>;
  /** Latest quick emote per player. */
  emotes?: Partial<Record<Player, { id: string; t: number }>>;
};

export type PublicProfile = {
  name: string;
  skinId: string;
  skinName: string;
  skinColor: string;
  skinGlow: string;
  frameName: string;
  frameColor: string;
  title: string | null;
  trophies: number;
  topTrophies: string[];
  totalWins: number;
  totalGames: number;
  bestWinStreak: number;
};

/** Seconds we wait for a disconnected player before declaring a forfeit. */
export const RECONNECT_GRACE_SECONDS = 45;
/** Heartbeat interval; a player whose heartbeat stops this long is treated as offline. */
export const HEARTBEAT_MS = 5000;
export const HEARTBEAT_STALE_MS = 15000;

export async function writeProfile(code: string, player: Player, profile: PublicProfile): Promise<void> {
  await update(roomRef(code), { [`profiles/${player}`]: profile });
}

/**
 * Presence: marks this player online while connected, and lets Firebase flip
 * it to offline if the connection drops. Also reports our own connection state.
 */
export function trackPresence(
  code: string,
  player: Player,
  onConnectionChange: (connected: boolean) => void,
): () => void {
  const presRef = ref(db, `rooms/${code}/presence/${player}`);
  const unsub = onValue(ref(db, ".info/connected"), (snap) => {
    const connected = snap.val() === true;
    onConnectionChange(connected);
    if (!connected) return;
    void onDisconnect(presRef)
      .set({ online: false, lastSeen: serverTimestamp() })
      .then(() => set(presRef, { online: true, lastSeen: serverTimestamp() }))
      .catch(() => {});
  });
  const beat = window.setInterval(() => {
    void update(presRef, { online: true, lastSeen: serverTimestamp() }).catch(() => {});
  }, HEARTBEAT_MS);
  return () => {
    unsub();
    window.clearInterval(beat);
    void onDisconnect(presRef).cancel().catch(() => {});
  };
}

export const initialOnlineState = (): OnlineGameState => ({
  pieces: createPieces(),
  turn: 1,
  dice: null,
  points: 0,
  moveCount: 0,
  reached: { 1: 0, 2: 0 },
  winner: null,
});

/**
 * Firebase drops null values and empty arrays, and turns {1:x,2:y} into
 * arrays. Normalize so both devices compare/use identical shapes.
 */
export function normalizeOnlineState(raw: Partial<OnlineGameState> | null | undefined): OnlineGameState {
  const r = raw ?? {};
  const reachedRaw = (r.reached ?? {}) as Record<number, number | undefined>;
  const piecesRaw = (r.pieces ?? []) as unknown;
  const pieces = (Array.isArray(piecesRaw) ? piecesRaw : Object.values(piecesRaw as object))
    .filter(Boolean)
    .map((p: Piece) => ({
      id: p.id,
      player: p.player,
      row: p.row,
      col: p.col,
      startRow: p.startRow,
      startCol: p.startCol,
      home: !!p.home,
    }));
  return {
    pieces,
    turn: r.turn === 2 ? 2 : 1,
    dice: typeof r.dice === "number" ? r.dice : null,
    points: r.points ?? 0,
    moveCount: r.moveCount ?? 0,
    reached: { 1: reachedRaw[1] ?? 0, 2: reachedRaw[2] ?? 0 },
    winner: r.winner === 1 || r.winner === 2 ? r.winner : null,
  };
}

const roomRef = (code: string) => ref(db, `rooms/${code}`);

export function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createRoom(
  code: string,
  hostName: string,
  rules: RuleSet,
  stake = 0,
): Promise<void> {
  const room: Room = {
    status: "waiting",
    rules,
    stake,
    round: 1,
    settled: false,
    hostName,
    createdAt: Date.now(),
    state: initialOnlineState(),
  };
  await set(roomRef(code), room);
}

export type JoinResult = "ok" | "not-found" | "full" | "no-coins";

export type RoomPreview = { rules: RuleSet; stake: number; hostName: string };

/** Read a room's rules/stake before joining. */
export async function peekRoom(code: string): Promise<RoomPreview | "not-found" | "full"> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return "not-found";
  const room = snap.val() as Room;
  if (room.status !== "waiting") return "full";
  return { rules: room.rules, stake: room.stake ?? 0, hostName: room.hostName };
}

export async function joinRoom(code: string, guestName: string): Promise<JoinResult> {
  const snap = await get(roomRef(code));
  if (!snap.exists()) return "not-found";
  const room = snap.val() as Room;
  if (room.status !== "waiting") return "full";
  await update(roomRef(code), { status: "active", guestName });
  return "ok";
}

/** Subscribe to a room. Returns the unsubscribe function. */
export function subscribeRoom(
  code: string,
  onChange: (room: Room | null) => void,
): Unsubscribe {
  return onValue(roomRef(code), (snap) => {
    onChange(snap.exists() ? (snap.val() as Room) : null);
  });
}

/** Push a full game-state update (called by the player whose turn it is). */
export async function pushGameState(code: string, state: OnlineGameState): Promise<void> {
  await update(roomRef(code), { state });
}

export async function markRoomFinished(code: string, state: OnlineGameState): Promise<void> {
  await update(roomRef(code), { status: "finished", state, settled: true });
  scheduleRoomCleanup(code);
}

export async function markRoomLeft(code: string, leftBy: Player): Promise<void> {
  try {
    await update(roomRef(code), { status: "left", leftBy });
  } catch {
    /* room may already be gone */
  }
  scheduleRoomCleanup(code);
}

export async function deleteRoom(code: string): Promise<void> {
  try {
    await remove(roomRef(code));
  } catch {
    /* ignore */
  }
}

/** Remove the room after a short delay so the database doesn't fill up. */
export function scheduleRoomCleanup(code: string, delayMs = 30_000): void {
  window.setTimeout(() => {
    void deleteRoom(code);
  }, delayMs);
}

export async function requestRematch(code: string, player: Player): Promise<void> {
  await update(roomRef(code), { [`rematch/${player}`]: true });
}

/** Host starts the next round once both players asked for a rematch. */
export async function startRematch(code: string, nextRound: number): Promise<void> {
  await update(roomRef(code), {
    status: "active",
    round: nextRound,
    settled: false,
    rematch: null,
    state: initialOnlineState(),
  });
}

// Per-device, per-round guards so a refresh/reconnect never double-charges or double-pays.
const guardKey = (kind: string, code: string, round: number) => `hg-online-${kind}-${code}-${round}`;
function once(kind: string, code: string, round: number, fn: () => void): boolean {
  try {
    const k = guardKey(kind, code, round);
    if (window.localStorage.getItem(k)) return false;
    window.localStorage.setItem(k, "1");
  } catch {
    /* ignore */
  }
  fn();
  return true;
}

export function chargeStakeOnce(code: string, round: number, stake: number): void {
  if (!ONLINE_STAKES_ENABLED || stake <= 0) return;
  once("charge", code, round, () => {
    spendCoins(stake);
  });
}

export function payoutStakeOnce(code: string, round: number, stake: number): void {
  if (!ONLINE_STAKES_ENABLED || stake <= 0) return;
  once("payout", code, round, () => payoutWin(stake));
}

// ---- Quick emotes: one tiny node per player, overwritten each time ----
export const EMOTES = [
  { id: "gg", emoji: "🤝", text: "Good game" },
  { id: "wow", emoji: "😮", text: "Wow" },
  { id: "nice", emoji: "👏", text: "Nice move" },
  { id: "oops", emoji: "😅", text: "Oops" },
  { id: "hi", emoji: "👋", text: "Hello" },
  { id: "think", emoji: "🤔", text: "Hmm…" },
  { id: "lol", emoji: "😂", text: "Haha" },
  { id: "luck", emoji: "🍀", text: "Good luck" },
] as const;
export type EmoteId = (typeof EMOTES)[number]["id"];
export const EMOTE_COOLDOWN_MS = 2000;

export async function sendEmote(code: string, player: Player, id: EmoteId): Promise<void> {
  await set(ref(db, `rooms/${code}/emotes/${player}`), { id, t: Date.now() });
}

// ---- Reports ----
export type ReportReason = "offensive-name" | "cheating" | "harassment" | "other";

export async function submitReport(r: {
  roomCode: string;
  reporterName: string;
  reportedName: string;
  reason: ReportReason;
}): Promise<void> {
  await push(ref(db, "reports"), { ...r, createdAt: serverTimestamp() });
}
