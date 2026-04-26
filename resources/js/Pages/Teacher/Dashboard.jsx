import AppIcon from '@/Components/AppIcon';
import ConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import PortalLayout from '@/Layouts/PortalLayout';
import { router } from '@inertiajs/react';
import { Fragment, useEffect, useState } from 'react';

const SECTION_TITLES = {
    faculty_peer_evaluation: 'Faculty Peer Evaluation',
    school_heads_evaluation: 'School Heads Evaluation',
    employee_evaluation: 'Employee Evaluation',
    my_subject_ratings: 'My Subject Ratings',
    peer_ratings: 'Peer Ratings',
    submissions: 'Evaluation Submissions',
    archives: 'Archives',
};

const CATEGORY_LABELS = {
    peer_teacher: 'Faculty Peer Evaluation',
    head_teacher: 'School Heads Evaluation',
    employee_evaluation: 'Employee Evaluation',
};

const SUBMISSION_TABS = [
    { key: 'peer_teacher', label: 'Peer-to-Peer', icon: 'peer' },
    { key: 'head_teacher', label: 'School Head', icon: 'school' },
    { key: 'employee_evaluation', label: 'Employee Feedback', icon: 'briefcase' },
];

const formatRating = (value) => (
    value !== null && value !== undefined && value !== '' ? Number(value).toFixed(2) : '-'
);

const formatPercentage = (value) => (
    value !== null && value !== undefined && value !== '' ? `${Number(value).toFixed(2)}%` : '-'
);

