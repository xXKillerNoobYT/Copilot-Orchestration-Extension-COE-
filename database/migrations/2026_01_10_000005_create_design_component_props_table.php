<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('design_component_props', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('component_id')->constrained('design_components')->cascadeOnDelete();
            $table->string('prop_name');
            $table->string('prop_type')->nullable();
            $table->longText('default_value')->nullable();
            $table->boolean('required')->default(false);
            $table->timestamps();

            $table->index(['component_id', 'prop_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('design_component_props');
    }
};
