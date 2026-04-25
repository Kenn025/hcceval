import ConfirmDialog from '@/Components/ConfirmDialog';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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

    if (name.includes('elementary')) {
        return 'elem';
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
    { key: 'teacher_name', label: 'Teacher', render: (r) => r.teacher_name ?? '-' },
    { key: 'department_name', label: 'Department', render: (r) => r.department_name ?? '-' },
    { key: 'program_name', label: 'Program / Strand', render: (r) => r.program_name ?? r.strand_name ?? '-' },
    { key: 'overall_rating', label: 'Rating', render: (r) => r.overall_rating ? Number(r.overall_rating).toFixed(2) : '-' },
    { key: 'submission_count', label: 'Responses', render: (r) => r.submission_count ?? 0 },
    { key: 'school_year', label: 'School Year', render: (r) => r.school_year ?? '-' },
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
}) {
    const [selectedYear, setSelectedYear] = useState(filters.school_year ?? '');
    const [detailOpen, setDetailOpen] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const activeRoute = ROUTE_MAP[ratingType] ?? 'admin.subject-ratings';
    const columns = COLUMNS_MAP[ratingType] ?? SUBJECT_COLUMNS;
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const selectedFilterBranchId = String(filters.branch_id ?? activeBranchId ?? '');
    const selectedDepartmentGroup = String(filters.department_group ?? '');
    const selectedProgramGroup = String(filters.program_group ?? '');
    const selectedStrandGroup = String(filters.strand_group ?? '');
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

    const handleYearFilter = (year) => {
        setSelectedYear(year);
        router.get(route(activeRoute), { ...filters, school_year: year, page: 1 }, { preserveState: true, replace: true });
    };

    const handlePeerBranchChange = (branchId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: branchId,
            department_group: '',
            program_group: '',
            strand_group: '',
            school_year: selectedYear,
            page: 1,
        }, {
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

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const printRatingDetail = () => {
        window.print();
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

            {ratingType === 'peer' && (
                <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[220px]">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Branch
                            </label>
                            <select
                                value={selectedFilterBranchId}
                                onChange={(e) => handlePeerBranchChange(e.target.value)}
                                disabled={isBranchAdmin}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                            >
                                {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

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

                    {(selectedDepartmentType === 'college' || selectedDepartmentType === 'shs') && (
                        <div className="flex justify-end">
                            {selectedDepartmentType === 'college' && (
                                <select
                                    value={selectedProgramGroup}
                                    onChange={(e) => handlePeerProgramChange(e.target.value)}
                                    className="min-w-[220px] rounded-full border border-slate-200 bg-white py-1.5 pl-4 pr-9 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                                    className="min-w-[220px] rounded-full border border-slate-200 bg-white py-1.5 pl-4 pr-9 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">All Strands</option>
                                    {peerFilterStrands.map((strand) => (
                                        <option key={strand.name} value={strand.name}>{strand.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}
                </div>
            )}

            <ResourceTable
                columns={columns}
                data={ratings}
                filters={{ ...filters, school_year: selectedYear }}
                routeName={activeRoute}
                searchPlaceholder={ratingType === 'peer' ? 'Search teachers...' : 'Search ratings...'}
                onRowClick={openView}
                extraHeaderActions={null}
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Rating Information">
                {viewing && (
                    <div className="space-y-6">
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
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher</p><p className="mt-1 text-sm text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p><p className="mt-1 text-sm text-slate-900">{viewing.department_name ?? '-'}</p></div>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program / Strand</p><p className="mt-1 text-sm text-slate-900">{viewing.program_name ?? viewing.strand_name ?? '-'}</p></div>
                                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Responses</p><p className="mt-1 text-sm text-slate-900">{viewing.submission_count ?? 0}</p></div>
                                </>
                            )}
                            {ratingType === 'employee' && (
                                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</p><p className="mt-1 text-sm text-slate-900">{viewing.teacher_name ?? '-'}</p></div>
                            )}
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Rating</p>
                                <p className="mt-1 text-sm text-slate-900">
                                    {viewing.overall_rating
                                        ? `${Number(viewing.overall_rating).toFixed(2)} (${ratingPercentage(viewing.overall_rating)?.toFixed(2)}%)`
                                        : '-'}
                                </p>
                            </div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Year</p><p className="mt-1 text-sm text-slate-900">{viewing.school_year ?? '-'}</p></div>
                        </div>

                        {ratingType === 'peer' && viewing.questionnaire && (
                            <div className="space-y-4">
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

                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                                    {Array.isArray(viewing.questionnaire.scale_questions) && viewing.questionnaire.scale_questions.length > 0 ? (
                                        <div className="mt-3 space-y-4">
                                            {viewing.questionnaire.scale_questions.map((group, groupIndex) => (
                                                <div key={`${group.class_name}-${groupIndex}`} className="rounded-lg border border-slate-200 bg-white p-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="text-sm font-semibold text-slate-900">{group.class_name || `Class ${groupIndex + 1}`}</p>
                                                        <div className="text-right">
                                                            <p className="text-xs font-medium text-slate-500">
                                                                {group.weight_percentage != null ? `${group.weight_percentage}%` : 'No weight'}
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-blue-700">
                                                                Value Rating: {classAverage(viewing.question_ratings, group.questions) != null
                                                                    ? Number(classAverage(viewing.question_ratings, group.questions)).toFixed(2)
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
                                                                            {formatQuestionAverage(viewing.question_ratings, question.question_id)}
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
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDetailOpen(false)}
                                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={printRatingDetail}
                                className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                                Print as PDF
                            </button>
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
