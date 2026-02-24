import { describe, it, expect } from 'vitest';
import {
  createSeededRandom,
  seededRandomInt,
  seededRandomRange,
  createRandomSequence,
  hashCode,
  createMotionUtils,
} from './deterministicRandom';

describe('deterministicRandom', () => {
  describe('createSeededRandom', () => {
    it('should return values between 0 and 1', () => {
      const random = createSeededRandom(42);
      for (let i = 0; i < 100; i++) {
        const value = random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should produce the same sequence for the same seed', () => {
      const random1 = createSeededRandom(12345);
      const random2 = createSeededRandom(12345);

      for (let i = 0; i < 10; i++) {
        expect(random1()).toBe(random2());
      }
    });

    it('should produce different sequences for different seeds', () => {
      const random1 = createSeededRandom(1);
      const random2 = createSeededRandom(2);

      const values1 = Array.from({ length: 5 }, () => random1());
      const values2 = Array.from({ length: 5 }, () => random2());

      expect(values1).not.toEqual(values2);
    });

    it('should handle edge case seeds', () => {
      const random0 = createSeededRandom(0);
      const randomNeg = createSeededRandom(-1);
      const randomLarge = createSeededRandom(Number.MAX_SAFE_INTEGER);

      // Should not throw and should return valid values
      expect(random0()).toBeGreaterThanOrEqual(0);
      expect(randomNeg()).toBeGreaterThanOrEqual(0);
      expect(randomLarge()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('seededRandomInt', () => {
    it('should return integers within the specified range', () => {
      for (let seed = 0; seed < 100; seed++) {
        const value = seededRandomInt(seed, 5, 10);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(5);
        expect(value).toBeLessThanOrEqual(10);
      }
    });

    it('should return the same value for the same seed', () => {
      const value1 = seededRandomInt(42, 1, 100);
      const value2 = seededRandomInt(42, 1, 100);
      expect(value1).toBe(value2);
    });

    it('should handle single value range', () => {
      const value = seededRandomInt(42, 5, 5);
      expect(value).toBe(5);
    });

    it('should cover the full range', () => {
      const values = new Set<number>();
      for (let seed = 0; seed < 1000; seed++) {
        values.add(seededRandomInt(seed, 1, 3));
      }
      expect(values.has(1)).toBe(true);
      expect(values.has(2)).toBe(true);
      expect(values.has(3)).toBe(true);
    });
  });

  describe('seededRandomRange', () => {
    it('should return values within the specified range', () => {
      for (let seed = 0; seed < 100; seed++) {
        const value = seededRandomRange(seed, 10.0, 20.0);
        expect(value).toBeGreaterThanOrEqual(10.0);
        expect(value).toBeLessThan(20.0);
      }
    });

    it('should return the same value for the same seed', () => {
      const value1 = seededRandomRange(42, 0, 100);
      const value2 = seededRandomRange(42, 0, 100);
      expect(value1).toBe(value2);
    });

    it('should return floats, not just integers', () => {
      const values = Array.from({ length: 10 }, (_, i) =>
        seededRandomRange(i, 0, 1)
      );
      const hasDecimal = values.some((v) => v !== Math.floor(v));
      expect(hasDecimal).toBe(true);
    });
  });

  describe('createRandomSequence', () => {
    it('should produce a sequence of random numbers', () => {
      const next = createRandomSequence(42);
      const values = Array.from({ length: 10 }, () => next());

      // All values should be valid
      values.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      });

      // Values should not all be the same
      const unique = new Set(values);
      expect(unique.size).toBeGreaterThan(1);
    });

    it('should produce the same sequence for the same seed', () => {
      const next1 = createRandomSequence(99);
      const next2 = createRandomSequence(99);

      for (let i = 0; i < 10; i++) {
        expect(next1()).toBe(next2());
      }
    });
  });

  describe('hashCode', () => {
    it('should return the same hash for the same string', () => {
      const hash1 = hashCode('hello');
      const hash2 = hashCode('hello');
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different strings', () => {
      const hash1 = hashCode('hello');
      const hash2 = hashCode('world');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const hash = hashCode('');
      expect(typeof hash).toBe('number');
      expect(hash).toBe(0);
    });

    it('should return a number', () => {
      const hash = hashCode('test string');
      expect(typeof hash).toBe('number');
      expect(Number.isFinite(hash)).toBe(true);
    });
  });

  describe('createMotionUtils', () => {
    it('should return an object with all utility functions', () => {
      const utils = createMotionUtils();

      expect(typeof utils.seededRandom).toBe('function');
      expect(typeof utils.seededRandomInt).toBe('function');
      expect(typeof utils.seededRandomRange).toBe('function');
      expect(typeof utils.createRandomSequence).toBe('function');
    });

    it('should have working utility functions', () => {
      const utils = createMotionUtils();

      // Test seededRandom
      const random = utils.seededRandom(42);
      expect(random()).toBeGreaterThanOrEqual(0);
      expect(random()).toBeLessThan(1);

      // Test seededRandomInt
      const intValue = utils.seededRandomInt(42, 1, 10);
      expect(intValue).toBeGreaterThanOrEqual(1);
      expect(intValue).toBeLessThanOrEqual(10);

      // Test seededRandomRange
      const floatValue = utils.seededRandomRange(42, 0, 100);
      expect(floatValue).toBeGreaterThanOrEqual(0);
      expect(floatValue).toBeLessThan(100);

      // Test createRandomSequence
      const next = utils.createRandomSequence(42);
      expect(next()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('determinism verification', () => {
    it('should produce identical results across multiple runs', () => {
      // Simulate rendering the same frame multiple times
      const renderFrame = (time: number) => {
        const random = createSeededRandom(time);
        return {
          x: random() * 800,
          y: random() * 600,
          size: random() * 50,
          color: Math.floor(random() * 360),
        };
      };

      const frame1 = renderFrame(1000);
      const frame2 = renderFrame(1000);
      const frame3 = renderFrame(1000);

      expect(frame1).toEqual(frame2);
      expect(frame2).toEqual(frame3);
    });

    it('should support particle system use case', () => {
      // Simulate particle spawning with consistent properties
      const getParticleProps = (spawnTime: number) => {
        const random = createSeededRandom(spawnTime);
        return {
          startX: random() * 800,
          startY: random() * 600,
          velocityX: (random() - 0.5) * 10,
          velocityY: random() * -5,
        };
      };

      // Same spawn time should always produce the same particle
      const particle1 = getParticleProps(500);
      const particle2 = getParticleProps(500);
      expect(particle1).toEqual(particle2);

      // Different spawn times should produce different particles
      const particle3 = getParticleProps(600);
      expect(particle1).not.toEqual(particle3);
    });
  });
});
