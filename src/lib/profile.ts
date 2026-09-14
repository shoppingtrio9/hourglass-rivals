export type Frame = {
  id: string;
  name: string;
  borderColor: string;
  price: number;
};

export const FRAMES: Frame[] = [
  { id: "default", name: "Plain", borderColor: "var(--border)", price: 0 },
  { id: "bronze", name: "Bronze", borderColor: "#b45309", price: 300 },
  { id: "silver", name: "Silver Ring", borderColor: "#94a3b8", price: 600 },
  { id: "gold", name: "Gold Ring", borderColor: "#eab308", price: 1200 },
  { id: "diamond", name: "Diamond", borderColor: "#38bdf8", price: 2500 },
  { id: "royal", name: "Royal Purple", borderColor: "#a855f7", price: 2500 },
];

export type MatchRecord = {
  date: string;
  mode: "local" | "bot";
  rules: "race" | "elimination";
  result: "win" | "loss";
  stake?: number;
  payout?: number;
};

export type Title = {
  id: string;
  name: string;
  requirement: string;
  check: (stats: Stats) => boolean;
};

export type Stats = {
  winStreak: number;
  bestWinStreak: number;
  totalWins: number;
  totalGames: number;
};

export const TITLES: Title[] = [
  { id: "rookie", name: "Rookie", requirement: "Play 5 games", check: (s) => s.totalGames >= 5 },
  { id: "regular", name: "Regular", requirement: "Play 25 games", check: (s) => s.totalGames >= 25 },
  { id: "dedicated", name: "Dedicated", requirement: "Play 100 games", check: (s) => s.totalGames >= 100 },
  { id: "veteran", name: "Veteran", requirement: "Play 500 games", check: (s) => s.totalGames >= 500 },
  { id: "first-blood", name: "First Blood", requirement: "Win your first match", check: (s) => s.totalWins >= 1 },
  { id: "novice", name: "Novice", requirement: "Win 10 matches", check: (s) => s.totalWins >= 10 },
  { id: "skilled", name: "Skilled", requirement: "Win 50 matches", check: (s) => s.totalWins >= 50 },
  { id: "master", name: "Master", requirement: "Win 150 matches", check: (s) => s.totalWins >= 150 },
  { id: "titan", name: "Titan", requirement: "Win 300 matches", check: (s) => s.totalWins >= 300 },
  { id: "rising-star", name: "Rising Star", requirement: "Win 3 in a row", check: (s) => s.bestWinStreak >= 3 },
  { id: "on-fire", name: "On Fire", requirement: "Win 5 in a row", check: (s) => s.bestWinStreak >= 5 },
  { id: "pro", name: "Pro", requirement: "Win 10 in a row", check: (s) => s.bestWinStreak >= 10 },
  { id: "elite", name: "Elite", requirement: "Win 15 in a row", check: (s) => s.bestWinStreak >= 15 },
  { id: "champion", name: "Champion", requirement: "Win 20 in a row", check: (s) => s.bestWinStreak >= 20 },
  { id: "legend", name: "Legend", requirement: "Win 30 in a row", check: (s) => s.bestWinStreak >= 30 },
  { id: "grandmaster", name: "Grandmaster", requirement: "Win 50 in a row", check: (s) => s.bestWinStreak >= 50 },
];

const NAME_KEY = "hourglass-profile-name";
const FRAME_UNLOCKED_KEY = "hourglass-unlocked-frames";
const FRAME_SELECTED_KEY = "hourglass-selected-frame";
const HISTORY_KEY = "hourglass-match-history";
const HISTORY_LIMIT = 20;
const STATS_KEY = "hourglass-stats";

export function getProfileName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "Player";
  } catch {
    return "Player";
  }
}

export function setProfileName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name.trim().slice(0, 16) || "Player");
  } catch {
    /* ignore */
  }
}

export function getUnlockedFrames(): string[] {
  try {
    const raw = window.localStorage.getItem(FRAME_UNLOCKED_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return ["default"];
}

function setUnlockedFrames(ids: string[]) {
  try {
    window.localStorage.setItem(FRAME_UNLOCKED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function unlockFrame(id: string) {
  const current = getUnlockedFrames();
  if (!current.includes(id)) setUnlockedFrames([...current, id]);
}

export function getSelectedFrame(): string {
  try {
    return window.localStorage.getItem(FRAME_SELECTED_KEY) ?? "default";
  } catch {
    return "default";
  }
}

export function selectFrame(id: string) {
  try {
    window.localStorage.setItem(FRAME_SELECTED_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getFrameById(id: string): Frame {
  return FRAMES.find((f) => f.id === id) ?? FRAMES[0];
}

export function getMatchHistory(): MatchRecord[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as MatchRecord[];
  } catch {
    /* ignore */
  }
  return [];
}

export function addMatchRecord(record: MatchRecord) {
  const current = getMatchHistory();
  const next = [record, ...current].slice(0, HISTORY_LIMIT);
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getStats(): Stats {
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw) as Stats;
  } catch {
    /* ignore */
  }
  return { winStreak: 0, bestWinStreak: 0, totalWins: 0, totalGames: 0 };
}

function setStats(stats: Stats) {
  try {
    window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    /* ignore */
  }
}

/** Update streak/win/game stats after a match. Call once per finished match, from the profile owner's perspective. */
export function recordMatchResult(won: boolean): Stats {
  const stats = getStats();
  stats.totalGames += 1;
  if (won) {
    stats.totalWins += 1;
    stats.winStreak += 1;
    stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.winStreak);
  } else {
    stats.winStreak = 0;
  }
  setStats(stats);
  return stats;
}

export function getUnlockedTitles(): Title[] {
  const stats = getStats();
  return TITLES.filter((t) => t.check(stats));
}

/** The highest-tier unlocked title, or null if none yet. */
export function getCurrentTitle(): Title | null {
  const unlocked = getUnlockedTitles();
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
}
