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
        Schema::create('context_bundles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('agent_id')->constrained()->cascadeOnDelete();
            $table->enum('bundle_type', ['task_context', 'architecture_context', 'test_context', 'issue_context'])->default('task_context');
            $table->json('files_included')->nullable();
            $table->text('architecture_notes')->nullable();
            $table->json('constraints')->nullable();
            $table->json('test_failures')->nullable();
            $table->timestamp('created_at');

            $table->index('task_id');
            $table->index('agent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('context_bundles');
    }
};
