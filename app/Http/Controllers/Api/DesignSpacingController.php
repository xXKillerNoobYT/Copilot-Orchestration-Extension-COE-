<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Design\DesignSpacing;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DesignSpacingController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DesignSpacing::query()->orderBy('value')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->all();
        $validator = Validator::make($data, [
            'key' => ['required', 'string', 'max:50'],
            'value' => ['required', 'integer', 'between:0,256'],
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $spacing = DesignSpacing::create([
            'key' => $data['key'],
            'value' => $data['value'],
            'label' => $data['label'] ?? null,
        ]);

        return response()->json($spacing, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $spacing = DesignSpacing::query()->findOrFail($id);
        $data = $request->all();

        $validator = Validator::make($data, [
            'key' => ['sometimes', 'string', 'max:50'],
            'value' => ['sometimes', 'integer', 'between:0,256'],
            'label' => ['nullable', 'string', 'max:100'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $spacing->fill([
            'key' => $data['key'] ?? $spacing->key,
            'value' => $data['value'] ?? $spacing->value,
            'label' => $data['label'] ?? $spacing->label,
        ])->save();

        return response()->json($spacing);
    }

    public function destroy(string $id): JsonResponse
    {
        $spacing = DesignSpacing::query()->findOrFail($id);
        $spacing->delete();
        return response()->json(['status' => 'deleted']);
    }
}
