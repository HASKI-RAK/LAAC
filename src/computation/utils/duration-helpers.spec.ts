// Unit tests for duration-helpers.ts (REQ-FN-004)

import { parseDuration } from './duration-helpers';

describe('duration-helpers (REQ-FN-004)', () => {
  describe('parseDuration', () => {
    it('should parse hours, minutes, and seconds', () => {
      expect(parseDuration('PT1H30M45S')).toBe(5445); // 3600 + 1800 + 45
    });

    it('should parse minutes only', () => {
      expect(parseDuration('PT45M')).toBe(2700); // 45 * 60
    });

    it('should parse seconds only', () => {
      expect(parseDuration('PT30S')).toBe(30);
    });

    it('should parse hours only', () => {
      expect(parseDuration('PT2H')).toBe(7200); // 2 * 3600
    });

    it('should handle decimal hours', () => {
      expect(parseDuration('PT1.5H')).toBe(5400); // 1.5 * 3600
    });

    it('should handle decimal minutes', () => {
      expect(parseDuration('PT2.5M')).toBe(150); // 2.5 * 60
    });

    it('should handle decimal seconds', () => {
      expect(parseDuration('PT30.5S')).toBe(30.5);
    });

    it('should return 0 for empty string', () => {
      expect(parseDuration('')).toBe(0);
    });

    it('should return 0 for invalid format (no PT prefix)', () => {
      expect(parseDuration('1H30M')).toBe(0);
    });

    it('should return 0 for null/undefined', () => {
      expect(parseDuration(null as any)).toBe(0);
      expect(parseDuration(undefined as any)).toBe(0);
    });

    it('should handle PT prefix only', () => {
      expect(parseDuration('PT')).toBe(0);
    });

    it('should handle combined decimal and integer components', () => {
      expect(parseDuration('PT1H30.5M10S')).toBe(5440); // 3600 + 1830 + 10
    });
  });
});
