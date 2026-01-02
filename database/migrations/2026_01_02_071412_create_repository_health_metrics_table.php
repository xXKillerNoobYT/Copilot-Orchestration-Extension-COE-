<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('repository_health_metrics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->date('metric_date');
            $table->integer('commit_count')->default(0);
            $table->integer('pr_count')->default(0);
            $table->float('test_coverage_percent')->nullable();
            $table->float('dependency_freshness_score')->nullable()->comment('0-100');
            $table->float('ci_stability_percent')->nullable()->comment('0-100');
            $table->float('architecture_drift_score')->nullable()->comment('0-100, higher = more drift');
            $table->integer('technical_debt_items')->default(0);
            $table->timestamp('created_at');

            $table->unique(['project_id', 'metric_date']);
            $table->index('project_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repository_health_metrics');
    }
};
