<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('landing_page_headers', function (Blueprint $table) {
            $table->string('item_type', 30)->default('link')->after('target');
        });

        DB::table('landing_page_headers')->update(['item_type' => 'link']);

        $items = [
            ['label' => 'Brand Logo', 'target' => 'graduation', 'item_type' => 'logo', 'sort_order' => 0, 'is_active' => 1],
            ['label' => 'Brand Title', 'target' => 'MCH-PEMS', 'item_type' => 'brand_title', 'sort_order' => 0, 'is_active' => 1],
            ['label' => 'Brand Subtitle', 'target' => 'Evaluation System', 'item_type' => 'brand_subtitle', 'sort_order' => 0, 'is_active' => 1],
            ['label' => 'Theme Toggle', 'target' => 'Theme Toggle', 'item_type' => 'toggle', 'sort_order' => 6, 'is_active' => 1],
            ['label' => 'Sign In Button', 'target' => 'Sign In', 'item_type' => 'signin', 'sort_order' => 7, 'is_active' => 1],
        ];

        foreach ($items as $item) {
            $exists = DB::table('landing_page_headers')
                ->where('item_type', $item['item_type'])
                ->exists();

            if (! $exists) {
                DB::table('landing_page_headers')->insert([
                    ...$item,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('landing_page_headers')
            ->whereIn('item_type', ['logo', 'brand_title', 'brand_subtitle', 'toggle', 'signin'])
            ->delete();

        Schema::table('landing_page_headers', function (Blueprint $table) {
            $table->dropColumn('item_type');
        });
    }
};
