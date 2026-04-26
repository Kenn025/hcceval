<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Student;
use App\Models\Teacher;
use App\Services\LegacyHash;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ClientProfileController extends Controller
{
    public function edit(): Response|RedirectResponse
    {
        $account = $this->currentAccount();

        if (! $account) {
            return redirect()->route('portal.login');
        }

        return Inertia::render('Portal/ProfileSettings', [
            'account' => $this->accountPayload($account),
            'status' => session('status'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $account = $this->currentAccount();

        if (! $account) {
            return redirect()->route('portal.login');
        }

        $data = $request->validate([
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255'],
            'profile_photo' => ['nullable', 'image', 'max:2048'],
            'current_password' => ['nullable', 'required_with:password', 'string'],
            'password' => ['nullable', 'confirmed', Password::defaults()],
        ]);

        if ($request->hasFile('profile_photo')) {
            if ($account->profile_photo_path) {
                Storage::disk('public')->delete($account->profile_photo_path);
            }

            $account->profile_photo_path = $request->file('profile_photo')->store('profile-photos', 'public');
        }

        if (! empty($data['password'])) {
            if (! LegacyHash::check($data['current_password'] ?? '', $account->password, $account->getTable(), $account->id)) {
                return back()->withErrors(['current_password' => 'The current password is incorrect.']);
            }

            $account->password = LegacyHash::make($data['password']);
        }

        $account->email = $data['email'];
        $account->save();

        session(['client_name' => $account->full_name]);

        return back()->with('status', 'profile-updated');
    }

    private function currentAccount(): Student|Teacher|Employee|null
    {
        $id = (int) session('client_id');
        $source = session('client_source', session('client_type') === 'student' ? 'student' : null);

        if (! $id || ! $source) {
            return null;
        }

        return match ($source) {
            'student' => Student::with(['branch', 'department', 'program', 'strand'])->find($id),
            'teacher' => Teacher::with(['branch', 'department', 'program', 'strand'])->find($id),
            'employee' => Employee::with(['branch', 'department', 'employeeDepartment', 'program', 'strand'])->find($id),
            default => null,
        };
    }

    private function accountPayload(Student|Teacher|Employee $account): array
    {
        $source = session('client_source', 'student');
        $userType = $source === 'student' ? 'student' : ($source === 'employee' ? 'employee' : 'teacher');
        $programOrStrand = $account->program?->name ?? $account->strand?->name;
        $department = $account instanceof Employee
            ? ($account->employeeDepartment?->name ?? $account->department?->name)
            : $account->department?->name;

        return [
            'id' => $account->id,
            'name' => $account->full_name,
            'email' => $account->email,
            'code' => $account->code,
            'photoUrl' => $account->profile_photo_path
                ? Storage::disk('public')->url($account->profile_photo_path)
                : null,
            'userType' => $userType,
            'portalLabel' => match ($userType) {
                'teacher' => 'Faculty Portal',
                'employee' => 'Employee Portal',
                default => 'Student Portal',
            },
            'dashboardRoute' => match ($userType) {
                'teacher' => 'portal.teacher.dashboard',
                'employee' => 'portal.employee.dashboard',
                default => 'portal.student.dashboard',
            },
            'branch' => $account->branch?->name,
            'department' => $department,
            'programOrStrand' => $programOrStrand,
            'programOrStrandLabel' => $account->program ? 'Program' : 'Strand',
        ];
    }
}
