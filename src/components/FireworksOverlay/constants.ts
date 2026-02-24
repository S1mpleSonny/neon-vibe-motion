/**
 * Constants for FireworksOverlay component
 */

import type { RenderParams } from './types';

/**
 * Predefined text list for text fireworks
 */
export const TEXT_LIST = ['2026', 'Aurora', 'Neon', '干杯', 'BILIBILI'] as const;

/**
 * Time constants (in milliseconds)
 */
export const LAUNCH_DURATION = 1000;      // Firework rise time
export const EXPLOSION_DURATION = 2000;   // Explosion duration
export const TOTAL_DURATION = 3000;       // Complete lifecycle

/**
 * Performance constraints
 */
export const MAX_ACTIVE_FIREWORKS = 20;   // Maximum concurrent fireworks
export const TARGET_FPS = 60;             // Target frame rate

/**
 * Firework type probability distribution
 */
export const FIREWORK_TYPE_PROBABILITIES = {
  logo: 0.3,    // 30%
  text: 0.5,    // 50%
  normal: 0.1,  // 10%
  shape: 0.1,   // 10% (heart 5%, star 5%)
} as const;

/**
 * Default render parameters
 */
export const DEFAULT_RENDER_PARAMS: RenderParams = {
  gravity: 200,
  friction: 0.95,
  particleCount: 650,
  explosionSize: 0.8,  // 80% of original size
  shapeRandomness: 0.2,
};
