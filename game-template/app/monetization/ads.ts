/**
 * AdMob Wrapper
 * Clean API for showing ads throughout the app
 * 
 * Note: Uses mocks in development/Expo Go. For production builds,
 * uncomment the react-native-google-mobile-ads imports and logic.
 */

// import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

// Ads are disabled in Expo Go - enable in production builds
const ADS_ENABLED = false;

let interstitialAd: any | null = null;
let isAdLoaded = false;

const INTERSTITIAL_AD_ID = Constants.expoConfig?.extra?.admobInterstitialId || 'ca-app-pub-3940256099942544/1033173712';

/**
 * Initialize ad system
 * Call this once at app startup
 */
export function initializeAds(): void {
  if (!ADS_ENABLED) {
    console.log('[Ads] Using mock ads for development (Expo Go)');
    isAdLoaded = true; // Pretend ads are always loaded in dev
    return;
  }

  // Production code (when react-native-google-mobile-ads is available):
  // try {
  //   interstitialAd = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_ID, {
  //     requestNonPersonalizedAdsOnly: true
  //   });
  //   interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
  //     isAdLoaded = true;
  //   });
  //   interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
  //     isAdLoaded = false;
  //     interstitialAd?.load();
  //   });
  //   interstitialAd.load();
  // } catch (error) {
  //   console.error('Failed to initialize ads:', error);
  // }
}

/**
 * Show interstitial ad after level complete
 * Returns true if ad was shown, false otherwise
 */
export async function showInterstitialAfterLevel(): Promise<boolean> {
  if (!ADS_ENABLED) {
    console.log('[Ads] Interstitial ad (mock - not shown in Expo Go)');
    return false;
  }

  // Production code:
  // if (interstitialAd && isAdLoaded) {
  //   try {
  //     await interstitialAd.show();
  //     return true;
  //   } catch (error) {
  //     console.error('Failed to show interstitial ad:', error);
  //     return false;
  //   }
  // }
  
  return false;
}

/**
 * Show interstitial ad on game over
 */
export async function showInterstitialOnGameOver(): Promise<boolean> {
  if (!ADS_ENABLED) {
    console.log('[Ads] Game over ad (mock - not shown in Expo Go)');
    return false;
  }
  
  // Same as after level for now, but could have different frequency rules
  return showInterstitialAfterLevel();
}

/**
 * Check if ads are ready
 */
export function areAdsReady(): boolean {
  return isAdLoaded;
}
