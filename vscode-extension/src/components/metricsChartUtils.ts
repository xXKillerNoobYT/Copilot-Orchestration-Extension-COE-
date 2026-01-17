/**
 * Shared utility functions for metrics dashboard chart data generation
 */

export type TimeRange = '24h' | '7d' | '30d';

/**
 * Generate time labels for charts based on the selected time range
 */
export function generateTimeLabels(range: TimeRange): string[] {
  const now = new Date();
  const labels: string[] = [];
  
  if (range === '24h') {
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hour = time.getHours().toString().padStart(2, '0');
      labels.push(`${hour}:00`);
    }
  } else if (range === '7d') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
  } else {
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
  }
  
  return labels;
}

/**
 * Generate sample completion data for visualization
 * Uses deterministic distribution based on total value
 */
export function generateSampleCompletionData(total: number, count: number): number[] {
  const data: number[] = [];
  const increment = total / count;
  // Use deterministic distribution based on the total value
  for (let i = 0; i < count; i++) {
    // Create a smooth progression with slight variation based on position
    const variation = Math.sin(i * 0.5) * increment * 0.1;
    data.push(Math.floor(increment * i + variation));
  }
  return data;
}

/**
 * Generate sample agent execution data for visualization
 * Uses deterministic distribution based on total executions
 */
export function generateSampleAgentData(totalExecutions: number): number[] {
  const data: number[] = [];
  let remaining = totalExecutions;
  // Use deterministic distribution based on total executions
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Predefined distribution
  for (let i = 0; i < weights.length - 1; i++) {
    const value = Math.floor(totalExecutions * weights[i]);
    data.push(value);
    remaining -= value;
  }
  data.push(remaining); // Remainder goes to last agent
  return data;
}

/**
 * Generate sample error severity data for visualization
 */
export function generateSampleSeverityData(totalErrors: number): number[] {
  if (totalErrors === 0) return [0, 0, 0, 0];
  
  const critical = Math.floor(totalErrors * 0.1);
  const high = Math.floor(totalErrors * 0.2);
  const medium = Math.floor(totalErrors * 0.4);
  const low = totalErrors - critical - high - medium;
  
  return [critical, high, medium, low];
}
