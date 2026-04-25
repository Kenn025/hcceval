<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user() || session('admin_role');
    }

    public function rules(): array
    {
        $id = $this->route('student')?->id ?? $this->route('student');

        return [
            'student_no'    => ['nullable', 'string', 'max:50', Rule::unique('student', 'code')->ignore($id)],
            'branch_id'     => 'required|exists:branch,id',
            'department_id' => 'required|exists:department,id',
            'program_id'    => 'nullable|exists:program,id',
            'strand_id'     => 'nullable|exists:strand,id',
            'year_level_id' => 'nullable|exists:education_level,id',
            'removed_subject_ids' => 'nullable|array',
            'removed_subject_ids.*' => 'integer|exists:subject,id',
            'is_irreg'      => 'nullable|boolean',
            'irreg_subject_ids' => 'nullable|array',
            'irreg_subject_ids.*' => 'integer|exists:subject,id',
            'irreg_subject_teacher_ids' => 'nullable|array',
            'first_name'    => 'required|string|max:100',
            'middle_name'   => 'nullable|string|max:100',
            'last_name'     => 'required|string|max:100',
            'suffix_name'   => 'nullable|string|max:50',
            'email'         => ['nullable', 'email', 'max:150', Rule::unique('student', 'email')->ignore($id)],
            'password'      => 'nullable|string|min:6',
            'status'        => 'nullable|in:active,inactive',
        ];
    }
}
