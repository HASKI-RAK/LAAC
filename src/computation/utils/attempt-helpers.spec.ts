// Unit tests for attempt-helpers.ts (REQ-FN-004)
// Validates best attempt selection logic for element-level CSV metrics

import { xAPIStatement } from '../../data-access';
import {
  selectBestAttempt,
  extractScore,
  isCompleted,
} from './attempt-helpers';

describe('attempt-helpers (REQ-FN-004)', () => {
  describe('selectBestAttempt', () => {
    it('should select attempt with highest score', () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 92 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 78 } },
          timestamp: '2025-11-15T12:00:00Z',
        },
      ];

      const best = selectBestAttempt(statements);

      expect(best).not.toBeNull();
      expect(best?.result?.score?.raw).toBe(92);
    });

    it('should tie-break by most recent timestamp when scores equal', () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T09:00:00Z',
        },
      ];

      const best = selectBestAttempt(statements);

      expect(best).not.toBeNull();
      expect(best?.timestamp).toBe('2025-11-15T11:00:00Z');
    });

    it('should return null for empty array', () => {
      expect(selectBestAttempt([])).toBeNull();
    });

    it('should handle statements with no scores and no completion (select most recent overall)', () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { completion: false },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { completion: false },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const best = selectBestAttempt(statements);

      expect(best).not.toBeNull();
      expect(best?.timestamp).toBe('2025-11-15T11:00:00Z');
    });

    it('should prefer most recent completed attempt when no scores exist', () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { completion: true },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { completion: false },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const best = selectBestAttempt(statements);

      expect(best).not.toBeNull();
      expect(best?.timestamp).toBe('2025-11-15T10:00:00Z');
    });

    it('should handle single statement', () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 75 } },
          timestamp: '2025-11-15T10:00:00Z',
        },
      ];

      const best = selectBestAttempt(statements);

      expect(best).not.toBeNull();
      expect(best).toBe(statements[0]);
    });

    it('should prioritize raw score over scaled score', () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { scaled: 0.9 } },
          timestamp: '2025-11-15T10:00:00Z',
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 85 } },
          timestamp: '2025-11-15T11:00:00Z',
        },
      ];

      const best = selectBestAttempt(statements);

      expect(best).not.toBeNull();
      expect(best?.result?.score?.raw).toBe(85);
    });

    it('should handle missing timestamps gracefully', () => {
      const statements: xAPIStatement[] = [
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 85 } },
        },
        {
          actor: { account: { homePage: 'test', name: 'user1' } },
          verb: { id: 'test' },
          object: { id: 'test' },
          result: { score: { raw: 92 } },
        },
      ];

      const best = selectBestAttempt(statements);

      expect(best).not.toBeNull();
      expect(best?.result?.score?.raw).toBe(92);
    });
  });

  describe('extractScore', () => {
    it('should extract raw score when available', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        result: { score: { raw: 85 } },
      };

      expect(extractScore(statement)).toBe(85);
    });

    it('should extract scaled score when raw not available', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        result: { score: { scaled: 0.85 } },
      };

      expect(extractScore(statement)).toBe(0.85);
    });

    it('should prioritize raw over scaled', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        result: { score: { raw: 85, scaled: 0.85 } },
      };

      expect(extractScore(statement)).toBe(85);
    });

    it('should return null when no score available', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        result: { completion: true },
      };

      expect(extractScore(statement)).toBeNull();
    });

    it('should return null when result is missing', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
      };

      expect(extractScore(statement)).toBeNull();
    });
  });

  describe('isCompleted', () => {
    it('should return true when completion is true', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        result: { completion: true },
      };

      expect(isCompleted(statement)).toBe(true);
    });

    it('should return false when completion is false', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        result: { completion: false },
      };

      expect(isCompleted(statement)).toBe(false);
    });

    it('should return false when completion is missing', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
        result: { score: { raw: 85 } },
      };

      expect(isCompleted(statement)).toBe(false);
    });

    it('should return false when result is missing', () => {
      const statement: xAPIStatement = {
        actor: { account: { homePage: 'test', name: 'user1' } },
        verb: { id: 'test' },
        object: { id: 'test' },
      };

      expect(isCompleted(statement)).toBe(false);
    });
  });
});
