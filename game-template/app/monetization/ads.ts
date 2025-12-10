/**
 * AdMob Wrapper
 * Clean API for showing ads throughout the app
 */

import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

let interstitialAd: InterstitialAd | null = null;
let isAdLoaded = false;

const INTERSTITIAL_AD_ID = Constants.expoConfig?.extra?.admobInterstitialId || TestIds.INTERSTITIAL;

/**
 * Initialize ad system
 * Call this once at app startup
 */
export function initializeAds(): void {
  try {
    interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_ID, {
      requestNonPersonalizedAdsOnly: true
    });

    interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
      isAdLoaded = true;
    });

    interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
      isAdLoaded = false;
      // Preload next ad
      interstitialAd?.load();
    });

    interstitialAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Ad error:', error);
      isAdLoaded = false;
    });

    // Load first ad
    interstitialAd.load();
  } catch (error) {
    console.error('Failed to initialize ads:', error);
  }
}

/**
 * Show interstitial ad after level complete
 * Returns true if ad was shown, false otherwise
 */
export async function showInterstitialAfterLevel(): Promise<boolean> {
  if (!interstitialAd || !isAdLoaded) {
    return false;
  }

  try {
    await interstitialAd.show();
    return true;
  } catch (error) {
    console.error('Failed to show interstitial ad:', error);
    return false;
  }
}

/**
 * Show interstitial ad on game over
 */
export async function showInterstitialOnGameOver(): Promise<boolean> {
  // Same as after level for now, but could have different frequency rules
  return showInterstitialAfterLevel();
}

/**
 * Check if ads are ready
 */
export function areAdsReady(): boolean {
  return isAdLoaded;
}
