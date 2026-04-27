import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import useFormDirty from '@/Components/Admin/useFormDirty';
import AppIcon from '@/Components/AppIcon';
import AppConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

const buildStudentCode = (branch, nextStudentCodes = {}) => {
    if (!branch?.code) {
        return nextStudentCodes.default ?? 'STU-GEN-00001';
    }

    return nextStudentCodes[String(branch.id)] ?? `STU-${String(branch.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-00001`;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());

const stripCampusSuffix = (value) => String(value ?? '').replace(/\s*-\s*(Santa Rosa|Concepcion)\s*$/i, '').trim();

const DEPARTMENT_FILTERS = [
    { type: 'college', label: 'College Department' },
    { type: 'senior-high', label: 'Senior High Department' },
    { type: 'junior-high', label: 'Junior High Department' },
];

const LEVEL_FILTER_PRESETS = {
    college: [
        { value: '1', label: '1st Year' },
        { value: '2', label: '2nd Year' },
        { value: '3', label: '3rd Year' },
        { value: '4', label: '4th Year' },
        { value: '5', label: '5th Year' },
    ],
    'senior-high': [
        { value: '11', label: 'Grade 11' },
        { value: '12', label: 'Grade 12' },
    ],
    'junior-high': [
        { value: '7', label: 'Grade 7' },
        { value: '8', label: 'Grade 8' },
        { value: '9', label: 'Grade 9' },
        { value: '10', label: 'Grade 10' },
    ],
};

const STUDENT_CSV_TEMPLATE_COLUMNS = [
    'First Name',
    'Middle Name',
    'Last Name',
    'Branch',
    'Department',
    'Program',
    'Strand',
    'Year Level',
    'Email',
    'Password',
    'Status',
];

const CSV_REQUIRED_COLUMNS = ['First Name', 'Last Name', 'Email'];

const normalizeCsvKey = (value) => String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeCsvValue = (value) => stripCampusSuffix(String(value ?? ''))
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const parseCsvText = (text) => {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];

        if (char === '"') {
            if (quoted && next === '"') {
                value += '"';
                i += 1;
            } else {
                quoted = !quoted;
            }
        } else if (char === ',' && !quoted) {
            row.push(value);
            value = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
            if (char === '\r' && next === '\n') {
                i += 1;
            }
            row.push(value);
            if (row.some((cell) => String(cell).trim() !== '')) {
                rows.push(row);
            }
            row = [];
            value = '';
        } else {
            value += char;
        }
    }

    row.push(value);
    if (row.some((cell) => String(cell).trim() !== '')) {
        rows.push(row);
    }

    return rows;
};

