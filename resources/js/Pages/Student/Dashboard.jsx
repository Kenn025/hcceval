import AppIcon from '@/Components/AppIcon';
import ConfirmDialog from '@/Components/ConfirmDialog';
import EvaluationProgress from '@/Components/EvaluationProgress';
import Modal from '@/Components/Modal';
import PortalLayout from '@/Layouts/PortalLayout';
import { router } from '@inertiajs/react';
import { Fragment, useEffect, useState } from 'react';

const SECTION_TITLES = {
    subjects:    'Dashboard',
    program_chairs: 'Program Chairs',
    employees: 'Employee Feedback',
    evaluations: 'Evaluation Submissions',
    archive:     'Archive',
};

const CATEGORY_LABELS = {
    teacher_subject: 'Subject Teacher',
    teacher_outside: 'Outside Teacher',
    program_chair:   'Program Chair',
    employee_evaluation: 'Employee Feedback',
    employee:        'Employee Feedback',
};

function Badge({ children, color = 'blue' }) {
    const map = {
        green:  'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
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

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function formatDate(value) {
    if (!value) return '-';

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function printSubmittedEvaluationReport(evaluation) {
    if (!evaluation) return;

    const rows = (evaluation.answers ?? []).map((answer, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(answer.question_text)}</td>
            <td>${escapeHtml(answer.rating ?? '-')}</td>
        </tr>
    `).join('');
    const title = evaluation.course_name || evaluation.evaluatee_name || 'Submitted Evaluation';
    const subtitle = [
        evaluation.course_code,
        evaluation.teacher_name || evaluation.evaluatee_name,
        CATEGORY_LABELS[evaluation.category] ?? evaluation.category,
    ].filter(Boolean).join(' - ');
    const period = evaluation.archive_group_label
        || [evaluation.school_year, evaluation.semester_label].filter(Boolean).join(' - ')
        || 'Academic year unavailable';
    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    reportWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(title)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
                    .header { border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; }
                    .eyebrow { color: #1d4ed8; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 24px; margin: 8px 0 4px; }
                    .muted { color: #64748b; font-size: 13px; }
                    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
                    .box-label { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
                    .box-value { font-size: 18px; font-weight: 800; margin-top: 6px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
                    th { background: #eff6ff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #334155; }
                    .comments { margin-top: 18px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        tr, .box, .comments { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                <div class="header">
                    <div class="eyebrow">Submitted Evaluation</div>
                    <h1>${escapeHtml(title)}</h1>
                    <div class="muted">${escapeHtml(subtitle)}</div>
                    <div class="muted">${escapeHtml(period)}</div>
                </div>
                <div class="summary">
                    <div class="box"><div class="box-label">Academic Year</div><div class="box-value">${escapeHtml(period)}</div></div>
                    <div class="box"><div class="box-label">Submitted</div><div class="box-value">${escapeHtml(formatDate(evaluation.submitted_at))}</div></div>
                    <div class="box"><div class="box-label">Average</div><div class="box-value">${escapeHtml(evaluation.overall_average ?? '-')}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:52px;">#</th>
                            <th>Questionnaire Item</th>
                            <th style="width:110px;">Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="3">No answer details are available.</td></tr>'}
                    </tbody>
                </table>
                <div class="comments">
                    <div class="box-label">Comments</div>
                    <p>${escapeHtml(evaluation.comments || 'No comment provided.')}</p>
                </div>
                <script>
                    window.onload = function () {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
        </html>
    `);
    reportWindow.document.close();
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

function SubjectStatusCard({ subjects }) {
    const total = subjects.length;
    const evaluated = subjects.filter((subject) => subject.already_evaluated).length;
    const irregular = subjects.filter((subject) => subject.is_irregular).length;
    const ratedSubjects = subjects.filter((subject) => subject.overall_rating !== null && subject.overall_rating !== undefined);
    const ratingWeight = ratedSubjects.reduce((sum, subject) => sum + Math.max(Number(subject.rating_submission_count ?? 0), 1), 0);
    const ratingTotal = ratedSubjects.reduce((sum, subject) => (
        sum + (Number(subject.overall_rating) * Math.max(Number(subject.rating_submission_count ?? 0), 1))
    ), 0);
    const overallRating = ratingWeight > 0 ? ratingTotal / ratingWeight : null;
    const progress = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    const cards = [
        { label: 'Progress', value: `${progress}%`, detail: `${evaluated} of ${total} evaluated`, icon: 'check-circle', color: 'blue' },
        {
            label: 'Overall Rating',
            value: overallRating !== null ? overallRating.toFixed(2) : '-',
            detail: ratedSubjects.length ? `${ratedSubjects.length} rated subject${ratedSubjects.length === 1 ? '' : 's'}` : 'No ratings yet',
            icon: 'ratings',
            color: 'purple',
        },
        { label: 'Registered Subjects', value: total, detail: 'Current cycle', icon: 'subjects', color: 'emerald' },
        { label: 'Irregular Subjects', value: irregular, detail: irregular === 1 ? 'Irregular load' : 'Irregular loads', icon: 'layers', color: 'amber' },
    ];
    const colors = {
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
        purple: 'bg-violet-50 text-violet-700 ring-violet-100',
        emerald: 'bg-blue-50 text-blue-700 ring-blue-100',
        amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    };

    return (
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{card.label}</p>
                            <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{card.detail}</p>
                        </div>
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${colors[card.color]}`}>
                            <AppIcon name={card.icon} className="h-5 w-5" />
                        </div>
                    </div>
                    {card.label === 'Progress' && (
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    )}
                    {card.label === 'Overall Rating' && overallRating !== null && (
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${Math.min((overallRating / 5) * 100, 100)}%` }} />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

function AssignedSubjectTeacherRatingsCard({ subjects, onViewEvaluation }) {
    const orderedSubjects = [...subjects].sort((left, right) => (
        (left.course_name ?? '').localeCompare(right.course_name ?? '')
    ));

    return (
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Subjects and Teachers</p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-800">Overall ratings for the active academic year</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                    <AppIcon name="ratings" className="h-5 w-5" />
                </div>
            </div>
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
                {orderedSubjects.map((subject) => {
                    const hasRating = subject.overall_rating !== null && subject.overall_rating !== undefined;
                    const rating = hasRating ? Number(subject.overall_rating) : null;
                    const percentage = rating !== null ? Math.min((rating / 5) * 100, 100) : 0;

                    return (
                        <div key={subject.section_id ?? subject.course_id ?? subject.course_code} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{subject.course_name}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{subject.course_code || 'No subject code'}</p>
                            </div>
                            <div className="mt-3 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Teacher</p>
                                <p className="truncate text-sm font-medium text-slate-700">{subject.teacher_name || 'No teacher assigned'}</p>
                            </div>
                            <div className="mt-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rating</p>
                                    <p className="text-sm font-bold text-slate-900">{rating !== null ? `${rating.toFixed(2)} / 5` : '-'}</p>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-violet-600" style={{ width: `${percentage}%` }} />
                                </div>
                                <p className="mt-1 text-right text-[11px] text-slate-400">
                                    {Number(subject.rating_submission_count ?? 0) > 0
                                        ? `${subject.rating_submission_count} response${Number(subject.rating_submission_count) === 1 ? '' : 's'}`
                                        : 'No ratings yet'}
                                </p>
                                {subject.already_evaluated && (
                                    <button
                                        type="button"
                                        onClick={() => onViewEvaluation?.(subject)}
                                        className="mt-3 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
                                    >
                                        View Full Ratings
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SubjectsTab({ subjects, cycle, onStartEvaluation, onViewEvaluation }) {
    if (!subjects.length) {
        return <EmptyState icon="subjects" message="No enrolled subjects for the current evaluation cycle." />;
    }

    const orderedSubjects = [...subjects].sort((left, right) => {
        if (left.already_evaluated === right.already_evaluated) {
            return (left.course_name ?? '').localeCompare(right.course_name ?? '');
        }

        return left.already_evaluated ? 1 : -1;
    });

    return (
        <>
        <AssignedSubjectTeacherRatingsCard subjects={subjects} onViewEvaluation={onViewEvaluation} />
        <SubjectStatusCard subjects={subjects} />
        <div className="space-y-3">
            {orderedSubjects.map((s) => (
                <div key={s.section_id ?? s.course_code} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{s.course_name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">{s.course_code}{s.section_name ? ` · ${s.section_name}` : ''}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {s.is_irregular && <Badge color="amber">Irregular</Badge>}
                            {s.registration_status
                                ? <Badge color="green">{s.registration_status}</Badge>
                                : s.already_evaluated
                                    ? <Badge color="blue">Evaluated</Badge>
                                    : <Badge color="slate">Pending</Badge>}
                        </div>
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
                            {s.overall_rating !== null && s.overall_rating !== undefined && (
                                <span className="flex items-center gap-1.5 font-semibold text-violet-700">
                                    <AppIcon name="ratings" className="h-3.5 w-3.5 shrink-0" />
                                    Overall {Number(s.overall_rating).toFixed(2)} / 5
                                    {Number(s.rating_submission_count ?? 0) > 0
                                        ? ` (${s.rating_submission_count} response${Number(s.rating_submission_count) === 1 ? '' : 's'})`
                                        : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge color="blue">{s.semester_label}</Badge>
                            {s.already_evaluated && (
                                <button
                                    type="button"
                                    onClick={() => onViewEvaluation?.(s)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    View
                                </button>
                            )}
                            {cycle?.is_open && !s.already_evaluated && s.can_evaluate !== false && (s.section_id || s.course_id) && (
                                <button
                                    type="button"
                                    onClick={() => onStartEvaluation?.(s)}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                                >
                                    Start Evaluation
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        </>
    );
}

function ProgramChairEvaluationTab({ targets = [], onStartEvaluation }) {
    const orderedTargets = [...targets].sort((a, b) => {
        if (a.done !== b.done) {
            return Number(a.done) - Number(b.done);
        }

        return (a.name ?? '').localeCompare(b.name ?? '');
    });
    const scopedTargets = orderedTargets.filter((target) => target.scoped);
    const otherTargets = orderedTargets.filter((target) => !target.scoped);

    if (!orderedTargets.length) {
        return <EmptyState icon="school" message="No program chair evaluations are assigned to your account right now." />;
    }

    function renderTarget(target) {
        return (
            <div
                key={target.id}
                className={`flex items-start gap-2.5 rounded-xl border bg-white p-3 shadow-sm ${
                    target.done ? 'border-slate-100' : 'border-slate-200'
                }`}
            >
                <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg ${target.done ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                    <AppIcon name={target.done ? 'check-circle' : 'school'} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{target.name}</p>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                            target.done ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-100 text-slate-700 ring-slate-200'
                        }`}>
                            {target.done ? 'Submitted' : 'Pending'}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                            target.scoped ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-100 text-slate-600 ring-slate-200'
                        }`}>
                            {target.scoped ? 'Scoped' : 'Other'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400">
                        {target.role}
                        {target.scope ? ` · ${target.scope}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {target.questionnaire_id && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                Questionnaire ID: {target.questionnaire_code || target.questionnaire_id}
                            </span>
                        )}
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                            target.questionnaire_title ? 'bg-slate-100 text-slate-700 ring-slate-200' : 'bg-amber-50 text-amber-700 ring-amber-200'
                        }`}>
                            {target.questionnaire_title || 'No assigned questionnaire'}
                        </span>
                        {!target.questionnaire_id && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                Assignment needed
                            </span>
                        )}
                    </div>
                </div>
                {target.done ? (
                    <button
                        type="button"
                        onClick={() => onStartEvaluation?.(target)}
                        disabled={!target.questionnaire_id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                        View
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => onStartEvaluation?.(target)}
                        disabled={!target.questionnaire_id}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        Start Evaluation
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {scopedTargets.length > 0 && (
                <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Scoped Program Chairs ({scopedTargets.length})</p>
                    <div className="space-y-3">{scopedTargets.map(renderTarget)}</div>
                </div>
            )}
            {otherTargets.length > 0 && (
                <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Other Program Chairs ({otherTargets.length})</p>
                    <div className="space-y-3">{otherTargets.map(renderTarget)}</div>
                </div>
            )}
        </div>
    );
}

function EvaluationPlaceholderTab({ icon, message }) {
    return <EmptyState icon={icon} message={message} />;
}

function EmployeeFeedbackTab({ employees = [], branchName, onStartEvaluation }) {
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [employeePageSize, setEmployeePageSize] = useState(15);
    const [employeeDepartment, setEmployeeDepartment] = useState('all');

    const departments = Array.from(new Set(
        employees.map((employee) => employee.employee_department_name || 'Unassigned Department'),
    )).sort((a, b) => a.localeCompare(b));

    const normalizedSearch = employeeSearch.trim().toLowerCase();
    const filteredEmployees = employees.filter((employee) => {
        const departmentName = employee.employee_department_name || 'Unassigned Department';
        const matchesDepartment = employeeDepartment === 'all' || departmentName === employeeDepartment;
        const searchableText = [
            employee.name,
            employee.code,
            employee.role,
            employee.email,
            departmentName,
            employee.questionnaire_title,
            employee.questionnaire_code,
        ].filter(Boolean).join(' ').toLowerCase();

        return matchesDepartment && (!normalizedSearch || searchableText.includes(normalizedSearch));
    });
    const visibleEmployees = filteredEmployees.slice(0, employeePageSize);

    if (!employees.length) {
        return <EmptyState icon="briefcase" message="No active employees are available in your assigned branch right now." />;
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Employee feedback evaluations are optional and are not required to complete your student evaluations.
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                    <label className="relative block min-w-0 md:w-[400px]">
                        <AppIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={employeeSearch}
                            onChange={(event) => setEmployeeSearch(event.target.value)}
                            placeholder="Search employees..."
                            className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                        />
                    </label>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                            Show
                            <select
                                value={employeePageSize}
                                onChange={(event) => setEmployeePageSize(Number(event.target.value))}
                                className="h-12 w-20 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium normal-case tracking-normal text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                            >
                                {[5, 10, 15, 25, 50].map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                ))}
                            </select>
                        </label>
                        <select
                            value={employeeDepartment}
                            onChange={(event) => setEmployeeDepartment(event.target.value)}
                            className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 lg:w-[280px]"
                        >
                            <option value="all">All departments</option>
                            {departments.map((department) => (
                                <option key={department} value={department}>{department}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {visibleEmployees.length ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-[13px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="w-16 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
                                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Department</th>
                                    <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Role</th>
                                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white">
                                {visibleEmployees.map((employee, index) => {
                                    const hasQuestionnaire = Boolean(employee.questionnaire_id);
                                    const departmentName = employee.employee_department_name || 'Unassigned Department';

                                    return (
                                        <tr key={employee.id} className="border-t border-slate-100 transition hover:bg-slate-50">
                                            <td className="px-5 py-5 text-slate-500">{index + 1}</td>
                                            <td className="px-5 py-5 font-medium text-slate-900">{employee.name || '-'}</td>
                                            <td className="px-5 py-5 text-slate-600">{departmentName}</td>
                                            <td className="px-5 py-5 text-slate-600">{employee.role || 'Employee'}</td>
                                            <td className="px-5 py-5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => onStartEvaluation?.(employee)}
                                                    disabled={!hasQuestionnaire}
                                                    className={[
                                                        'inline-flex items-center justify-center rounded-lg text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
                                                        employee.done
                                                            ? 'h-10 w-10 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                            : 'min-h-10 bg-violet-600 px-3 py-2 text-white hover:bg-violet-700',
                                                    ].join(' ')}
                                                    aria-label={employee.done ? 'View submitted employee feedback' : 'Start employee feedback'}
                                                >
                                                    {employee.done ? <AppIcon name="eye" className="h-4 w-4" /> : 'Start'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                            Showing <span className="font-semibold text-slate-700">1</span> to <span className="font-semibold text-slate-700">{visibleEmployees.length}</span> of <span className="font-semibold text-slate-700">{filteredEmployees.length}</span> results
                            <span className="ml-2 text-slate-400">in {branchName || 'current branch'}</span>
                        </div>
                    </div>
                ) : (
                    <EmptyState icon="briefcase" message="No employees match the selected filters." />
                )}
            </div>
        </div>
    );
}

function EvaluationModal({ form, open, onClose, readOnly = false }) {
    const [answers, setAnswers] = useState({});
    const [comment, setComment] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);

    const questions = form?.questions ?? [];
    const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_id]);
    const answeredCount = questions.filter((q) => answers[q.question_id]).length;
    const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };
    const submittedAnswers = (form?.submission?.answers ?? []).reduce((lookup, answer) => ({
        ...lookup,
        [answer.question_id]: answer.rating,
    }), {});
    const submittedComment = form?.submission?.comments ?? '';

    useEffect(() => {
        if (!open) {
            setAnswers({});
            setComment('');
            setErrors({});
            setSubmitting(false);
            setConfirmOpen(false);
            setPendingPayload(null);
        }

        if (open && readOnly) {
            setAnswers(submittedAnswers);
            setComment(submittedComment);
        }
    }, [open, form]);

    function setRating(questionId, rating) {
        setAnswers((prev) => ({ ...prev, [questionId]: rating }));
        if (errors[questionId]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[questionId];
                return next;
            });
        }
    }

    function submit(event) {
        event.preventDefault();
        const missing = questions.filter((q) => !answers[q.question_id]);

        if (missing.length) {
            const nextErrors = {};
            missing.forEach((q) => { nextErrors[q.question_id] = 'Required'; });
            setErrors(nextErrors);
            return;
        }

        if (!form) {
            setErrors({ message: 'Evaluation details are no longer available. Please reopen the form and try again.' });
            return;
        }

        setPendingPayload({
            category: form.category,
            questionnaire_id: form.questionnaireId ?? null,
            evaluatee_id: form.evaluatee?.id ?? null,
            subject_section_id: form.subjectSectionId ?? null,
            subject_id: form.subjectId ?? null,
            academic_year_id: form.cycle.id,
            school_year: form.cycle.school_year,
            term: form.cycle.term ?? form.cycle.semester,
            answers: Object.entries(answers).map(([questionId, rating]) => ({
                question_id: parseInt(questionId, 10),
                rating,
            })),
            comments: comment || null,
        });
        setConfirmOpen(true);
    }

    function doSubmit() {
        if (!pendingPayload) {
            setConfirmOpen(false);
            setSubmitting(false);
            setErrors({ message: 'Evaluation details are no longer available. Please reopen the form and try again.' });
            return;
        }

        setSubmitting(true);
        router.post(route('portal.student.evaluate.submit'), pendingPayload, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (nextErrors) => {
                setErrors(nextErrors);
                setSubmitting(false);
                setConfirmOpen(false);
                setPendingPayload(null);
            },
            onFinish: () => {
                setSubmitting(false);
                setConfirmOpen(false);
                setPendingPayload(null);
            },
        });
    }

    return (
        <>
            <Modal show={open} maxWidth="2xl" closeable={!submitting && !confirmOpen} onClose={onClose}>
                {form && (
                    <div className="portal-modal max-h-[86vh] overflow-hidden bg-blue-50/40">
                        <div className="border-b border-blue-200 bg-gradient-to-br from-blue-100 via-blue-50 to-white px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase text-blue-700">{CATEGORY_LABELS[form.category] ?? 'Evaluation Form'}</p>
                                    <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{form.evaluatee?.name?.trim() || 'Teacher'}</h3>
                                    <p className="mt-1 text-sm text-blue-900/65">
                                        {form.subjectInfo
                                            ? `${form.subjectInfo?.code} · ${form.subjectInfo?.name}`
                                            : [form.evaluatee?.role, form.evaluatee?.scope].filter(Boolean).join(' · ')}
                                    </p>
                                    {form.questionnaireTitle && (
                                            <p className="mt-1 text-xs text-blue-900/60">
                                            Questionnaire: {form.questionnaireTitle}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Close
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-blue-700/60">{form.cycle.school_year} · {form.cycle.semester}</p>
                            {!readOnly && (
                                <EvaluationProgress
                                    answeredCount={answeredCount}
                                    totalCount={questions.length}
                                    color="blue"
                                    bare
                                    className="mt-3"
                                />
                            )}
                        </div>

                        <form onSubmit={submit} className="max-h-[calc(86vh-108px)] overflow-y-auto px-5 py-4">
                            <p className="mb-4 text-xs text-blue-900/65">
                                {readOnly
                                    ? 'This is a read-only view of your submitted evaluation.'
                                    : <>Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>.</>}
                            </p>
                            <div className="space-y-3">
                                {questions.map((q, index) => {
                                    const previousClass = questions[index - 1]?.class_name ?? '';
                                    const currentClass = q.class_name ?? '';
                                    const showDivider = currentClass && currentClass !== previousClass;

                                    return (
                                    <Fragment key={q.question_id}>
                                        {showDivider && (
                                            <div className="flex items-center gap-3 pt-2">
                                                <div className="h-px flex-1 bg-blue-100" />
                                                <div className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-800 ring-1 ring-blue-200">
                                                    {currentClass}
                                                    {q.weight_percentage != null ? ` (${q.weight_percentage}%)` : ''}
                                                </div>
                                                <div className="h-px flex-1 bg-blue-100" />
                                            </div>
                                        )}
                                    <div className="rounded-lg border border-blue-200 bg-white p-4 shadow-sm shadow-blue-100/70">
                                        <p className="mb-3 text-sm text-blue-950">
                                            <span className="mr-1 font-semibold text-blue-500">{index + 1}.</span>{q.question_text}
                                        </p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                readOnly ? (
                                                    <div
                                                        key={value}
                                                        className={[
                                                            'flex min-h-[54px] items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold',
                                                            Number(submittedAnswers[q.question_id]) === value
                                                                ? 'border-blue-600 bg-blue-600 text-white shadow'
                                                                : 'border-slate-200 bg-slate-50 text-slate-500',
                                                        ].join(' ')}
                                                    >
                                                        <div>
                                                            <span className="block text-base font-bold">{value}</span>
                                                            <span className="block text-[10px] leading-tight opacity-80">{ratingLabels[value]}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setRating(q.question_id, value)}
                                                        className={[
                                                            'min-h-[54px] rounded-lg border px-2 py-2 text-xs font-semibold transition',
                                                            answers[q.question_id] === value
                                                                ? 'border-blue-600 bg-blue-600 text-white shadow'
                                                                : 'border-blue-200 bg-blue-50/30 text-blue-900/70 hover:border-blue-400 hover:bg-blue-100',
                                                        ].join(' ')}
                                                    >
                                                        <span className="block text-base font-bold">{value}</span>
                                                        <span className="block text-[10px] leading-tight opacity-80">{ratingLabels[value]}</span>
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                        {!readOnly && errors[q.question_id] && (
                                            <p className="mt-2 text-xs text-red-500">Please select a rating.</p>
                                        )}
                                    </div>
                                    </Fragment>
                                    );
                                })}
                            </div>

                            {readOnly ? (
                                <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4 shadow-sm shadow-blue-100/70">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="block text-sm font-medium text-slate-700">Comments</label>
                                        {form?.submission?.submitted_at && (
                                            <span className="text-xs text-slate-400">
                                                Submitted {new Date(form.submission.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {submittedComment || 'No comment provided.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4 shadow-sm shadow-blue-100/70">
                                    <label className="mb-2 block text-sm font-medium text-blue-950">Comments <span className="font-normal text-blue-400">(optional)</span></label>
                                    <textarea
                                        rows={3}
                                        value={comment}
                                        onChange={(event) => setComment(event.target.value)}
                                        className="w-full rounded-lg border border-blue-200 bg-blue-50/30 p-3 text-sm text-blue-950 placeholder:text-blue-300 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        placeholder="Share any additional feedback or observations..."
                                    />
                                </div>
                            )}

                            {errors.message && (
                                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.message}</p>
                            )}

                            <div className="sticky bottom-0 mt-5 flex gap-3 border-t border-blue-200 bg-blue-50/95 py-4 backdrop-blur">
                                {readOnly ? (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                    >
                                        Close
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={submitting}
                                            className="flex-1 rounded-xl border border-blue-200 bg-white py-3 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting || !allAnswered}
                                            className="flex-1 rounded-xl bg-blue-700 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-800 disabled:opacity-50"
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Evaluation'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                title="Submit this evaluation?"
                message={`Once submitted, your responses for ${form?.evaluatee?.name?.trim() || 'this evaluation'} cannot be edited. Make sure your ratings are final.`}
                confirmLabel="Submit"
                tone="primary"
                loading={submitting}
                onConfirm={doSubmit}
                onCancel={() => setConfirmOpen(false)}
            />
        </>
    );
}

function SubmittedEvaluationModal({ evaluation, open, onClose }) {
    const groupedAnswers = (evaluation?.answers ?? []).reduce((groups, answer) => {
        const key = answer.class_name || 'Evaluation Items';

        if (!groups[key]) {
            groups[key] = {
                className: key,
                weight: answer.weight_percentage,
                answers: [],
            };
        }

        groups[key].answers.push(answer);
        return groups;
    }, {});
    const answerGroups = Object.values(groupedAnswers);
    const formattedRating = (rating) => (
        rating !== null && rating !== undefined && rating !== '' && !Number.isNaN(Number(rating))
            ? Number(rating).toFixed(2)
            : '-'
    );
    const groupAverage = (answers = []) => {
        const ratings = answers
            .map((answer) => Number(answer.rating))
            .filter((rating) => Number.isFinite(rating));

        if (!ratings.length) {
            return null;
        }

        return ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
    };
    const typeId = Number(evaluation?.questionnaire_type_id);
    const typeLabel = typeId === 4
        ? 'Employee Feedback'
        : typeId === 3
            ? 'School Head Evaluation'
            : 'Subject Evaluation';
    const typeColor = 'text-blue-600';
    const headerName = evaluation?.evaluatee_name || evaluation?.course_name || 'Submitted Evaluation';
    const headerInfo = [
        evaluation?.evaluatee_role,
        evaluation?.evaluatee_scope,
    ].filter(Boolean).join(' - ');
    const subjectInfo = typeId === 1
        ? [evaluation?.course_code, evaluation?.course_name].filter(Boolean).join(' - ')
        : '';
    const period = evaluation?.archive_group_label
        || [evaluation?.school_year, evaluation?.semester_label || evaluation?.semester].filter(Boolean).join(' - ');

    return (
        <Modal show={open} maxWidth="5xl" onClose={onClose}>
            {evaluation && (
                <div className="portal-modal flex h-[92vh] max-h-[92vh] flex-col overflow-hidden bg-white">
                    <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className={`text-xs font-bold uppercase tracking-wider ${typeColor}`}>{typeLabel}</p>
                                <h3 className="mt-2 truncate text-xl font-bold text-slate-900">{headerName}</h3>
                                {(headerInfo || subjectInfo) && (
                                    <p className="mt-2 text-sm text-slate-500">{headerInfo || subjectInfo}</p>
                                )}
                                {evaluation.questionnaire_title && (
                                    <p className="mt-1 text-sm text-slate-500">Questionnaire: {evaluation.questionnaire_title}</p>
                                )}
                                {period && (
                                    <p className="mt-3 text-sm font-medium text-slate-400">{period}</p>
                                )}
                                <p className="hidden">
                                    {evaluation.course_code ? `${evaluation.course_code} · ` : ''}{evaluation.teacher_name || evaluation.evaluatee_name || 'Teacher'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                                Close
                            </button>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Submitted</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{formatDate(evaluation.submitted_at)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall Rating</p>
                                <p className="mt-1 text-sm font-bold text-blue-700">{formattedRating(evaluation.overall_average)} / 5</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Category</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{CATEGORY_LABELS[evaluation.category] ?? evaluation.category ?? typeLabel}</p>
                            </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={() => printSubmittedEvaluationReport(evaluation)}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Print / Save PDF
                            </button>
                        </div>
                        <div className="hidden">
                            {evaluation.submitted_at && (
                                <Badge color="blue">{formatDate(evaluation.submitted_at)}</Badge>
                            )}
                            {evaluation.overall_average !== null && evaluation.overall_average !== undefined && (
                                <Badge color="green">Average {evaluation.overall_average}</Badge>
                            )}
                            <Badge color="purple">{CATEGORY_LABELS[evaluation.category] ?? evaluation.category}</Badge>
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-5 py-4">
                        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Full Questionnaire Ratings</p>
                            <p className="mt-1 text-sm text-blue-900">
                                Showing all submitted questionnaire items and their ratings for this evaluation.
                            </p>
                        </div>

                        <div className="space-y-5">
                            {answerGroups.map((group) => (
                                <div key={group.className} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Questionnaire Items</p>
                                            <h4 className="mt-1 text-base font-bold text-slate-900">{group.className}</h4>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {group.weight !== null && group.weight !== undefined && (
                                                <p className="text-sm font-semibold text-slate-500">{group.weight}%</p>
                                            )}
                                            <p className="mt-1 text-sm font-bold text-blue-600">
                                                Value Rating: {formattedRating(groupAverage(group.answers))}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-left text-sm">
                                            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                <tr>
                                                    <th className="w-16 px-4 py-3">#</th>
                                                    <th className="px-4 py-3">Questionnaire Item</th>
                                                    <th className="w-32 px-4 py-3 text-right">Rating</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {group.answers.map((answer, index) => (
                                                    <tr key={`${answer.question_id}-${index}`}>
                                                        <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                                                        <td className="px-4 py-3 text-slate-700">{answer.question_text}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="inline-flex min-w-16 justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
                                                                {formattedRating(answer.rating)}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase text-slate-400">Comments</p>
                            <p className="mt-1 text-sm text-slate-700">{evaluation.comments || 'No comment provided.'}</p>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}

function EvaluationsTab({ evaluations, onView }) {
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
                        <div className="flex shrink-0 items-center gap-2">
                            <Badge color="blue">Submitted</Badge>
                            <button
                                type="button"
                                onClick={() => onView?.(e)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                View
                            </button>
                        </div>
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

function EvaluationSubmissionsTabs({
    subjects = [],
    programChairs = [],
    employees = [],
    evaluations = [],
    evaluationForms = {},
    activeTab,
    onTabChange,
    onView,
}) {
    const QUESTIONNAIRE_TYPES = {
        subject: 1,
        schoolHead: 3,
        employee: 4,
    };
    const formSubmissions = Object.values(evaluationForms)
        .filter((form) => form?.submission)
        .map((form) => {
            const answerLookup = (form.submission.answers ?? []).reduce((lookup, answer) => ({
                ...lookup,
                [answer.question_id]: answer.rating,
            }), {});

            return {
                submission_id: form.submission.id,
                questionnaire_type_id: form.submission.questionnaire_type_id ?? form.questionnaireTypeId ?? null,
                questionnaire_id: form.questionnaireId ?? null,
                questionnaire_title: form.questionnaireTitle ?? null,
                category: form.category,
                course_code: form.subjectInfo?.code ?? null,
                course_name: form.subjectInfo?.name ?? null,
                subject_id: form.subjectId ?? null,
                evaluatee_name: form.evaluatee?.name ?? null,
                evaluatee_role: form.evaluatee?.role ?? null,
                evaluatee_scope: form.evaluatee?.scope ?? null,
                teacher_name: (form.submission.questionnaire_type_id ?? form.questionnaireTypeId) === QUESTIONNAIRE_TYPES.schoolHead ? form.evaluatee?.name : null,
                school_year: form.cycle?.school_year ?? null,
                semester_label: form.cycle?.semester ?? null,
                submitted_at: form.submission.submitted_at,
                comments: form.submission.comments,
                overall_average: Object.values(answerLookup).length
                    ? (Object.values(answerLookup).reduce((sum, rating) => sum + Number(rating || 0), 0) / Object.values(answerLookup).length).toFixed(2)
                    : null,
                answers: (form.questions ?? []).map((question) => ({
                    question_id: question.question_id,
                    question_text: question.question_text,
                    rating: answerLookup[question.question_id] ?? null,
                    class_name: question.class_name ?? '',
                    weight_percentage: question.weight_percentage ?? null,
                })).filter((answer) => answer.rating !== null),
            };
        });
    const formSubmissionIds = new Set(formSubmissions.map((item) => Number(item.submission_id)));
    const allSubmissions = [
        ...evaluations.filter((item) => !formSubmissionIds.has(Number(item.submission_id))),
        ...formSubmissions,
    ];
    const subjectSubmissions = allSubmissions.filter((item) => Number(item.questionnaire_type_id) === QUESTIONNAIRE_TYPES.subject && item.subject_id);
    const schoolHeadSubmissions = allSubmissions.filter((item) => Number(item.questionnaire_type_id) === QUESTIONNAIRE_TYPES.schoolHead);
    const employeeFeedbackSubmissions = allSubmissions.filter((item) => Number(item.questionnaire_type_id) === QUESTIONNAIRE_TYPES.employee);
    const tabs = [
        { key: 'subject', label: 'Subject Evaluation', count: subjectSubmissions.length },
        { key: 'school_head', label: 'School Head', count: schoolHeadSubmissions.length },
        { key: 'employee_feedback', label: 'Employee Feedback', count: employeeFeedbackSubmissions.length },
    ];

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                {tabs.map((tab) => {
                    const selected = activeTab === tab.key;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onTabChange(tab.key)}
                            className={[
                                'flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none',
                                selected
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                            ].join(' ')}
                        >
                            <span className="truncate">{tab.label}</span>
                            <span className={[
                                'rounded-full px-2 py-0.5 text-[10px]',
                                selected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                            ].join(' ')}>
                                {tab.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {activeTab === 'subject' && (
                <EvaluationsTab evaluations={subjectSubmissions} onView={onView} />
            )}

            {activeTab === 'school_head' && (
                schoolHeadSubmissions.length > 0
                    ? <EvaluationsTab evaluations={schoolHeadSubmissions} onView={onView} />
                    : <EmptyState icon="school" message="No submitted school head evaluation records found for the current cycle." />
            )}

            {activeTab === 'employee_feedback' && (
                employeeFeedbackSubmissions.length > 0
                    ? <EvaluationsTab evaluations={employeeFeedbackSubmissions} onView={onView} />
                    : <EmptyState icon="briefcase" message="No submitted employee feedback records found for the current cycle." />
            )}
        </div>
    );
}

function ArchiveTabInline({ archive, onView }) {
    if (!archive.length) {
        return <EmptyState icon="archive" message="No archived evaluation records yet." />;
    }

    const grouped = archive.reduce((acc, item) => {
        const key = item.archive_group_label || `${item.school_year ?? 'Unknown Academic Year'} · ${item.semester_label ?? 'Unknown Term'}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {Object.entries(grouped).map(([label, items]) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                            <AppIcon name="folder" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-700">{label}</p>
                            <p className="text-xs text-slate-400">{items.length} submitted evaluation{items.length !== 1 ? 's' : ''}</p>
                        </div>
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
                                    <button
                                        type="button"
                                        onClick={() => onView?.(e)}
                                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ArchiveTab({ archive, onView }) {
    const [openFolder, setOpenFolder] = useState(null);
    const [archiveSearch, setArchiveSearch] = useState('');
    const [selectedEvaluationType, setSelectedEvaluationType] = useState('all');
    const [archivePageSize, setArchivePageSize] = useState(15);

    if (!archive.length) {
        return <EmptyState icon="archive" message="No archived evaluation records yet." />;
    }

    const typeLabel = (typeId) => {
        const labels = {
            1: 'Subject Evaluation',
            3: 'School Head',
            4: 'Employee Feedback',
        };

        return labels[Number(typeId)] ?? 'Evaluation';
    };
    const typeBadgeColor = (typeId) => {
        const colors = {
            1: 'purple',
            3: 'amber',
            4: 'blue',
        };

        return colors[Number(typeId)] ?? 'slate';
    };
    const evaluationTypeOptions = [
        { key: 'subject', label: 'Subject Evaluation', typeId: 1, emptyIcon: 'subjects' },
        { key: 'school_head', label: 'School Head', typeId: 3, emptyIcon: 'school' },
        { key: 'employee_feedback', label: 'Employee Feedback', typeId: 4, emptyIcon: 'briefcase' },
    ];
    const grouped = archive.reduce((acc, item) => {
        const key = item.archive_group_label || `${item.school_year ?? 'Unknown Academic Year'} - ${item.semester_label ?? 'Unknown Term'}`;

        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
    const selectedItems = openFolder ? grouped[openFolder] ?? [] : [];
    const selectedTypeOption = evaluationTypeOptions.find((option) => option.key === selectedEvaluationType) ?? null;
    const normalizedArchiveSearch = archiveSearch.trim().toLowerCase();
    const filteredItems = selectedItems.filter((item) => {
        const matchesType = !selectedTypeOption || Number(item.questionnaire_type_id) === selectedTypeOption.typeId;
        const searchableText = [
            item.course_name,
            item.evaluatee_name,
            item.course_code,
            typeLabel(item.questionnaire_type_id),
        ].filter(Boolean).join(' ').toLowerCase();

        return matchesType && (!normalizedArchiveSearch || searchableText.includes(normalizedArchiveSearch));
    });
    const visibleItems = filteredItems.slice(0, archivePageSize);

    if (openFolder) {
        return (
            <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => setOpenFolder(null)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                    <AppIcon name="chevron-left" className="h-3.5 w-3.5 text-orange-600" />
                    Back to folders
                </button>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                            <AppIcon name="folder" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-700">{openFolder}</p>
                            <p className="text-xs text-slate-400">{selectedItems.length} submitted evaluation{selectedItems.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center md:justify-between">
                                <label className="relative block min-w-0 md:w-[400px]">
                                    <AppIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={archiveSearch}
                                        onChange={(event) => setArchiveSearch(event.target.value)}
                                        placeholder="Search submitted evaluations..."
                                        className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-12 pr-3 text-[13px] text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                    />
                                </label>
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        Show
                                        <select
                                            value={archivePageSize}
                                            onChange={(event) => setArchivePageSize(Number(event.target.value))}
                                            className="h-12 w-20 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium normal-case tracking-normal text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                                        >
                                            {[5, 10, 15, 25, 50].map((size) => (
                                                <option key={size} value={size}>{size}</option>
                                            ))}
                                        </select>
                                    </label>
                                    <select
                                        value={selectedEvaluationType}
                                        onChange={(event) => setSelectedEvaluationType(event.target.value)}
                                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 sm:w-[280px]"
                                    >
                                        <option value="all">All evaluation types</option>
                                        {evaluationTypeOptions.map((option) => (
                                            <option key={option.key} value={option.key}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {visibleItems.length ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-[13px]">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="w-16 px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">#</th>
                                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Name</th>
                                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Evaluation Type</th>
                                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Details</th>
                                                <th className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Date Submitted</th>
                                                <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {visibleItems.map((e, index) => (
                                                <tr key={e.submission_id} className="border-t border-slate-100 transition hover:bg-slate-50">
                                                    <td className="px-5 py-5 text-slate-500">{index + 1}</td>
                                                    <td className="px-5 py-5 font-medium text-slate-900">
                                                        {e.course_name || e.evaluatee_name || 'Submitted Evaluation'}
                                                    </td>
                                                    <td className="px-5 py-5">
                                                        <Badge color={typeBadgeColor(e.questionnaire_type_id)}>{typeLabel(e.questionnaire_type_id)}</Badge>
                                                    </td>
                                                    <td className="px-5 py-5 text-slate-500">
                                                        {[e.course_code, e.evaluatee_name].filter(Boolean).join(' - ') || typeLabel(e.questionnaire_type_id)}
                                                    </td>
                                                    <td className="px-5 py-5">
                                                        {formatDate(e.submitted_at)}
                                                    </td>
                                                    <td className="px-5 py-5 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => onView?.(e)}
                                                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                                            aria-label="View submitted evaluation"
                                                        >
                                                            <AppIcon name="eye" className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                                        Showing <span className="font-semibold text-slate-700">1</span> to <span className="font-semibold text-slate-700">{visibleItems.length}</span> of <span className="font-semibold text-slate-700">{filteredItems.length}</span> results
                                    </div>
                                </div>
                            ) : (
                                <EmptyState icon={selectedTypeOption?.emptyIcon ?? 'archive'} message="No archived submissions match the selected filters." />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <h3 className="text-lg font-bold text-slate-900">Evaluation Archive</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Open a past academic year and term folder to view your archived evaluation submissions.
                </p>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Past Academic Year and Term</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(grouped).map(([label, items]) => (
                    <button
                        key={label}
                        type="button"
                        onClick={() => {
                            setOpenFolder(label);
                            setArchiveSearch('');
                            setSelectedEvaluationType('all');
                        }}
                        className="flex min-h-[96px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50/40"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                            <AppIcon name="folder" className="h-6 w-6" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">{label}</p>
                            <p className="mt-1 text-xs text-slate-500">
                                {items.length} submission{items.length === 1 ? '' : 's'} - {items.length} response{items.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function StudentDashboard({ student, cycle, subjects = [], programChairs = [], employees = [], evaluations = [], archive = [], evaluationForms = {} }) {
    const [activeNav, setActiveNav] = useState('subjects');
    const [activeSubmissionTab, setActiveSubmissionTab] = useState('subject');
    const [selectedEvaluationKey, setSelectedEvaluationKey] = useState(null);
    const [selectedSubmittedEvaluation, setSelectedSubmittedEvaluation] = useState(null);
    const [unavailableEvaluation, setUnavailableEvaluation] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);

    const submittedEvaluationLookup = [...evaluations, ...archive].reduce((lookup, evaluation) => {
        const subjectId = evaluation?.subject_id ?? null;
        const questionnaireId = evaluation?.questionnaire_id ?? null;

        if (subjectId != null) {
            lookup[`subject:${subjectId}`] = evaluation;
        }

        if (questionnaireId != null && subjectId != null) {
            lookup[`questionnaire:${questionnaireId}:subject:${subjectId}`] = evaluation;
        }

        return lookup;
    }, {});

    const counts = {
        subjects:    subjects.length,
        program_chairs: programChairs.length,
        employees: employees.length,
        evaluations: evaluations.length,
        archive:     archive.length,
    };

    const title = SECTION_TITLES[activeNav] ?? 'Student Portal';
    const selectedEvaluationForm = selectedEvaluationKey ? evaluationForms[selectedEvaluationKey] : null;

    function startEvaluation(subject) {
        const key = subject.section_id
            ? `subject_section:${subject.section_id}`
            : `subject:${subject.course_id}`;
        const form = evaluationForms[key];

        if (form) {
            setSelectedEvaluationKey(key);
            setViewOnly(false);
            return;
        }

        setUnavailableEvaluation({
            title: subject.course_name || 'Subject Evaluation',
            message: 'The evaluation form for this subject is not available yet. Please check that a questionnaire with questions is assigned to this subject.',
        });
    }

    function startProgramChairEvaluation(target) {
        const key = String(target.form_key ?? target.id);
        const form = evaluationForms[key];

        if (form) {
            setSelectedEvaluationKey(key);
            setViewOnly(Boolean(target.done));
            return;
        }

        setUnavailableEvaluation({
            title: target.name || 'Program Chair Evaluation',
            message: 'The evaluation form for this program chair is not available yet. Please check that a questionnaire with questions is assigned.',
        });
    }

    function startEmployeeEvaluation(employee) {
        const key = String(employee.form_key ?? employee.id);
        const form = evaluationForms[key];

        if (form) {
            setSelectedEvaluationKey(key);
            setViewOnly(Boolean(employee.done));
            return;
        }

        setUnavailableEvaluation({
            title: employee.name || 'Employee Feedback',
            message: 'The employee feedback form is not available yet. Please check that a questionnaire with questions is assigned to this employee.',
        });
    }

    function viewCompletedEvaluation(subject) {
        const evaluation = submittedEvaluationLookup[`questionnaire:${subject.questionnaire_id}:subject:${subject.course_id}`]
            ?? submittedEvaluationLookup[`subject:${subject.course_id}`];

        if (evaluation) {
            setSelectedSubmittedEvaluation(evaluation);
        }
    }

    return (
        <PortalLayout
            title={title}
            user={student}
            userType="student"
            activeNav={activeNav}
            onNavChange={setActiveNav}
            sidebarDetails={[
                { label: 'Department', value: student.department },
                {
                    label: student.program ? 'Program' : 'Strand',
                    value: student.program ?? student.strand,
                },
                { label: 'Campus', value: student.branch },
            ].filter((detail) => detail.value)}
            sidebarBadge={cycle ? `${cycle.school_year} · ${cycle.semester}` : null}
        >
            {/* Section header */}
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-800">{title}</h2>
                    {counts[activeNav] > 0 && (
                        <p className="text-xs text-slate-400">{counts[activeNav]} record{counts[activeNav] !== 1 ? 's' : ''}</p>
                    )}
                </div>
                {!cycle?.is_open && ['subjects', 'program_chairs', 'employees'].includes(activeNav) && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                        Evaluation Closed
                    </span>
                )}
                {cycle?.is_open && ['subjects', 'program_chairs', 'employees'].includes(activeNav) && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-200">
                        Evaluation Open
                    </span>
                )}
            </div>

            {!cycle?.is_open && ['subjects', 'program_chairs', 'employees'].includes(activeNav) && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700 ring-1 ring-amber-200">
                        <AppIcon name="calendar" className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-sm font-bold">Evaluation is now closed</p>
                        <p className="mt-1 text-sm text-amber-800">
                            You can still view your submitted evaluations and ratings, but new submissions are no longer available for this evaluation period.
                        </p>
                    </div>
                </div>
            )}

            {activeNav === 'subjects'    && <SubjectsTab    subjects={subjects} cycle={cycle} onStartEvaluation={startEvaluation} onViewEvaluation={viewCompletedEvaluation} />}
            {activeNav === 'program_chairs' && (
                <ProgramChairEvaluationTab targets={programChairs} onStartEvaluation={startProgramChairEvaluation} />
            )}
            {activeNav === 'employees' && (
                <EmployeeFeedbackTab employees={employees} branchName={student.branch} onStartEvaluation={startEmployeeEvaluation} />
            )}
            {activeNav === 'evaluations' && (
                <EvaluationSubmissionsTabs
                    subjects={subjects}
                    programChairs={programChairs}
                    employees={employees}
                    evaluations={evaluations}
                    evaluationForms={evaluationForms}
                    activeTab={activeSubmissionTab}
                    onTabChange={setActiveSubmissionTab}
                    onView={setSelectedSubmittedEvaluation}
                />
            )}
            {activeNav === 'archive'     && <ArchiveTab     archive={archive} onView={setSelectedSubmittedEvaluation} />}

            <EvaluationModal
                open={Boolean(selectedEvaluationForm)}
                form={selectedEvaluationForm}
                onClose={() => {
                    setSelectedEvaluationKey(null);
                    setViewOnly(false);
                }}
                readOnly={viewOnly}
            />
            <SubmittedEvaluationModal
                open={Boolean(selectedSubmittedEvaluation)}
                evaluation={selectedSubmittedEvaluation}
                onClose={() => setSelectedSubmittedEvaluation(null)}
            />
            <Modal show={Boolean(unavailableEvaluation)} maxWidth="md" onClose={() => setUnavailableEvaluation(null)}>
                <div className="p-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                            <AppIcon name="questions" className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Evaluation Form</p>
                            <h3 className="mt-1 text-lg font-bold text-slate-900">{unavailableEvaluation?.title}</h3>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{unavailableEvaluation?.message}</p>
                        </div>
                    </div>
                    <div className="mt-5 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setUnavailableEvaluation(null)}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </PortalLayout>
    );
}
