import AppIcon from '@/Components/AppIcon';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
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

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function normalizeClassRatings(ratings) {
    const questions = ratings?.per_question ?? [];

    if (ratings?.class_ratings?.length) {
        return ratings.class_ratings;
    }

    return Object.entries(questions.reduce((groups, question) => {
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
}

function printRatingsReport({ employee, cycle, ratings, title = 'My Ratings', archiveLabel = null }) {
    if (!ratings?.submission_count) return;

    const classSections = normalizeClassRatings(ratings).map((classRating, classIndex) => {
        const questionRows = (classRating.questions ?? []).map((question, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(question.question_text || `Question #${question.question_id}`)}</td>
                <td>${formatRating(question.avg_rating)}</td>
                <td>${escapeHtml(question.response_count ?? ratings.submission_count)}</td>
            </tr>
        `).join('');

        return `
            <section class="class-section">
                <div class="class-heading">
                    <div>
                        <div class="eyebrow">Class ${classIndex + 1}</div>
                        <h2>${escapeHtml(classRating.class_name || 'General')}</h2>
                        <div class="muted">${escapeHtml(classRating.question_count ?? 0)} question${Number(classRating.question_count ?? 0) === 1 ? '' : 's'} - ${escapeHtml(classRating.response_count ?? 0)} total response${Number(classRating.response_count ?? 0) === 1 ? '' : 's'}</div>
                    </div>
                    <div class="rating">${formatRating(classRating.avg_rating)}</div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:52px;">#</th>
                            <th>Questionnaire Item</th>
                            <th style="width:110px;">Rating</th>
                            <th style="width:110px;">Responses</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${questionRows || '<tr><td colspan="4">No question-level ratings are available.</td></tr>'}
                    </tbody>
                </table>
            </section>
        `;
    }).join('');

    const period = archiveLabel || (cycle ? `${cycle.school_year} - ${cycle.semester}` : 'Current evaluation cycle');
    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    reportWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(title)} - ${escapeHtml(employee?.name ?? 'Employee')}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
                    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
                    .eyebrow { color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 24px; margin: 8px 0 4px; }
                    h2 { font-size: 18px; margin: 4px 0; }
                    .muted { color: #64748b; font-size: 13px; }
                    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
                    .box-label { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
                    .box-value { font-size: 20px; font-weight: 800; margin-top: 6px; }
                    .class-section { margin-top: 24px; padding-top: 18px; border-top: 1px solid #cbd5e1; break-inside: avoid; }
                    .class-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
                    .rating { border: 1px solid #bfdbfe; border-radius: 8px; color: #1d4ed8; font-size: 20px; font-weight: 800; padding: 10px 14px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
                    th { background: #eff6ff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #334155; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        tr, .box, .class-section { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                <div class="header">
                    <div class="eyebrow">Employee Rating Report</div>
                    <h1>${escapeHtml(employee?.name ?? 'Employee')}</h1>
                    <div class="muted">${escapeHtml(employee?.employee_no ?? '')}${employee?.department ? ` - ${escapeHtml(employee.department)}` : ''}${employee?.branch ? ` - ${escapeHtml(employee.branch)}` : ''}</div>
                    <div class="muted">${escapeHtml(period)}</div>
                </div>
                <div class="summary">
                    <div class="box"><div class="box-label">Overall Rating</div><div class="box-value">${formatRating(ratings.overall_avg)}</div></div>
                    <div class="box"><div class="box-label">Rating</div><div class="box-value">${escapeHtml(ratingLabel(ratings.overall_avg))}</div></div>
                    <div class="box"><div class="box-label">Submissions</div><div class="box-value">${escapeHtml(ratings.submission_count ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Latest Submission</div><div class="box-value">${escapeHtml(formatDate(ratings.latest_submitted_at))}</div></div>
                </div>
                ${classSections || '<p>No question rating breakdown is available.</p>'}
                <script>
                    window.onload = function () {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
        </html>
    `);
    reportWindow.document.close();
}

function printAllArchiveRatingsReport({ employee, archiveFolders = [] }) {
    const printableFolders = archiveFolders.filter((folder) => folder?.ratings?.submission_count);

    if (!printableFolders.length) return;

    const archiveSections = printableFolders.map((folder, folderIndex) => {
        const ratings = folder.ratings;
        const classSections = normalizeClassRatings(ratings).map((classRating, classIndex) => {
            const questionRows = (classRating.questions ?? []).map((question, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(question.question_text || `Question #${question.question_id}`)}</td>
                    <td>${formatRating(question.avg_rating)}</td>
                    <td>${escapeHtml(question.response_count ?? ratings.submission_count)}</td>
                </tr>
            `).join('');

            return `
                <section class="class-section">
                    <div class="class-heading">
                        <div>
                            <div class="eyebrow">Class ${classIndex + 1}</div>
                            <h3>${escapeHtml(classRating.class_name || 'General')}</h3>
                            <div class="muted">${escapeHtml(classRating.question_count ?? 0)} question${Number(classRating.question_count ?? 0) === 1 ? '' : 's'} - ${escapeHtml(classRating.response_count ?? 0)} total response${Number(classRating.response_count ?? 0) === 1 ? '' : 's'}</div>
                        </div>
                        <div class="rating small">${formatRating(classRating.avg_rating)}</div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th style="width:52px;">#</th>
                                <th>Questionnaire Item</th>
                                <th style="width:110px;">Rating</th>
                                <th style="width:110px;">Responses</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${questionRows || '<tr><td colspan="4">No question-level ratings are available.</td></tr>'}
                        </tbody>
                    </table>
                </section>
            `;
        }).join('');

        return `
            <section class="archive-record">
                <div class="record-heading">
                    <div>
                        <div class="eyebrow">Archived Rating ${folderIndex + 1}</div>
                        <h2>${escapeHtml(folder.label || [folder.school_year, folder.semester].filter(Boolean).join(' - ') || 'Archived Rating')}</h2>
                    </div>
                    <div class="rating">${formatRating(ratings.overall_avg)}</div>
                </div>
                <div class="summary">
                    <div class="box"><div class="box-label">Academic Year</div><div class="box-value">${escapeHtml(folder.school_year || '-')}</div></div>
                    <div class="box"><div class="box-label">Term</div><div class="box-value">${escapeHtml(folder.semester || '-')}</div></div>
                    <div class="box"><div class="box-label">Rating</div><div class="box-value">${escapeHtml(ratingLabel(ratings.overall_avg))}</div></div>
                    <div class="box"><div class="box-label">Submissions</div><div class="box-value">${escapeHtml(ratings.submission_count ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Latest Submission</div><div class="box-value">${escapeHtml(formatDate(ratings.latest_submitted_at))}</div></div>
                </div>
                ${classSections || '<p>No question rating breakdown is available.</p>'}
            </section>
        `;
    }).join('');

    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    reportWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>Archived Ratings - ${escapeHtml(employee?.name ?? 'Employee')}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
                    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
                    .eyebrow { color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 24px; margin: 8px 0 4px; }
                    h2 { font-size: 20px; margin: 4px 0; }
                    h3 { font-size: 16px; margin: 4px 0; }
                    .muted { color: #64748b; font-size: 13px; }
                    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin: 16px 0; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
                    .box-label { color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
                    .box-value { font-size: 15px; font-weight: 800; margin-top: 5px; }
                    .archive-record { margin-top: 18px; padding-top: 14px; border-top: 1px solid #cbd5e1; break-inside: auto; page-break-inside: auto; }
                    .record-heading, .class-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
                    .class-section { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; break-inside: avoid; }
                    .rating { border: 1px solid #bfdbfe; border-radius: 8px; color: #1d4ed8; font-size: 20px; font-weight: 800; padding: 10px 14px; }
                    .rating.small { font-size: 16px; padding: 8px 12px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
                    th { background: #eff6ff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #334155; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        .header { margin-bottom: 12px; padding-bottom: 10px; }
                        .archive-record { break-inside: auto; page-break-inside: auto; }
                        tr, .box, .class-heading, .record-heading { break-inside: avoid; page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                <div class="header">
                    <div class="eyebrow">Employee Archive Report</div>
                    <h1>${escapeHtml(employee?.name ?? 'Employee')}</h1>
                    <div class="muted">${escapeHtml(employee?.employee_no ?? '')}${employee?.department ? ` - ${escapeHtml(employee.department)}` : ''}${employee?.branch ? ` - ${escapeHtml(employee.branch)}` : ''}</div>
                    <div class="muted">${printableFolders.length} archived rating record${printableFolders.length === 1 ? '' : 's'} included</div>
                </div>
                ${archiveSections}
                <script>
                    window.onload = function () {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
        </html>
    `);
    reportWindow.document.close();
}

function RatingsBreakdown({ ratings, onPrint = null }) {
    const questions = ratings?.per_question ?? [];
    const classRatings = normalizeClassRatings(ratings);

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
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                        {ratings.submission_count} total submission{ratings.submission_count === 1 ? '' : 's'}
                    </span>
                    {onPrint && (
                        <button
                            type="button"
                            onClick={onPrint}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                        >
                            <AppIcon name="print" className="h-3.5 w-3.5" />
                            Print as PDF
                        </button>
                    )}
                </div>
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

function RatingsCard({ ratings, employee, cycle }) {
    const [printConfirm, setPrintConfirm] = useState(null);

    if (!ratings?.submission_count) {
        return <EmptyState icon="ratings" message="No evaluation ratings received for the current cycle." />;
    }

    const askPrintRatings = () => setPrintConfirm({
        title: 'Print ratings as PDF?',
        message: 'This opens a printable ratings report in a new tab so you can save it as PDF.',
        run: () => printRatingsReport({ employee, cycle, ratings, title: 'My Ratings' }),
    });

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
                            <button
                                type="button"
                                onClick={askPrintRatings}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                                <AppIcon name="print" className="h-3.5 w-3.5" />
                                Print as PDF
                            </button>
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

            <RatingsBreakdown
                ratings={ratings}
                onPrint={askPrintRatings}
            />

            <ConfirmDialog
                open={Boolean(printConfirm)}
                title={printConfirm?.title}
                message={printConfirm?.message}
                confirmLabel="Print PDF"
                tone="primary"
                onConfirm={() => {
                    printConfirm?.run?.();
                    setPrintConfirm(null);
                }}
                onCancel={() => setPrintConfirm(null)}
            />
        </div>
    );
}

function ArchiveRatingModal({ employee, folder, open, onClose }) {
    const [printConfirm, setPrintConfirm] = useState(null);
    const ratings = folder?.ratings;

    return (
        <Modal show={open} onClose={onClose} maxWidth="2xl">
            <div className="portal-modal max-h-[86vh] overflow-hidden bg-white">
                <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Archived Rating</p>
                            <h3 className="mt-1 text-lg font-bold text-slate-900">{folder?.label ?? 'Archive Details'}</h3>
                            <p className="mt-1 text-sm text-slate-500">{employee?.name ?? 'Employee'}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close archive details"
                        >
                            <AppIcon name="close" className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="max-h-[calc(86vh-140px)] overflow-y-auto p-5">
                    {ratings?.submission_count ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border border-slate-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Rating</p>
                                    <p className="mt-2 text-2xl font-bold text-blue-700">{formatRating(ratings.overall_avg)}</p>
                                    <p className="text-xs font-semibold text-slate-500">{ratingLabel(ratings.overall_avg)}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Submissions</p>
                                    <p className="mt-2 text-2xl font-bold text-slate-900">{ratings.submission_count}</p>
                                </div>
                                <div className="rounded-lg border border-slate-200 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Latest Submission</p>
                                    <p className="mt-2 text-base font-bold text-slate-900">{formatDate(ratings.latest_submitted_at)}</p>
                                </div>
                            </div>

                            <RatingsBreakdown ratings={ratings} />
                        </div>
                    ) : (
                        <EmptyState icon="archive" message="No archived rating details are available." />
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={() => setPrintConfirm({
                            title: 'Print archived rating as PDF?',
                            message: 'This opens a printable archived rating report in a new tab so you can save it as PDF.',
                            run: () => printRatingsReport({
                                employee,
                                cycle: null,
                                ratings,
                                title: 'Archived Rating',
                                archiveLabel: folder?.label,
                            }),
                        })}
                        disabled={!ratings?.submission_count}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        <AppIcon name="print" className="h-4 w-4" />
                        Print as PDF
                    </button>
                </div>
            </div>

            <ConfirmDialog
                open={Boolean(printConfirm)}
                title={printConfirm?.title}
                message={printConfirm?.message}
                confirmLabel="Print PDF"
                tone="primary"
                onConfirm={() => {
                    printConfirm?.run?.();
                    setPrintConfirm(null);
                }}
                onCancel={() => setPrintConfirm(null)}
            />
        </Modal>
    );
}

function ArchiveTab({ archiveFolders = [], employee }) {
    const [viewingFolder, setViewingFolder] = useState(null);
    const [printConfirm, setPrintConfirm] = useState(null);

    if (!archiveFolders.length) {
        return <EmptyState icon="archive" message="No archived ratings yet." />;
    }

    return (
        <>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <AppIcon name="archive" className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">Past Academic Year Ratings</p>
                            <p className="text-xs text-slate-500">{archiveFolders.length} archived rating record{archiveFolders.length === 1 ? '' : 's'}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setPrintConfirm({
                            title: 'Print archive ratings as PDF?',
                            message: 'This opens a printable archive ratings report in a new tab so you can save it as PDF.',
                            run: () => printAllArchiveRatingsReport({ employee, archiveFolders }),
                        })}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                    >
                        <AppIcon name="print" className="h-3.5 w-3.5" />
                        Print as PDF
                    </button>
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
                                <th className="px-4 py-3 text-right">Action</th>
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
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            type="button"
                                            onClick={() => setViewingFolder(folder)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <AppIcon name="eye" className="h-3.5 w-3.5" />
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ArchiveRatingModal
                employee={employee}
                folder={viewingFolder}
                open={Boolean(viewingFolder)}
                onClose={() => setViewingFolder(null)}
            />

            <ConfirmDialog
                open={Boolean(printConfirm)}
                title={printConfirm?.title}
                message={printConfirm?.message}
                confirmLabel="Print PDF"
                tone="primary"
                onConfirm={() => {
                    printConfirm?.run?.();
                    setPrintConfirm(null);
                }}
                onCancel={() => setPrintConfirm(null)}
            />
        </>
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
                    <RatingsCard ratings={currentRatings} employee={employee} cycle={cycle} />
                </>
            )}

            {activeNav === 'archive' && (
                <>
                    <div className="mb-5">
                        <h2 className="text-base font-semibold text-slate-800">Archive</h2>
                        <p className="text-xs text-slate-400">Past evaluation cycles</p>
                    </div>
                    <ArchiveTab archiveFolders={archiveFolders} employee={employee} />
                </>
            )}
        </PortalLayout>
    );
}
