import FormField, { SelectInput } from '@/Components/Admin/FormField';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function formatDate(value) {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(Number(value) || 0);
}

function cycleRank(cycle) {
    const termOrder = {
        '1st Semester': 1,
        '2nd Semester': 2,
        Summer: 3,
    };

    return (Number(cycle?.year_start) || 0) * 10 + (termOrder[cycle?.semester] ?? 0);
}

function localDateTimeValue(date = new Date()) {
    const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

    return offsetDate.toISOString().slice(0, 16);
}

export default function EvaluationCycle({ cycles = [], activeCycle = null }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [startModalOpen, setStartModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmationText, setConfirmationText] = useState('');

    const selectableCycles = useMemo(
        () => [...cycles]
            .filter((cycle) => cycle.status !== 'closed')
            .sort((first, second) => cycleRank(first) - cycleRank(second)),
        [cycles],
    );

    const pastCycles = useMemo(
        () => {
            if (!activeCycle) {
                return cycles.filter((cycle) => cycle.status !== 'active');
            }

            const activeRank = cycleRank(activeCycle);

            return cycles.filter((cycle) => cycle.status !== 'active' && cycleRank(cycle) < activeRank);
        },
        [activeCycle, cycles],
    );

    const { data, setData } = useForm({
        cycle_id: activeCycle?.year_id ? String(activeCycle.year_id) : '',
    });

    const selectedCycle = selectableCycles.find((cycle) => String(cycle.year_id) === String(data.cycle_id));
    const activeYear = activeCycle?.school_year ?? 'No active academic year';
    const activeTerm = activeCycle?.semester ?? 'No active term';

    const openChange = () => {
        setData('cycle_id', activeCycle?.year_id ? String(activeCycle.year_id) : '');
        setSlideOpen(true);
    };

    const closeChange = () => {
        setSlideOpen(false);
        setStartModalOpen(false);
        setConfirmationText('');
    };

    const submit = (event) => {
        event.preventDefault();

        if (!selectedCycle || String(selectedCycle.year_id) === String(activeCycle?.year_id ?? '')) {
            closeChange();
            return;
        }

        setConfirmationText('');
        setStartModalOpen(true);
    };

    const changeActiveCycle = () => {
        if (!selectedCycle) {
            return;
        }

        setSaving(true);
        router.put(
            `/admin/evaluation-cycle/${selectedCycle.year_id}`,
            {
                year_start: selectedCycle.year_start,
                year_end: selectedCycle.year_end,
                semester: selectedCycle.semester,
                status: 'active',
                evaluation_start_mode: 'now',
                date_opened: localDateTimeValue(),
            },
            {
                preserveScroll: true,
                onSuccess: closeChange,
                onFinish: () => setSaving(false),
            },
        );
    };

    const confirmIsValid = confirmationText.trim().toUpperCase() === 'CONFIRM';

    return (
        <AdminLayout title="Academic Year" activeRoute="admin.evaluation-cycle" breadcrumbs={['System Controls']}>
            <div className="mb-6">
                <h2 className="text-base font-semibold text-slate-900">Academic Year</h2>
                <p className="text-sm text-slate-500">Set the active evaluation term and review past academic year activity.</p>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                            <AppIcon name="calendar" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Academic Year</p>
                            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                <h3 className="text-2xl font-semibold text-slate-900">{activeYear}</h3>
                                <p className="text-base font-medium text-slate-600">{activeTerm}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={openChange}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                        <AppIcon name="edit" className="h-4 w-4" />
                        Change
                    </button>
                </div>
            </div>

            <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Past Academic Years</h3>
                        <p className="text-xs text-slate-500">Assigned questions, evaluation submissions, and cycle dates.</p>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Academic Year</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Term</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Assigned Questions</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total Evaluation Submitted</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date Opened</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date Closed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {pastCycles.length > 0 ? pastCycles.map((cycle) => (
                                    <tr key={cycle.year_id} className="hover:bg-slate-50/80">
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-900">{cycle.school_year}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{cycle.semester}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-slate-700">{formatNumber(cycle.total_assigned_questions)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-slate-700">{formatNumber(cycle.total_evaluation_submitted)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(cycle.opened_at)}</td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(cycle.closed_at)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                                            No past academic years found yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="divide-y divide-slate-100 md:hidden">
                        {pastCycles.length > 0 ? pastCycles.map((cycle) => (
                            <div key={`card-${cycle.year_id}`} className="p-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">{cycle.school_year}</p>
                                        <p className="mt-0.5 text-sm text-slate-600">{cycle.semester}</p>
                                    </div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Questions</p>
                                        <p className="mt-1 font-medium tabular-nums text-slate-900">{formatNumber(cycle.total_assigned_questions)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evaluations Submitted</p>
                                        <p className="mt-1 font-medium tabular-nums text-slate-900">{formatNumber(cycle.total_evaluation_submitted)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Opened</p>
                                        <p className="mt-1 font-medium text-slate-900">{formatDate(cycle.opened_at)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Closed</p>
                                        <p className="mt-1 font-medium text-slate-900">{formatDate(cycle.closed_at)}</p>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                No past academic years found yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <SlideOver open={slideOpen} onClose={closeChange} title="Change Academic Year">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Academic Year" required>
                        <SelectInput value={data.cycle_id} onChange={(event) => setData('cycle_id', event.target.value)}>
                            <option value="">Select academic year...</option>
                            {selectableCycles.map((cycle) => (
                                <option key={cycle.year_id} value={cycle.year_id}>
                                    {cycle.school_year} - {cycle.semester}
                                </option>
                            ))}
                        </SelectInput>
                    </FormField>

                    {selectedCycle ? (
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                            {selectedCycle.school_year} {selectedCycle.semester} will become the active evaluation term.
                        </div>
                    ) : null}

                    <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={closeChange}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <SubmitButton
                            className="px-4"
                            processing={saving}
                            disabled={!selectedCycle || String(selectedCycle.year_id) === String(activeCycle?.year_id ?? '')}
                        >
                            Continue
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            {startModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40" onClick={() => setStartModalOpen(false)} />
                    <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
                        <div>
                            <p className="text-base font-semibold text-slate-900">Start evaluation</p>
                            <p className="mt-1 text-sm text-slate-600">
                                {selectedCycle ? `${selectedCycle.school_year} ${selectedCycle.semester} will become the active evaluation term.` : ''}
                            </p>
                        </div>

                        <div className="mt-5 space-y-4">
                            <FormField label='Type "CONFIRM" to verify' required>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={(event) => setConfirmationText(event.target.value)}
                                    placeholder="CONFIRM"
                                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </FormField>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setStartModalOpen(false)}
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={changeActiveCycle}
                                disabled={!confirmIsValid || saving}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                Start Evaluation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