const formatDate = (value) => {
    if (!value) return '-';

    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function printSubjectRatingReport(subject) {
    if (!subject) return;

    const questions = subject.questions ?? [];
    const classRatings = subject.class_ratings ?? [];
    const classRatingMap = new Map(classRatings.map((rating) => [rating.class_name || 'Uncategorized', rating]));
    let previousClass = '';

    const questionRows = questions.map((question, index) => {
        const currentClass = question.class_name || '';
        const classRating = classRatingMap.get(currentClass || 'Uncategorized');
        const showClass = currentClass && currentClass !== previousClass;
        previousClass = currentClass;

        return `
            ${showClass ? `
                <tr class="class-row">
                    <td colspan="5">
                        <strong>${escapeHtml(currentClass)}</strong>
                        ${question.weight_percentage != null ? `<span>${escapeHtml(question.weight_percentage)}%</span>` : ''}
                        <span>Class Rating: ${formatRating(classRating?.average)}</span>
                        <span>Percentage: ${formatPercentage(classRating?.percentage)}</span>
                    </td>
                </tr>
            ` : ''}
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(question.question_text)}</td>
                <td>${formatRating(question.average)}</td>
                <td>${question.average !== null && question.average !== undefined ? `${((Number(question.average) / 5) * 100).toFixed(2)}%` : '-'}</td>
                <td>${Number(question.count ?? 0)}</td>
            </tr>
        `;
    }).join('');

    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    reportWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(subject.course_name)} Rating Report</title>
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
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        .box { break-inside: avoid; }
                        tr { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                <div class="header">
                    <div class="eyebrow">Subject Rating Report</div>
                    <h1>${escapeHtml(subject.course_name)}</h1>
                    <div class="muted">${escapeHtml(subject.course_code || 'Subject')} ${subject.scope_label ? `- ${escapeHtml(subject.scope_label)}` : ''}</div>
                    <div class="muted">${escapeHtml(subject.school_year || 'Current year')} - ${escapeHtml(subject.semester || 'Current term')}</div>
                </div>
                <div class="summary">
                    <div class="box"><div class="box-label">Overall Rating</div><div class="box-value">${formatRating(subject.overall_rating)}</div></div>
                    <div class="box"><div class="box-label">Percentage</div><div class="box-value">${formatPercentage(subject.overall_percentage)}</div></div>
                    <div class="box"><div class="box-label">Submissions</div><div class="box-value">${Number(subject.submission_count ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Classes</div><div class="box-value">${classRatings.length}</div></div>
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
                        ${questionRows || '<tr><td colspan="5">No questionnaire ratings are available for this subject yet.</td></tr>'}
                    </tbody>
                </table>
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

function printAllSubjectRatingsReport(subjects = [], cycle = null) {
    const ratedSubjects = subjects.filter((subject) => (
        Number(subject.submission_count ?? 0) > 0
        && subject.overall_rating !== null
        && subject.overall_rating !== undefined
    ));

    if (!ratedSubjects.length) return;

    const subjectSections = ratedSubjects.map((subject, subjectIndex) => {
        const questions = subject.questions ?? [];
        const classRatings = subject.class_ratings ?? [];
        const classRatingMap = new Map(classRatings.map((rating) => [rating.class_name || 'Uncategorized', rating]));
        let previousClass = '';

        const questionRows = questions.map((question, index) => {
            const currentClass = question.class_name || '';
            const classRating = classRatingMap.get(currentClass || 'Uncategorized');
            const showClass = currentClass && currentClass !== previousClass;
            previousClass = currentClass;

            return `
                ${showClass ? `
                    <tr class="class-row">
                        <td colspan="5">
                            <strong>${escapeHtml(currentClass)}</strong>
                            ${question.weight_percentage != null ? `<span>${escapeHtml(question.weight_percentage)}%</span>` : ''}
                            <span>Class Rating: ${formatRating(classRating?.average)}</span>
                            <span>Percentage: ${formatPercentage(classRating?.percentage)}</span>
                        </td>
                    </tr>
                ` : ''}
                <tr>
                    <td>${index + 1}</td>
                    <td>${escapeHtml(question.question_text)}</td>
                    <td>${formatRating(question.average)}</td>
                    <td>${question.average !== null && question.average !== undefined ? `${((Number(question.average) / 5) * 100).toFixed(2)}%` : '-'}</td>
                    <td>${Number(question.count ?? 0)}</td>
                </tr>
            `;
        }).join('');

        return `
            <section class="subject">
                <div class="subject-heading">
                    <div>
                        <div class="eyebrow">Subject ${subjectIndex + 1}</div>
                        <h2>${escapeHtml(subject.course_name)}</h2>
                        <div class="muted">${escapeHtml([subject.course_code, subject.scope_label].filter(Boolean).join(' - ') || 'Subject')}</div>
                    </div>
                    <div class="rating">${formatRating(subject.overall_rating)}</div>
                </div>
                <div class="summary">
                    <div class="box"><div class="box-label">School Year</div><div class="box-value">${escapeHtml(subject.school_year || cycle?.school_year || '-')}</div></div>
                    <div class="box"><div class="box-label">Semester</div><div class="box-value">${escapeHtml(subject.semester || cycle?.semester || '-')}</div></div>
                    <div class="box"><div class="box-label">Submissions</div><div class="box-value">${escapeHtml(subject.submission_count ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Percentage</div><div class="box-value">${formatPercentage(subject.overall_percentage ?? (Number(subject.overall_rating) / 5) * 100)}</div></div>
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
                        ${questionRows || '<tr><td colspan="5">No questionnaire ratings are available for this subject yet.</td></tr>'}
                    </tbody>
                </table>
            </section>
        `;
    }).join('');

    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    reportWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>My Subject Ratings</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
                    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
                    .eyebrow { color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 24px; margin: 8px 0 4px; }
                    h2 { font-size: 18px; margin: 4px 0; }
                    .muted { color: #64748b; font-size: 13px; }
                    .subject { margin-top: 24px; padding-top: 18px; border-top: 1px solid #cbd5e1; break-inside: avoid; }
                    .subject-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
                    .rating { border: 1px solid #bfdbfe; border-radius: 8px; color: #1d4ed8; font-size: 20px; font-weight: 800; padding: 10px 14px; }
                    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0 4px; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
                    .box-label { color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
                    .box-value { font-size: 15px; font-weight: 800; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
                    th { background: #eff6ff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #334155; }
                    .class-row td { background: #f8fafc; font-size: 12px; color: #334155; }
                    .class-row span { margin-left: 12px; color: #475569; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        tr, .box { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                <div class="header">
                    <div class="eyebrow">My Subject Ratings</div>
                    <h1>Subject Ratings Report</h1>
                    <div class="muted">${escapeHtml(cycle ? `${cycle.school_year} - ${cycle.semester}` : 'Current evaluation cycle')}</div>
                    <div class="muted">${ratedSubjects.length} rated subject${ratedSubjects.length === 1 ? '' : 's'} included</div>
                </div>
                ${subjectSections}
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

function printPeerRatingReport(group) {
    if (!group) return;

    let previousClass = '';
    const questionRows = (group.questions ?? []).map((question, index) => {
        const currentClass = question.class_name || '';
        const showClass = currentClass && currentClass !== previousClass;
        previousClass = currentClass;

        return `
            ${showClass ? `
                <tr class="class-row">
                    <td colspan="5">
                        <strong>${escapeHtml(currentClass)}</strong>
                        ${question.weight_percentage != null ? `<span>${escapeHtml(question.weight_percentage)}%</span>` : ''}
                    </td>
                </tr>
            ` : ''}
            <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(question.question_text)}</td>
                <td>${formatRating(question.average)}</td>
                <td>${question.average !== null && question.average !== undefined ? `${((Number(question.average) / 5) * 100).toFixed(2)}%` : '-'}</td>
                <td>${Number(question.count ?? 0)}</td>
            </tr>
        `;
    }).join('');

    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    reportWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(group.label)} Peer Ratings</title>
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
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        .box { break-inside: avoid; }
                        tr { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                <div class="header">
                    <div class="eyebrow">Peer Rating Report</div>
                    <h1>${escapeHtml(group.label)}</h1>
                    <div class="muted">Faculty Peer Evaluation</div>
                </div>
                <div class="summary">
                    <div class="box"><div class="box-label">Overall Rating</div><div class="box-value">${formatRating(group.overall_rating)}</div></div>
                    <div class="box"><div class="box-label">Percentage</div><div class="box-value">${formatPercentage(group.overall_percentage)}</div></div>
                    <div class="box"><div class="box-label">Submissions</div><div class="box-value">${Number(group.submission_count ?? 0)}</div></div>
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
                        ${questionRows || '<tr><td colspan="5">No peer ratings are available yet.</td></tr>'}
                    </tbody>
                </table>
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

function printRatingsFolderTableReport({ rows = [], type, period }) {
    if (!rows.length) return;

    const label = type === 'subject' ? 'My Subject Ratings' : 'Peer Ratings';
    const itemHeading = type === 'subject' ? 'Subject' : 'Peer Rating Type';
    const files = rows.map((row, index) => {
        const questionRows = (row.questions ?? []).map((question, questionIndex) => `
            <tr>
                <td>${questionIndex + 1}</td>
                <td>${escapeHtml(question.question_text)}</td>
                <td>${escapeHtml(formatRating(question.rating ?? question.average))}</td>
                <td>${escapeHtml(question.count ?? 0)}</td>
            </tr>
        `).join('');

        return `
            <section class="file">
                <div class="file-heading">
                    <div>
                        <div class="eyebrow">File ${index + 1}</div>
                        <h2>${escapeHtml(type === 'subject' ? row.subject : row.scope)}</h2>
                        ${type === 'subject' && row.code ? `<div class="muted">${escapeHtml(row.code)}</div>` : ''}
                    </div>
                    <div class="rating">${escapeHtml(formatRating(row.rating))}</div>
                </div>
                <div class="summary">
                    <div class="box"><div class="box-label">Submissions</div><div class="box-value">${escapeHtml(row.submission_count ?? 0)}</div></div>
                    <div class="box"><div class="box-label">Rating</div><div class="box-value">${escapeHtml(formatRating(row.rating))}</div></div>
                    <div class="box"><div class="box-label">Percentage</div><div class="box-value">${escapeHtml(formatPercentage(row.percentage))}</div></div>
                    <div class="box"><div class="box-label">Latest</div><div class="box-value">${escapeHtml(formatDate(row.latest_submitted_at))}</div></div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width:52px;">#</th>
                            <th>Question</th>
                            <th style="width:110px;">Rating</th>
                            <th style="width:110px;">Responses</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${questionRows || '<tr><td colspan="4">No question-level rating details are available.</td></tr>'}
                    </tbody>
                </table>
            </section>
        `;
    }).join('');

    const reportWindow = window.open('', '_blank', 'width=960,height=720');

    if (!reportWindow) return;

    reportWindow.document.write(`
        <!doctype html>
        <html>
            <head>
                <title>${escapeHtml(label)} - ${escapeHtml(period)}</title>
                <style>
                    * { box-sizing: border-box; }
                    body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
                    .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 16px; margin-bottom: 20px; }
                    .eyebrow { color: #2563eb; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
                    h1 { font-size: 24px; margin: 8px 0 4px; }
                    h2 { font-size: 18px; margin: 4px 0; }
                    .muted { color: #64748b; font-size: 13px; }
                    .file { margin-top: 24px; padding-top: 18px; border-top: 1px solid #cbd5e1; break-inside: avoid; }
                    .file-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
                    .rating { border: 1px solid #bfdbfe; border-radius: 8px; color: #1d4ed8; font-size: 20px; font-weight: 800; padding: 10px 14px; }
                    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 14px 0 4px; }
                    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
                    .box-label { color: #64748b; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
                    .box-value { font-size: 15px; font-weight: 800; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
                    th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; vertical-align: top; font-size: 13px; }
                    th { background: #eff6ff; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #334155; }
                    @media print {
                        body { margin: 18mm; }
                        .no-print { display: none; }
                        tr, .box { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
                <div class="header">
                    <div class="eyebrow">Ratings File Folder</div>
                    <h1>${escapeHtml(label)}</h1>
                    <div class="muted">${escapeHtml(period || '')}</div>
                    <div class="muted">${rows.length} ${escapeHtml(itemHeading.toLowerCase())}${rows.length === 1 ? '' : 's'} included</div>
                </div>
                ${files}
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

function EmptyState({ icon = 'teachers', message }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                <AppIcon name={icon} className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">{message}</p>
        </div>
    );
}

function FacultyPeerEvaluationTab({ targets = [], onStartEvaluation }) {
    const orderedTargets = [...targets].sort((a, b) => {
        if (a.done !== b.done) {
            return Number(a.done) - Number(b.done);
        }

        return (a.name ?? '').localeCompare(b.name ?? '');
    });

    if (!orderedTargets.length) {
        return <EmptyState icon="peer" message="No co-teacher evaluations are available in your assigned scope right now." />;
    }

    return (
        <div className="space-y-4">
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Faculty List ({orderedTargets.length})</p>
                <div className="space-y-2">
                    {orderedTargets.map((target) => (
                        <div
                            key={target.id}
                            className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-sm ${
                                target.done ? 'border-slate-100' : 'border-slate-200'
                            }`}
                        >
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                                <AppIcon name={target.done ? 'check-circle' : 'teachers'} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-semibold text-slate-800">{target.name}</p>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                                            target.done
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                : 'bg-slate-100 text-slate-700 ring-slate-200'
                                        }`}
                                    >
                                        {target.done ? 'Submitted' : 'Pending'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-400">
                                    {target.role}
                                    {target.scope ? ` · ${target.scope}` : ''}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {target.questionnaire_id && (
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                            Questionnaire ID: {target.questionnaire_code || target.questionnaire_id}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
                                        {target.questionnaire_title || 'No assigned questionnaire'}
                                    </span>
                                    {!target.questionnaire_id && (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                            Assignment needed
                                        </span>
                                    )}
                                </div>
                            </div>
                            {target.done ? (
                                <button
                                    type="button"
                                    onClick={() => onStartEvaluation?.(target)}
                                    disabled={!target.questionnaire_id}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                    View
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onStartEvaluation?.(target)}
                                    disabled={!target.questionnaire_id}
                                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    Start Evaluation
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SchoolHeadsEvaluationTab({ targets = [], onStartEvaluation }) {
    const orderedTargets = [...targets].sort((a, b) => {
        if (a.done !== b.done) {
            return Number(a.done) - Number(b.done);
        }

        return (a.name ?? '').localeCompare(b.name ?? '');
    });
    const scopedTargets = orderedTargets.filter((target) => target.scoped);
    const otherTargets = orderedTargets.filter((target) => !target.scoped);

    if (!orderedTargets.length) {
        return <EmptyState icon="school" message="No school head evaluations are assigned to your account right now." />;
    }

    function renderTarget(target) {
        return (
            <div
                key={target.id}
                className={`flex items-start gap-2.5 rounded-xl border bg-white p-3 shadow-sm ${
                    target.done ? 'border-slate-100' : 'border-slate-200'
                }`}
            >
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <AppIcon name={target.done ? 'check-circle' : 'school'} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-800">{target.name}</p>
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                                target.done
                                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                    : 'bg-slate-100 text-slate-700 ring-slate-200'
                            }`}
                        >
                            {target.done ? 'Submitted' : 'Pending'}
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${
                                target.scoped
                                    ? 'bg-blue-50 text-blue-700 ring-blue-200'
                                    : 'bg-slate-100 text-slate-600 ring-slate-200'
                            }`}
                        >
                            {target.scoped ? 'Scoped' : 'Other'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400">
                        {target.role}
                        {target.scope ? ` · ${target.scope}` : ''}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {target.questionnaire_id && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                Questionnaire ID: {target.questionnaire_code || target.questionnaire_id}
                            </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                            {target.questionnaire_title || 'No assigned questionnaire'}
                        </span>
                        {!target.questionnaire_id && (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                Assignment needed
                            </span>
                        )}
                    </div>
                </div>
                {target.done ? (
                    <button
                        type="button"
                        onClick={() => onStartEvaluation?.(target)}
                        disabled={!target.questionnaire_id}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                        View
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => onStartEvaluation?.(target)}
                        disabled={!target.questionnaire_id}
                        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                        Start Evaluation
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {scopedTargets.length > 0 && (
                <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Scoped Program Chairs ({scopedTargets.length})</p>
                    <div className="space-y-2">
                        {scopedTargets.map(renderTarget)}
                    </div>
                </div>
            )}
            {otherTargets.length > 0 && (
                <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Other Program Chairs ({otherTargets.length})</p>
                    <div className="space-y-2">
                        {otherTargets.map(renderTarget)}
                    </div>
                </div>
            )}
        </div>
    );
}

function EmployeeEvaluationTab({ employees = [], branchName, onStartEvaluation }) {
    const groupedEmployees = employees.reduce((groups, employee) => {
        const key = employee.employee_department_name || 'Unassigned Department';

        if (!groups[key]) {
            groups[key] = [];
        }

        groups[key].push(employee);
        return groups;
    }, {});
    const departmentGroups = Object.entries(groupedEmployees).sort(([a], [b]) => a.localeCompare(b));

    if (!employees.length) {
        return <EmptyState icon="briefcase" message="No active employees are available in your assigned branch right now." />;
    }

    return (
        <div className="space-y-4">
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Branch Employees ({employees.length})
                </p>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    Assigned branch: <span className="font-semibold text-slate-800">{branchName || 'Current branch'}</span>
                </div>
            </div>

            {departmentGroups.map(([departmentName, departmentEmployees]) => (
                <div key={departmentName}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{departmentName}</p>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            {departmentEmployees.length}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {departmentEmployees.map((employee) => (
                            <div
                                key={employee.id}
                                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                            >
                                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                                    <AppIcon name="briefcase" className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-800">{employee.name || '-'}</p>
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                            {employee.code || 'No code'}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        {employee.role || 'Employee'}
                                        {employee.email ? ` - ${employee.email}` : ''}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {employee.questionnaire_id && (
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                                Questionnaire ID: {employee.questionnaire_code || employee.questionnaire_id}
                                            </span>
                                        )}
                                        <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200">
                                            {employee.questionnaire_title || 'No assigned questionnaire'}
                                        </span>
                                        {!employee.questionnaire_id && (
                                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                                                Assignment needed
                                            </span>
                                        )}
                                        {employee.done && (
                                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                                Submitted
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {employee.done ? (
                                    <button
                                        type="button"
                                        onClick={() => onStartEvaluation?.(employee)}
                                        disabled={!employee.questionnaire_id}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        View
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => onStartEvaluation?.(employee)}
                                        disabled={!employee.questionnaire_id}
                                        className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        Start Evaluation
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function SubjectRatingModal({ subject, open, onClose }) {
    const questions = subject?.questions ?? [];
    const classRatings = subject?.class_ratings ?? [];
    const classRatingMap = new Map(classRatings.map((rating) => [rating.class_name || 'Uncategorized', rating]));

    return (
        <Modal show={open} maxWidth="2xl" onClose={onClose}>
            {subject && (
                <div className="max-h-[86vh] overflow-hidden bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase text-blue-600">Subject Rating</p>
                                <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{subject.course_name}</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {subject.course_code || 'Subject'}
                                    {subject.scope_label ? ` - ${subject.scope_label}` : ''}
                                </p>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
                                {subject.school_year || 'Current year'} - {subject.semester || 'Current term'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                {subject.submission_count} submission{Number(subject.submission_count) === 1 ? '' : 's'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                Average: {subject.overall_rating !== null && subject.overall_rating !== undefined ? Number(subject.overall_rating).toFixed(2) : '-'}
                            </span>
                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">
                                Percentage: {subject.overall_percentage !== null && subject.overall_percentage !== undefined ? `${Number(subject.overall_percentage).toFixed(2)}%` : '-'}
                            </span>
                        </div>
                    </div>

                    <div className="max-h-[calc(86vh-132px)] overflow-y-auto px-5 py-4">
                        <div className="mb-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Overall Rating</p>
                                <p className="mt-1 text-2xl font-bold text-blue-700">
                                    {subject.overall_rating !== null && subject.overall_rating !== undefined ? Number(subject.overall_rating).toFixed(2) : '-'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Percentage</p>
                                <p className="mt-1 text-2xl font-bold text-indigo-700">
                                    {subject.overall_percentage !== null && subject.overall_percentage !== undefined ? `${Number(subject.overall_percentage).toFixed(2)}%` : '-'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Question Classes</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900">{classRatings.length}</p>
                            </div>
                        </div>

                        {questions.length ? (
                            <div className="space-y-3">
                                {questions.map((question, index) => {
                                    const previousClass = questions[index - 1]?.class_name ?? '';
                                    const currentClass = question.class_name ?? '';
                                    const showDivider = currentClass && currentClass !== previousClass;
                                    const classRating = classRatingMap.get(currentClass || 'Uncategorized');

                                    return (
                                        <Fragment key={question.question_id}>
                                            {showDivider && (
                                                <div className="flex flex-col gap-2 pt-2">
                                                    <div className="flex items-center gap-3">
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                        {currentClass}
                                                        {question.weight_percentage != null ? ` (${question.weight_percentage}%)` : ''}
                                                    </div>
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                    </div>
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
                                                            Class Rating: {classRating?.average !== null && classRating?.average !== undefined ? Number(classRating.average).toFixed(2) : '-'}
                                                        </span>
                                                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-200">
                                                            Percentage: {classRating?.percentage !== null && classRating?.percentage !== undefined ? `${Number(classRating.percentage).toFixed(2)}%` : '-'}
                                                        </span>
                                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                                            {classRating?.response_count ?? 0} responses
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="rounded-lg border border-slate-200 bg-white p-4">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <p className="text-sm text-slate-700">
                                                        <span className="mr-1 font-semibold text-slate-500">{index + 1}.</span>
                                                        {question.question_text}
                                                    </p>
                                                    <div className="shrink-0 rounded-lg bg-slate-50 px-4 py-2 text-right">
                                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rating</p>
                                                        <p className="text-lg font-bold text-blue-700">
                                                            {question.average !== null && question.average !== undefined ? Number(question.average).toFixed(2) : '-'}
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-indigo-600">
                                                            {question.average !== null && question.average !== undefined ? `${((Number(question.average) / 5) * 100).toFixed(2)}%` : '-'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {question.count} response{Number(question.count) === 1 ? '' : 's'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Fragment>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState icon="ratings" message="No questionnaire ratings are available for this subject yet." />
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

function SubjectRatingsTab({ ratings = [], classes = [], cycle }) {
    const [selectedSubject, setSelectedSubject] = useState(null);
    const fallbackSubjects = classes
        .filter((item) => item.subject_id || item.course_name)
        .reduce((items, item) => {
            const key = String(item.subject_id ?? item.class_key ?? item.course_name);
            const existing = items.get(key);

            if (existing) {
                items.set(key, {
                    ...existing,
                    sections: [...new Set([...(existing.sections ?? []), item.section_name].filter(Boolean))],
                    enrolled_count: Number(existing.enrolled_count ?? 0) + Number(item.enrolled_count ?? 0),
                });
                return items;
            }

            items.set(key, {
                subject_id: item.subject_id ?? key,
                course_code: item.course_code ?? '',
                course_name: item.course_name ?? 'Subject',
                department_name: item.department_name ?? '',
                scope_label: item.scope_label ?? '',
                sections: [item.section_name].filter(Boolean),
                enrolled_count: Number(item.enrolled_count ?? 0),
                school_year: item.school_year ?? cycle?.school_year ?? '',
                semester: item.semester_label ?? cycle?.semester ?? '',
                submission_count: 0,
                overall_rating: null,
            });
            return items;
        }, new Map());
    const subjects = ratings.length ? ratings : [...fallbackSubjects.values()];
    const hasPrintableSubjects = subjects.some((subject) => (
        Number(subject.submission_count ?? 0) > 0
        && subject.overall_rating !== null
        && subject.overall_rating !== undefined
    ));

    if (!subjects.length) {
        return <EmptyState icon="ratings" message="No assigned subjects are available for the active evaluation cycle." />;
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subjects</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{subjects.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Evaluations</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                        {subjects.reduce((total, subject) => total + Number(subject.submission_count ?? 0), 0)}
                    </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cycle</p>
                    <p className="mt-2 text-sm font-semibold text-slate-800">
                        {cycle ? `${cycle.school_year} - ${cycle.semester}` : 'No active cycle'}
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => printAllSubjectRatingsReport(subjects, cycle)}
                    disabled={!hasPrintableSubjects}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                    <AppIcon name="print" className="h-3.5 w-3.5" />
                    Print as PDF
                </button>
            </div>

            <div className="space-y-2">
                {subjects.map((subject) => {
                    const average = subject.overall_rating;
                    const hasRatings = Number(subject.submission_count ?? 0) > 0 && average !== null && average !== undefined;

                    return (
                        <div key={subject.subject_id ?? subject.course_name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-800">{subject.course_name}</p>
                                        {subject.course_code && (
                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                                {subject.course_code}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {(subject.sections ?? []).length ? `Sections: ${subject.sections.join(', ')}` : 'No section listed'}
                                        {subject.scope_label ? ` - ${subject.scope_label}` : ''}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-200">
                                            {subject.school_year || cycle?.school_year || 'Current year'} - {subject.semester || cycle?.semester || 'Current term'}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                            {subject.submission_count} submission{Number(subject.submission_count) === 1 ? '' : 's'}
                                        </span>
                                        {Number(subject.enrolled_count ?? 0) > 0 && (
                                            <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                                {subject.enrolled_count} enrolled
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex min-w-[120px] flex-col items-start gap-2 rounded-lg bg-slate-50 px-4 py-3 sm:items-end">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rating</p>
                    <p className={`mt-1 text-2xl font-bold ${hasRatings ? 'text-blue-700' : 'text-slate-400'}`}>
                        {hasRatings ? Number(average).toFixed(2) : '-'}
                    </p>
                                    {hasRatings && (
                                        <p className="text-xs font-semibold text-indigo-600">
                                            {subject.overall_percentage !== null && subject.overall_percentage !== undefined
                                                ? `${Number(subject.overall_percentage).toFixed(2)}%`
                                                : `${((Number(average) / 5) * 100).toFixed(2)}%`}
                                        </p>
                                    )}
                                    <p className="text-xs text-slate-400">{hasRatings ? 'out of 5.00' : 'No ratings yet'}</p>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedSubject(subject)}
                                        disabled={!hasRatings}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <SubjectRatingModal
                subject={selectedSubject}
                open={Boolean(selectedSubject)}
                onClose={() => setSelectedSubject(null)}
            />
        </div>
    );
}

function PeerRatingsTab({ ratings = {} }) {
    const groups = [
        ratings.inside ?? { label: 'Inside Faculty', questions: [] },
        ratings.outside ?? { label: 'Outside Faculty', questions: [] },
    ];

    return (
        <div className="grid gap-4 xl:grid-cols-2">
            {groups.map((group) => {
                const hasRatings = Number(group.submission_count ?? 0) > 0 && group.overall_rating !== null && group.overall_rating !== undefined;

                return (
                    <div key={group.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{group.label}</p>
                                <p className="mt-1 text-sm text-slate-500">
                                    {group.submission_count ?? 0} submission{Number(group.submission_count ?? 0) === 1 ? '' : 's'}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => printPeerRatingReport(group)}
                                    disabled={!hasRatings}
                                    className="mt-3 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                    Print PDF
                                </button>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-bold ${hasRatings ? 'text-blue-700' : 'text-slate-400'}`}>
                                    {hasRatings ? Number(group.overall_rating).toFixed(2) : '-'}
                                </p>
                                <p className="text-xs font-semibold text-indigo-600">
                                    {group.overall_percentage !== null && group.overall_percentage !== undefined ? `${Number(group.overall_percentage).toFixed(2)}%` : '-'}
                                </p>
                            </div>
                        </div>

                        {(group.questions ?? []).length ? (
                            <div className="mt-4 space-y-3">
                                {group.questions.map((question, index) => {
                                    const previousClass = group.questions[index - 1]?.class_name ?? '';
                                    const currentClass = question.class_name ?? '';
                                    const showDivider = currentClass && currentClass !== previousClass;

                                    return (
                                        <Fragment key={question.question_id}>
                                            {showDivider && (
                                                <div className="flex items-center gap-3 pt-2">
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                        {currentClass}
                                                        {question.weight_percentage != null ? ` (${question.weight_percentage}%)` : ''}
                                                    </div>
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                </div>
                                            )}
                                            <div className="rounded-lg border border-slate-200 bg-white p-3">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <p className="text-sm text-slate-700">
                                                        <span className="mr-1 font-semibold text-slate-500">{index + 1}.</span>
                                                        {question.question_text}
                                                    </p>
                                                    <div className="shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-right">
                                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Rating</p>
                                                        <p className="text-lg font-bold text-blue-700">
                                                            {question.average !== null && question.average !== undefined ? Number(question.average).toFixed(2) : '-'}
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-indigo-600">
                                                            {question.average !== null && question.average !== undefined ? `${((Number(question.average) / 5) * 100).toFixed(2)}%` : '-'}
                                                        </p>
                                                        <p className="text-[11px] text-slate-400">
                                                            {question.count} response{Number(question.count) === 1 ? '' : 's'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </Fragment>
                                    );
                                })}
                            </div>
                        ) : (
                            <EmptyState icon="peer" message={`No ${group.label.toLowerCase()} peer ratings yet.`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function SubmissionsTab({ targets = [], onViewEvaluation }) {
    const [activeType, setActiveType] = useState('peer_teacher');
    const done = targets.filter((target) => target.done);
    const visibleDone = done.filter((target) => (target.category ?? 'peer_teacher') === activeType);
    const activeTab = SUBMISSION_TABS.find((tab) => tab.key === activeType);

    if (!done.length) {
        return <EmptyState icon="check-circle" message="No submitted evaluation records yet." />;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                {SUBMISSION_TABS.map((tab) => {
                    const count = done.filter((target) => (target.category ?? 'peer_teacher') === tab.key).length;
                    const active = activeType === tab.key;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveType(tab.key)}
                            className={[
                                'inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                                active
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100',
                            ].join(' ')}
                        >
                            <AppIcon name={tab.icon} className="h-4 w-4" />
                            <span>{tab.label}</span>
                            <span
                                className={[
                                    'rounded-full px-2 py-0.5 text-[11px]',
                                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600',
                                ].join(' ')}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {activeTab?.label ?? 'Evaluation'} Submissions ({visibleDone.length})
                </p>
                {visibleDone.length ? (
                    <div className="space-y-2">
                        {visibleDone.map((target) => (
                        <div key={target.form_key ?? `${target.category}-${target.id}`} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                <AppIcon name="check-circle" className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-700">{target.name}</p>
                                <p className="text-xs text-slate-400">
                                    Submitted
                                    {target.scope ? ` · ${target.scope}` : ''}
                                </p>
                                {target.questionnaire_title && (
                                    <div className="mt-2">
                                        <span className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">
                                            {target.questionnaire_title}
                                        </span>
                                    </div>
                                )}
                                <div className="mt-2">
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                                        {CATEGORY_LABELS[target.category] ?? 'Evaluation'}
                                    </span>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => onViewEvaluation?.(target)}
                                disabled={!target.questionnaire_id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                View
                            </button>
                        </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState icon={activeTab?.icon ?? 'check-circle'} message={`No ${activeTab?.label ?? 'evaluation'} submissions yet.`} />
                )}
            </div>
        </div>
    );
}

function ArchiveFoldersTab({ folders = [] }) {
    const [selectedPeriodKey, setSelectedPeriodKey] = useState(null);
    const [activeFolder, setActiveFolder] = useState('submitted');
    const [submittedTab, setSubmittedTab] = useState('peer_teacher');
    const [ratingsTab, setRatingsTab] = useState('subject');
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [selectedRatingFile, setSelectedRatingFile] = useState(null);

    useEffect(() => {
        if (selectedPeriodKey && !folders.some((folder) => folder.key === selectedPeriodKey)) {
            setSelectedPeriodKey(null);
        }
    }, [folders, selectedPeriodKey]);

    if (!folders.length) {
        return <EmptyState icon="archive" message="No archived academic year records yet." />;
    }

    const selectedPeriod = folders.find((folder) => folder.key === selectedPeriodKey) ?? null;

    if (!selectedPeriod) {
        return (
            <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Past Academic Year and Term</p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {folders.map((folder) => {
                        const submittedCount = SUBMISSION_TABS.reduce((total, tab) => total + (folder.submitted?.[tab.key]?.length ?? 0), 0);
                        const ratingCount = (folder.ratings?.subject?.length ?? 0) + (folder.ratings?.peer?.length ?? 0);

                        return (
                            <button
                                key={folder.key}
                                type="button"
                                onClick={() => {
                                    setSelectedPeriodKey(folder.key);
                                    setActiveFolder('submitted');
                                }}
                                className="flex min-h-[96px] items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"
                            >
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                    <AppIcon name="folder" className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-800">{folder.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {submittedCount} submitted evaluation{submittedCount === 1 ? '' : 's'} - {ratingCount} rating file{ratingCount === 1 ? '' : 's'}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    const submittedTabs = SUBMISSION_TABS.map((tab) => ({
        ...tab,
        count: (selectedPeriod.submitted?.[tab.key] ?? []).length,
    }));
    const ratingTabs = [
        { key: 'subject', label: 'My Subject Ratings', icon: 'ratings', count: selectedPeriod.ratings?.subject?.length ?? 0 },
        { key: 'peer', label: 'Peer Ratings', icon: 'peer', count: selectedPeriod.ratings?.peer?.length ?? 0 },
    ];
    const submittedRows = selectedPeriod.submitted?.[submittedTab] ?? [];
    const ratingRows = selectedPeriod.ratings?.[ratingsTab] ?? [];
    const folderTabs = [
        { key: 'submitted', label: 'Evaluation Submitted Folder', icon: 'folder', count: submittedTabs.reduce((total, tab) => total + tab.count, 0) },
        { key: 'ratings', label: 'Ratings File Folder', icon: 'folder', count: ratingTabs.reduce((total, tab) => total + tab.count, 0) },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Archive Folder</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-900">{selectedPeriod.label}</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setSelectedPeriodKey(null)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                    Back to Academic Years
                </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                {folderTabs.map((folder) => {
                    const active = activeFolder === folder.key;

                    return (
                        <button
                            key={folder.key}
                            type="button"
                            onClick={() => setActiveFolder(folder.key)}
                            className={[
                                'flex min-h-[92px] items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition',
                                active ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            <div className={['flex h-11 w-11 items-center justify-center rounded-lg', active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'].join(' ')}>
                                <AppIcon name={folder.icon} className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{folder.label}</p>
                                <p className="mt-1 text-xs text-slate-500">{folder.count} record{folder.count === 1 ? '' : 's'}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            {activeFolder === 'submitted' ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <ArchiveTabs tabs={submittedTabs} activeKey={submittedTab} onChange={setSubmittedTab} />
                    <div className="mt-4 overflow-x-auto">
                        {submittedRows.length ? (
                            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                <thead>
                                    <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="px-3 py-2">Evaluatee</th>
                                        <th className="px-3 py-2">Questionnaire</th>
                                        <th className="px-3 py-2">Rating</th>
                                        <th className="px-3 py-2">Percentage</th>
                                        <th className="px-3 py-2">Submitted</th>
                                        <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {submittedRows.map((row) => (
                                        <tr key={row.id} className="text-slate-700">
                                            <td className="px-3 py-3">
                                                <p className="font-semibold text-slate-800">{row.evaluatee_name}</p>
                                                {row.role && <p className="text-xs text-slate-400">{row.role}</p>}
                                            </td>
                                            <td className="px-3 py-3">{row.questionnaire_title || 'Questionnaire'}</td>
                                            <td className="px-3 py-3 font-semibold text-blue-700">{formatRating(row.rating)}</td>
                                            <td className="px-3 py-3 font-semibold text-indigo-600">{formatPercentage(row.percentage)}</td>
                                            <td className="px-3 py-3 text-slate-500">{formatDate(row.submitted_at)}</td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSubmission({ ...row, period: selectedPeriod.label })}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <AppIcon name="eye" className="h-3.5 w-3.5" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <EmptyState icon="archive" message="No submitted evaluations in this folder." />
                        )}
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <ArchiveTabs tabs={ratingTabs} activeKey={ratingsTab} onChange={setRatingsTab} />
                        {ratingRows.length > 0 && (
                            <button
                                type="button"
                                onClick={() => printRatingsFolderTableReport({ rows: ratingRows, type: ratingsTab, period: selectedPeriod.label })}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                                <AppIcon name="print" className="h-3.5 w-3.5" />
                                Print as PDF
                            </button>
                        )}
                    </div>
                    <div className="mt-4 overflow-x-auto">
                        {ratingRows.length ? (
                            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                <thead>
                                    <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="px-3 py-2">{ratingsTab === 'subject' ? 'Subject' : 'Peer Rating Type'}</th>
                                        <th className="px-3 py-2">Submissions</th>
                                        <th className="px-3 py-2">Rating</th>
                                        <th className="px-3 py-2">Percentage</th>
                                        <th className="px-3 py-2">Latest</th>
                                        <th className="px-3 py-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ratingRows.map((row) => (
                                        <tr key={`${ratingsTab}-${row.id}`} className="text-slate-700">
                                            <td className="px-3 py-3">
                                                <p className="font-semibold text-slate-800">{ratingsTab === 'subject' ? row.subject : row.scope}</p>
                                                {ratingsTab === 'subject' && row.code && <p className="text-xs text-slate-400">{row.code}</p>}
                                            </td>
                                            <td className="px-3 py-3">{row.submission_count}</td>
                                            <td className="px-3 py-3 font-semibold text-blue-700">{formatRating(row.rating)}</td>
                                            <td className="px-3 py-3 font-semibold text-indigo-600">{formatPercentage(row.percentage)}</td>
                                            <td className="px-3 py-3 text-slate-500">{formatDate(row.latest_submitted_at)}</td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedRatingFile({ ...row, type: ratingsTab, period: selectedPeriod.label })}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <AppIcon name="eye" className="h-3.5 w-3.5" />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <EmptyState icon={ratingsTab === 'subject' ? 'ratings' : 'peer'} message="No past ratings in this folder." />
                        )}
                    </div>
                </div>
            )}

            <ArchiveSubmissionModal
                submission={selectedSubmission}
                open={Boolean(selectedSubmission)}
                onClose={() => setSelectedSubmission(null)}
            />
            <ArchiveRatingFileModal
                ratingFile={selectedRatingFile}
                open={Boolean(selectedRatingFile)}
                onClose={() => setSelectedRatingFile(null)}
            />
        </div>
    );
}

function ArchiveSubmissionModal({ submission, open, onClose }) {
    const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

    return (
        <Modal show={open} maxWidth="2xl" onClose={onClose}>
            {submission && (
                <div className="max-h-[86vh] overflow-hidden bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase text-blue-600">{CATEGORY_LABELS[submission.category] ?? 'Submitted Evaluation'}</p>
                                <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{submission.evaluatee_name || 'Evaluation target'}</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {submission.role || 'Faculty'}
                                    {submission.questionnaire_title ? ` · ${submission.questionnaire_title}` : ''}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Close
                            </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 ring-1 ring-blue-200">
                                Submitted {formatDate(submission.submitted_at)}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200">
                                Rating {formatRating(submission.rating)}
                            </span>
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-200">
                                {formatPercentage(submission.percentage)}
                            </span>
                        </div>
                    </div>

                    <div className="max-h-[calc(86vh-132px)] overflow-y-auto px-5 py-4">
                        {submission.answers?.length ? (
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="w-14 px-3 py-2">#</th>
                                            <th className="px-3 py-2">Question</th>
                                            <th className="w-28 px-3 py-2 text-center">Rating</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {submission.answers.map((answer, index) => (
                                            <tr key={`${answer.question_id}-${index}`}>
                                                <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                                                <td className="px-3 py-3 text-slate-700">{answer.question_text}</td>
                                                <td className="px-3 py-3">
                                                    <div className="mx-auto w-20 rounded-lg bg-blue-50 px-2 py-1 text-center text-blue-700 ring-1 ring-blue-200">
                                                        <span className="block text-sm font-bold">{answer.rating ?? '-'}</span>
                                                        <span className="block text-[10px] leading-tight">{ratingLabels[answer.rating] ?? 'Rating'}</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState icon="archive" message="No answer details are available for this submitted evaluation." />
                        )}

                        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase text-slate-400">Comments</p>
                            <p className="mt-1 text-sm text-slate-700">{submission.comments || 'No comment provided.'}</p>
                        </div>
                    </div>
                </div>
            )}
        </Modal>
    );
}

function ArchiveRatingFileModal({ ratingFile, open, onClose }) {
    const title = ratingFile?.type === 'subject'
        ? (ratingFile?.subject || 'Subject Rating')
        : (ratingFile?.scope || 'Peer Rating');
    const subtitle = ratingFile?.type === 'subject'
        ? [ratingFile?.code, 'My Subject Ratings'].filter(Boolean).join(' - ')
        : 'Peer Ratings';

    return (
        <Modal show={open} maxWidth="2xl" onClose={onClose}>
            {ratingFile && (
                <div className="max-h-[86vh] overflow-hidden bg-white">
                    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase text-blue-600">Ratings File</p>
                                <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{title}</h3>
                                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                                {ratingFile.period}
                            </span>
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 ring-1 ring-blue-200">
                                Latest {formatDate(ratingFile.latest_submitted_at)}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200">
                                Rating {formatRating(ratingFile.rating)}
                            </span>
                            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-200">
                                {formatPercentage(ratingFile.percentage)}
                            </span>
                        </div>
                    </div>

                    <div className="max-h-[calc(86vh-132px)] overflow-y-auto px-5 py-4">
                        {ratingFile.questions?.length ? (
                            <div className="overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                    <thead className="bg-slate-50">
                                        <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="w-14 px-3 py-2">#</th>
                                            <th className="px-3 py-2">Question</th>
                                            <th className="w-28 px-3 py-2 text-center">Rating</th>
                                            <th className="w-28 px-3 py-2 text-center">Responses</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ratingFile.questions.map((question, index) => (
                                            <tr key={`${question.question_id}-${index}`}>
                                                <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                                                <td className="px-3 py-3 text-slate-700">{question.question_text}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-blue-700">{formatRating(question.rating)}</td>
                                                <td className="px-3 py-3 text-center text-slate-500">{question.count ?? 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <EmptyState icon="ratings" message="No question-level rating details are available for this file." />
                        )}
                    </div>
                </div>
            )}
        </Modal>
    );
}

function ArchiveTabs({ tabs = [], activeKey, onChange }) {
    return (
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            {tabs.map((tab) => {
                const active = activeKey === tab.key;

                return (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => onChange(tab.key)}
                        className={[
                            'inline-flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition',
                            active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white',
                        ].join(' ')}
                    >
                        <AppIcon name={tab.icon} className="h-4 w-4" />
                        <span>{tab.label}</span>
                        <span className={['rounded-full px-2 py-0.5 text-[11px]', active ? 'bg-white/20 text-white' : 'bg-white text-slate-600'].join(' ')}>
                            {tab.count ?? 0}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

function TeacherEvaluationModal({ form, open, onClose, readOnly = false }) {
    const [answers, setAnswers] = useState({});
    const [comment, setComment] = useState('');
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingPayload, setPendingPayload] = useState(null);

    const questions = form?.questions ?? [];
    const submittedAnswers = form?.submission?.submitted_answers ?? {};
    const submittedComment = form?.submission?.submitted_comment ?? '';
    const allAnswered = questions.length > 0 && questions.every((q) => answers[q.question_id]);
    const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

    useEffect(() => {
        if (!open) {
            setAnswers({});
            setComment('');
            setErrors({});
            setSubmitting(false);
            setConfirmOpen(false);
            setPendingPayload(null);
        }

        if (open && readOnly) {
            setAnswers(submittedAnswers);
            setComment(submittedComment);
        }
    }, [open, form]);

    function setRating(questionId, rating) {
        setAnswers((prev) => ({ ...prev, [questionId]: rating }));
        if (errors[questionId]) {
            setErrors((prev) => {
                const next = { ...prev };
                delete next[questionId];
                return next;
            });
        }
    }

    function submit(event) {
        event.preventDefault();
        const missing = questions.filter((q) => !answers[q.question_id]);

        if (missing.length) {
            const nextErrors = {};
            missing.forEach((q) => { nextErrors[q.question_id] = 'Required'; });
            setErrors(nextErrors);
            return;
        }

        if (!form) {
            setErrors({ message: 'Evaluation details are no longer available. Please reopen the form and try again.' });
            return;
        }

        setPendingPayload({
            category: form.category,
            questionnaire_id: form.questionnaireId ?? null,
            evaluatee_id: form.evaluatee?.id ?? null,
            academic_year_id: form.cycle.id,
            answers: Object.entries(answers).map(([questionId, rating]) => ({
                question_id: parseInt(questionId, 10),
                rating,
            })),
            comments: comment || null,
        });
        setConfirmOpen(true);
    }

    function doSubmit() {
        if (!pendingPayload) {
            setConfirmOpen(false);
            setSubmitting(false);
            setErrors({ message: 'Evaluation details are no longer available. Please reopen the form and try again.' });
            return;
        }

        setSubmitting(true);
        router.post(route('portal.teacher.evaluate.submit'), pendingPayload, {
            preserveScroll: true,
            onSuccess: () => onClose(),
            onError: (nextErrors) => {
                setErrors(nextErrors);
                setSubmitting(false);
                setConfirmOpen(false);
                setPendingPayload(null);
            },
            onFinish: () => {
                setSubmitting(false);
                setConfirmOpen(false);
                setPendingPayload(null);
            },
        });
    }

    return (
        <>
            <Modal show={open} maxWidth="2xl" closeable={!submitting && !confirmOpen} onClose={onClose}>
                {form && (
                    <div className="max-h-[86vh] overflow-hidden bg-white">
                        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase text-blue-600">{CATEGORY_LABELS[form.category] ?? 'Evaluation Form'}</p>
                                    <h3 className="mt-1 truncate text-lg font-bold text-slate-900">{form.evaluatee?.name?.trim() || 'Faculty'}</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {form.evaluatee?.role ?? 'Teacher'}
                                        {form.evaluatee?.scope ? ` · ${form.evaluatee.scope}` : ''}
                                    </p>
                                    {form.questionnaireTitle && (
                                        <p className="mt-1 text-xs text-slate-500">
                                            Questionnaire: {form.questionnaireTitle}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Close
                                </button>
                            </div>
                            <p className="mt-2 text-xs text-slate-400">{form.cycle.school_year} · {form.cycle.semester}</p>
                        </div>

                        <form onSubmit={submit} className="max-h-[calc(86vh-108px)] overflow-y-auto px-5 py-4">
                            <p className="mb-4 text-xs text-slate-500">
                                {readOnly
                                    ? 'This is a read-only view of the assigned questionnaire for this submitted evaluation.'
                                    : <>Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>.</>}
                            </p>

                            <div className="space-y-3">
                                {questions.map((q, index) => {
                                    const previousClass = questions[index - 1]?.class_name ?? '';
                                    const currentClass = q.class_name ?? '';
                                    const showDivider = currentClass && currentClass !== previousClass;

                                    return (
                                    <Fragment key={q.question_id}>
                                        {showDivider && (
                                            <div className="flex items-center gap-3 pt-2">
                                                <div className="h-px flex-1 bg-slate-200" />
                                                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                    {currentClass}
                                                    {q.weight_percentage != null ? ` (${q.weight_percentage}%)` : ''}
                                                </div>
                                                <div className="h-px flex-1 bg-slate-200" />
                                            </div>
                                        )}
                                    <div className="rounded-lg border border-slate-200 bg-white p-4">
                                        <p className="mb-3 text-sm text-slate-700">
                                            <span className="mr-1 font-semibold text-slate-500">{index + 1}.</span>{q.question_text}
                                        </p>
                                        {readOnly ? (
                                            <div className="grid grid-cols-5 gap-2">
                                                {[1, 2, 3, 4, 5].map((value) => (
                                                    <div
                                                        key={value}
                                                        className={[
                                                            'flex min-h-[54px] items-center justify-center rounded-lg border px-2 py-2 text-center text-xs font-semibold',
                                                            Number(submittedAnswers[q.question_id]) === value
                                                                ? 'border-blue-500 bg-blue-500 text-white shadow'
                                                                : 'border-slate-200 bg-slate-50 text-slate-500',
                                                        ].join(' ')}
                                                    >
                                                        <div>
                                                            <span className="block text-base font-bold">{value}</span>
                                                            <span className="block text-[10px] leading-tight opacity-80">{ratingLabels[value]}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-5 gap-2">
                                                    {[1, 2, 3, 4, 5].map((value) => (
                                                        <button
                                                            key={value}
                                                            type="button"
                                                            onClick={() => setRating(q.question_id, value)}
                                                            className={[
                                                                'min-h-[54px] rounded-lg border px-2 py-2 text-xs font-semibold transition',
                                                                answers[q.question_id] === value
                                                                    ? 'border-blue-500 bg-blue-500 text-white shadow'
                                                                    : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50',
                                                            ].join(' ')}
                                                        >
                                                            <span className="block text-base font-bold">{value}</span>
                                                            <span className="block text-[10px] leading-tight opacity-80">{ratingLabels[value]}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                                {errors[q.question_id] && (
                                                    <p className="mt-2 text-xs text-red-500">Please select a rating.</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    </Fragment>
                                    );
                                })}
                            </div>

                            {readOnly && (
                                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <label className="block text-sm font-medium text-slate-700">Comments</label>
                                        {form?.submission?.submitted_at && (
                                            <span className="text-xs text-slate-400">
                                                Submitted {new Date(form.submission.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600">
                                        {submittedComment || 'No comment provided.'}
                                    </p>
                                </div>
                            )}

                            {!readOnly && (
                                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">Comments <span className="font-normal text-slate-400">(optional)</span></label>
                                    <textarea
                                        rows={3}
                                        value={comment}
                                        onChange={(event) => setComment(event.target.value)}
                                        className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                                        placeholder="Share any additional feedback or observations..."
                                    />
                                </div>
                            )}

                            {errors.message && (
                                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errors.message}</p>
                            )}

                            <div className="sticky bottom-0 mt-5 flex gap-3 border-t border-slate-100 bg-white py-4">
                                {readOnly ? (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="w-full rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                    >
                                        Close
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={submitting}
                                            className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting || !allAnswered}
                                            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Evaluation'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </form>
                    </div>
                )}
            </Modal>

            {!readOnly && (
                <ConfirmDialog
                    open={confirmOpen}
                    title="Submit this evaluation?"
                    message={`Once submitted, your responses for ${form?.evaluatee?.name?.trim() || 'this evaluation'} cannot be edited. Make sure your ratings are final.`}
                    confirmLabel="Submit"
                    tone="primary"
                    loading={submitting}
                    onConfirm={doSubmit}
                    onCancel={() => setConfirmOpen(false)}
                />
            )}
        </>
    );
}

export default function TeacherDashboard({ teacher, cycle, classes = [], subjectRatings = [], peerRatings = {}, pendingTargets = [], headTargets = [], employeeTargets = [], evaluationForms = {}, archiveFolders = [] }) {
    const [activeNav, setActiveNav] = useState('faculty_peer_evaluation');
    const [selectedEvaluationKey, setSelectedEvaluationKey] = useState(null);
    const [viewOnly, setViewOnly] = useState(false);
    const title = SECTION_TITLES[activeNav] ?? 'Faculty Portal';
    const selectedEvaluationForm = selectedEvaluationKey ? evaluationForms[selectedEvaluationKey] : null;
    const scopeType = teacher.program ? 'program' : teacher.strand ? 'strand' : 'department';
    const scopeLabel = teacher.program || teacher.strand || teacher.department || 'assigned scope';
    const completedPeerTargets = pendingTargets.filter((target) => target.done);
    const submissionTargets = [...pendingTargets, ...headTargets, ...employeeTargets]
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));

    function startEvaluation(target) {
        const key = String(target.form_key ?? target.id);
        const form = evaluationForms[key];

        if (form) {
            setSelectedEvaluationKey(key);
            setViewOnly(Boolean(target.done));
            return;
        }

        router.visit(route('portal.teacher.evaluate', {
            evaluatee_id: target.id,
            category: target.category,
        }));
    }

    return (
        <PortalLayout
            title={title}
            user={teacher}
            userType="teacher"
            activeNav={activeNav}
            onNavChange={setActiveNav}
            sidebarDetails={[
                { label: 'Employee ID', value: teacher.employee_no },
                { label: 'Department', value: teacher.department },
                { label: 'Role', value: teacher.role },
                { label: 'Campus', value: teacher.branch },
            ].filter((detail) => detail.value)}
            sidebarBadge={cycle ? `${cycle.school_year} · ${cycle.semester}` : null}
        >
            {activeNav === 'faculty_peer_evaluation' && (
                <>
                    <div className="mb-5">
                        <p className="text-xs text-slate-400">
                            Co-teachers in your assigned {scopeType} scope
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            Scope: {scopeLabel}
                        </p>
                    </div>
                    <FacultyPeerEvaluationTab targets={pendingTargets} onStartEvaluation={startEvaluation} />
                </>
            )}

            {activeNav === 'school_heads_evaluation' && (
                <>
                    <div className="mb-5">
                        <p className="text-xs text-slate-400">
                            Program chairs assigned to your department
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            Scope: {teacher.department || 'assigned department'}
                        </p>
                    </div>
                    <SchoolHeadsEvaluationTab targets={headTargets} onStartEvaluation={startEvaluation} />
                </>
            )}

            {activeNav === 'employee_evaluation' && (
                <>
                    <div className="mb-5">
                        <p className="text-xs text-slate-400">
                            Employees in your assigned branch
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            Branch: {teacher.branch || 'assigned branch'}
                        </p>
                    </div>
                    <EmployeeEvaluationTab employees={employeeTargets} branchName={teacher.branch} onStartEvaluation={startEvaluation} />
                </>
            )}

            {activeNav === 'my_subject_ratings' && (
                <SubjectRatingsTab ratings={subjectRatings} classes={classes} cycle={cycle} />
            )}

            {activeNav === 'peer_ratings' && (
                <PeerRatingsTab ratings={peerRatings} />
            )}

            {activeNav === 'submissions' && (
                <SubmissionsTab targets={submissionTargets} onViewEvaluation={startEvaluation} />
            )}

            {activeNav === 'archives' && (
                <ArchiveFoldersTab folders={archiveFolders} />
            )}

            <TeacherEvaluationModal
                open={Boolean(selectedEvaluationForm)}
                form={selectedEvaluationForm}
                readOnly={viewOnly}
                onClose={() => {
                    setSelectedEvaluationKey(null);
                    setViewOnly(false);
                }}
            />
        </PortalLayout>
    );
}
