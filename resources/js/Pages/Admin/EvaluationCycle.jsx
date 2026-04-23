import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import SlideOver from '@/Components/Admin/SlideOver';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const STATUS_COLORS = {
    active: 'bg-emerald-50 text-emerald-700',
    inactive: 'bg-slate-100 text-slate-500',
    closed: 'bg-rose-50 text-rose-700',
};

export default function EvaluationCycle({ cycles, activeCycle }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        school_year: '', semester: '1st Semester', year_start: new Date().getFullYear(), year_end: new Date().getFullYear() + 1, status: 'inactive',
    });

    const openCreate = () => { reset(); clearErrors(); setEditing(null); setSlideOpen(true); };

    const openEdit = (row) => {
        setData({ school_year: row.school_year, semester: row.semester, year_start: row.year_start, year_end: row.year_end, status: row.status });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.evaluation-cycle') + '/' + editing.year_id : route('admin.evaluation-cycle');
        (editing ? router.put : router.post)(url, data, { onSuccess: () => { setSlideOpen(false); reset(); } });
    };

    return (
        <AdminLayout title="Evaluation Cycle" activeRoute="admin.evaluation-cycle" breadcrumbs={['System Controls']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Evaluation Cycle</h2>
                    <p className="text-sm text-slate-500">School year and semester controls for evaluation availability.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Cycle</button>
            </div>

            {activeCycle && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <p className="text-sm font-semibold text-emerald-800">Active Cycle: {activeCycle.school_year} — {activeCycle.semester}</p>
                    </div>
                </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                        <tr className="bg-slate-50">
                            {['School Year', 'Semester', 'Year Start', 'Year End', 'Status', 'Actions'].map((h) => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(!cycles || cycles.length === 0) && (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">No cycles found.</td></tr>
                        )}
                        {cycles?.map((row) => (
                            <tr key={row.year_id} className="hover:bg-slate-50/70">
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.school_year}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{row.semester}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{row.year_start}</td>
                                <td className="px-4 py-3 text-sm text-slate-700">{row.year_end}</td>
                                <td className="px-4 py-3">
                                    <span className={['inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize', STATUS_COLORS[row.status] ?? STATUS_COLORS.inactive].join(' ')}>{row.status}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => openEdit(row)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">Edit</button>
                                        <button onClick={() => setDeleteTarget(row)} className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Cycle' : 'New Evaluation Cycle'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="School Year" error={errors.school_year} required>
                        <TextInput value={data.school_year} onChange={(e) => setData('school_year', e.target.value)} placeholder="2025-2026" />
                    </FormField>
                    <FormField label="Semester" error={errors.semester} required>
                        <SelectInput value={data.semester} onChange={(e) => setData('semester', e.target.value)}>
                            <option value="1st Semester">1st Semester</option>
                            <option value="2nd Semester">2nd Semester</option>
                            <option value="Summer">Summer</option>
                            <option value="1st Quarter">1st Quarter</option>
                            <option value="2nd Quarter">2nd Quarter</option>
                            <option value="3rd Quarter">3rd Quarter</option>
                            <option value="4th Quarter">4th Quarter</option>
                        </SelectInput>
                    </FormField>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Year Start" error={errors.year_start} required>
                            <TextInput type="number" value={data.year_start} onChange={(e) => setData('year_start', e.target.value)} />
                        </FormField>
                        <FormField label="Year End" error={errors.year_end} required>
                            <TextInput type="number" value={data.year_end} onChange={(e) => setData('year_end', e.target.value)} />
                        </FormField>
                    </div>
                    <FormField label="Status" error={errors.status} required>
                        <SelectInput value={data.status} onChange={(e) => setData('status', e.target.value)}>
                            <option value="active">Active (sets as current)</option>
                            <option value="inactive">Inactive</option>
                            <option value="closed">Closed</option>
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

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.evaluation-cycle') + '/' + deleteTarget.year_id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Cycle" message={`Delete cycle "${deleteTarget?.school_year} — ${deleteTarget?.semester}"?`} />
        </AdminLayout>
    );
}
