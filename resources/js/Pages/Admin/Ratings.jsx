import ConfirmDialog from '@/Components/ConfirmDialog';
import ResourceTable from '@/Components/Admin/ResourceTable';
import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const normalizeLabel = (value) => String(value ?? '').trim().toLowerCase();

const getDepartmentType = (departmentName) => {
    const name = normalizeLabel(departmentName);

    if (name.includes('college')) {
        return 'college';
    }

    if (name.includes('senior high')) {
        return 'shs';
    }

    if (name.includes('junior high')) {
        return 'jhs';
    }

    return null;
};

const uniqueByName = (items = []) => {
    const seen = new Set();

    return items.filter((item) => {
        const key = normalizeLabel(item.name);

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

const formatQuestionAverage = (questionRatings, questionId) => {
    const entry = questionRatings?.[String(questionId)] ?? questionRatings?.[questionId];

    if (!entry || entry.average == null) {
        return '-';
    }

    return Number(entry.average).toFixed(2);
};

const classAverage = (questionRatings, questions = []) => {
    const values = questions
        .map((question) => {
            const questionId = question?.question_id;
            const entry = questionRatings?.[String(questionId)] ?? questionRatings?.[questionId];

            return entry?.average != null ? Number(entry.average) : null;
        })
        .filter((value) => value != null);

    if (!values.length) {
        return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const ratingPercentage = (value) => {
    if (value == null || Number.isNaN(Number(value))) {
        return null;
    }

    return (Number(value) / 5) * 100;
};

const formatRating = (value) => (
    value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value))
        ? Number(value).toFixed(2)
        : '-'
);

const formatPercentage = (value) => (
    value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value))
        ? `${Number(value).toFixed(2)}%`
        : '-'
);

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const parseJsonObject = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
};

const normalizedQuestionRatings = (rating) => {
    const questionRatings = parseJsonObject(rating?.question_ratings);

    if (Object.keys(questionRatings).length > 0) {
        return questionRatings;
    }

    return Object.fromEntries(
        Object.entries(parseJsonObject(rating?.item_ratings)).map(([questionId, average]) => [
            String(questionId),
            {
                average: Number.isFinite(Number(average)) ? Number(average) : null,
                count: rating?.submission_count ?? 0,
            },
        ]),
    );
};

const ratingQuestionGroups = (rating) => {
    const questionnaireGroups = rating?.questionnaire?.scale_questions;

    if (Array.isArray(questionnaireGroups) && questionnaireGroups.length > 0) {
        return questionnaireGroups;
    }

    const questionRatings = normalizedQuestionRatings(rating);
    const questions = Object.keys(questionRatings)
        .sort((a, b) => Number(a) - Number(b))
        .map((questionId) => ({
            question_id: questionId,
            description: `Question #${questionId}`,
        }));

    return questions.length
        ? [{ class_name: 'Item Ratings', weight_percentage: null, questions }]
        : [];
};

