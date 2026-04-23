import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const ROUTE_MAP = {
    'college': 'admin.college.subjects',
    'senior-high': 'admin.senior-high.subjects',
    'junior-high': 'admin.junior-high.subjects',
    'grade-school': 'admin.grade-school.subjects',
};

export default function Subjects({ subjects, filters, educationType, educationLevelName, departments, yearLevels }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeRoute = ROUTE_MAP[educationType] ?? 'admin.college.subjects';

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        department_id: '', year_level_id: '', code: '', name: '', description: '', units: '', term_type: '', term: '', education_level: educationLevelName, grade_level: '', is_active: true,
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ department_id: row.department_id, year_level_id: row.year_level_id ?? '', code: row.code, name: row.name, description: row.description ?? '', units: row.units ?? '', term_type: row.term_type ?? '', term: row.term ?? '', education_level: row.education_level ?? educationLevelName, grade_level: row.grade_level ?? '', is_active: Boolean(row.is_active) });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? '/admin/subjects/' + editing.id : '/admin/subjects';
        (editing ? router.put : router.post)(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Subject Name' },
        { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '—' },
        { key: 'units', label: 'Units', render: (r) => r.units ?? '—' },
        { key: 'term', label: 'Term' },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    const titleMap = { 'college': 'College Subjects', 'senior-high': 'Senior High Subjects', 'junior-high': 'Junior High Subjects', 'grade-school': 'Grade School Subjects' };

    return (
        <AdminLayout title={titleMap[educationType]} activeRoute={activeRoute} breadcrumbs={['Academic Setup', educationLevelName]}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{titleMap[educationType]}</h2>
                    <p className="text-sm text-slate-500">Subject catalog for {educationLevelName} level courses.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Subject</button>
            </div>

            <ResourceTable columns={columns} data={subjects} filters={filters} routeName={activeRoute} searchPlaceholder="Search subjects…" onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Subject' : 'New Subject'} width="max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Department" error={errors.department_id} required>
                        <SelectInput value={data.department_id} onChange={(e) => setData('department_id', e.target.value)}>
                            <option value="">Select department…</option>
                            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Year/Grade Level" error={errors.year_level_id}>
                        <SelectInput value={data.year_level_id} onChange={(e) => setData('year_level_id', e.target.value)}>
                            <option value="">Not assigned</option>
                            {yearLevels.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                        </SelectInput>
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Code" error={errors.code} required>
                            <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="CS101" />
                        </FormField>
                        <FormField label="Units" error={errors.units}>
                            <TextInput type="number" step="0.5" min="0" value={data.units} onChange={(e) => setData('units', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Subject Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </FormField>
                    <FormField label="Description" error={errors.description}>
                        <TextareaInput value={data.description} onChange={(e) => setData('description', e.target.value)} />
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Term Type" error={errors.term_type}>
                            <SelectInput value={data.term_type} onChange={(e) => setData('term_type', e.target.value)}>
                                <option value="">—</option>
                                <option value="Semester">Semester</option>
                                <option value="Trimester">Trimester</option>
                                <option value="Quarter">Quarter</option>
                            </SelectInput>
                        </FormField>
                        <FormField label="Term" error={errors.term}>
                            <TextInput value={data.term} onChange={(e) => setData('term', e.target.value)} placeholder="1st Semester" />
                        </FormField>
                    </div>
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

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete('/admin/subjects/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Subject" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
