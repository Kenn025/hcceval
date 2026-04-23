import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function AdminUsers({ admins, filters, branches }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        admin_name: '', admin_email: '', admin_password: '', role: 'admin', branch_id: '',
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ admin_name: row.admin_name, admin_email: row.admin_email, admin_password: '', role: row.role ?? 'admin', branch_id: row.branch_id });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.admin-users') + '/' + editing.admin_id : route('admin.admin-users');
        (editing ? router.put : router.post)(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    const columns = [
        { key: 'admin_name', label: 'Name' },
        { key: 'admin_email', label: 'Email' },
        { key: 'role', label: 'Role', render: (r) => <span className={['inline-flex rounded-full px-2 py-0.5 text-xs font-medium', r.role === 'overall' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'].join(' ')}>{r.role}</span> },
        { key: 'branch', label: 'Branch', render: (r) => r.branch?.name ?? '—' },
    ];

    return (
        <AdminLayout title="Admin Users" activeRoute="admin.admin-users" breadcrumbs={['System Controls']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Admin Users</h2>
                    <p className="text-sm text-slate-500">Overall admin and branch-admin accounts with access policies.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Admin</button>
            </div>

            <ResourceTable columns={columns} data={admins} filters={filters} routeName="admin.admin-users" searchPlaceholder="Search admins…" onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Admin' : 'New Admin'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Full Name" error={errors.admin_name} required>
                        <TextInput value={data.admin_name} onChange={(e) => setData('admin_name', e.target.value)} />
                    </FormField>
                    <FormField label="Email" error={errors.admin_email} required>
                        <TextInput type="email" value={data.admin_email} onChange={(e) => setData('admin_email', e.target.value)} />
                    </FormField>
                    <FormField label={editing ? 'New Password (leave blank to keep)' : 'Password'} error={errors.admin_password} required={!editing}>
                        <TextInput type="password" value={data.admin_password} onChange={(e) => setData('admin_password', e.target.value)} />
                    </FormField>
                    <FormField label="Role" error={errors.role}>
                        <SelectInput value={data.role} onChange={(e) => setData('role', e.target.value)}>
                            <option value="overall">Overall Admin</option>
                            <option value="admin">Branch Admin</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Branch" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                            <option value="">Select branch…</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-60">
                            {processing ? 'Saving…' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.admin-users') + '/' + deleteTarget.admin_id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Admin" message={`Delete admin "${deleteTarget?.admin_name}"?`} />
        </AdminLayout>
    );
}
