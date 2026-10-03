import {
  ref,
  set,
  get,
  update,
  remove,
  onValue,
  type Unsubscribe,
} from "firebase/database";
import { db } from "@/lib/firebase";
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
};

export const initialOnlineState = (): OnlineGameState => ({
  pieces: createPieces(),
  turn: 1,
  dice: null,
  points: 0,
  moveCount: 0,
  reached: { 1: 0, 2: 0 },
  winner: null,
});

const roomRef = (code: string) => ref(db, `rooms/${code}`);

export function generateRoomCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createRoom(
  code: string,
  hostName: string,
  rules: RuleSet,
): Promise<void> {
  const room: Room = {
    status: "waiting",
    rules,
    hostName,
    createdAt: Date.now(),
    state: initialOnlineState(),
  };
  await set(roomRef(code), room);
}

export type JoinResult = "ok" | "not-found" | "full";

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
  await update(roomRef(code), { status: "finished", state });
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
