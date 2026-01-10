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
        // Intentionally left blank (no-op migration).
        //
        // This migration file was originally created as a duplicate of the
        // architecture_decisions table creation, but it cannot be used because:
        // 1. It runs before the parent table 'architecture_designs' is created
        //    (this migration: 071358, parent table: 100001), causing FK errors
        // 2. The actual table creation is handled by migration 100002
        //
        // This file is retained to preserve migration history consistency for
        // environments where this migration may have already been recorded.
        // The table is created and managed by 2026_01_02_100002_create_architecture_decisions_table.php
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Intentionally left blank.
        // The architecture_decisions table is managed and dropped by the newer
        // migration (2026_01_02_100002) to avoid duplicate dropIfExists calls
        // and ensure consistent rollback behavior.
    }
};
