/**
 * Theme Generator
 * 
 * Generates unique visual themes for games based on GameSpec.visualTheme
 * Creates color palettes, typography, animations, and layout styles
 */

import { GameSpec } from '../models/GameSpec';

/**
 * Generated theme structure
 */
export interface GeneratedTheme {
  colors: ThemeColors;
  typography: ThemeTypography;
  animations: ThemeAnimations;
  layout: ThemeLayout;
  effects: ThemeEffects;
}

/**
 * Color palette
 */
export interface ThemeColors {
  // Primary colors
  primary: string;
  secondary: string;
  accent: string;
  
  // Background colors
  background: string;
  backgroundAlt: string;
  
  // Entity colors
  player: string;
  obstacle: string;
  collectible: string;
  enemy: string;
  
  // UI colors
  text: string;
  textSecondary: string;
  success: string;
  danger: string;
  warning: string;
  
  // Overlays
  overlay: string;
  overlayDark: string;
}

/**
 * Typography settings
 */
export interface ThemeTypography {
  // Font families
  fontFamily: string;
  fontFamilyBold: string;
  
  // Font sizes
  fontSize: {
    tiny: number;
    small: number;
    medium: number;
    large: number;
    huge: number;
    title: number;
  };
  
  // Font weights
  fontWeight: {
    normal: string;
    bold: string;
    black: string;
  };
  
  // Letter spacing
  letterSpacing: {
    tight: number;
    normal: number;
    wide: number;
  };
}

/**
 * Animation settings
 */
export interface ThemeAnimations {
  // Durations (ms)
  duration: {
    instant: number;
    fast: number;
    normal: number;
    slow: number;
  };
  
  // Easing functions
  easing: {
    default: string;
    sharp: string;
    smooth: string;
    bounce: string;
  };
  
  // Animation styles
  style: {
    transitionSpeed: 'instant' | 'fast' | 'normal' | 'slow';
    preferredEasing: 'default' | 'sharp' | 'smooth' | 'bounce';
  };
}

/**
 * Layout settings
 */
export interface ThemeLayout {
  // Spacing scale
  spacing: {
    tiny: number;
    small: number;
    medium: number;
    large: number;
    huge: number;
  };
  
  // Border radius
  borderRadius: {
    none: number;
    small: number;
    medium: number;
    large: number;
    round: number;
  };
  
  // Shadows
  shadow: {
    none: string;
    small: string;
    medium: string;
    large: string;
  };
}

/**
 * Visual effects
 */
export interface ThemeEffects {
  // Particle settings
  particles: {
    enabled: boolean;
    density: 'low' | 'medium' | 'high';
    colors: string[];
  };
  
  // Screen shake
  screenShake: {
    enabled: boolean;
    intensity: 'subtle' | 'medium' | 'strong';
  };
  
  // Background effects
  background: {
    parallax: boolean;
    gradient: boolean;
    animated: boolean;
  };
}

/**
 * Theme presets based on mood/genre
 */
const THEME_PRESETS = {
  // Moods
  energetic: {
    colors: ['#FF3366', '#FF6B35', '#FFD23F', '#00E5FF', '#7C4DFF'],
    animationSpeed: 'fast',
    particleDensity: 'high',
    screenShake: 'strong'
  },
  calm: {
    colors: ['#A8DADC', '#457B9D', '#1D3557', '#F1FAEE', '#E63946'],
    animationSpeed: 'slow',
    particleDensity: 'low',
    screenShake: 'subtle'
  },
  dark: {
    colors: ['#1A1A1D', '#4E4E50', '#6F2232', '#950740', '#C3073F'],
    animationSpeed: 'normal',
    particleDensity: 'medium',
    screenShake: 'medium'
  },
  neon: {
    colors: ['#00FFF5', '#FF00FF', '#FFFF00', '#FF00AA', '#00FFAA'],
    animationSpeed: 'fast',
    particleDensity: 'high',
    screenShake: 'strong'
  },
  pastel: {
    colors: ['#FFD6E0', '#FFEF9F', '#C1FBA4', '#7BF1A8', '#00DDFF'],
    animationSpeed: 'slow',
    particleDensity: 'low',
    screenShake: 'subtle'
  },
  retro: {
    colors: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'],
    animationSpeed: 'fast',
    particleDensity: 'low',
    screenShake: 'subtle'
  },
  nature: {
    colors: ['#2D6A4F', '#40916C', '#52B788', '#74C69D', '#95D5B2'],
    animationSpeed: 'normal',
    particleDensity: 'medium',
    screenShake: 'subtle'
  },
  space: {
    colors: ['#0B0C10', '#1F2833', '#C5C6C7', '#66FCF1', '#45A29E'],
    animationSpeed: 'slow',
    particleDensity: 'high',
    screenShake: 'subtle'
  },
  fire: {
    colors: ['#FF0000', '#FF4500', '#FF6347', '#FF7F50', '#FFA500'],
    animationSpeed: 'fast',
    particleDensity: 'high',
    screenShake: 'strong'
  },
  ice: {
    colors: ['#E0F7FA', '#B2EBF2', '#80DEEA', '#4DD0E1', '#26C6DA'],
    animationSpeed: 'slow',
    particleDensity: 'medium',
    screenShake: 'subtle'
  }
};