const uniqueBy = (items, keyFn) => {
    const seen = new Set();

    return items.filter((item) => {
        const key = keyFn(item);
        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

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

    if (departmentName.includes('junior high')) {
        return 'N/A';
    }

    return '-';
};

const getDepartmentType = (department) => {
    const departmentName = String(department?.name ?? '').toLowerCase();
    const departmentCode = String(department?.code ?? '').toLowerCase();

    if (departmentName.includes('college') || departmentCode.includes('col')) {
        return 'college';
    }

    if (departmentName.includes('senior high') || departmentCode.includes('shs')) {
        return 'senior-high';
    }

    if (departmentName.includes('junior high') || departmentCode.includes('jhs')) {
        return 'junior-high';
    }

    return null;
};

const getYearLevelLabel = (level) => {
    if (!level) {
        return '';
    }

    const year = String(level.year_level ?? '').trim();
    const section = String(level.section ?? '').trim();
    const prefix = Number(year) >= 7 ? `Grade ${year}` : year;

    return [prefix, section].filter(Boolean).join(' - ');
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
    const { props } = usePage();
    const flash = props.flash ?? {};
    const importErrorsList = Array.isArray(flash.import_errors) ? flash.import_errors : [];
    const fileInputRef = useRef(null);
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [studentPortalOpen, setStudentPortalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [emailCheck, setEmailCheck] = useState({ status: 'idle', message: '' });
    const [subjectListOpen, setSubjectListOpen] = useState(false);
    const [subjectListMode, setSubjectListMode] = useState('year-level');
    const [subjectSearch, setSubjectSearch] = useState('');
    const [irregularProgramId, setIrregularProgramId] = useState('');
    const [createDraft, setCreateDraft] = useState(null);
    const [editDrafts, setEditDrafts] = useState({});
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const selectedFilterBranchId = String(filters.branch_id ?? activeBranchId ?? '');
    const selectedFilterDepartmentType = String(filters.department_type ?? '');
    const selectedFilterProgramName = String(filters.program_name ?? '');
    const selectedFilterStrandName = String(filters.strand_name ?? '');
    const selectedFilterYearLevel = String(filters.year_level ?? '');

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
    const importForm = useForm({
        file: null,
    });
    const [csvInspection, setCsvInspection] = useState({
        status: 'idle',
        rows: 0,
        errors: [],
        warnings: [],
    });

    const { isDirty: studentIsDirty } = useFormDirty(data, editing?.id ?? 'new');
    const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
    const emailError = emailCheck.status === 'taken' ? emailCheck.message : errors.email;
    const emailIsUnavailable = emailCheck.status === 'checking' || emailCheck.status === 'taken';

    const selectedBranch = useMemo(
        () => branches.find((branch) => String(branch.id) === String(data.branch_id)),
        [branches, data.branch_id],
    );
    const csvReferenceRows = useMemo(() => {
        const branchRows = branches.map((branch) => `Branch: ${branch.name}`);
        const departmentRows = departments.map((department) => `Department: ${department.name}`);
        const programRows = programs.map((program) => `Program: ${stripCampusSuffix(program.name)}`);
        const strandRows = strands.map((strand) => `Strand: ${stripCampusSuffix(strand.name)}`);
        const yearLevelRows = yearLevels.map((level) => `Year Level: ${getYearLevelLabel(level)}`);

        return uniqueBy([
            ...branchRows,
            ...departmentRows,
            ...programRows,
            ...strandRows,
            ...yearLevelRows,
        ].filter(Boolean), (row) => row.toLowerCase()).slice(0, 80);
    }, [branches, departments, programs, strands, yearLevels]);
    const existingStudentEmails = useMemo(
        () => new Set((students?.data ?? []).map((student) => normalizeCsvValue(student.email)).filter(Boolean)),
        [students],
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
    const branchFilterDepartments = useMemo(
        () => departments.filter((department) => (
            (!selectedFilterBranchId || String(department.branch_id) === selectedFilterBranchId)
            && Boolean(department.is_activated)
        )),
        [departments, selectedFilterBranchId],
    );
    const filterDepartments = useMemo(
        () => DEPARTMENT_FILTERS.filter((option) => branchFilterDepartments.some((department) => getDepartmentType(department) === option.type)),
        [branchFilterDepartments],
    );
    const filteredPrograms = useMemo(
        () => programs.filter((program) => !data.department_id || String(program.department_id) === String(data.department_id)),
        [programs, data.department_id],
    );
    const filterPrograms = useMemo(
        () => uniqueBy(
            programs.filter((program) => {
                const department = departments.find((item) => String(item.id) === String(program.department_id));
                return (!selectedFilterBranchId || String(department?.branch_id) === selectedFilterBranchId)
                    && (!selectedFilterDepartmentType || getDepartmentType(department) === selectedFilterDepartmentType);
            }),
            (program) => stripCampusSuffix(program.name).toLowerCase(),
        ),
        [departments, programs, selectedFilterBranchId, selectedFilterDepartmentType],
    );
    const filterStrands = useMemo(
        () => uniqueBy(
            strands.filter((strand) => {
                const department = departments.find((item) => String(item.id) === String(strand.department_id));
                return (!selectedFilterBranchId || String(department?.branch_id) === selectedFilterBranchId)
                    && (!selectedFilterDepartmentType || getDepartmentType(department) === selectedFilterDepartmentType);
            }),
            (strand) => stripCampusSuffix(strand.name).toLowerCase(),
        ),
        [departments, selectedFilterBranchId, selectedFilterDepartmentType, strands],
    );
    const filterLevelPresets = useMemo(
        () => LEVEL_FILTER_PRESETS[selectedFilterDepartmentType] ?? [],
        [selectedFilterDepartmentType],
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
    const allIrregularAllowedSubjects = useMemo(
        () => {
            if (!data.program_id) {
                return [];
            }

            return subjects.filter((subject) => {
                const matchesDepartment = String(subject.department_id ?? '') === String(data.department_id);
                const matchesActiveProgram = String(subject.program_id ?? '') === String(data.program_id);

                return matchesDepartment && (
                    Boolean(subject.is_gened)
                    || (!subject.is_gened && matchesActiveProgram)
                );
            });
        },
        [data.department_id, data.program_id, subjects],
    );
    const selectedProgramSubjects = useMemo(
        () => {
            const filterProgramId = irregularProgramId || data.program_id;

            if (!filterProgramId) {
                return [];
            }

            return allIrregularAllowedSubjects.filter((subject) => {
                const matchesFilterProgram = String(subject.program_id ?? '') === String(filterProgramId);
                const isActiveProgramFilter = String(filterProgramId) === String(data.program_id);

                if (Boolean(subject.is_gened)) {
                    return !subject.program_id || matchesFilterProgram;
                }

                return isActiveProgramFilter && matchesFilterProgram;
            });
        },
        [allIrregularAllowedSubjects, data.program_id, irregularProgramId],
    );
    const selectedDepartmentType = getDepartmentType(selectedDepartment);
    const isCollegeDepartment = selectedDepartmentType === 'college';
    const isSeniorHighDepartment = selectedDepartmentType === 'senior-high';
    const isJuniorHighDepartment = selectedDepartmentType === 'junior-high';
    const supportsProgram = isCollegeDepartment;
    const supportsStrand = isSeniorHighDepartment;
    const showYearLevelOnly = isJuniorHighDepartment;
    const generatedStudentCode = editing ? data.student_no : buildStudentCode(selectedBranch, nextStudentCodes);
    const canShowIrregularControls = supportsProgram && Boolean(data.department_id);
    const requiredStudentFieldsComplete = useMemo(() => {
        const email = String(data.email ?? '').trim();

        return Boolean(
            String(data.branch_id ?? '').trim()
            && String(data.department_id ?? '').trim()
            && String(data.first_name ?? '').trim()
            && String(data.last_name ?? '').trim()
            && isValidEmail(email)
            && !emailIsUnavailable
        );
    }, [data.branch_id, data.department_id, data.email, data.first_name, data.last_name, emailIsUnavailable]);
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
    const allIrregularAvailableSubjects = useMemo(
        () => allIrregularAllowedSubjects.filter((subject) => !regularSubjectIds.includes(String(subject.id))),
        [allIrregularAllowedSubjects, regularSubjectIds],
    );
    const selectedIrregularSubjects = useMemo(
        () => allIrregularAvailableSubjects.filter((subject) => selectedIrregularSubjectIds.includes(String(subject.id))),
        [allIrregularAvailableSubjects, selectedIrregularSubjectIds],
    );
    const visibleSubjectList = useMemo(() => {
        const source = subjectListMode === 'irregular'
            ? irregularAvailableSubjects
            : selectedYearLevelSubjects;
        const query = subjectListMode === 'irregular'
            ? subjectSearch.trim().toLowerCase()
            : '';

        if (!query) {
            return source;
        }

        return source.filter((subject) => {
            const teacherText = getAssignedTeacherLabel(subject, 'irregular').value;
            return [
                subject.name,
                subject.code,
                teacherText,
            ].some((value) => String(value ?? '').toLowerCase().includes(query));
        });
    }, [irregularAvailableSubjects, selectedYearLevelSubjects, subjectListMode, subjectSearch, data.irreg_subject_teacher_ids, selectedYearLevelTeacherMap, teacherMap]);

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
        const email = String(data.email ?? '').trim();

        if (!slideOpen || !email || !isValidEmail(email)) {
            setEmailCheck({ status: 'idle', message: '' });
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => {
            setEmailCheck({ status: 'checking', message: 'Checking email...' });
            axios
                .get(route('admin.students.email-availability'), {
                    params: {
                        email,
                        student_id: editing?.id ?? '',
                    },
                    signal: controller.signal,
                })
                .then((response) => {
                    setEmailCheck({
                        status: response.data.available ? 'available' : 'taken',
                        message: response.data.message ?? '',
                    });
                })
                .catch((error) => {
                    if (axios.isCancel(error) || error.name === 'CanceledError') {
                        return;
                    }

                    setEmailCheck({ status: 'idle', message: '' });
                });
        }, 350);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [data.email, editing?.id, slideOpen]);

    useEffect(() => {
        if (removedSubjectIds.some((id) => !regularSubjectIds.includes(id))) {
            setData('removed_subject_ids', removedSubjectIds.filter((id) => regularSubjectIds.includes(id)));
        }
    }, [regularSubjectIds, removedSubjectIds, setData]);

    useEffect(() => {
        const validIrregularIds = selectedIrregularSubjectIds.filter((id) => allIrregularAvailableSubjects.some((subject) => String(subject.id) === id));

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
    }, [allIrregularAvailableSubjects, data.irreg_subject_teacher_ids, selectedIrregularSubjectIds, setData]);

    useEffect(() => {
        if (!data.program_id) {
            setIrregularProgramId('');
            return;
        }

        if (!irregularProgramId || !filteredPrograms.some((program) => String(program.id) === String(irregularProgramId))) {
            setIrregularProgramId(String(data.program_id));
        }
    }, [data.program_id, filteredPrograms, irregularProgramId]);

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
        setIrregularProgramId(programId);
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
        setSubjectSearch('');
        if (mode === 'irregular') {
            setIrregularProgramId(String(irregularProgramId || data.program_id || ''));
        }
        setSubjectListOpen(true);
    };

    const closeSlideOver = () => {
        const draft = {
            student_no: data.student_no,
            branch_id: data.branch_id,
            department_id: data.department_id,
            program_id: data.program_id,
            strand_id: data.strand_id,
            year_level_id: data.year_level_id,
            removed_subject_ids: data.removed_subject_ids,
            is_irreg: data.is_irreg,
            irreg_subject_ids: data.irreg_subject_ids,
            irreg_subject_teacher_ids: data.irreg_subject_teacher_ids,
            first_name: data.first_name,
            middle_name: data.middle_name,
            last_name: data.last_name,
            suffix_name: data.suffix_name,
            email: data.email,
            password: data.password,
            status: data.status,
        };

        if (editing) {
            setEditDrafts((drafts) => ({
                ...drafts,
                [editing.id]: draft,
            }));
        } else {
            setCreateDraft(draft);
        }

        setSubjectListOpen(false);
        setSlideOpen(false);
    };
    const cancelSlideOver = () => {
        if (editing) {
            setEditDrafts((drafts) => {
                const nextDrafts = { ...drafts };
                delete nextDrafts[editing.id];
                return nextDrafts;
            });
        } else {
            setCreateDraft(null);
        }

        setSubjectListOpen(false);
        setSlideOpen(false);
        reset();
    };

    const openCreate = () => {
        const draft = createDraft ?? {};

        reset();
        setSubmitError('');
        setEmailCheck({ status: 'idle', message: '' });
        setDetailOpen(false);
        setViewing(null);
        setData({
            student_no: draft.student_no ?? '',
            branch_id: draft.branch_id ?? activeBranchId,
            department_id: draft.department_id ?? '',
            program_id: draft.program_id ?? '',
            strand_id: draft.strand_id ?? '',
            year_level_id: draft.year_level_id ?? '',
            removed_subject_ids: draft.removed_subject_ids ?? [],
            is_irreg: draft.is_irreg ?? false,
            irreg_subject_ids: draft.irreg_subject_ids ?? [],
            irreg_subject_teacher_ids: draft.irreg_subject_teacher_ids ?? {},
            first_name: draft.first_name ?? '',
            middle_name: draft.middle_name ?? '',
            last_name: draft.last_name ?? '',
            suffix_name: draft.suffix_name ?? '',
            email: draft.email ?? '',
            password: draft.password ?? '',
            status: draft.status ?? 'active',
        });
        setIrregularProgramId(String(draft.program_id ?? ''));
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
        const draft = editDrafts[row.id] ?? {};

        setSubmitError('');
        setEmailCheck({ status: 'idle', message: '' });
        setDetailOpen(false);
        setViewing(null);
        setData({
            student_no: draft.student_no ?? row.student_no,
            branch_id: draft.branch_id ?? String(row.branch_id ?? ''),
            department_id: draft.department_id ?? String(row.department_id ?? ''),
            program_id: draft.program_id ?? String(row.program_id ?? ''),
            strand_id: draft.strand_id ?? String(row.strand_id ?? ''),
            year_level_id: draft.year_level_id ?? String(row.year_level_id ?? ''),
            removed_subject_ids: draft.removed_subject_ids ?? Object.keys(parseTeacherMap(row.removed_subject_map)),
            is_irreg: draft.is_irreg ?? Boolean(row.is_irreg),
            irreg_subject_ids: draft.irreg_subject_ids ?? Object.keys(parseTeacherMap(row.irreg_subject_map)),
            irreg_subject_teacher_ids: draft.irreg_subject_teacher_ids ?? Object.fromEntries(
                Object.entries(parseTeacherMap(row.irreg_subject_map)).map(([subjectId, teacherId]) => [String(subjectId), String(teacherId ?? '')])
            ),
            first_name: draft.first_name ?? row.first_name,
            middle_name: draft.middle_name ?? row.middle_name ?? '',
            last_name: draft.last_name ?? row.last_name,
            suffix_name: draft.suffix_name ?? row.suffix_name ?? '',
            email: draft.email ?? row.email ?? '',
            password: draft.password ?? '',
            status: draft.status ?? (row.is_active ? 'active' : 'inactive'),
        });
        setIrregularProgramId(String(draft.program_id ?? row.program_id ?? ''));
        setShowPassword(false);
        setSubjectListOpen(false);
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        if (emailIsUnavailable) return;
        if (!requiredStudentFieldsComplete) return;
        if (editing && !studentIsDirty) return;
        if (editing) {
            setConfirmUpdateOpen(true);
            return;
        }
        performSave();
    };

    const performSave = () => {
        setSubmitError('');
        const url = editing ? route('admin.students') + '/' + editing.id : route('admin.students');
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                const savedEditingId = editing?.id;

                setSlideOpen(false);
                setConfirmUpdateOpen(false);
                if (savedEditingId) {
                    setEditDrafts((drafts) => {
                        const nextDrafts = { ...drafts };
                        delete nextDrafts[savedEditingId];
                        return nextDrafts;
                    });
                } else {
                    setCreateDraft(null);
                }
                reset();
            },
            onError: (formErrors) => {
                const firstError = Object.values(formErrors)[0];
                setSubmitError(firstError || 'Unable to save student. Please check the form fields.');
                setConfirmUpdateOpen(false);
            },
        });
    };

    const closeBulkUpload = () => {
        setBulkUploadOpen(false);
        importForm.reset();
        importForm.clearErrors();
        setCsvInspection({ status: 'idle', rows: 0, errors: [], warnings: [] });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const inspectStudentCsvText = (text) => {
        const rows = parseCsvText(text);
        const errors = [];
        const warnings = [];

        if (rows.length === 0) {
            return { status: 'error', rows: 0, errors: ['CSV is empty.'], warnings: [] };
        }

        const header = rows[0].map((cell) => normalizeCsvKey(cell));
        const columnIndex = (names) => names
            .map((name) => header.indexOf(normalizeCsvKey(name)))
            .find((index) => index >= 0);
        const getCell = (row, names) => {
            const index = columnIndex(Array.isArray(names) ? names : [names]);
            return index >= 0 ? String(row[index] ?? '').trim() : '';
        };
        const requiredHeaders = CSV_REQUIRED_COLUMNS
            .filter((column) => columnIndex([column]) === undefined)
            .map((column) => `"${column}"`);

        if (requiredHeaders.length > 0) {
            errors.push(`Missing required column(s): ${requiredHeaders.join(', ')}.`);
        }

        const findByValue = (items, value, labelFn, scopedFn = () => true) => {
            const normalized = normalizeCsvValue(value);
            if (!normalized) {
                return null;
            }

            if (/^\d+$/.test(String(value).trim())) {
                return items.find((item) => String(item.id) === String(value).trim()) ?? null;
            }

            const matches = items.filter((item) => scopedFn(item)).filter((item) => (
                [labelFn(item), item.name, item.code]
                    .filter(Boolean)
                    .map((label) => normalizeCsvValue(label))
                    .includes(normalized)
            ));

            return matches.length === 1 ? matches[0] : null;
        };

        const seenEmails = new Map();

        rows.slice(1).forEach((row, index) => {
            const rowNum = index + 2;
            const firstName = getCell(row, 'First Name');
            const lastName = getCell(row, 'Last Name');
            const email = getCell(row, 'Email');
            const branchValue = getCell(row, ['Branch', 'Branch ID']);
            const departmentValue = getCell(row, ['Department', 'Department ID']);
            const programValue = getCell(row, ['Program', 'Program ID']);
            const strandValue = getCell(row, ['Strand', 'Strand ID']);
            const yearLevelValue = getCell(row, ['Year Level', 'Year Level ID']);

            if (!firstName) {
                errors.push(`Row ${rowNum}: First Name is required.`);
            }
            if (!lastName) {
                errors.push(`Row ${rowNum}: Last Name is required.`);
            }
            if (!email) {
                errors.push(`Row ${rowNum}: Email is required.`);
            } else if (!isValidEmail(email)) {
                errors.push(`Row ${rowNum}: Email is not valid.`);
            } else {
                const normalizedEmail = normalizeCsvValue(email);
                if (seenEmails.has(normalizedEmail)) {
                    errors.push(`Row ${rowNum}: Email duplicates row ${seenEmails.get(normalizedEmail)}.`);
                }
                if (existingStudentEmails.has(normalizedEmail)) {
                    warnings.push(`Row ${rowNum}: Email already appears in the current students list; server will reject it if it already exists.`);
                }
                seenEmails.set(normalizedEmail, rowNum);
            }

            const branch = scopedBranchId
                ? branches.find((item) => String(item.id) === String(scopedBranchId))
                : findByValue(branches, branchValue, (item) => item.name);
            const department = findByValue(
                departments,
                departmentValue,
                (item) => item.name,
                (item) => !branch || String(item.branch_id) === String(branch.id),
            );
            const program = findByValue(
                programs,
                programValue,
                (item) => stripCampusSuffix(item.name),
                (item) => !department || String(item.department_id) === String(department.id),
            );
            const strand = findByValue(
                strands,
                strandValue,
                (item) => stripCampusSuffix(item.name),
                (item) => !department || String(item.department_id) === String(department.id),
            );
            const yearLevel = findByValue(
                yearLevels,
                yearLevelValue,
                getYearLevelLabel,
                (item) => (
                    (!department || String(item.department_id) === String(department.id))
                    && (!program || String(item.program_id ?? '') === String(program.id))
                    && (!strand || String(item.strand_id ?? '') === String(strand.id))
                ),
            );

            if (!scopedBranchId && branchValue && !branch) {
                errors.push(`Row ${rowNum}: Branch was not found.`);
            }
            if (departmentValue && !department) {
                errors.push(`Row ${rowNum}: Department was not found or does not match the branch.`);
            }
            if (programValue && !program) {
                errors.push(`Row ${rowNum}: Program was not found or does not match the department.`);
            }
            if (strandValue && !strand) {
                errors.push(`Row ${rowNum}: Strand was not found or does not match the department.`);
            }
            if (yearLevelValue && !yearLevel) {
                errors.push(`Row ${rowNum}: Year Level was not found or does not match the department/program/strand.`);
            }
            if (!branchValue && !scopedBranchId) {
                warnings.push(`Row ${rowNum}: Branch is blank, so the student number will use the generic STU-GEN prefix.`);
            }
        });

        const dataRows = Math.max(rows.length - 1, 0);

        if (dataRows === 0) {
            errors.push('CSV has a header but no student rows.');
        }

        return {
            status: errors.length > 0 ? 'error' : 'ready',
            rows: dataRows,
            errors,
            warnings,
        };
    };

    const inspectStudentCsvFile = (file) => {
        setCsvInspection({ status: 'idle', rows: 0, errors: [], warnings: [] });

        if (!file) {
            return;
        }

        setCsvInspection({ status: 'checking', rows: 0, errors: [], warnings: [] });

        const reader = new FileReader();
        reader.onload = () => setCsvInspection(inspectStudentCsvText(String(reader.result ?? '')));
        reader.onerror = () => setCsvInspection({
            status: 'error',
            rows: 0,
            errors: ['Unable to read the selected CSV file.'],
            warnings: [],
        });
        reader.readAsText(file);
    };

    const handleStudentCsvFileChange = (e) => {
        const file = e.target.files?.[0] ?? null;

        importForm.setData('file', file);
        importForm.clearErrors('file');
        inspectStudentCsvFile(file);
    };

    const copyCsvInspectionMessages = () => {
        const lines = [
            csvInspection.status === 'error'
                ? 'CSV needs changes before upload'
                : `CSV ready: ${csvInspection.rows} student row(s) found`,
            ...csvInspection.errors.map((message) => `Error: ${message}`),
            ...csvInspection.warnings.map((message) => `Warning: ${message}`),
        ];

        navigator.clipboard?.writeText(lines.join('\n'));
    };

    const submitBulkUpload = (e) => {
        e.preventDefault();

        if (csvInspection.status === 'error') {
            return;
        }

        importForm.post(route('admin.import.students'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                closeBulkUpload();
            },
        });
    };

    const downloadStudentCsvTemplate = () => {
        const exampleBranchId = selectedFilterBranchId || activeBranchId || '1';
        const exampleBranch = branches.find((branch) => String(branch.id) === String(exampleBranchId)) ?? branches[0];
        const exampleDepartment = departments.find((department) => (
            !exampleBranchId || String(department.branch_id) === String(exampleBranchId)
        )) ?? departments[0];
        const exampleProgram = programs.find((program) => String(program.department_id) === String(exampleDepartment?.id ?? '')) ?? null;
        const exampleStrand = strands.find((strand) => String(strand.department_id) === String(exampleDepartment?.id ?? '')) ?? null;
        const exampleYearLevel = yearLevels.find((level) => String(level.department_id) === String(exampleDepartment?.id ?? '')) ?? yearLevels[0];
        const rows = [
            STUDENT_CSV_TEMPLATE_COLUMNS,
            [
                'Juan',
                'S',
                'Dela Cruz',
                exampleBranch?.name ?? 'Santa Rosa',
                exampleDepartment?.name ?? 'College Department',
                stripCampusSuffix(exampleProgram?.name ?? ''),
                stripCampusSuffix(exampleStrand?.name ?? ''),
                getYearLevelLabel(exampleYearLevel) || '1st Year - A',
                'juan.delacruz@example.com',
                'hcc1234',
                'active',
            ],
        ];
        const csv = rows
            .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
            .join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = 'student-upload-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const editFromDetails = () => {
        if (!viewing) {
            return;
        }

        openEdit(viewing);
    };

    const changeBranch = (branchId = '') => {
        router.get(route('admin.students'), {
            ...filters,
            branch_id: branchId,
            department_id: '',
            department_type: '',
            program_id: '',
            program_name: '',
            strand_id: '',
            strand_name: '',
            year_level_id: '',
            year_level: '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeDepartmentFilter = (departmentType) => {
        router.get(route('admin.students'), {
            ...filters,
            department_id: '',
            department_type: departmentType,
            program_id: '',
            program_name: '',
            strand_id: '',
            strand_name: '',
            year_level_id: '',
            year_level: '',
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeProgramFilter = (programName) => {
        router.get(route('admin.students'), { ...filters, program_id: '', program_name: programName, strand_id: '', strand_name: '', year_level_id: '', year_level: '' }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeStrandFilter = (strandName) => {
        router.get(route('admin.students'), { ...filters, strand_id: '', strand_name: strandName, program_id: '', program_name: '', year_level_id: '', year_level: '' }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeYearLevelFilter = (yearLevel) => {
        router.get(route('admin.students'), { ...filters, year_level_id: '', year_level: yearLevel }, {
            preserveState: true,
            replace: true,
        });
    };

    const filterActions = (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <SelectInput
                value={selectedFilterDepartmentType}
                onChange={(e) => changeDepartmentFilter(e.target.value)}
                className="w-full md:w-56"
            >
                <option value="">All departments</option>
                {filterDepartments.map((department) => (
                    <option key={department.type} value={department.type}>{department.label}</option>
                ))}
            </SelectInput>
            {selectedFilterDepartmentType === 'college' && (
                <SelectInput
                    value={selectedFilterProgramName}
                    onChange={(e) => changeProgramFilter(e.target.value)}
                    disabled={!selectedFilterDepartmentType}
                    className="w-full md:w-56"
                >
                    <option value="">All programs</option>
                    {filterPrograms.map((program) => (
                        <option key={stripCampusSuffix(program.name)} value={stripCampusSuffix(program.name)}>{stripCampusSuffix(program.name)}</option>
                    ))}
                </SelectInput>
            )}
            {selectedFilterDepartmentType === 'senior-high' && (
                <SelectInput
                    value={selectedFilterStrandName}
                    onChange={(e) => changeStrandFilter(e.target.value)}
                    disabled={!selectedFilterDepartmentType}
                    className="w-full md:w-56"
                >
                    <option value="">All strands</option>
                    {filterStrands.map((strand) => (
                        <option key={stripCampusSuffix(strand.name)} value={stripCampusSuffix(strand.name)}>{stripCampusSuffix(strand.name)}</option>
                    ))}
                </SelectInput>
            )}
            {['college', 'senior-high', 'junior-high'].includes(selectedFilterDepartmentType) && (
                <SelectInput
                    value={selectedFilterYearLevel}
                    onChange={(e) => changeYearLevelFilter(e.target.value)}
                    disabled={!selectedFilterDepartmentType || (selectedFilterDepartmentType === 'college' && !selectedFilterProgramName) || (selectedFilterDepartmentType === 'senior-high' && !selectedFilterStrandName)}
                    className="w-full md:w-56"
                >
                    <option value="">
                        {selectedFilterDepartmentType === 'college'
                            ? 'All year levels'
                            : 'All grade levels'}
                    </option>
                    {filterLevelPresets.map((level) => (
                        <option key={level.value} value={level.value}>
                            {level.label}
                        </option>
                    ))}
                </SelectInput>
            )}
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Students</h2>
                    <p className="text-sm text-slate-500">Student directory, section membership, and evaluation eligibility.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setBulkUploadOpen(true)}
                        className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                        <AppIcon name="upload" className="h-4 w-4 text-slate-700" />
                        Bulk Upload CSV
                    </button>
                    <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Student</button>
                </div>
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

            {importErrorsList.length > 0 && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="font-semibold">Some CSV rows were skipped.</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                        {importErrorsList.map((message, index) => (
                            <li key={`${message}-${index}`}>{message}</li>
                        ))}
                    </ul>
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
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Registered Regular Subjects</p>
                                <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {[
                                        ['Major', viewing.regular_subjects?.major ?? []],
                                        ['Minor', viewing.regular_subjects?.minor ?? []],
                                    ].map(([label, items]) => (
                                        <div key={label}>
                                            <p className="text-sm font-medium text-slate-900">{label}</p>
                                            {items.length > 0 ? (
                                                <div className="mt-2 space-y-2">
                                                    {items.map((subject) => (
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
                                    ))}
                                </div>
                            </div>

                            {viewing.is_irreg && (
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
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDetailOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Close</button>
                            <button type="button" onClick={editFromDetails} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">Edit Student</button>
                        </div>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={closeSlideOver} title={editing ? 'Edit Student' : 'New Student'} width="max-w-xl">
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

                    <FormField label="Email" error={emailError} required>
                        <TextInput
                            type="email"
                            value={data.email}
                            onChange={(e) => {
                                setData('email', e.target.value);
                                clearErrors('email');
                            }}
                        />
                        {emailCheck.status === 'checking' && (
                            <p className="mt-1 text-xs text-slate-500">Checking email...</p>
                        )}
                        {emailCheck.status === 'available' && (
                            <p className="mt-1 text-xs text-emerald-600">Email is available.</p>
                        )}
                    </FormField>

                    <FormField label={editing ? 'New Password (leave blank to keep)' : 'Password'} error={errors.password}>
                        <div className="relative">
                            <TextInput
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                data-lpignore="true"
                                data-1p-ignore="true"
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
                        <button type="button" onClick={cancelSlideOver} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton
                            processing={processing}
                            disabled={!requiredStudentFieldsComplete || (Boolean(editing) && !studentIsDirty)}
                            className="flex-1"
                        >
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <Modal show={subjectListOpen} maxWidth="5xl" onClose={() => setSubjectListOpen(false)}>
                <div className="max-h-[85vh] overflow-y-auto p-6">
                    <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{activeSubjectScopeLabel}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {subjectListMode === 'irregular'
                                    ? 'Select the irregular subjects and assigned teacher for this student.'
                                    : 'Review and manage the active subjects for the selected year level.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSubjectListOpen(false)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close subject list"
                        >
                            <AppIcon name="close" className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                            {subjectListMode === 'irregular' ? (
                                <FormField label="Program" error={errors.program_id}>
                                    <SelectInput
                                        value={irregularProgramId}
                                        onChange={(e) => setIrregularProgramId(e.target.value)}
                                        disabled={!data.department_id}
                                    >
                                        <option value="">Select program...</option>
                                        {filteredPrograms.map((program) => (
                                            <option key={program.id} value={program.id}>{program.name}</option>
                                        ))}
                                    </SelectInput>
                                </FormField>
                            ) : (
                                <>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Year Level</p>
                                    <p className="mt-1 text-sm font-medium text-slate-900">
                                        {selectedYearLevel?.name ?? 'Not assigned'}
                                    </p>
                                </>
                            )}
                        </div>
                        {subjectListMode === 'year-level' && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subject Status</p>
                                <p className="mt-1 text-sm font-medium text-slate-900">
                                    {activeRegularSubjectIds.length} active, {removedRegularSubjects.length} removed
                                </p>
                            </div>
                        )}
                    </div>

                    {subjectListMode === 'irregular' && (
                        <div className="space-y-4">
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Search Subjects
                                </label>
                                <div className="relative">
                                    <AppIcon name="search" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <TextInput
                                        value={subjectSearch}
                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                        placeholder="Search by subject, code, or teacher..."
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Selected Subjects</p>
                                        <p className="text-xs text-slate-500">
                                            {selectedIrregularSubjects.length > 0
                                                ? `${selectedIrregularSubjects.length} subject(s) selected.`
                                                : 'No irregular subjects selected yet.'}
                                        </p>
                                    </div>
                                </div>

                                {selectedIrregularSubjects.length > 0 && (
                                    <div className="mt-3 space-y-2">
                                        {selectedIrregularSubjects.map((subject) => {
                                            const assignedTeacher = getAssignedTeacherLabel(subject, 'irregular-selected');

                                            return (
                                                <div key={subject.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-medium text-slate-900">{subject.name}</p>
                                                        <p className="text-xs text-slate-500">{subject.code || 'No subject code'}</p>
                                                        <p className="mt-1 text-xs text-slate-500">{assignedTeacher.label}: {assignedTeacher.value}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleIrregularSubject(subject.id)}
                                                        className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {visibleSubjectList.length > 0 ? (
                        <div className="space-y-2">
                            {visibleSubjectList.map((subject) => {
                                const subjectKey = String(subject.id);
                                const teacherOptions = (subject.teacher_id ?? [])
                                    .map((teacherId) => teachers.find((teacher) => String(teacher.id) === String(teacherId)))
                                    .filter(Boolean);

                                return (
                                    <div
                                        key={subject.id}
                                        className={[
                                            'rounded-lg border px-4 py-3',
                                            subjectListMode === 'year-level' && removedSubjectIds.includes(subjectKey)
                                                ? 'border-rose-200 bg-rose-50/60'
                                                : 'border-slate-200 bg-white',
                                        ].join(' ')}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <label className="flex min-w-0 flex-1 items-start gap-3">
                                                {subjectListMode === 'irregular' ? (
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIrregularSubjectIds.includes(subjectKey)}
                                                        onChange={() => toggleIrregularSubject(subject.id)}
                                                        className="mt-1 rounded border-slate-300"
                                                    />
                                                ) : null}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="text-sm font-medium text-slate-900">{subject.name}</p>
                                                        {subjectListMode === 'year-level' && removedSubjectIds.includes(subjectKey) ? (
                                                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">Removed</span>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-xs text-slate-500">{subject.code || 'No subject code'}</p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {getAssignedTeacherLabel(subject, subjectListMode === 'irregular' ? 'irregular' : 'year-level').label}: {getAssignedTeacherLabel(subject, subjectListMode === 'irregular' ? 'irregular' : 'year-level').value}
                                                    </p>
                                                </div>
                                            </label>

                                            {subjectListMode === 'year-level' ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleRegularSubject(subject.id)}
                                                    className={[
                                                        'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium',
                                                        removedSubjectIds.includes(subjectKey)
                                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                                            : 'border border-slate-200 text-slate-600 hover:bg-slate-50',
                                                    ].join(' ')}
                                                >
                                                    {removedSubjectIds.includes(subjectKey) ? 'Add' : 'Remove'}
                                                </button>
                                            ) : null}
                                        </div>

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
                                ? (subjectSearch.trim()
                                    ? 'No irregular subjects match your search.'
                                    : 'No irregular subjects are available for the selected program.')
                                : 'No subjects are assigned to this year level yet.'}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => setSubjectListOpen(false)}
                        className={[
                            'w-full rounded-lg py-2 text-sm font-medium',
                            subjectListMode === 'irregular'
                                ? 'bg-slate-900 text-white hover:bg-slate-800'
                                : 'border border-slate-200 text-slate-700',
                        ].join(' ')}
                    >
                        {subjectListMode === 'irregular' ? 'Save Subjects' : 'Close'}
                    </button>
                </div>
                </div>
            </Modal>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.students') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Student" message={`Delete student "${deleteTarget?.first_name} ${deleteTarget?.last_name}"?`} />

            <Modal show={bulkUploadOpen} maxWidth="2xl" onClose={closeBulkUpload}>
                <form onSubmit={submitBulkUpload} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Bulk Upload</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">Upload Students CSV</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Student numbers are generated automatically. New accounts use the default password hcc1234.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={closeBulkUpload}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">CSV File</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,text/csv"
                                onChange={handleStudentCsvFileChange}
                                className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {importForm.errors.file && (
                                <p className="mt-1 text-sm text-rose-600">{importForm.errors.file}</p>
                            )}
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CSV Template</p>
                                    <p className="mt-1 text-sm text-slate-600">Use the exact header order below. Enter names for branch, department, program, strand, and year level.</p>
                                    <p className="mt-1 text-xs text-slate-500">Old CSVs with numeric IDs still work. Keep unused Program or Strand cells blank.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={downloadStudentCsvTemplate}
                                    className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                    Download Template
                                </button>
                            </div>
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">{STUDENT_CSV_TEMPLATE_COLUMNS.join(',')}</pre>
                            {csvReferenceRows.length > 0 && (
                                <details className="mt-3 rounded-md bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                                    <summary className="cursor-pointer font-semibold text-slate-800">Name reference for CSV values</summary>
                                    <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                                        {csvReferenceRows.map((row) => (
                                            <span key={row}>{row}</span>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>

                        <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 px-3 py-2">
                                <span className="font-medium text-slate-800">College:</span> fill Program and Year Level.
                            </div>
                            <div className="rounded-lg border border-slate-200 px-3 py-2">
                                <span className="font-medium text-slate-800">Senior High:</span> fill Strand and Year Level.
                            </div>
                        </div>
                    </div>

                    {csvInspection.status !== 'idle' && (
                        <div className={[
                            'mt-6 rounded-lg border px-4 py-3 text-sm',
                            csvInspection.status === 'error'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        ].join(' ')}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold">
                                    {csvInspection.status === 'checking'
                                        ? 'Inspecting CSV...'
                                        : csvInspection.status === 'error'
                                            ? 'CSV needs changes before upload'
                                            : `CSV ready: ${csvInspection.rows} student row(s) found`}
                                </p>
                                {csvInspection.status !== 'checking' && (
                                    <button
                                        type="button"
                                        onClick={copyCsvInspectionMessages}
                                        title="Copy CSV inspection messages"
                                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:text-slate-900"
                                    >
                                        <AppIcon name="copy" className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>

                            {csvInspection.errors.length > 0 && (
                                <ul className="mt-2 max-h-36 list-disc space-y-1 overflow-y-auto pl-5 text-xs">
                                    {csvInspection.errors.slice(0, 12).map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                    {csvInspection.errors.length > 12 && (
                                        <li>{csvInspection.errors.length - 12} more issue(s) hidden.</li>
                                    )}
                                </ul>
                            )}

                            {csvInspection.warnings.length > 0 && (
                                <div className="mt-2 rounded-md bg-white/70 p-2 text-xs text-amber-700 ring-1 ring-amber-200">
                                    <p className="font-semibold">Warnings</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-5">
                                        {csvInspection.warnings.slice(0, 6).map((message) => (
                                            <li key={message}>{message}</li>
                                        ))}
                                        {csvInspection.warnings.length > 6 && (
                                            <li>{csvInspection.warnings.length - 6} more warning(s) hidden.</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={closeBulkUpload}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={importForm.processing || !importForm.data.file || ['checking', 'error'].includes(csvInspection.status)}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            {importForm.processing ? 'Uploading...' : 'Upload CSV'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={studentPortalOpen} maxWidth="md" onClose={() => setStudentPortalOpen(false)}>
                <div className="p-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                            <AppIcon name="graduation" className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">Student Portal</h3>
                            <p className="mt-1 text-sm text-slate-500">Share these access details with newly created student accounts.</p>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Portal URL</p>
                            <p className="mt-1 break-all text-sm font-medium text-slate-900">{route('portal.login')}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-slate-200 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</p>
                                <p className="mt-1 text-sm font-medium text-slate-900">Student email</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default Password</p>
                                <p className="mt-1 text-sm font-medium text-slate-900">hcc1234</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStudentPortalOpen(false)}
                            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Close
                        </button>
                        <a
                            href={route('portal.login')}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                        >
                            Open Portal
                        </a>
                    </div>
                </div>
            </Modal>

            <AppConfirmDialog
                open={confirmUpdateOpen}
                title="Save changes?"
                message={`Save changes to ${`${editing?.first_name ?? ''} ${editing?.last_name ?? ''}`.trim() || 'this student'}?`}
                confirmLabel="Update"
                tone="primary"
                loading={processing}
                onConfirm={performSave}
                onCancel={() => setConfirmUpdateOpen(false)}
            />
        </AdminLayout>
    );
}
