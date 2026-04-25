import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const buildStudentCode = (branch, nextStudentCodes = {}) => {
    if (!branch?.code) {
        return nextStudentCodes.default ?? 'STU-GEN-00001';
    }

    return nextStudentCodes[String(branch.id)] ?? `STU-${String(branch.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-00001`;
};

const stripCampusSuffix = (value) => String(value ?? '').replace(/\s*-\s*(Santa Rosa|Concepcion)\s*$/i, '').trim();

const parseSubjectIds = (value) => {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value !== 'string' || !value.trim()) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
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

const getProgramStrandLabel = (row) => {
    if (row.program?.name) {
        return stripCampusSuffix(row.program.name);
    }

    if (row.strand?.name) {
        return stripCampusSuffix(row.strand.name);
    }

    const departmentName = String(row.department?.name ?? '').toLowerCase();

    if (departmentName.includes('junior high') || departmentName.includes('elementary')) {
        return 'N/A';
    }

    return '-';
};

export default function Students({
    students,
    filters,
    branches,
    departments,
    programs,
    strands,
    yearLevels,
    subjects,
    teachers,
    nextStudentCodes,
    isBranchAdmin,
    selectedBranchId,
    scopedBranchId,
}) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [subjectListOpen, setSubjectListOpen] = useState(false);
    const [subjectListMode, setSubjectListMode] = useState('year-level');
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const selectedFilterBranchId = String(filters.branch_id ?? activeBranchId ?? '');
    const selectedFilterDepartmentId = String(filters.department_id ?? '');
    const selectedFilterProgramId = String(filters.program_id ?? '');

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        student_no: '',
        branch_id: activeBranchId,
        department_id: '',
        program_id: '',
        strand_id: '',
        year_level_id: '',
        removed_subject_ids: [],
        is_irreg: false,
        irreg_subject_ids: [],
        irreg_subject_teacher_ids: {},
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix_name: '',
        email: '',
        password: '',
        status: 'active',
    });

    const selectedBranch = useMemo(
        () => branches.find((branch) => String(branch.id) === String(data.branch_id)),
        [branches, data.branch_id],
    );
    const selectedDepartment = useMemo(
        () => departments.find((department) => String(department.id) === String(data.department_id)),
        [data.department_id, departments],
    );
    const filteredDepartments = useMemo(
        () => departments.filter((department) => (
            (!data.branch_id || String(department.branch_id) === String(data.branch_id))
            && Boolean(department.is_activated)
        )),
        [departments, data.branch_id],
    );
    const filterDepartments = useMemo(
        () => departments.filter((department) => (
            (!selectedFilterBranchId || String(department.branch_id) === selectedFilterBranchId)
            && Boolean(department.is_activated)
        )),
        [departments, selectedFilterBranchId],
    );
    const filteredPrograms = useMemo(
        () => programs.filter((program) => !data.department_id || String(program.department_id) === String(data.department_id)),
        [programs, data.department_id],
    );
    const filterPrograms = useMemo(
        () => programs.filter((program) => !selectedFilterDepartmentId || String(program.department_id) === selectedFilterDepartmentId),
        [programs, selectedFilterDepartmentId],
    );
    const filteredStrands = useMemo(
        () => strands.filter((strand) => !data.department_id || String(strand.department_id) === String(data.department_id)),
        [strands, data.department_id],
    );
    const filteredYearLevels = useMemo(
        () => yearLevels.filter((yearLevel) => (
            (!data.department_id || String(yearLevel.department_id) === String(data.department_id))
            && (!data.program_id || String(yearLevel.program_id ?? '') === String(data.program_id))
            && (!data.strand_id || String(yearLevel.strand_id ?? '') === String(data.strand_id))
        )),
        [yearLevels, data.department_id, data.program_id, data.strand_id],
    );
    const selectedYearLevel = useMemo(
        () => yearLevels.find((yearLevel) => String(yearLevel.id) === String(data.year_level_id)),
        [data.year_level_id, yearLevels],
    );
    const selectedYearLevelSubjectIds = useMemo(() => {
        if (!selectedYearLevel) {
            return [];
        }

        const raw = selectedYearLevel.subject_id;
        const values = Array.isArray(raw)
            ? raw
            : typeof raw === 'string'
                ? parseSubjectIds(raw)
                : [];

        return values.map((id) => String(id));
    }, [selectedYearLevel]);
    const selectedYearLevelSubjects = useMemo(
        () => subjects.filter((subject) => selectedYearLevelSubjectIds.includes(String(subject.id))),
        [selectedYearLevelSubjectIds, subjects],
    );
    const teacherMap = useMemo(
        () => new Map((teachers ?? []).map((teacher) => [String(teacher.id), teacher.full_name])),
        [teachers],
    );
    const selectedYearLevelTeacherMap = useMemo(
        () => parseTeacherMap(selectedYearLevel?.subject_teacher_map),
        [selectedYearLevel],
    );
    const getAssignedTeacherLabel = (subject, mode = subjectListMode) => {
        const subjectKey = String(subject.id);
        const irregularTeacherId = String(data.irreg_subject_teacher_ids?.[subjectKey] ?? '');
        const yearLevelTeacherId = String(selectedYearLevelTeacherMap?.[subjectKey] ?? '');

        if ((mode === 'irregular' || mode === 'irregular-selected') && irregularTeacherId && teacherMap.has(irregularTeacherId)) {
            return {
                label: 'Assigned Teacher',
                value: teacherMap.get(irregularTeacherId),
            };
        }

        if (yearLevelTeacherId && teacherMap.has(yearLevelTeacherId)) {
            return {
                label: 'Assigned Teacher',
                value: teacherMap.get(yearLevelTeacherId),
            };
        }

        const teacherNames = Array.isArray(subject.assigned_teacher_names)
            ? subject.assigned_teacher_names.filter(Boolean)
            : [];

        if (teacherNames.length > 0) {
            return {
                label: teacherNames.length === 1 ? 'Assigned Teacher' : 'Assigned Teachers',
                value: teacherNames.join(', '),
            };
        }

        return {
            label: mode === 'year-level' ? 'Assigned Teacher' : 'Assigned Teachers',
            value: 'No teacher assigned',
        };
    };
    const selectedProgramSubjects = useMemo(
        () => subjects.filter((subject) => !data.program_id || String(subject.program_id ?? '') === String(data.program_id)),
        [data.program_id, subjects],
    );
    const selectedDepartmentName = String(selectedDepartment?.name ?? '').toLowerCase();
    const selectedDepartmentCode = String(selectedDepartment?.code ?? '').toLowerCase();
    const isCollegeDepartment = selectedDepartmentName.includes('college') || selectedDepartmentCode.includes('col');
    const isSeniorHighDepartment = selectedDepartmentName.includes('senior high') || selectedDepartmentCode.includes('shs');
    const isJuniorHighDepartment = selectedDepartmentName.includes('junior high') || selectedDepartmentCode.includes('jhs');
    const isElementaryDepartment = selectedDepartmentName.includes('elementary') || selectedDepartmentCode.includes('elem');
    const supportsProgram = isCollegeDepartment;
    const supportsStrand = isSeniorHighDepartment;
    const showYearLevelOnly = isJuniorHighDepartment || isElementaryDepartment;
    const generatedStudentCode = editing ? data.student_no : buildStudentCode(selectedBranch, nextStudentCodes);
    const canShowIrregularControls = supportsProgram && Boolean(data.department_id);
    const activeSubjectScopeLabel = subjectListMode === 'irregular'
        ? 'Irregular Subjects'
        : 'Year Level Subjects';
    const removedSubjectIds = useMemo(
        () => (Array.isArray(data.removed_subject_ids) ? data.removed_subject_ids.map((id) => String(id)) : []),
        [data.removed_subject_ids],
    );
    const selectedIrregularSubjectIds = useMemo(
        () => (Array.isArray(data.irreg_subject_ids) ? data.irreg_subject_ids.map((id) => String(id)) : []),
        [data.irreg_subject_ids],
    );
    const regularSubjectIds = useMemo(
        () => selectedYearLevelSubjects.map((subject) => String(subject.id)),
        [selectedYearLevelSubjects],
    );
    const activeRegularSubjectIds = useMemo(
        () => regularSubjectIds.filter((id) => !removedSubjectIds.includes(id)),
        [regularSubjectIds, removedSubjectIds],
    );
    const removedRegularSubjects = useMemo(
        () => selectedYearLevelSubjects.filter((subject) => removedSubjectIds.includes(String(subject.id))),
        [removedSubjectIds, selectedYearLevelSubjects],
    );
    const irregularAvailableSubjects = useMemo(
        () => selectedProgramSubjects.filter((subject) => !regularSubjectIds.includes(String(subject.id))),
        [regularSubjectIds, selectedProgramSubjects],
    );
    const selectedIrregularSubjects = useMemo(
        () => irregularAvailableSubjects.filter((subject) => selectedIrregularSubjectIds.includes(String(subject.id))),
        [irregularAvailableSubjects, selectedIrregularSubjectIds],
    );

    useEffect(() => {
        if (!data.branch_id && activeBranchId) {
            setData('branch_id', activeBranchId);
        }
    }, [activeBranchId, data.branch_id, setData]);

    useEffect(() => {
        if (data.department_id && !filteredDepartments.some((department) => String(department.id) === String(data.department_id))) {
            setData('department_id', '');
            setData('program_id', '');
            setData('strand_id', '');
            setData('year_level_id', '');
            setData('removed_subject_ids', []);
            setData('irreg_subject_ids', []);
            setData('irreg_subject_teacher_ids', {});
        }
    }, [data.department_id, filteredDepartments, setData]);

    useEffect(() => {
        if (data.program_id && !filteredPrograms.some((program) => String(program.id) === String(data.program_id))) {
            setData('program_id', '');
            setData('year_level_id', '');
            setData('removed_subject_ids', []);
            setData('irreg_subject_ids', []);
            setData('irreg_subject_teacher_ids', {});
        }
    }, [data.program_id, filteredPrograms, setData]);

    useEffect(() => {
        if (data.strand_id && !filteredStrands.some((strand) => String(strand.id) === String(data.strand_id))) {
            setData('strand_id', '');
        }
    }, [data.strand_id, filteredStrands, setData]);

    useEffect(() => {
        if (!supportsProgram && data.program_id) {
            setData('program_id', '');
            setData('removed_subject_ids', []);
            setData('irreg_subject_ids', []);
            setData('irreg_subject_teacher_ids', {});
        }
    }, [data.program_id, setData, supportsProgram]);

    useEffect(() => {
        if (!supportsStrand && data.strand_id) {
            setData('strand_id', '');
        }
    }, [data.strand_id, setData, supportsStrand]);

    useEffect(() => {
        if (data.year_level_id && !filteredYearLevels.some((yearLevel) => String(yearLevel.id) === String(data.year_level_id))) {
            setData('year_level_id', '');
            setData('removed_subject_ids', []);
            setData('irreg_subject_ids', []);
            setData('irreg_subject_teacher_ids', {});
        }
    }, [data.year_level_id, filteredYearLevels, setData]);

    useEffect(() => {
        if (!canShowIrregularControls && data.is_irreg) {
            setData('is_irreg', false);
        }
    }, [canShowIrregularControls, data.is_irreg, setData]);

    useEffect(() => {
        if (!data.is_irreg && (selectedIrregularSubjectIds.length > 0 || Object.keys(data.irreg_subject_teacher_ids ?? {}).length > 0)) {
            setData('irreg_subject_ids', []);
            setData('irreg_subject_teacher_ids', {});
        }
    }, [data.irreg_subject_teacher_ids, data.is_irreg, selectedIrregularSubjectIds.length, setData]);

    useEffect(() => {
        if (removedSubjectIds.some((id) => !regularSubjectIds.includes(id))) {
            setData('removed_subject_ids', removedSubjectIds.filter((id) => regularSubjectIds.includes(id)));
        }
    }, [regularSubjectIds, removedSubjectIds, setData]);

    useEffect(() => {
        const validIrregularIds = selectedIrregularSubjectIds.filter((id) => irregularAvailableSubjects.some((subject) => String(subject.id) === id));

        if (validIrregularIds.length !== selectedIrregularSubjectIds.length) {
            const nextTeacherIds = { ...(data.irreg_subject_teacher_ids ?? {}) };

            Object.keys(nextTeacherIds).forEach((subjectId) => {
                if (!validIrregularIds.includes(String(subjectId))) {
                    delete nextTeacherIds[subjectId];
                }
            });

            setData('irreg_subject_ids', validIrregularIds);
            setData('irreg_subject_teacher_ids', nextTeacherIds);
        }
    }, [data.irreg_subject_teacher_ids, irregularAvailableSubjects, selectedIrregularSubjectIds, setData]);

    const handleBranchChange = (branchId) => {
        setData('branch_id', branchId);
        setData('department_id', '');
        setData('program_id', '');
        setData('strand_id', '');
        setData('year_level_id', '');
        setData('removed_subject_ids', []);
        setData('irreg_subject_ids', []);
        setData('irreg_subject_teacher_ids', {});
    };

    const handleDepartmentChange = (departmentId) => {
        setData('department_id', departmentId);
        setData('program_id', '');
        setData('strand_id', '');
        setData('year_level_id', '');
        setData('removed_subject_ids', []);
        setData('irreg_subject_ids', []);
        setData('irreg_subject_teacher_ids', {});
    };

    const handleProgramChange = (programId) => {
        setData('program_id', programId);
        setData('year_level_id', '');
        setData('removed_subject_ids', []);
        setData('irreg_subject_ids', []);
        setData('irreg_subject_teacher_ids', {});
    };

    const toggleRegularSubject = (subjectId) => {
        const subjectKey = String(subjectId);
        const isRemoved = removedSubjectIds.includes(subjectKey);

        setData('removed_subject_ids', isRemoved
            ? removedSubjectIds.filter((id) => id !== subjectKey)
            : [...removedSubjectIds, subjectKey]);
    };

    const toggleIrregularSubject = (subjectId) => {
        const subjectKey = String(subjectId);
        const isSelected = selectedIrregularSubjectIds.includes(subjectKey);
        const nextTeacherIds = { ...(data.irreg_subject_teacher_ids ?? {}) };

        if (isSelected) {
            delete nextTeacherIds[subjectKey];
        }

        setData('irreg_subject_ids', isSelected
            ? selectedIrregularSubjectIds.filter((id) => id !== subjectKey)
            : [...selectedIrregularSubjectIds, subjectKey]);
        setData('irreg_subject_teacher_ids', nextTeacherIds);
    };

    const openSubjectViewer = (mode) => {
        setSubjectListMode(mode);
        setSubjectListOpen(true);
    };

    const openCreate = () => {
        reset();
        setDetailOpen(false);
        setViewing(null);
        setData({
            student_no: '',
            branch_id: activeBranchId,
            department_id: '',
            program_id: '',
            strand_id: '',
            year_level_id: '',
            removed_subject_ids: [],
            is_irreg: false,
            irreg_subject_ids: [],
            irreg_subject_teacher_ids: {},
            first_name: '',
            middle_name: '',
            last_name: '',
            suffix_name: '',
            email: '',
            password: '',
            status: 'active',
        });
        setShowPassword(false);
        setSubjectListOpen(false);
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const openEdit = (row) => {
        setDetailOpen(false);
        setViewing(null);
        setData({
            student_no: row.student_no,
            branch_id: String(row.branch_id ?? ''),
            department_id: String(row.department_id ?? ''),
            program_id: String(row.program_id ?? ''),
            strand_id: String(row.strand_id ?? ''),
            year_level_id: String(row.year_level_id ?? ''),
            removed_subject_ids: Object.keys(parseTeacherMap(row.removed_subject_map)),
            is_irreg: Boolean(row.is_irreg),
            irreg_subject_ids: Object.keys(parseTeacherMap(row.irreg_subject_map)),
            irreg_subject_teacher_ids: Object.fromEntries(
                Object.entries(parseTeacherMap(row.irreg_subject_map)).map(([subjectId, teacherId]) => [String(subjectId), String(teacherId ?? '')])
            ),
            first_name: row.first_name,
            middle_name: row.middle_name ?? '',
            last_name: row.last_name,
            suffix_name: row.suffix_name ?? '',
            email: row.email ?? '',
            password: '',
            status: row.is_active ? 'active' : 'inactive',
        });
        setShowPassword(false);
        setSubjectListOpen(false);
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        setSubmitError('');
        const url = editing ? route('admin.students') + '/' + editing.id : route('admin.students');
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
            onError: (formErrors) => {
                const firstError = Object.values(formErrors)[0];
                setSubmitError(firstError || 'Unable to save student. Please check the form fields.');
            },
        });
    };

    const editFromDetails = () => {
        if (!viewing) {
            return;
        }

        openEdit(viewing);
    };

    const changeBranch = (branchId = '') => {
        router.get(route('admin.students'), { ...filters, branch_id: branchId, department_id: '', program_id: '' }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeDepartmentFilter = (departmentId) => {
        router.get(route('admin.students'), { ...filters, department_id: departmentId, program_id: '' }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeProgramFilter = (programId) => {
        router.get(route('admin.students'), { ...filters, program_id: programId }, {
            preserveState: true,
            replace: true,
        });
    };

    const filterActions = (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <SelectInput
                value={selectedFilterDepartmentId}
                onChange={(e) => changeDepartmentFilter(e.target.value)}
                className="w-full md:w-56"
            >
                <option value="">All departments</option>
                {filterDepartments.map((department) => (
                    <option key={department.id} value={department.id}>{department.name}</option>
                ))}
            </SelectInput>
            <SelectInput
                value={selectedFilterProgramId}
                onChange={(e) => changeProgramFilter(e.target.value)}
                disabled={!selectedFilterDepartmentId}
                className="w-full md:w-56"
            >
                <option value="">All programs</option>
                {filterPrograms.map((program) => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                ))}
            </SelectInput>
        </div>
    );

    const columns = [
        { key: 'student_no', label: 'Student No.' },
        { key: 'full_name', label: 'Full Name', render: (row) => `${row.last_name}, ${row.first_name} ${row.middle_name ?? ''}`.trim() },
        { key: 'branch', label: 'Branch', render: (row) => row.branch?.name ?? '-' },
        { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
        { key: 'program', label: 'Program/Strand', render: (row) => getProgramStrandLabel(row) },
        { key: 'status', label: 'Status', render: (row) => <StatusBadge active={row.is_active} activeLabel={row.status ?? 'Active'} inactiveLabel="Inactive" /> },
    ];

    return (
        <AdminLayout title="Students" activeRoute="admin.students" breadcrumbs={['User Management']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Students</h2>
                    <p className="text-sm text-slate-500">Student directory, section membership, and evaluation eligibility.</p>
                </div>
                <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Student</button>
            </div>

            {!isBranchAdmin && branches.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => changeBranch('')}
                        className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${!filters.branch_id ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                    >
                        Overall Branch
                    </button>
                    {branches.map((branch) => (
                        <button
                            key={branch.id}
                            type="button"
                            onClick={() => changeBranch(branch.id)}
                            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${String(filters.branch_id ?? '') === String(branch.id) ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                        >
                            {branch.name}
                        </button>
                    ))}
                </div>
            )}

            <ResourceTable
                columns={columns}
                data={students}
                filters={filters}
                routeName="admin.students"
                searchPlaceholder="Search by name or student no..."
                onRowClick={openView}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                extraHeaderActions={filterActions}
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Student Information" width="max-w-xl">
                {viewing && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Student</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                {[viewing.first_name, viewing.middle_name, viewing.last_name].filter(Boolean).join(' ')}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.student_no ?? '-'}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">First Name</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.first_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Middle Name</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.middle_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last Name</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.last_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suffix</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.suffix_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.email ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                                <div className="mt-1">
                                    <StatusBadge active={viewing.is_active} activeLabel={viewing.status ?? 'Active'} inactiveLabel="Inactive" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.branch?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.department?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program/Strand</p>
                                <p className="mt-1 text-sm text-slate-900">{getProgramStrandLabel(viewing)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year Level</p>
                                <p className="mt-1 text-sm text-slate-900">
                                    {viewing.yearLevel ? `${viewing.yearLevel.year_level} - ${viewing.yearLevel.section}` : '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Irregular</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.is_irreg ? 'Yes' : 'No'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Removed Regular Subjects</p>
                                {Array.isArray(viewing.removed_subjects) && viewing.removed_subjects.length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                        {viewing.removed_subjects.map((subject) => (
                                            <div key={subject.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                                                <p className="text-xs text-slate-500">{subject.code || 'No subject code'} | {subject.teacher_name || 'No teacher assigned'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-slate-900">-</p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Irregular Subjects</p>
                                {Array.isArray(viewing.irregular_subjects) && viewing.irregular_subjects.length > 0 ? (
                                    <div className="mt-2 space-y-2">
                                        {viewing.irregular_subjects.map((subject) => (
                                            <div key={subject.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                                                <p className="text-xs text-slate-500">{subject.code || 'No subject code'} | {subject.teacher_name || 'No teacher assigned'}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-slate-900">-</p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDetailOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Close</button>
                            <button type="button" onClick={editFromDetails} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">Edit Student</button>
                        </div>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Student' : 'New Student'} width="max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    {(submitError || Object.keys(errors).length > 0) && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {submitError || 'Please review the highlighted fields and try again.'}
                        </div>
                    )}

                    <FormField label="Student No." error={errors.student_no} required>
                        <TextInput value={generatedStudentCode} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
                    </FormField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="First Name" error={errors.first_name} required>
                            <TextInput value={data.first_name} onChange={(e) => setData('first_name', e.target.value)} />
                        </FormField>
                        <FormField label="Middle Name" error={errors.middle_name}>
                            <TextInput value={data.middle_name} onChange={(e) => setData('middle_name', e.target.value)} />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Last Name" error={errors.last_name} required>
                            <TextInput value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} />
                        </FormField>
                        <FormField label="Suffix" error={errors.suffix_name}>
                            <TextInput value={data.suffix_name} onChange={(e) => setData('suffix_name', e.target.value)} placeholder="Jr., Sr., III" />
                        </FormField>
                    </div>

                    <FormField label="Branch" error={errors.branch_id}>
                        {isBranchAdmin ? (
                            <TextInput value={selectedBranch?.name ?? ''} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
                        ) : (
                            <SelectInput
                                value={data.branch_id}
                                onChange={(e) => handleBranchChange(e.target.value)}
                            >
                                <option value="">Select branch...</option>
                                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </SelectInput>
                        )}
                    </FormField>

                    <FormField label="Department" error={errors.department_id}>
                        <SelectInput
                            value={data.department_id}
                            onChange={(e) => handleDepartmentChange(e.target.value)}
                            disabled={!data.branch_id}
                        >
                            <option value="">{data.branch_id ? 'Select department...' : 'Select branch first...'}</option>
                            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                        </SelectInput>
                    </FormField>

                    {supportsProgram && (
                        <FormField label="Program" error={errors.program_id}>
                            <SelectInput
                                value={data.program_id}
                                onChange={(e) => handleProgramChange(e.target.value)}
                                disabled={!data.department_id}
                            >
                                <option value="">Select program...</option>
                                {filteredPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    {supportsStrand && (
                        <FormField label="Strand" error={errors.strand_id}>
                            <SelectInput value={data.strand_id} onChange={(e) => setData('strand_id', e.target.value)} disabled={!data.department_id}>
                                <option value="">Select strand...</option>
                                {filteredStrands.map((strand) => <option key={strand.id} value={strand.id}>{strand.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    <FormField label="Year Level" error={errors.year_level_id}>
                        <SelectInput
                            value={data.year_level_id}
                            onChange={(e) => {
                                const nextYearLevelId = e.target.value;
                                setData('year_level_id', nextYearLevelId);
                                setData('removed_subject_ids', []);
                                setData('irreg_subject_ids', []);
                                setData('irreg_subject_teacher_ids', {});
                            }}
                            disabled={!data.department_id || (supportsProgram && !data.program_id) || (!supportsProgram && !supportsStrand && !showYearLevelOnly && !data.department_id)}
                        >
                            <option value="">Not assigned</option>
                            {filteredYearLevels.map((yearLevel) => <option key={yearLevel.id} value={yearLevel.id}>{yearLevel.name}</option>)}
                        </SelectInput>
                    </FormField>

                    {data.year_level_id && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Selected year level subjects</p>
                                    <p className="text-xs text-slate-500">
                                        {selectedYearLevelSubjects.length > 0
                                            ? `${activeRegularSubjectIds.length} active subject(s), ${removedRegularSubjects.length} removed subject(s).`
                                            : 'No subjects are assigned to this year level yet.'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openSubjectViewer('year-level')}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                >
                                    View All Subjects
                                </button>
                            </div>
                        </div>
                    )}

                    {canShowIrregularControls && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Irregular Student</p>
                                        <p className="text-xs text-slate-500">Turn this on if the student should be treated as irregular.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const nextValue = !data.is_irreg;
                                            setData('is_irreg', nextValue);
                                            if (!nextValue) {
                                                setData('irreg_subject_ids', []);
                                                setData('irreg_subject_teacher_ids', {});
                                            }
                                        }}
                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${data.is_irreg ? 'bg-slate-900' : 'bg-slate-300'}`}
                                        aria-pressed={data.is_irreg}
                                    >
                                        <span
                                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${data.is_irreg ? 'translate-x-6' : 'translate-x-1'}`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {data.is_irreg && (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">Selected irregular subjects</p>
                                            <p className="text-xs text-slate-500">
                                                {selectedIrregularSubjectIds.length > 0
                                                    ? `${selectedIrregularSubjectIds.length} irregular subject(s) selected for this student.`
                                                    : 'No irregular subjects are selected yet.'}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openSubjectViewer('irregular')}
                                            disabled={!data.program_id}
                                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Manage Irregular Subjects
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <FormField label="Email" error={errors.email} required>
                        <TextInput type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    </FormField>

                    <FormField label={editing ? 'New Password (leave blank to keep)' : 'Password'} error={errors.password}>
                        <div className="relative">
                            <TextInput
                                type={showPassword ? 'text' : 'password'}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder={editing ? '••••••••' : 'Defaults to hcc1234'}
                                className="pr-11"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((value) => !value)}
                                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 transition hover:text-slate-700"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                <AppIcon name={showPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                            </button>
                        </div>
                    </FormField>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <SlideOver open={subjectListOpen} onClose={() => setSubjectListOpen(false)} title={activeSubjectScopeLabel} width="max-w-lg">
                <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            {subjectListMode === 'irregular' ? 'Program' : 'Year Level'}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                            {subjectListMode === 'irregular'
                                ? (filteredPrograms.find((program) => String(program.id) === String(data.program_id))?.name ?? 'Not assigned')
                                : (selectedYearLevel?.name ?? 'Not assigned')}
                        </p>
                    </div>

                    {(subjectListMode === 'irregular'
                        ? irregularAvailableSubjects
                        : selectedYearLevelSubjects
                    ).length > 0 ? (
                        <div className="space-y-2">
                            {(subjectListMode === 'irregular'
                                ? irregularAvailableSubjects
                                : selectedYearLevelSubjects
                            ).map((subject) => {
                                const subjectKey = String(subject.id);
                                const teacherOptions = (subject.teacher_id ?? [])
                                    .map((teacherId) => teachers.find((teacher) => String(teacher.id) === String(teacherId)))
                                    .filter(Boolean);

                                return (
                                    <div key={subject.id} className="rounded-lg border border-slate-200 px-4 py-3">
                                        <label className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={subjectListMode === 'irregular'
                                                    ? selectedIrregularSubjectIds.includes(subjectKey)
                                                    : !removedSubjectIds.includes(subjectKey)}
                                                onChange={() => (
                                                    subjectListMode === 'irregular'
                                                        ? toggleIrregularSubject(subject.id)
                                                        : toggleRegularSubject(subject.id)
                                                )}
                                                className="mt-1 rounded border-slate-300"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                                                <p className="text-xs text-slate-500">{subject.code || 'No subject code'}</p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    {getAssignedTeacherLabel(subject, subjectListMode === 'irregular' ? 'irregular' : 'year-level').label}: {getAssignedTeacherLabel(subject, subjectListMode === 'irregular' ? 'irregular' : 'year-level').value}
                                                </p>
                                            </div>
                                        </label>

                                        {subjectListMode === 'irregular' && selectedIrregularSubjectIds.includes(subjectKey) ? (
                                            <div className="mt-3 pl-7">
                                                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">Assigned Teacher</p>
                                                <SelectInput
                                                    value={String(data.irreg_subject_teacher_ids?.[subjectKey] ?? '')}
                                                    onChange={(e) => setData('irreg_subject_teacher_ids', {
                                                        ...(data.irreg_subject_teacher_ids ?? {}),
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
                    ) : (
                        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                            {subjectListMode === 'irregular'
                                ? 'No irregular subjects are available for the selected program.'
                                : 'No subjects are assigned to this year level yet.'}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setSubjectListOpen(false)}
                        className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                    >
                        Close
                    </button>
                </div>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.students') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Student" message={`Delete student "${deleteTarget?.first_name} ${deleteTarget?.last_name}"?`} />
        </AdminLayout>
    );
}
