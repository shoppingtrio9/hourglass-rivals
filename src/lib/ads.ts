import {
  AdMob,
  AdmobConsentStatus,
  BannerAdPluginEvents,
  BannerAdPosition,
  BannerAdSize,
  RewardAdPluginEvents,
  InterstitialAdPluginEvents,
} from '@capacitor-community/admob';

// Real AdMob ad unit IDs — used ONLY in production builds.
const PROD_REWARDED_AD_ID = 'ca-app-pub-3352766356702846/6371562061';
const PROD_INTERSTITIAL_AD_ID = 'ca-app-pub-3352766356702846/5873220267';
const PROD_BANNER_AD_ID = 'ca-app-pub-3352766356702846/9017906706';

// Google's official Android test ad unit IDs — used in development builds.
const TEST_REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917';
const TEST_INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712';
const TEST_BANNER_AD_ID = 'ca-app-pub-3940256099942544/6300978111';

const IS_PROD = import.meta.env.PROD;
const REWARDED_AD_ID = IS_PROD ? PROD_REWARDED_AD_ID : TEST_REWARDED_AD_ID;
const INTERSTITIAL_AD_ID = IS_PROD ? PROD_INTERSTITIAL_AD_ID : TEST_INTERSTITIAL_AD_ID;
const BANNER_AD_ID = IS_PROD ? PROD_BANNER_AD_ID : TEST_BANNER_AD_ID;

type AdErr = { code?: number; message?: string } | unknown;
function errInfo(e: AdErr): string {
  const o = (e ?? {}) as { code?: number; message?: string };
  return `code=${o.code ?? 'n/a'} message=${o.message ?? String(e)}`;
}
const log = (...args: unknown[]) => console.log('[Ads]', ...args);

let initPromise: Promise<boolean> | null = null;
let bannerShown = false;
let bannerWanted = false;

/** Init AdMob + UMP consent once. Resolves true when ads may be requested. */
export function initAds(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await AdMob.initialize({ initializeForTesting: !IS_PROD });
      log(`init done (${IS_PROD ? 'production' : 'test'} ad units)`);
      registerListeners();
    } catch (e) {
      log('init failed', errInfo(e));
      return false;
    }
    try {
      let info = await AdMob.requestConsentInfo();
      log('consent status', info.status, 'formAvailable', info.isConsentFormAvailable);
      if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
        info = await AdMob.showConsentForm();
        log('consent form result', info.status);
      }
      if (info.canRequestAds === false) {
        log('consent: ads cannot be requested yet');
        return false;
      }
    } catch (e) {
      // Consent failures shouldn't block ads where consent isn't required.
      log('consent request failed', errInfo(e));
    }
    return true;
  })();
  return initPromise;
}

function registerListeners() {
  try {
    void AdMob.addListener(BannerAdPluginEvents.Loaded, () => log('banner loaded'));
    void AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (e) => {
      bannerShown = false;
      log('banner failed', errInfo(e));
    });
    void AdMob.addListener(RewardAdPluginEvents.Loaded, () => log('reward ad loaded'));
    void AdMob.addListener(RewardAdPluginEvents.FailedToLoad, (e) => log('reward ad failed to load', errInfo(e)));
    void AdMob.addListener(RewardAdPluginEvents.FailedToShow, (e) => log('reward ad failed to show', errInfo(e)));
    void AdMob.addListener(RewardAdPluginEvents.Rewarded, (r) => log('reward ad rewarded', r));
    void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => log('reward ad dismissed'));
    void AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => log('interstitial loaded'));
    void AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (e) => log('interstitial failed to load', errInfo(e)));
    void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, (e) => log('interstitial failed to show', errInfo(e)));
  } catch (e) {
    log('listener setup failed', errInfo(e));
  }
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
    if (!(await initAds())) {
      log('reward ad skipped: ads not ready');
      return;
    }
    await AdMob.prepareRewardVideoAd({ adId: REWARDED_AD_ID });
    const result = await AdMob.showRewardVideoAd();
    if (result) {
      try {
        onReward();
      } catch (e) {
        log('reward callback error', errInfo(e));
      }
    }
  } catch (e) {
    log('reward ad failed', errInfo(e));
  } finally {
    onDone?.();
  }
}

export async function showInterstitialAd(onDone?: () => void) {
  try {
    if (!(await initAds())) {
      log('interstitial skipped: ads not ready');
      return;
    }
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID });
    await AdMob.showInterstitial();
  } catch (e) {
    log('interstitial failed', errInfo(e));
  } finally {
    onDone?.();
  }
}

export async function showBannerAd() {
  bannerWanted = true;
  try {
    if (!(await initAds())) return;
    if (!bannerWanted || bannerShown) return; // hidden again while waiting, or already up
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
    });
    bannerShown = true;
  } catch (e) {
    log('banner show failed', errInfo(e));
  }
}

export async function hideBannerAd() {
  bannerWanted = false;
  if (!bannerShown) return;
  try {
    await AdMob.hideBanner();
    bannerShown = false;
  } catch (e) {
    log('hide banner failed', errInfo(e));
  }
}

export function areAdsRemoved(): boolean {
  return false;
}
