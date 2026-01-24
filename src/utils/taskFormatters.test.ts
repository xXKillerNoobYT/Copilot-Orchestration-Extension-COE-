/**
 * Tests for Task Formatters Utilities
 * Tests formatting functions for task-related data display
 */

import { formatMinutesToHours, formatMinutesToDuration } from './taskFormatters';

describe('Task Formatters', () => {
  describe('formatMinutesToHours', () => {
    it('should convert minutes to hours with one decimal', () => {
      expect(formatMinutesToHours(60)).toBe(1.0);
      expect(formatMinutesToHours(90)).toBe(1.5);
      expect(formatMinutesToHours(120)).toBe(2.0);
    });

    it('should round to one decimal place', () => {
      expect(formatMinutesToHours(65)).toBe(1.1);
      expect(formatMinutesToHours(68)).toBe(1.1);
      expect(formatMinutesToHours(72)).toBe(1.2);
    });

    it('should handle zero minutes', () => {
      expect(formatMinutesToHours(0)).toBe(0);
    });

    it('should handle small values', () => {
      expect(formatMinutesToHours(1)).toBe(0.0);
      expect(formatMinutesToHours(5)).toBe(0.1);
      expect(formatMinutesToHours(10)).toBe(0.2);
    });

    it('should handle large values', () => {
      expect(formatMinutesToHours(600)).toBe(10.0);
      expect(formatMinutesToHours(1440)).toBe(24.0);
    });

    it('should round correctly at boundaries', () => {
      // 64 minutes = 1.0666 hours -> rounds to 1.1
      expect(formatMinutesToHours(64)).toBe(1.1);
      
      // 66 minutes = 1.1 hours exactly
      expect(formatMinutesToHours(66)).toBe(1.1);
      
      // 125 minutes = 2.0833 hours -> rounds to 2.1
      expect(formatMinutesToHours(125)).toBe(2.1);
    });

    it('should handle decimal inputs', () => {
      expect(formatMinutesToHours(30.5)).toBe(0.5);
      expect(formatMinutesToHours(45.9)).toBe(0.8);
    });

    it('should handle negative values', () => {
      expect(formatMinutesToHours(-60)).toBe(-1.0);
      expect(formatMinutesToHours(-30)).toBe(-0.5);
    });
  });

  describe('formatMinutesToDuration', () => {
    it('should format minutes only for values less than 60', () => {
      expect(formatMinutesToDuration(0)).toBe('0m');
      expect(formatMinutesToDuration(15)).toBe('15m');
      expect(formatMinutesToDuration(30)).toBe('30m');
      expect(formatMinutesToDuration(45)).toBe('45m');
      expect(formatMinutesToDuration(59)).toBe('59m');
    });

    it('should format exact hours without minutes', () => {
      expect(formatMinutesToDuration(60)).toBe('1h');
      expect(formatMinutesToDuration(120)).toBe('2h');
      expect(formatMinutesToDuration(180)).toBe('3h');
      expect(formatMinutesToDuration(300)).toBe('5h');
    });

    it('should format hours and minutes together', () => {
      expect(formatMinutesToDuration(61)).toBe('1h 1m');
      expect(formatMinutesToDuration(90)).toBe('1h 30m');
      expect(formatMinutesToDuration(125)).toBe('2h 5m');
      expect(formatMinutesToDuration(195)).toBe('3h 15m');
    });

    it('should handle multi-digit hours', () => {
      expect(formatMinutesToDuration(600)).toBe('10h');
      expect(formatMinutesToDuration(615)).toBe('10h 15m');
      expect(formatMinutesToDuration(1440)).toBe('24h');
      expect(formatMinutesToDuration(1500)).toBe('25h');
    });

    it('should handle day-long durations', () => {
      // 1 day = 1440 minutes
      expect(formatMinutesToDuration(1440)).toBe('24h');
      
      // 1 day + 2 hours = 1560 minutes
      expect(formatMinutesToDuration(1560)).toBe('26h');
      
      // 2 days = 2880 minutes
      expect(formatMinutesToDuration(2880)).toBe('48h');
    });

    it('should handle edge cases with 1 minute remainder', () => {
      expect(formatMinutesToDuration(61)).toBe('1h 1m');
      expect(formatMinutesToDuration(121)).toBe('2h 1m');
      expect(formatMinutesToDuration(181)).toBe('3h 1m');
    });

    it('should handle large minute remainders', () => {
      expect(formatMinutesToDuration(119)).toBe('1h 59m');
      expect(formatMinutesToDuration(239)).toBe('3h 59m');
    });

    it('should handle single-digit minute remainders', () => {
      expect(formatMinutesToDuration(65)).toBe('1h 5m');
      expect(formatMinutesToDuration(127)).toBe('2h 7m');
      expect(formatMinutesToDuration(189)).toBe('3h 9m');
    });

    it('should handle zero duration', () => {
      expect(formatMinutesToDuration(0)).toBe('0m');
    });

    it('should handle typical work durations', () => {
      // 15 min task
      expect(formatMinutesToDuration(15)).toBe('15m');
      
      // 30 min task
      expect(formatMinutesToDuration(30)).toBe('30m');
      
      // 1 hour task
      expect(formatMinutesToDuration(60)).toBe('1h');
      
      // 2.5 hour task
      expect(formatMinutesToDuration(150)).toBe('2h 30m');
      
      // Half-day (4 hours)
      expect(formatMinutesToDuration(240)).toBe('4h');
      
      // Full workday (8 hours)
      expect(formatMinutesToDuration(480)).toBe('8h');
    });

    it('should handle negative values', () => {
      expect(formatMinutesToDuration(-30)).toBe('-30m');
      expect(formatMinutesToDuration(-60)).toBe('-1h');
      expect(formatMinutesToDuration(-90)).toBe('-1h -30m');
    });

    it('should handle decimal inputs by truncating', () => {
      expect(formatMinutesToDuration(30.7)).toBe('30m');
      expect(formatMinutesToDuration(90.5)).toBe('1h 30m');
    });

    it('should produce human-readable output', () => {
      const testCases = [
        { input: 5, expected: '5m' },
        { input: 45, expected: '45m' },
        { input: 60, expected: '1h' },
        { input: 75, expected: '1h 15m' },
        { input: 120, expected: '2h' },
        { input: 135, expected: '2h 15m' },
        { input: 200, expected: '3h 20m' },
        { input: 360, expected: '6h' },
        { input: 480, expected: '8h' },
        { input: 525, expected: '8h 45m' }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(formatMinutesToDuration(input)).toBe(expected);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should format the same value consistently across both functions', () => {
      const minutes = 90;
      
      const hours = formatMinutesToHours(minutes);
      const duration = formatMinutesToDuration(minutes);
      
      expect(hours).toBe(1.5);
      expect(duration).toBe('1h 30m');
    });

    it('should handle roundtrip conversion scenarios', () => {
      const testValues = [30, 60, 90, 120, 150, 240, 480];
      
      testValues.forEach(minutes => {
        const hours = formatMinutesToHours(minutes);
        const duration = formatMinutesToDuration(minutes);
        
        expect(hours).toBeGreaterThanOrEqual(0);
        expect(duration).toMatch(/^\d+[hm](\s\d+m)?$/);
      });
    });

    it('should produce complementary formats for display', () => {
      // For UI, you might show both formats
      const minutes = 125;
      
      const numericHours = formatMinutesToHours(minutes); // 2.1
      const readableDuration = formatMinutesToDuration(minutes); // 2h 5m
      
      expect(numericHours).toBe(2.1);
      expect(readableDuration).toBe('2h 5m');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small durations', () => {
      expect(formatMinutesToHours(1)).toBe(0.0);
      expect(formatMinutesToDuration(1)).toBe('1m');
      
      expect(formatMinutesToHours(0.1)).toBe(0.0);
      expect(formatMinutesToDuration(0.1)).toBe('0m');
    });

    it('should handle very large durations', () => {
      const oneWeek = 7 * 24 * 60; // 10080 minutes
      
      expect(formatMinutesToHours(oneWeek)).toBe(168.0);
      expect(formatMinutesToDuration(oneWeek)).toBe('168h');
      
      const oneMonth = 30 * 24 * 60; // 43200 minutes
      expect(formatMinutesToHours(oneMonth)).toBe(720.0);
      expect(formatMinutesToDuration(oneMonth)).toBe('720h');
    });

    it('should handle infinity', () => {
      expect(formatMinutesToHours(Infinity)).toBe(Infinity);
      expect(formatMinutesToDuration(Infinity)).toMatch(/Infinity/);
    });

    it('should handle NaN', () => {
      expect(formatMinutesToHours(NaN)).toBeNaN();
      expect(formatMinutesToDuration(NaN)).toContain('NaN');
    });
  });
});
