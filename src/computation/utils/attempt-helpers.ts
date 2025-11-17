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

  // Sort by score (desc), then timestamp (desc)
  const sorted = [...statements].sort((a, b) => {
    // Extract scores: prefer raw over scaled
    const scoreA = a.result?.score?.raw ?? a.result?.score?.scaled ?? -Infinity;
    const scoreB = b.result?.score?.raw ?? b.result?.score?.scaled ?? -Infinity;

    if (scoreA !== scoreB) return scoreB - scoreA;

    // Tie-break by timestamp (most recent first)
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  return sorted[0];
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
 *
 * @param statement - xAPI statement
 * @returns True if completion flag is set, false otherwise
 */
export function isCompleted(statement: xAPIStatement): boolean {
  return statement.result?.completion ?? false;
}
