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
        Schema::create('agents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name')->unique();
            $table->enum('type', ['planner', 'architect', 'coder', 'tester', 'reviewer', 'documentation', 'deployment', 'maintenance']);
            $table->text('description')->nullable();
            $table->json('capabilities')->nullable();
            $table->json('configuration')->nullable();
            $table->enum('llm_provider', ['copilot', 'local', 'cloud', 'openai', 'anthropic'])->default('copilot');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('type');
            $table->index('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('agents');
    }
};
