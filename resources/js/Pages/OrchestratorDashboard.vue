<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Head } from '@inertiajs/vue3';
import axios from 'axios';

// Props
interface Props {
    projectId?: string;
    refreshInterval?: number;
    executionLogLimit?: number;
}

const props = withDefaults(defineProps<Props>(), {
    projectId: 'default',
    refreshInterval: 10000, // 10 seconds
    executionLogLimit: 50
});

// Constants
const ID_TRUNCATE_LENGTH = 8;

// Types
interface Agent {
    id: string;
    name: string;
    type: string;
    is_active: boolean;
    description?: string;
    capabilities?: string[];
}

interface Task {
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'failed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    task_type: string;
    assigned_agent?: string;
    created_at: string;
}

interface ExecutionLog {
    id: string;
    task_id: string;
    agent_id: string;
    status: string;
    started_at: string;
    completed_at?: string;
    error_message?: string;
}

interface PerformanceMetrics {
    tasks: {
        counts: {
            total: number;
            pending: number;
            in_progress: number;
            completed: number;
            failed: number;
            blocked: number;
        };
        completionRate: number;
    };
    agents: {
        counts: {
            total_agents: number;
            active_agents: number;
        };
        utilization: number;
    };
    errors: {
        failures: {
            total_executions: number;
            failed_executions: number;
            failure_rate: number;
        };
    };
}

// State
const agents = ref<Agent[]>([]);
const tasks = ref<Task[]>([]);
const executionLogs = ref<ExecutionLog[]>([]);
const metrics = ref<PerformanceMetrics | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const draggedTask = ref<Task | null>(null);

// Computed
const readyTasks = computed(() => tasks.value.filter(t => t.status === 'pending'));
const inProgressTasks = computed(() => tasks.value.filter(t => t.status === 'in_progress'));
const blockedTasks = computed(() => tasks.value.filter(t => t.status === 'blocked'));
const activeAgents = computed(() => agents.value.filter(a => a.is_active));

// Methods
let abortController: AbortController | null = null;

async function fetchData() {
    try {
        // Cancel previous request if still pending
        if (abortController) {
            abortController.abort();
        }
        
        abortController = new AbortController();
        loading.value = true;
        error.value = null;

        const [agentsRes, tasksRes, metricsRes, executionsRes] = await Promise.all([
            axios.get('/api/v1/agents', { signal: abortController.signal }),
            axios.get(`/api/v1/projects/${props.projectId}/tasks`, { signal: abortController.signal }),
            axios.get('/api/v1/metrics/health', { signal: abortController.signal }),
            axios.get(`/api/v1/monitoring/executions?limit=${props.executionLogLimit}`, { signal: abortController.signal })
        ]);

        agents.value = agentsRes.data.data || [];
        tasks.value = tasksRes.data.data || [];
        metrics.value = metricsRes.data;
        executionLogs.value = executionsRes.data.data || [];
    } catch (err: any) {
        if (err.name === 'CanceledError') {
            return; // Request was cancelled, ignore
        }
        error.value = err.message || 'Failed to fetch dashboard data';
        console.error('Dashboard fetch error:', err);
    } finally {
        loading.value = false;
        abortController = null;
    }
}

// Drag and Drop handlers
function onDragStart(task: Task) {
    draggedTask.value = task;
}

function onDragOver(event: DragEvent) {
    event.preventDefault();
}

async function onDrop(event: DragEvent, targetStatus: Task['status']) {
    event.preventDefault();
    if (!draggedTask.value) return;

    const task = draggedTask.value;
    if (task.status === targetStatus) {
        draggedTask.value = null;
        return;
    }

    try {
        await axios.patch(`/api/v1/tasks/${task.id}/status`, {
            status: targetStatus
        });

        // Update local state
        const taskIndex = tasks.value.findIndex(t => t.id === task.id);
        if (taskIndex !== -1) {
            tasks.value[taskIndex].status = targetStatus;
        }
    } catch (err: any) {
        error.value = `Failed to update task status: ${err.message}`;
    } finally {
        draggedTask.value = null;
    }
}

function onDragEnd() {
    draggedTask.value = null;
}

function formatDate(date: string): string {
    try {
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return 'Invalid date';
        }
        return dateObj.toLocaleString();
    } catch (err) {
        return 'Invalid date';
    }
}

function truncateId(id: string): string {
    return id.substring(0, ID_TRUNCATE_LENGTH) + '...';
}

