import AppIcon from '@/Components/AppIcon';
import PortalLayout from '@/Layouts/PortalLayout';
import { useState } from 'react';

function EmptyState({ icon = 'ratings', message }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <AppIcon name={icon} className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">{message}</p>
        </div>
    );
}

function StarBar({ value, max = 5 }) {
    const numericValue = Number(value ?? 0);
    const pct = Math.min(100, Math.round((numericValue / max) * 100));

    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold text-slate-700">{formatRating(numericValue)}</span>
        </div>
    );
}

function formatRating(value) {
    const rating = Number(value ?? 0);

    return rating ? rating.toFixed(2) : '0.00';
}

function ratingLabel(value) {
    const rating = Number(value ?? 0);

    if (rating >= 4.5) return 'Excellent';
    if (rating >= 3.5) return 'Very Good';
    if (rating >= 2.5) return 'Good';
    if (rating >= 1.5) return 'Fair';

    return rating > 0 ? 'Needs Attention' : 'No Rating';
}

function formatDate(value) {
    if (!value) return '-';

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function RatingsBreakdown({ ratings }) {
    const questions = ratings?.per_question ?? [];
    const classRatings = ratings?.class_ratings?.length
        ? ratings.class_ratings
        : Object.entries(questions.reduce((groups, question) => {
            const key = question.class_name || 'General';
            groups[key] ??= [];
            groups[key].push(question);
            return groups;
        }, {})).map(([className, groupedQuestions]) => ({
            class_name: className,
            avg_rating: groupedQuestions.reduce((sum, question) => sum + Number(question.avg_rating ?? 0), 0) / Math.max(1, groupedQuestions.length),
            question_count: groupedQuestions.length,
            response_count: groupedQuestions.reduce((sum, question) => sum + Number(question.response_count ?? 0), 0),
            questions: groupedQuestions,
        }));

    if (!questions.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-sm">
                No question rating breakdown is available yet.
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-slate-800">Ratings Per Class</p>
                    <p className="text-xs text-slate-500">Each class shows its average, then the questions inside it</p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    {ratings.submission_count} total submission{ratings.submission_count === 1 ? '' : 's'}
                </span>
            </div>

            <div className="space-y-4 p-4">
                {classRatings.map((classRating) => (
                    <section key={classRating.class_name} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                        <div className="grid gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 md:grid-cols-[minmax(0,1fr)_190px_96px] md:items-center">
                            <div>
                                <p className="text-sm font-bold text-slate-800">{classRating.class_name || 'General'}</p>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    {classRating.question_count} question{Number(classRating.question_count) === 1 ? '' : 's'} · {classRating.response_count} total response{Number(classRating.response_count) === 1 ? '' : 's'}
                                </p>
                            </div>
                            <StarBar value={classRating.avg_rating} />
                            <div className="text-left md:text-right">
                                <p className="text-lg font-bold text-blue-700">{formatRating(classRating.avg_rating)}</p>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{ratingLabel(classRating.avg_rating)}</p>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {(classRating.questions ?? []).map((q, index) => (
                                <div key={q.question_id} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_190px_96px] md:items-center">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                                                {index + 1}
                                            </span>
                                            <p className="text-sm font-medium leading-6 text-slate-800">
                                                {q.question_text || `Question #${q.question_id}`}
                                            </p>
                                        </div>
                                        <p className="mt-1 pl-9 text-xs text-slate-400">
                                            {q.response_count ?? ratings.submission_count} response{Number(q.response_count ?? ratings.submission_count) === 1 ? '' : 's'}
                                        </p>
                                    </div>
                                    <StarBar value={q.avg_rating} />
                                    <div className="text-left md:text-right">
                                        <p className="text-base font-bold text-slate-900">{formatRating(q.avg_rating)}</p>
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{ratingLabel(q.avg_rating)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </div>
    );
}

function EmployeeInfoCard({ employee, cycle }) {
    return (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow">
                    <AppIcon name="briefcase" className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee</p>
                    <h2 className="mt-0.5 text-xl font-bold text-slate-900">{employee.name}</h2>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                        <span className="font-mono text-xs">{employee.employee_no}</span>
                        {employee.department && <span>· {employee.department}</span>}
                        {employee.role       && <span className="capitalize">· {employee.role}</span>}
                        {employee.branch     && <span>· {employee.branch}</span>}
                    </div>
                </div>
                {cycle && (
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ring-1 ${cycle.is_open ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-slate-100 text-slate-500 ring-slate-200'}`}>
                        <span className={`h-2 w-2 rounded-full ${cycle.is_open ? 'animate-pulse bg-blue-500' : 'bg-slate-400'}`} />
                        {cycle.school_year} · {cycle.semester}
                    </div>
                )}
            </div>
        </div>
    );
}

function RatingsCard({ ratings }) {
    if (!ratings?.submission_count) {
        return <EmptyState icon="ratings" message="No evaluation ratings received for the current cycle." />;
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Rating</p>
                            <div className="mt-2 flex items-end gap-2">
                                <p className="text-5xl font-bold leading-none text-slate-900">{formatRating(ratings.overall_avg)}</p>
                                <p className="pb-1 text-sm font-semibold text-slate-400">/ 5.00</p>
                            </div>
                            <p className="mt-2 text-sm font-medium text-blue-700">{ratingLabel(ratings.overall_avg)}</p>
                        </div>
                        <div className="min-w-[190px] flex-1 lg:max-w-xs">
                            <StarBar value={ratings.overall_avg} />
                            <p className="mt-2 text-xs text-slate-500">
                                Based on the average of all question ratings in this evaluation cycle.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <AppIcon name="assignments" className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Submissions</p>
                            <p className="mt-1 text-3xl font-bold text-slate-900">{ratings.submission_count}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                        Evaluation response{ratings.submission_count === 1 ? '' : 's'} received for you in the current cycle.
                    </p>
                </div>
            </div>

            <RatingsBreakdown ratings={ratings} />
        </div>
    );
}

function ArchiveTab({ archiveFolders = [] }) {
    if (!archiveFolders.length) {
        return <EmptyState icon="archive" message="No archived ratings yet." />;
    }

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                    <AppIcon name="archive" className="h-4 w-4" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-slate-800">Past Academic Year Ratings</p>
                    <p className="text-xs text-slate-500">{archiveFolders.length} archived rating record{archiveFolders.length === 1 ? '' : 's'}</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                    <thead>
                        <tr className="bg-white text-xs font-semibold uppercase tracking-wider text-slate-500">
                            <th className="px-4 py-3">Academic Year</th>
                            <th className="px-4 py-3">Term</th>
                            <th className="px-4 py-3">Overall Rating</th>
                            <th className="px-4 py-3">Rating</th>
                            <th className="px-4 py-3">Total Submissions</th>
                            <th className="px-4 py-3">Latest Submission</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {archiveFolders.map((folder) => (
                            <tr key={folder.label} className="text-slate-700">
                                <td className="px-4 py-3 font-semibold text-slate-900">{folder.school_year || '-'}</td>
                                <td className="px-4 py-3">{folder.semester || '-'}</td>
                                <td className="px-4 py-3">
                                    <span className="font-bold text-blue-700">{formatRating(folder.ratings?.overall_avg)}</span>
                                    <span className="ml-1 text-xs text-slate-400">/ 5.00</span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                        {ratingLabel(folder.ratings?.overall_avg)}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{folder.ratings?.submission_count ?? 0}</td>
                                <td className="px-4 py-3 text-slate-500">{formatDate(folder.ratings?.latest_submitted_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


export default function EmployeeDashboard({ employee, cycle, currentRatings = [], archiveFolders = [] }) {
    const [activeNav, setActiveNav] = useState('ratings');

    const titles = { ratings: 'My Ratings', archive: 'Archive' };

    return (
        <PortalLayout
            title={titles[activeNav] ?? 'Employee Portal'}
            user={employee}
            userType="employee"
            activeNav={activeNav}
            onNavChange={setActiveNav}
        >
            {activeNav === 'ratings' && (
                <>
                    <EmployeeInfoCard employee={employee} cycle={cycle} />
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-slate-800">My Ratings</h2>
                        <p className="text-xs text-slate-400">Current evaluation cycle</p>
                    </div>
                    <RatingsCard ratings={currentRatings} />
                </>
            )}

            {activeNav === 'archive' && (
                <>
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-slate-800">Archive</h2>
                        <p className="text-xs text-slate-400">Past evaluation cycles</p>
                    </div>
                    <ArchiveTab archiveFolders={archiveFolders} />
                </>
            )}
        </PortalLayout>
    );
}
