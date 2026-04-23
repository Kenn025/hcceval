import React, { useState } from 'react';
import ClientLayout from '@/Layouts/ClientLayout';

const TABS = [
  { key: 'subjects',    label: 'My Subjects' },
  { key: 'evaluations', label: 'My Evaluations' },
  { key: 'archive',     label: 'Archive' },
];

function Badge({ children, color = 'blue' }) {
  const map = {
    green:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    blue:   'bg-blue-50 text-blue-700 ring-blue-200',
    slate:  'bg-slate-100 text-slate-600 ring-slate-200',
    amber:  'bg-amber-50 text-amber-700 ring-amber-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${map[color] ?? map.blue}`}>
      {children}
    </span>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-16 text-center text-slate-400">
      <svg viewBox="0 0 24 24" className="mx-auto mb-3 h-10 w-10 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 8l9-4 9 4-9 4-9-4Z" />
        <path d="M7 10.5v4.5c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function SubjectsTab({ subjects }) {
  if (!subjects.length) return <EmptyState message="No enrolled subjects for the current evaluation cycle." />;

  return (
    <div className="space-y-3">
      {subjects.map((s) => (
        <div key={s.section_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{s.course_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.course_code} &nbsp;·&nbsp; {s.section_name}</p>
            </div>
            {s.already_evaluated ? (
              <Badge color="green">Evaluated</Badge>
            ) : (
              <Badge color="slate">Pending</Badge>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              {s.teacher_name || 'No teacher assigned'}
            </span>
            {s.schedule && (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {s.schedule}
              </span>
            )}
            {s.room && (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                {s.room}
              </span>
            )}
            <span className="ml-auto">
              <Badge color="blue">{s.semester_label}</Badge>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EvaluationsTab({ evaluations, label }) {
  if (!evaluations.length) return <EmptyState message={`No ${label.toLowerCase()} evaluation records found.`} />;

  return (
    <div className="space-y-3">
      {evaluations.map((e) => (
        <div key={e.submission_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-slate-800 truncate">{e.course_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{e.course_code}</p>
            </div>
            <Badge color="green">Submitted</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              {e.teacher_name || '—'}
            </span>
            {e.submitted_at && (
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                {new Date(e.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="ml-auto">
              <Badge color="blue">{e.semester_label} · {e.school_year}</Badge>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentDashboard({ student, cycle, subjects, evaluations, archive }) {
  const [activeTab, setActiveTab] = useState('subjects');

  return (
    <ClientLayout title="Student Dashboard" user={student} userType="student">
      {/* Welcome banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0f3d24] to-[#1e6e40] p-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-wider text-emerald-200 mb-1">Welcome back</p>
        <h2 className="text-xl font-bold">{student.name}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-emerald-100">
          <span>{student.student_no}</span>
          {student.department && <span>· {student.department}</span>}
          {student.program && <span>· {student.program}</span>}
          {student.branch && <span>· {student.branch}</span>}
        </div>
        {cycle && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${cycle.is_open ? 'bg-emerald-300' : 'bg-slate-300'}`} />
            {cycle.school_year} &nbsp;·&nbsp; {cycle.semester}
            {cycle.is_open ? ' — Open' : ' — Closed'}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={[
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              activeTab === t.key
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            ].join(' ')}
          >
            {t.label}
            {t.key === 'subjects' && subjects.length > 0 && (
              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                {subjects.length}
              </span>
            )}
            {t.key === 'evaluations' && evaluations.length > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                {evaluations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'subjects'    && <SubjectsTab subjects={subjects} />}
      {activeTab === 'evaluations' && <EvaluationsTab evaluations={evaluations} label="Current" />}
      {activeTab === 'archive'     && <EvaluationsTab evaluations={archive} label="Archive" />}
    </ClientLayout>
  );
}
