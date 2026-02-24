/**
 * Neon Rendering Harness
 *
 * Standalone entry point for headless rendering via Playwright.
 * Exposes window.NeonHarness API for injecting MotionDefinition and exporting video.
 */

import type {
  MotionDefinition,
  ExportConfig,
  AspectRatioId,
  ExportResolutionId,
} from '@/types';
import type { CoreRenderer } from '@/services/core/CoreRenderer.interface';
import { createRendererForMotion } from '@/services/renderer';
import { ExportPipeline } from '@/services/exporter/ExportPipeline';
import { H264EncoderService } from '@/services/exporter/H264EncoderService';
import { calculateExportDimensions, DEFAULT_ASPECT_RATIO } from '@/utils/coordinates';

/** Render options */
interface RenderOptions {
  width?: number;
  height?: number;
  fps?: number;
  format?: 'mp4';
  aspectRatio?: AspectRatioId;
  resolution?: ExportResolutionId;
  paramOverrides?: Record<string, unknown>;
}

/** Render result */
interface RenderResult {
  blob: Blob;
  format: 'mp4';
  width: number;
  height: number;
  duration: number;
  frames: number;
}

/** NeonHarness API */
interface NeonHarness {
  render(motion: MotionDefinition, options?: RenderOptions): Promise<RenderResult>;
  version: string;
}

/**
 * Load H.264 encoder
 */
async function loadH264Encoder(): Promise<void> {
  if (H264EncoderService.isEncoderAvailable()) {
    return;
  }

  const script = document.createElement('script');
  script.src = './h264mp4/h264-mp4-encoder.web.js';

  await new Promise<void>((resolve, reject) => {
    script.onload = () => {
      if (typeof (window as unknown as { HME?: { createH264MP4Encoder: () => Promise<unknown> } }).HME !== 'undefined') {
        (window as unknown as { __initH264MP4Encoder__: () => Promise<unknown> }).__initH264MP4Encoder__ = () => {
          return (window as unknown as { HME: { createH264MP4Encoder: () => Promise<unknown> } }).HME.createH264MP4Encoder();
        };
        resolve();
      } else {
        reject(new Error('H.264 encoder failed to load: HME undefined'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load H.264 encoder script'));
    document.head.appendChild(script);
  });
}

/**
 * Apply parameter overrides to motion
 */
function applyParameterOverrides(
  motion: MotionDefinition,
  overrides: Record<string, unknown>
): MotionDefinition {
  const updatedParameters = motion.parameters.map(param => {
    if (!(param.id in overrides)) {
      return param;
    }

    const value = overrides[param.id];
    const updated = { ...param };

    switch (param.type) {
      case 'number':
        updated.value = value as number;
        break;
      case 'color':
        updated.colorValue = value as string;
        break;
      case 'boolean':
        updated.boolValue = value as boolean;
        break;
      case 'select':
        updated.selectedValue = value as string;
        break;
      case 'string':
        updated.stringValue = value as string;
        break;
    }

    return updated;
  });

  return {
    ...motion,
    parameters: updatedParameters,
  };
}

/**
 * Main render function
 */
async function render(
  motion: MotionDefinition,
  options: RenderOptions = {}
): Promise<RenderResult> {
  // Load H.264 encoder
  await loadH264Encoder();

  // Apply parameter overrides
  let processedMotion = motion;
  if (options.paramOverrides) {
    processedMotion = applyParameterOverrides(motion, options.paramOverrides);
  }

  // Calculate dimensions
  const aspectRatio = options.aspectRatio || DEFAULT_ASPECT_RATIO;
  const resolution = (options.resolution || '1080p') as ExportResolutionId;
  const dimensions = calculateExportDimensions(aspectRatio, resolution);

  // Override with explicit dimensions if provided
  const finalWidth = options.width || dimensions.width;
  const finalHeight = options.height || dimensions.height;

  // Create motion with export dimensions
  const exportMotion: MotionDefinition = {
    ...processedMotion,
    width: finalWidth,
    height: finalHeight,
  };

  // Create hidden container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: -9999px;
    width: ${finalWidth}px;
    height: ${finalHeight}px;
    visibility: hidden;
    pointer-events: none;
  `;
  document.body.appendChild(container);

  // Create renderer
  const renderer = createRendererForMotion(exportMotion, { exportMode: true }) as CoreRenderer;
  await renderer.initialize(container, exportMotion);

  // Brief delay for canvas initialization (inherited from existing exporter pattern)
  await new Promise(resolve => setTimeout(resolve, 50));

  try {
    const fps = options.fps || 30;
    const exportConfig: ExportConfig = {
      resolution,
      frameRate: fps as 24 | 30 | 60,
      format: 'mp4',
      aspectRatio,
    };

    const pipeline = new ExportPipeline();
    const blob = await pipeline.exportToMP4(
      renderer,
      exportConfig,
      (progress) => window.postMessage({ type: 'neon:progress', progress }, '*'),
    );

    return {
      blob,
      format: 'mp4' as const,
      width: finalWidth,
      height: finalHeight,
      duration: motion.duration,
      frames: Math.ceil((motion.duration / 1000) * fps),
    };
  } finally {
    renderer.destroy();
    container.remove();
  }
}

// Expose API on window
const HARNESS_VERSION = '1.0.0';

const harness: NeonHarness = {
  render,
  version: HARNESS_VERSION,
};

(window as unknown as { NeonHarness: NeonHarness }).NeonHarness = harness;

// Post ready signal
window.postMessage({ type: 'neon:ready' }, '*');
