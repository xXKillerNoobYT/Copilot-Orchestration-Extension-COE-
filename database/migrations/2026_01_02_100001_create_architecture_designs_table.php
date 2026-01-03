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
        Schema::create('architecture_designs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('task_plan_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            
            $table->string('pattern')->comment('Architectural pattern: layered, clean_architecture, hexagonal');
            $table->json('layers')->comment('Application layers definition');
            $table->json('components')->comment('Component definitions with responsibilities');
            $table->json('relationships')->comment('Component relationships and dependencies');
            $table->json('database_schema')->nullable()->comment('Database table schemas');
            $table->json('api_contracts')->nullable()->comment('API endpoint contracts');
            $table->json('diagrams')->nullable()->comment('Mermaid diagram definitions');
            
            $table->integer('version')->default(1);
            $table->timestamps();
            
            $table->index('task_plan_id');
            $table->index('project_id');
            $table->index('pattern');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('architecture_designs');
    }
};
