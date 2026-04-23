import React, { useEffect } from 'react';

const CATEGORY_LABELS = {
  teacher_subject: 'Subject Evaluation',
  teacher_outside: 'Peer Evaluation',
  program_chair:   'Program Chair Evaluation',
  employee:        'Employee Evaluation',
};

export default function TeacherReport({ teacher, ratings, questions, filters }) {
  useEffect(() => {
    window.print();
  }, []);

  const grouped = ratings.reduce((acc, r) => {
    const key = `${r.school_year}|${r.term}|${r.category}`;
    if (!acc[key]) acc[key] = { ...r, rows: [] };
    acc[key].rows.push(r);
    return acc;
  }, {});

  const qMap = Object.fromEntries(questions.map(q => [q.question_id, q.question_text]));

  function avgPerQuestion(rows) {
    const totals = {};
    const counts = {};
    rows.forEach(row => {
      const answers = JSON.parse(row.answers ?? '[]');
      answers.forEach(a => {
        totals[a.question_id] = (totals[a.question_id] ?? 0) + a.rating;
        counts[a.question_id] = (counts[a.question_id] ?? 0) + 1;
      });
    });
    return Object.entries(totals).map(([qid, total]) => ({
      question_id:  parseInt(qid),
      question_text: qMap[qid] ?? `Question ${qid}`,
      avg:          (total / counts[qid]).toFixed(2),
    }));
  }

  return (
    <div className="min-h-screen bg-white p-8 font-sans text-sm text-slate-800 print:p-4">
      <style>{`@media print { @page { margin: 1cm; } button { display: none !important; } }`}</style>

      <button type="button" onClick={() => window.close()} className="mb-6 rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 print:hidden">
        ← Close
      </button>

      {/* Header */}
      <div className="mb-8 border-b-2 border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Faculty Evaluation Report</h1>
        <div className="mt-2 text-sm text-slate-500 space-y-0.5">
          <p><strong>Name:</strong> {teacher.name}</p>
          <p><strong>Employee No.:</strong> {teacher.employee_no}</p>
          <p><strong>Department:</strong> {teacher.department}</p>
          <p><strong>Role:</strong> {teacher.role}</p>
          {filters.school_year && <p><strong>Period:</strong> {filters.school_year} {filters.term ? `— ${filters.term}` : ''}</p>}
        </div>
      </div>

      {Object.values(grouped).length === 0 ? (
        <p className="text-slate-400">No evaluation data found for the selected period.</p>
      ) : (
        Object.values(grouped).map((group, gi) => {
          const perQ = avgPerQuestion(group.rows);
          const overall = perQ.length ? (perQ.reduce((s, q) => s + parseFloat(q.avg), 0) / perQ.length).toFixed(2) : '—';
          return (
            <div key={gi} className="mb-8 break-inside-avoid">
              <div className="mb-3 flex items-baseline justify-between border-b border-slate-200 pb-2">
                <h2 className="font-semibold text-slate-800">
                  {CATEGORY_LABELS[group.category] ?? group.category}
                  {group.course_name ? ` — ${group.course_name} (${group.course_code})` : ''}
                </h2>
                <span className="text-xs text-slate-400">{group.school_year} · {group.semester_label}</span>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-600">Question</th>
                    <th className="border border-slate-200 px-3 py-2 text-center font-medium text-slate-600 w-24">Avg Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {perQ.map((q, qi) => (
                    <tr key={qi} className={qi % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="border border-slate-200 px-3 py-2 text-slate-700">{q.question_text}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center font-semibold text-slate-800">{q.avg}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-semibold">
                    <td className="border border-slate-200 px-3 py-2 text-blue-800">Overall Average</td>
                    <td className="border border-slate-200 px-3 py-2 text-center text-blue-800">{overall}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-1 text-xs text-slate-400">Based on {group.rows.length} submission{group.rows.length !== 1 ? 's' : ''}.</p>
            </div>
          );
        })
      )}

      <div className="mt-12 border-t border-slate-200 pt-4 text-xs text-slate-400 text-center">
        Generated on {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
}
