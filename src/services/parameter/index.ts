import type { MotionDefinition, AdjustableParameter, ParameterService } from '../../types';

function getValueByPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    // Handle array notation like "elements[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

function setValueByPath(obj: unknown, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: unknown = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current === null || current === undefined) return;

    // Handle array notation
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      const arr = (current as Record<string, unknown>)[key];
      if (Array.isArray(arr)) {
        current = arr[parseInt(index, 10)];
      } else {
        return;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  if (current === null || current === undefined) return;

  const lastPart = parts[parts.length - 1];
  const arrayMatch = lastPart.match(/^(\w+)\[(\d+)\]$/);
  if (arrayMatch) {
    const [, key, index] = arrayMatch;
    const arr = (current as Record<string, unknown>)[key];
    if (Array.isArray(arr)) {
      arr[parseInt(index, 10)] = value;
    }
  } else {
    (current as Record<string, unknown>)[lastPart] = value;
  }
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export const parameterService: ParameterService = {
  extractParameters(motion: MotionDefinition): AdjustableParameter[] {
    // Parameters are already extracted by the LLM
    // This method can be used for post-processing if needed
    return motion.parameters.map((param) => {
      // Sync current value from motion definition if path is valid
      const currentValue = getValueByPath(motion, param.path);

      if (param.type === 'number' && typeof currentValue === 'number') {
        return { ...param, value: currentValue };
      } else if (param.type === 'color' && typeof currentValue === 'string') {
        return { ...param, colorValue: currentValue };
      } else if (param.type === 'select' && typeof currentValue === 'string') {
        return { ...param, selectedValue: currentValue };
      } else if (param.type === 'boolean' && typeof currentValue === 'boolean') {
        return { ...param, boolValue: currentValue };
      } else if (param.type === 'image' && typeof currentValue === 'string') {
        return { ...param, imageValue: currentValue };
      } else if (param.type === 'string' && typeof currentValue === 'string') {
        return { ...param, stringValue: currentValue };
      }

      return param;
    });
  },

  applyParameter(
    motion: MotionDefinition,
    parameterId: string,
    value: unknown
  ): MotionDefinition {
    const param = motion.parameters.find((p) => p.id === parameterId);
    if (!param) return motion;

    const updatedMotion = deepClone(motion);

    // Update the parameter value in the parameters array
    const updatedParam = updatedMotion.parameters.find((p) => p.id === parameterId);
    if (updatedParam) {
      switch (updatedParam.type) {
        case 'number':
          updatedParam.value = value as number;
          break;
        case 'color':
          updatedParam.colorValue = value as string;
          break;
        case 'select':
          updatedParam.selectedValue = value as string;
          break;
        case 'boolean':
          updatedParam.boolValue = value as boolean;
          break;
        case 'image':
          updatedParam.imageValue = value as string;
          break;
        case 'string':
          updatedParam.stringValue = value as string;
          break;
      }
    }

    // Apply the value to the motion definition at the specified path
    setValueByPath(updatedMotion, param.path, value);

    // Update the timestamp
    updatedMotion.updatedAt = Date.now();

    return updatedMotion;
  },

  applyParameters(
    motion: MotionDefinition,
    updates: { parameterId: string; value: unknown }[]
  ): MotionDefinition {
    let result = motion;
    for (const update of updates) {
      result = this.applyParameter(result, update.parameterId, update.value);
    }
    return result;
  },
};

export default parameterService;
