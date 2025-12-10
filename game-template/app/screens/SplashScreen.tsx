/**
 * Splash Screen
 * First screen shown when app launches
 * Displays AI-generated splash image and game title
 */

import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '../components/ThemedUI';
import { colors } from '../theme/generatedTheme';

const { width, height } = Dimensions.get('window');

export interface SplashScreenProps {
  gameName: string;
  onComplete: () => void;
  splashImagePath?: string;
  duration?: number; // milliseconds
}

export default function SplashScreen({
  gameName,
  onComplete,
  splashImagePath = require('../assets/splash.png'),
  duration = 2000
}: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* AI-generated splash image */}
      <Image
        source={splashImagePath}
        style={styles.splashImage}
        resizeMode="cover"
      />

      {/* Gradient overlay for text readability */}
      <View style={styles.overlay} />

      {/* Game title */}
      <View style={styles.titleContainer}>
        <ThemedText variant="title" bold align="center">
          {gameName}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashImage: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0
  },
  overlay: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)'
  },
  titleContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20
  }
});
