import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Programs({ programs, filters, departments }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        department_id: '', code: '', name: '', description: '', program_type: 'PROGRAM', duration_years: '', total_units: '', is_active: true,
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ department_id: row.department_id, code: row.code, name: row.name, description: row.description ?? '', program_type: row.program_type ?? 'PROGRAM', duration_years: row.duration_years ?? '', total_units: row.total_units ?? '', is_active: Boolean(row.is_active) });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.college.programs') + '/' + editing.id : route('admin.college.programs');
        (editing ? router.put : router.post)(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Program Name' },
        { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '—' },
        { key: 'program_type', label: 'Type' },
        { key: 'duration_years', label: 'Duration', render: (r) => r.duration_years ? `${r.duration_years} yr(s)` : '—' },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    return (
        <AdminLayout title="College Programs" activeRoute="admin.college.programs" breadcrumbs={['Academic Setup', 'College']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">College Programs</h2>
                    <p className="text-sm text-slate-500">Manage degree programs offered per department.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Program</button>
            </div>

            <ResourceTable columns={columns} data={programs} filters={filters} routeName="admin.college.programs" searchPlaceholder="Search programs…" onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Program' : 'New Program'} width="max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Department" error={errors.department_id} required>
                        <SelectInput value={data.department_id} onChange={(e) => setData('department_id', e.target.value)}>
                            <option value="">Select department…</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Code" error={errors.code} required>
                            <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="BSCS" />
                        </FormField>
                        <FormField label="Type" error={errors.program_type}>
                            <SelectInput value={data.program_type} onChange={(e) => setData('program_type', e.target.value)}>
                                <option value="PROGRAM">Degree Program</option>
                                <option value="CERTIFICATE">Certificate</option>
                                <option value="DIPLOMA">Diploma</option>
                            </SelectInput>
                        </FormField>
                    </div>
                    <FormField label="Program Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Bachelor of Science in Computer Science" />
                    </FormField>
                    <FormField label="Description" error={errors.description}>
                        <TextareaInput value={data.description} onChange={(e) => setData('description', e.target.value)} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Duration (years)" error={errors.duration_years}>
                            <TextInput type="number" min="1" value={data.duration_years} onChange={(e) => setData('duration_years', e.target.value)} />
                        </FormField>
                        <FormField label="Total Units" error={errors.total_units}>
                            <TextInput type="number" step="0.5" value={data.total_units} onChange={(e) => setData('total_units', e.target.value)} />
                        </FormField>
                    </div>
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

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.college.programs') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Program" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
