<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Create Task Request
 * 
 * Validates task creation data.
 */
class CreateTaskRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // TODO: Implement authorization logic
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'project_id' => ['required', 'uuid', 'exists:projects,id'],
            'parent_task_id' => ['nullable', 'uuid', 'exists:tasks,id'],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'task_type' => [
                'required',
                'string',
                'in:feature,bug,refactor,maintenance,architecture,testing,documentation'
            ],
            'priority' => [
                'nullable',
                'string',
                'in:critical,high,medium,low'
            ],
            'status' => [
                'nullable',
                'string',
                'in:pending,approved,in_progress,testing,review,completed,failed,blocked,cancelled'
            ],
            'assigned_agent' => ['nullable', 'string', 'max:100'],
            'assigned_github_agent' => ['nullable', 'string', 'max:100'],
            'branch_name' => ['nullable', 'string', 'max:255'],
            'context_bundle_path' => ['nullable', 'string', 'max:500'],
            'estimated_effort' => ['nullable', 'integer', 'min:0'],
            'github_issue_id' => ['nullable', 'integer'],
            'github_issue_url' => ['nullable', 'url'],
            'dependencies' => ['nullable', 'array'],
            'dependencies.*' => ['uuid', 'exists:tasks,id'],
            'dependency_type' => [
                'nullable',
                'string',
                'in:blocks,requires,relates_to'
            ],
        ];
    }

    /**
     * Get custom error messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'project_id.required' => 'A project ID is required',
            'project_id.exists' => 'The specified project does not exist',
            'name.required' => 'Task name is required',
            'name.max' => 'Task name cannot exceed 255 characters',
            'task_type.required' => 'Task type is required',
            'task_type.in' => 'Invalid task type. Must be one of: feature, bug, refactor, maintenance, architecture, testing, documentation',
            'priority.in' => 'Invalid priority. Must be one of: critical, high, medium, low',
            'status.in' => 'Invalid status. Must be one of: pending, approved, in_progress, testing, review, completed, failed, blocked, cancelled',
            'dependencies.*.exists' => 'One or more dependency tasks do not exist',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Set default values if not provided
        $this->merge([
            'priority' => $this->priority ?? 'medium',
            'status' => $this->status ?? 'pending',
        ]);
    }
}
