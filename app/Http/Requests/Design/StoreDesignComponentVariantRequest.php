<?php

namespace App\Http\Requests\Design;

use Illuminate\Foundation\Http\FormRequest;

class StoreDesignComponentVariantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'variant_name' => ['required', 'string', 'max:100'],
            'props' => ['nullable', 'array'],
            'preview_image_url' => ['nullable', 'url'],
        ];
    }
}
