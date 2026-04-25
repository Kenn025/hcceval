import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const SEMESTER_OPTIONS = ['1st Semester', '2nd Semester', 'Summer'];

const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'closed', label: 'Closed' },
];

function StatusPill({ status }) {
    const styles = {
        active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
        closed: 'bg-rose-50 text-rose-700 ring-rose-200',
    };

    return (
        <span className={['inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1', styles[status] ?? styles.inactive].join(' ')}>
            {status}
        </span>
    );
}

export default function EvaluationCycle({ cycles = [], activeCycle = null }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeLabel = activeCycle
        ? `${activeCycle.school_year} ${activeCycle.semester}`
        : 'No active academic year set';

    const { data, setData, errors, processing, clearErrors, put } = useForm({
        year_start: 2025,
        year_end: 2026,
        semester: '1st Semester',
        status: 'inactive',
    });

    const summary = useMemo(() => {
        const active = cycles.filter((cycle) => cycle.status === 'active').length;
        const inactive = cycles.filter((cycle) => cycle.status === 'inactive').length;
        const closed = cycles.filter((cycle) => cycle.status === 'closed').length;

        return { active, inactive, closed, total: cycles.length };
    }, [cycles]);

    const openEdit = (cycle) => {
        clearErrors();
        setEditing(cycle);
        setData({
            year_start: cycle.year_start,
            year_end: cycle.year_end,
            semester: cycle.semester,
            status: cycle.status,
        });
        setSlideOpen(true);
    };

    const closeSlide = () => {
        setSlideOpen(false);
        setEditing(null);
        clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closeSlide,
        };

        if (editing) {
            put(`/admin/evaluation-cycle/${editing.year_id}`, options);
        }
    };

    const deleteCycle = () => {
        if (!deleteTarget) {
            return;
        }

        router.delete(`/admin/evaluation-cycle/${deleteTarget.year_id}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AdminLayout title="Academic Year" activeRoute="admin.evaluation-cycle" breadcrumbs={['System Controls']}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Academic Year</h2>
                    <p className="text-sm text-slate-500">Manage school years, terms, and the active evaluation cycle.</p>
                </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <AppIcon name="calendar" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Active Term</p>
                            <p className="truncate text-base font-semibold text-slate-900">{activeLabel}</p>
                        </div>
                    </div>
                </div>
                {[
                    ['Active', summary.active, 'text-emerald-700'],
                    ['Inactive', summary.inactive, 'text-slate-700'],
                    ['Closed', summary.closed, 'text-rose-700'],
                ].map(([label, value, color]) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                        <p className={['mt-1 text-2xl font-semibold tabular-nums', color].join(' ')}>{value}</p>
                    </div>
                ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">School Year</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Term</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {cycles.length > 0 ? cycles.map((cycle) => (
                                <tr key={cycle.year_id} className="hover:bg-slate-50/80">
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{cycle.school_year}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{cycle.semester}</td>
                                    <td className="px-4 py-3 text-sm"><StatusPill status={cycle.status} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(cycle)}
                                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setDeleteTarget(cycle)}
                                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="4" className="px-4 py-8 text-center text-sm text-slate-500">
                                        No academic years found yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-slate-100">
                    {cycles.length > 0 ? cycles.map((cycle) => (
                        <div key={`card-${cycle.year_id}`} className="p-4 active:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">School Year</div>
                                        <div className="mt-0.5 text-sm font-semibold text-slate-900">{cycle.school_year}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Term</div>
                                        <div className="mt-0.5 text-sm font-medium text-slate-600">{cycle.semester}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</div>
                                        <div className="mt-1"><StatusPill status={cycle.status} /></div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => openEdit(cycle)}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(cycle)}
                                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                            No academic years found yet.
                        </div>
                    )}
                </div>
            </div>

            <SlideOver
                open={slideOpen}
                onClose={closeSlide}
                title="Edit Academic Year"
            >
                <form onSubmit={submit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="From Year" error={errors.year_start} required>
                            <TextInput
                                type="number"
                                min="2000"
                                max="2100"
                                value={data.year_start}
                                onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setData({
                                        ...data,
                                        year_start: value,
                                        year_end: Math.max(value + 1, Number(data.year_end) || value + 1),
                                    });
                                }}
                            />
                        </FormField>
                        <FormField label="To Year" error={errors.year_end} required>
                            <TextInput
                                type="number"
                                min="2000"
                                max="2100"
                                value={data.year_end}
                                onChange={(event) => setData('year_end', Number(event.target.value))}
                            />
                        </FormField>
                    </div>

                    <FormField label="Term" error={errors.semester} required>
                        <SelectInput value={data.semester} onChange={(event) => setData('semester', event.target.value)}>
                            {SEMESTER_OPTIONS.map((semester) => (
                                <option key={semester} value={semester}>{semester}</option>
                            ))}
                        </SelectInput>
                    </FormField>

                    <FormField label="Status" error={errors.status} required>
                        <SelectInput value={data.status} onChange={(event) => setData('status', event.target.value)}>
                            {STATUS_OPTIONS.map((status) => (
                                <option key={status.value} value={status.value}>{status.label}</option>
                            ))}
                        </SelectInput>
                    </FormField>

                    {data.status === 'active' ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            Saving this as active will mark other academic years as inactive.
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={closeSlide}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <SubmitButton className="px-4" processing={processing}>
                            Save Changes
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Close academic year?"
                message={deleteTarget ? `This will close ${deleteTarget.school_year} ${deleteTarget.semester}. It will no longer be active.` : ''}
                confirmLabel="Close"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={deleteCycle}
            />
        </AdminLayout>
    );
}
