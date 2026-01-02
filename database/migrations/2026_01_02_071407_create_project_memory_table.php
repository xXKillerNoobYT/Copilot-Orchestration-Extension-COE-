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
        Schema::create('project_memory', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->enum('memory_type', ['pattern', 'anti_pattern', 'convention', 'best_practice', 'lesson_learned'])->default('pattern');
            $table->string('title');
            $table->text('content');
            $table->json('context')->nullable();
            $table->float('confidence')->default(0.5);
            $table->integer('usage_count')->default(0);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamps();

            $table->index('project_id');
            $table->index('memory_type');
            $table->index('confidence');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_memory');
    }
};
