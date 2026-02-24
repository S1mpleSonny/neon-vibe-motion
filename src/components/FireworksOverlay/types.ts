/**
 * Type definitions for FireworksOverlay component
 */

/**
 * Firework type enumeration
 */
export type FireworkType = 'normal' | 'text' | 'shape' | 'logo';

/**
 * Shape type for shape fireworks
 */
export type ShapeType = 'heart' | 'star';

/**
 * 2D Point for particle positioning
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Firework instance representing a complete firework effect
 */
export interface Firework {
  /** Unique identifier */
  id: number;
  /** Target X position (relative, 0-1) */
  x: number;
  /** Target Y position (relative, 0-1) */
  targetY: number;
  /** Main color hue (0-360) */
  hue: number;
  /** Firework type */
  type: FireworkType;
  /** Start timestamp (ms) */
  startTime: number;
  /** Text index (only for text type) */
  textIndex: number | null;
  /** Shape type (only for shape type) */
  shapeType: ShapeType | null;
}

/**
 * Cache for particle coordinates to avoid recomputation
 */
export interface ParticleCache {
  textPoints: Record<string, Point[]>;
  logoPoints: Point[] | null;
  lastLogoSrc: string | null;
  offscreenCanvas: HTMLCanvasElement | null;
}

/**
 * Render context for firework rendering
 */
export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
}

/**
 * Render parameters for firework effects
 */
export interface RenderParams {
  /** Gravity for particle fall */
  gravity: number;
  /** Air friction */
  friction: number;
  /** Base particle count */
  particleCount: number;
  /** Explosion size multiplier */
  explosionSize: number;
  /** Shape randomness factor */
  shapeRandomness: number;
}

/**
 * Click event for triggering fireworks
 */
export interface ClickEvent {
  x: number;
  y: number;
  timestamp: number;
}
