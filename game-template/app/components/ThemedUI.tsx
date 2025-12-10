/**
 * Themed UI Components
 * 
 * Reusable UI components that automatically use the generated theme.
 * All generated games use these components for consistent styling.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, typography, layout, spacing, borderRadius, fontSize } from '../theme/generatedTheme';

/**
 * Themed Button
 */
export interface ThemedButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: ViewStyle;
}

export function ThemedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style
}: ThemedButtonProps) {
  const buttonColors = {
    primary: colors.primary,
    secondary: colors.secondary,
    danger: colors.danger,
    success: colors.success
  };

  const sizes = {
    small: { paddingVertical: spacing('small'), paddingHorizontal: spacing('medium'), fontSize: fontSize('small') },
    medium: { paddingVertical: spacing('medium'), paddingHorizontal: spacing('large'), fontSize: fontSize('medium') },
    large: { paddingVertical: spacing('large'), paddingHorizontal: spacing('huge'), fontSize: fontSize('large') }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.textSecondary : buttonColors[variant],
          paddingVertical: sizes[size].paddingVertical,
          paddingHorizontal: sizes[size].paddingHorizontal,
          borderRadius: borderRadius('medium')
        },
        style
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.buttonText,
          {
            fontSize: sizes[size].fontSize,
            fontFamily: typography.fontFamilyBold,
            color: colors.text
          }
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Themed Text
 */
export interface ThemedTextProps {
  children: React.ReactNode;
  variant?: 'title' | 'heading' | 'body' | 'caption';
  color?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  style?: TextStyle;
}

export function ThemedText({
  children,
  variant = 'body',
  color = colors.text,
  align = 'left',
  bold = false,
  style
}: ThemedTextProps) {
  const variants = {
    title: { fontSize: fontSize('title'), fontWeight: typography.fontWeight.black },
    heading: { fontSize: fontSize('huge'), fontWeight: typography.fontWeight.bold },
    body: { fontSize: fontSize('medium'), fontWeight: typography.fontWeight.normal },
    caption: { fontSize: fontSize('small'), fontWeight: typography.fontWeight.normal }
  };

  return (
    <Text
      style={[
        {
          color,
          textAlign: align,
          fontFamily: bold ? typography.fontFamilyBold : typography.fontFamily,
          ...variants[variant]
        },
        style
      ]}
    >
      {children}
    </Text>
  );
}

/**
 * Themed Card
 */
export interface ThemedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  style?: ViewStyle;
}

export function ThemedCard({
  children,
  variant = 'default',
  style
}: ThemedCardProps) {
  const variants = {
    default: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: borderRadius('medium'),
      padding: spacing('medium')
    },
    elevated: {
      backgroundColor: colors.backgroundAlt,
      borderRadius: borderRadius('medium'),
      padding: spacing('medium'),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5
    },
    outlined: {
      backgroundColor: 'transparent',
      borderRadius: borderRadius('medium'),
      padding: spacing('medium'),
      borderWidth: 2,
      borderColor: colors.primary
    }
  };

  return (
    <View style={[variants[variant], style]}>
      {children}
    </View>
  );
}

/**
 * Themed Score Display
 */
export interface ThemedScoreProps {
  label: string;
  value: number | string;
  variant?: 'large' | 'small';
  style?: ViewStyle;
}

export function ThemedScore({
  label,
  value,
  variant = 'large',
  style
}: ThemedScoreProps) {
  const isLarge = variant === 'large';

  return (
    <View style={[styles.scoreContainer, style]}>
      <ThemedText
        variant={isLarge ? 'body' : 'caption'}
        color={colors.textSecondary}
        align="center"
      >
        {label}
      </ThemedText>
      <ThemedText
        variant={isLarge ? 'heading' : 'body'}
        bold
        align="center"
        style={{ marginTop: spacing('tiny') }}
      >
        {value}
      </ThemedText>
    </View>
  );
}

/**
 * Themed Progress Bar
 */
