<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SavePlanRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // MCP endpoints don't require auth in current setup
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'wizard_state' => 'required|array',
            'wizard_state.project_name' => 'nullable|string',
            'wizard_state.project_category' => 'nullable|string',
            'wizard_state.project_scale' => 'nullable|string',
            'metadata' => 'nullable|array',
            'status' => 'nullable|string|in:draft,active,archived',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Plan name is required',
            'wizard_state.required' => 'Wizard state data is required',
            'wizard_state.array' => 'Wizard state must be a valid object',
            'status.in' => 'Status must be one of: draft, active, archived',
        ];
    }
}
