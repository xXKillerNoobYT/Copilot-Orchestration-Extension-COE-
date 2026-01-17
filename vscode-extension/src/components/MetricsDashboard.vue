<template>
  <div class="metrics-dashboard">
    <header class="dashboard-header">
      <div>
        <h2>Metrics Dashboard</h2>
        <p class="subtitle">Task throughput, agent utilization, and errors</p>
      </div>
      <div class="header-controls">
        <div class="time-range-selector">
          <button 
            v-for="range in timeRanges" 
            :key="range.value"
            :class="['range-btn', { active: selectedRange === range.value }]"
            @click="selectTimeRange(range.value)"
          >
            {{ range.label }}
          </button>
        </div>
        <button class="refresh-btn" @click="refreshAll" :disabled="loading">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </header>

    <section class="cards">
      <div class="card">
        <div class="card-header">
          <span>Tasks</span>
          <small>Completion, status mix</small>
        </div>
        <div class="card-body">
          <div class="stat-grid">
            <div class="stat">
              <span class="label">Total</span>
              <span class="value">{{ taskMetrics?.counts.total ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">Completed</span>
              <span class="value success">{{ taskMetrics?.counts.completed ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">In Progress</span>
              <span class="value warning">{{ taskMetrics?.counts.in_progress ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">Pending</span>
              <span class="value">{{ taskMetrics?.counts.pending ?? '—' }}</span>
            </div>
          </div>
          <div class="metric-row">
            <span>Completion Rate</span>
            <strong>{{ (taskMetrics?.completionRate ?? 0).toFixed(1) }}%</strong>
          </div>
          <div class="metric-row">
            <span>Avg Cycle</span>
            <strong>{{ taskMetrics?.averageCycleDisplay ?? 'n/a' }}</strong>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span>Agents</span>
          <small>Utilization & throughput</small>
        </div>
        <div class="card-body">
          <div class="stat-grid">
            <div class="stat">
              <span class="label">Total</span>
              <span class="value">{{ agentMetrics?.counts.total_agents ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">Active</span>
              <span class="value success">{{ agentMetrics?.counts.active_agents ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">Execs</span>
              <span class="value">{{ agentMetrics?.counts.total_executions ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">Running</span>
              <span class="value warning">{{ agentMetrics?.currentRunningExecutions ?? '—' }}</span>
            </div>
          </div>
          <div class="metric-row">
            <span>Avg Execs/Agent</span>
            <strong>{{ agentMetrics?.avgExecutionsPerAgent ?? 0 }}</strong>
          </div>
          <div class="metric-row">
            <span>Utilization</span>
            <strong>{{ (agentMetrics?.utilization ?? 0).toFixed(2) }}</strong>
          </div>
          <div class="metric-row" v-if="agentMetrics?.busiestAgent">
            <span>Busiest</span>
            <strong>{{ agentMetrics?.busiestAgent?.name ?? agentMetrics?.busiestAgent?.agent_id }}</strong>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span>Errors</span>
          <small>Failure rate & recent</small>
        </div>
        <div class="card-body">
          <div class="stat-grid">
            <div class="stat">
              <span class="label">Executions</span>
              <span class="value">{{ errorMetrics?.failures.total_executions ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">Failed</span>
              <span class="value danger">{{ errorMetrics?.failures.failed_executions ?? '—' }}</span>
            </div>
            <div class="stat">
              <span class="label">Failure Rate</span>
              <span class="value danger">{{ (errorMetrics?.failures.failure_rate ?? 0).toFixed(1) }}%</span>
            </div>
          </div>
          <div class="errors" v-if="errorMetrics?.recent_errors?.length">
            <div class="error-item" v-for="err in errorMetrics.recent_errors" :key="err.completed_at + err.task_id">
              <div class="error-message">{{ err.message || 'Unknown error' }}</div>
              <div class="error-meta">Task {{ err.task_id }} · Agent {{ err.agent_id ?? 'n/a' }} · {{ err.completed_at }}</div>
            </div>
          </div>
          <div v-else class="empty">No recent errors</div>
        </div>
      </div>
    </section>

    <section class="chart-row">
      <div class="card">
        <div class="card-header">
          <span>Task Completion</span>
          <small>Tasks completed over time</small>
        </div>
        <div class="card-body">
          <canvas ref="completionCanvas" height="200"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span>Agent Utilization</span>
          <small>Executions per agent</small>
        </div>
        <div class="card-body">
          <canvas ref="utilizationCanvas" height="200"></canvas>
        </div>
      </div>
    </section>

    <section class="chart-row">
      <div class="card">
        <div class="card-header">
          <span>Error Severity</span>
          <small>Distribution by severity level</small>
        </div>
        <div class="card-body">
          <canvas ref="errorSeverityCanvas" height="200"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span>Status Mix</span>
          <small>Distribution of task states</small>
        </div>
        <div class="card-body">
          <canvas ref="statusCanvas" height="200"></canvas>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import Chart from 'chart.js/auto';
import { createMetricsService, type AgentMetricsResponse, type ErrorMetricsResponse, type TaskMetricsResponse } from '../services/metricsService';

interface Props {
  baseUrl: string;
}

type TimeRange = '24h' | '7d' | '30d';

const props = defineProps<Props>();
const service = createMetricsService(props.baseUrl);
const loading = ref(false);
const selectedRange = ref<TimeRange>('24h');
const taskMetrics = ref<TaskMetricsResponse | null>(null);
const agentMetrics = ref<AgentMetricsResponse | null>(null);
const errorMetrics = ref<ErrorMetricsResponse | null>(null);

const completionCanvas = ref<HTMLCanvasElement | null>(null);
const utilizationCanvas = ref<HTMLCanvasElement | null>(null);
const errorSeverityCanvas = ref<HTMLCanvasElement | null>(null);
const statusCanvas = ref<HTMLCanvasElement | null>(null);

let completionChart: Chart | null = null;
let utilizationChart: Chart | null = null;
let errorSeverityChart: Chart | null = null;
let statusChart: Chart | null = null;
let autoRefreshInterval: ReturnType<typeof setInterval> | null = null;

const timeRanges = [
  { label: '24h', value: '24h' as TimeRange },
  { label: '7d', value: '7d' as TimeRange },
  { label: '30d', value: '30d' as TimeRange },
];

function selectTimeRange(range: TimeRange) {
  selectedRange.value = range;
  refreshAll();
}

async function refreshAll() {
  loading.value = true;
  try {
    const [t, a, e] = await Promise.all([
      service.getTaskMetrics(selectedRange.value),
      service.getAgentMetrics(selectedRange.value),
      service.getErrorMetrics(selectedRange.value),
    ]);
    taskMetrics.value = t;
    agentMetrics.value = a;
    errorMetrics.value = e;

    renderCharts();
  } finally {
    loading.value = false;
  }
}

function setupAutoRefresh() {
  // Auto-refresh every 30 seconds
  autoRefreshInterval = setInterval(() => {
    refreshAll();
  }, 30000);
}

onMounted(() => {
  refreshAll();
  setupAutoRefresh();
});

onBeforeUnmount(() => {
  completionChart?.destroy();
  utilizationChart?.destroy();
  errorSeverityChart?.destroy();
  statusChart?.destroy();
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
});

function renderCharts() {
  renderTaskCompletionChart();
  renderAgentUtilizationChart();
  renderErrorSeverityChart();
  renderStatusMixChart();
}

function renderTaskCompletionChart() {
  if (completionCanvas.value && taskMetrics.value) {
    completionChart?.destroy();
    
    // Generate sample data for task completion over time
    // In a real implementation, this would come from the API
    const labels = generateTimeLabels(selectedRange.value);
    const data = generateSampleCompletionData(taskMetrics.value.counts.completed, labels.length);
    
    completionChart = new Chart(completionCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Completed Tasks',
            data,
            borderColor: '#4ec9b0',
            backgroundColor: 'rgba(78, 201, 176, 0.1)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: true, position: 'bottom' },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }
}

function renderAgentUtilizationChart() {
  if (utilizationCanvas.value && agentMetrics.value) {
    utilizationChart?.destroy();
    
    // Generate sample agent utilization data
    const agentNames = ['Agent-1', 'Agent-2', 'Agent-3', 'Agent-4', 'Agent-5'];
    const executionCounts = generateSampleAgentData(agentMetrics.value.counts.total_executions);
    
    utilizationChart = new Chart(utilizationCanvas.value, {
      type: 'bar',
      data: {
        labels: agentNames,
        datasets: [
          {
            label: 'Executions',
            data: executionCounts,
            backgroundColor: '#3a96dd',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true },
        },
      },
    });
  }
}

function renderErrorSeverityChart() {
  if (errorSeverityCanvas.value && errorMetrics.value) {
    errorSeverityChart?.destroy();
    
    // Generate sample error severity distribution
    const totalErrors = errorMetrics.value.failures.failed_executions;
    const severityData = generateSampleSeverityData(totalErrors);
    
    errorSeverityChart = new Chart(errorSeverityCanvas.value, {
      type: 'pie',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [
          {
            data: severityData,
            backgroundColor: ['#f48771', '#cc5500', '#cca700', '#6c6c6c'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom' },
        },
      },
    });
  }
}

function renderStatusMixChart() {
  if (statusCanvas.value && taskMetrics.value) {
    const { completed, in_progress, pending, blocked, failed } = taskMetrics.value.counts;
    statusChart?.destroy();
    statusChart = new Chart(statusCanvas.value, {
      type: 'doughnut',
      data: {
        labels: ['Completed', 'In Progress', 'Pending', 'Blocked', 'Failed'],
        datasets: [
          {
            data: [completed, in_progress, pending, blocked, failed],
            backgroundColor: ['#4ec9b0', '#cca700', '#6c6c6c', '#cc5500', '#f48771'],
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: { legend: { position: 'bottom' } },
        responsive: true,
      },
    });
  }
}

// Helper functions to generate sample data
function generateTimeLabels(range: TimeRange): string[] {
  const now = new Date();
  const labels: string[] = [];
  
  if (range === '24h') {
    for (let i = 23; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60 * 60 * 1000);
      labels.push(time.getHours() + ':00');
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

function generateSampleCompletionData(total: number, count: number): number[] {
  const data: number[] = [];
  const increment = total / count;
  for (let i = 0; i < count; i++) {
    data.push(Math.floor(increment * i + Math.random() * increment));
  }
  return data;
}

function generateSampleAgentData(totalExecutions: number): number[] {
  const data: number[] = [];
  let remaining = totalExecutions;
  for (let i = 0; i < 4; i++) {
    const value = Math.floor(Math.random() * (remaining / 2));
    data.push(value);
    remaining -= value;
  }
  data.push(remaining);
  return data;
}

function generateSampleSeverityData(totalErrors: number): number[] {
  if (totalErrors === 0) return [0, 0, 0, 0];
  
  const critical = Math.floor(totalErrors * 0.1);
  const high = Math.floor(totalErrors * 0.2);
  const medium = Math.floor(totalErrors * 0.4);
  const low = totalErrors - critical - high - medium;
  
  return [critical, high, medium, low];
}
</script>

<style scoped>
.metrics-dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--vscode-foreground);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.header-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.time-range-selector {
  display: flex;
  gap: 4px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
  padding: 2px;
  background: var(--vscode-editor-background);
}

.range-btn {
  padding: 6px 12px;
  background: transparent;
  color: var(--vscode-foreground);
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.range-btn:hover {
  background: var(--vscode-list-hoverBackground);
}

.range-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.subtitle {
  margin: 0;
  color: var(--vscode-descriptionForeground);
}

.refresh-btn {
  padding: 8px 12px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  border: 1px solid var(--vscode-button-border, transparent);
  border-radius: 4px;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background: var(--vscode-editor-background);
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.chart-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.card-header {
  padding: 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
  font-weight: 600;
  display: flex;
  flex-direction: column;
}

.card-header small {
  color: var(--vscode-descriptionForeground);
  font-weight: 400;
}

.card-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stat {
  padding: 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
}

.label {
  display: block;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.value {
  font-size: 16px;
  font-weight: 700;
}

.value.success { color: #4ec9b0; }
.value.warning { color: #cca700; }
.value.danger { color: #f48771; }

.metric-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.errors {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-item {
  padding: 8px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 4px;
}

.error-message { font-weight: 600; }
.error-meta { color: var(--vscode-descriptionForeground); font-size: 12px; }

.empty {
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
}
</style>
