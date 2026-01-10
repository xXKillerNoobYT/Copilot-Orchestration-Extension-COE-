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
        Schema::create('branches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('task_id')->nullable()->constrained()->nullOnDelete();
            $table->string('branch_name');
            $table->enum('branch_type', ['feature', 'hotfix', 'release', 'integration'])->default('feature');
            $table->string('base_branch')->default('main');
            $table->enum('status', ['active', 'merged', 'deleted', 'stale'])->default('active');
            $table->enum('ci_status', ['pending', 'passing', 'failing', 'unknown'])->default('unknown');
            $table->timestamp('merged_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['project_id', 'branch_name']);
            $table->index('task_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('branches');
    }
};
