import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const CATEGORY_LABELS = {
    teacher_outside: 'Faculty Peer Evaluation',
    program_chair:   'Program Chair Evaluation',
    employee:        'Employee Evaluation',
};

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

/* ── Rubber stamp button ─────────────────────────────────────── */

function StampButton({ value, selected, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.1s ease',
                background: selected
                    ? 'linear-gradient(145deg, #8b2500, #b83200)'
                    : 'linear-gradient(145deg, #e8ddc8, #d4c9b0)',
                color: selected ? '#fff' : '#7a5c30',
                border: selected ? '2px solid #7a1a00' : '2px solid #c9a96e',
                boxShadow: selected
                    ? 'inset 0 3px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(0,0,0,0.3)'
                    : '0 4px 8px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.45)',
                transform: selected ? 'translateY(2px)' : 'none',
                cursor: 'pointer',
            }}
        >
            <span style={{ fontSize: '15px', fontWeight: 'bold', lineHeight: 1 }}>{value}</span>
            <span style={{ fontSize: '8px', marginTop: '2px', opacity: 0.85, textAlign: 'center', lineHeight: 1.1, letterSpacing: '0.02em' }}>
                {RATING_LABELS[value]}
            </span>
        </button>
    );
}

/* ── Page ────────────────────────────────────────────────────── */

