/**
 * Theme configuration for the Cyberpunk neon dark mode.
 * Defines all color schemes and visual properties for the game-style UI.
 */

export interface ColorScheme {
  /** Color scheme name */
  name: string;
  /** Base color value (hex) */
  base: string;
  /** Light variant (hex) */
  light: string;
  /** Dark variant (hex) */
  dark: string;
  /** Glow effect color (rgba) */
  glow: string;
}

export interface UITheme {
  // Background colors
  background: string;
  surface: string;
  surfaceElevated: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;

  // Border colors
  border: string;
  borderActive: string;

  // Neon accent colors
  neonCyan: ColorScheme;
  neonMagenta: ColorScheme;
  neonPurple: ColorScheme;
  neonGreen: ColorScheme;

  // Status colors
  success: string;
  error: string;
  warning: string;
}

/**
 * Game theme configuration with cyberpunk neon colors.
 * Maps to CSS variables defined in index.css.
 */
export const GAME_THEME: UITheme = {
  background: '#0A0A0F',
  surface: '#0F0F23',
  surfaceElevated: '#1A1A2E',
  textPrimary: '#E2E8F0',
  textSecondary: '#94A3B8',
  border: '#4C1D95',
  borderActive: '#0080FF',
  neonCyan: {
    name: 'cyan',
    base: '#00FFFF',
    light: '#33FFFF',
    dark: '#00CCCC',
    glow: 'rgba(0, 255, 255, 0.5)',
  },
  neonMagenta: {
    name: 'magenta',
    base: '#FF006E',
    light: '#FF3388',
    dark: '#CC0058',
    glow: 'rgba(255, 0, 110, 0.5)',
  },
  neonPurple: {
    name: 'purple',
    base: '#7C3AED',
    light: '#9960F0',
    dark: '#6322D1',
    glow: 'rgba(124, 58, 237, 0.5)',
  },
  neonGreen: {
    name: 'green',
    base: '#00FF80',
    light: '#33FF99',
    dark: '#00CC66',
    glow: 'rgba(0, 255, 128, 0.5)',
  },
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
};