const buildRatingReportSection = (rating, ratingType, index = null) => {
    const questionnaire = rating.questionnaire ?? {};
    const groups = ratingQuestionGroups(rating);
    const questionRatings = normalizedQuestionRatings(rating);
    const allQuestions = groups.flatMap((group) => (
        Array.isArray(group.questions)
            ? group.questions.map((question) => ({ ...question, group }))
            : []
    ));

    const questionRows = allQuestions.map((question, index) => {
        const currentGroup = question.group ?? {};
        const previousGroup = allQuestions[index - 1]?.group ?? {};
        const showClass = (currentGroup.class_name || index === 0)
            && currentGroup.class_name !== previousGroup.class_name;
        const questionAverage = formatQuestionAverage(questionRatings, question.question_id);
        const numericAverage = Number(questionAverage);
        const responseCount = questionRatings?.[String(question.question_id)]?.count
            ?? questionRatings?.[question.question_id]?.count
            ?? questionRatings?.[String(question.question_id)]?.response_count
            ?? questionRatings?.[question.question_id]?.response_count
            ?? rating.submission_count
            ?? 0;
        const groupAverage = classAverage(questionRatings, currentGroup.questions);

        return `
            ${showClass ? `
                <tr class="class-row">
                    <td colspan="5">
                        <strong>${escapeHtml(currentGroup.class_name || `Class ${index + 1}`)}</strong>
                        ${currentGroup.weight_percentage != null ? `<span>${escapeHtml(currentGroup.weight_percentage)}%</span>` : ''}
                        <span>Class Rating: ${formatRating(groupAverage)}</span>
                        <span>Percentage: ${formatPercentage(groupAverage != null ? (Number(groupAverage) / 5) * 100 : null)}</span>
                    </td>
                </tr>
            ` : ''}
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(question.description || `Question #${question.question_id}`)}</td>
                <td>${escapeHtml(questionAverage)}</td>
                <td>${Number.isFinite(numericAverage) ? `${((numericAverage / 5) * 100).toFixed(2)}%` : '-'}</td>
                <td>${Number(responseCount ?? 0)}</td>
            </tr>
        `;
    }).join('');

    const title = ratingType === 'subject'
        ? 'Subject Rating Report'
        : ratingType === 'head'
            ? 'School Head Rating Report'
            : 'Rating Report';

    return `
        <section class="report-section">
            <div class="header">
                <div class="eyebrow">${escapeHtml(index != null ? `${title} ${index + 1}` : title)}</div>
                <h1>${escapeHtml(rating.subject_name || rating.teacher_name || rating.branch_name || questionnaire.title || '-')}</h1>
                <div class="muted">${escapeHtml([rating.subject_code, rating.teacher_name, rating.department_name, rating.program_name ?? rating.strand_name].filter(Boolean).join(' - ') || 'Rating')}</div>
                <div class="muted">${escapeHtml(rating.school_year || 'Current year')}${rating.semester ? ` - ${escapeHtml(rating.semester)}` : ''}</div>
            </div>
            <div class="summary">
                <div class="box"><div class="box-label">Overall Rating</div><div class="box-value">${formatRating(rating.overall_rating)}</div></div>
                <div class="box"><div class="box-label">Percentage</div><div class="box-value">${formatPercentage(ratingPercentage(rating.overall_rating))}</div></div>
                <div class="box"><div class="box-label">Submissions</div><div class="box-value">${Number(rating.submission_count ?? 0)}</div></div>
                <div class="box"><div class="box-label">Classes</div><div class="box-value">${groups.length}</div></div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width:52px;">#</th>
                        <th>Questionnaire Item</th>
                        <th style="width:110px;">Rating</th>
                        <th style="width:120px;">Percentage</th>
                        <th style="width:110px;">Responses</th>
                    </tr>
                </thead>
                <tbody>
                    ${questionRows || '<tr><td colspan="5">No questionnaire ratings are available for this rating yet.</td></tr>'}
                </tbody>
            </table>
        </section>
    `;
};

const buildRatingsReportDocument = (ratings, ratingType, reportTitle) => {
    const sections = ratings.map((rating, index) => buildRatingReportSection(rating, ratingType, ratings.length > 1 ? index : null)).join('');

    return `
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(reportTitle)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
                    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
                    .eyebrow { color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 24px; margin: 8px 0 4px; }
                    .muted { color: #64748b; font-size: 13px; }
                    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
                    .box-label { color: #64748b; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
                    .box-value { font-size: 20px; font-weight: 800; margin-top: 6px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
                    th { background: #eff6ff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #334155; }
                    .class-row td { background: #f8fafc; color: #334155; font-size: 12px; }
                    .class-row span { margin-left: 14px; color: #475569; }
                    .report-section { margin-top: 26px; break-after: page; }
                    .report-section:first-of-type { margin-top: 0; }
                    .report-section:last-of-type { break-after: auto; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        .box { break-inside: avoid; }
                        tr, .report-section { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                ${sections}
                <script>
                    window.onload = function () {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
        </html>
    `;
};

const recordPrintEvent = (payload) => {
    const csrf = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

    axios.post(route('admin.audit-logs.print'), payload, {
        headers: csrf ? { 'X-CSRF-TOKEN': csrf } : {},
    }).catch(() => {});
};

const printRatingsReport = (ratings, ratingType, reportTitle, meta = {}) => {
    const printableRatings = ratings.filter((rating) => rating?.overall_rating != null);

    if (!printableRatings.length) return;

    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    recordPrintEvent({
        report: meta.report ?? 'ratings-report',
        rating_type: ratingType,
        title: reportTitle,
        school_year: meta.school_year ?? '',
        record_count: printableRatings.length,
        target_id: meta.target_id ?? null,
    });

    reportWindow.document.write(buildRatingsReportDocument(printableRatings, ratingType, reportTitle));
    reportWindow.document.close();
};

const printRatingReport = (rating, ratingType) => {
    printRatingsReport(
        [rating],
        ratingType,
        rating?.subject_name || rating?.teacher_name || 'Rating Report',
        {
            report: 'rating-detail',
            school_year: rating?.school_year ?? '',
            target_id: rating?.rating_id ?? null,
        },
    );
};

const ROUTE_MAP = {
    subject: 'admin.subject-ratings',
    peer: 'admin.peer-ratings',
    employee: 'admin.employee-ratings',
    head: 'admin.head-ratings',
    branch: 'admin.branch-ratings',
};

const EXPORT_ROUTE_MAP = {
    subject: 'admin.subject-ratings.export',
    peer: 'admin.peer-ratings.export',
    employee: 'admin.employee-ratings.export',
    head: 'admin.head-ratings.export',
    branch: 'admin.branch-ratings.export',
};

const TITLE_MAP = {
    subject: 'Subject Ratings',
    peer: 'Peer Ratings',
    employee: 'Employee Ratings',
    head: 'School Heads Ratings',
    branch: 'Branch Ratings',
};

const SUBJECT_COLUMNS = [
    { key: 'teacher_name', label: 'Teacher', render: (r) => r.teacher_name ?? '-' },
    { key: 'subject_name', label: 'Subject', render: (r) => r.subject_name ?? '-' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '-' },
    { key: 'school_year', label: 'School Year', render: (r) => r.school_year ?? '-' },
    { key: 'semester', label: 'Semester', render: (r) => r.semester ?? '-' },
];

const PEER_COLUMNS = [
    { key: 'teacher_name', label: 'Teacher', render: (r) => r.teacher_name ?? '-' },
    { key: 'department_name', label: 'Department', render: (r) => r.department_name ?? '-' },
    { key: 'program_name', label: 'Program / Strand', render: (r) => r.program_name ?? r.strand_name ?? '-' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '-' },
    { key: 'submission_count', label: 'Responses', render: (r) => r.submission_count ?? 0 },
    { key: 'is_released', label: 'Portal', render: (r) => r.is_released ? 'Released' : 'Pending' },
    { key: 'school_year', label: 'School Year', render: (r) => r.school_year ?? '-' },
];

const EMPLOYEE_COLUMNS = [
    { key: 'teacher_name', label: 'Employee', render: (r) => r.teacher_name ?? '-' },
    { key: 'department_name', label: 'Department', render: (r) => r.department_name ?? '-' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '-' },
    { key: 'submission_count', label: 'Responses', render: (r) => r.submission_count ?? 0 },
    { key: 'school_year', label: 'School Year' },
    { key: 'semester', label: 'Term', render: (r) => r.semester ?? '-' },
];

const HEAD_COLUMNS = [
    { key: 'teacher_name', label: 'School Head', render: (r) => r.teacher_name ?? '—' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '—' },
    { key: 'submission_count', label: 'Responses' },
    { key: 'school_year', label: 'School Year' },
    { key: 'semester', label: 'Term', render: (r) => r.semester ?? '-' },
];

const BRANCH_COLUMNS = [
    { key: 'rating_id', label: '#' },
    { key: 'branch_name', label: 'Branch', render: (r) => r.branch_name ?? '—' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '—' },
    { key: 'submission_count', label: 'Responses' },
    { key: 'school_year', label: 'School Year' },
];

const COLUMNS_MAP = {
    subject: SUBJECT_COLUMNS,
    peer: PEER_COLUMNS,
    employee: EMPLOYEE_COLUMNS,
    head: HEAD_COLUMNS,
    branch: BRANCH_COLUMNS,
};

function SubjectRatingsList({ subjects = [], onTeacherClick, onReviewComments, toolbarFilter = null }) {
    const [search, setSearch] = useState('');
    const [perPage, setPerPage] = useState(15);
    const rows = subjects.flatMap((subject) => {
        const teachers = subject.teachers?.length ? subject.teachers : [{}];

        return teachers.map((teacher, index) => ({
            ...teacher,
            row_key: `${subject.id}-${teacher.teacher_id ?? 'teacher'}-${index}`,
            subject_id: subject.id,
            subject_name: subject.name,
            subject_code: subject.code,
            program_name: subject.program_name,
            strand_name: subject.strand_name,
            subject_type: subject.type,
        }));
    });
    const filteredRows = rows.filter((row) => {
        const haystack = [
            row.subject_name,
            row.subject_code,
            row.program_name,
            row.strand_name,
            row.subject_type,
            row.teacher_name,
            row.teacher_role,
            row.overall_rating,
            row.submission_count,
        ].filter(Boolean).join(' ').toLowerCase();

        return haystack.includes(search.trim().toLowerCase());
    });
    const visibleRows = filteredRows.slice(0, Number(perPage));

    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="space-y-4 border-b border-slate-100 px-4 py-4 md:px-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative min-w-0 flex-1 md:max-w-sm">
                        <svg
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                            />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search subject ratings..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-bold uppercase tracking-tight text-slate-500">
                                Show
                            </label>
                            <select
                                value={perPage}
                                onChange={(event) => setPerPage(Number(event.target.value))}
                                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                {[10, 15, 25, 50, 100].map((number) => (
                                    <option key={number} value={number}>{number}</option>
                                ))}
                            </select>
                        </div>
                        {toolbarFilter}
                    </div>
                </div>
            </div>
            <div className="hidden grid-cols-[64px_1.4fr_1fr_1fr_0.7fr_0.7fr_0.8fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                <span>#</span>
                <span>Subject</span>
                <span>Program / Strand</span>
                <span>Teacher</span>
                <span>Rating</span>
                <span>Responses</span>
                <span>Portal</span>
                <span className="text-right">Action</span>
            </div>
            <div className="divide-y divide-slate-100">
                {visibleRows.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No subject ratings found.
                    </div>
                )}
                {visibleRows.map((row, index) => {
                    const hasRating = row.overall_rating != null;

                    return (
                        <div
                            key={row.row_key}
                            onClick={() => hasRating && onTeacherClick(row)}
                            className={`grid w-full gap-3 px-5 py-4 text-left transition lg:grid-cols-[64px_1.4fr_1fr_1fr_0.7fr_0.7fr_0.8fr_1fr] lg:items-center ${hasRating ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
                        >
                            <p className="text-sm font-medium text-slate-500">{index + 1}</p>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{row.subject_name}</p>
                                <p className="mt-1 text-xs text-slate-500">{row.subject_code ?? 'No subject code'}</p>
                            </div>
                            <p className="text-sm text-slate-700">{row.program_name ?? row.strand_name ?? row.subject_type ?? '-'}</p>
                            <div>
                                <p className="text-sm font-medium text-slate-800">{row.teacher_name ?? 'Unassigned teacher'}</p>
                                <p className="mt-1 text-xs text-slate-500">{row.teacher_role ?? 'Teacher'}</p>
                            </div>
                            <p className={`text-sm font-semibold ${hasRating ? 'text-blue-700' : 'text-slate-400'}`}>
                                {hasRating ? Number(row.overall_rating).toFixed(2) : 'No rating'}
                            </p>
                            <p className="text-sm text-slate-600">{row.submission_count ?? 0}</p>
                            <div>
                                <span className={[
                                    'inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1',
                                    row.is_released
                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                        : 'bg-amber-50 text-amber-700 ring-amber-200',
                                ].join(' ')}>
                                    {row.is_released ? 'Released' : 'Pending Release'}
                                </span>
                            </div>
                            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (hasRating) {
                                            onReviewComments?.(row);
                                        }
                                    }}
                                    disabled={!hasRating}
                                    className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    Review Comments
                                </button>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        if (hasRating) {
                                            onTeacherClick(row);
                                        }
                                    }}
                                    disabled={!hasRating}
                                    className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    View
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function EvaluationArchiveFolders({
    folders = [],
    onOpenFolder,
    emptyMessage = 'No past evaluation archives found.',
    recordLabel = 'record',
}) {
    if (!folders.length) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500 shadow-sm">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Past Academic Year and Term</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {folders.map((folder) => (
                    <button
                        key={folder.key ?? folder.id}
                        type="button"
                        onClick={() => onOpenFolder(folder)}
                        className="flex min-h-[96px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 7h7l2 2h9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <path d="M3 7V5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-800">{folder.label}</p>
                            <p className="mt-1 text-xs text-slate-500">
                                {folder.record_count ?? folder.subject_count ?? 0} {recordLabel}{Number(folder.record_count ?? folder.subject_count) === 1 ? '' : 's'} - {folder.submission_count ?? 0} response{Number(folder.submission_count) === 1 ? '' : 's'}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function Ratings({
    ratings,
    ratingType,
    filters,
    schoolYears,
    branches = [],
    departments = [],
    programs = [],
    strands = [],
    isBranchAdmin = false,
    selectedBranchId = null,
    scopedBranchId = null,
    subjectRatingContext = null,
    subjectArchiveContext = null,
    peerArchiveContext = null,
    headArchiveContext = null,
    employeeArchiveContext = null,
}) {
    const [selectedYear, setSelectedYear] = useState(filters.school_year ?? '');
    const [detailOpen, setDetailOpen] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const activeRoute = filters.archive_mode && ratingType === 'subject'
        ? 'admin.subject-archives'
        : filters.archive_mode && ratingType === 'peer'
            ? 'admin.peer-archives'
        : filters.archive_mode && ratingType === 'head'
            ? 'admin.head-archives'
        : filters.archive_mode && ratingType === 'employee'
            ? 'admin.employee-archives'
        : ROUTE_MAP[ratingType] ?? 'admin.subject-ratings';
    const columns = COLUMNS_MAP[ratingType] ?? SUBJECT_COLUMNS;
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const selectedFilterBranchId = String(filters.branch_id ?? activeBranchId ?? '');
    const selectedDepartmentGroup = String(filters.department_group ?? '');
    const selectedProgramGroup = String(filters.program_group ?? '');
    const selectedStrandGroup = String(filters.strand_group ?? '');
    const selectedEmployeeDepartmentId = String(filters.employee_department_id ?? '');
    const peerDepartments = useMemo(
        () => departments.filter((department) => (
            (!selectedFilterBranchId || String(department.branch_id) === selectedFilterBranchId)
            && Boolean(department.is_activated)
        )),
        [departments, selectedFilterBranchId],
    );
    const peerFilterDepartments = useMemo(
        () => uniqueByName(peerDepartments),
        [peerDepartments],
    );
    const selectedDepartmentType = useMemo(
        () => getDepartmentType(selectedDepartmentGroup),
        [selectedDepartmentGroup],
    );
    const matchingDepartmentIds = useMemo(
        () => peerDepartments
            .filter((department) => !selectedDepartmentGroup || normalizeLabel(department.name) === normalizeLabel(selectedDepartmentGroup))
            .map((department) => String(department.id)),
        [peerDepartments, selectedDepartmentGroup],
    );
    const peerFilterPrograms = useMemo(
        () => uniqueByName(programs.filter((program) => (
            selectedDepartmentType === 'college'
            && (!matchingDepartmentIds.length || matchingDepartmentIds.includes(String(program.department_id)))
        ))),
        [matchingDepartmentIds, programs, selectedDepartmentType],
    );
    const peerFilterStrands = useMemo(
        () => uniqueByName(strands.filter((strand) => (
            selectedDepartmentType === 'shs'
            && (!matchingDepartmentIds.length || matchingDepartmentIds.includes(String(strand.department_id)))
        ))),
        [matchingDepartmentIds, selectedDepartmentType, strands],
    );
    const employeeFilterDepartments = useMemo(
        () => departments.filter((department) => (
            (!selectedFilterBranchId || String(department.branch_id) === selectedFilterBranchId)
            && Boolean(department.is_activated)
        )),
        [departments, selectedFilterBranchId],
    );
    const subjectBranches = subjectRatingContext?.branches ?? [];
    const subjectDepartments = subjectRatingContext?.departments ?? [];
    const subjectPrograms = subjectRatingContext?.programs ?? [];
    const subjectStrands = subjectRatingContext?.strands ?? [];
    const subjectSubjects = subjectRatingContext?.subjects ?? [];
    const subjectArchiveFolders = subjectArchiveContext?.folders ?? [];
    const selectedSubjectArchiveFolder = subjectArchiveContext?.selectedFolder ?? null;
    const peerArchiveFolders = peerArchiveContext?.folders ?? [];
    const selectedPeerArchiveFolder = peerArchiveContext?.selectedFolder ?? null;
    const headArchiveFolders = headArchiveContext?.folders ?? [];
    const selectedHeadArchiveFolder = headArchiveContext?.selectedFolder ?? null;
    const employeeArchiveFolders = employeeArchiveContext?.folders ?? [];
    const selectedEmployeeArchiveFolder = employeeArchiveContext?.selectedFolder ?? null;
    const selectedSubjectBranchId = String(subjectRatingContext?.selectedBranchId ?? filters.branch_id ?? '');
    const selectedSubjectDepartmentId = String(subjectRatingContext?.selectedDepartmentId ?? filters.department_id ?? '');
    const selectedSubjectProgramId = String(subjectRatingContext?.selectedProgramId ?? filters.program_id ?? '');
    const selectedSubjectStrandId = String(subjectRatingContext?.selectedStrandId ?? filters.strand_id ?? '');
    const subjectEducationType = subjectRatingContext?.educationType ?? 'college';

    useEffect(() => {
        if (filters.archive_mode || ratingType !== 'peer' || selectedDepartmentGroup || peerFilterDepartments.length === 0) {
            return;
        }

        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedFilterBranchId,
            department_group: peerFilterDepartments[0].name,
            program_group: '',
            strand_group: '',
            school_year: selectedYear,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    }, [
        activeRoute,
        filters,
        peerFilterDepartments,
        ratingType,
        selectedDepartmentGroup,
        selectedFilterBranchId,
        selectedYear,
    ]);

    const handleYearFilter = (year) => {
        setSelectedYear(year);
        router.get(route(activeRoute), { ...filters, school_year: year, page: 1 }, { preserveState: true, replace: true });
    };

    const handleSubjectBranchChange = (branchId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: branchId,
            department_id: '',
            program_id: '',
            strand_id: '',
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSubjectDepartmentChange = (departmentId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedSubjectBranchId,
            department_id: departmentId,
            program_id: '',
            strand_id: '',
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSubjectProgramChange = (programId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedSubjectBranchId,
            department_id: selectedSubjectDepartmentId,
            program_id: programId,
            strand_id: '',
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleSubjectStrandChange = (strandId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedSubjectBranchId,
            department_id: selectedSubjectDepartmentId,
            program_id: '',
            strand_id: strandId,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const openSubjectArchiveFolder = (folder) => {
        router.get(route('admin.subject-archives'), {
            archive_year_id: folder.id,
            branch_id: filters.branch_id ?? '',
            department_id: filters.department_id ?? '',
            program_id: filters.program_id ?? '',
            strand_id: filters.strand_id ?? '',
            search: filters.search ?? '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const backToSubjectArchiveFolders = () => {
        router.get(route('admin.subject-archives'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const openPeerArchiveFolder = (folder) => {
        router.get(route('admin.peer-archives'), {
            archive_year_id: folder.id,
            branch_id: filters.branch_id ?? '',
            department_group: filters.department_group ?? '',
            program_group: filters.program_group ?? '',
            strand_group: filters.strand_group ?? '',
            search: filters.search ?? '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const backToPeerArchiveFolders = () => {
        router.get(route('admin.peer-archives'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const openHeadArchiveFolder = (folder) => {
        router.get(route('admin.head-archives'), {
            archive_year_id: folder.id,
            search: filters.search ?? '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const backToHeadArchiveFolders = () => {
        router.get(route('admin.head-archives'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const openEmployeeArchiveFolder = (folder) => {
        router.get(route('admin.employee-archives'), {
            archive_year_id: folder.id,
            search: filters.search ?? '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const backToEmployeeArchiveFolders = () => {
        router.get(route('admin.employee-archives'), {}, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePeerDepartmentChange = (departmentGroup) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedFilterBranchId,
            department_group: departmentGroup,
            program_group: '',
            strand_group: '',
            school_year: selectedYear,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePeerProgramChange = (programGroup) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedFilterBranchId,
            department_group: selectedDepartmentGroup,
            program_group: programGroup,
            strand_group: '',
            school_year: selectedYear,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handlePeerStrandChange = (strandGroup) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedFilterBranchId,
            department_group: selectedDepartmentGroup,
            program_group: '',
            strand_group: strandGroup,
            school_year: selectedYear,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleRatingBranchChange = (branchId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: branchId,
            employee_department_id: '',
            school_year: selectedYear,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleEmployeeDepartmentChange = (employeeDepartmentId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: selectedFilterBranchId,
            employee_department_id: employeeDepartmentId,
            school_year: selectedYear,
            page: 1,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const openCommentsReview = (row) => {
        router.visit(route('admin.ratings.comments-review', {
            rating_type: ratingType,
            teacher_id: row.teacher_id ?? row.employee_id ?? '',
            subject_id: ratingType === 'subject' ? row.subject_id ?? '' : '',
            branch_id: ratingType === 'subject' ? selectedSubjectBranchId : selectedFilterBranchId,
            department_id: ratingType === 'subject' ? selectedSubjectDepartmentId : '',
            program_id: ratingType === 'subject' ? selectedSubjectProgramId : '',
            strand_id: ratingType === 'subject' ? selectedSubjectStrandId : '',
            department_group: ratingType === 'peer' ? selectedDepartmentGroup : '',
            program_group: ratingType === 'peer' ? selectedProgramGroup : '',
            strand_group: ratingType === 'peer' ? selectedStrandGroup : '',
            school_year: row.school_year ?? selectedYear ?? '',
        }));
    };

    const printRatingDetail = () => {
        printRatingReport(viewing, ratingType);
    };

    const exportUrl  = route(EXPORT_ROUTE_MAP[ratingType] ?? EXPORT_ROUTE_MAP.subject, {
        search: filters.search ?? '',
        school_year: selectedYear,
        branch_id: filters.branch_id ?? '',
        department_group: filters.department_group ?? '',
        program_group: filters.program_group ?? '',
        strand_group: filters.strand_group ?? '',
    });
    const summaryUrl = route('admin.reports.summary', { school_year: selectedYear });

    const askExport = () => setConfirmAction({
        kind:    'export',
        title:   'Export ratings as CSV?',
        message: `This will download a CSV of ${TITLE_MAP[ratingType]?.toLowerCase()} for ${selectedYear || 'all school years'}. Continue?`,
        confirm: 'Download CSV',
        tone:    'primary',
        run: () => { window.location.href = exportUrl; },
    });

    const askPrint = () => setConfirmAction({
        kind:    'print',
        title:   'Open printable summary?',
        message: `This opens a new tab with a printable HTML summary for ${selectedYear || 'all school years'} that you can save as PDF.`,
        confirm: 'Open Summary',
        tone:    'primary',
        run: () => { window.open(summaryUrl, '_blank', 'noopener,noreferrer'); },
    });

    const askPrintActiveTableRatings = () => setConfirmAction({
        kind:    'print',
        title:   'Print ratings as PDF?',
        message: 'This opens a printable ratings report in a new tab so you can save it as PDF.',
        confirm: 'Print PDF',
        tone:    'primary',
        run: () => printActiveTableRatings(),
    });

    const askPrintRatingDetail = () => setConfirmAction({
        kind:    'print',
        title:   'Print rating detail as PDF?',
        message: 'This opens a printable detail report in a new tab so you can save it as PDF.',
        confirm: 'Print PDF',
        tone:    'primary',
        run: () => printRatingDetail(),
    });

    const handleConfirm = () => {
        confirmAction?.run?.();
        setConfirmAction(null);
    };

    const isSubjectRatings = ratingType === 'subject' && subjectRatingContext;
    const isSubjectArchive = ratingType === 'subject' && filters.archive_mode;
    const isPeerArchive = ratingType === 'peer' && filters.archive_mode;
    const isHeadArchive = ratingType === 'head' && filters.archive_mode;
    const isEmployeeArchive = ratingType === 'employee' && filters.archive_mode;
    const archiveTitle = isSubjectArchive
        ? 'Subject Evaluation Archive'
        : isPeerArchive
            ? 'Peer Evaluation Archive'
            : isHeadArchive
                ? 'School Heads Evaluation Archive'
            : isEmployeeArchive
                ? 'Employee Evaluation Archive'
            : TITLE_MAP[ratingType];
    const selectedArchiveFolder = selectedSubjectArchiveFolder ?? selectedPeerArchiveFolder ?? selectedHeadArchiveFolder ?? selectedEmployeeArchiveFolder;
    const activeTableRatings = useMemo(() => {
        if (isSubjectRatings) {
            return subjectSubjects.flatMap((subject) => {
                const teachers = subject.teachers?.length ? subject.teachers : [];

                return teachers
                    .filter((teacher) => teacher.overall_rating != null)
                    .map((teacher) => ({
                        ...teacher,
                        subject_name: subject.name,
                        subject_code: subject.code,
                        program_name: subject.program_name,
                        strand_name: subject.strand_name,
                    }));
            });
        }

        return (ratings?.data ?? []).filter((rating) => rating.overall_rating != null);
    }, [isSubjectRatings, ratings?.data, subjectSubjects]);
    const hasActiveTableRatings = activeTableRatings.length > 0;
    const canReleaseDepartmentRatings = ['subject', 'peer'].includes(ratingType)
        && !filters.archive_mode
        && hasActiveTableRatings;
    const releaseDepartmentRatings = () => {
        router.post(route('admin.ratings.release-department'), {
            rating_type: ratingType,
            school_year: selectedYear,
            branch_id: isSubjectRatings ? selectedSubjectBranchId : selectedFilterBranchId,
            department_id: isSubjectRatings ? selectedSubjectDepartmentId : '',
            program_id: isSubjectRatings ? selectedSubjectProgramId : '',
            strand_id: isSubjectRatings ? selectedSubjectStrandId : '',
            department_group: ratingType === 'peer' ? selectedDepartmentGroup : '',
            program_group: ratingType === 'peer' ? selectedProgramGroup : '',
            strand_group: ratingType === 'peer' ? selectedStrandGroup : '',
        }, {
            preserveScroll: true,
        });
    };
    const askReleaseDepartmentRatings = () => setConfirmAction({
        kind: 'release',
        title: 'Release department ratings?',
        message: `This will make ${activeTableRatings.length} ${ratingType === 'subject' ? 'subject' : 'peer'} rating${activeTableRatings.length === 1 ? '' : 's'} visible in the selected department teacher portals.`,
        confirm: 'Release Ratings',
        tone: 'success',
        run: () => releaseDepartmentRatings(),
    });
    const printActiveTableRatings = () => {
        printRatingsReport(
            activeTableRatings,
            ratingType,
            `${TITLE_MAP[ratingType] ?? 'Ratings'} - Active Table`,
            {
                report: 'ratings-table',
                school_year: selectedYear || selectedArchiveFolder?.label || '',
            },
        );
    };
    const subjectToolbarFilter = isSubjectRatings && (subjectEducationType === 'college' || subjectEducationType === 'shs') ? (
        <>
            {subjectEducationType === 'college' && subjectPrograms.length > 0 && (
                <select
                    value={selectedSubjectProgramId}
                    onChange={(e) => handleSubjectProgramChange(e.target.value)}
                    className="min-w-[260px] rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    {subjectPrograms.map((program) => (
                        <option key={program.id} value={program.id}>{program.name}</option>
                    ))}
                </select>
            )}

            {subjectEducationType === 'shs' && subjectStrands.length > 0 && (
                <select
                    value={selectedSubjectStrandId}
                    onChange={(e) => handleSubjectStrandChange(e.target.value)}
                    className="min-w-[260px] rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    {subjectStrands.map((strand) => (
                        <option key={strand.id} value={strand.id}>{strand.name}</option>
                    ))}
                </select>
            )}
        </>
    ) : null;
    const peerToolbarFilter = ratingType === 'peer' && !isPeerArchive && (selectedDepartmentType === 'college' || selectedDepartmentType === 'shs') ? (
        <>
            {selectedDepartmentType === 'college' && (
                <select
                    value={selectedProgramGroup}
                    onChange={(e) => handlePeerProgramChange(e.target.value)}
                    className="min-w-[260px] rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">All Programs</option>
                    {peerFilterPrograms.map((program) => (
                        <option key={program.name} value={program.name}>{program.name}</option>
                    ))}
                </select>
            )}

            {selectedDepartmentType === 'shs' && (
                <select
                    value={selectedStrandGroup}
                    onChange={(e) => handlePeerStrandChange(e.target.value)}
                    className="min-w-[260px] rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    <option value="">All Strands</option>
                    {peerFilterStrands.map((strand) => (
                        <option key={strand.name} value={strand.name}>{strand.name}</option>
                    ))}
                </select>
            )}
        </>
    ) : null;
    const employeeToolbarFilter = ratingType === 'employee' && !isEmployeeArchive && employeeFilterDepartments.length > 0 ? (
        <select
            value={selectedEmployeeDepartmentId}
            onChange={(e) => handleEmployeeDepartmentChange(e.target.value)}
            className="min-w-[260px] rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
            <option value="">All Departments</option>
            {employeeFilterDepartments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
            ))}
        </select>
    ) : null;

    return (
        <AdminLayout title={archiveTitle} activeRoute={activeRoute} breadcrumbs={['Ratings & Reports']}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">
                        {archiveTitle}
                    </h2>
                    <p className="text-sm text-slate-500">
                        {isSubjectArchive && selectedSubjectArchiveFolder
                            ? `Archived subject ratings for ${selectedSubjectArchiveFolder.label}.`
                            : isPeerArchive && selectedPeerArchiveFolder
                                ? `Archived peer ratings for ${selectedPeerArchiveFolder.label}.`
                                : isHeadArchive && selectedHeadArchiveFolder
                                    ? `Archived school heads ratings for ${selectedHeadArchiveFolder.label}.`
                                : isEmployeeArchive && selectedEmployeeArchiveFolder
                                    ? `Archived employee ratings for ${selectedEmployeeArchiveFolder.label}.`
                                : isEmployeeArchive
                                    ? 'Open a past academic year and term folder to view archived employee ratings.'
                                : isHeadArchive
                                    ? 'Open a past academic year and term folder to view archived school heads ratings.'
                                : isPeerArchive
                                    ? 'Open a past academic year and term folder to view archived peer ratings.'
                            : isSubjectArchive
                                ? 'Open a past academic year and term folder to view archived subject ratings.'
                                : `View and monitor ${ratingType} evaluation results.`}
                    </p>
                </div>
                {((!isSubjectArchive && !isPeerArchive && !isHeadArchive && !isEmployeeArchive) || selectedArchiveFolder) && (
                <div className="flex flex-wrap items-center gap-2">
                    {canReleaseDepartmentRatings && (
                        <button
                            type="button"
                            onClick={askReleaseDepartmentRatings}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <path d="m9 11 3 3L22 4" />
                            </svg>
                            Release Department Ratings
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={askPrintActiveTableRatings}
                        disabled={!hasActiveTableRatings}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
                        Print as PDF
                    </button>
                </div>
                )}
            </div>

            {(isSubjectArchive || isPeerArchive || isHeadArchive || isEmployeeArchive) && selectedArchiveFolder && (
                <div className="mb-4">
                    <button
                        type="button"
                        onClick={isEmployeeArchive ? backToEmployeeArchiveFolders : isHeadArchive ? backToHeadArchiveFolders : isPeerArchive ? backToPeerArchiveFolders : backToSubjectArchiveFolders}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        Back to Academic Years
                    </button>
                </div>
            )}

            {isSubjectArchive && !selectedSubjectArchiveFolder ? (
                <EvaluationArchiveFolders
                    folders={subjectArchiveFolders}
                    onOpenFolder={openSubjectArchiveFolder}
                    emptyMessage="No past subject evaluation archives found."
                    recordLabel="subject"
                />
            ) : isPeerArchive && !selectedPeerArchiveFolder ? (
                <EvaluationArchiveFolders
                    folders={peerArchiveFolders}
                    onOpenFolder={openPeerArchiveFolder}
                    emptyMessage="No past peer evaluation archives found."
                    recordLabel="peer rating"
                />
            ) : isHeadArchive && !selectedHeadArchiveFolder ? (
                <EvaluationArchiveFolders
                    folders={headArchiveFolders}
                    onOpenFolder={openHeadArchiveFolder}
                    emptyMessage="No past school heads evaluation archives found."
                    recordLabel="school head rating"
                />
            ) : isEmployeeArchive && !selectedEmployeeArchiveFolder ? (
                <EvaluationArchiveFolders
                    folders={employeeArchiveFolders}
                    onOpenFolder={openEmployeeArchiveFolder}
                    emptyMessage="No past employee evaluation archives found."
                    recordLabel="employee rating"
                />
            ) : isSubjectRatings && (
                <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-[240px]">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Branch
                            </label>
                            <select
                                value={selectedSubjectBranchId}
                                onChange={(e) => handleSubjectBranchChange(e.target.value)}
                                disabled={Boolean(subjectRatingContext?.scopedBranchId)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                            >
                                {subjectBranches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {subjectDepartments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {subjectDepartments.map((department) => (
                                <button
                                    key={department.id}
                                    type="button"
                                    onClick={() => handleSubjectDepartmentChange(department.id)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${String(department.id) === selectedSubjectDepartmentId ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                                >
                                    {department.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {ratingType === 'peer' && (
                <div className="mb-4 space-y-3">
                    {peerFilterDepartments.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            {peerFilterDepartments.map((department) => (
                                <button
                                    key={department.name}
                                    type="button"
                                    onClick={() => handlePeerDepartmentChange(department.name)}
                                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${normalizeLabel(selectedDepartmentGroup) === normalizeLabel(department.name) ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                                >
                                    {department.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {['employee', 'head'].includes(ratingType) && !filters.archive_mode && branches.length > 0 && (
                <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div className="min-w-[240px]">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Branch
                            </label>
                            <select
                                value={selectedFilterBranchId}
                                onChange={(e) => handleRatingBranchChange(e.target.value)}
                                disabled={isBranchAdmin}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                            >
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                </div>
            )}

            {(isSubjectArchive && !selectedSubjectArchiveFolder) || (isPeerArchive && !selectedPeerArchiveFolder) || (isHeadArchive && !selectedHeadArchiveFolder) || (isEmployeeArchive && !selectedEmployeeArchiveFolder) ? null : isSubjectRatings ? (
                <SubjectRatingsList subjects={subjectSubjects} onTeacherClick={openView} onReviewComments={openCommentsReview} toolbarFilter={subjectToolbarFilter} />
            ) : (
                <ResourceTable
                    columns={columns}
                    data={ratings}
                    filters={{ ...filters, school_year: selectedYear }}
                    routeName={activeRoute}
                    searchPlaceholder={
                        ratingType === 'peer'
                            ? 'Search teachers...'
                            : ratingType === 'employee'
                                ? 'Search employees...'
                                : ratingType === 'head'
                                    ? 'Search school heads...'
                                    : 'Search ratings...'
                    }
                    onRowClick={openView}
                    rowActions={(row) => (
                        <div className="flex flex-wrap justify-end gap-2">
                            {ratingType === 'peer' && row.overall_rating != null && (
                                <button
                                    type="button"
                                    onClick={() => openCommentsReview(row)}
                                    className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                                >
                                    Review Comments
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => openView(row)}
                                className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                                View
                            </button>
                        </div>
                    )}
                    extraHeaderActions={ratingType === 'peer' ? peerToolbarFilter : ratingType === 'employee' ? employeeToolbarFilter : null}
                    showPageIndicator={!['peer', 'employee', 'head'].includes(ratingType)}
                />
            )}

            <Modal show={detailOpen} maxWidth="5xl" onClose={() => setDetailOpen(false)}>
                {viewing && (
                    <div className="max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                                    {ratingType === 'subject' ? 'Subject Rating Report' : 'Rating Information'}
                                </p>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                    {viewing.subject_name ?? viewing.teacher_name ?? 'Rating Information'}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {[viewing.subject_code, viewing.teacher_name, viewing.school_year, viewing.semester].filter(Boolean).join(' - ') || 'Evaluation rating details'}
                                </p>
                            </div>
                            <div className="flex shrink-0 flex-wrap justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={askPrintRatingDetail}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    Print as PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetailOpen(false)}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                    aria-label="Close rating information"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="space-y-6 px-6 py-5">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {ratingType === 'subject' && (
                                <>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.subject_name ?? '-'}</p></div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Semester</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.semester ?? '-'}</p></div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responses</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.submission_count ?? 0}</p></div>
                                </>
                            )}
                            {ratingType === 'peer' && (
                                <>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.department_name ?? '-'}</p></div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program / Strand</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.program_name ?? viewing.strand_name ?? '-'}</p></div>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responses</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.submission_count ?? 0}</p></div>
                                </>
                            )}
                            {ratingType === 'employee' && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                            )}
                            {ratingType === 'head' && (
                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Head</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                            )}
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Rating</p>
                                <p className="mt-1 text-sm font-semibold text-blue-700">
                                    {viewing.overall_rating
                                        ? `${Number(viewing.overall_rating).toFixed(2)} (${ratingPercentage(viewing.overall_rating)?.toFixed(2)}%)`
                                        : '-'}
                                </p>
                            </div>
                            {['subject', 'peer'].includes(ratingType) && (
                                <div className={`rounded-lg border p-3 ${viewing.is_released ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher Portal</p>
                                    <p className={`mt-1 text-sm font-semibold ${viewing.is_released ? 'text-emerald-700' : 'text-amber-700'}`}>
                                        {viewing.is_released ? 'Released' : 'Pending admin release'}
                                    </p>
                                </div>
                            )}
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Year</p><p className="mt-1 text-sm font-semibold text-slate-900">{viewing.school_year ?? '-'}</p></div>
                        </div>

                        {ratingType !== 'branch' && (viewing.questionnaire || ratingQuestionGroups(viewing).length > 0) && (
                            <div className="space-y-4">
                                {viewing.questionnaire && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questionnaire</p>
                                    <p className="mt-1 text-sm font-semibold text-slate-900">
                                        {viewing.questionnaire.title ?? '-'}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-600">
                                        {viewing.questionnaire.questionnaire_code ?? '-'} • {viewing.questionnaire.questionnaire_type_name ?? '-'}
                                    </p>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {viewing.questionnaire.notes ?? 'No notes provided.'}
                                    </p>
                                </div>
                                )}

                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                                    {ratingQuestionGroups(viewing).length > 0 ? (
                                        <div className="mt-3 space-y-4">
                                            {ratingQuestionGroups(viewing).map((group, groupIndex) => (
                                                <div key={`${group.class_name}-${groupIndex}`} className="rounded-lg border border-slate-200 bg-white p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-slate-900">{group.class_name || `Class ${groupIndex + 1}`}</p>
                                                        <div className="text-right">
                                                            <p className="text-xs font-medium text-slate-500">
                                                                {group.weight_percentage != null ? `${group.weight_percentage}%` : 'No weight'}
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-blue-700">
                                                                Value Rating: {classAverage(normalizedQuestionRatings(viewing), group.questions) != null
                                                                    ? Number(classAverage(normalizedQuestionRatings(viewing), group.questions)).toFixed(2)
                                                                    : '-'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {Array.isArray(group.questions) && group.questions.length > 0 ? (
                                                        <div className="mt-3 space-y-2">
                                                            {group.questions.map((question, questionIndex) => (
                                                                <div key={`${question.question_id}-${questionIndex}`} className="rounded-md bg-slate-50 px-3 py-2">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <p className="text-sm text-slate-700">
                                                                            {question.description || `Question #${question.question_id}`}
                                                                        </p>
                                                                        <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                                            {formatQuestionAverage(normalizedQuestionRatings(viewing), question.question_id)}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-3 text-sm text-slate-500">No item questions in this class.</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-sm text-slate-500">No questionnaire items found.</p>
                                    )}
                                </div>

                                {viewing.questionnaire && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
                                    {Array.isArray(viewing.questionnaire.comment_section) && viewing.questionnaire.comment_section.length > 0 ? (
                                        <div className="mt-3 space-y-2">
                                            {viewing.questionnaire.comment_section.map((question, index) => (
                                                <div key={`comment-section-${question.question_id}-${index}`} className="rounded-md bg-white px-3 py-2 text-sm text-slate-700">
                                                    {question.description || `Question #${question.question_id}`}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="mt-1 text-sm text-slate-500">No comment questions found.</p>
                                    )}
                                </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDetailOpen(false)}
                                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    </div>
                )}
            </Modal>

            <ConfirmDialog
                open={Boolean(confirmAction)}
                title={confirmAction?.title}
                message={confirmAction?.message}
                confirmLabel={confirmAction?.confirm}
                tone={confirmAction?.tone ?? 'primary'}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </AdminLayout>
    );
}
