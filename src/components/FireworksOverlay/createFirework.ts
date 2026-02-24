/**
 * Firework factory functions
 */

import type { Firework, FireworkType, ShapeType } from './types';
import { FIREWORK_TYPE_PROBABILITIES, TEXT_LIST } from './constants';
import { getRandomShapeType } from './utils';

let nextId = 0;

/**
 * Select a random firework type based on probability distribution
 */
export function selectFireworkType(): FireworkType {
  const rand = Math.random();

  if (rand < FIREWORK_TYPE_PROBABILITIES.logo) {
    return 'logo';
  }

  if (rand < FIREWORK_TYPE_PROBABILITIES.logo + FIREWORK_TYPE_PROBABILITIES.text) {
    return 'text';
  }

  if (rand < FIREWORK_TYPE_PROBABILITIES.logo + FIREWORK_TYPE_PROBABILITIES.text + FIREWORK_TYPE_PROBABILITIES.normal) {
    return 'normal';
  }

  return 'shape';
}

/**
 * Get the text index for a text firework
 */
export function getTextIndex(): number {
  return Math.floor(Math.random() * TEXT_LIST.length);
}

/**
 * Get the shape type for a shape firework
 */
export function getShapeType(): ShapeType {
  return getRandomShapeType();
}

/**
 * Create a new firework instance
 */
export function createFirework(
  targetX: number,
  targetY: number,
  canvasWidth: number,
  canvasHeight: number
): Firework {
  const type = selectFireworkType();
  const id = nextId++;

  const firework: Firework = {
    id,
    x: targetX / canvasWidth,  // Store as relative position
    targetY: targetY / canvasHeight,
    hue: Math.floor(Math.random() * 360),
    type,
    startTime: performance.now(),
    textIndex: null,
    shapeType: null,
  };

  // Set type-specific properties
  if (type === 'text') {
    firework.textIndex = getTextIndex();
  } else if (type === 'shape') {
    firework.shapeType = getShapeType();
  }

  return firework;
}

/**
 * Reset the firework ID counter (useful for testing)
 */
export function resetFireworkId(): void {
  nextId = 0;
}
