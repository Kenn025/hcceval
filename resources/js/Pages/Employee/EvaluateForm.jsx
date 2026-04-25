import ConfirmDialog from '@/Components/ConfirmDialog';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

const CATEGORY_LABELS = {
    peer_employee: 'Employee Peer Evaluation',
    head:          'Department Head Evaluation',
};

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

function StampButton({ value, selected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 transition"
            style={{
                background: selected
                    ? 'linear-gradient(145deg, #1d4ed8, #1e40af)'
                    : 'linear-gradient(145deg, #f1f5f9, #e2e8f0)',
                color: selected ? '#fff' : '#475569',
                borderColor: selected ? '#1e3a8a' : '#cbd5e1',
                boxShadow: selected
                    ? 'inset 0 3px 6px rgba(0,0,0,0.3)'
                    : '0 2px 6px rgba(0,0,0,0.12)',
                transform: selected ? 'translateY(2px)' : 'none',
                cursor: 'pointer',
            }}
        >
            <span className="text-base font-bold leading-none">{value}</span>
            <span className="mt-0.5 text-[8px] leading-none opacity-80">{RATING_LABELS[value]}</span>
        </button>
    );
}

export default function EmployeeEvaluateForm({ category, evaluatee, questions, cycle }) {
    const [answers, setAnswers] = useState({});
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [confirmOpen, setConfirmOpen] = useState(false);

    const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_id]);

    const setRating = (qid, rating) => {
        setAnswers((prev) => ({ ...prev, [qid]: rating }));
        if (errors[qid]) {
            setErrors((prev) => {
                const e = { ...prev };
                delete e[qid];
                return e;
            });
        }
    };

    const submit = (e) => {
        e.preventDefault();
        const missing = questions.filter((q) => !answers[q.question_id]);
        if (missing.length) {
            const errs = {};
            missing.forEach((q) => { errs[q.question_id] = true; });
            setErrors(errs);
            return;
        }
        setConfirmOpen(true);
    };

    const doSubmit = () => {
        setSubmitting(true);
        router.post(route('portal.employee.evaluate.submit'), {
            category,
            evaluatee_id:     evaluatee.id,
            academic_year_id: cycle.id,
            school_year:      cycle.school_year,
            term:             cycle.term ?? cycle.semester,
            answers: Object.entries(answers).map(([qid, rating]) => ({
                question_id: parseInt(qid, 10),
                rating,
            })),
            comments: comment || null,
        }, {
            onSuccess: () => router.visit(route('portal.employee.dashboard')),
            onError:   (errs) => { setErrors(errs); setSubmitting(false); setConfirmOpen(false); },
            onFinish:  () => { setSubmitting(false); setConfirmOpen(false); },
        });
    };

    return (
        <>
            <Head title="Evaluate" />
            <div className="min-h-screen bg-slate-100 px-4 py-8">
                <div className="mx-auto max-w-2xl">
                    <button
                        type="button"
                        onClick={() => router.visit(route('portal.employee.dashboard'))}
                        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back to Dashboard
                    </button>

                    <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-blue-900 p-5 text-white shadow-lg">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                            {CATEGORY_LABELS[category] ?? 'Evaluation Form'}
                        </p>
                        <h2 className="mt-1 text-xl font-bold">{evaluatee?.name?.trim() || '—'}</h2>
                        <p className="mt-1 text-xs text-white/60">{evaluatee?.role} · {cycle.school_year} · {cycle.semester}</p>
                    </div>

                    <p className="mb-5 text-xs italic text-slate-500">
                        Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>. Your responses are anonymous.
                    </p>

                    {questions.length === 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                            No questions are configured for this evaluation category yet. Please contact your administrator.
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-4">
                            {questions.map((q, idx) => (
                                <div key={q.question_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="mb-4 text-sm leading-relaxed text-slate-700">
                                        <span className="mr-2 font-bold text-slate-400">{idx + 1}.</span>
                                        {q.question_text}
                                    </p>
                                    <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3">
                                        {[1, 2, 3, 4, 5].map((v) => (
                                            <StampButton
                                                key={v}
                                                value={v}
                                                selected={answers[q.question_id] === v}
                                                onClick={() => setRating(q.question_id, v)}
                                            />
                                        ))}
                                    </div>
                                    {errors[q.question_id] && (
                                        <p className="mt-2 text-xs italic text-rose-600">Please select a rating before submitting.</p>
                                    )}
                                </div>
                            ))}

                            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Comments <span className="font-normal text-slate-400">(optional)</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Share any additional feedback…"
                                    className="w-full resize-none rounded-md border border-slate-200 p-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            </div>

                            {errors.message && (
                                <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm italic text-rose-700">{errors.message}</p>
                            )}

                            <div className="flex gap-3 pb-8">
                                <button
                                    type="button"
                                    onClick={() => router.visit(route('portal.employee.dashboard'))}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !allAnswered}
                                    className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting…' : 'Submit Evaluation'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={confirmOpen}
                title="Submit this evaluation?"
                message={`Once submitted, your responses for ${evaluatee?.name?.trim() || 'this person'} cannot be edited. Make sure your ratings are final.`}
                confirmLabel="Submit"
                tone="primary"
                loading={submitting}
                onConfirm={doSubmit}
                onCancel={() => setConfirmOpen(false)}
            />
        </>
    );
}
