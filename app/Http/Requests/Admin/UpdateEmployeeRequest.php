<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user() || session('admin_role');
    }

    public function rules(): array
    {
        $id = $this->route('employee')?->id ?? $this->route('employee');

        return [
            'employee_no'   => ['required', 'string', 'max:50', Rule::unique('employee', 'code')->ignore($id)],
            'branch_id'     => 'required|exists:branch,id',
            'department_id' => 'nullable|exists:department,id',
            'employee_department_id' => 'nullable|exists:employee_department,id',
            'program_id'    => 'nullable|exists:program,id',
            'strand_id'     => 'nullable|exists:strand,id',
            'first_name'    => 'required|string|max:100',
            'middle_name'   => 'nullable|string|max:100',
            'last_name'     => 'required|string|max:100',
            'suffix_name'   => 'nullable|string|max:50',
            'email'         => ['nullable', 'email', 'max:150', Rule::unique('employee', 'email')->ignore($id)],
            'password'      => 'nullable|string|min:6',
            'role'          => 'nullable|string|max:100',
        ];
    }
}
