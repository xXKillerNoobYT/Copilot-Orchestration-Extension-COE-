<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Update Task Status Request
 * 
 * Validates task status update data.
 */
class UpdateTaskStatusRequest extends FormRequest
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
            'status' => [
                'required',
                'string',
                'in:pending,approved,in_progress,testing,review,completed,failed,blocked,cancelled'
            ],
            'metadata' => ['nullable', 'array'],
            'metadata.reason' => ['nullable', 'string', 'max:500'],
            'metadata.user_id' => ['nullable', 'uuid', 'exists:users,id'],
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
            'status.required' => 'Status is required',
            'status.in' => 'Invalid status. Must be one of: pending, approved, in_progress, testing, review, completed, failed, blocked, cancelled',
            'metadata.user_id.exists' => 'The specified user does not exist',
        ];
    }
}
