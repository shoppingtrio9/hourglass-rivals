/**
 * Blocked words for player names. Edit freely — one lowercase entry per item.
 * Matching ignores case, spaces, dots, dashes, underscores and common
 * look-alike digits (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s).
 */
export const BLOCKED_WORDS: string[] = [
  // English
  "fuck", "fuk", "shit", "bitch", "bastard", "asshole", "dick", "cock", "pussy",
  "cunt", "whore", "slut", "nigger", "nigga", "faggot", "fag", "retard", "rape",
  "porn", "sex", "nazi", "hitler", "wanker", "twat", "motherfucker", "dumbass",
  // Roman Urdu / Hindi
  "chutiya", "chutia", "madarchod", "madarchod", "behenchod", "bhenchod", "bhosdi",
  "bhosdike", "gandu", "gaandu", "harami", "haramzada", "kutta", "kutti", "kamina",
  "kameena", "lund", "lun", "randi", "lauda", "lavda", "loda", "jhaat", "chod",
  "suar", "ullu", "khanzir", "dalla", "gashti", "bharwa",
];
