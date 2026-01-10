<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RefineTaskPlanRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'refinements' => 'required|array',
            'refinements.*.action' => 'required|in:add_task,remove_task,modify_task,add_dependency,remove_dependency',
            'refinements.*.task_id' => 'required_if:refinements.*.action,remove_task,modify_task|string',
            'refinements.*.task_data' => 'required_if:refinements.*.action,add_task,modify_task|array',
            'refinements.*.task_data.title' => 'sometimes|string|max:255',
            'refinements.*.task_data.description' => 'sometimes|string|max:2000',
            'refinements.*.task_data.type' => 'sometimes|string|in:feature,bug,refactor,documentation,testing',
            'refinements.*.task_data.priority' => 'sometimes|string|in:low,medium,high',
            'refinements.*.task_data.estimated_hours' => 'sometimes|numeric|min:0.5|max:200',
            'refinements.*.dependency' => 'required_if:refinements.*.action,add_dependency,remove_dependency|array',
            'refinements.*.dependency.from' => 'required_with:refinements.*.dependency|string',
            'refinements.*.dependency.to' => 'required_with:refinements.*.dependency|string',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'refinements.required' => 'At least one refinement must be provided.',
            'refinements.*.action.required' => 'Each refinement must specify an action.',
            'refinements.*.action.in' => 'Invalid refinement action. Must be one of: add_task, remove_task, modify_task, add_dependency, remove_dependency.',
            'refinements.*.task_data.required_if' => 'Task data is required when adding or modifying a task.',
            'refinements.*.dependency.required_if' => 'Dependency data is required when adding or removing a dependency.',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Ensure refinements is always an array
        if ($this->has('refinements') && !is_array($this->refinements)) {
            $this->merge([
                'refinements' => [],
            ]);
        }
    }
}
