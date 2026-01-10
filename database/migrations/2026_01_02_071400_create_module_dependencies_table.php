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
        Schema::create('module_dependencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->string('source_module');
            $table->string('target_module');
            $table->enum('dependency_type', ['imports', 'extends', 'implements', 'references'])->default('imports');
            $table->boolean('is_circular')->default(false);
            $table->boolean('is_allowed')->default(true);
            $table->timestamp('detected_at');
            $table->timestamps();

            $table->unique(['project_id', 'source_module', 'target_module'], 'module_deps_unique');
            $table->index('is_circular');
            $table->index('is_allowed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('module_dependencies');
    }
};
