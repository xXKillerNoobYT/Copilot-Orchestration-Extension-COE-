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
        Schema::create('dependencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->string('package_name');
            $table->enum('package_manager', ['npm', 'pip', 'composer', 'maven', 'cargo', 'go']);
            $table->string('current_version')->nullable();
            $table->string('latest_version')->nullable();
            $table->boolean('is_outdated')->default(false);
            $table->boolean('has_security_issue')->default(false);
            $table->enum('dependency_type', ['production', 'development', 'peer'])->default('production');
            $table->timestamp('last_checked_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'package_name']);
            $table->index('is_outdated');
            $table->index('has_security_issue');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dependencies');
    }
};
