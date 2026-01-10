<?php

namespace App\Http\Requests\Design;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDesignComponentPropRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'prop_name' => ['sometimes', 'string', 'max:100'],
            'prop_type' => ['sometimes', 'string', 'in:string,number,boolean,enum,array,object,color,typography,spacing'],
            'default_value' => ['nullable'],
            'required' => ['boolean'],
        ];
    }
}
