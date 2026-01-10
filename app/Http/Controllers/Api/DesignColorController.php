<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Design\DesignColor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DesignColorController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DesignColor::query()->orderBy('name')->get());
    }

    public function show(string $id): JsonResponse
    {
        $color = DesignColor::query()->findOrFail($id);
        return response()->json($color);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'hex_value' => ['required', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $color = DesignColor::create([
            'name' => $data['name'],
            'hex_value' => strtoupper($data['hex_value']),
            'category' => $data['category'] ?? null,
            'description' => $data['description'] ?? null,
        ]);

        return response()->json($color, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $color = DesignColor::query()->findOrFail($id);
        $data = $request->all();

        $validator = Validator::make($data, [
            'name' => ['sometimes', 'string', 'max:255'],
            'hex_value' => ['sometimes', 'regex:/^#([A-Fa-f0-9]{6})$/'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $color->fill([
            'name' => $data['name'] ?? $color->name,
            'hex_value' => isset($data['hex_value']) ? strtoupper($data['hex_value']) : $color->hex_value,
            'category' => $data['category'] ?? $color->category,
            'description' => $data['description'] ?? $color->description,
        ])->save();

        return response()->json($color);
    }

    public function destroy(string $id): JsonResponse
    {
        $color = DesignColor::query()->findOrFail($id);
        $color->delete();
        return response()->json(['status' => 'deleted']);
    }
}
