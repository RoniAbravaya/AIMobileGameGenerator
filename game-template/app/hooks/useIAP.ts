/**
 * In-App Purchase integration hook
 * Manages coin and life purchases
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  Product,
  Purchase,
  PurchaseError
} from 'react-native-iap';

// Product SKUs
const PRODUCT_SKUS = [
  'coins_50',
  'coins_100',
  'coins_500',
  'lives_5'
];

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  coins?: number;
  lives?: number;
  error?: string;
}

export const useIAP = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize IAP connection
  useEffect(() => {
    let purchaseUpdateSubscription: any;
    let purchaseErrorSubscription: any;

    const initIAP = async () => {
      try {
        await initConnection();
        setIsInitialized(true);

        // Get available products
        const productList = await getProducts({ skus: PRODUCT_SKUS });
        setProducts(productList);

        // Listen for purchase updates
        purchaseUpdateSubscription = purchaseUpdatedListener(
          async (purchase: Purchase) => {
            const receipt = purchase.transactionReceipt;
            if (receipt) {
              try {
                // Acknowledge the purchase
                await finishTransaction({ purchase, isConsumable: true });
                setIsPurchasing(false);
              } catch (error) {
                console.error('Failed to finish transaction:', error);
              }
            }
          }
        );

        // Listen for purchase errors
        purchaseErrorSubscription = purchaseErrorListener(
          (error: PurchaseError) => {
            console.error('Purchase error:', error);
            setIsPurchasing(false);
          }
        );
      } catch (error) {
        console.error('Failed to initialize IAP:', error);
        setIsInitialized(false);
      }
    };

    initIAP();

    return () => {
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }
      endConnection();
    };
  }, []);

  // Purchase coins
  const purchaseCoins = useCallback(async (sku: string): Promise<PurchaseResult> => {
    if (!isInitialized) {
      return { success: false, error: 'IAP not initialized' };
    }

    setIsPurchasing(true);

    try {
      await requestPurchase({ sku });

      // Determine coins based on SKU
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
    } catch (error: any) {
      setIsPurchasing(false);
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }, [isInitialized]);

  // Purchase lives
  const purchaseLives = useCallback(async (): Promise<PurchaseResult> => {
    if (!isInitialized) {
      return { success: false, error: 'IAP not initialized' };
    }

    setIsPurchasing(true);

    try {
      await requestPurchase({ sku: 'lives_5' });

      setIsPurchasing(false);

      return {
        success: true,
        productId: 'lives_5',
        lives: 5
      };
    } catch (error: any) {
      setIsPurchasing(false);
      return {
        success: false,
        error: error.message || 'Purchase failed'
      };
    }
  }, [isInitialized]);

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
