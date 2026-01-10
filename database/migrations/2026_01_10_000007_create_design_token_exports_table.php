<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('design_token_exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('export_format');
            $table->longText('exported_data');
            $table->timestamp('exported_at')->nullable();
            $table->uuid('exported_by')->nullable();
            $table->timestamps();

            $table->index('export_format');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('design_token_exports');
    }
};
