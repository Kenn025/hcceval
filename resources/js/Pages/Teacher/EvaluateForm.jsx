import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import ClientLayout from '@/Layouts/ClientLayout';

const CATEGORY_LABELS = {
  teacher_outside: 'Faculty Peer Evaluation',
  program_chair:   'Program Chair Evaluation',
  employee:        'Employee Evaluation',
};

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
      missing.forEach(q => { errs[q.question_id] = 'Required'; });
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    router.post(route('portal.teacher.evaluate.submit'), {
      category,
      evaluatee_id:    evaluatee.id,
      academic_year_id: cycle.id,
      school_year:     cycle.school_year,
      term:            cycle.semester,
      answers:         Object.entries(answers).map(([qid, rating]) => ({ question_id: parseInt(qid), rating })),
      comments:        comment || null,
    }, {
      onSuccess: () => router.visit(route('portal.teacher.dashboard')),
      onError:   (errs) => { setErrors(errs); setSubmitting(false); },
      onFinish:  () => setSubmitting(false),
    });
  }

  const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

  return (
    <ClientLayout title="Evaluate" userType="faculty">
      <div className="mb-5">
        <button type="button" onClick={() => router.visit(route('portal.teacher.dashboard'))}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0d2454] to-[#1a4a8a] p-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-wider text-blue-200 mb-1">{CATEGORY_LABELS[category] ?? 'Evaluation'}</p>
        <h2 className="text-xl font-bold">{evaluatee?.name?.trim() || '—'}</h2>
        <p className="mt-2 text-xs text-blue-200">{cycle.school_year} · {cycle.semester}</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <p className="text-xs text-slate-500">Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>. This evaluation is anonymous.</p>

        {questions.map((q, idx) => (
          <div key={q.question_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-500 mr-1">{idx + 1}.</span>{q.question_text}
            </p>
            <div className="flex flex-wrap gap-2">
              {[1,2,3,4,5].map(v => (
                <button key={v} type="button" onClick={() => setRating(q.question_id, v)}
                  className={['flex flex-col items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                    answers[q.question_id] === v
                      ? 'border-blue-500 bg-blue-500 text-white shadow'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'].join(' ')}>
                  <span className="text-base font-bold">{v}</span>
                  <span className="text-[10px] mt-0.5 opacity-80">{ratingLabels[v]}</span>
                </button>
              ))}
            </div>
            {errors[q.question_id] && <p className="mt-1.5 text-xs text-red-500">Please select a rating.</p>}
          </div>
        ))}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-2 block text-sm font-medium text-slate-700">Comments <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea rows={4} value={comment} onChange={e => setComment(e.target.value)}
            className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            placeholder="Share any feedback…" />
        </div>

        {errors.message && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.message}</p>}

        <div className="flex gap-3 pb-6">
          <button type="button" onClick={() => router.visit(route('portal.teacher.dashboard'))}
            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={submitting || !allAnswered}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {submitting ? 'Submitting…' : 'Submit Evaluation'}
          </button>
        </div>
      </form>
    </ClientLayout>
  );
}
