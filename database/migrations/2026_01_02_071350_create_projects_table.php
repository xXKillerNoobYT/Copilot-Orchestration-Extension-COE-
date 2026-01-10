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
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->text('description')->nullable();
            $table->enum('repository_type', ['monorepo', 'polyrepo'])->default('monorepo');
            $table->string('repository_url')->nullable();
            $table->string('github_owner')->nullable();
            $table->string('github_repo')->nullable();
            $table->text('architecture_document')->nullable();
            $table->text('base_document')->nullable();
            $table->enum('status', ['planning', 'active', 'maintenance', 'archived'])->default('planning');
            $table->enum('skill_level', ['beginner', 'intermediate', 'advanced', 'expert'])->default('intermediate');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['github_owner', 'github_repo']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
