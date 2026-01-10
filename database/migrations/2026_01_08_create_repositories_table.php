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
        Schema::create('repositories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('project_id')->nullable();
            $table->string('name');
            $table->string('url');
            $table->enum('type', ['monorepo', 'polyrepo'])->default('monorepo');
            $table->timestamp('initialized_at')->nullable();
            $table->enum('status', ['pending', 'initializing', 'active', 'archived'])->default('pending');
            $table->json('config')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->unique(['project_id', 'name']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repositories');
    }
};
