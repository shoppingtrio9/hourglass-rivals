const COINS_KEY = "hourglass-coins";
const GEMS_KEY = "hourglass-gems";
const DAILY_KEY = "hourglass-daily-reward-time";

const STARTING_BALANCE = 100;
const STARTING_GEMS = 10;
const DAILY_REWARD_AMOUNT = 50;
const AD_REWARD_AMOUNT = 25;
const AD_GEM_REWARD_AMOUNT = 2;
const WIN_REWARD_AMOUNT = 10;
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const GEM_TO_COIN_RATE = 10;
export const LUCKY_SHOT_GEM_COST = 20;
export const LUCKY_SHOT_COIN_REWARD = 200;

const LUCKY_MATCH_KEY = "hourglass-lucky-match-time";
const LUCKY_MATCH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function msUntilNextLuckyMatch(): number {
  try {
    const raw = window.localStorage.getItem(LUCKY_MATCH_KEY);
    if (!raw) return 0;
    const last = parseInt(raw, 10);
    const elapsed = Date.now() - last;
    return Math.max(0, LUCKY_MATCH_COOLDOWN_MS - elapsed);
  } catch {
    return 0;
  }
}

export function canPlayLuckyMatch(): boolean {
  return msUntilNextLuckyMatch() <= 0;
}

export function recordLuckyMatchPlayed() {
  try {
    window.localStorage.setItem(LUCKY_MATCH_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export type LuckyReward = { type: "coins" | "gems"; amount: number };

const LUCKY_REWARD_POOL: LuckyReward[] = [
  { type: "coins", amount: 100 },
  { type: "coins", amount: 250 },
  { type: "coins", amount: 500 },
  { type: "coins", amount: 1000 },
  { type: "gems", amount: 5 },
  { type: "gems", amount: 10 },
  { type: "gems", amount: 20 },
];

export function rollLuckyReward(): LuckyReward {
  const reward = LUCKY_REWARD_POOL[Math.floor(Math.random() * LUCKY_REWARD_POOL.length)];
  if (reward.type === "coins") addCoins(reward.amount);
  else addGems(reward.amount);
  return reward;
}

export const STAKE_OPTIONS = [100, 500, 1000, 10000, 50000, 100000, 500000];

export function getCoins(): number {
  try {
    const raw = window.localStorage.getItem(COINS_KEY);
    if (raw !== null) return parseInt(raw, 10) || 0;
  } catch {
    /* ignore */
  }
  setCoins(STARTING_BALANCE);
  return STARTING_BALANCE;
}

function setCoins(amount: number) {
  try {
    window.localStorage.setItem(COINS_KEY, String(Math.max(0, Math.floor(amount))));
  } catch {
    /* ignore */
  }
}

export function addCoins(amount: number): number {
  const next = getCoins() + amount;
  setCoins(next);
  return next;
}

export function spendCoins(amount: number): boolean {
  const current = getCoins();
  if (current < amount) return false;
  setCoins(current - amount);
  return true;
}

export function canAfford(amount: number): boolean {
  return getCoins() >= amount;
}

export function getGems(): number {
  try {
    const raw = window.localStorage.getItem(GEMS_KEY);
    if (raw !== null) return parseInt(raw, 10) || 0;
  } catch {
    /* ignore */
  }
  setGems(STARTING_GEMS);
  return STARTING_GEMS;
}

function setGems(amount: number) {
  try {
    window.localStorage.setItem(GEMS_KEY, String(Math.max(0, Math.floor(amount))));
  } catch {
    /* ignore */
  }
}

export function addGems(amount: number): number {
  const next = getGems() + amount;
  setGems(next);
  return next;
}

export function spendGems(amount: number): boolean {
  const current = getGems();
  if (current < amount) return false;
  setGems(current - amount);
  return true;
}

/** Cost in gems to place a coin-equivalent stake, e.g. 200 coin stake = 20 gems. */
export function gemCostForStake(coinStake: number): number {
  return Math.ceil(coinStake / GEM_TO_COIN_RATE);
}

export function rewardForWin(): number {
  addCoins(WIN_REWARD_AMOUNT);
  return WIN_REWARD_AMOUNT;
}

export function rewardForAd(): number {
  addCoins(AD_REWARD_AMOUNT);
  return AD_REWARD_AMOUNT;
}

export function rewardGemsForAd(): number {
  addGems(AD_GEM_REWARD_AMOUNT);
  return AD_GEM_REWARD_AMOUNT;
}

export function msUntilNextDaily(): number {
  try {
    const raw = window.localStorage.getItem(DAILY_KEY);
    if (!raw) return 0;
    const last = parseInt(raw, 10);
    const elapsed = Date.now() - last;
    return Math.max(0, DAILY_COOLDOWN_MS - elapsed);
  } catch {
    return 0;
  }
}

export function canClaimDaily(): boolean {
  return msUntilNextDaily() <= 0;
}

export function claimDaily(): number {
  if (!canClaimDaily()) return 0;
  try {
    window.localStorage.setItem(DAILY_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  addCoins(DAILY_REWARD_AMOUNT);
  return DAILY_REWARD_AMOUNT;
}

export function placeStake(amount: number): boolean {
  return spendCoins(amount);
}

export function placeStakeWithGems(coinStake: number): boolean {
  return spendGems(gemCostForStake(coinStake));
}

export function payoutWin(stake: number): number {
  const payout = stake * 2;
  addCoins(payout);
  return payout;
}

export const COIN_AMOUNTS = {
  starting: STARTING_BALANCE,
  daily: DAILY_REWARD_AMOUNT,
  ad: AD_REWARD_AMOUNT,
  adGems: AD_GEM_REWARD_AMOUNT,
  win: WIN_REWARD_AMOUNT,
};
