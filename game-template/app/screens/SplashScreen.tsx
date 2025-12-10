/**
 * Splash Screen
 * First screen shown when app launches
 * Displays game title with themed background (no image dependencies)
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Default colors
const defaultColors = {
  background: '#1a1a2e',
  primary: '#e94560',
  text: '#ffffff'
};

export interface SplashScreenProps {
  gameName: string;
  onComplete: () => void;
  duration?: number; // milliseconds
}

export default function SplashScreen({
  gameName,
  onComplete,
  duration = 2000
}: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  return (
    <View style={[styles.container, { backgroundColor: defaultColors.background }]}>
      {/* Decorative background elements */}
      <View style={styles.backgroundDecor}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      {/* Game title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>{gameName}</Text>
        <Text style={styles.subtitle}>Loading...</Text>
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
  backgroundDecor: {
    position: 'absolute',
    width,
    height,
    top: 0,
    left: 0
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1
  },
  circle1: {
    width: 300,
    height: 300,
    backgroundColor: '#e94560',
    top: -50,
    right: -100
  },
  circle2: {
    width: 200,
    height: 200,
    backgroundColor: '#0f3460',
    bottom: 100,
    left: -50
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: '#16213e',
    top: '40%',
    right: 20
  },
  titleContainer: {
    alignItems: 'center',
    paddingHorizontal: 20
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center'
  }
});
