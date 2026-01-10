<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateTaskPlanRequest extends FormRequest
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
            'project_id' => 'required|uuid|exists:projects,id',
            'requirement' => 'required|string|min:50|max:10000',
            'generate_architecture' => 'sometimes|boolean',
            'include_testing' => 'sometimes|boolean',
            'include_documentation' => 'sometimes|boolean',
            'complexity_hint' => 'sometimes|in:simple,moderate,complex,very_complex',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'requirement.min' => 'The requirement must be at least 50 characters to ensure sufficient detail.',
            'requirement.max' => 'The requirement is too long. Please break it into multiple plans if needed.',
            'project_id.exists' => 'The specified project does not exist.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'project_id' => 'project identifier',
            'requirement' => 'requirement description',
            'complexity_hint' => 'complexity hint',
        ];
    }
}
