import { useEffect } from 'react';

const CATEGORY_LABELS = {
    teacher_subject: 'Subject Evaluation',
    teacher_outside: 'Peer Evaluation',
    program_chair:   'Program Chair Evaluation',
    employee:        'Employee Evaluation',
};

export default function TeacherReport({ teacher, ratings, questions, filters }) {
    useEffect(() => { window.print(); }, []);

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
            question_id:   parseInt(qid),
            question_text: qMap[qid] ?? `Question ${qid}`,
            avg:           (total / counts[qid]).toFixed(2),
        }));
    }

    const today = new Date().toLocaleDateString('en-PH', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    return (
        <div style={{ minHeight: '100vh', background: '#f0ebe0', padding: '2rem', fontFamily: '"Georgia", serif' }}>
            <style>{`
                @media print {
                    @page { margin: 1.5cm; }
                    button { display: none !important; }
                    body { background: #fff !important; }
                    .page-frame { box-shadow: none !important; }
                }
                body { background: #f0ebe0; }
            `}</style>

            {/* Close button */}
            <button
                type="button"
                onClick={() => window.close()}
                className="mb-6 print:hidden"
                style={{
                    background: 'linear-gradient(180deg, #e8ddc8, #d4c9b0)',
                    border: '1px solid #c9a96e',
                    color: '#7a5c30',
                    borderRadius: '10px',
                    padding: '6px 16px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                    fontFamily: '"Georgia", serif',
                }}
            >
                ← Close
            </button>

            {/* Document frame */}
            <div className="page-frame mx-auto max-w-3xl"
                 style={{
                     background: '#fdf8f0',
                     border: '3px solid #8b6914',
                     borderRadius: '12px',
                     boxShadow: '0 6px 30px rgba(0,0,0,0.2), inset 0 0 0 5px #f5ecd4',
                     padding: '2.5rem',
                     position: 'relative',
                 }}>

                {/* Corner ornaments */}
                {[
                    { top: '10px', left: '10px',  borderTop: '2px solid #8b6914', borderLeft: '2px solid #8b6914' },
                    { top: '10px', right: '10px', borderTop: '2px solid #8b6914', borderRight: '2px solid #8b6914' },
                    { bottom: '10px', left: '10px',  borderBottom: '2px solid #8b6914', borderLeft: '2px solid #8b6914' },
                    { bottom: '10px', right: '10px', borderBottom: '2px solid #8b6914', borderRight: '2px solid #8b6914' },
                ].map((style, i) => (
                    <div key={i} style={{ position: 'absolute', width: '18px', height: '18px', ...style }} />
                ))}

                {/* Letterhead */}
                <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid #8b6914' }}>
                    <p style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#8b6914', marginBottom: '6px' }}>
                        Holy Cross College
                    </p>
                    <h1 style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#3a2a1a', margin: '0 0 6px' }}>
                        Faculty Evaluation Report
                    </h1>
                    {/* Decorative rule */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '10px 0' }}>
                        <div style={{ flex: 1, height: '1px', background: '#c9a96e' }} />
                        <div style={{ width: '6px', height: '6px', background: '#8b6914', transform: 'rotate(45deg)' }} />
                        <div style={{ flex: 1, height: '1px', background: '#c9a96e' }} />
                    </div>

                    {/* Employee details */}
                    <div style={{ marginTop: '12px', display: 'inline-block', textAlign: 'left', fontSize: '13px', color: '#5a3e28', lineHeight: '1.8' }}>
                        <div><strong>Name:</strong> {teacher.name}</div>
                        <div><strong>Employee No.:</strong> {teacher.employee_no}</div>
                        <div><strong>Department:</strong> {teacher.department}</div>
                        <div><strong>Role:</strong> {teacher.role}</div>
                        {filters.school_year && (
                            <div><strong>Period:</strong> {filters.school_year}{filters.term ? ` — ${filters.term}` : ''}</div>
                        )}
                    </div>
                </div>

                {/* No data */}
                {Object.values(grouped).length === 0 ? (
                    <p style={{ color: '#a08060', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                        No evaluation data found for the selected period.
                    </p>
                ) : (
                    Object.values(grouped).map((group, gi) => {
                        const perQ    = avgPerQuestion(group.rows);
                        const overall = perQ.length
                            ? (perQ.reduce((s, q) => s + parseFloat(q.avg), 0) / perQ.length).toFixed(2)
                            : '—';

                        return (
                            <div key={gi} style={{ marginBottom: '2.5rem', pageBreakInside: 'avoid' }}>
                                {/* Section heading */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'space-between',
                                    paddingBottom: '6px',
                                    marginBottom: '10px',
                                    borderBottom: '2px solid #c9a96e',
                                }}>
                                    <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#3a2a1a' }}>
                                        {CATEGORY_LABELS[group.category] ?? group.category}
                                        {group.course_name ? ` — ${group.course_name} (${group.course_code})` : ''}
                                    </h2>
                                    <span style={{ fontSize: '11px', color: '#a08060' }}>
                                        {group.school_year} · {group.semester_label}
                                    </span>
                                </div>

                                {/* Ledger table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{
                                            background: 'linear-gradient(180deg, #4a3820, #3a2810)',
                                            color: '#f0d898',
                                        }}>
                                            <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 'bold', letterSpacing: '0.04em' }}>
                                                Evaluation Criteria
                                            </th>
                                            <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 'bold', width: '110px', letterSpacing: '0.04em' }}>
                                                Avg Rating
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {perQ.map((q, qi) => (
                                            <tr key={qi} style={{
                                                background: qi % 2 === 0 ? '#fdf8f0' : '#f5edd8',
                                            }}>
                                                <td style={{ padding: '7px 12px', color: '#4a3820', borderBottom: '1px solid #e0d4b8' }}>
                                                    {q.question_text}
                                                </td>
                                                <td style={{ padding: '7px 12px', textAlign: 'center', fontWeight: 'bold', color: '#3a2a1a', borderBottom: '1px solid #e0d4b8' }}>
                                                    {q.avg}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Overall row */}
                                        <tr style={{ background: 'linear-gradient(180deg, #4a3820, #3a2810)' }}>
                                            <td style={{ padding: '9px 12px', fontWeight: 'bold', color: '#f0d898', fontStyle: 'italic', letterSpacing: '0.03em' }}>
                                                Overall Average
                                            </td>
                                            <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#f0d898' }}>
                                                {overall}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <p style={{ marginTop: '5px', fontSize: '11px', color: '#a08060', fontStyle: 'italic' }}>
                                    Based on {group.rows.length} submission{group.rows.length !== 1 ? 's' : ''}.
                                </p>
                            </div>
                        );
                    })
                )}

                {/* Official seal / signature area */}
                <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #c9a96e', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '11px', color: '#a08060' }}>
                    <div style={{ fontStyle: 'italic' }}>
                        Generated on {today}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '160px', height: '1px', background: '#8b6914', marginBottom: '4px' }} />
                        <p style={{ fontWeight: 'bold', color: '#5a3e28', fontSize: '11px' }}>Authorized Signature</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
