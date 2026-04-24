import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const buildAdminCodePreview = (role, branchId, branches) => {
    if (role === 'overalladmin') {
        return 'OVERALLADMIN01';
    }

    const selectedBranch = branches.find((branch) => String(branch.id) === String(branchId));
    const branchCode = String(selectedBranch?.code ?? 'BR')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');

    return `ADMIN-${branchCode || 'BR'}`;
};

export default function AdminUsers({ admins, filters, branches }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        name: '', email: '', password: '', role: 'admin', branch_id: '', is_activated: true,
    });
    const generatedCode = useMemo(
        () => buildAdminCodePreview(data.role, data.branch_id, branches),
        [branches, data.branch_id, data.role],
    );

    const openCreate = () => {
        reset();
        clearErrors();
        setShowPassword(false);
        setDetailOpen(false);
        setViewing(null);
        setEditing(null);
        setData('name', '');
        setData('email', '');
        setData('password', '');
        setData('role', 'admin');
        setData('branch_id', '');
        setData('is_activated', true);
        setSlideOpen(true);
    };
    const openView = (row) => { setViewing(row); setDetailOpen(true); };
    const openEdit = (row) => {
        setDetailOpen(false); setViewing(null);
        setShowPassword(false);
        setData('name', row.name ?? '');
        setData('email', row.email ?? '');
        setData('password', '');
        setData('role', row.role ?? 'admin');
        setData('branch_id', row.branch_id ? String(row.branch_id) : '');
        setData('is_activated', Boolean(row.is_activated));
        clearErrors(); setEditing(row); setSlideOpen(true);
    };
    const editFromDetails = () => viewing && openEdit(viewing);

    const submit = (e) => {
        e.preventDefault();
        const payload = {
            name: data.name,
            email: data.email,
            password: data.password,
            role: data.role,
            branch_id: data.role === 'admin' ? data.branch_id : '',
            is_activated: data.is_activated,
        };
        const url = editing ? route('admin.admin-users') + '/' + editing.id : route('admin.admin-users');
        (editing ? router.put : router.post)(url, payload, {
            onSuccess: () => {
                setSlideOpen(false);
                setShowPassword(false);
                reset();
            },
        });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Role', render: (r) => <span className={['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', r.role === 'superadmin' ? 'bg-rose-100 text-rose-700' : r.role === 'overalladmin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'].join(' ')}>{r.role}</span> },
        { key: 'branch', label: 'Branch', render: (r) => r.branch?.name ?? '-' },
        { key: 'email', label: 'Email' },
        { key: 'is_activated', label: 'Is Active', render: (r) => <StatusBadge active={Boolean(r.is_activated)} /> },
    ];

    return (
        <AdminLayout title="Admin Users" activeRoute="admin.admin-users" breadcrumbs={['System Controls']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Admin Users</h2>
                    <p className="text-sm text-slate-500">Overall admin and branch-admin accounts with access policies.</p>
                </div>
                <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Admin</button>
            </div>

            <ResourceTable columns={columns} data={admins} filters={filters} routeName="admin.admin-users" searchPlaceholder="Search admins..." onRowClick={openView} onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Admin Information">
                {viewing && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.name ?? '-'}</h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.email ?? '-'}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code</p><p className="mt-1 text-sm text-slate-900">{viewing.code ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p><p className="mt-1 text-sm text-slate-900">{viewing.role ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p><p className="mt-1 text-sm text-slate-900">{viewing.branch?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><StatusBadge active={Boolean(viewing.is_activated)} /></div></div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDetailOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Close</button>
                            <button type="button" onClick={editFromDetails} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">Edit Admin</button>
                        </div>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Admin' : 'New Admin'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Code" required>
                        <TextInput value={editing?.code ?? generatedCode} readOnly />
                    </FormField>
                    <FormField label="Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </FormField>
                    <FormField label="Email" error={errors.email} required>
                        <TextInput type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    </FormField>
                    <FormField label={editing ? 'New Password (leave blank to keep)' : 'Password'} error={errors.password} required={!editing}>
                        <div className="relative">
                            <TextInput
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <AppIcon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                            </button>
                        </div>
                    </FormField>
                    <FormField label="Role" error={errors.role}>
                        <SelectInput
                            value={data.role}
                            onChange={(e) => {
                                const selectedRole = e.target.value;
                                setData('role', selectedRole);
                                if (selectedRole !== 'admin') {
                                    setData('branch_id', '');
                                }
                            }}
                        >
                            <option value="overalladmin">Overall Admin</option>
                            <option value="admin">Admin</option>
                        </SelectInput>
                    </FormField>
                    {data.role === 'admin' && (
                        <FormField label="Branch" error={errors.branch_id} required>
                            <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                <option value="">Select branch...</option>
                                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={Boolean(data.is_activated)}
                            onChange={(e) => setData('is_activated', e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Active
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.admin-users') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Admin" message={`Delete admin "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
