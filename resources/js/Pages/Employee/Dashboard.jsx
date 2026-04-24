import AppIcon from '@/Components/AppIcon';
import PortalLayout from '@/Layouts/PortalLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

function EmptyState({ icon = 'ratings', message }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <AppIcon name={icon} className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">{message}</p>
        </div>
    );
}

function StarBar({ value, max = 5 }) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-semibold text-slate-700">{value}</span>
        </div>
    );
}

function EmployeeInfoCard({ employee, cycle }) {
    return (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                    <AppIcon name="briefcase" className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee</p>
                    <h2 className="mt-0.5 text-xl font-bold text-slate-900">{employee.name}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="font-mono text-xs">{employee.employee_no}</span>
                        {employee.department && <span>· {employee.department}</span>}
                        {employee.role       && <span className="capitalize">· {employee.role}</span>}
                        {employee.branch     && <span>· {employee.branch}</span>}
                    </div>
                </div>
                {cycle && (
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${cycle.is_open ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                        <span className={`h-2 w-2 rounded-full ${cycle.is_open ? 'animate-pulse bg-blue-500' : 'bg-slate-400'}`} />
                        {cycle.school_year} · {cycle.semester}
                    </div>
                )}
            </div>
        </div>
    );
}

function RatingsCard({ ratings }) {
    if (!ratings?.submission_count) {
        return <EmptyState icon="ratings" message="No evaluation ratings received for the current cycle." />;
    }

    return (
        <div className="space-y-4">
            {/* Overall stat */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-slate-900">{ratings.overall_avg}</p>
                        <p className="mt-0.5 text-xs text-slate-400">out of 5.00</p>
                    </div>
                    <div className="flex-1 border-l border-slate-100 pl-5">
                        <p className="text-sm font-semibold text-slate-700">Overall Rating</p>
                        <p className="mt-0.5 text-xs text-slate-400">{ratings.submission_count} evaluation{ratings.submission_count !== 1 ? 's' : ''} received</p>
                        <div className="mt-2">
                            <StarBar value={ratings.overall_avg} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Per-question breakdown */}
            {ratings.per_question?.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="mb-3 text-sm font-semibold text-slate-700">Per-Question Breakdown</p>
                    <div className="space-y-3">
                        {ratings.per_question.map((q) => (
                            <div key={q.question_id} className="grid grid-cols-[auto_1fr] items-center gap-3">
                                <span className="w-12 text-xs font-medium text-slate-500">Q{q.question_id}</span>
                                <StarBar value={q.avg_rating} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ArchiveTab({ archiveFolders = [] }) {
    const [open, setOpen] = useState({});

    if (!archiveFolders.length) {
        return <EmptyState icon="archive" message="No archived ratings yet." />;
    }

    return (
        <div className="space-y-3">
            {archiveFolders.map((folder) => (
                <div key={folder.label} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setOpen((prev) => ({ ...prev, [folder.label]: !prev[folder.label] }))}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <AppIcon name="archive" className="h-4 w-4" />
                        </div>
                        <span className="flex-1 text-sm font-semibold text-slate-700">{folder.label}</span>
                        {folder.ratings?.overall_avg && (
                            <span className="mr-2 text-sm font-bold text-blue-600">{folder.ratings.overall_avg}</span>
                        )}
                        <AppIcon
                            name="chevronDown"
                            className={`h-4 w-4 text-slate-400 transition-transform ${open[folder.label] ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {open[folder.label] && (
                        <div className="border-t border-slate-100 p-4">
                            {folder.ratings?.submission_count ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-600">Overall Average</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-slate-800">{folder.ratings.overall_avg}</span>
                                            <span className="text-xs text-slate-400">/ 5.00</span>
                                            <span className="text-xs text-slate-400">({folder.ratings.submission_count} responses)</span>
                                        </div>
                                    </div>
                                    {folder.ratings.per_question?.map((q) => (
                                        <div key={q.question_id} className="grid grid-cols-[auto_1fr] items-center gap-3">
                                            <span className="w-12 text-xs font-medium text-slate-500">Q{q.question_id}</span>
                                            <StarBar value={q.avg_rating} />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400">No ratings for this period.</p>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function EvaluateTab({ targets = [] }) {
    if (!targets.length) {
        return <EmptyState icon="evaluate" message="No evaluations to complete right now." />;
    }

    const pending = targets.filter((t) => !t.done);
    const done    = targets.filter((t) => t.done);

    const startEval = (t) => router.visit(route('portal.employee.evaluate', { evaluatee_id: t.id, category: t.category }));

    return (
        <div className="space-y-4">
            {pending.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Pending ({pending.length})</p>
                    <div className="space-y-2">
                        {pending.map((t) => (
                            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                    <AppIcon name="user" className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-800">{t.name}</p>
                                    <p className="text-xs text-slate-400 capitalize">{t.role} · {t.category === 'head' ? 'Head evaluation' : 'Peer evaluation'}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => startEval(t)}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                    Evaluate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {done.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted ({done.length})</p>
                    <div className="space-y-2">
                        {done.map((t) => (
                            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                    <AppIcon name="check" className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-700">{t.name}</p>
                                    <p className="text-xs text-slate-400">Already submitted</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function EmployeeDashboard({ employee, cycle, currentRatings = [], archiveFolders = [], pendingTargets = [] }) {
    const [activeNav, setActiveNav] = useState('ratings');

    const titles = { ratings: 'My Ratings', evaluate: 'Evaluate', archive: 'Archive' };

    return (
        <PortalLayout
            title={titles[activeNav] ?? 'Employee Portal'}
            user={employee}
            userType="employee"
            activeNav={activeNav}
            onNavChange={setActiveNav}
        >
            {activeNav === 'ratings' && (
                <>
                    <EmployeeInfoCard employee={employee} cycle={cycle} />
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-slate-800">My Ratings</h2>
                        <p className="text-xs text-slate-400">Current evaluation cycle</p>
                    </div>
                    <RatingsCard ratings={currentRatings} />
                </>
            )}

            {activeNav === 'evaluate' && (
                <>
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-slate-800">Evaluate Colleagues</h2>
                        <p className="text-xs text-slate-400">Peer & department head evaluations for {cycle?.school_year}</p>
                    </div>
                    <EvaluateTab targets={pendingTargets} />
                </>
            )}

            {activeNav === 'archive' && (
                <>
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-slate-800">Archive</h2>
                        <p className="text-xs text-slate-400">Past evaluation cycles</p>
                    </div>
                    <ArchiveTab archiveFolders={archiveFolders} />
                </>
            )}
        </PortalLayout>
    );
}
