/**
 * AdMob integration hook
 * Manages banner and interstitial ads
 */

import { useState, useEffect, useCallback } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

const INTERSTITIAL_AD_ID = Constants.expoConfig?.extra?.admobInterstitialId || TestIds.INTERSTITIAL;

export const useAds = () => {
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [interstitial, setInterstitial] = useState<InterstitialAd | null>(null);

  // Initialize interstitial ad
  useEffect(() => {
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_ID, {
      requestNonPersonalizedAdsOnly: true
    });

    const unsubscribeLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      setInterstitialLoaded(true);
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      setInterstitialLoaded(false);
      // Preload next ad
      ad.load();
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error) => {
      console.error('Ad error:', error);
      setInterstitialLoaded(false);
    });

    // Load the ad
    ad.load();
    setInterstitial(ad);

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  // Show interstitial ad
  const showInterstitial = useCallback(async (): Promise<boolean> => {
    if (interstitial && interstitialLoaded) {
      try {
        await interstitial.show();
        return true;
      } catch (error) {
        console.error('Failed to show interstitial:', error);
        return false;
      }
    }
    return false;
  }, [interstitial, interstitialLoaded]);

  return {
    showInterstitial,
    interstitialLoaded
  };
};