/**
 * Theme Generator
 */
export class ThemeGenerator {
  /**
   * Generate theme from GameSpec
   */
  generateTheme(spec: GameSpec): GeneratedTheme {
    console.log(`[ThemeGenerator] Generating theme for: ${spec.name}`);
    console.log(`[ThemeGenerator] Visual theme: ${JSON.stringify(spec.visualTheme)}`);
    
    const visualTheme = spec.visualTheme;
    
    // Generate color palette
    const colors = this.generateColors(visualTheme);
    
    // Generate typography
    const typography = this.generateTypography(visualTheme);
    
    // Generate animations
    const animations = this.generateAnimations(visualTheme);
    
    // Generate layout
    const layout = this.generateLayout(visualTheme);
    
    // Generate effects
    const effects = this.generateEffects(visualTheme);
    
    return {
      colors,
      typography,
      animations,
      layout,
      effects
    };
  }

  /**
   * Generate color palette from visual theme
   */
  private generateColors(visualTheme: any): ThemeColors {
    const mood = visualTheme.mood?.toLowerCase() || 'energetic';
    const palette = visualTheme.palette || [];
    
    // Get preset colors based on mood
    const preset = THEME_PRESETS[mood as keyof typeof THEME_PRESETS] || THEME_PRESETS.energetic;
    const baseColors = palette.length > 0 ? palette : preset.colors;
    
    // Extract primary colors
    const [primary, secondary, accent, color4, color5] = baseColors;
    
    // Generate background colors (darker versions)
    const background = this.darkenColor(primary, 0.9);
    const backgroundAlt = this.darkenColor(secondary, 0.8);
    
    // Generate entity colors
    const player = accent || primary;
    const obstacle = this.lightenColor(secondary, 0.3);
    const collectible = color4 || this.complementColor(primary);
    const enemy = color5 || this.lightenColor(secondary, 0.5);
    
    // Generate UI colors
    const text = '#FFFFFF';
    const textSecondary = '#CCCCCC';
    const success = '#4CAF50';
    const danger = '#F44336';
    const warning = '#FF9800';
    
    // Generate overlays
    const overlay = 'rgba(0, 0, 0, 0.5)';
    const overlayDark = 'rgba(0, 0, 0, 0.8)';
    
    return {
      primary,
      secondary,
      accent,
      background,
      backgroundAlt,
      player,
      obstacle,
      collectible,
      enemy,
      text,
      textSecondary,
      success,
      danger,
      warning,
      overlay,
      overlayDark
    };
  }

  /**
   * Generate typography from visual theme
   */
  private generateTypography(visualTheme: any): ThemeTypography {
    const style = visualTheme.style?.toLowerCase() || 'modern';
    
    // Font families based on style
    let fontFamily = 'System';
    let fontFamilyBold = 'System';
    
    if (style.includes('retro') || style.includes('pixel')) {
      fontFamily = 'Courier';
      fontFamilyBold = 'Courier-Bold';
    } else if (style.includes('elegant') || style.includes('serif')) {
      fontFamily = 'Georgia';
      fontFamilyBold = 'Georgia-Bold';
    } else if (style.includes('playful') || style.includes('comic')) {
      fontFamily = 'Comic Sans MS';
      fontFamilyBold = 'Comic Sans MS';
    }
    
    return {
      fontFamily,
      fontFamilyBold,
      fontSize: {
        tiny: 10,
        small: 14,
        medium: 18,
        large: 24,
        huge: 36,
        title: 48
      },
      fontWeight: {
        normal: '400',
        bold: '700',
        black: '900'
      },
      letterSpacing: {
        tight: -0.5,
        normal: 0,
        wide: 1.5
      }
    };
  }

  /**
   * Generate animations from visual theme
   */
  private generateAnimations(visualTheme: any): ThemeAnimations {
    const mood = visualTheme.mood?.toLowerCase() || 'energetic';
    
    const preset = THEME_PRESETS[mood as keyof typeof THEME_PRESETS] || THEME_PRESETS.energetic;
    const speed = preset.animationSpeed as 'instant' | 'fast' | 'normal' | 'slow';
    
    // Map speed to easing
    const easingMap = {
      instant: 'default',
      fast: 'sharp',
      normal: 'smooth',
      slow: 'smooth'
    };
    
    const preferredEasing = easingMap[speed] as 'default' | 'sharp' | 'smooth' | 'bounce';
    
    return {
      duration: {
        instant: 100,
        fast: 200,
        normal: 300,
        slow: 500
      },
      easing: {
        default: 'ease',
        sharp: 'ease-in-out',
        smooth: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
      },
      style: {
        transitionSpeed: speed,
        preferredEasing
      }
    };
  }

