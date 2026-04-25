import AppIcon from '@/Components/AppIcon';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import PortalLayout from '@/Layouts/PortalLayout';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const SECTION_TITLES = {
    subjects:    'My Subjects',
    program_chairs: 'Program Chairs',
    employees: 'Employees',
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

function SubjectStatusCard({ subjects }) {
    const total = subjects.length;
    const evaluated = subjects.filter((subject) => subject.already_evaluated).length;
    const irregular = subjects.filter((subject) => subject.is_irregular).length;
    const progress = total > 0 ? Math.round((evaluated / total) * 100) : 0;
    const cards = [
        { label: 'Progress', value: `${progress}%`, detail: `${evaluated} of ${total} evaluated`, icon: 'check-circle', color: 'blue' },
        { label: 'Registered Subjects', value: total, detail: 'Current cycle', icon: 'subjects', color: 'emerald' },
        { label: 'Irregular Subjects', value: irregular, detail: irregular === 1 ? 'Irregular load' : 'Irregular loads', icon: 'layers', color: 'amber' },
    ];
    const colors = {
        blue: 'bg-blue-50 text-blue-700 ring-blue-100',
        emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    };

    return (
        <div className="mb-5 grid gap-3 md:grid-cols-3">
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
                </div>
            ))}
        </div>
    );
}

