<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class EvaluationCycleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user() || session('admin_role');
    }

    public function rules(): array
    {
        return [
            'school_year' => 'nullable|string|max:20',
            'semester'    => 'required|string|max:50',
            'year_start'  => 'required|integer|min:2000|max:2100',
            'year_end'    => 'required|integer|min:2000|max:2100|gte:year_start',
            'status'      => 'required|in:active,inactive,closed',
            'evaluation_start_mode' => 'nullable|in:now,scheduled',
            'date_opened' => 'nullable|date',
        ];
    }
}
