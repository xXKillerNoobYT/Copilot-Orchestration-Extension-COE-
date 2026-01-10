<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Design\StoreDesignComponentVariantRequest;
use App\Http\Requests\Design\UpdateDesignComponentVariantRequest;
use App\Models\Design\DesignComponent;
use App\Models\Design\DesignComponentVariant;
use Illuminate\Http\JsonResponse;

class DesignComponentVariantController extends Controller
{
    protected function getComponentOrFail(string $componentId): DesignComponent
    {
        return DesignComponent::query()->findOrFail($componentId);
    }

    public function index(string $componentId): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $variants = DesignComponentVariant::query()
            ->where('component_id', $componentId)
            ->orderBy('variant_name')
            ->get();
        return response()->json($variants);
    }

    public function show(string $componentId, string $id): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $variant = DesignComponentVariant::query()
            ->where('component_id', $componentId)
            ->findOrFail($id);
        return response()->json($variant);
    }

    public function store(StoreDesignComponentVariantRequest $request, string $componentId): JsonResponse
    {
        $component = $this->getComponentOrFail($componentId);
        $data = $request->validated();
        $variant = DesignComponentVariant::create([
            'component_id' => $component->id,
            'variant_name' => $data['variant_name'],
            'props' => $data['props'] ?? null,
            'preview_image_url' => $data['preview_image_url'] ?? null,
        ]);
        return response()->json($variant, 201);
    }

    public function update(UpdateDesignComponentVariantRequest $request, string $componentId, string $id): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $variant = DesignComponentVariant::query()
            ->where('component_id', $componentId)
            ->findOrFail($id);
        $data = $request->validated();
        $variant->fill([
            'variant_name' => $data['variant_name'] ?? $variant->variant_name,
            'props' => $data['props'] ?? $variant->props,
            'preview_image_url' => $data['preview_image_url'] ?? $variant->preview_image_url,
        ])->save();
        return response()->json($variant);
    }

    public function destroy(string $componentId, string $id): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $variant = DesignComponentVariant::query()
            ->where('component_id', $componentId)
            ->findOrFail($id);
        $variant->delete();
        return response()->json(['status' => 'deleted']);
    }
}
