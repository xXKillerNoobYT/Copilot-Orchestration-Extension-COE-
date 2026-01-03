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
        Schema::create('task_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('approved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            
            $table->text('requirement')->comment('Original user requirement');
            $table->json('parsed_requirement')->nullable()->comment('Structured parsed requirement');
            $table->json('generated_tasks')->comment('Task hierarchy with subtasks');
            $table->json('dependencies')->nullable()->comment('Task dependencies');
            $table->json('architecture_design')->nullable()->comment('Architecture design if generated');
            
            $table->enum('status', ['draft', 'pending_approval', 'approved', 'rejected', 'implemented'])->default('draft');
            $table->enum('complexity', ['simple', 'moderate', 'complex', 'very_complex'])->nullable();
            
            $table->integer('estimated_hours')->nullable();
            $table->integer('version')->default(1);
            
            $table->text('rejection_reason')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();
            
            $table->index('project_id');
            $table->index('created_by_user_id');
            $table->index('status');
            $table->index(['project_id', 'status']);
            $table->index('complexity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_plans');
    }
};
