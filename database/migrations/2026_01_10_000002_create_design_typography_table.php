<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('design_typography', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('font_family');
            $table->unsignedInteger('font_weight')->nullable();
            $table->unsignedInteger('font_size')->nullable();
            $table->float('line_height')->nullable();
            $table->float('letter_spacing')->nullable();
            $table->timestamps();

            $table->index('name');
            $table->index('font_family');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('design_typography');
    }
};
