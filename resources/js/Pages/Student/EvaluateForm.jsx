import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import ClientLayout from '@/Layouts/ClientLayout';
import ConfirmDialog from '@/Components/ConfirmDialog';

const CATEGORY_LABELS = {
  teacher_subject: 'Subject Teacher Evaluation',
  teacher_outside: 'Outside Teacher Evaluation',
  program_chair: 'Program Chair Evaluation',
  employee_evaluation: 'Employee Feedback',
  employee: 'Employee Feedback',
};

export default function EvaluateForm({
  category,
  questionnaireId,
  evaluatee,
  subjectSectionId,
  subjectId,
  subjectInfo,
  questions,
  cycle,
  submissions = [],
}) {
  const formTab = category === 'teacher_subject' ? 'subject' : 'feedback';
  const [activeTab, setActiveTab] = useState(formTab);
  const [answers, setAnswers] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [confirmOpen, setConfirmOpen] = useState(false);

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_id]);
  const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };
  const tabs = [
    { key: 'subject', label: 'Subject Evaluation' },
    { key: 'feedback', label: 'School Head / Employee Feedback' },
    { key: 'submissions', label: 'List of Submissions' },
  ];
  const showCurrentForm = activeTab === formTab;

  function setRating(qid, rating) {
    setAnswers((prev) => ({ ...prev, [qid]: rating }));
    if (errors[qid]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[qid];
        return next;
      });
    }
  }

  function submit(e) {
    e.preventDefault();
    const missing = questions.filter((q) => !answers[q.question_id]);

    if (missing.length) {
      const nextErrors = {};
      missing.forEach((q) => {
        nextErrors[q.question_id] = 'Required';
      });
      setErrors(nextErrors);
      return;
    }

    setConfirmOpen(true);
  }

  function doSubmit() {
    setSubmitting(true);
    router.post(route('portal.student.evaluate.submit'), {
      category,
      questionnaire_id: questionnaireId ?? null,
      evaluatee_id: evaluatee.id,
      subject_section_id: subjectSectionId ?? null,
      subject_id: subjectId ?? null,
      academic_year_id: cycle.id,
      school_year: cycle.school_year,
      term: cycle.term ?? cycle.semester,
      answers: Object.entries(answers).map(([qid, rating]) => ({ question_id: parseInt(qid, 10), rating })),
      comments: comment || null,
    }, {
      onSuccess: () => router.visit(route('portal.student.dashboard')),
      onError: (errs) => {
        setErrors(errs);
        setSubmitting(false);
        setConfirmOpen(false);
      },
      onFinish: () => {
        setSubmitting(false);
        setConfirmOpen(false);
      },
    });
  }

  return (
    <ClientLayout title="Evaluate" userType="student">
      <div className="mb-5">
        <button
          type="button"
          onClick={() => router.visit(route('portal.student.dashboard'))}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0f3d24] to-[#1e6e40] p-5 text-white shadow-md">
        <p className="mb-1 text-xs uppercase tracking-wider text-emerald-200">Evaluation Submissions</p>
        <h2 className="text-xl font-bold">My Evaluation</h2>
        <p className="mt-2 text-xs text-emerald-200">{cycle.school_year} - {cycle.semester}</p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
        {tabs.map((tab) => {
          const selected = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition sm:flex-none',
                selected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              ].join(' ')}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {showCurrentForm && (
        <>
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">{CATEGORY_LABELS[category]}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{evaluatee?.name?.trim() || '-'}</h3>
            {subjectInfo && (
              <p className="mt-1 text-sm text-slate-500">{subjectInfo.code} - {subjectInfo.name}</p>
            )}
          </div>

          <form onSubmit={submit} className="space-y-5">
            <p className="text-xs text-slate-500">Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>.</p>

            {questions.map((q, idx) => (
              <div key={q.question_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm text-slate-700">
                  <span className="mr-1 font-semibold text-slate-500">{idx + 1}.</span>{q.question_text}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(q.question_id, value)}
                      className={[
                        'flex flex-col items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                        answers[q.question_id] === value
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow'
                          : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50',
                      ].join(' ')}
                    >
                      <span className="text-base font-bold">{value}</span>
                      <span className="mt-0.5 text-[10px] opacity-80">{ratingLabels[value]}</span>
                    </button>
                  ))}
                </div>
                {errors[q.question_id] && (
                  <p className="mt-1.5 text-xs text-red-500">Please select a rating.</p>
                )}
              </div>
            ))}

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-slate-700">Comments <span className="font-normal text-slate-400">(optional)</span></label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                placeholder="Share any additional feedback or observations..."
              />
            </div>

            {errors.message && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.message}</p>
            )}

            <div className="flex gap-3 pb-6">
              <button
                type="button"
                onClick={() => router.visit(route('portal.student.dashboard'))}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !allAnswered}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Evaluation'}
              </button>
            </div>
          </form>
        </>
      )}

      {!showCurrentForm && activeTab !== 'submissions' && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Open this evaluation type from your dashboard.</p>
          <button
            type="button"
            onClick={() => router.visit(route('portal.student.dashboard'))}
            className="mt-4 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Go to Dashboard
          </button>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-3 pb-6">
          {submissions.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
              No submitted evaluations yet.
            </div>
          )}
          {submissions.map((item) => (
            <div key={item.submission_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800">{item.course_name || item.evaluatee_name || 'Submitted Evaluation'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{[item.course_code, item.teacher_name].filter(Boolean).join(' - ')}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                  Submitted
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                {item.submitted_at && (
                  <span>{new Date(item.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                )}
                {item.overall_average !== null && item.overall_average !== undefined && (
                  <span>Average {item.overall_average}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Submit this evaluation?"
        message={`Once submitted, your responses for ${evaluatee?.name?.trim() || 'this evaluation'} cannot be edited. Make sure your ratings are final.`}
        confirmLabel="Submit"
        tone="primary"
        loading={submitting}
        onConfirm={doSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </ClientLayout>
  );
}
