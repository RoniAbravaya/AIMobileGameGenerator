/**
 * Main App Entry Point
 * Manages navigation between menu, game, and shop screens
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MenuScreen from './screens/MenuScreen';
import GameScreen from './screens/GameScreen';
import ShopScreen from './screens/ShopScreen';
import { useGameState } from './hooks/useGameState';

type Screen = 'menu' | 'game' | 'shop';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('menu');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const { loadState, startLevel } = useGameState();

  // Load saved state on mount
  useEffect(() => {
    loadState();
  }, []);

  const handleStartLevel = (levelId: number) => {
    setSelectedLevel(levelId);
    startLevel(levelId);
    setCurrentScreen('game');
  };

  const handleLevelComplete = () => {
    setCurrentScreen('menu');
  };

  const handleGameOver = () => {
    setCurrentScreen('menu');
  };

  const handleExitGame = () => {
    setCurrentScreen('menu');
  };

  const handleOpenShop = () => {
    setCurrentScreen('shop');
  };

  const handleCloseShop = () => {
    setCurrentScreen('menu');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {currentScreen === 'menu' && (
        <MenuScreen
          onStartLevel={handleStartLevel}
          onOpenShop={handleOpenShop}
        />
      )}

      {currentScreen === 'game' && (
        <GameScreen
          levelId={selectedLevel}
          onLevelComplete={handleLevelComplete}
          onGameOver={handleGameOver}
          onExit={handleExitGame}
        />
      )}

      {currentScreen === 'shop' && (
        <ShopScreen onClose={handleCloseShop} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e'
  }
});
