<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('design_component_variants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('component_id')->constrained('design_components')->cascadeOnDelete();
            $table->string('variant_name');
            $table->json('props')->nullable();
            $table->string('preview_image_url')->nullable();
            $table->timestamps();

            $table->index(['component_id', 'variant_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('design_component_variants');
    }
};
