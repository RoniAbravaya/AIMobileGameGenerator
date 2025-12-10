/**
 * Level Select Screen
 * Displays all 10 levels (3 playable, 7 coming soon)
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { ThemedText, ThemedLevelBadge, ThemedButton } from '../components/ThemedUI';
import { colors, spacing } from '../theme/generatedTheme';

const { width } = Dimensions.get('window');

export interface Level {
  number: number;
  name: string;
  locked: boolean;
  comingSoon: boolean;
}

export interface LevelSelectScreenProps {
  levels: Level[];
  onSelectLevel: (levelNumber: number) => void;
  onBack: () => void;
}

export default function LevelSelectScreen({
  levels,
  onSelectLevel,
  onBack
}: LevelSelectScreenProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedButton
          title="← Back"
          variant="secondary"
          size="small"
          onPress={onBack}
          style={styles.backButton}
        />
        <ThemedText variant="heading" bold>
          Select Level
        </ThemedText>
      </View>

      {/* Level grid */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.levelGrid}>
          {levels.map((level) => (
            <View key={level.number} style={styles.levelItem}>
              <ThemedLevelBadge
                level={level.number}
                locked={level.locked}
                comingSoon={level.comingSoon}
                onPress={() => {
                  if (!level.locked && !level.comingSoon) {
                    onSelectLevel(level.number);
                  }
                }}
              />
              <ThemedText
                variant="caption"
                align="center"
                color={level.locked || level.comingSoon ? colors.textSecondary : colors.text}
                style={styles.levelName}
              >
                {level.name}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    paddingTop: spacing('large'),
    paddingBottom: spacing('medium'),
    paddingHorizontal: spacing('medium'),
    alignItems: 'center'
  },
  backButton: {
    position: 'absolute',
    left: spacing('medium'),
    top: spacing('large')
  },
  scrollContent: {
    paddingHorizontal: spacing('medium'),
    paddingBottom: spacing('large')
  },
  levelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: spacing('large')
  },
  levelItem: {
    alignItems: 'center',
    width: (width - spacing('medium') * 2 - spacing('large') * 2) / 3,
    marginBottom: spacing('medium')
  },
  levelName: {
    marginTop: spacing('tiny'),
    width: '100%'
  }
});