function getStatusColor(status: string) {
    const colors: Record<string, string> = {
        pending: 'bg-gray-100 text-gray-800',
        in_progress: 'bg-blue-100 text-blue-800',
        blocked: 'bg-red-100 text-red-800',
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-200 text-red-900',
        running: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getPriorityColor(priority: string) {
    const colors: Record<string, string> = {
        low: 'bg-gray-200',
        medium: 'bg-yellow-200',
        high: 'bg-orange-200',
        critical: 'bg-red-200'
    };
    return colors[priority] || 'bg-gray-200';
}

// Polling for updates
let pollInterval: number | undefined;

onMounted(() => {
    fetchData();
    // Use configurable refresh interval
    pollInterval = window.setInterval(fetchData, props.refreshInterval);
});

onUnmounted(() => {
    // Cancel any pending requests
    if (abortController) {
        abortController.abort();
    }
    
    // Clear polling interval
    if (pollInterval) {
        clearInterval(pollInterval);
    }
});
</script>

<template>
    <Head title="Orchestrator Dashboard" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex justify-between items-center">
                <h2 class="font-semibold text-xl text-gray-800 leading-tight">
                    Programming Orchestrator Dashboard
                </h2>
                <button 
                    @click="fetchData" 
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                    Refresh
                </button>
            </div>
        </template>

        <div class="py-6">
            <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                <!-- Error Message -->
                <div v-if="error" class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
                    {{ error }}
                </div>

                <!-- Loading State -->
                <div v-if="loading && !metrics" class="text-center py-12">
                    <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p class="mt-4 text-gray-600">Loading dashboard data...</p>
                </div>

                <template v-else>
                    <!-- Agent Status Cards -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Agent Status</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <!-- Summary Card -->
                            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                                <div class="text-sm font-medium text-blue-800">Total Agents</div>
                                <div class="mt-2 text-3xl font-bold text-blue-900">{{ agents.length }}</div>
                                <div class="mt-1 text-xs text-blue-700">
                                    {{ activeAgents.length }} active
                                </div>
                            </div>

                            <!-- Agent Cards -->
                            <div 
                                v-for="agent in activeAgents.slice(0, 6)" 
                                :key="agent.id"
                                class="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition"
                            >
                                <div class="flex items-center justify-between mb-2">
                                    <div class="text-sm font-semibold text-gray-900 truncate">
                                        {{ agent.name }}
                                    </div>
                                    <div class="flex-shrink-0 h-2 w-2 bg-green-500 rounded-full"></div>
                                </div>
                                <div class="text-xs text-gray-600 mb-2">{{ agent.type }}</div>
                                <div class="text-xs text-gray-500 line-clamp-2">
                                    {{ agent.description || 'No description' }}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Task Queue Visualizer -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Task Queue</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <!-- Ready Column -->
                            <div 
                                class="bg-gray-50 rounded-lg p-4 min-h-[400px]"
                                @dragover="onDragOver"
                                @drop="onDrop($event, 'pending')"
                            >
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="font-semibold text-gray-900">Ready</h4>
                                    <span class="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded-full">
                                        {{ readyTasks.length }}
                                    </span>
                                </div>
                                <div class="space-y-2">
                                    <div 
                                        v-for="task in readyTasks" 
                                        :key="task.id"
                                        draggable="true"
                                        @dragstart="onDragStart(task)"
                                        @dragend="onDragEnd"
                                        class="bg-white rounded-md p-3 border border-gray-200 cursor-move hover:shadow-md transition"
                                    >
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="flex-1 min-w-0">
                                                <div class="text-sm font-medium text-gray-900 truncate">
                                                    {{ task.name }}
                                                </div>
                                                <div class="text-xs text-gray-500 mt-1">
                                                    {{ task.task_type }}
                                                </div>
                                            </div>
                                            <div 
                                                :class="[getPriorityColor(task.priority), 'w-2 h-2 rounded-full flex-shrink-0 mt-1']"
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- In Progress Column -->
                            <div 
                                class="bg-blue-50 rounded-lg p-4 min-h-[400px]"
                                @dragover="onDragOver"
                                @drop="onDrop($event, 'in_progress')"
                            >
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="font-semibold text-gray-900">In Progress</h4>
                                    <span class="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                                        {{ inProgressTasks.length }}
                                    </span>
                                </div>
                                <div class="space-y-2">
                                    <div 
                                        v-for="task in inProgressTasks" 
                                        :key="task.id"
                                        draggable="true"
                                        @dragstart="onDragStart(task)"
                                        @dragend="onDragEnd"
                                        class="bg-white rounded-md p-3 border border-blue-200 cursor-move hover:shadow-md transition"
                                    >
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="flex-1 min-w-0">
                                                <div class="text-sm font-medium text-gray-900 truncate">
                                                    {{ task.name }}
                                                </div>
                                                <div class="text-xs text-gray-500 mt-1">
                                                    {{ task.assigned_agent || 'Unassigned' }}
                                                </div>
                                            </div>
                                            <div 
                                                :class="[getPriorityColor(task.priority), 'w-2 h-2 rounded-full flex-shrink-0 mt-1']"
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Blocked Column -->
                            <div 
                                class="bg-red-50 rounded-lg p-4 min-h-[400px]"
                                @dragover="onDragOver"
                                @drop="onDrop($event, 'blocked')"
                            >
                                <div class="flex items-center justify-between mb-4">
                                    <h4 class="font-semibold text-gray-900">Blocked</h4>
                                    <span class="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                                        {{ blockedTasks.length }}
                                    </span>
                                </div>
                                <div class="space-y-2">
                                    <div 
                                        v-for="task in blockedTasks" 
                                        :key="task.id"
                                        draggable="true"
                                        @dragstart="onDragStart(task)"
                                        @dragend="onDragEnd"
                                        class="bg-white rounded-md p-3 border border-red-200 cursor-move hover:shadow-md transition"
                                    >
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="flex-1 min-w-0">
                                                <div class="text-sm font-medium text-gray-900 truncate">
                                                    {{ task.name }}
                                                </div>
                                                <div class="text-xs text-gray-500 mt-1">
                                                    {{ task.task_type }}
                                                </div>
                                            </div>
                                            <div 
                                                :class="[getPriorityColor(task.priority), 'w-2 h-2 rounded-full flex-shrink-0 mt-1']"
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Live Execution Logs -->
                    <div class="bg-white rounded-lg shadow-sm p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Live Execution Logs</h3>
                        <div class="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                            <div v-if="executionLogs.length === 0" class="text-gray-400 text-sm">
                                No execution logs available
                            </div>
                            <div v-else class="space-y-2 font-mono text-sm">
                                <div 
                                    v-for="log in executionLogs.slice(0, 20)" 
                                    :key="log.id"
                                    class="flex items-start gap-3"
                                >
                                    <span class="text-gray-500 text-xs">
                                        {{ formatDate(log.started_at) }}
                                    </span>
                                    <span 
                                        :class="[getStatusColor(log.status), 'px-2 py-0.5 rounded text-xs']"
                                    >
                                        {{ log.status }}
                                    </span>
                                    <span class="text-gray-300 flex-1">
                                        Task: {{ truncateId(log.task_id) }} 
                                        Agent: {{ truncateId(log.agent_id) }}
                                        <span v-if="log.error_message" class="text-red-400">
                                            Error: {{ log.error_message }}
                                        </span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Performance Metrics Charts -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <!-- Task Metrics -->
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <h4 class="font-semibold text-gray-900 mb-4">Task Metrics</h4>
                            <div v-if="metrics" class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Total Tasks</span>
                                    <span class="text-lg font-bold text-gray-900">
                                        {{ metrics.tasks.counts.total }}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Completed</span>
                                    <span class="text-lg font-bold text-green-600">
                                        {{ metrics.tasks.counts.completed }}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">In Progress</span>
                                    <span class="text-lg font-bold text-blue-600">
                                        {{ metrics.tasks.counts.in_progress }}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Completion Rate</span>
                                    <span class="text-lg font-bold text-gray-900">
                                        {{ metrics.tasks.completionRate.toFixed(1) }}%
                                    </span>
                                </div>
                                <!-- Progress Bar -->
                                <div class="mt-4">
                                    <div class="bg-gray-200 rounded-full h-2">
                                        <div 
                                            class="bg-green-500 h-2 rounded-full transition-all duration-500"
                                            :style="{ width: `${metrics.tasks.completionRate}%` }"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Agent Metrics -->
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <h4 class="font-semibold text-gray-900 mb-4">Agent Metrics</h4>
                            <div v-if="metrics" class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Total Agents</span>
                                    <span class="text-lg font-bold text-gray-900">
                                        {{ metrics.agents.counts.total_agents }}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Active Agents</span>
                                    <span class="text-lg font-bold text-green-600">
                                        {{ metrics.agents.counts.active_agents }}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Utilization</span>
                                    <span class="text-lg font-bold text-gray-900">
                                        {{ metrics.agents.utilization.toFixed(1) }}%
                                    </span>
                                </div>
                                <!-- Progress Bar -->
                                <div class="mt-4">
                                    <div class="bg-gray-200 rounded-full h-2">
                                        <div 
                                            class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                            :style="{ width: `${metrics.agents.utilization}%` }"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Error Metrics -->
                        <div class="bg-white rounded-lg shadow-sm p-6">
                            <h4 class="font-semibold text-gray-900 mb-4">Error Metrics</h4>
                            <div v-if="metrics" class="space-y-3">
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Total Executions</span>
                                    <span class="text-lg font-bold text-gray-900">
                                        {{ metrics.errors.failures.total_executions }}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Failed</span>
                                    <span class="text-lg font-bold text-red-600">
                                        {{ metrics.errors.failures.failed_executions }}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-sm text-gray-600">Failure Rate</span>
                                    <span class="text-lg font-bold text-gray-900">
                                        {{ metrics.errors.failures.failure_rate.toFixed(1) }}%
                                    </span>
                                </div>
                                <!-- Progress Bar -->
                                <div class="mt-4">
                                    <div class="bg-gray-200 rounded-full h-2">
                                        <div 
                                            class="bg-red-500 h-2 rounded-full transition-all duration-500"
                                            :style="{ width: `${metrics.errors.failures.failure_rate}%` }"
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </AuthenticatedLayout>
</template>
