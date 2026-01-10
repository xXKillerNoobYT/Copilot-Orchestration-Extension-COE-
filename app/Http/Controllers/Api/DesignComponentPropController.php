<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Design\StoreDesignComponentPropRequest;
use App\Http\Requests\Design\UpdateDesignComponentPropRequest;
use App\Models\Design\DesignComponent;
use App\Models\Design\DesignComponentProp;
use Illuminate\Http\JsonResponse;

class DesignComponentPropController extends Controller
{
    protected function getComponentOrFail(string $componentId): DesignComponent
    {
        return DesignComponent::query()->findOrFail($componentId);
    }

    public function index(string $componentId): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $props = DesignComponentProp::query()
            ->where('component_id', $componentId)
            ->orderBy('prop_name')
            ->get();
        return response()->json($props);
    }

    public function show(string $componentId, string $id): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $prop = DesignComponentProp::query()
            ->where('component_id', $componentId)
            ->findOrFail($id);
        return response()->json($prop);
    }

    public function store(StoreDesignComponentPropRequest $request, string $componentId): JsonResponse
    {
        $component = $this->getComponentOrFail($componentId);
        $data = $request->validated();
        $prop = DesignComponentProp::create([
            'component_id' => $component->id,
            'prop_name' => $data['prop_name'],
            'prop_type' => $data['prop_type'] ?? null,
            'default_value' => $data['default_value'] ?? null,
            'required' => (bool)($data['required'] ?? false),
        ]);
        return response()->json($prop, 201);
    }

    public function update(UpdateDesignComponentPropRequest $request, string $componentId, string $id): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $prop = DesignComponentProp::query()
            ->where('component_id', $componentId)
            ->findOrFail($id);
        $data = $request->validated();
        $prop->fill([
            'prop_name' => $data['prop_name'] ?? $prop->prop_name,
            'prop_type' => $data['prop_type'] ?? $prop->prop_type,
            'default_value' => $data['default_value'] ?? $prop->default_value,
            'required' => isset($data['required']) ? (bool)$data['required'] : $prop->required,
        ])->save();
        return response()->json($prop);
    }

    public function destroy(string $componentId, string $id): JsonResponse
    {
        $this->getComponentOrFail($componentId);
        $prop = DesignComponentProp::query()
            ->where('component_id', $componentId)
            ->findOrFail($id);
        $prop->delete();
        return response()->json(['status' => 'deleted']);
    }
}
