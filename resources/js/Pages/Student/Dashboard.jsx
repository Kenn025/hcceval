import AppIcon from '@/Components/AppIcon';
import PortalLayout from '@/Layouts/PortalLayout';
import { useState } from 'react';

const SECTION_TITLES = {
    subjects:    'My Subjects',
    evaluations: 'My Evaluations',
    archive:     'Archive',
};

const CATEGORY_LABELS = {
    teacher_subject: 'Subject Teacher',
    teacher_outside: 'Outside Teacher',
    program_chair:   'Program Chair',
    employee:        'Employee',
};

function Badge({ children, color = 'blue' }) {
    const map = {
        green:  'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        blue:   'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
        slate:  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
        amber:  'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[color] ?? map.blue}`}>
            {children}
        </span>
    );
}

function EmptyState({ icon = 'subjects', message }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <AppIcon name={icon} className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">{message}</p>
        </div>
    );
}

function StudentInfoCard({ student, cycle }) {
    return (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                    <AppIcon name="students" className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Student</p>
                    <h2 className="mt-0.5 text-xl font-bold text-slate-900">{student.name}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="font-mono text-xs">{student.student_no}</span>
                        {student.department && <span>· {student.department}</span>}
                        {student.program   && <span>· {student.program}</span>}
                        {student.branch    && <span>· {student.branch}</span>}
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

function SubjectsTab({ subjects }) {
    if (!subjects.length) {
        return <EmptyState icon="subjects" message="No enrolled subjects for the current evaluation cycle." />;
    }

    return (
        <div className="space-y-3">
            {subjects.map((s) => (
                <div key={s.section_id ?? s.course_code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{s.course_name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{s.course_code}{s.section_name ? ` · ${s.section_name}` : ''}</p>
                        </div>
                        {s.already_evaluated
                            ? <Badge color="blue">Evaluated</Badge>
                            : <Badge color="slate">Pending</Badge>}
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto] items-end gap-2">
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <AppIcon name="teachers" className="h-3.5 w-3.5 shrink-0" />
                                {s.teacher_name || 'No teacher assigned'}
                            </span>
                            {s.schedule && (
                                <span className="flex items-center gap-1.5">
                                    <AppIcon name="calendar" className="h-3.5 w-3.5 shrink-0" />
                                    {s.schedule}
                                </span>
                            )}
                            {s.room && (
                                <span className="flex items-center gap-1.5">
                                    <AppIcon name="building" className="h-3.5 w-3.5 shrink-0" />
                                    {s.room}
                                </span>
                            )}
                        </div>
                        <Badge color="blue">{s.semester_label}</Badge>
                    </div>
                </div>
            ))}
        </div>
    );
}

function EvaluationsTab({ evaluations }) {
    if (!evaluations.length) {
        return <EmptyState icon="check-circle" message="No evaluation records found for the current cycle." />;
    }

    return (
        <div className="space-y-3">
            {evaluations.map((e) => (
                <div key={e.submission_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{e.course_name || e.evaluatee_name || '—'}</p>
                            {e.course_code && <p className="mt-0.5 text-xs text-slate-500">{e.course_code}</p>}
                        </div>
                        <Badge color="blue">Submitted</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        {e.teacher_name && (
                            <span className="flex items-center gap-1.5">
                                <AppIcon name="teachers" className="h-3.5 w-3.5 shrink-0" />
                                {e.teacher_name}
                            </span>
                        )}
                        {e.category && (
                            <Badge color="purple">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>
                        )}
                        {e.submitted_at && (
                            <span className="ml-auto flex items-center gap-1.5">
                                <AppIcon name="calendar" className="h-3.5 w-3.5 shrink-0" />
                                {new Date(e.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ArchiveTab({ archive }) {
    if (!archive.length) {
        return <EmptyState icon="archive" message="No archived evaluation records yet." />;
    }

    // Group by school_year + semester if items are flat, or just display them
    const grouped = archive.reduce((acc, item) => {
        const key = `${item.school_year} ${item.semester_label ?? ''}`.trim();
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([label, items]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                            <AppIcon name="archive" className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{label}</span>
                        <span className="ml-auto text-xs text-slate-400">{items.length} record{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {items.map((e) => (
                            <div key={e.submission_id} className="flex items-center justify-between gap-3 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{e.course_name || e.evaluatee_name || '—'}</p>
                                    {e.course_code && <p className="text-xs text-slate-400">{e.course_code}</p>}
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {e.category && <Badge color="purple">{CATEGORY_LABELS[e.category] ?? e.category}</Badge>}
                                    <Badge color="blue">Submitted</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function StudentDashboard({ student, cycle, subjects = [], evaluations = [], archive = [] }) {
    const [activeNav, setActiveNav] = useState('subjects');

    const counts = {
        subjects:    subjects.length,
        evaluations: evaluations.length,
        archive:     archive.length,
    };

    const title = SECTION_TITLES[activeNav] ?? 'Student Portal';

    return (
        <PortalLayout
            title={title}
            user={student}
            userType="student"
            activeNav={activeNav}
            onNavChange={setActiveNav}
        >
            {/* Student info + cycle — shown only on subjects tab */}
            {activeNav === 'subjects' && (
                <StudentInfoCard student={student} cycle={cycle} />
            )}

            {/* Section header */}
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">{title}</h2>
                    {counts[activeNav] > 0 && (
                        <p className="text-xs text-slate-400">{counts[activeNav]} record{counts[activeNav] !== 1 ? 's' : ''}</p>
                    )}
                </div>
                {!cycle?.is_open && activeNav === 'subjects' && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        Evaluation Closed
                    </span>
                )}
                {cycle?.is_open && activeNav === 'subjects' && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                        Evaluation Open
                    </span>
                )}
            </div>

            {activeNav === 'subjects'    && <SubjectsTab    subjects={subjects} />}
            {activeNav === 'evaluations' && <EvaluationsTab evaluations={evaluations} />}
            {activeNav === 'archive'     && <ArchiveTab     archive={archive} />}
        </PortalLayout>
    );
}
