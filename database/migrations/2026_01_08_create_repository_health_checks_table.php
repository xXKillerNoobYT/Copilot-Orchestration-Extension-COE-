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
        Schema::create('repository_health_checks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('repository_id');
            $table->integer('health_score')->default(100); // 0-100
            $table->enum('health_status', ['excellent', 'good', 'fair', 'poor', 'critical'])->default('good');
            
            // Metrics
            $table->integer('test_coverage')->default(0); // percentage
            $table->integer('ci_success_rate')->default(100); // percentage
            $table->integer('dependency_vulnerabilities')->default(0);
            $table->integer('outdated_dependencies')->default(0);
            $table->integer('days_since_last_commit')->default(0);
            
            // Status tracking
            $table->json('issues')->nullable(); // Array of detected issues
            $table->json('recommendations')->nullable(); // Array of recommendations
            
            $table->timestamp('checked_at')->nullable();
            $table->timestamp('last_issue_detected')->nullable();
            $table->timestamps();
            
            // Indexes
            $table->foreign('repository_id')->references('id')->on('repositories')->onDelete('cascade');
            $table->index('health_status');
            $table->index('checked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repository_health_checks');
    }
};
