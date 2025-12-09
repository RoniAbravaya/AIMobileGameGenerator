/**
 * Shop Screen
 * In-app purchase screen for coins and lives
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert
} from 'react-native';
import { useGameState } from '../hooks/useGameState';
import { useIAP } from '../hooks/useIAP';

interface ShopScreenProps {
  onClose: () => void;
}

const ShopScreen: React.FC<ShopScreenProps> = ({ onClose }) => {
  const { state, addCoins, addLives } = useGameState();
  const { products, isPurchasing, isInitialized, purchaseCoins, purchaseLives, getProduct } = useIAP();

  const handlePurchaseCoins = async (sku: string) => {
    const result = await purchaseCoins(sku);
    
    if (result.success && result.coins) {
      addCoins(result.coins);
      Alert.alert('Purchase Successful', `You received ${result.coins} coins! 🪙`);
    } else {
      Alert.alert('Purchase Failed', result.error || 'Please try again');
    }
  };

  const handlePurchaseLives = async () => {
    const result = await purchaseLives();
    
    if (result.success && result.lives) {
      addLives(result.lives);
      Alert.alert('Purchase Successful', `You received ${result.lives} lives! ❤️`);
    } else {
      Alert.alert('Purchase Failed', result.error || 'Please try again');
    }
  };

  const formatPrice = (sku: string): string => {
    const product = getProduct(sku);
    return product?.localizedPrice || '$0.99';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Shop</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Current Balance */}
        <View style={styles.balanceContainer}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Coins</Text>
            <Text style={styles.balanceValue}>🪙 {state.coins}</Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Lives</Text>
            <Text style={styles.balanceValue}>❤️ {state.lives}</Text>
          </View>
        </View>

        {/* Coins Section */}
        <Text style={styles.sectionTitle}>Coins</Text>
        
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => handlePurchaseCoins('coins_50')}
          disabled={isPurchasing || !isInitialized}
        >
          <View style={styles.purchaseInfo}>
            <Text style={styles.purchaseTitle}>🪙 50 Coins</Text>
            <Text style={styles.purchaseDescription}>Get 50 coins</Text>
          </View>
          <Text style={styles.purchasePrice}>{formatPrice('coins_50')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.purchaseButton, styles.popularButton]}
          onPress={() => handlePurchaseCoins('coins_100')}
          disabled={isPurchasing || !isInitialized}
        >
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>POPULAR</Text>
          </View>
          <View style={styles.purchaseInfo}>
            <Text style={styles.purchaseTitle}>🪙 100 Coins</Text>
            <Text style={styles.purchaseDescription}>Best value!</Text>
          </View>
          <Text style={styles.purchasePrice}>{formatPrice('coins_100')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={() => handlePurchaseCoins('coins_500')}
          disabled={isPurchasing || !isInitialized}
        >
          <View style={styles.purchaseInfo}>
            <Text style={styles.purchaseTitle}>🪙 500 Coins</Text>
            <Text style={styles.purchaseDescription}>Mega pack</Text>
          </View>
          <Text style={styles.purchasePrice}>{formatPrice('coins_500')}</Text>
        </TouchableOpacity>

        {/* Lives Section */}
        <Text style={styles.sectionTitle}>Lives</Text>
        
        <TouchableOpacity
          style={styles.purchaseButton}
          onPress={handlePurchaseLives}
          disabled={isPurchasing || !isInitialized}
        >
          <View style={styles.purchaseInfo}>
            <Text style={styles.purchaseTitle}>❤️ 5 Lives</Text>
            <Text style={styles.purchaseDescription}>Keep playing!</Text>
          </View>
          <Text style={styles.purchasePrice}>{formatPrice('lives_5')}</Text>
        </TouchableOpacity>

        {!isInitialized && (
          <Text style={styles.loadingText}>Loading shop...</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  },
  scrollContent: {
    padding: 20
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff'
  },
  closeButton: {
    padding: 10
  },
  closeButtonText: {
    fontSize: 30,
    color: '#fff'
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#16213e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30
  },
  balanceItem: {
    alignItems: 'center'
  },
  balanceLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 10
  },
  purchaseButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f3460',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
    position: 'relative'
  },
  popularButton: {
    backgroundColor: '#e94560',
    borderWidth: 2,
    borderColor: '#ffd700'
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#ffd700',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5
  },
  popularText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000'
  },
  purchaseInfo: {
    flex: 1
  },
  purchaseTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  purchaseDescription: {
    fontSize: 14,
    color: '#ccc'
  },
  purchasePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ecca3'
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 20
  }
});

export default ShopScreen;