function SubjectsTab({ subjects, cycle, onStartEvaluation }) {
    if (!subjects.length) {
        return <EmptyState icon="subjects" message="No enrolled subjects for the current evaluation cycle." />;
    }

    return (
        <>
        <SubjectStatusCard subjects={subjects} />
        <div className="space-y-3">
            {subjects.map((s) => (
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
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge color="blue">{s.semester_label}</Badge>
                            {cycle?.is_open && !s.already_evaluated && s.can_evaluate !== false && (s.section_id || s.course_id) && (
                                <button
                                    type="button"
                                    onClick={() => onStartEvaluation?.(s)}
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
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

function EvaluationPlaceholderTab({ icon, message }) {
    return <EmptyState icon={icon} message={message} />;
}

function EvaluationModal({ form, open, onClose }) {
    const [answers, setAnswers] = useState({});
    const [comment, setComment] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);

    const questions = form?.questions ?? [];
    const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_id]);
    const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

    useEffect(() => {
        if (!open) {
            setAnswers({});
            setComment('');
            setErrors({});
            setSubmitting(false);
            setConfirmOpen(false);
            setPendingPayload(null);
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
                    <div className="max-h-[86vh] overflow-hidden bg-white">
                        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase text-emerald-600">Subject Teacher Evaluation</p>
                                    <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{form.evaluatee?.name?.trim() || 'Teacher'}</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {form.subjectInfo?.code} · {form.subjectInfo?.name}
                                    </p>
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
                            <p className="mt-2 text-xs text-slate-400">{form.cycle.school_year} · {form.cycle.semester}</p>
                        </div>

                        <form onSubmit={submit} className="max-h-[calc(86vh-108px)] overflow-y-auto px-5 py-4">
                            <p className="mb-4 text-xs text-slate-500">Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>.</p>

                            <div className="space-y-3">
                                {questions.map((q, index) => (
                                    <div key={q.question_id} className="rounded-lg border border-slate-200 bg-white p-4">
                                        <p className="mb-3 text-sm text-slate-700">
                                            <span className="mr-1 font-semibold text-slate-500">{index + 1}.</span>{q.question_text}
                                        </p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {[1, 2, 3, 4, 5].map((value) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    onClick={() => setRating(q.question_id, value)}
                                                    className={[
                                                        'min-h-[54px] rounded-lg border px-2 py-2 text-xs font-semibold transition',
                                                        answers[q.question_id] === value
                                                            ? 'border-emerald-500 bg-emerald-500 text-white shadow'
                                                            : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50',
                                                    ].join(' ')}
                                                >
                                                    <span className="block text-base font-bold">{value}</span>
                                                    <span className="block text-[10px] leading-tight opacity-80">{ratingLabels[value]}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {errors[q.question_id] && (
                                            <p className="mt-2 text-xs text-red-500">Please select a rating.</p>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                                <label className="mb-2 block text-sm font-medium text-slate-700">Comments <span className="font-normal text-slate-400">(optional)</span></label>
                                <textarea
                                    rows={3}
                                    value={comment}
                                    onChange={(event) => setComment(event.target.value)}
                                    className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                    placeholder="Share any additional feedback or observations..."
                                />
                            </div>

                            {errors.message && (
                                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.message}</p>
                            )}

                            <div className="sticky bottom-0 mt-5 flex gap-3 border-t border-slate-100 bg-white py-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !allAnswered}
                                    className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Evaluation'}
                                </button>
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
    const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

    return (
        <Modal show={open} maxWidth="2xl" onClose={onClose}>
            {evaluation && (
                <div className="max-h-[86vh] overflow-hidden bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase text-blue-600">Submitted Evaluation</p>
                                <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{evaluation.course_name || 'Subject Teacher Evaluation'}</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {evaluation.course_code ? `${evaluation.course_code} · ` : ''}{evaluation.teacher_name || evaluation.evaluatee_name || 'Teacher'}
                                </p>
                            </div>
                            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                                Close
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            {evaluation.submitted_at && (
                                <Badge color="blue">{new Date(evaluation.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</Badge>
                            )}
                            {evaluation.overall_average !== null && evaluation.overall_average !== undefined && (
                                <Badge color="green">Average {evaluation.overall_average}</Badge>
                            )}
                            <Badge color="purple">{CATEGORY_LABELS[evaluation.category] ?? evaluation.category}</Badge>
                        </div>
                    </div>

                    <div className="max-h-[calc(86vh-116px)] overflow-y-auto px-5 py-4">
                        <div className="space-y-3">
                            {(evaluation.answers ?? []).map((answer, index) => (
                                <div key={`${answer.question_id}-${index}`} className="rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-slate-700">
                                            <span className="mr-1 font-semibold text-slate-500">{index + 1}.</span>{answer.question_text}
                                        </p>
                                        <div className="shrink-0 rounded-lg bg-emerald-50 px-3 py-1 text-center text-emerald-700 ring-1 ring-emerald-200">
                                            <span className="block text-sm font-bold">{answer.rating}</span>
                                            <span className="block text-[10px] leading-tight">{ratingLabels[answer.rating] ?? 'Rating'}</span>
                                        </div>
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

function ArchiveTab({ archive, onView }) {
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

export default function StudentDashboard({ student, cycle, subjects = [], programChairs = [], employees = [], evaluations = [], archive = [], evaluationForms = {} }) {
    const [activeNav, setActiveNav] = useState('subjects');
    const [selectedEvaluationKey, setSelectedEvaluationKey] = useState(null);
    const [selectedSubmittedEvaluation, setSelectedSubmittedEvaluation] = useState(null);

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
        const key = String(subject.section_id ?? subject.course_id);
        const form = evaluationForms[key];

        if (form) {
            setSelectedEvaluationKey(key);
            return;
        }

        router.visit(route('portal.student.evaluate', {
            subject_section_id: subject.section_id,
            subject_id: subject.course_id,
            questionnaire_id: subject.questionnaire_id,
            category: 'teacher_subject',
        }));
    }

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

            {activeNav === 'subjects'    && <SubjectsTab    subjects={subjects} cycle={cycle} onStartEvaluation={startEvaluation} />}
            {activeNav === 'program_chairs' && (
                <EvaluationPlaceholderTab
                    icon="shield"
                    message="Program chair evaluations will appear here once they are connected."
                />
            )}
            {activeNav === 'employees' && (
                <EvaluationPlaceholderTab
                    icon="briefcase"
                    message="Employee evaluations will appear here once they are connected."
                />
            )}
            {activeNav === 'evaluations' && <EvaluationsTab evaluations={evaluations} onView={setSelectedSubmittedEvaluation} />}
            {activeNav === 'archive'     && <ArchiveTab     archive={archive} onView={setSelectedSubmittedEvaluation} />}

            <EvaluationModal
                open={Boolean(selectedEvaluationForm)}
                form={selectedEvaluationForm}
                onClose={() => setSelectedEvaluationKey(null)}
            />
            <SubmittedEvaluationModal
                open={Boolean(selectedSubmittedEvaluation)}
                evaluation={selectedSubmittedEvaluation}
                onClose={() => setSelectedSubmittedEvaluation(null)}
            />
        </PortalLayout>
    );
}