export default function TeacherEvaluateForm({ category, evaluatee, questions, cycle }) {
    const [answers,    setAnswers]    = useState({});
    const [comment,    setComment]    = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errors,     setErrors]     = useState({});

    const allAnswered = questions.every(q => answers[q.question_id]);

    function setRating(qid, rating) {
        setAnswers(prev => ({ ...prev, [qid]: rating }));
        if (errors[qid]) setErrors(prev => { const e = { ...prev }; delete e[qid]; return e; });
    }

    function submit(e) {
        e.preventDefault();
        const missing = questions.filter(q => !answers[q.question_id]);
        if (missing.length) {
            const errs = {};
            missing.forEach(q => { errs[q.question_id] = true; });
            setErrors(errs);
            return;
        }
        setSubmitting(true);
        router.post(route('portal.teacher.evaluate.submit'), {
            category,
            evaluatee_id:     evaluatee.id,
            academic_year_id: cycle.id,
            school_year:      cycle.school_year,
            term:             cycle.semester,
            answers: Object.entries(answers).map(([qid, rating]) => ({
                question_id: parseInt(qid),
                rating,
            })),
            comments: comment || null,
        }, {
            onSuccess: () => router.visit(route('portal.teacher.dashboard')),
            onError:   (errs) => { setErrors(errs); setSubmitting(false); },
            onFinish:  () => setSubmitting(false),
        });
    }

    return (
        <>
            <Head title="Evaluate" />
            <div className="min-h-screen py-8 px-4" style={{ background: '#f0ebe0' }}>
                <div className="mx-auto max-w-2xl">

                    {/* Back button */}
                    <button
                        type="button"
                        onClick={() => router.visit(route('portal.teacher.dashboard'))}
                        className="mb-5 flex items-center gap-1.5 text-sm font-medium text-stone-500 transition hover:text-stone-700"
                        style={{ fontFamily: '"Georgia", serif' }}
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back to Dashboard
                    </button>

                    {/* Chalkboard evaluatee header */}
                    <div className="mb-6 overflow-hidden rounded-2xl"
                         style={{
                             background: 'linear-gradient(170deg, #182a18 0%, #1e3320 60%, #243d28 100%)',
                             boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                         }}>
                        <div className="p-5">
                            {/* Chalk dash line */}
                            <div className="mb-4 h-px"
                                 style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 7px, transparent 7px, transparent 11px)' }} />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">
                                {CATEGORY_LABELS[category] ?? 'Evaluation Form'}
                            </p>
                            <h2 className="text-xl font-bold text-amber-100"
                                style={{ fontFamily: '"Georgia", serif', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                                {evaluatee?.name?.trim() || '—'}
                            </h2>
                            <p className="mt-1.5 text-xs text-white/40">{cycle.school_year} · {cycle.semester}</p>
                            <div className="mt-4 h-px"
                                 style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 7px, transparent 7px, transparent 11px)' }} />
                        </div>
                    </div>

                    {/* Disclaimer */}
                    <p className="mb-5 text-xs italic text-stone-400"
                       style={{ fontFamily: '"Georgia", serif' }}>
                        Rate each item from <strong className="text-stone-500">1 (Poor)</strong> to <strong className="text-stone-500">5 (Excellent)</strong>. This evaluation is anonymous and confidential.
                    </p>

                    <form onSubmit={submit} className="space-y-4">

                        {/* Question cards — lined paper style */}
                        {questions.map((q, idx) => (
                            <div key={q.question_id} className="overflow-hidden rounded-xl"
                                 style={{
                                     background: 'linear-gradient(180deg, #fdf7e4 0%, #faf0d0 100%)',
                                     boxShadow: '0 3px 10px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
                                 }}>
                                <div className="flex">
                                    {/* Red margin line */}
                                    <div className="w-1 shrink-0" style={{ background: '#c8380a', opacity: 0.65 }} />
                                    <div className="flex-1 p-4">
                                        <p className="mb-4 text-sm text-stone-700 leading-relaxed"
                                           style={{ fontFamily: '"Georgia", serif' }}>
                                            <span className="mr-2 font-bold text-stone-400">{idx + 1}.</span>
                                            {q.question_text}
                                        </p>

                                        {/* Stamp rating row */}
                                        <div className="flex flex-wrap gap-3 pt-2"
                                             style={{ borderTop: '1px solid rgba(139,105,20,0.12)' }}>
                                            {[1, 2, 3, 4, 5].map(v => (
                                                <StampButton
                                                    key={v}
                                                    value={v}
                                                    selected={answers[q.question_id] === v}
                                                    onClick={() => setRating(q.question_id, v)}
                                                />
                                            ))}
                                        </div>

                                        {errors[q.question_id] && (
                                            <p className="mt-2 text-xs text-red-600 italic"
                                               style={{ fontFamily: '"Georgia", serif' }}>
                                                Please select a rating before submitting.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Comments — lined notepad */}
                        <div className="overflow-hidden rounded-xl"
                             style={{
                                 background: 'linear-gradient(180deg, #fdf7e4 0%, #faf0d0 100%)',
                                 boxShadow: '0 3px 10px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)',
                             }}>
                            <div className="flex">
                                <div className="w-1 shrink-0" style={{ background: '#c8380a', opacity: 0.65 }} />
                                <div className="flex-1 p-4">
                                    <label className="mb-2 block text-sm font-bold text-stone-600"
                                           style={{ fontFamily: '"Georgia", serif' }}>
                                        Comments{' '}
                                        <span className="font-normal text-stone-400">(optional)</span>
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={comment}
                                        onChange={e => setComment(e.target.value)}
                                        placeholder="Share any additional feedback…"
                                        className="w-full resize-none bg-transparent text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none"
                                        style={{
                                            backgroundImage: 'repeating-linear-gradient(transparent, transparent 23px, rgba(100,80,40,0.13) 23px, rgba(100,80,40,0.13) 24px)',
                                            lineHeight: '24px',
                                            paddingTop: '2px',
                                            fontFamily: '"Georgia", serif',
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Global error */}
                        {errors.message && (
                            <p className="rounded-lg px-3 py-2 text-sm text-red-700 italic"
                               style={{ background: '#fdf0ed', border: '1px solid #f5c6bc', fontFamily: '"Georgia", serif' }}>
                                {errors.message}
                            </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3 pb-8">
                            <button
                                type="button"
                                onClick={() => router.visit(route('portal.teacher.dashboard'))}
                                className="flex-1 rounded-xl py-3 text-sm font-semibold transition"
                                style={{
                                    background: 'linear-gradient(180deg, #e8ddc8, #d4c9b0)',
                                    color: '#7a5c30',
                                    border: '1px solid #c9a96e',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)',
                                    fontFamily: '"Georgia", serif',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting || !allAnswered}
                                className="flex-1 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-50"
                                style={{
                                    background: allAnswered && !submitting
                                        ? 'linear-gradient(180deg, #2e5a24, #1e3d18)'
                                        : 'linear-gradient(180deg, #9caca0, #7a8c80)',
                                    border: '1px solid rgba(0,0,0,0.2)',
                                    boxShadow: '0 3px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                                    fontFamily: '"Georgia", serif',
                                    letterSpacing: '0.02em',
                                }}
                            >
                                {submitting ? 'Submitting…' : 'Submit Evaluation'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
