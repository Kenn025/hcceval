import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Strands({ strands, filters, departments }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        department_id: '', code: '', name: '', description: '', duration_years: '', is_active: true,
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ department_id: row.department_id, code: row.code, name: row.name, description: row.description ?? '', duration_years: row.duration_years ?? '', is_active: Boolean(row.is_active) });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.senior-high.strands') + '/' + editing.id : route('admin.senior-high.strands');
        (editing ? router.put : router.post)(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Strand Name' },
        { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '—' },
        { key: 'duration_years', label: 'Duration', render: (r) => r.duration_years ? `${r.duration_years} yr(s)` : '—' },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    return (
        <AdminLayout title="Senior High Strands" activeRoute="admin.senior-high.strands" breadcrumbs={['Academic Setup', 'Senior High']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Senior High Strands</h2>
                    <p className="text-sm text-slate-500">Track and strand administration for senior high school.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Strand</button>
            </div>

            <ResourceTable columns={columns} data={strands} filters={filters} routeName="admin.senior-high.strands" searchPlaceholder="Search strands…" onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Strand' : 'New Strand'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Department" error={errors.department_id} required>
                        <SelectInput value={data.department_id} onChange={(e) => setData('department_id', e.target.value)}>
                            <option value="">Select department…</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Code" error={errors.code} required>
                        <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="STEM" />
                    </FormField>
                    <FormField label="Strand Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Science, Technology, Engineering and Mathematics" />
                    </FormField>
                    <FormField label="Description" error={errors.description}>
                        <TextareaInput value={data.description} onChange={(e) => setData('description', e.target.value)} />
                    </FormField>
                    <FormField label="Duration (years)" error={errors.duration_years}>
                        <TextInput type="number" min="1" value={data.duration_years} onChange={(e) => setData('duration_years', e.target.value)} />
                    </FormField>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="rounded border-slate-300" /> Active
                    </label>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-60">
                            {processing ? 'Saving…' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.senior-high.strands') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Strand" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
