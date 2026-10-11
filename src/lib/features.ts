/**
 * Feature flags. Flip to true to restore the full behaviour; all underlying
 * code is kept in place.
 */

/** Online rooms with coin stakes. When false, online matches are free-only. */
export const ONLINE_STAKES_ENABLED = false;

/** In-app purchases (Remove Ads, gem/coin packs). When false, purchase UI is hidden. */
export const IAP_ENABLED = false;

/** Support email used by the "Contact us" button. CHANGE THIS. */
export const SUPPORT_EMAIL = "support@example.com";

/** Hosted privacy policy page. CHANGE THIS (empty = button shows "Coming soon"). */
export const PRIVACY_POLICY_URL = "";

/** App version shown on the Help & Support screen. Keep in sync with android versionName. */
export const APP_VERSION = "1.0.0";
