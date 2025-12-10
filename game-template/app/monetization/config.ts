/**
 * Monetization Configuration
 * Centralized config for ads and IAP
 */

import Constants from 'expo-constants';

export const AdConfig = {
  // AdMob Unit IDs
  bannerId: Constants.expoConfig?.extra?.admobBannerId || 'ca-app-pub-3940256099942544/6300978111',
  interstitialId: Constants.expoConfig?.extra?.admobInterstitialId || 'ca-app-pub-3940256099942544/1033173712',
  appId: Constants.expoConfig?.extra?.admobAppId || 'ca-app-pub-3940256099942544~3347511713',

  // Ad frequency rules
  showAfterLevels: 2, // Show interstitial every 2 levels
  showOnGameOver: true
};

export const IAPConfig = {
  // Product pricing (for display only, real pricing comes from store)
  products: {
    coins_50: { price: '$0.99', coins: 50 },
    coins_100: { price: '$1.99', coins: 100 },
    coins_500: { price: '$4.99', coins: 500 },
    lives_5: { price: '$0.99', lives: 5 }
  }
};
