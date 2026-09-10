import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

// Real AdMob ad unit IDs
const REWARDED_AD_ID = 'ca-app-pub-3352766356702846/6371562061';
const INTERSTITIAL_AD_ID = 'ca-app-pub-3352766356702846/5873220267';
const BANNER_AD_ID = 'ca-app-pub-3352766356702846/9017906706';

let admobInitialized = false;

export async function initAds() {
  if (admobInitialized) return;
  await AdMob.initialize();
  admobInitialized = true;
}

let sessionMatchesCompleted = 0;

export function recordMatchCompleted(): boolean {
  sessionMatchesCompleted += 1;
  return sessionMatchesCompleted % 2 === 0;
}

export function getSessionMatchesCompleted(): number {
  return sessionMatchesCompleted;
}

export async function showRewardedAd(onReward: () => void, onDone?: () => void) {
  try {
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID });
    const result = await AdMob.showRewardVideoAd();
    if (result) {
      onReward();
    }
  } catch (e) {
    console.log('[Ads] Rewarded ad failed', e);
  } finally {
    onDone?.();
  }
}

export async function showInterstitialAd(onDone?: () => void) {
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID });
    await AdMob.showInterstitial();
  } catch (e) {
    console.log('[Ads] Interstitial ad failed', e);
  } finally {
    onDone?.();
  }
}

export async function showBannerAd() {
  try {
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
    });
  } catch (e) {
    console.log('[Ads] Banner ad failed', e);
  }
}

export async function hideBannerAd() {
  try {
    await AdMob.hideBanner();
  } catch (e) {
    console.log('[Ads] Hide banner failed', e);
  }
}

export function areAdsRemoved(): boolean {
  return false;
}
