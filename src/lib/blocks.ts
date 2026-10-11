// Locally blocked opponents. There is no stable player ID today, so blocks are
// keyed by the opponent's display name (lowercased).
const KEY = "hourglass-blocked-players";

export function getBlocked(): string[] {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function isBlocked(name: string): boolean {
  return getBlocked().includes(name.trim().toLowerCase());
}

export function blockPlayer(name: string): void {
  const n = name.trim().toLowerCase();
  const list = getBlocked();
  if (list.includes(n)) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...list, n]));
  } catch {
    /* ignore */
  }
}
