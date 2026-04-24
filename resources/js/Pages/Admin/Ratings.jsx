import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const ROUTE_MAP = {
    subject: 'admin.subject-ratings',
    peer: 'admin.peer-ratings',
    employee: 'admin.employee-ratings',
};

const TITLE_MAP = {
    subject: 'Subject Ratings',
    peer: 'Peer Ratings',
    employee: 'Employee Ratings',
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

const COLUMNS_MAP = { subject: SUBJECT_COLUMNS, peer: PEER_COLUMNS, employee: EMPLOYEE_COLUMNS };

export default function Ratings({ ratings, ratingType, filters, schoolYears }) {
    const [selectedYear, setSelectedYear] = useState(filters.school_year ?? '');
    const [detailOpen, setDetailOpen] = useState(false);
    const [viewing, setViewing] = useState(null);
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

    return (
        <AdminLayout title={TITLE_MAP[ratingType]} activeRoute={activeRoute} breadcrumbs={['Ratings & Reports']}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{TITLE_MAP[ratingType]}</h2>
                    <p className="text-sm text-slate-500">View and monitor {ratingType} evaluation results.</p>
                </div>
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
        </AdminLayout>
    );
}
