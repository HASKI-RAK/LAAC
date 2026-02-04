// Implements REQ-FN-004: Best Attempt Selection Logic for CSV Metrics
// Shared utility for element-level metrics (EO-001, EO-002, EO-003)

import { xAPIStatement } from '../../data-access';

/**
 * Selects the best attempt from a set of xAPI statements
 *
 * Best Attempt Definition (REQ-FN-004):
 * 1. Highest score (result.score.raw or result.score.scaled)
 * 2. If tied, most recent timestamp
 * 3. If no scores, most recent with result.completion=true
 * 4. If no completed, most recent overall
 *
 * @param statements - Array of xAPI statements for same element+user
 * @returns Best attempt statement or null if none found
 *
 * @remarks
 * - Used by element-level CSV metrics (EO-001, EO-002, EO-003)
 * - Stateless: no side effects, no internal state mutation
 * - Handles edge cases: empty arrays, missing scores, tied scores
 * - Prioritizes result.score.raw over result.score.scaled
 *
 * @example
 * ```typescript
 * const attempts: xAPIStatement[] = [
 *   { result: { score: { raw: 85 } }, timestamp: '2025-11-15T10:00:00Z' },
 *   { result: { score: { raw: 92 } }, timestamp: '2025-11-15T11:00:00Z' },
 *   { result: { score: { raw: 78 } }, timestamp: '2025-11-15T12:00:00Z' },
 * ];
 * const best = selectBestAttempt(attempts);
 * console.log(best.result.score.raw); // 92
 * ```
 */
export function selectBestAttempt(
  statements: xAPIStatement[],
): xAPIStatement | null {
  if (statements.length === 0) return null;

  const getTimestamp = (statement: xAPIStatement): number => {
    const time = new Date(statement.timestamp ?? 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const sortByScoreThenTime = (items: xAPIStatement[]): xAPIStatement[] => {
    return [...items].sort((a, b) => {
      const scoreA =
        a.result?.score?.raw ??
        a.result?.score?.scaled ??
        Number.NEGATIVE_INFINITY;
      const scoreB =
        b.result?.score?.raw ??
        b.result?.score?.scaled ??
        Number.NEGATIVE_INFINITY;

      if (scoreA !== scoreB) return scoreB - scoreA;
      return getTimestamp(b) - getTimestamp(a);
    });
  };

  const sortByMostRecent = (items: xAPIStatement[]): xAPIStatement[] =>
    [...items].sort((a, b) => getTimestamp(b) - getTimestamp(a));

  const hasScores = statements.some(
    (statement) => extractScore(statement) !== null,
  );

  if (hasScores) {
    return sortByScoreThenTime(statements)[0];
  }

  const completedStatements = statements.filter((statement) =>
    isCompleted(statement),
  );
  if (completedStatements.length > 0) {
    return sortByMostRecent(completedStatements)[0];
  }

  return sortByMostRecent(statements)[0];
}

/**
 * Extracts score value from xAPI statement
 * Prioritizes result.score.raw over result.score.scaled
 *
 * @param statement - xAPI statement
 * @returns Score value or null if not present
 */
export function extractScore(statement: xAPIStatement): number | null {
  if (!statement.result?.score) return null;
  return statement.result.score.raw ?? statement.result.score.scaled ?? null;
}

/**
 * Checks if an xAPI statement represents a completed attempt
 * Checks both result.completion flag and completion verbs
 *
 * @param statement - xAPI statement
 * @returns True if completion flag is set or completion verb is used, false otherwise
 */
export function isCompleted(statement: xAPIStatement): boolean {
  // If completion flag is explicitly set, respect it
  if (statement.result?.completion !== undefined) {
    return statement.result.completion;
  }

  // Otherwise, check for completion verbs (HASKI custom + standard ADL)
  const completionVerbs = [
    'https://wiki.haski.app/variables/xapi.completed',
    'http://adlnet.gov/expapi/verbs/completed',
    'http://adlnet.gov/expapi/verbs/passed',
  ];

  return completionVerbs.includes(statement.verb?.id);
}
