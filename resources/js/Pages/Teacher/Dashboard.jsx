import React from 'react';
import ClientLayout from '@/Layouts/ClientLayout';

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

export default function TeacherDashboard({ teacher, cycle, classes }) {
  return (
    <ClientLayout title="Faculty Dashboard" user={teacher} userType="faculty">
      {/* Welcome banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#0d2454] to-[#1a4a8a] p-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-wider text-blue-200 mb-1">Welcome back</p>
        <h2 className="text-xl font-bold">{teacher.name}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-blue-100">
          <span>{teacher.employee_no}</span>
          {teacher.department && <span>· {teacher.department}</span>}
          {teacher.role && <span className="capitalize">· {teacher.role}</span>}
          {teacher.branch && <span>· {teacher.branch}</span>}
        </div>
        {cycle && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${cycle.is_open ? 'bg-blue-300' : 'bg-slate-300'}`} />
            {cycle.school_year} &nbsp;·&nbsp; {cycle.semester}
            {cycle.is_open ? ' — Open' : ' — Closed'}
          </div>
        )}
      </div>

      {/* Classes heading */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-800">My Classes</h3>
        <span className="text-xs text-slate-400">{classes.length} class{classes.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Classes list */}
      {classes.length === 0 ? (
        <EmptyState message="No classes assigned for the current evaluation cycle." />
      ) : (
        <div className="space-y-3">
          {classes.map((c) => (
            <div key={c.section_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{c.course_name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.course_code} &nbsp;·&nbsp; {c.section_name}</p>
                </div>
                <Badge color="blue">{c.semester_label}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                {c.department_name && (
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    </svg>
                    {c.department_name}
                  </span>
                )}
                {c.schedule && (
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {c.schedule}
                  </span>
                )}
                {c.room && (
                  <span className="flex items-center gap-1">
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    {c.room}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-slate-400">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  {c.enrolled_count} enrolled
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </ClientLayout>
  );
}
