/**
 * FireworksOverlay - Easter egg component for homepage
 * Displays fireworks when clicking on empty areas
 */

import { useEffect, useRef, useCallback } from 'react';
import type { Firework, RenderContext } from './types';
import { DEFAULT_RENDER_PARAMS, MAX_ACTIVE_FIREWORKS } from './constants';
import { isInteractiveElement, getClickCoordinates, loadLogoImage } from './utils';
import { createFirework } from './createFirework';
import { renderFireworks, isFireworkExpired } from './render';

export function FireworksOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fireworksRef = useRef<Firework[]>([]);
  const rafRef = useRef<number>(0);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const lastTouchTimeRef = useRef<number>(0);

  // Preload logo image on mount
  useEffect(() => {
    loadLogoImage('/bilibili-blue.png').then((img) => {
      logoImageRef.current = img;
    });
  }, []);

  // Handle canvas resize
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  // Initialize canvas and setup event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    resizeCanvas();

    // Handle window resize
    window.addEventListener('resize', resizeCanvas);

    // Create stable event handler function (not recreated on each render)
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      // Prevent double-triggering on touch devices (touchend + click)
      if ('touches' in event) {
        const now = performance.now();
        if (now - lastTouchTimeRef.current < 300) {
          return;
        }
        lastTouchTimeRef.current = now;
      }

      // Don't trigger if clicking on interactive element
      if (isInteractiveElement(event.target)) {
        return;
      }

      const coords = getClickCoordinates(event);

      // Check max active fireworks limit
      if (fireworksRef.current.length >= MAX_ACTIVE_FIREWORKS) {
        // Remove oldest fireworks if limit reached
        fireworksRef.current = fireworksRef.current.slice(-MAX_ACTIVE_FIREWORKS + 1);
      }

      // Create new firework
      const firework = createFirework(coords.x, coords.y, canvas.width, canvas.height);
      fireworksRef.current.push(firework);

      // Start render loop if not running
      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(renderLoop);
      }
    };

    // Set up event listeners with capture phase
    document.addEventListener('click', handlePointerDown, true);
    document.addEventListener('touchend', handlePointerDown, { passive: true, capture: true } as AddEventListenerOptions);

    // Render loop function (defined inside effect to access latest refs)
    const renderLoop = () => {
      const currentTime = performance.now();

      // Clean up expired fireworks
      fireworksRef.current = fireworksRef.current.filter(
        (fw) => !isFireworkExpired(fw, currentTime)
      );

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Render context
      const context: RenderContext = {
        canvas,
        ctx,
        width: canvas.width,
        height: canvas.height,
        time: currentTime,
      };

      // Render all active fireworks
      renderFireworks(context, fireworksRef.current, DEFAULT_RENDER_PARAMS, logoImageRef.current);

      // Continue loop if there are active fireworks
      if (fireworksRef.current.length > 0) {
        rafRef.current = requestAnimationFrame(renderLoop);
      } else {
        rafRef.current = 0;
      }
    };

    // Make renderLoop available to handlePointerDown
    (handlePointerDown as any).renderLoop = renderLoop;

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      document.removeEventListener('click', handlePointerDown, true);
      document.removeEventListener('touchend', handlePointerDown, true);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [resizeCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none touch-none"
      style={{ touchAction: 'manipulation' }}
      aria-hidden="true"
    />
  );
}
