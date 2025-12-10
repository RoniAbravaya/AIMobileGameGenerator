/**
 * Monetization Tests
 * Tests for ads and IAP functionality
 */

import { IAP_PRODUCTS } from '../app/monetization/iap';
import { AdConfig, IAPConfig } from '../app/monetization/config';

describe('IAP Configuration', () => {
  it('should have 4 product SKUs defined', () => {
    const products = Object.values(IAP_PRODUCTS);
    expect(products).toHaveLength(4);
  });

  it('should have coin products', () => {
    expect(IAP_PRODUCTS.COINS_50).toBe('coins_50');
    expect(IAP_PRODUCTS.COINS_100).toBe('coins_100');
    expect(IAP_PRODUCTS.COINS_500).toBe('coins_500');
  });

  it('should have lives product', () => {
    expect(IAP_PRODUCTS.LIVES_5).toBe('lives_5');
  });

  it('should have pricing info for all products', () => {
    Object.keys(IAP_PRODUCTS).forEach(key => {
      const sku = IAP_PRODUCTS[key as keyof typeof IAP_PRODUCTS];
      const product = IAPConfig.products[sku as keyof typeof IAPConfig.products];
      expect(product).toBeDefined();
      expect(product.price).toBeDefined();
    });
  });

  it('should have correct coin amounts', () => {
    expect(IAPConfig.products.coins_50.coins).toBe(50);
    expect(IAPConfig.products.coins_100.coins).toBe(100);
    expect(IAPConfig.products.coins_500.coins).toBe(500);
  });

  it('should have correct lives amount', () => {
    expect(IAPConfig.products.lives_5.lives).toBe(5);
  });
});

describe('Ad Configuration', () => {
  it('should have ad unit IDs configured', () => {
    expect(AdConfig.bannerId).toBeDefined();
    expect(AdConfig.interstitialId).toBeDefined();
    expect(AdConfig.appId).toBeDefined();
  });

  it('should have ad frequency rules', () => {
    expect(AdConfig.showAfterLevels).toBeDefined();
    expect(AdConfig.showAfterLevels).toBeGreaterThan(0);
    expect(typeof AdConfig.showOnGameOver).toBe('boolean');
  });

  it('should use test IDs as fallback', () => {
    // Test IDs should contain "3940256099942544"
    expect(AdConfig.bannerId).toContain('3940256099942544');
    expect(AdConfig.interstitialId).toContain('3940256099942544');
  });
});
