/**
 * Validation for MotionDefinition JSON (the actual Neon Lab format).
 *
 * .neon files exported from Neon Lab have this wrapper structure:
 *   { version, exportedAt, conversation: { id, title, messages, motion: MotionDefinition } }
 *
 * This module extracts the MotionDefinition from the wrapper, then validates it.
 */

export interface ValidationError {
  field: string;
  message: string;
}

export type NeonFile = Record<string, unknown>;

/**
 * Extract MotionDefinition from a .neon file.
 * Supports both the wrapper format (conversation.motion) and bare MotionDefinition.
 */
export function extractMotion(data: unknown): { motion: NeonFile | null; error: string | null } {
  if (!data || typeof data !== 'object') {
    return { motion: null, error: 'Invalid JSON structure' };
  }

  const obj = data as Record<string, unknown>;

  // Wrapper format: { conversation: { motion: MotionDefinition } }
  if (obj.conversation && typeof obj.conversation === 'object') {
    const conv = obj.conversation as Record<string, unknown>;
    if (conv.motion && typeof conv.motion === 'object') {
      return { motion: conv.motion as NeonFile, error: null };
    }
    return { motion: null, error: 'Wrapper has conversation but no conversation.motion' };
  }

  // Bare MotionDefinition (has renderMode at root)
  if (typeof obj.renderMode === 'string') {
    return { motion: obj as NeonFile, error: null };
  }

  return { motion: null, error: 'Not a valid .neon file: no conversation.motion or renderMode found' };
}

export function validateMotion(data: unknown): { valid: boolean; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: [{ field: 'root', message: 'Invalid JSON structure' }] };
  }

  const obj = data as Record<string, unknown>;

  // Required fields from MotionDefinition
  if (typeof obj.id !== 'string') {
    errors.push({ field: 'id', message: 'Required string' });
  }

  if (!['canvas', 'webgl', 'hybrid'].includes(obj.renderMode as string)) {
    errors.push({ field: 'renderMode', message: 'Must be "canvas", "webgl", or "hybrid"' });
  }

  if (typeof obj.duration !== 'number' || obj.duration <= 0) {
    errors.push({ field: 'duration', message: 'Required positive number (milliseconds)' });
  }

  if (typeof obj.width !== 'number' || obj.width <= 0) {
    errors.push({ field: 'width', message: 'Required positive number' });
  }

  if (typeof obj.height !== 'number' || obj.height <= 0) {
    errors.push({ field: 'height', message: 'Required positive number' });
  }

  if (typeof obj.backgroundColor !== 'string') {
    errors.push({ field: 'backgroundColor', message: 'Required string' });
  }

  if (typeof obj.code !== 'string') {
    errors.push({ field: 'code', message: 'Required string' });
  } else if (!obj.code.includes('__motionRender')) {
    errors.push({ field: 'code', message: 'Must assign window.__motionRender' });
  }

  if (!Array.isArray(obj.elements)) {
    errors.push({ field: 'elements', message: 'Required array' });
  }

  if (!Array.isArray(obj.parameters)) {
    errors.push({ field: 'parameters', message: 'Required array' });
  } else {
    (obj.parameters as unknown[]).forEach((param, i) => {
      if (!param || typeof param !== 'object') {
        errors.push({ field: `parameters[${i}]`, message: 'Must be an object' });
        return;
      }
      const p = param as Record<string, unknown>;
      if (typeof p.id !== 'string') {
        errors.push({ field: `parameters[${i}].id`, message: 'Required string' });
      }
      if (typeof p.name !== 'string') {
        errors.push({ field: `parameters[${i}].name`, message: 'Required string' });
      }
      if (typeof p.type !== 'string') {
        errors.push({ field: `parameters[${i}].type`, message: 'Required string' });
      }
      if (typeof p.path !== 'string') {
        errors.push({ field: `parameters[${i}].path`, message: 'Required string' });
      }
    });
  }

  if (typeof obj.createdAt !== 'number') {
    errors.push({ field: 'createdAt', message: 'Required number (timestamp)' });
  }

  if (typeof obj.updatedAt !== 'number') {
    errors.push({ field: 'updatedAt', message: 'Required number (timestamp)' });
  }

  // Optional fields — only validate type if present
  if (obj.durationCode !== undefined && typeof obj.durationCode !== 'string') {
    errors.push({ field: 'durationCode', message: 'Must be a string if present' });
  }

  if (obj.postProcessCode !== undefined && typeof obj.postProcessCode !== 'string') {
    errors.push({ field: 'postProcessCode', message: 'Must be a string if present' });
  }

  return { valid: errors.length === 0, errors };
}
