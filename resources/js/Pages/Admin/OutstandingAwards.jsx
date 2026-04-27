import ConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Printer, X } from 'lucide-react';
import { useState } from 'react';

function formatRating(value) {
    return value !== null && value !== undefined && !Number.isNaN(Number(value))
        ? Number(value).toFixed(2)
        : '-';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function classAverage(questionRatings, questions = []) {
    const values = questions
        .map((question) => {
            const questionId = question?.question_id;
            const entry = questionRatings?.[String(questionId)] ?? questionRatings?.[questionId];

            return entry?.average != null ? Number(entry.average) : null;
        })
        .filter((value) => value != null && !Number.isNaN(value));

    if (!values.length) {
        return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summaryQuestionGroups(summary) {
    const groups = summary?.questionnaire?.scale_questions;

    if (Array.isArray(groups) && groups.length > 0) {
        return groups;
    }

    const ratings = summary?.question_ratings ?? {};
    const questions = Object.keys(ratings)
        .sort((a, b) => Number(a) - Number(b))
        .map((questionId) => ({
            question_id: questionId,
            description: `Question #${questionId}`,
        }));

    return questions.length
        ? [{ class_name: 'Questionnaire Items', weight_percentage: null, questions }]
        : [];
}

function summaryTypeLabel(type) {
    if (type === 'peer') {
        return 'Peer to Peer';
    }

    if (type === 'head') {
        return 'School Head';
    }

    return 'Subject';
}

function rankingRows(title, rows) {
    return `
        <section>
            <h2>${escapeHtml(title)}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Program</th>
                        <th>Rating</th>
                        <th>Responses</th>
                        <th>Subjects</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length ? rows.map((person) => `
                        <tr>
                            <td>${escapeHtml(person?.name ?? '-')}</td>
                            <td>${escapeHtml(person?.program_name ?? '-')}</td>
                            <td>${formatRating(person?.score)}</td>
                            <td>${Number(person?.response_count ?? 0)}</td>
                            <td>${person?.subject_count ?? '-'}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="5">No rating data available.</td></tr>'}
                </tbody>
            </table>
        </section>
    `;
}

function buildOutstandingPrintHtml({
    branch,
    activeAcademicYear,
    mostRatedProgramChair,
    outstandingTeacher,
    outstandingTeachersByProgram,
    outstandingTeachersByDepartment,
}) {
    const schoolYear = activeAcademicYear
        ? `${activeAcademicYear.from_year}-${activeAcademicYear.to_year} ${activeAcademicYear.term}`
        : 'No active academic year';
    const programRows = outstandingTeachersByProgram.map((item) => ({
        ...item.teacher,
        program_name: item.program_name,
    }));
    const departmentRows = outstandingTeachersByDepartment.map((item) => ({
        ...item.teacher,
        program_name: item.department_name,
    }));

    return `
        <!doctype html>
        <html>
            <head>
                <title>Outstanding Rating</title>
                <style>
                    * { box-sizing: border-box; }
                    body { color: #0f172a; font-family: Arial, sans-serif; margin: 32px; }
                    .topbar { border-bottom: 3px solid #1d4ed8; margin-bottom: 22px; padding-bottom: 16px; }
                    .eyebrow { color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 26px; margin: 6px 0; }
                    h2 { color: #0f172a; font-size: 16px; margin: 26px 0 10px; }
                    .muted { color: #64748b; font-size: 13px; }
                    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0 8px; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
                    .box-label { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
                    .box-value { font-size: 18px; font-weight: 800; margin-top: 6px; }
                    table { border-collapse: collapse; margin-top: 10px; width: 100%; }
                    th, td { border: 1px solid #cbd5e1; font-size: 13px; padding: 10px; text-align: left; vertical-align: top; }
                    th { background: #eff6ff; color: #334155; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
                    .no-print { background: white; border: 1px solid #cbd5e1; border-radius: 8px; float: right; font-weight: 700; padding: 8px 12px; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        tr, .box, section { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()">Print / Save PDF</button>
                <div class="topbar">
                    <div class="eyebrow">Ratings & Reports</div>
                    <h1>Outstanding Rating</h1>
                    <div class="muted">Branch: ${escapeHtml(branch?.name ?? '-')}</div>
                    <div class="muted">Active cycle: ${escapeHtml(schoolYear)}</div>
                </div>
                <div class="summary">
                    <div class="box">
                        <div class="box-label">Most Rated Program Chair</div>
                        <div class="box-value">${escapeHtml(mostRatedProgramChair?.name ?? '-')}</div>
                        <div class="muted">${escapeHtml(mostRatedProgramChair?.program_name ?? '-')} - ${formatRating(mostRatedProgramChair?.score)}</div>
                    </div>
                    <div class="box">
                        <div class="box-label">Most Outstanding Teacher Overall</div>
                        <div class="box-value">${escapeHtml(outstandingTeacher?.name ?? '-')}</div>
                        <div class="muted">${formatRating(outstandingTeacher?.score)} rating</div>
                    </div>
                    <div class="box">
                        <div class="box-label">Departments With Ratings</div>
                        <div class="box-value">${outstandingTeachersByDepartment.length}</div>
                        <div class="muted">Outstanding teacher per department</div>
                    </div>
                </div>
                ${rankingRows('Top Ratings', [mostRatedProgramChair, outstandingTeacher].filter(Boolean))}
                ${rankingRows('Outstanding Teachers Per Department', departmentRows)}
                ${rankingRows('Outstanding Teachers Per Program', programRows)}
                <script>
                    window.onload = function () {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
        </html>
    `;
}

function buildRatingDetailPrintHtml({ person }) {
    const summaries = person?.evaluation_summaries ?? [];

    const summarySections = summaries.map((summary) => {
        const groups = summaryQuestionGroups(summary);
        const title = summary.subject_name
            ? `${summary.subject_code ? `${summary.subject_code} - ` : ''}${summary.subject_name}`
            : summary.questionnaire?.title ?? 'Evaluation Summary';

        const groupSections = groups.map((group, groupIndex) => {
            const groupAverage = classAverage(summary.question_ratings, group.questions);
            const rows = (group.questions ?? []).map((question, questionIndex) => {
                const entry = summary.question_ratings?.[String(question.question_id)] ?? summary.question_ratings?.[question.question_id];

                return `
                    <tr>
                        <td>${questionIndex + 1}</td>
                        <td>${escapeHtml(question.description)}</td>
                        <td>${formatRating(entry?.average)}</td>
                        <td>${entry?.count ?? 0}</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="group">
                    <div class="group-head">
                        <h3>${escapeHtml(group.class_name || `Class ${groupIndex + 1}`)}</h3>
                        <div class="muted">
                            ${group.weight_percentage != null ? `${escapeHtml(group.weight_percentage)}% weight - ` : ''}
                            Class rating ${formatRating(groupAverage)}
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Questionnaire Item</th>
                                <th>Rating</th>
                                <th>Responses</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows || '<tr><td colspan="4">No questionnaire items found.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
        }).join('');

        return `
            <section>
                <div class="section-head">
                    <div>
                        <div class="eyebrow">${escapeHtml(summaryTypeLabel(summary.type))}</div>
                        <h2>${escapeHtml(title)}</h2>
                        <div class="muted">
                            ${escapeHtml(summary.questionnaire?.title ?? 'Questionnaire')}
                            ${summary.questionnaire?.questionnaire_code ? ` - ${escapeHtml(summary.questionnaire.questionnaire_code)}` : ''}
                        </div>
                    </div>
                    <div class="pill">Rating ${formatRating(summary.overall_rating)}</div>
                    <div class="pill muted-pill">${summary.submission_count ?? 0} response(s)</div>
                </div>
                ${groupSections || '<p class="empty">No questionnaire items found.</p>'}
            </section>
        `;
    }).join('');

    return `
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(person?.name ?? 'Rating Detail')}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { color: #0f172a; font-family: Arial, sans-serif; margin: 32px; }
                    .no-print { background: white; border: 1px solid #cbd5e1; border-radius: 8px; float: right; font-weight: 700; padding: 8px 12px; }
                    .topbar { border-bottom: 3px solid #1d4ed8; margin-bottom: 22px; padding-bottom: 16px; }
                    .eyebrow { color: #2563eb; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 26px; margin: 6px 0; }
                    h2 { font-size: 16px; margin: 4px 0; }
                    h3 { font-size: 14px; margin: 0 0 4px; }
                    .muted { color: #64748b; font-size: 13px; }
                    .empty { border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; padding: 16px; }
                    section { border: 1px solid #cbd5e1; border-radius: 8px; margin: 16px 0; overflow: hidden; }
                    .section-head { align-items: flex-start; background: #f8fafc; border-bottom: 1px solid #cbd5e1; display: flex; gap: 10px; justify-content: space-between; padding: 12px; }
                    .pill { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 999px; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 5px 10px; white-space: nowrap; }
                    .muted-pill { background: #f1f5f9; border-color: #e2e8f0; color: #475569; }
                    .group { padding: 14px; }
                    .group + .group { border-top: 1px solid #e2e8f0; }
                    .group-head { margin-bottom: 10px; }
                    table { border-collapse: collapse; width: 100%; }
                    th, td { border: 1px solid #cbd5e1; font-size: 12px; padding: 8px; text-align: left; vertical-align: top; }
                    th { background: #eff6ff; color: #334155; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        tr, section, .group { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()">Print / Save PDF</button>
                <div class="topbar">
                    <div class="eyebrow">Questionnaire Rating Summary</div>
                    <h1>${escapeHtml(person?.name ?? '-')}</h1>
                    <div class="muted">${escapeHtml(person?.program_name ?? 'All evaluation summaries')} - Overall ${formatRating(person?.score)}</div>
                </div>
                ${summarySections || '<p class="empty">No questionnaire rating details are available for this card yet.</p>'}
                <script>
                    window.onload = function () {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
        </html>
    `;
}

function EmptyCard({ title, message }) {
    return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
            <p className="mt-2 text-sm text-slate-500">{message}</p>
        </div>
    );
}

function HighlightCard({ title, subtitle, person, tone = 'blue', onOpen }) {
    if (!person) {
        return (
            <EmptyCard
                title={title}
                message="No rating data is available for the selected branch yet."
            />
        );
    }

    const toneClass = tone === 'amber'
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-blue-50 text-blue-700 ring-blue-200';

    return (
        <button
            type="button"
            onClick={onOpen}
            className="block w-full rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
                    <h3 className="mt-3 text-xl font-bold text-slate-900">{person.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{subtitle ?? person.program_name ?? 'Combined ratings'}</p>
                </div>
                <div className={`rounded-xl px-3 py-2 text-center ring-1 ${toneClass}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide">Rating</p>
                    <p className="text-2xl font-black leading-none">{formatRating(person.score)}</p>
                </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responses</p>
                    <p className="mt-1 font-bold text-slate-800">{person.response_count ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Subjects</p>
                    <p className="mt-1 font-bold text-slate-800">{person.subject_count ?? '-'}</p>
                </div>
            </div>
            <p className="mt-4 text-xs font-semibold text-blue-600">View questionnaire ratings</p>
        </button>
    );
}

function ProgramTeacherCard({ item, onOpen }) {
    const teacher = item.teacher;
    const label = item.program_name ?? item.department_name;

    return (
        <button
            type="button"
            onClick={onOpen}
            disabled={!teacher}
            className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:shadow-sm"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                        {label}
                    </p>
                    <h4 className="mt-2 truncate text-base font-bold text-slate-900">
                        {teacher?.name ?? 'No teacher rating yet'}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                        {teacher ? `${teacher.subject_count ?? 0} subject(s), ${teacher.response_count ?? 0} response(s)` : 'Waiting for ratings'}
                    </p>
                </div>
                <span className="inline-flex min-w-16 justify-center rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700 ring-1 ring-blue-200">
                    {formatRating(teacher?.score)}
                </span>
            </div>
            {teacher && <p className="mt-3 text-xs font-semibold text-blue-600">View questionnaire ratings</p>}
        </button>
    );
}

function RatingDetailModal({ person, onClose, onPrint }) {
    const summaries = person?.evaluation_summaries ?? [];
    const canPrint = summaries.length > 0;

    return (
        <Modal show={Boolean(person)} maxWidth="5xl" onClose={onClose}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                        Questionnaire Rating Summary
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-slate-900">{person?.name ?? '-'}</h3>
                    <p className="text-sm text-slate-500">
                        {person?.program_name ?? 'All evaluation summaries'} • Overall {formatRating(person?.score)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onPrint}
                        disabled={!canPrint}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Print PDF
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
                {summaries.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                        No questionnaire rating details are available for this card yet.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {summaries.map((summary, summaryIndex) => {
                            const groups = summaryQuestionGroups(summary);
                            const title = summary.subject_name
                                ? `${summary.subject_code ? `${summary.subject_code} - ` : ''}${summary.subject_name}`
                                : summary.questionnaire?.title ?? 'Evaluation Summary';

                            return (
                                <section key={`${summary.type ?? 'summary'}-${summary.questionnaire_id ?? 'q'}-${summary.subject_id ?? summaryIndex}`} className="rounded-xl border border-slate-200 bg-white">
                                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                                        <div>
                                            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-600">
                                                {summaryTypeLabel(summary.type)}
                                            </p>
                                            <h4 className="text-sm font-bold text-slate-900">{title}</h4>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {summary.questionnaire?.title ?? 'Questionnaire'}{summary.questionnaire?.questionnaire_code ? ` • ${summary.questionnaire.questionnaire_code}` : ''}
                                            </p>
                                        </div>
                                        <div className="flex gap-2 text-xs">
                                            <span className="rounded-full bg-blue-50 px-3 py-1 font-bold text-blue-700 ring-1 ring-blue-200">
                                                Rating {formatRating(summary.overall_rating)}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600">
                                                {summary.submission_count ?? 0} response(s)
                                            </span>
                                        </div>
                                    </div>

                                    {groups.length === 0 ? (
                                        <p className="px-4 py-4 text-sm text-slate-500">No questionnaire items found.</p>
                                    ) : (
                                        <div className="divide-y divide-slate-200">
                                            {groups.map((group, groupIndex) => {
                                                const groupAverage = classAverage(summary.question_ratings, group.questions);

                                                return (
                                                    <div key={`${group.class_name ?? 'group'}-${groupIndex}`} className="p-4">
                                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-800">{group.class_name || `Class ${groupIndex + 1}`}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    {group.weight_percentage != null ? `${group.weight_percentage}% weight • ` : ''}
                                                                    Class rating {formatRating(groupAverage)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                                                    <tr>
                                                                        <th className="w-12 px-3 py-2 text-left">#</th>
                                                                        <th className="px-3 py-2 text-left">Questionnaire Item</th>
                                                                        <th className="w-24 px-3 py-2 text-left">Rating</th>
                                                                        <th className="w-28 px-3 py-2 text-left">Responses</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {(group.questions ?? []).map((question, questionIndex) => {
                                                                        const entry = summary.question_ratings?.[String(question.question_id)] ?? summary.question_ratings?.[question.question_id];

                                                                        return (
                                                                            <tr key={question.question_id}>
                                                                                <td className="px-3 py-2 text-slate-500">{questionIndex + 1}</td>
                                                                                <td className="px-3 py-2 text-slate-700">{question.description}</td>
                                                                                <td className="px-3 py-2 font-bold text-slate-900">{formatRating(entry?.average)}</td>
                                                                                <td className="px-3 py-2 text-slate-600">{entry?.count ?? 0}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default function OutstandingAwards({
    branches = [],
    filters = {},
    activeAcademicYear = null,
    mostRatedProgramChair = null,
    outstandingTeacher = null,
    outstandingTeachersByProgram = [],
    outstandingTeachersByDepartment = [],
}) {
    const [selectedBranchId, setSelectedBranchId] = useState(filters?.branch_id ?? branches?.[0]?.id ?? '');
    const [confirmPrint, setConfirmPrint] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState(null);
    const selectedBranch = branches.find((branch) => Number(branch.id) === Number(selectedBranchId));
    const canPrint = Boolean(activeAcademicYear) && (
        Boolean(mostRatedProgramChair)
        || Boolean(outstandingTeacher)
        || outstandingTeachersByProgram.length > 0
        || outstandingTeachersByDepartment.length > 0
    );

    const filterBranch = (branchId) => {
        setSelectedBranchId(branchId);
        router.get(
            route('admin.outstanding-awards'),
            { branch_id: branchId },
            { preserveState: true, replace: true },
        );
    };

    const printOutstandingRatings = () => {
        const reportWindow = window.open('', '_blank', 'width=960,height=720');

        if (!reportWindow) {
            return;
        }

        const csrf = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        axios.post(route('admin.audit-logs.print'), {
            report: 'outstanding-rating',
            rating_type: 'outstanding',
            title: 'Outstanding Rating',
            school_year: activeAcademicYear
                ? `${activeAcademicYear.from_year}-${activeAcademicYear.to_year} ${activeAcademicYear.term}`
                : '',
            record_count: Number(Boolean(mostRatedProgramChair))
                + Number(Boolean(outstandingTeacher))
                + outstandingTeachersByDepartment.length
                + outstandingTeachersByProgram.length,
            target_id: selectedBranchId ? Number(selectedBranchId) : null,
        }, {
            headers: csrf ? { 'X-CSRF-TOKEN': csrf } : {},
        }).catch(() => {});

        reportWindow.document.write(buildOutstandingPrintHtml({
            branch: selectedBranch,
            activeAcademicYear,
            mostRatedProgramChair,
            outstandingTeacher,
            outstandingTeachersByProgram,
            outstandingTeachersByDepartment,
        }));
        reportWindow.document.close();
    };

    const printRatingDetail = () => {
        if (!selectedDetail) {
            return;
        }

        const reportWindow = window.open('', '_blank', 'width=960,height=720');

        if (!reportWindow) {
            return;
        }

        const csrf = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');

        axios.post(route('admin.audit-logs.print'), {
            report: 'outstanding-rating-detail',
            rating_type: 'outstanding',
            title: `Outstanding Rating Detail - ${selectedDetail.name ?? 'Teacher'}`,
            school_year: activeAcademicYear
                ? `${activeAcademicYear.from_year}-${activeAcademicYear.to_year} ${activeAcademicYear.term}`
                : '',
            record_count: selectedDetail.evaluation_summaries?.length ?? 0,
            target_id: selectedDetail.id ?? null,
        }, {
            headers: csrf ? { 'X-CSRF-TOKEN': csrf } : {},
        }).catch(() => {});

        reportWindow.document.write(buildRatingDetailPrintHtml({ person: selectedDetail }));
        reportWindow.document.close();
    };

    return (
        <AdminLayout title="Outstanding Rating" activeRoute="admin.outstanding-awards" breadcrumbs={['Ratings & Reports']}>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Outstanding Rating</h2>
                    <p className="text-sm text-slate-500">
                        Top program chair, overall teacher, and outstanding teachers by department.
                    </p>
                    {activeAcademicYear && (
                        <p className="mt-1 text-xs font-semibold text-blue-600">
                            Active cycle: {activeAcademicYear.from_year}-{activeAcademicYear.to_year} {activeAcademicYear.term}
                        </p>
                    )}
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Branch
                        </label>
                        <select
                            value={selectedBranchId ?? ''}
                            onChange={(event) => filterBranch(event.target.value)}
                            className="min-w-72 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => setConfirmPrint(true)}
                        disabled={!canPrint}
                        className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Printer className="h-4 w-4" aria-hidden="true" />
                        Print as PDF
                    </button>
                </div>
            </div>

            {!activeAcademicYear ? (
                <EmptyCard
                    title="No Active Academic Year"
                    message="Activate an academic year first before viewing outstanding ratings."
                />
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-4 lg:grid-cols-2">
                        <HighlightCard
                            title="Most Rated Program Chair"
                            subtitle={mostRatedProgramChair?.program_name ?? 'School heads evaluation'}
                            person={mostRatedProgramChair}
                            tone="amber"
                            onOpen={() => setSelectedDetail(mostRatedProgramChair)}
                        />
                        <HighlightCard
                            title="Most Outstanding Teacher Overall"
                            subtitle="Combined average across all subject ratings"
                            person={outstandingTeacher}
                            onOpen={() => setSelectedDetail(outstandingTeacher)}
                        />
                    </div>

                    <div>
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-slate-900">Outstanding Teachers Per Department</h3>
                            <p className="text-xs text-slate-500">
                                Highest combined subject-rating average within each department.
                            </p>
                        </div>

                        {outstandingTeachersByDepartment.length === 0 ? (
                            <EmptyCard
                                title="No Department Ratings"
                                message="No department-level subject ratings are available for this branch yet."
                            />
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {outstandingTeachersByDepartment.map((item) => (
                                    <ProgramTeacherCard
                                        key={item.department_id}
                                        item={item}
                                        onOpen={() => setSelectedDetail(item.teacher)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="mb-3">
                            <h3 className="text-sm font-bold text-slate-900">Outstanding Teachers Per Program</h3>
                            <p className="text-xs text-slate-500">
                                Highest combined subject-rating average within each college program.
                            </p>
                        </div>

                        {outstandingTeachersByProgram.length === 0 ? (
                            <EmptyCard
                                title="No Program Ratings"
                                message="No program-level subject ratings are available for this branch yet."
                            />
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {outstandingTeachersByProgram.map((item) => (
                                    <ProgramTeacherCard
                                        key={item.program_id}
                                        item={item}
                                        onOpen={() => setSelectedDetail(item.teacher)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={confirmPrint}
                title="Print outstanding ratings as PDF?"
                message="This opens a printable outstanding rating report in a new tab so you can save it as PDF."
                confirmLabel="Print PDF"
                danger={false}
                onConfirm={() => {
                    setConfirmPrint(false);
                    printOutstandingRatings();
                }}
                onCancel={() => setConfirmPrint(false)}
            />
            <RatingDetailModal
                person={selectedDetail}
                onClose={() => setSelectedDetail(null)}
                onPrint={printRatingDetail}
            />
        </AdminLayout>
    );
}
