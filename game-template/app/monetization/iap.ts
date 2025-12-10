/**
 * In-App Purchase Wrapper
 * Clean API for handling purchases
 * 
 * Note: Uses mocks in development/Expo Go. For production builds, 
 * replace with real react-native-iap implementation.
 */

// Product SKUs
export const IAP_PRODUCTS = {
  COINS_50: 'coins_50',
  COINS_100: 'coins_100',
  COINS_500: 'coins_500',
  LIVES_5: 'lives_5'
} as const;

// IAP is mocked for Expo Go compatibility
const IAP_ENABLED = false;

// Mock Product interface
export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
}

// Mock products for development
const MOCK_PRODUCTS: Product[] = [
  { productId: 'coins_50', title: '50 Coins', description: 'Get 50 coins', price: '0.99', localizedPrice: '$0.99' },
  { productId: 'coins_100', title: '100 Coins', description: 'Get 100 coins', price: '1.99', localizedPrice: '$1.99' },
  { productId: 'coins_500', title: '500 Coins', description: 'Get 500 coins', price: '4.99', localizedPrice: '$4.99' },
  { productId: 'lives_5', title: '5 Lives', description: 'Get 5 extra lives', price: '0.99', localizedPrice: '$0.99' }
];

let isInitialized = false;
let availableProducts: Product[] = MOCK_PRODUCTS;

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
  if (!IAP_ENABLED) {
    console.log('[IAP] Using mock purchases for development');
    isInitialized = true;
    return true;
  }

  // In production builds with react-native-iap:
  // try {
  //   await initConnection();
  //   isInitialized = true;
  //   availableProducts = await getProducts({ skus: Object.values(IAP_PRODUCTS) });
  //   return true;
  // } catch (error) {
  //   console.error('Failed to initialize IAP:', error);
  //   return false;
  // }
  
  return false;
}

/**
 * Clean up IAP connection
 */
export function cleanupIAP(): void {
  // In production: endConnection();
  console.log('[IAP] Cleanup (no-op in development)');
}

/**
 * Purchase coins pack
 */
export async function purchaseCoins(sku: string): Promise<PurchaseResult> {
  if (!isInitialized) {
    return { success: false, error: 'IAP not initialized' };
  }

  if (!IAP_ENABLED) {
    // Mock purchase for development
    console.log(`[IAP] Mock purchase: ${sku}`);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

    let coins = 0;
    if (sku === IAP_PRODUCTS.COINS_50) coins = 50;
    else if (sku === IAP_PRODUCTS.COINS_100) coins = 100;
    else if (sku === IAP_PRODUCTS.COINS_500) coins = 500;

    return {
      success: true,
      productId: sku,
      coins
    };
  }

  // Production code (when react-native-iap is available):
  // try {
  //   await requestPurchase({ sku });
  //   ... determine coins from sku
  //   return { success: true, productId: sku, coins };
  // } catch (error: any) {
  //   return { success: false, error: error.message };
  // }

  return { success: false, error: 'IAP not available' };
}

/**
 * Purchase lives
 */
export async function purchaseLives(): Promise<PurchaseResult> {
  if (!isInitialized) {
    return { success: false, error: 'IAP not initialized' };
  }

  if (!IAP_ENABLED) {
    // Mock purchase for development
    console.log('[IAP] Mock purchase: lives_5');
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay

    return {
      success: true,
      productId: IAP_PRODUCTS.LIVES_5,
      lives: 5
    };
  }

  // Production code (when react-native-iap is available):
  // try {
  //   await requestPurchase({ sku: IAP_PRODUCTS.LIVES_5 });
  //   return { success: true, productId: IAP_PRODUCTS.LIVES_5, lives: 5 };
  // } catch (error: any) {
  //   return { success: false, error: error.message };
  // }

  return { success: false, error: 'IAP not available' };
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
 * No-op in development mode
 */
export async function acknowledgePurchase(purchase: any): Promise<void> {
  if (IAP_ENABLED) {
    // Production code:
    // await finishTransaction({ purchase, isConsumable: true });
  }
  console.log('[IAP] Acknowledge purchase (no-op in development)');
}
