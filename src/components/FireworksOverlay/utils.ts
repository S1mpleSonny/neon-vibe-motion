/**
 * Utility functions for FireworksOverlay component
 */

import type { Point, ParticleCache, ShapeType, ClickEvent } from './types';
import { TEXT_LIST } from './constants';

/**
 * Cache for particle coordinates
 */
const CACHE: ParticleCache = {
  textPoints: {},
  logoPoints: null,
  lastLogoSrc: null,
  offscreenCanvas: null,
};

/**
 * Check if an event target is an interactive element
 * Fireworks should not trigger when clicking on links, buttons, or elements with data-no-fireworks
 */
export function isInteractiveElement(target: EventTarget | null): boolean {
  if (!target) return false;

  const el = target as HTMLElement;
  const tagName = el.tagName.toUpperCase();
  const closest = el.closest.bind(el);

  // Check for interactive tags
  if (tagName === 'A' || tagName === 'BUTTON' || tagName === 'INPUT' || tagName === 'SELECT' || tagName === 'TEXTAREA') {
    return true;
  }

  // Check for interactive elements via closest
  if (closest('a') !== null || closest('button') !== null) {
    return true;
  }

  // Check for explicit exclusion attribute
  if (closest('[data-no-fireworks]') !== null) {
    return true;
  }

  return false;
}

/**
 * Get click coordinates from a mouse or touch event
 */
export function getClickCoordinates(event: MouseEvent | TouchEvent): ClickEvent {
  let x: number;
  let y: number;

  if ('touches' in event) {
    // Touch event
    x = event.touches[0]?.clientX ?? event.changedTouches[0]?.clientX ?? 0;
    y = event.touches[0]?.clientY ?? event.changedTouches[0]?.clientY ?? 0;
  } else {
    // Mouse event
    x = event.clientX;
    y = event.clientY;
  }

  return { x, y, timestamp: performance.now() };
}

/**
 * Get particle points for text fireworks
 * Uses offscreen canvas to render text and sample pixel positions
 */
export function getTextPoints(text: string): Point[] {
  if (CACHE.textPoints[text]) {
    return CACHE.textPoints[text];
  }

  const size = 100;
  if (!CACHE.offscreenCanvas) {
    CACHE.offscreenCanvas = document.createElement('canvas');
  }

  const ctx = CACHE.offscreenCanvas.getContext('2d');
  if (!ctx) {
    return [];
  }

  CACHE.offscreenCanvas.width = size * 6;
  CACHE.offscreenCanvas.height = size * 1.5;

  ctx.clearRect(0, 0, CACHE.offscreenCanvas.width, CACHE.offscreenCanvas.height);
  ctx.font = `bold ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CACHE.offscreenCanvas.width / 2, size * 0.75);

  const imageData = ctx.getImageData(0, 0, CACHE.offscreenCanvas.width, CACHE.offscreenCanvas.height);
  const points: Point[] = [];
  const step = 2;

  for (let y = 0; y < CACHE.offscreenCanvas.height; y += step) {
    for (let x = 0; x < CACHE.offscreenCanvas.width; x += step) {
      const alpha = imageData.data[(y * CACHE.offscreenCanvas.width + x) * 4 + 3];
      if (alpha > 128) {
        points.push({
          x: (x - CACHE.offscreenCanvas.width / 2) / size,
          y: (y - size * 0.75) / size,
        });
      }
    }
  }

  CACHE.textPoints[text] = points;
  return points;
}

/**
 * Get particle points for logo fireworks
 */
export function getLogoPoints(img: HTMLImageElement | null): Point[] | null {
  if (!img || !(img instanceof HTMLImageElement)) {
    return null;
  }

  if (CACHE.lastLogoSrc === img.src && CACHE.logoPoints) {
    return CACHE.logoPoints;
  }

  const size = 200;
  if (!CACHE.offscreenCanvas) {
    CACHE.offscreenCanvas = document.createElement('canvas');
  }

  const ctx = CACHE.offscreenCanvas.getContext('2d');
  if (!ctx) {
    return null;
  }

  CACHE.offscreenCanvas.width = size;
  CACHE.offscreenCanvas.height = size;

  const aspect = img.width / img.height;
  let dw = size;
  let dh = size;

  if (aspect > 1) {
    dh = size / aspect;
  } else {
    dw = size * aspect;
  }

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, (size - dw) / 2, (size - dh) / 2, dw, dh);

  const imageData = ctx.getImageData(0, 0, size, size);
  const points: Point[] = [];
  const step = 2;

  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const alpha = imageData.data[(y * size + x) * 4 + 3];
      if (alpha > 128) {
        points.push({
          x: (x - size / 2) / size,
          y: (y - size / 2) / size,
        });
      }
    }
  }

  CACHE.lastLogoSrc = img.src;
  CACHE.logoPoints = points;
  return points;
}

/**
 * Get particle points for shape fireworks (heart or star)
 */
export function getShapePoints(shapeType: ShapeType, count: number): Point[] {
  const points: Point[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    let x: number;
    let y: number;

    if (shapeType === 'star') {
      // Star shape
      const r = 1 + Math.sin(angle * 5) * 0.4;
      x = r * Math.cos(angle - Math.PI / 2);
      y = r * Math.sin(angle - Math.PI / 2);
    } else {
      // Heart shape (parametric equation)
      x = 16 * Math.pow(Math.sin(angle), 3);
      y = -(13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle));
      x /= 16;
      y /= 16;
    }

    points.push({ x, y });
  }

  return points;
}

/**
 * Load logo image from URL
 */
export function loadLogoImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * Get a random text from the predefined list
 */
export function getRandomText(): string {
  return TEXT_LIST[Math.floor(Math.random() * TEXT_LIST.length)];
}

/**
 * Get a random shape type
 */
export function getRandomShapeType(): ShapeType {
  return Math.random() > 0.5 ? 'heart' : 'star';
}
