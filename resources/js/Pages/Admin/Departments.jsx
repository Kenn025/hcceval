import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Departments({ departments, filters, branches, educationLevels }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        code: '', name: '', branch_id: '', education_level_id: '', is_active: true,
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ code: row.code, name: row.name, branch_id: row.branch_id, education_level_id: row.education_level_id, is_active: Boolean(row.is_active) });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.departments') + '/' + editing.id : route('admin.departments');
        const method = editing ? router.put : router.post;
        method(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Department Name' },
        { key: 'branch', label: 'Branch', render: (r) => r.branch?.name ?? '—' },
        { key: 'education_level', label: 'Level', render: (r) => r.education_level?.name ?? '—' },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    return (
        <AdminLayout title="Departments" activeRoute="admin.departments" breadcrumbs={['System Controls']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Departments</h2>
                    <p className="text-sm text-slate-500">Manage academic departments per branch and education level.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    + New Department
                </button>
            </div>

            <ResourceTable columns={columns} data={departments} filters={filters} routeName="admin.departments" searchPlaceholder="Search departments…" onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Department' : 'New Department'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Code" error={errors.code} required>
                        <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="DEP-MAIN-COL" />
                    </FormField>
                    <FormField label="Department Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </FormField>
                    <FormField label="Branch" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                            <option value="">Select branch…</option>
                            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Education Level" error={errors.education_level_id} required>
                        <SelectInput value={data.education_level_id} onChange={(e) => setData('education_level_id', e.target.value)}>
                            <option value="">Select level…</option>
                            {educationLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="rounded border-slate-300" /> Active
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                            {processing ? 'Saving…' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.departments') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Department" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
