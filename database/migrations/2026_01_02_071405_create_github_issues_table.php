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
        Schema::create('github_issues', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->integer('github_issue_number');
            $table->bigInteger('github_issue_id')->nullable();
            $table->string('title');
            $table->text('body')->nullable();
            $table->enum('state', ['open', 'closed'])->default('open');
            $table->json('labels')->nullable();
            $table->string('milestone')->nullable();
            $table->json('assignees')->nullable();
            $table->string('github_url')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'github_issue_number']);
            $table->index('state');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('github_issues');
    }
};
