import ConfirmDialog from '@/Components/ConfirmDialog';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

function AwardGroup({ title, items }) {
    if (!items?.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
                <p className="mt-1 text-sm italic text-slate-400">No data</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
            <ol className="space-y-2">
                {items.map((x, i) => (
                    <li key={`${x.id}-${i}`} className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">{i + 1}</span>
                        <span className="flex-1 text-sm text-slate-800">{x.name}</span>
                        <span className="text-sm font-bold text-blue-700">{Number(x.score).toFixed(2)}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default function OutstandingAwards({ awards = [], filters, schoolYears }) {
    const [selectedYear, setSelectedYear] = useState(filters?.school_year ?? '');
    const [confirmOpen, setConfirmOpen]   = useState(false);
    const [recomputing, setRecomputing]   = useState(false);

    const filterYear = (y) => {
        setSelectedYear(y);
        router.get(route('admin.outstanding-awards'), { school_year: y }, { preserveState: true, replace: true });
    };

    const recompute = () => setConfirmOpen(true);

    const doRecompute = () => {
        setRecomputing(true);
        router.post(route('admin.outstanding-awards.recompute'), {}, {
            onFinish: () => { setRecomputing(false); setConfirmOpen(false); },
        });
    };

    return (
        <AdminLayout title="Outstanding Awards" activeRoute="admin.outstanding-awards" breadcrumbs={['Ratings & Reports']}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Outstanding Awards</h2>
                    <p className="text-sm text-slate-500">Top performers computed from current evaluation data.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {schoolYears?.length > 0 && (
                        <select
                            value={selectedYear}
                            onChange={(e) => filterYear(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">All school years</option>
                            {schoolYears.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={recompute}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        Recompute
                    </button>
                </div>
            </div>

            {awards.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <p className="text-sm text-slate-500">No awards recorded yet. Click <strong>Recompute</strong> to generate rankings from current rating data.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {awards.map((a) => (
                        <div key={a.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">{a.branch_name} — {a.school_year} {a.semester}</h3>
                                    <p className="text-xs text-slate-400">Last updated: {a.updated_at ?? '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <AwardGroup title="Outstanding Teachers" items={a.teachers} />
                                <AwardGroup title="Outstanding Department Chairs" items={a.chairs} />
                                <AwardGroup title="Outstanding Programs" items={a.programs} />
                                <AwardGroup title="Outstanding Strands" items={a.strands} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={confirmOpen}
                title="Recompute outstanding awards?"
                message="This regenerates the top performers across all branches using current evaluation ratings, replacing the previous results. This action cannot be undone."
                confirmLabel="Recompute"
                tone="warning"
                loading={recomputing}
                onConfirm={doRecompute}
                onCancel={() => setConfirmOpen(false)}
            />
        </AdminLayout>
    );
}
