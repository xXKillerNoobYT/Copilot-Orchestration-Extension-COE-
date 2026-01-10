<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('design_spacing', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('key');
            $table->unsignedInteger('value');
            $table->string('label')->nullable();
            $table->timestamps();

            $table->unique('key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('design_spacing');
    }
};
