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
        Schema::table('users', function (Blueprint $table) {
            // Add authentication-related fields if they don't exist
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable()->after('email');
            }
            
            if (!Schema::hasColumn('users', 'avatar')) {
                $table->string('avatar')->nullable()->after('phone');
            }
            
            if (!Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['admin', 'user', 'agent'])->default('user')->after('skill_level');
            }
            
            if (!Schema::hasColumn('users', 'two_factor_enabled')) {
                $table->boolean('two_factor_enabled')->default(false)->after('role');
            }
            
            if (!Schema::hasColumn('users', 'two_factor_secret')) {
                $table->string('two_factor_secret')->nullable()->after('two_factor_enabled');
            }
            
            if (!Schema::hasColumn('users', 'two_factor_recovery_codes')) {
                $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            }
            
            if (!Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('two_factor_recovery_codes');
            }
            
            if (!Schema::hasColumn('users', 'last_login_ip')) {
                $table->ipAddress('last_login_ip')->nullable()->after('last_login_at');
            }
            
            if (!Schema::hasColumn('users', 'active')) {
                $table->boolean('active')->default(true)->after('last_login_ip');
            }
            
            if (!Schema::hasColumn('users', 'deleted_at')) {
                $table->softDeletes()->after('active');
            }

            // Add indexes for performance
            if (!Schema::hasIndex('users', 'users_email_index')) {
                $table->index('email');
            }
            
            if (!Schema::hasIndex('users', 'users_created_at_index')) {
                $table->index('created_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumnIfExists('phone');
            $table->dropColumnIfExists('avatar');
            $table->dropColumnIfExists('role');
            $table->dropColumnIfExists('two_factor_enabled');
            $table->dropColumnIfExists('two_factor_secret');
            $table->dropColumnIfExists('two_factor_recovery_codes');
            $table->dropColumnIfExists('last_login_at');
            $table->dropColumnIfExists('last_login_ip');
            $table->dropColumnIfExists('active');
            $table->dropColumnIfExists('deleted_at');
        });
    }
};
