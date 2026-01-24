/**
 * Shared utility functions for task-related formatting
 */

/**
 * Format minutes to hours with one decimal place
 * Used for effort display in task details
 */
export function formatMinutesToHours(minutes: number): number {
  return Math.round(minutes / 60 * 10) / 10;
}

/**
 * Format minutes to human-readable duration string
 */
export function formatMinutesToDuration(minutes: number): string {
  // Truncate decimals
  const absMinutes = Math.floor(Math.abs(minutes));
  const sign = minutes < 0 ? '-' : '';

  if (absMinutes < 60) {
    return `${sign}${absMinutes}m`;
  }
  const hours = Math.floor(absMinutes / 60);
  const remainingMinutes = absMinutes % 60;
  if (remainingMinutes === 0) {
    return `${sign}${hours}h`;
  }
  if (sign) {
    return `${sign}${hours}h ${sign}${remainingMinutes}m`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
