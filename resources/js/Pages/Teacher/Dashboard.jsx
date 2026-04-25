import AppIcon from '@/Components/AppIcon';
import PortalLayout from '@/Layouts/PortalLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const SECTION_TITLES = {
    classes: 'My Classes',
    ratings: 'My Ratings',
    evaluate: 'Faculty Evaluation',
    archive: 'Archive',
};

function EmptyState({ icon = 'teachers', message }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <AppIcon name={icon} className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">{message}</p>
        </div>
    );
}

function TeacherInfoCard({ teacher, cycle }) {
    return (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                    <AppIcon name="teachers" className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Faculty</p>
                            <h2 className="mt-0.5 text-xl font-bold text-slate-900">{teacher.name}</h2>
                        </div>
                        {cycle && (
                            <div
                                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${
                                    cycle.is_open
                                        ? 'bg-blue-50 text-blue-700 ring-blue-200'
                                        : 'bg-slate-100 text-slate-500 ring-slate-200'
                                }`}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${
                                        cycle.is_open ? 'animate-pulse bg-blue-500' : 'bg-slate-400'
                                    }`}
                                />
                                {cycle.school_year} · {cycle.semester}
                            </div>
                        )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono">{teacher.employee_no}</span>
                        {teacher.department && <span>· {teacher.department}</span>}
                        {teacher.role && <span className="capitalize">· {teacher.role}</span>}
                        {teacher.branch && <span>· {teacher.branch}</span>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ClassCard({ c }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{c.course_name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                        {c.course_code}
                        {c.section_name ? ` · ${c.section_name}` : ''}
                    </p>
                    {c.scope_label && <p className="mt-1 text-[11px] font-medium text-blue-700">{c.scope_label}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                    {c.semester_label}
                </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-50 pt-3 text-xs text-slate-500">
                {c.department_name && (
                    <span className="flex items-center gap-1.5">
                        <AppIcon name="departments" className="h-3.5 w-3.5 shrink-0 text-blue-600/50" />
                        {c.department_name}
                    </span>
                )}
                {c.schedule && (
                    <span className="flex items-center gap-1.5">
                        <AppIcon name="calendar" className="h-3.5 w-3.5 shrink-0 text-blue-600/50" />
                        {c.schedule}
                    </span>
                )}
                {c.room && (
                    <span className="flex items-center gap-1.5">
                        <AppIcon name="building" className="h-3.5 w-3.5 shrink-0 text-blue-600/50" />
                        {c.room}
                    </span>
                )}
                {c.enrolled_count !== undefined && (
                    <span className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-50/50 px-2 py-0.5 font-semibold text-blue-700 ring-1 ring-blue-100/50">
                        <AppIcon name="students" className="h-3.5 w-3.5 shrink-0" />
                        {c.enrolled_count} enrolled
                    </span>
                )}
            </div>
        </div>
    );
}

function EvaluateTab({ targets = [] }) {
    if (!targets.length) {
        return <EmptyState icon="peer" message="No co-teacher evaluations are available in your assigned scope right now." />;
    }

    const pending = targets.filter((target) => !target.done);
    const done = targets.filter((target) => target.done);
    const startEval = (target) => router.visit(route('portal.teacher.evaluate', { evaluatee_id: target.id, category: target.category }));

    return (
        <div className="space-y-4">
            {pending.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Pending ({pending.length})</p>
                    <div className="space-y-2">
                        {pending.map((target) => (
                            <div key={target.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                    <AppIcon name="teachers" className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-800">{target.name}</p>
                                    <p className="text-xs text-slate-400">
                                        {target.role}
                                        {target.scope ? ` · ${target.scope}` : ''}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => startEval(target)}
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
                        {done.map((target) => (
                            <div key={target.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                    <AppIcon name="check" className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-700">{target.name}</p>
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

function ClassesTab({ classes, cycle }) {
    if (!classes.length) {
        return <EmptyState icon="teachers" message="No assigned classes for the current evaluation cycle." />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between pb-3">
                <div>
                    <h2 className="text-base font-bold text-slate-800">My Classes</h2>
                    <p className="text-xs text-slate-400">
                        {classes.length} assigned record{classes.length !== 1 ? 's' : ''}
                    </p>
                </div>
                {cycle?.is_open ? (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                        Evaluation Open
                    </span>
                ) : (
                    cycle && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
                            Evaluation Closed
                        </span>
                    )
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-1">
                {classes.map((c) => (
                    <ClassCard key={c.class_key ?? c.section_id} c={c} />
                ))}
            </div>
        </div>
    );
}

export default function TeacherDashboard({ teacher, cycle, classes = [], pendingTargets = [] }) {
    const [activeNav, setActiveNav] = useState('classes');
    const title = SECTION_TITLES[activeNav] ?? 'Faculty Portal';

    return (
        <PortalLayout
            title={title}
            user={teacher}
            userType="teacher"
            activeNav={activeNav}
            onNavChange={setActiveNav}
        >
            {activeNav === 'classes' && (
                <>
                    <TeacherInfoCard teacher={teacher} cycle={cycle} />
                    <ClassesTab classes={classes} cycle={cycle} />
                </>
            )}

            {activeNav === 'ratings' && (
                <EmptyState icon="ratings" message="Ratings data will appear here once evaluations are submitted." />
            )}

            {activeNav === 'evaluate' && (
                <>
                    <div className="mb-5">
                        <p className="text-xs text-slate-400">
                            Co-teachers in your assigned {teacher.program ? 'program' : teacher.strand ? 'strand' : 'department'} scope
                        </p>
                    </div>
                    <EvaluateTab targets={pendingTargets} />
                </>
            )}

            {activeNav === 'archive' && (
                <EmptyState icon="archive" message="Past evaluation cycles will appear here." />
            )}
        </PortalLayout>
    );
}
