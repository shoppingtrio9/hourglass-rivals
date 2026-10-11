import { BLOCKED_WORDS } from "@/lib/blocked-words";

export const NAME_MIN = 3;
export const NAME_MAX = 16;

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

function squash(s: string): string {
  return s
    .toLowerCase()
    .replace(/[013457@$]/g, (c) => LEET[c] ?? c)
    .replace(/[^a-z]/g, "");
}

/** Returns a friendly error message, or null when the name is allowed. */
export function checkName(raw: string): string | null {
  const name = raw.trim();
  if (name.length < NAME_MIN) return `Names need at least ${NAME_MIN} characters.`;
  if (name.length > NAME_MAX) return `Names can be at most ${NAME_MAX} characters.`;
  if (/(https?:|www\.|\.(com|net|org|io|pk|in|me|co)\b)/i.test(name)) return "Please don't put links in your name.";
  if (/\S+@\S+/.test(name)) return "Please don't put an email in your name.";
  if ((name.match(/\d/g) ?? []).length >= 6) return "Please don't put a phone number in your name.";
  const flat = squash(name);
  const words = name.toLowerCase().split(/[^a-z0-9@$]+/).map(squash);
  for (const w of BLOCKED_WORDS) {
    // Short words must match a whole word; longer ones anywhere.
    if (w.length <= 4 ? words.includes(w) : flat.includes(w)) return "That name isn't allowed. Please pick another.";
  }
  return null;
}

/** Name to show for someone else: neutral fallback if it fails the filter. */
export function safeDisplayName(raw: string | undefined | null): string {
  return raw && checkName(raw) === null ? raw.trim() : "Player";
}
