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
        // Duplicate/obsolete migration retained for history; no-op to avoid table conflicts.
        // See 2026_01_02_100002_create_architecture_decisions_table.php for the current schema.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op; table managed by newer migration.
    }
};
