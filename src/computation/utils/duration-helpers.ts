// Implements REQ-FN-004: Duration parsing utility for CSV metrics
// Shared utility for time-based metrics

/**
 * Parse ISO 8601 duration format to total seconds
 * Handles hours, minutes, and seconds components
 *
 * @param duration - ISO 8601 duration string (e.g., 'PT1H30M45S', 'PT45M', 'PT30S')
 * @returns Total duration in seconds, or 0 if invalid format
 *
 * @remarks
 * - Supports hours (H), minutes (M), seconds (S) components
 * - Expects 'PT' prefix (Period of Time)
 * - Returns 0 for invalid or missing duration strings
 * - Handles decimal values (e.g., 'PT1.5H' = 5400 seconds)
 *
 * @example
 * ```typescript
 * parseDuration('PT1H30M45S') // 5445 seconds
 * parseDuration('PT45M')      // 2700 seconds
 * parseDuration('PT30S')      // 30 seconds
 * parseDuration('PT1.5H')     // 5400 seconds
 * ```
 */
export function parseDuration(duration: string): number {
  if (!duration || !duration.startsWith('PT')) {
    return 0;
  }

  let seconds = 0;
  const durationStr = duration.substring(2); // Remove 'PT' prefix

  // Parse hours
  const hoursMatch = durationStr.match(/(\d+(?:\.\d+)?)H/);
  if (hoursMatch) {
    seconds += parseFloat(hoursMatch[1]) * 3600;
  }

  // Parse minutes
  const minutesMatch = durationStr.match(/(\d+(?:\.\d+)?)M/);
  if (minutesMatch) {
    seconds += parseFloat(minutesMatch[1]) * 60;
  }

  // Parse seconds
  const secondsMatch = durationStr.match(/(\d+(?:\.\d+)?)S/);
  if (secondsMatch) {
    seconds += parseFloat(secondsMatch[1]);
  }

  return seconds;
}
