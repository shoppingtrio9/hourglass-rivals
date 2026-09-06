// Placeholder ad layer.
// These functions simulate ad behavior for now (timed overlays + console logs).
// Later, swap the internals for the real Google AdMob SDK during Capacitor packaging —
// the call sites and callback shapes stay the same.

let sessionMatchesCompleted = 0;

/** Increment the session match counter. Returns true when an interstitial should show (every 2nd match). */
export function recordMatchCompleted(): boolean {
  sessionMatchesCompleted += 1;
  return sessionMatchesCompleted % 2 === 0;
}

export function getSessionMatchesCompleted(): number {
  return sessionMatchesCompleted;
}

/**
 * Simulates a rewarded ad: "plays" for 2s, then grants the reward.
 * AdMob equivalent: RewardedAd.load + show, onUserEarnedReward -> onReward.
 */
export function showRewardedAd(onReward: () => void, onDone?: () => void) {
  console.log("[Ads] Rewarded ad playing (placeholder)…");
  window.setTimeout(() => {
    console.log("[Ads] Rewarded ad finished — reward granted");
    onReward();
    onDone?.();
  }, 2000);
}

/**
 * Simulates an interstitial ad: full-screen for 2s, then closes.
 * AdMob equivalent: InterstitialAd.load + show.
 */
export function showInterstitialAd(onDone?: () => void) {
  console.log("[Ads] Interstitial ad playing (placeholder)…");
  window.setTimeout(() => {
    console.log("[Ads] Interstitial ad closed");
    onDone?.();
  }, 2000);
}

/** Whether ads are removed (future in-app purchase). Always false until IAP ships. */
export function areAdsRemoved(): boolean {
  return false;
}
