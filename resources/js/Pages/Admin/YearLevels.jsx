import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const ROUTE_MAP = {
    'college': 'admin.college.year-levels',
    'senior-high': 'admin.senior-high.year-levels',
    'junior-high': 'admin.junior-high.grade-levels',
    'grade-school': 'admin.grade-school.grade-levels',
};

export default function YearLevels({ yearLevels, filters, educationType, educationLevelName, departments, programs, strands, educationLevels }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeRoute = ROUTE_MAP[educationType] ?? 'admin.college.year-levels';

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        department_id: '', education_level_id: '', program_id: '', strand_id: '', code: '', name: '', level_no: 1, is_active: true,
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ department_id: row.department_id, education_level_id: row.education_level_id, program_id: row.program_id ?? '', strand_id: row.strand_id ?? '', code: row.code, name: row.name, level_no: row.level_no, is_active: Boolean(row.is_active) });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const base = '/admin/year-levels';
        const url = editing ? base + '/' + editing.id : base;
        (editing ? router.put : router.post)(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'level_no', label: 'Level #' },
        { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '—' },
        { key: 'program', label: 'Program', render: (r) => r.program?.name ?? '—' },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    const titleMap = { 'college': 'College Year Levels', 'senior-high': 'Senior High Year Levels', 'junior-high': 'Junior High Grade Levels', 'grade-school': 'Grade School Grade Levels' };

    return (
        <AdminLayout title={titleMap[educationType]} activeRoute={activeRoute} breadcrumbs={['Academic Setup', educationLevelName]}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{titleMap[educationType]}</h2>
                    <p className="text-sm text-slate-500">Manage year/grade levels for {educationLevelName}.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Level</button>
            </div>

            <ResourceTable columns={columns} data={yearLevels} filters={filters} routeName={activeRoute} searchPlaceholder="Search levels…" onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Level' : 'New Level'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Department" error={errors.department_id} required>
                        <SelectInput value={data.department_id} onChange={(e) => setData('department_id', e.target.value)}>
                            <option value="">Select department…</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Education Level" error={errors.education_level_id} required>
                        <SelectInput value={data.education_level_id} onChange={(e) => setData('education_level_id', e.target.value)}>
                            <option value="">Select level…</option>
                            {educationLevels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </SelectInput>
                    </FormField>
                    {(educationType === 'college') && (
                        <FormField label="Program (optional)" error={errors.program_id}>
                            <SelectInput value={data.program_id} onChange={(e) => setData('program_id', e.target.value)}>
                                <option value="">All programs</option>
                                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}
                    {(educationType === 'senior-high') && (
                        <FormField label="Strand (optional)" error={errors.strand_id}>
                            <SelectInput value={data.strand_id} onChange={(e) => setData('strand_id', e.target.value)}>
                                <option value="">All strands</option>
                                {strands.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Code" error={errors.code} required>
                            <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="COL-Y1" />
                        </FormField>
                        <FormField label="Level No." error={errors.level_no} required>
                            <TextInput type="number" min="1" value={data.level_no} onChange={(e) => setData('level_no', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Display Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="1st Year / Grade 11" />
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

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete('/admin/year-levels/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Level" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
