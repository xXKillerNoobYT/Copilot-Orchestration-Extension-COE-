<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Creates the metrics_events table for recording individual telemetry events:
     * - Task completion events
     * - Execution time measurements
     * - Error events
     * - User action events
     * - Agent execution events
     * 
     * This table enables time-series analysis and KPI aggregation.
     */
    public function up(): void
    {
        Schema::create('metrics_events', function (Blueprint $table) {
            $table->id();
            
            // Event classification
            $table->enum('event_type', [
                'task_completed',
                'task_started',
                'task_failed',
                'execution_time',
                'error_occurred',
                'user_action',
                'agent_execution',
                'api_call',
                'test_run',
                'deployment',
                'branch_created',
                'branch_merged',
            ]);
            
            // Metric name (e.g., 'task_duration_seconds', 'error_rate', 'test_coverage_percent')
            $table->string('metric_name');
            
            // The recorded value
            $table->decimal('value', 10, 2);
            
            // Dimensional data for analysis
            $table->unsignedBigInteger('user_id')->nullable()->index();
            $table->unsignedBigInteger('project_id')->nullable()->index();
            $table->unsignedBigInteger('task_id')->nullable()->index();
            $table->unsignedBigInteger('agent_id')->nullable()->index();
            
            // Optional context
            $table->string('context_key')->nullable(); // e.g., 'component_name', 'endpoint'
            $table->string('context_value')->nullable(); // e.g., 'MetricsService', '/api/tasks'
            
            // Additional metadata as JSON
            $table->json('metadata')->nullable(); // Additional context (error_message, stack_trace, etc.)
            
            // Timestamps
            $table->timestamp('recorded_at')->index(); // When the event was recorded
            $table->timestamps(); // created_at, updated_at
            
            // Indexes for efficient querying
            $table->index(['event_type', 'recorded_at']);
            $table->index(['metric_name', 'recorded_at']);
            $table->index(['task_id', 'event_type']);
            $table->index(['agent_id', 'recorded_at']);
            $table->index(['user_id', 'recorded_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('metrics_events');
    }
};
