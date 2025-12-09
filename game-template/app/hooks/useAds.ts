/**
 * AdMob integration hook
 * Manages banner and interstitial ads
 * Note: Ads are disabled in development/Expo Go - they only work in production builds
 */

import { useState, useCallback } from 'react';

// Ads are disabled by default - enable in production builds with native modules
const ADS_ENABLED = false;

export const useAds = () => {
  const [interstitialLoaded] = useState(false);

  // Show interstitial ad (no-op in development)
  const showInterstitial = useCallback(async (): Promise<boolean> => {
    if (!ADS_ENABLED) {
      console.log('[Ads] Interstitial ads disabled in development mode');
      return false;
    }
    return false;
  }, []);

  return {
    showInterstitial,
    interstitialLoaded
  };
};
