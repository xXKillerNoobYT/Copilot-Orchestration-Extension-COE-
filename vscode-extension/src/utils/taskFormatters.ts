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
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}
