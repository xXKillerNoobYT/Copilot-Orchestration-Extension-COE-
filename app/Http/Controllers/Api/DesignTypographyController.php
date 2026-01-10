<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Design\DesignTypography;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DesignTypographyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DesignTypography::query()->orderBy('name')->get());
    }

    public function show(string $id): JsonResponse
    {
        $typo = DesignTypography::query()->findOrFail($id);
        return response()->json($typo);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'font_family' => ['required', 'string', 'max:255'],
            'font_weight' => ['nullable', 'integer', 'between:100,900'],
            'font_size' => ['nullable', 'integer', 'between:8,128'],
            'line_height' => ['nullable', 'numeric', 'between:0.8,3.0'],
            'letter_spacing' => ['nullable', 'numeric', 'between:-5,20'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $typo = DesignTypography::create([
            'name' => $data['name'],
            'font_family' => $data['font_family'],
            'font_weight' => $data['font_weight'] ?? null,
            'font_size' => $data['font_size'] ?? null,
            'line_height' => $data['line_height'] ?? null,
            'letter_spacing' => $data['letter_spacing'] ?? null,
        ]);

        return response()->json($typo, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $typo = DesignTypography::query()->findOrFail($id);
        $data = $request->all();

        $validator = Validator::make($data, [
            'name' => ['sometimes', 'string', 'max:255'],
            'font_family' => ['sometimes', 'string', 'max:255'],
            'font_weight' => ['nullable', 'integer', 'between:100,900'],
            'font_size' => ['nullable', 'integer', 'between:8,128'],
            'line_height' => ['nullable', 'numeric', 'between:0.8,3.0'],
            'letter_spacing' => ['nullable', 'numeric', 'between:-5,20'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $typo->fill([
            'name' => $data['name'] ?? $typo->name,
            'font_family' => $data['font_family'] ?? $typo->font_family,
            'font_weight' => $data['font_weight'] ?? $typo->font_weight,
            'font_size' => $data['font_size'] ?? $typo->font_size,
            'line_height' => $data['line_height'] ?? $typo->line_height,
            'letter_spacing' => $data['letter_spacing'] ?? $typo->letter_spacing,
        ])->save();

        return response()->json($typo);
    }

    public function destroy(string $id): JsonResponse
    {
        $typo = DesignTypography::query()->findOrFail($id);
        $typo->delete();
        return response()->json(['status' => 'deleted']);
    }
}
