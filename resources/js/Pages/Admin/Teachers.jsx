import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import useFormDirty from '@/Components/Admin/useFormDirty';
import AppIcon from '@/Components/AppIcon';
import AppConfirmDialog from '@/Components/ConfirmDialog';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const buildTeacherCode = (branch, nextTeacherCodes = {}) => {
    if (!branch?.code) {
        return nextTeacherCodes.default ?? 'TCH-GEN-00001';
    }

    return nextTeacherCodes[String(branch.id)] ?? `TCH-${String(branch.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-00001`;
};

export default function Teachers({ teachers, filters, branches, departments, programs, strands, nextTeacherCodes, isBranchAdmin, selectedBranchId, scopedBranchId }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        employee_no: '',
        branch_id: activeBranchId,
        department_id: '',
        program_id: '',
        strand_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix_name: '',
        email: '',
        password: '',
        role: 'Teacher',
    });

    const { isDirty: teacherIsDirty } = useFormDirty(data, editing?.id ?? 'new');
    const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);

    const selectedBranch = useMemo(
        () => branches.find((branch) => String(branch.id) === String(data.branch_id)),
        [branches, data.branch_id],
    );
    const filteredDepartments = useMemo(
        () => departments.filter((department) => (
            (!data.branch_id || String(department.branch_id) === String(data.branch_id))
            && Boolean(department.is_activated)
        )),
        [data.branch_id, departments],
    );
    const filterDepartments = useMemo(
        () => departments.filter((department) => (
            (!filters.branch_id || String(department.branch_id) === String(filters.branch_id))
            && Boolean(department.is_activated)
        )),
        [departments, filters.branch_id],
    );
    const generatedTeacherCode = editing ? data.employee_no : buildTeacherCode(selectedBranch, nextTeacherCodes);

    useEffect(() => {
        if (!data.branch_id && activeBranchId) {
            setData('branch_id', activeBranchId);
        }
    }, [activeBranchId, data.branch_id, setData]);

    useEffect(() => {
        if (data.department_id && !filteredDepartments.some((department) => String(department.id) === String(data.department_id))) {
            setData('department_id', '');
        }
    }, [data.department_id, filteredDepartments, setData]);

    const handleBranchChange = (branchId) => {
        setData('branch_id', branchId);
        setData('department_id', '');
        setData('program_id', '');
        setData('strand_id', '');
    };

    const openCreate = () => {
        reset();
        setSubmitError('');
        setDetailOpen(false);
        setViewing(null);
        setShowPassword(false);
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const openEdit = (row) => {
        setData('employee_no', row.employee_no);
        setData('branch_id', String(row.branch_id ?? ''));
        setData('department_id', row.department_id ? String(row.department_id) : '');
        setData('program_id', row.program_id ? String(row.program_id) : '');
        setData('strand_id', row.strand_id ? String(row.strand_id) : '');
        setData('first_name', row.first_name);
        setData('middle_name', row.middle_name ?? '');
        setData('last_name', row.last_name);
        setData('suffix_name', row.suffix_name ?? '');
        setData('email', row.email ?? '');
        setData('password', '');
        setData('role', row.role ?? 'Teacher');
        setSubmitError('');
        setDetailOpen(false);
        setViewing(null);
        setShowPassword(false);
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const editFromDetails = () => {
        if (!viewing) return;
        openEdit(viewing);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing && !teacherIsDirty) return;
        if (editing) {
            setConfirmUpdateOpen(true);
            return;
        }
        performSave();
    };

    const performSave = () => {
        setSubmitError('');
        const url = editing ? route('admin.teachers') + '/' + editing.id : route('admin.teachers');
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                setConfirmUpdateOpen(false);
                reset();
            },
            onError: (formErrors) => {
                const firstError = Object.values(formErrors)[0];
                setSubmitError(firstError || 'Unable to save teacher.');
                setConfirmUpdateOpen(false);
            },
        });
    };

    const changeBranch = (branchId = '') => {
        router.get(route('admin.teachers'), { ...filters, branch_id: branchId }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (key, value) => {
        router.get(route('admin.teachers'), { ...filters, [key]: value }, {
            preserveState: true,
            replace: true,
        });
    };

    const columns = [
        { key: 'employee_no', label: 'Employee No.' },
        { key: 'full_name', label: 'Full Name', render: (row) => `${row.last_name}, ${row.first_name} ${row.middle_name ?? ''}`.trim() },
        { key: 'branch', label: 'Branch', render: (row) => row.branch?.name ?? '-' },
        { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
        { key: 'role', label: 'Role' },
        { key: 'is_active', label: 'Status', render: (row) => <StatusBadge active={row.is_active} /> },
    ];

    return (
        <AdminLayout title="Teachers" activeRoute="admin.teachers" breadcrumbs={['User Management']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Teachers</h2>
                    <p className="text-sm text-slate-500">Manage teaching faculty, their branch scope, and academic role assignments.</p>
                </div>
                <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Teacher</button>
            </div>

            {!isBranchAdmin && branches.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => changeBranch('')}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${!filters.branch_id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                    >
                        Overall Branch
                    </button>
                    {branches.map((branch) => (
                        <button
                            key={branch.id}
                            type="button"
                            onClick={() => changeBranch(branch.id)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${String(filters.branch_id ?? '') === String(branch.id) ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                        >
                            {branch.name}
                        </button>
                    ))}
                </div>
            )}

            <ResourceTable 
                columns={columns} 
                data={teachers} 
                filters={filters} 
                routeName="admin.teachers" 
                searchPlaceholder="Search by name or employee no..." 
                onRowClick={openView} 
                onEdit={openEdit} 
                onDelete={setDeleteTarget} 
                extraHeaderActions={
                    <div className="flex w-full flex-wrap gap-2 md:w-auto">
                        <select
                            value={filters.department_id ?? ''}
                            onChange={(e) => handleFilterChange('department_id', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-auto"
                        >
                            <option value="">All Departments</option>
                            {filterDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select
                            value={filters.program_id ?? ''}
                            onChange={(e) => handleFilterChange('program_id', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-auto"
                        >
                            <option value="">All Programs</option>
                            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                }
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Teacher Information" width="max-w-xl">
                {viewing && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                {[viewing.first_name, viewing.middle_name, viewing.last_name].filter(Boolean).join(' ')}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.employee_no ?? '-'}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">First Name</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.first_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Middle Name</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.middle_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Name</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.last_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suffix</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.suffix_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.email ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                                <div className="mt-1">
                                    <StatusBadge active={viewing.is_active} />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.branch?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.department?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.program?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.role ?? '-'}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDetailOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Close</button>
                            <button type="button" onClick={editFromDetails} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">Edit Teacher</button>
                        </div>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Teacher' : 'New Teacher'} width="max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    {(submitError || Object.keys(errors).length > 0) && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {submitError || 'Please review the highlighted fields and try again.'}
                        </div>
                    )}
                    <FormField label="Employee No." error={errors.employee_no} required>
                        <TextInput value={generatedTeacherCode} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
                    </FormField>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="First Name" error={errors.first_name} required>
                            <TextInput value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} />
                        </FormField>
                        <FormField label="Middle Name" error={errors.middle_name}>
                            <TextInput value={data.middle_name} onChange={(e) => setData('middle_name', e.target.value)} />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Last Name" error={errors.last_name} required>
                            <TextInput value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} />
                        </FormField>
                        <FormField label="Suffix" error={errors.suffix_name}>
                            <TextInput value={data.suffix_name} onChange={(e) => setData('suffix_name', e.target.value)} placeholder="Jr., Sr." />
                        </FormField>
                    </div>
                    <FormField label="Branch" error={errors.branch_id} required>
                        {isBranchAdmin ? (
                            <TextInput value={selectedBranch?.name ?? ''} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
                        ) : (
                            <SelectInput value={data.branch_id} onChange={(e) => handleBranchChange(e.target.value)}>
                                <option value="">Select branch...</option>
                                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </SelectInput>
                        )}
                    </FormField>
                    <FormField label="Department" error={errors.department_id}>
                        <SelectInput
                            value={data.department_id}
                            onChange={(e) => setData('department_id', e.target.value)}
                            disabled={!data.branch_id}
                        >
                            <option value="">{data.branch_id ? 'Select department...' : 'Select branch first...'}</option>
                            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Role" error={errors.role}>
                        <SelectInput value={data.role} onChange={(e) => setData('role', e.target.value)}>
                            <option value="Teacher">Teacher</option>
                            <option value="Program Chair">Program Chair</option>
                            <option value="Department Head">Department Head</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Email" error={errors.email}>
                        <TextInput type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    </FormField>
                    <FormField label={editing ? 'New Password (leave blank to keep)' : 'Password'} error={errors.password}>
                        <div className="relative">
                            <TextInput
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder={editing ? '••••••••' : 'Defaults to hcc1234'}
                                className="pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-slate-700"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <AppIcon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                            </button>
                        </div>
                    </FormField>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} disabled={Boolean(editing) && !teacherIsDirty} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.teachers') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Teacher" message={`Delete teacher "${deleteTarget?.first_name} ${deleteTarget?.last_name}"?`} />

            <AppConfirmDialog
                open={confirmUpdateOpen}
                title="Save changes?"
                message={`Save changes to ${`${editing?.first_name ?? ''} ${editing?.last_name ?? ''}`.trim() || 'this teacher'}?`}
                confirmLabel="Update"
                tone="primary"
                loading={processing}
                onConfirm={performSave}
                onCancel={() => setConfirmUpdateOpen(false)}
            />
        </AdminLayout>
    );
}
