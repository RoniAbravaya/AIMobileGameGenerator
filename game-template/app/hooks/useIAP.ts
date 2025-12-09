/**
 * In-App Purchase integration hook
 * Manages coin and life purchases
 * Note: IAP is disabled in development/Expo Go - it only works in production builds
 */

import { useState, useCallback } from 'react';

// IAP is disabled by default - enable in production builds with native modules
const IAP_ENABLED = false;

export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
}

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  coins?: number;
  lives?: number;
  error?: string;
}

// Mock products for development
const MOCK_PRODUCTS: Product[] = [
  { productId: 'coins_50', title: '50 Coins', description: 'Get 50 coins', price: '0.99', localizedPrice: '$0.99' },
  { productId: 'coins_100', title: '100 Coins', description: 'Get 100 coins', price: '1.99', localizedPrice: '$1.99' },
  { productId: 'coins_500', title: '500 Coins', description: 'Get 500 coins', price: '4.99', localizedPrice: '$4.99' },
  { productId: 'lives_5', title: '5 Lives', description: 'Get 5 extra lives', price: '0.99', localizedPrice: '$0.99' },
];

export const useIAP = () => {
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isInitialized] = useState(!IAP_ENABLED); // Always "initialized" in dev mode

  // Purchase coins (mock in development)
  const purchaseCoins = useCallback(async (sku: string): Promise<PurchaseResult> => {
    if (!IAP_ENABLED) {
      console.log('[IAP] Purchases disabled in development mode');
      setIsPurchasing(true);
      
      // Simulate purchase delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let coins = 0;
      if (sku === 'coins_50') coins = 50;
      else if (sku === 'coins_100') coins = 100;
      else if (sku === 'coins_500') coins = 500;

      setIsPurchasing(false);
      
      return {
        success: true,
        productId: sku,
        coins
      };
    }

    return { success: false, error: 'IAP not available' };
  }, []);

  // Purchase lives (mock in development)
  const purchaseLives = useCallback(async (): Promise<PurchaseResult> => {
    if (!IAP_ENABLED) {
      console.log('[IAP] Purchases disabled in development mode');
      setIsPurchasing(true);
      
      // Simulate purchase delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsPurchasing(false);
      
      return {
        success: true,
        productId: 'lives_5',
        lives: 5
      };
    }

    return { success: false, error: 'IAP not available' };
  }, []);

  // Get product by SKU
  const getProduct = useCallback((sku: string): Product | undefined => {
    return products.find(p => p.productId === sku);
  }, [products]);

  return {
    products,
    isPurchasing,
    isInitialized,
    purchaseCoins,
    purchaseLives,
    getProduct
  };
};
