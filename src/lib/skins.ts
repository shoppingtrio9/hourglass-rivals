export type Skin = {
  id: string;
  name: string;
  color: string;
  glow: string;
  price: number;
};

export const SKINS: Skin[] = [
  { id: "default", name: "Classic Blue", color: "", glow: "", price: 0 },
  { id: "emerald", name: "Emerald", color: "#22c55e", glow: "#86efac", price: 200 },
  { id: "violet", name: "Violet", color: "#a855f7", glow: "#d8b4fe", price: 200 },
  { id: "gold", name: "Gold", color: "#eab308", glow: "#fde047", price: 500 },
  { id: "rose", name: "Rose", color: "#f43f5e", glow: "#fda4af", price: 500 },
  { id: "teal", name: "Teal", color: "#14b8a6", glow: "#5eead4", price: 500 },
  { id: "silver", name: "Silver", color: "#94a3b8", glow: "#cbd5e1", price: 1000 },
];

const UNLOCKED_KEY = "hourglass-unlocked-skins";
const SELECTED_KEY = "hourglass-selected-skin";

export function getUnlockedSkins(): string[] {
  try {
    const raw = window.localStorage.getItem(UNLOCKED_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* ignore */
  }
  return ["default"];
}

function setUnlockedSkins(ids: string[]) {
  try {
    window.localStorage.setItem(UNLOCKED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function isUnlocked(id: string): boolean {
  return getUnlockedSkins().includes(id);
}

export function unlockSkin(id: string) {
  const current = getUnlockedSkins();
  if (!current.includes(id)) {
    setUnlockedSkins([...current, id]);
  }
}

export function getSelectedSkin(): string {
  try {
    return window.localStorage.getItem(SELECTED_KEY) ?? "default";
  } catch {
    return "default";
  }
}

export function selectSkin(id: string) {
  try {
    window.localStorage.setItem(SELECTED_KEY, id);
  } catch {
    /* ignore */
  }
}

export function getSkinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0]!;
}
