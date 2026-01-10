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
        // Idempotent migration - only create table if it doesn't exist
        // This handles cases where newer migration (2026_01_02_100002) may have already created it
        if (!Schema::hasTable('architecture_decisions')) {
            Schema::create('architecture_decisions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('architecture_design_id')->constrained()->cascadeOnDelete();
                
                $table->string('title');
                $table->enum('status', ['proposed', 'accepted', 'rejected', 'deprecated', 'superseded'])->default('proposed');
                $table->text('context')->comment('Context and problem statement');
                $table->text('decision')->comment('The decision that was made');
                $table->json('consequences')->comment('Positive and negative consequences');
                $table->json('alternatives_considered')->nullable()->comment('Other options that were considered');
                $table->string('superseded_by_id')->nullable()->comment('ADR ID that supersedes this one');
                
                $table->timestamps();
                
                $table->index('architecture_design_id');
                $table->index('status');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('architecture_decisions');
    }
};
