<template>
  <div class="metrics-dashboard">
    <header class="dashboard-header">
      <div>
        <h2>Metrics Dashboard</h2>
        <p class="subtitle">Task throughput, agent utilization, and errors</p>
      </div>
      <button class="refresh-btn" @click="refreshAll" :disabled="loading">
        {{ loading ? 'Refreshing…' : 'Refresh' }}
      </button>
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
          <span>Status Mix</span>
          <small>Distribution of task states</small>
        </div>
        <div class="card-body">
          <canvas ref="statusCanvas" height="200"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span>Failures</span>
          <small>Executions vs failures</small>
        </div>
        <div class="card-body">
          <canvas ref="failureCanvas" height="200"></canvas>
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

const props = defineProps<Props>();
const service = createMetricsService(props.baseUrl);
const loading = ref(false);
const taskMetrics = ref<TaskMetricsResponse | null>(null);
const agentMetrics = ref<AgentMetricsResponse | null>(null);
const errorMetrics = ref<ErrorMetricsResponse | null>(null);
const statusCanvas = ref<HTMLCanvasElement | null>(null);
const failureCanvas = ref<HTMLCanvasElement | null>(null);
let statusChart: Chart | null = null;
let failureChart: Chart | null = null;

async function refreshAll() {
  loading.value = true;
  try {
    const [t, a, e] = await Promise.all([
      service.getTaskMetrics(),
      service.getAgentMetrics(),
      service.getErrorMetrics(),
    ]);
    taskMetrics.value = t;
    agentMetrics.value = a;
    errorMetrics.value = e;

    renderCharts();
  } finally {
    loading.value = false;
  }
}

onMounted(refreshAll);

onBeforeUnmount(() => {
  statusChart?.destroy();
  failureChart?.destroy();
});

function renderCharts() {
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

  if (failureCanvas.value && errorMetrics.value) {
    const { failure_rate, failed_executions, total_executions } = errorMetrics.value.failures;
    failureChart?.destroy();
    failureChart = new Chart(failureCanvas.value, {
      type: 'bar',
      data: {
        labels: ['Total Execs', 'Failed'],
        datasets: [
          {
            label: 'Executions',
            data: [total_executions, failed_executions],
            backgroundColor: ['#3a96dd', '#f48771'],
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterBody: () => `Failure rate: ${failure_rate}%`,
            },
          },
        },
        responsive: true,
        scales: { y: { beginAtZero: true } },
      },
    });
  }
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

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

.card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  background: var(--vscode-editor-background);

.chart-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
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