  /**
   * Generate layout from visual theme
   */
  private generateLayout(visualTheme: any): ThemeLayout {
    const style = visualTheme.style?.toLowerCase() || 'modern';
    
    // Rounded vs sharp borders
    const isRounded = style.includes('modern') || style.includes('smooth') || style.includes('rounded');
    const isSharp = style.includes('sharp') || style.includes('geometric') || style.includes('angular');
    
    return {
      spacing: {
        tiny: 4,
        small: 8,
        medium: 16,
        large: 24,
        huge: 40
      },
      borderRadius: isSharp ? {
        none: 0,
        small: 0,
        medium: 0,
        large: 0,
        round: 0
      } : isRounded ? {
        none: 0,
        small: 8,
        medium: 16,
        large: 24,
        round: 9999
      } : {
        none: 0,
        small: 4,
        medium: 8,
        large: 12,
        round: 9999
      },
      shadow: {
        none: 'none',
        small: '0 2px 4px rgba(0, 0, 0, 0.1)',
        medium: '0 4px 8px rgba(0, 0, 0, 0.2)',
        large: '0 8px 16px rgba(0, 0, 0, 0.3)'
      }
    };
  }

  /**
   * Generate effects from visual theme
   */
  private generateEffects(visualTheme: any): ThemeEffects {
    const mood = visualTheme.mood?.toLowerCase() || 'energetic';
    const preset = THEME_PRESETS[mood as keyof typeof THEME_PRESETS] || THEME_PRESETS.energetic;
    
    // Get particle colors from palette
    const particleColors = visualTheme.palette || preset.colors;
    
    return {
      particles: {
        enabled: preset.particleDensity !== 'low',
        density: preset.particleDensity as 'low' | 'medium' | 'high',
        colors: particleColors.slice(0, 3)
      },
      screenShake: {
        enabled: preset.screenShake !== 'subtle',
        intensity: preset.screenShake as 'subtle' | 'medium' | 'strong'
      },
      background: {
        parallax: mood === 'space' || mood === 'nature',
        gradient: mood !== 'retro',
        animated: mood === 'energetic' || mood === 'neon'
      }
    };
  }

  /**
   * Darken a color
   */
  private darkenColor(hex: string, amount: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    return this.rgbToHex(
      Math.floor(rgb.r * amount),
      Math.floor(rgb.g * amount),
      Math.floor(rgb.b * amount)
    );
  }

  /**
   * Lighten a color
   */
  private lightenColor(hex: string, amount: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    return this.rgbToHex(
      Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * amount)),
      Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * amount)),
      Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * amount))
    );
  }

  /**
   * Get complement color
   */
  private complementColor(hex: string): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    return this.rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /**
   * Convert RGB to hex
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
}

/**
 * Generate theme file content (TypeScript)
 */
export function generateThemeFileContent(theme: GeneratedTheme, gameName: string): string {
  return `/**
 * Generated Theme: ${gameName}
 * Auto-generated visual theme based on GameSpec
 * DO NOT EDIT - This file is regenerated on each game build
 */

export const theme = ${JSON.stringify(theme, null, 2)};

// Convenience accessors
export const colors = theme.colors;
export const typography = theme.typography;
export const animations = theme.animations;
export const layout = theme.layout;
export const effects = theme.effects;

// Helper to get spacing value
export function spacing(size: 'tiny' | 'small' | 'medium' | 'large' | 'huge'): number {
  return layout.spacing[size];
}

// Helper to get border radius
export function borderRadius(size: 'none' | 'small' | 'medium' | 'large' | 'round'): number {
  return layout.borderRadius[size];
}

// Helper to get animation duration
export function duration(speed: 'instant' | 'fast' | 'normal' | 'slow'): number {
  return animations.duration[speed];
}

// Helper to get font size
export function fontSize(size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'title'): number {
  return typography.fontSize[size];
}

export default theme;
`;
}

/**
 * Convenience function to generate and save theme
 */
export async function generateAndSaveTheme(
  spec: GameSpec,
  outputPath: string
): Promise<GeneratedTheme> {
  const generator = new ThemeGenerator();
  const theme = generator.generateTheme(spec);
  
  const fs = await import('fs/promises');
  const content = generateThemeFileContent(theme, spec.name);
  await fs.writeFile(outputPath, content, 'utf-8');
  
  console.log(`[ThemeGenerator] ✅ Saved theme to ${outputPath}`);
  
  return theme;
}
