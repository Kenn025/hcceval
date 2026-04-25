import ConfirmDialog from '@/Components/ConfirmDialog';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

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
    head: 'Department Head Ratings',
    branch: 'Branch Ratings',
};

const SUBJECT_COLUMNS = [
    { key: 'rating_id', label: '#' },
    { key: 'teacher_name', label: 'Teacher', render: (r) => r.teacher_name ?? '-' },
    { key: 'subject_name', label: 'Subject', render: (r) => r.subject_name ?? '-' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '-' },
    { key: 'school_year', label: 'School Year', render: (r) => r.school_year ?? '-' },
    { key: 'semester', label: 'Semester', render: (r) => r.semester ?? '-' },
];

const PEER_COLUMNS = [
    { key: 'rating_id', label: '#' },
    { key: 'rater_name', label: 'Rater', render: (r) => r.rater_name ?? '-' },
    { key: 'ratee_name', label: 'Ratee', render: (r) => r.ratee_name ?? '-' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '-' },
    { key: 'school_year', label: 'School Year' },
];

const EMPLOYEE_COLUMNS = [
    { key: 'rating_id', label: '#' },
    { key: 'teacher_name', label: 'Employee', render: (r) => r.teacher_name ?? '-' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '-' },
    { key: 'school_year', label: 'School Year' },
];

const HEAD_COLUMNS = [
    { key: 'rating_id', label: '#' },
    { key: 'teacher_name', label: 'Department Head', render: (r) => r.teacher_name ?? '—' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '—' },
    { key: 'submission_count', label: 'Responses' },
    { key: 'school_year', label: 'School Year' },
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

export default function Ratings({ ratings, ratingType, filters, schoolYears }) {
    const [selectedYear, setSelectedYear] = useState(filters.school_year ?? '');
    const [detailOpen, setDetailOpen] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const activeRoute = ROUTE_MAP[ratingType] ?? 'admin.subject-ratings';
    const columns = COLUMNS_MAP[ratingType] ?? SUBJECT_COLUMNS;

    const handleYearFilter = (year) => {
        setSelectedYear(year);
        router.get(route(activeRoute), { ...filters, school_year: year }, { preserveState: true, replace: true });
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const exportUrl  = route(EXPORT_ROUTE_MAP[ratingType] ?? EXPORT_ROUTE_MAP.subject, { search: filters.search ?? '', school_year: selectedYear });
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

    const handleConfirm = () => {
        confirmAction?.run?.();
        setConfirmAction(null);
    };

    return (
        <AdminLayout title={TITLE_MAP[ratingType]} activeRoute={activeRoute} breadcrumbs={['Ratings & Reports']}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{TITLE_MAP[ratingType]}</h2>
                    <p className="text-sm text-slate-500">View and monitor {ratingType} evaluation results.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {schoolYears?.length > 0 && (
                        <select
                            value={selectedYear}
                            onChange={(e) => handleYearFilter(e.target.value)}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                        >
                            <option value="">All school years</option>
                            {schoolYears.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                    )}
                    <button
                        type="button"
                        onClick={askExport}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
                        Export CSV
                    </button>
                    <button
                        type="button"
                        onClick={askPrint}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z" /></svg>
                        Print Summary
                    </button>
                </div>
            </div>

            <ResourceTable
                columns={columns}
                data={ratings}
                filters={{ ...filters, school_year: selectedYear }}
                routeName={activeRoute}
                searchPlaceholder="Search ratings..."
                onRowClick={openView}
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Rating Information">
                {viewing && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rating ID</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.rating_id ?? '-'}</h3>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {ratingType === 'subject' && (
                                <>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher</p><p className="mt-1 text-sm text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject</p><p className="mt-1 text-sm text-slate-900">{viewing.subject_name ?? '-'}</p></div>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Semester</p><p className="mt-1 text-sm text-slate-900">{viewing.semester ?? '-'}</p></div>
                                </>
                            )}
                            {ratingType === 'peer' && (
                                <>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Rater</p><p className="mt-1 text-sm text-slate-900">{viewing.rater_name ?? '-'}</p></div>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ratee</p><p className="mt-1 text-sm text-slate-900">{viewing.ratee_name ?? '-'}</p></div>
                                </>
                            )}
                            {ratingType === 'employee' && (
                                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</p><p className="mt-1 text-sm text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                            )}
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Rating</p><p className="mt-1 text-sm text-slate-900">{viewing.overall_rating ? Number(viewing.overall_rating).toFixed(2) : '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Year</p><p className="mt-1 text-sm text-slate-900">{viewing.school_year ?? '-'}</p></div>
                        </div>
                    </div>
                )}
            </SlideOver>

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
