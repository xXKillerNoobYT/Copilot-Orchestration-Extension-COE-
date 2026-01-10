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
        Schema::create('repository_branches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('repository_id');
            $table->string('name');
            $table->enum('type', ['main', 'feature', 'hotfix', 'release', 'integration'])->default('feature');
            $table->uuid('task_id')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('last_commit_at')->nullable();
            $table->enum('last_ci_status', ['pending', 'success', 'failure'])->default('pending');
            $table->boolean('protected')->default(false);
            $table->timestamp('updated_at')->nullable();
            
            // Indexes
            $table->unique(['repository_id', 'name']);
            $table->foreign('repository_id')->references('id')->on('repositories')->onDelete('cascade');
            $table->foreign('task_id')->references('id')->on('tasks')->onDelete('set null');
            $table->index('type');
            $table->index('last_ci_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repository_branches');
    }
};
