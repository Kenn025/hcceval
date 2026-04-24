import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Teachers({ teachers, filters, branches, departments, programs, strands }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        employee_no: '', branch_id: '', department_id: '', program_id: '', strand_id: '',
        first_name: '', middle_name: '', last_name: '', suffix_name: '',
        email: '', password: '', role: 'Teacher',
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ employee_no: row.employee_no, branch_id: row.branch_id, department_id: row.department_id ?? '', program_id: row.program_id ?? '', strand_id: row.strand_id ?? '', first_name: row.first_name, middle_name: row.middle_name ?? '', last_name: row.last_name, suffix_name: row.suffix_name ?? '', email: row.email ?? '', password: '', role: row.role ?? 'Teacher' });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.teachers') + '/' + editing.id : route('admin.teachers');
        (editing ? router.put : router.post)(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    const changeBranch = (branchId = '') => {
        router.get(route('admin.teachers'), { ...filters, branch_id: branchId }, {
            preserveState: true,
            replace: true,
        });
    };

    const columns = [
        { key: 'employee_no', label: 'Employee No.' },
        { key: 'full_name', label: 'Full Name', render: (r) => `${r.last_name}, ${r.first_name} ${r.middle_name ?? ''}`.trim() },
        { key: 'branch', label: 'Branch', render: (r) => r.branch?.name ?? '—' },
        { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '—' },
        { key: 'role', label: 'Role' },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    return (
        <AdminLayout title="Teachers" activeRoute="admin.teachers" breadcrumbs={['User Management']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Teachers</h2>
                    <p className="text-sm text-slate-500">Manage teaching faculty, their branch scope, and academic role assignments.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Teacher</button>
            </div>

            {branches.length > 0 && (
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

            <ResourceTable columns={columns} data={teachers} filters={filters} routeName="admin.teachers" searchPlaceholder="Search by name or employee no…" onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Teacher' : 'New Teacher'} width="max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Employee No." error={errors.employee_no} required>
                        <TextInput value={data.employee_no} onChange={(e) => setData('employee_no', e.target.value)} placeholder="EMP-2024-001" />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="First Name" error={errors.first_name} required>
                            <TextInput value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} />
                        </FormField>
                        <FormField label="Middle Name" error={errors.middle_name}>
                            <TextInput value={data.middle_name} onChange={(e) => setData('middle_name', e.target.value)} />
                        </FormField>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Last Name" error={errors.last_name} required>
                            <TextInput value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} />
                        </FormField>
                        <FormField label="Suffix" error={errors.suffix_name}>
                            <TextInput value={data.suffix_name} onChange={(e) => setData('suffix_name', e.target.value)} placeholder="Jr., Sr." />
                        </FormField>
                    </div>
                    <FormField label="Branch" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                            <option value="">Select branch…</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Department" error={errors.department_id}>
                        <SelectInput value={data.department_id} onChange={(e) => setData('department_id', e.target.value)}>
                            <option value="">Not assigned</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                        <TextInput type="password" value={data.password} onChange={(e) => setData('password', e.target.value)} placeholder={editing ? '••••••••' : 'Defaults to hcc1234'} />
                    </FormField>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-60">
                            {processing ? 'Saving…' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.teachers') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Teacher" message={`Delete teacher "${deleteTarget?.first_name} ${deleteTarget?.last_name}"?`} />
        </AdminLayout>
    );
}
