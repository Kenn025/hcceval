import React, { useState } from 'react';
import ClientLayout from '@/Layouts/ClientLayout';

const TABS = [
  { key: 'ratings', label: 'My Ratings' },
  { key: 'archive', label: 'Archive' },
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
      <svg viewBox="0 0 24 24" className="mx-auto mb-3 h-10 w-10 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 8l9-4 9 4-9 4-9-4Z" /><path d="M7 10.5v4.5c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StarRating({ value }) {
  if (!value) return <span className="text-xs text-slate-400">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <svg key={i} viewBox="0 0 20 20" className={`h-3.5 w-3.5 ${i <= Math.round(value) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-600">{value}</span>
    </span>
  );
}

function RatingsView({ ratings }) {
  if (!ratings || !ratings.submission_count) {
    return <EmptyState message="No evaluation ratings received for the current cycle." />;
  }
  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 p-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-wider text-slate-300 mb-1">Overall Rating</p>
        <div className="flex items-end gap-3">
          <span className="text-5xl font-bold">{ratings.overall_avg}</span>
          <span className="mb-1 text-slate-300">/ 5.00</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">{ratings.submission_count} evaluation{ratings.submission_count !== 1 ? 's' : ''} received</p>
      </div>

      {/* Per-question breakdown */}
      {ratings.per_question?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-slate-700">Per-Question Average</p>
          <div className="space-y-3">
            {ratings.per_question.map((q, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-600 flex-1">Q{q.question_id}</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-28 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${(q.avg_rating / 5) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs font-semibold text-slate-700">{q.avg_rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArchiveTab({ archiveFolders }) {
  const [open, setOpen] = useState({});
  if (!archiveFolders.length) return <EmptyState message="No archived ratings yet." />;
  return (
    <div className="space-y-3">
      {archiveFolders.map((folder) => (
        <div key={folder.label} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <button type="button"
            onClick={() => setOpen(prev => ({ ...prev, [folder.label]: !prev[folder.label] }))}
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-amber-500" fill="currentColor">
                <path d="M2 6a2 2 0 012-2h5l2 2h9a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              </svg>
              <span className="text-sm font-semibold text-slate-700">{folder.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {folder.ratings?.overall_avg ? <StarRating value={folder.ratings.overall_avg} /> : null}
              <svg viewBox="0 0 24 24" className={`h-4 w-4 text-slate-400 transition-transform ${open[folder.label] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </button>
          {open[folder.label] && (
            <div className="border-t border-slate-100 px-4 py-4">
              {folder.ratings?.submission_count ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Overall Average</span>
                    <div className="flex items-center gap-2">
                      <StarRating value={folder.ratings.overall_avg} />
                      <span className="text-xs text-slate-400">({folder.ratings.submission_count} responses)</span>
                    </div>
                  </div>
                  {folder.ratings.per_question?.map((q, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500 flex-1">Q{q.question_id}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${(q.avg_rating / 5) * 100}%` }} />
                        </div>
                        <span className="w-8 text-right text-xs font-semibold text-slate-600">{q.avg_rating}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No ratings for this period.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function EmployeeDashboard({ employee, cycle, currentRatings, archiveFolders }) {
  const [activeTab, setActiveTab] = useState('ratings');

  return (
    <ClientLayout title="Employee Portal" user={employee} userType="employee">
      {/* Welcome banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#2d1b69] to-[#5b35b5] p-5 text-white shadow-md">
        <p className="text-xs uppercase tracking-wider text-purple-200 mb-1">Welcome back</p>
        <h2 className="text-xl font-bold">{employee.name}</h2>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-purple-100">
          <span>{employee.employee_no}</span>
          {employee.department && <span>· {employee.department}</span>}
          {employee.role && <span className="capitalize">· {employee.role}</span>}
          {employee.branch && <span>· {employee.branch}</span>}
        </div>
        {cycle && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${cycle.is_open ? 'bg-purple-300 animate-pulse' : 'bg-slate-300'}`} />
            {cycle.school_year} · {cycle.semester}
            {cycle.is_open ? ' — Evaluation Open' : ' — Evaluation Closed'}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
            className={['flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all', activeTab === t.key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'].join(' ')}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'ratings' && <RatingsView ratings={currentRatings} />}
      {activeTab === 'archive' && <ArchiveTab archiveFolders={archiveFolders} />}
    </ClientLayout>
  );
}
