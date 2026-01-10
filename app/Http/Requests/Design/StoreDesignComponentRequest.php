<?php

namespace App\Http\Requests\Design;

use Illuminate\Foundation\Http\FormRequest;

class StoreDesignComponentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string'],
            'template_path' => ['nullable', 'string', 'max:255'],
        ];
    }
}
