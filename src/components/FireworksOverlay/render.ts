/**
 * Firework rendering functions
 * Adapted from .tmp/firework-render.js for click-triggered interactions
 */

import type { Firework, RenderContext, RenderParams } from './types';
import { LAUNCH_DURATION, EXPLOSION_DURATION, TEXT_LIST } from './constants';
import { getTextPoints, getLogoPoints, getShapePoints } from './utils';

/**
 * Calculate particle position with physics (gravity, friction)
 */
function calcPos(
  vx: number,
  vy: number,
  t: number,
  startX: number,
  startY: number,
  friction: number,
  gravity: number
): { x: number; y: number } {
  const drag = Math.pow(friction, t * 60);
  const effectiveTime = (1 - drag) / Math.max(0.001, 1 - friction);
  const x = startX + vx * effectiveTime * 0.05;
  let y = startY + vy * effectiveTime * 0.05;
  y += 0.5 * gravity * t * t;
  return { x, y };
}

/**
 * Render a single firework
 */
function renderFirework(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  firework: Firework,
  currentTime: number,
  params: RenderParams,
  logoImage: HTMLImageElement | null
): void {
  const lifeTime = currentTime - firework.startTime;

  // Skip if not started or already finished
  if (lifeTime < 0 || lifeTime > LAUNCH_DURATION + EXPLOSION_DURATION) {
    return;
  }

  const { width, height } = canvas;
  const { gravity, friction, particleCount, explosionSize, shapeRandomness } = params;

  // Launch phase (rocket rising)
  if (lifeTime < LAUNCH_DURATION) {
    const progress = lifeTime / LAUNCH_DURATION;
    const yProgress = 1 - (1 - progress) * (1 - progress);

    const currentX = firework.x * width;
    const startY = height;
    const endY = firework.targetY * height;
    const currentY = startY - (startY - endY) * yProgress;

    // Draw trail
    const trailLen = height * 0.05 * (1 - progress);
    ctx.beginPath();
    ctx.moveTo(currentX, currentY);
    ctx.lineTo(currentX, currentY + trailLen);
    ctx.strokeStyle = `hsla(${firework.hue}, 100%, 70%, ${1 - progress})`;
    ctx.lineWidth = width * 0.004;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw rocket head
    ctx.beginPath();
    ctx.arc(currentX, currentY, width * 0.006, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${firework.hue}, 100%, 90%)`;
    ctx.fill();
    return;
  }

  // Explosion phase
  const explosionTime = (lifeTime - LAUNCH_DURATION) / 1000;
  const centerX = firework.x * width;
  const centerY = firework.targetY * height;

  // Deterministic random for this firework
  const seed = firework.id * 1000;
  let randomSeed = seed;
  const random = () => {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  };

  let points: ReturnType<typeof getTextPoints | typeof getLogoPoints | typeof getShapePoints> | null = null;
  let pCount = particleCount;
  let velocityScale = width * 0.3 * explosionSize;

  // Get particle points based on firework type
  if (firework.type === 'logo' && logoImage) {
    points = getLogoPoints(logoImage);
    if (points) {
      pCount = points.length;
      velocityScale = width * 0.2 * explosionSize;
    } else {
      // Fallback to normal if logo fails
      firework.type = 'normal';
    }
  } else if (firework.type === 'text' && firework.textIndex !== null) {
    points = getTextPoints(TEXT_LIST[firework.textIndex]);
    if (points) {
      pCount = points.length;
      velocityScale = width * 0.3 * explosionSize;
    }
  } else if (firework.type === 'shape' && firework.shapeType) {
    pCount = Math.floor(particleCount * 0.8);
    points = getShapePoints(firework.shapeType, pCount);
  }

  const step = Math.ceil(pCount / 1000);

  // Render particles
  for (let i = 0; i < pCount; i += step) {
    const r1 = random();
    const r2 = random();

    let vx: number;
    let vy: number;

    if (points) {
      // Use pre-calculated points (text, logo, shape)
      const p = points[i % points.length];
      vx = p.x * velocityScale;
      vy = p.y * velocityScale;
      vx += (r1 - 0.5) * width * 0.05 * shapeRandomness;
      vy += (r2 - 0.5) * width * 0.05 * shapeRandomness;
    } else {
      // Normal circular explosion
      const angle = r1 * Math.PI * 2;
      const speed = r2 * velocityScale;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    // Calculate alpha based on explosion time
    const alpha = 1 - explosionTime / (EXPLOSION_DURATION / 1000);
    if (alpha <= 0.01) continue;

    // Calculate current position
    const pos = calcPos(vx, vy, explosionTime, centerX, centerY, friction, gravity * height / 1000);

    // Calculate trail position
    const trailDt = 0.06;
    const prevT = Math.max(0, explosionTime - trailDt);
    const prevPos = calcPos(vx, vy, prevT, centerX, centerY, friction, gravity * height / 1000);

    // Draw trail
    ctx.beginPath();
    ctx.moveTo(prevPos.x, prevPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.lineWidth = width * 0.003 * 2.5;
    ctx.strokeStyle = `hsla(${firework.hue}, 100%, 60%, ${alpha * 0.4})`;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Draw particle head
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, width * 0.003 * 0.8, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${firework.hue}, 100%, 95%, ${alpha})`;
    ctx.fill();
  }
}

/**
 * Render all active fireworks
 */
export function renderFireworks(
  context: RenderContext,
  fireworks: Firework[],
  params: RenderParams,
  logoImage: HTMLImageElement | null
): void {
  const { ctx, canvas } = context;

  // Clear canvas with fade effect for trails
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Set blend mode for glowing effect
  ctx.globalCompositeOperation = 'lighter';

  // Render each firework
  for (const firework of fireworks) {
    renderFirework(ctx, canvas, firework, context.time, params, logoImage);
  }

  // Reset composite operation
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1.0;
}

/**
 * Check if a firework has expired
 */
export function isFireworkExpired(firework: Firework, currentTime: number): boolean {
  const lifeTime = currentTime - firework.startTime;
  return lifeTime > LAUNCH_DURATION + EXPLOSION_DURATION;
}
