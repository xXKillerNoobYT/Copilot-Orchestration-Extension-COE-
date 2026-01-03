<?php

namespace App\Exceptions;

use Exception;

class ContextBundleException extends Exception
{
    public function render()
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'error_type' => 'ContextBundleException',
        ], $this->getCode() ?: 400);
    }
}