export interface ThemedProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
}

export function ThemedProgressBar({
  progress,
  color = colors.primary,
  backgroundColor = colors.backgroundAlt,
  height = 8,
  style
}: ThemedProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(1, progress));

  return (
    <View
      style={[
        styles.progressBarContainer,
        {
          backgroundColor,
          height,
          borderRadius: height / 2
        },
        style
      ]}
    >
      <View
        style={[
          styles.progressBarFill,
          {
            backgroundColor: color,
            width: `${clampedProgress * 100}%`,
            borderRadius: height / 2
          }
        ]}
      />
    </View>
  );
}

/**
 * Themed Modal Overlay
 */
export interface ThemedModalProps {
  visible: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  style?: ViewStyle;
}

export function ThemedModal({
  visible,
  children,
  onClose,
  style
}: ThemedModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity
        style={styles.modalBackdrop}
        onPress={onClose}
        activeOpacity={1}
      />
      <View
        style={[
          styles.modalContent,
          {
            backgroundColor: colors.background,
            borderRadius: borderRadius('large'),
            padding: spacing('large')
          },
          style
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * Themed Icon Button (simple)
 */
export interface ThemedIconButtonProps {
  icon: string; // Simple text icon (emoji or symbol)
  onPress: () => void;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function ThemedIconButton({
  icon,
  onPress,
  size = 40,
  color = colors.primary,
  style
}: ThemedIconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color
        },
        style
      ]}
      activeOpacity={0.8}
    >
      <Text style={[styles.iconButtonText, { fontSize: size * 0.5 }]}>
        {icon}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * Themed Lives Display
 */
export interface ThemedLivesProps {
  lives: number;
  maxLives?: number;
  icon?: string;
  style?: ViewStyle;
}

export function ThemedLives({
  lives,
  maxLives = 3,
  icon = '❤️',
  style
}: ThemedLivesProps) {
  return (
    <View style={[styles.livesContainer, style]}>
      {Array.from({ length: maxLives }).map((_, index) => (
        <Text
          key={index}
          style={[
            styles.lifeIcon,
            { opacity: index < lives ? 1 : 0.3, fontSize: fontSize('large') }
          ]}
        >
          {icon}
        </Text>
      ))}
    </View>
  );
}

/**
 * Themed Level Badge
 */
export interface ThemedLevelBadgeProps {
  level: number;
  locked?: boolean;
  comingSoon?: boolean;
  style?: ViewStyle;
  onPress?: () => void;
}

export function ThemedLevelBadge({
  level,
  locked = false,
  comingSoon = false,
  style,
  onPress
}: ThemedLevelBadgeProps) {
  const badgeSize = 80;

  return (
    <TouchableOpacity
      onPress={locked ? undefined : onPress}
      disabled={locked}
      style={[
        styles.levelBadge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: borderRadius('large'),
          backgroundColor: locked ? colors.backgroundAlt : colors.primary,
          opacity: locked ? 0.5 : 1
        },
        style
      ]}
      activeOpacity={0.8}
    >
      {comingSoon ? (
        <ThemedText variant="caption" align="center" style={{ fontSize: fontSize('tiny') }}>
          Coming{'\n'}Soon
        </ThemedText>
      ) : locked ? (
        <Text style={[styles.levelBadgeText, { fontSize: fontSize('large') }]}>🔒</Text>
      ) : (
        <ThemedText variant="heading" bold align="center">
          {level}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    textAlign: 'center'
  },
  scoreContainer: {
    alignItems: 'center'
  },
  progressBarContainer: {
    overflow: 'hidden'
  },
  progressBarFill: {
    height: '100%'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)'
  },
  modalContent: {
    maxWidth: '90%',
    maxHeight: '80%'
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconButtonText: {
    color: '#FFFFFF'
  },
  livesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  lifeIcon: {
    // fontSize set dynamically
  },
  levelBadge: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  levelBadgeText: {
    // fontSize set dynamically
  }
});
