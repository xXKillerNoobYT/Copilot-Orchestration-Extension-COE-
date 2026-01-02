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
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('parent_task_id')->nullable()->constrained('tasks')->cascadeOnDelete();
            $table->integer('github_issue_id')->nullable();
            $table->string('github_issue_url')->nullable();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('task_type', ['feature', 'bug', 'refactor', 'maintenance', 'architecture', 'testing', 'documentation'])->default('feature');
            $table->enum('priority', ['critical', 'high', 'medium', 'low'])->default('medium');
            $table->enum('status', ['pending', 'approved', 'in_progress', 'testing', 'review', 'completed', 'failed', 'blocked', 'cancelled'])->default('pending');
            $table->string('assigned_agent')->nullable();
            $table->string('assigned_github_agent')->nullable();
            $table->string('branch_name')->nullable();
            $table->string('context_bundle_path')->nullable();
            $table->integer('estimated_effort')->nullable()->comment('in minutes');
            $table->integer('actual_effort')->nullable()->comment('in minutes');
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('project_id');
            $table->index('parent_task_id');
            $table->index('github_issue_id');
            $table->index('status');
            $table->index(['priority', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
