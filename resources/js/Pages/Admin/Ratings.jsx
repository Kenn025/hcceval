import ConfirmDialog from '@/Components/ConfirmDialog';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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

function SubjectRatingsBoard({
    context,
    filters,
    onExport,
    onPrint,
    onCardClick,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const activeBranchId = String(context?.selectedBranchId ?? '');
    const activeDepartmentId = String(context?.selectedDepartmentId ?? '');
    const activeProgramId = String(context?.selectedProgramId ?? '');
    const activeStrandId = String(context?.selectedStrandId ?? '');
    const subjects = context?.subjects ?? [];
    const programs = context?.programs ?? [];
    const strands = context?.strands ?? [];
    const departments = context?.departments ?? [];
    const branchOptions = context?.branches ?? [];
    const showProgramFilter = context?.educationType === 'college';
    const showStrandFilter = context?.educationType === 'shs';

    const selectedBranchName = useMemo(
        () => branchOptions.find((branch) => String(branch.id) === activeBranchId)?.name ?? 'Select branch',
        [activeBranchId, branchOptions],
    );

    const visit = (nextFilters) => {
        router.get(route('admin.subject-ratings'), {
            ...filters,
            ...nextFilters,
            school_year: '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const submitSearch = (event) => {
        event.preventDefault();
        visit({ search, page: 1 });
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto] lg:items-end">
                    <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</label>
                        <select
                            value={activeBranchId}
                            onChange={(event) => visit({
                                branch_id: event.target.value,
                                department_id: '',
                                program_id: '',
                                strand_id: '',
                                page: 1,
                            })}
                            disabled={Boolean(context?.scopedBranchId)}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                        >
                            {branchOptions.map((branch) => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onExport}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Export CSV
                        </button>
                        <button
                            type="button"
                            onClick={onPrint}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Print Summary
                        </button>
                    </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex flex-wrap gap-2">
                        {departments.map((department) => {
                            const isActive = String(department.id) === activeDepartmentId;

                            return (
                                <button
                                    key={department.id}
                                    type="button"
                                    onClick={() => visit({
                                        department_id: department.id,
                                        program_id: '',
                                        strand_id: '',
                                        page: 1,
                                    })}
                                    className={[
                                        'rounded-lg border px-3 py-2 text-sm font-medium transition',
                                        isActive
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                                    ].join(' ')}
                                >
                                    {department.name}
                                </button>
                            );
                        })}
                    </div>

                    {showProgramFilter && (
                        <select
                            value={activeProgramId}
                            onChange={(event) => visit({ program_id: event.target.value, page: 1 })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none xl:w-72"
                        >
                            <option value="">All programs</option>
                            {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                        </select>
                    )}

                    {showStrandFilter && (
                        <select
                            value={activeStrandId}
                            onChange={(event) => visit({ strand_id: event.target.value, page: 1 })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none xl:w-72"
                        >
                            <option value="">All strands</option>
                            {strands.map((strand) => <option key={strand.id} value={strand.id}>{strand.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">{selectedBranchName}</h3>
                        <p className="text-xs text-slate-500">{subjects.length} {context?.educationLabel?.toLowerCase() ?? 'department'} subject{subjects.length === 1 ? '' : 's'}</p>
                    </div>

                    <form onSubmit={submitSearch} className="w-full lg:max-w-xl">
                        <div className="flex gap-2">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search subjects..."
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                            />
                            <button
                                type="submit"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Search
                            </button>
                        </div>
                    </form>
                </div>

                {subjects.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No subjects found.
                    </div>
                )}

                <div className="space-y-4 p-4">
                    {subjects.map((subject) => (
                    <section key={subject.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{subject.code ?? 'Subject'}</p>
                                <h3 className="mt-1 text-base font-semibold text-slate-900">{subject.name}</h3>
                                {(subject.program_name || subject.strand_name) && (
                                    <p className="mt-1 text-sm text-slate-500">{subject.program_name ?? subject.strand_name}</p>
                                )}
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                {subject.teacher_count} teacher{subject.teacher_count === 1 ? '' : 's'}
                            </span>
                        </div>

                        {subject.teachers.length === 0 ? (
                            <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                                No teachers assigned.
                            </div>
                        ) : (
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {subject.teachers.map((teacher, index) => (
                                    <button
                                        key={`${subject.id}-${teacher.teacher_id ?? index}-${teacher.rating_id ?? 'assigned'}`}
                                        type="button"
                                        onClick={() => onCardClick({
                                            ...teacher,
                                            subject_name: subject.name,
                                            subject_code: subject.code,
                                            program_name: subject.program_name,
                                            strand_name: subject.strand_name,
                                        })}
                                        className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/60"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">{teacher.teacher_name}</p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">{teacher.teacher_role}</p>
                                            </div>
                                            <div className="rounded-lg bg-white px-2.5 py-1 text-sm font-bold text-blue-700 shadow-sm">
                                                {teacher.overall_rating !== null ? Number(teacher.overall_rating).toFixed(2) : '-'}
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <span>{teacher.submission_count} response{teacher.submission_count === 1 ? '' : 's'}</span>
                                            <span>{teacher.semester ?? 'No rating yet'}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Ratings({ ratings, ratingType, filters, schoolYears, subjectRatingContext }) {
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

    const exportUrl  = route(EXPORT_ROUTE_MAP[ratingType] ?? EXPORT_ROUTE_MAP.subject, { ...filters, search: filters.search ?? '', school_year: selectedYear });
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

    const isSubjectRatings = ratingType === 'subject' && subjectRatingContext;

    return (
        <AdminLayout title={TITLE_MAP[ratingType]} activeRoute={activeRoute} breadcrumbs={['Ratings & Reports']}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{TITLE_MAP[ratingType]}</h2>
                    <p className="text-sm text-slate-500">View and monitor {ratingType} evaluation results.</p>
                </div>
                {!isSubjectRatings && (
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
                )}
            </div>

            {isSubjectRatings ? (
                <SubjectRatingsBoard
                    context={subjectRatingContext}
                    filters={filters}
                    onExport={askExport}
                    onPrint={askPrint}
                    onCardClick={openView}
                />
            ) : (
                <ResourceTable
                    columns={columns}
                    data={ratings}
                    filters={{ ...filters, school_year: selectedYear }}
                    routeName={activeRoute}
                    searchPlaceholder="Search ratings..."
                    onRowClick={openView}
                />
            )}

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
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responses</p><p className="mt-1 text-sm text-slate-900">{viewing.submission_count ?? 0}</p></div>
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
