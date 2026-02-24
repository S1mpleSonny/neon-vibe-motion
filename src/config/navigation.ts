/**
 * Navigation entry configuration for homepage cards.
 * Defines the content and behavior of entry point cards.
 */

export type ColorScheme = 'cyan' | 'magenta' | 'purple' | 'green';
export type CardStatus = 'available' | 'planning';

export interface NavigationEntry {
  /** Unique identifier */
  id: string;
  /** Card title */
  title: string;
  /** i18n key for card description */
  descriptionKey: string;
  /** Icon/emoji for visual appeal (optional) */
  icon?: string;
  /** Target route path */
  route: string;
  /** Neon color variant */
  colorScheme: ColorScheme;
  /** Display order */
  order: number;
  /** Card status - planning cards show badge and are not clickable */
  status?: CardStatus;
}

/**
 * Static navigation entry list for homepage.
 * Ordered by the 'order' property.
 */
export const NAVIGATION_ENTRIES: NavigationEntry[] = [
  {
    id: 'neon-lab',
    title: 'Neon Lab',
    descriptionKey: 'nav.neonLab.description',
    route: '/neon-lab',
    colorScheme: 'green',
    order: 1,
    status: 'available',
  },
  {
    id: 'neon-studio',
    title: 'Neon Studio',
    descriptionKey: 'nav.neonStudio.description',
    route: '/studio',
    colorScheme: 'magenta',
    order: 2,
    status: 'planning',
  },
];

/**
 * Get color scheme values for Tailwind classes.
 */
export const COLOR_SCHEME_MAP: Record<ColorScheme, { bg: string; border: string; shadow: string }> = {
  cyan: {
    bg: 'bg-accent-primary',
    border: 'border-accent-primary',
    shadow: 'shadow-neon-soft',
  },
  magenta: {
    bg: 'bg-accent-tertiary',
    border: 'border-accent-tertiary',
    shadow: 'shadow-neon-pink',
  },
  purple: {
    bg: 'bg-accent-secondary',
    border: 'border-accent-secondary',
    shadow: 'shadow-neon-purple',
  },
  green: {
    bg: 'bg-accent-success',
    border: 'border-accent-success',
    shadow: 'shadow-neon-green',
  },
};
