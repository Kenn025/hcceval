import AppIcon from '@/Components/AppIcon';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import PortalLayout from '@/Layouts/PortalLayout';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const SECTION_TITLES = {
    faculty_peer_evaluation: 'Faculty Peer Evaluation',
    school_heads_evaluation: 'School Heads Evaluation',
    employee_evaluation: 'Employee Evaluation',
    my_subject_ratings: 'My Subject Ratings',
    peer_ratings: 'Peer Ratings',
    submissions: 'Submissions',
    archives: 'Archives',
};

const CATEGORY_LABELS = {
    peer_teacher: 'Faculty Peer Evaluation',
    head_teacher: 'School Heads Evaluation',
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

function FacultyPeerEvaluationTab({ targets = [], onStartEvaluation }) {
    const orderedTargets = [...targets].sort((a, b) => {
        if (a.done !== b.done) {
            return Number(a.done) - Number(b.done);
        }

        return (a.name ?? '').localeCompare(b.name ?? '');
    });

    if (!orderedTargets.length) {
        return <EmptyState icon="peer" message="No co-teacher evaluations are available in your assigned scope right now." />;
    }

    return (
        <div className="space-y-4">
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Faculty List ({orderedTargets.length})</p>
                <div className="space-y-2">
                    {orderedTargets.map((target) => (
                        <div
                            key={target.id}
                            className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                                target.done ? 'border-slate-100' : 'border-slate-200'
                            }`}
                        >
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                <AppIcon name={target.done ? 'check-circle' : 'teachers'} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-slate-800">{target.name}</p>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                                            target.done
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                : 'bg-slate-100 text-slate-700 ring-slate-200'
                                        }`}
                                    >
                                        {target.done ? 'Submitted' : 'Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    {target.role}
                                    {target.scope ? ` · ${target.scope}` : ''}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {target.questionnaire_id && (
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                            Questionnaire ID: {target.questionnaire_code || target.questionnaire_id}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
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
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    Start Evaluation
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SchoolHeadsEvaluationTab({ targets = [], onStartEvaluation }) {
    const orderedTargets = [...targets].sort((a, b) => {
        if (a.done !== b.done) {
            return Number(a.done) - Number(b.done);
        }

        return (a.name ?? '').localeCompare(b.name ?? '');
    });
    const scopedTargets = orderedTargets.filter((target) => target.scoped);
    const otherTargets = orderedTargets.filter((target) => !target.scoped);

    if (!orderedTargets.length) {
        return <EmptyState icon="school" message="No school head evaluations are assigned to your account right now." />;
    }

    function renderTarget(target) {
        return (
            <div
                key={target.id}
                className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                    target.done ? 'border-slate-100' : 'border-slate-200'
                }`}
            >
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <AppIcon name={target.done ? 'check-circle' : 'school'} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{target.name}</p>
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                                target.done
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    : 'bg-slate-100 text-slate-700 ring-slate-200'
                            }`}
                        >
                            {target.done ? 'Submitted' : 'Pending'}
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                                target.scoped
                                    ? 'bg-blue-50 text-blue-700 ring-blue-200'
                                    : 'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}
                        >
                            {target.scoped ? 'Scoped' : 'Other'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400">
                        {target.role}
                        {target.scope ? ` · ${target.scope}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        {target.questionnaire_id && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                Questionnaire ID: {target.questionnaire_code || target.questionnaire_id}
                            </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
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
        <div className="space-y-4">
            {scopedTargets.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Scoped Program Chairs ({scopedTargets.length})</p>
                    <div className="space-y-2">
                        {scopedTargets.map(renderTarget)}
                    </div>
                </div>
            )}
            {otherTargets.length > 0 && (
                <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Other Program Chairs ({otherTargets.length})</p>
                    <div className="space-y-2">
                        {otherTargets.map(renderTarget)}
                    </div>
                </div>
            )}
        </div>
    );
}

function SubmissionsTab({ targets = [], onViewEvaluation }) {
    const done = targets.filter((target) => target.done);

    if (!done.length) {
        return <EmptyState icon="check-circle" message="No submitted evaluation records yet." />;
    }

    return (
        <div className="space-y-4">
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted ({done.length})</p>
                <div className="space-y-2">
                    {done.map((target) => (
                        <div key={target.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                <AppIcon name="check-circle" className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-700">{target.name}</p>
                                <p className="text-xs text-slate-400">
                                    Submitted
                                    {target.scope ? ` · ${target.scope}` : ''}
                                </p>
                                {target.questionnaire_title && (
                                    <div className="mt-2">
                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                            {target.questionnaire_title}
                                        </span>
                                    </div>
                                )}
                                <div className="mt-2">
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                        {CATEGORY_LABELS[target.category] ?? 'Evaluation'}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onViewEvaluation?.(target)}
                                disabled={!target.questionnaire_id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                View
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function TeacherEvaluationModal({ form, open, onClose, readOnly = false }) {
    const [answers, setAnswers] = useState({});
    const [comment, setComment] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);

    const questions = form?.questions ?? [];
    const submittedAnswers = form?.submission?.submitted_answers ?? {};
    const submittedComment = form?.submission?.submitted_comment ?? '';
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
        router.post(route('portal.teacher.evaluate.submit'), pendingPayload, {
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
                                    <p className="text-xs font-semibold uppercase text-blue-600">Faculty Evaluation</p>
                                    <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{form.evaluatee?.name?.trim() || 'Faculty'}</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {form.evaluatee?.role ?? 'Teacher'}
                                        {form.evaluatee?.scope ? ` · ${form.evaluatee.scope}` : ''}
                                    </p>
                                    {form.questionnaireTitle && (
                                        <p className="mt-1 text-xs text-slate-500">
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
                            <p className="mt-2 text-xs text-slate-400">{form.cycle.school_year} · {form.cycle.semester}</p>
                        </div>

                        <form onSubmit={submit} className="max-h-[calc(86vh-108px)] overflow-y-auto px-5 py-4">
                            <p className="mb-4 text-xs text-slate-500">
                                {readOnly
                                    ? 'This is a read-only view of the assigned questionnaire for this submitted evaluation.'
                                    : <>Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>.</>}
                            </p>

                            <div className="space-y-3">
                                {questions.map((q, index) => (
                                    <div key={q.question_id} className="rounded-lg border border-slate-200 bg-white p-4">
                                        <p className="mb-3 text-sm text-slate-700">
                                            <span className="mr-1 font-semibold text-slate-500">{index + 1}.</span>{q.question_text}
                                        </p>
                                        {readOnly ? (
                                            <div className="grid grid-cols-5 gap-2">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <div
                                                        key={value}
                                                        className={[
                                                            'flex min-h-[54px] items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold',
                                                            Number(submittedAnswers[q.question_id]) === value
                                                                ? 'border-blue-500 bg-blue-500 text-white shadow'
                                                                : 'border-slate-200 bg-slate-50 text-slate-500',
                                                        ].join(' ')}
                                                    >
                                                        <div>
                                                            <span className="block text-base font-bold">{value}</span>
                                                            <span className="block text-[10px] leading-tight opacity-80">{ratingLabels[value]}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {[1, 2, 3, 4, 5].map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => setRating(q.question_id, value)}
                                                            className={[
                                                                'min-h-[54px] rounded-lg border px-2 py-2 text-xs font-semibold transition',
                                                                answers[q.question_id] === value
                                                                    ? 'border-blue-500 bg-blue-500 text-white shadow'
                                                                    : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50',
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
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {readOnly && (
                                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
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
                            )}

                            {!readOnly && (
                                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Comments <span className="font-normal text-slate-400">(optional)</span></label>
                                    <textarea
                                        rows={3}
                                        value={comment}
                                        onChange={(event) => setComment(event.target.value)}
                                        className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="Share any additional feedback or observations..."
                                    />
                                </div>
                            )}

                            {errors.message && (
                                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.message}</p>
                            )}

                            <div className="sticky bottom-0 mt-5 flex gap-3 border-t border-slate-100 bg-white py-4">
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
                                            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting || !allAnswered}
                                            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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

            {!readOnly && (
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
            )}
        </>
    );
}

export default function TeacherDashboard({ teacher, cycle, pendingTargets = [], headTargets = [], evaluationForms = {} }) {
    const [activeNav, setActiveNav] = useState('faculty_peer_evaluation');
    const [selectedEvaluationKey, setSelectedEvaluationKey] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);
    const title = SECTION_TITLES[activeNav] ?? 'Faculty Portal';
    const selectedEvaluationForm = selectedEvaluationKey ? evaluationForms[selectedEvaluationKey] : null;
    const scopeType = teacher.program ? 'program' : teacher.strand ? 'strand' : 'department';
    const scopeLabel = teacher.program || teacher.strand || teacher.department || 'assigned scope';
    const submissionTargets = [...pendingTargets, ...headTargets]
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    function startEvaluation(target) {
        const key = String(target.id);
        const form = evaluationForms[key];

        if (form) {
            setSelectedEvaluationKey(key);
            setViewOnly(Boolean(target.done));
            return;
        }

        router.visit(route('portal.teacher.evaluate', {
            evaluatee_id: target.id,
            category: target.category,
        }));
    }

    return (
        <PortalLayout
            title={title}
            user={teacher}
            userType="teacher"
            activeNav={activeNav}
            onNavChange={setActiveNav}
            sidebarDetails={[
                teacher.employee_no,
                teacher.department,
                teacher.role,
                teacher.branch,
            ].filter(Boolean)}
            sidebarBadge={cycle ? `${cycle.school_year} · ${cycle.semester}` : null}
        >
            {activeNav === 'faculty_peer_evaluation' && (
                <>
                    <div className="mb-5">
                        <p className="text-xs text-slate-400">
                            Co-teachers in your assigned {scopeType} scope
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            Scope: {scopeLabel}
                        </p>
                    </div>
                    <FacultyPeerEvaluationTab targets={pendingTargets} onStartEvaluation={startEvaluation} />
                </>
            )}

            {activeNav === 'school_heads_evaluation' && (
                <>
                    <div className="mb-5">
                        <p className="text-xs text-slate-400">
                            Program chairs assigned to your department
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            Scope: {teacher.department || 'assigned department'}
                        </p>
                    </div>
                    <SchoolHeadsEvaluationTab targets={headTargets} onStartEvaluation={startEvaluation} />
                </>
            )}

            {activeNav === 'employee_evaluation' && (
                <EmptyState icon="briefcase" message="Employee evaluation will appear here once assigned to your account." />
            )}

            {activeNav === 'my_subject_ratings' && (
                <EmptyState icon="ratings" message="Your subject ratings will appear here once student evaluations are aggregated." />
            )}

            {activeNav === 'peer_ratings' && (
                <EmptyState icon="group" message="Your peer ratings will appear here once faculty evaluations are aggregated." />
            )}

            {activeNav === 'submissions' && (
                <SubmissionsTab targets={submissionTargets} onViewEvaluation={startEvaluation} />
            )}

            {activeNav === 'archives' && (
                <EmptyState icon="archive" message="Archived evaluation records will appear here." />
            )}

            <TeacherEvaluationModal
                open={Boolean(selectedEvaluationForm)}
                form={selectedEvaluationForm}
                readOnly={viewOnly}
                onClose={() => {
                    setSelectedEvaluationKey(null);
                    setViewOnly(false);
                }}
            />
        </PortalLayout>
    );
}
