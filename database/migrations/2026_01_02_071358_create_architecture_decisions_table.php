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
        Schema::create('architecture_decisions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('task_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('decision');
            $table->text('rationale')->nullable();
            $table->text('alternatives_considered')->nullable();
            $table->text('consequences')->nullable();
            $table->enum('status', ['proposed', 'accepted', 'deprecated', 'superseded'])->default('proposed');
            $table->foreignUuid('superseded_by_id')->nullable()->constrained('architecture_decisions')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index('project_id');
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('architecture_decisions');
    }
};
