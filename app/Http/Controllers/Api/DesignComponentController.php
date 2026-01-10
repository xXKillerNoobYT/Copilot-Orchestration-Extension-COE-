<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Design\StoreDesignComponentRequest;
use App\Http\Requests\Design\UpdateDesignComponentRequest;
use App\Models\Design\DesignComponent;
use Illuminate\Http\JsonResponse;

class DesignComponentController extends Controller
{
    public function index(): JsonResponse
    {
        $components = DesignComponent::query()->orderBy('name')->get();
        return response()->json($components);
    }

    public function show(string $id): JsonResponse
    {
        $component = DesignComponent::query()->with(['props', 'variants'])->findOrFail($id);
        return response()->json($component);
    }

    public function store(StoreDesignComponentRequest $request): JsonResponse
    {
        $component = DesignComponent::create($request->validated());
        return response()->json($component, 201);
    }

    public function update(UpdateDesignComponentRequest $request, string $id): JsonResponse
    {
        $component = DesignComponent::query()->findOrFail($id);
        $component->fill($request->validated())->save();
        return response()->json($component);
    }

    public function destroy(string $id): JsonResponse
    {
        $component = DesignComponent::query()->findOrFail($id);
        $component->delete();
        return response()->json(['status' => 'deleted']);
    }
}
