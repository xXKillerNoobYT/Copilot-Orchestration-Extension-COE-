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
        Schema::create('workflow_states', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('task_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('workflow_type', ['planning', 'development', 'testing', 'review', 'deployment', 'maintenance'])->default('development');
            $table->string('state');
            $table->string('previous_state')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('transitioned_at');
            $table->timestamp('created_at');

            $table->index('project_id');
            $table->index('task_id');
            $table->index('workflow_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('workflow_states');
    }
};
