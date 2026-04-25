import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import AppIcon from '@/Components/AppIcon';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const stripCampusSuffix = (value) => String(value ?? '').replace(/\s*-\s*(Santa Rosa|Concepcion)\s*$/i, '').trim();

const ROUTE_MAP = {
    college: 'admin.college.year-levels',
    'senior-high': 'admin.senior-high.year-levels',
    'junior-high': 'admin.junior-high.grade-levels',
    'grade-school': 'admin.grade-school.grade-levels',
};

const getFirstErrorMessage = (formErrors, fallback) => {
    const firstValue = Object.values(formErrors ?? {})[0];

    if (typeof firstValue === 'string' && firstValue.trim() !== '') {
        return firstValue;
    }

    if (Array.isArray(firstValue)) {
        const firstItem = firstValue.find((value) => typeof value === 'string' && value.trim() !== '');
        if (firstItem) {
            return firstItem;
        }
    }

    return fallback;
};

const parseTeacherMap = (value) => {
    if (!value) {
        return {};
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch {
            return {};
        }
    }

    return typeof value === 'object' ? value : {};
};

function ErrorNotification({ message, onClose }) {
    if (!message) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed right-4 top-0 z-[65] sm:right-6">
            <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-rose-200 bg-white/95 px-4 py-3 text-rose-900 shadow-lg backdrop-blur">
                <div className="mt-0.5 rounded-full bg-rose-100 p-1 text-rose-600">
                    <AppIcon name="close" className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Error</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{message}</p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close notification"
                >
                    <AppIcon name="close" className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

export default function YearLevels({
    yearLevels,
    filters,
    educationType,
    educationLevelName,
    branches,
    departments,
    selectedBranchId,
    scopedBranchId,
    programs,
    strands,
    subjects,
    advisers,
}) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [errorNotification, setErrorNotification] = useState('');
    const activeRoute = ROUTE_MAP[educationType] ?? 'admin.college.year-levels';
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const activeBranch = branches.find((branch) => String(branch.id) === activeBranchId);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        branch_id: activeBranchId,
        program_id: '',
        strand_id: '',
        adviser_teacher_id: '',
        subject_ids: [],
        subject_teacher_ids: {},
        year_level: '',
        section: '',
        education_type: educationType,
    });
    const [subjectSearch, setSubjectSearch] = useState('');
    const resolvedDepartment = useMemo(() => {
        if (!data.branch_id) {
            return null;
        }

        return departments.find((department) => {
            if (String(department.branch_id) !== String(data.branch_id)) {
                return false;
            }

            const departmentName = String(department.name ?? '').toLowerCase();

            if (educationType === 'senior-high') {
                return departmentName.includes('senior high') || departmentName.includes('shs');
            }

            if (educationType === 'junior-high') {
                return departmentName.includes('junior high') || departmentName.includes('jhs');
            }

            if (educationType === 'grade-school') {
                return departmentName.includes('elementary') || departmentName.includes('grade school') || departmentName.includes('elem');
            }

            return false;
        }) ?? null;
    }, [data.branch_id, departments, educationType]);

    const filteredPrograms = useMemo(
        () => programs.filter((program) => !data.branch_id || String(program.branch_id ?? activeBranchId) === String(data.branch_id)),
        [activeBranchId, data.branch_id, programs],
    );
    const filteredStrands = useMemo(
        () => strands.filter((strand) => !resolvedDepartment || String(strand.department_id ?? '') === String(resolvedDepartment.id)),
        [resolvedDepartment, strands],
    );
    const filteredSubjects = useMemo(
        () => subjects.filter((subject) => {
            const branchMatches = !data.branch_id || String(subject.branch_id ?? '') === String(data.branch_id);
            const programMatches = educationType !== 'college'
                ? true
                : !data.program_id || String(subject.program_id ?? '') === String(data.program_id);
            const strandMatches = educationType !== 'senior-high'
                ? true
                : !data.strand_id || String(subject.strand_id ?? '') === String(data.strand_id);

            return branchMatches && programMatches && strandMatches;
        }),
        [data.branch_id, data.program_id, data.strand_id, educationType, subjects],
    );
    const visibleSubjectGroups = useMemo(() => {
        const search = subjectSearch.trim().toLowerCase();
        const matchesSearch = (subject) => !search || String(subject.name ?? '').toLowerCase().includes(search) || String(subject.code ?? '').toLowerCase().includes(search);

        if (educationType === 'college') {
            const major = filteredSubjects.filter((subject) => !subject.is_gened && matchesSearch(subject));
            const minor = subjects.filter((subject) => (
                !search || matchesSearch(subject)
            )).filter((subject) => (
                String(subject.branch_id ?? '') === String(data.branch_id)
                && String(subject.department_id ?? '') === String(filteredPrograms.find((program) => String(program.id) === String(data.program_id))?.department_id ?? '')
                && Boolean(subject.is_gened)
            ));

            return { major, minor };
        }

        if (educationType === 'senior-high') {
            const major = filteredSubjects.filter((subject) => !subject.is_gened && matchesSearch(subject));
            const minor = subjects.filter((subject) => (
                !search || matchesSearch(subject)
            )).filter((subject) => (
                String(subject.branch_id ?? '') === String(data.branch_id)
                && String(subject.department_id ?? '') === String(resolvedDepartment?.id ?? '')
                && Boolean(subject.is_gened)
            ));

            return { major, minor };
        }

        if (educationType === 'junior-high' || educationType === 'grade-school') {
            const scoped = filteredSubjects.filter((subject) => matchesSearch(subject));

            return { major: scoped, minor: [] };
        }

        return { major: [], minor: [] };
    }, [data.branch_id, data.program_id, educationType, filteredPrograms, filteredSubjects, resolvedDepartment, subjectSearch, subjects]);
    const totalAvailableSubjects = useMemo(() => {
        if (educationType === 'college') {
            if (!data.program_id) {
                return 0;
            }

            const selectedProgramDepartmentId = String(
                filteredPrograms.find((program) => String(program.id) === String(data.program_id))?.department_id ?? ''
            );

            return subjects.filter((subject) => (
                String(subject.branch_id ?? '') === String(data.branch_id)
                && String(subject.department_id ?? '') === selectedProgramDepartmentId
                && (
                    (!subject.is_gened && String(subject.program_id ?? '') === String(data.program_id))
                    || Boolean(subject.is_gened)
                )
            )).length;
        }

        if (educationType === 'senior-high') {
            if (!data.strand_id) {
                return 0;
            }

            return subjects.filter((subject) => (
                String(subject.branch_id ?? '') === String(data.branch_id)
                && String(subject.department_id ?? '') === String(resolvedDepartment?.id ?? '')
                && (
                    (!subject.is_gened && String(subject.strand_id ?? '') === String(data.strand_id))
                    || Boolean(subject.is_gened)
                )
            )).length;
        }

        if (educationType === 'junior-high' || educationType === 'grade-school') {
            return subjects.filter((subject) => (
                String(subject.branch_id ?? '') === String(data.branch_id)
                && String(subject.department_id ?? '') === String(resolvedDepartment?.id ?? '')
            )).length;
        }

        return 0;
    }, [data.branch_id, data.program_id, data.strand_id, educationType, filteredPrograms, resolvedDepartment, subjects]);
    const selectedSubjectIds = useMemo(
        () => (Array.isArray(data.subject_ids) ? data.subject_ids.map((id) => String(id)) : []),
        [data.subject_ids],
    );
    const subjectMap = useMemo(
        () => new Map(subjects.map((subject) => [String(subject.id), subject])),
        [subjects],
    );
    const viewingSubjects = useMemo(() => {
        if (!viewing || !Array.isArray(viewing.subject_id)) {
            return [];
        }

        return viewing.subject_id
            .map((id) => {
                const subject = subjectMap.get(String(id));

                if (!subject) {
                    return null;
                }

                return {
                    ...subject,
                    assignedTeacherId: String(parseTeacherMap(viewing.subject_teacher_map)?.[String(id)] ?? ''),
                };
            })
            .filter(Boolean);
    }, [subjectMap, viewing]);
    const viewingSubjectGroups = useMemo(() => {
        if (educationType === 'college' || educationType === 'senior-high') {
            return {
                major: viewingSubjects.filter((subject) => !subject.is_gened),
                minor: viewingSubjects.filter((subject) => subject.is_gened),
            };
        }

        return {
            major: viewingSubjects,
            minor: [],
        };
    }, [educationType, viewingSubjects]);
    const teacherMap = useMemo(
        () => new Map(advisers.map((teacher) => [String(teacher.id), teacher.full_name])),
        [advisers],
    );
    const filteredAdvisers = useMemo(
        () => advisers.filter((adviser) => {
            const branchMatches = !data.branch_id || String(adviser.branch_id) === String(data.branch_id);
            const departmentMatches = educationType === 'college'
                ? true
                : !resolvedDepartment || String(adviser.department_id ?? '') === String(resolvedDepartment.id);
            const programMatches = !data.program_id
                ? true
                : String(adviser.program_id ?? '') === String(data.program_id);

            return branchMatches && departmentMatches && programMatches;
        }),
        [advisers, data.branch_id, data.program_id, educationType, resolvedDepartment],
    );
    const collegeYearLevels = [
        { value: '1', label: '1st Year' },
        { value: '2', label: '2nd Year' },
        { value: '3', label: '3rd Year' },
        { value: '4', label: '4th Year' },
        { value: '5', label: '5th Year' },
    ];
    const seniorHighGradeLevels = [
        { value: '11', label: 'Grade 11' },
        { value: '12', label: 'Grade 12' },
    ];
    const juniorHighGradeLevels = [
        { value: '7', label: 'Grade 7' },
        { value: '8', label: 'Grade 8' },
        { value: '9', label: 'Grade 9' },
        { value: '10', label: 'Grade 10' },
    ];
    const gradeSchoolLevels = [
        { value: '1', label: 'Grade 1' },
        { value: '2', label: 'Grade 2' },
        { value: '3', label: 'Grade 3' },
        { value: '4', label: 'Grade 4' },
        { value: '5', label: 'Grade 5' },
        { value: '6', label: 'Grade 6' },
    ];
    const levelLabel = educationType === 'college' ? 'Year Level' : 'Grade Level';
    const levelPluralLabel = educationType === 'college' ? 'Year Levels' : 'Grade Levels';
    const createLabel = editing ? `Edit ${levelLabel}` : `New ${levelLabel}`;

    useEffect(() => {
        if (!errorNotification) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setErrorNotification('');
        }, 3500);

        return () => window.clearTimeout(timeoutId);
    }, [errorNotification]);

    const openCreate = () => {
        reset();
        setErrorNotification('');
        setData({
            branch_id: activeBranchId,
            program_id: '',
            adviser_teacher_id: '',
            strand_id: '',
            subject_ids: [],
            subject_teacher_ids: {},
            year_level: '',
            section: '',
            education_type: educationType,
        });
        setSubjectSearch('');
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setErrorNotification('');
        setData({
            branch_id: String(row.department?.branch_id ?? activeBranchId),
            program_id: String(row.program_id ?? ''),
            strand_id: String(row.strand_id ?? ''),
            adviser_teacher_id: String(row.adviser_teacher_id ?? ''),
            subject_ids: Array.isArray(row.subject_id) ? row.subject_id.map((id) => String(id)) : [],
            subject_teacher_ids: Object.fromEntries(
                Object.entries(parseTeacherMap(row.subject_teacher_map)).map(([subjectId, teacherId]) => [String(subjectId), String(teacherId)])
            ),
            year_level: row.year_level ?? '',
            section: row.section ?? '',
            education_type: educationType,
        });
        setSubjectSearch('');
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const editFromDetails = () => {
        if (!viewing) return;
        openEdit(viewing);
    };

    const submit = (e) => {
        e.preventDefault();
        setErrorNotification('');
        const base = '/admin/year-levels';
        const url = editing ? base + '/' + editing.id : base;
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
            onError: (formErrors) => {
                setErrorNotification(getFirstErrorMessage(formErrors, `Unable to save ${levelLabel.toLowerCase()}.`));
            },
        });
    };

    const switchBranch = (branchId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: branchId,
            program_id: filters.program_id ?? '',
            year_level: filters.year_level ?? '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeCollegeFilter = (key, value) => {
        router.get(route(activeRoute), {
            ...filters,
            [key]: value,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'display_name', label: 'Name' },
        { key: 'year_level', label: 'Year/Grade' },
        { key: 'section', label: 'Section' },
        { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
        { key: 'program', label: educationType === 'senior-high' ? 'Strand' : 'Program', render: (row) => educationType === 'senior-high' ? (row.strand?.name ?? '-') : (stripCampusSuffix(row.program?.name) || '-') },
        { key: 'is_activated', label: 'Status', render: (row) => <StatusBadge active={row.is_activated} /> },
    ];

    const collegeFilterActions = educationType === 'college' ? (
        <div className="flex items-center gap-2">
            <SelectInput
                value={String(filters.program_id ?? '')}
                onChange={(e) => changeCollegeFilter('program_id', e.target.value)}
                className="w-56"
            >
                <option value="">All programs</option>
                {filteredPrograms.map((program) => (
                    <option key={program.id} value={program.id}>{stripCampusSuffix(program.name)}</option>
                ))}
            </SelectInput>
            <SelectInput
                value={String(filters.year_level ?? '')}
                onChange={(e) => changeCollegeFilter('year_level', e.target.value)}
                className="w-40"
            >
                <option value="">All years</option>
                {collegeYearLevels.map((level) => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                ))}
            </SelectInput>
        </div>
    ) : null;

    const titleMap = {
        college: 'College Year Levels',
        'senior-high': 'Senior High Grade Levels',
        'junior-high': 'Junior High Grade Levels',
        'grade-school': 'Grade School Grade Levels',
    };

    return (
        <AdminLayout title={titleMap[educationType]} activeRoute={activeRoute} breadcrumbs={['Academic Setup', educationLevelName]}>
            <ErrorNotification message={errorNotification} onClose={() => setErrorNotification('')} />

            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{titleMap[educationType]}</h2>
                    <p className="text-sm text-slate-500">Manage {levelPluralLabel.toLowerCase()} for {educationLevelName}.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">{`+ New ${levelLabel}`}</button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {branches.map((branch) => {
                    const isActive = String(branch.id) === activeBranchId;

                    return (
                        <button
                            key={branch.id}
                            type="button"
                            onClick={() => switchBranch(branch.id)}
                            className={[
                                'rounded-full border px-4 py-2 text-sm font-medium transition',
                                isActive
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            {branch.name}
                        </button>
                    );
                })}
            </div>

            <ResourceTable
                columns={columns}
                data={yearLevels}
                filters={filters}
                routeName={activeRoute}
                searchPlaceholder="Search levels..."
                onRowClick={openView}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                extraHeaderActions={collegeFilterActions}
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Level Information">
                {viewing && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.display_name ?? '-'}</h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.code ?? '-'}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p><p className="mt-1 text-sm text-slate-900">{viewing.department?.branch?.name ?? activeBranch?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p><p className="mt-1 text-sm text-slate-900">{viewing.department?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{levelLabel}</p><p className="mt-1 text-sm text-slate-900">{viewing.year_level ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Section</p><p className="mt-1 text-sm text-slate-900">{viewing.section ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{educationType === 'senior-high' ? 'Strand' : 'Program'}</p><p className="mt-1 text-sm text-slate-900">{educationType === 'senior-high' ? (viewing.strand?.name ?? '-') : (viewing.program?.name ?? '-')}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adviser</p><p className="mt-1 text-sm text-slate-900">{viewing.adviser?.full_name ?? viewing.assigned_adviser_name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><StatusBadge active={viewing.is_activated} /></div></div>
                        </div>

                        {['college', 'senior-high', 'junior-high', 'grade-school'].includes(educationType) && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Subjects</p>
                                {viewingSubjects.length > 0 ? (
                                    <div className="mt-2 space-y-4">
                                        {[
                                            { key: 'major', label: educationType === 'college' || educationType === 'senior-high' ? 'Major' : 'Subjects', items: viewingSubjectGroups.major },
                                            { key: 'minor', label: 'Minor', items: viewingSubjectGroups.minor },
                                        ].filter((group) => group.items.length > 0).map((group) => (
                                            <div key={group.key}>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                                                <div className="space-y-2">
                                                    {group.items.map((subject) => (
                                                        <div key={subject.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                            <p className="text-sm font-medium text-slate-800">{subject.name}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {subject.code || 'No subject code'}
                                                                {' | '}
                                                                {teacherMap.get(subject.assignedTeacherId) || 'No teacher selected'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-slate-500">No subjects assigned.</p>
                                )}
                            </div>
                        )}

                        <button type="button" onClick={editFromDetails} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
                            Edit Level
                        </button>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={createLabel}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => setData({
                            ...data,
                            branch_id: e.target.value,
                            program_id: '',
                            strand_id: '',
                            adviser_teacher_id: '',
                            subject_ids: [],
                            subject_teacher_ids: {},
                        })}>
                            <option value="">Select branch...</option>
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </SelectInput>
                    </FormField>

                    {educationType === 'college' && (
                        <FormField label="Program" error={errors.program_id} required>
                            <SelectInput value={data.program_id} onChange={(e) => {
                                setData({
                                    ...data,
                                    program_id: e.target.value,
                                    adviser_teacher_id: '',
                                    subject_ids: [],
                                    subject_teacher_ids: {},
                                });
                                setSubjectSearch('');
                            }}>
                                <option value="">Select program...</option>
                                {filteredPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    {educationType === 'senior-high' && (
                        <FormField label="Strand" error={errors.strand_id} required>
                            <SelectInput value={data.strand_id} onChange={(e) => {
                                setData({
                                    ...data,
                                    strand_id: e.target.value,
                                    adviser_teacher_id: '',
                                    subject_ids: [],
                                    subject_teacher_ids: {},
                                });
                                setSubjectSearch('');
                            }} disabled={!data.branch_id || !resolvedDepartment}>
                                <option value="">Select strand...</option>
                                {filteredStrands.map((strand) => <option key={strand.id} value={strand.id}>{strand.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label={levelLabel} error={errors.year_level} required>
                            {educationType === 'college' ? (
                                <SelectInput value={data.year_level} onChange={(e) => setData('year_level', e.target.value)}>
                                    <option value="">Select year level...</option>
                                    {collegeYearLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                                </SelectInput>
                            ) : educationType === 'senior-high' ? (
                                <SelectInput value={data.year_level} onChange={(e) => setData('year_level', e.target.value)}>
                                    <option value="">Select grade level...</option>
                                    {seniorHighGradeLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                                </SelectInput>
                            ) : educationType === 'grade-school' ? (
                                <SelectInput value={data.year_level} onChange={(e) => setData('year_level', e.target.value)}>
                                    <option value="">Select grade level...</option>
                                    {gradeSchoolLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                                </SelectInput>
                            ) : (
                                <SelectInput value={data.year_level} onChange={(e) => setData('year_level', e.target.value)}>
                                    <option value="">Select grade level...</option>
                                    {juniorHighGradeLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                                </SelectInput>
                            )}
                        </FormField>
                        <FormField label="Section" error={errors.section} required>
                            <TextInput value={data.section} onChange={(e) => setData('section', e.target.value)} placeholder="A" />
                        </FormField>
                    </div>

                    <FormField label="Assigned Adviser" error={errors.adviser_teacher_id}>
                        <SelectInput
                            value={data.adviser_teacher_id}
                            onChange={(e) => setData('adviser_teacher_id', e.target.value)}
                            disabled={educationType === 'college' ? !data.program_id : !data.branch_id || !resolvedDepartment}
                        >
                            <option value="">Select adviser...</option>
                            {filteredAdvisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.full_name}</option>)}
                        </SelectInput>
                    </FormField>

                    {['college', 'senior-high', 'junior-high', 'grade-school'].includes(educationType) && (
                        <FormField label="Assigned Subjects" error={errors.subject_ids}>
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs text-slate-500">
                                    {educationType === 'college'
                                        ? data.program_id
                                            ? (visibleSubjectGroups.major.length + visibleSubjectGroups.minor.length) > 0
                                                ? `${visibleSubjectGroups.major.length} major and ${visibleSubjectGroups.minor.length} minor subject(s) available.`
                                                : 'No subjects are available for the selected program yet.'
                                            : 'Select a program first to assign subjects.'
                                        : educationType === 'senior-high'
                                            ? !data.strand_id
                                            ? 'Select a strand first to assign subjects.'
                                            : totalAvailableSubjects > 0
                                                ? `${visibleSubjectGroups.major.length} major and ${visibleSubjectGroups.minor.length} minor subject(s) available.`
                                                : 'No subjects are available for the selected strand yet.'
                                            : totalAvailableSubjects > 0
                                                ? `${visibleSubjectGroups.major.length} subject(s) available in this level scope.`
                                                : 'No subjects are available for the selected branch yet.'}
                                </p>

                                {((educationType === 'college' && data.program_id) || (educationType === 'senior-high' && data.strand_id) || educationType === 'junior-high' || educationType === 'grade-school') && totalAvailableSubjects > 0 ? (
                                    <TextInput
                                        value={subjectSearch}
                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                        placeholder="Search subject name or code..."
                                    />
                                ) : null}

                                {((educationType === 'college' && data.program_id) || (educationType === 'senior-high' && data.strand_id) || educationType === 'junior-high' || educationType === 'grade-school') && totalAvailableSubjects > 0 ? (
                                    <div className="max-h-[32rem] space-y-4 overflow-y-auto pr-1">
                                        {[
                                            {
                                                key: 'major',
                                                label: educationType === 'college' || educationType === 'senior-high' ? 'Major Subjects' : 'Subjects',
                                                helper: educationType === 'college'
                                                    ? 'Program subjects that are not Gen Ed.'
                                                    : educationType === 'senior-high'
                                                        ? 'Strand subjects that are not Gen Ed.'
                                                        : 'Subjects available in the selected level scope.',
                                                items: visibleSubjectGroups.major,
                                            },
                                            {
                                                key: 'minor',
                                                label: 'Minor Subjects',
                                                helper: educationType === 'college'
                                                    ? 'All Gen Ed subjects under the college department.'
                                                    : 'All Gen Ed subjects under the senior high department.',
                                                items: visibleSubjectGroups.minor,
                                            },
                                        ].map((group) => group.items.length > 0 ? (
                                            <div key={group.key} className="space-y-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{group.label}</p>
                                                    <p className="text-xs text-slate-500">{group.helper}</p>
                                                </div>
                                                {group.items.map((subject) => {
                                            const subjectKey = String(subject.id);
                                            const isSelected = selectedSubjectIds.includes(subjectKey);
                                            const teacherOptions = advisers.filter((teacher) => (subject.teacher_ids ?? []).includes(Number(teacher.id)));

                                            return (
                                                <div key={subject.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                                    <label className="flex items-start gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => {
                                                                const nextSubjectIds = isSelected
                                                                    ? selectedSubjectIds.filter((id) => id !== subjectKey)
                                                                    : [...selectedSubjectIds, subjectKey];
                                                                const nextTeacherIds = { ...(data.subject_teacher_ids ?? {}) };

                                                                if (isSelected) {
                                                                    delete nextTeacherIds[subjectKey];
                                                                }

                                                                setData('subject_ids', nextSubjectIds);
                                                                setData('subject_teacher_ids', nextTeacherIds);
                                                            }}
                                                            className="mt-1 rounded border-slate-300"
                                                        />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                                                            <p className="text-xs text-slate-500">{subject.code || 'No subject code'}</p>
                                                        </div>
                                                    </label>

                                                    {isSelected ? (
                                                        <div className="mt-3 pl-7">
                                                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Assigned Teacher</p>
                                                            <SelectInput
                                                                value={String(data.subject_teacher_ids?.[subjectKey] ?? '')}
                                                                onChange={(e) => setData('subject_teacher_ids', {
                                                                    ...(data.subject_teacher_ids ?? {}),
                                                                    [subjectKey]: e.target.value,
                                                                })}
                                                            >
                                                                <option value="">Select teacher...</option>
                                                                {teacherOptions.map((teacher) => (
                                                                    <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>
                                                                ))}
                                                            </SelectInput>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {teacherOptions.length > 0
                                                                    ? 'Choose one teacher assigned to this subject.'
                                                                    : 'No teachers are assigned to this subject yet.'}
                                                            </p>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                            </div>
                                        ) : null)}

                                        {visibleSubjectGroups.major.length === 0 && visibleSubjectGroups.minor.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                                                No subjects match your search.
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </FormField>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete('/admin/year-levels/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Level" message={`Delete "${deleteTarget?.display_name ?? deleteTarget?.code}"?`} />
        </AdminLayout>
    );
}
