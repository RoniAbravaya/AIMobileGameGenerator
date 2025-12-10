/**
 * In-App Purchase Wrapper
 * Clean API for handling purchases
 */

import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  finishTransaction,
  Product,
  Purchase
} from 'react-native-iap';

// Product SKUs
export const IAP_PRODUCTS = {
  COINS_50: 'coins_50',
  COINS_100: 'coins_100',
  COINS_500: 'coins_500',
  LIVES_5: 'lives_5'
} as const;

const PRODUCT_SKUS = Object.values(IAP_PRODUCTS);

let isInitialized = false;
let availableProducts: Product[] = [];

export interface PurchaseResult {
  success: boolean;
  productId?: string;
  coins?: number;
  lives?: number;
  error?: string;
}

/**
 * Initialize IAP system
 * Call once at app startup
 */
export async function initializeIAP(): Promise<boolean> {
  try {
    await initConnection();
    isInitialized = true;

    // Load available products
    availableProducts = await getProducts({ skus: PRODUCT_SKUS });
    
    return true;
  } catch (error) {
    console.error('Failed to initialize IAP:', error);
    return false;
  }
}

/**
 * Clean up IAP connection
 */
export function cleanupIAP(): void {
  endConnection();
}

/**
 * Purchase coins pack
 */
export async function purchaseCoins(sku: string): Promise<PurchaseResult> {
  if (!isInitialized) {
    return { success: false, error: 'IAP not initialized' };
  }

  try {
    await requestPurchase({ sku });

    // Determine coins amount
    let coins = 0;
    if (sku === IAP_PRODUCTS.COINS_50) coins = 50;
    else if (sku === IAP_PRODUCTS.COINS_100) coins = 100;
    else if (sku === IAP_PRODUCTS.COINS_500) coins = 500;

    return {
      success: true,
      productId: sku,
      coins
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Purchase failed'
    };
  }
}

/**
 * Purchase lives
 */
export async function purchaseLives(): Promise<PurchaseResult> {
  if (!isInitialized) {
    return { success: false, error: 'IAP not initialized' };
  }

  try {
    await requestPurchase({ sku: IAP_PRODUCTS.LIVES_5 });

    return {
      success: true,
      productId: IAP_PRODUCTS.LIVES_5,
      lives: 5
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Purchase failed'
    };
  }
}

/**
 * Get product info
 */
export function getProductInfo(sku: string): Product | undefined {
  return availableProducts.find(p => p.productId === sku);
}

/**
 * Get all available products
 */
export function getAllProducts(): Product[] {
  return availableProducts;
}

/**
 * Finish a transaction (acknowledge purchase)
 */
export async function acknowledgePurchase(purchase: Purchase): Promise<void> {
  try {
    await finishTransaction({ purchase, isConsumable: true });
  } catch (error) {
    console.error('Failed to finish transaction:', error);
  }
}
