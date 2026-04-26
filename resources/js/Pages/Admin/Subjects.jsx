import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import AppIcon from '@/Components/AppIcon';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import useFormDirty from '@/Components/Admin/useFormDirty';
import AppConfirmDialog from '@/Components/ConfirmDialog';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const ROUTE_MAP = {
    college: 'admin.college.subjects',
    'senior-high': 'admin.senior-high.subjects',
    'junior-high': 'admin.junior-high.subjects',
    'grade-school': 'admin.grade-school.subjects',
};
const hasValue = (value) => String(value ?? '').trim() !== '';

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

export default function Subjects({
    subjects,
    filters,
    educationType,
    educationLevelName,
    subjectType,
    branches,
    selectedBranchId,
    scopedBranchId,
    departments,
    programs,
    strands,
    teachers,
}) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [submitError, setSubmitError] = useState('');
    const [errorNotification, setErrorNotification] = useState('');
    const activeRoute = ROUTE_MAP[educationType] ?? 'admin.college.subjects';
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const selectedFilterProgramId = String(filters.program_id ?? '');
    const selectedFilterStrandId = String(filters.strand_id ?? '');
    const selectedGenEdFilter = String(filters.is_gened ?? '');
    const activeBranch = branches.find((branch) => String(branch.id) === activeBranchId);
    const departmentMatchers = {
        college: (department) => /college/i.test(department.name ?? '') || /col/i.test(department.code ?? ''),
        'senior-high': (department) => /senior high/i.test(department.name ?? '') || /shs/i.test(department.code ?? ''),
        'junior-high': (department) => /junior high/i.test(department.name ?? '') || /jhs/i.test(department.code ?? ''),
        'grade-school': (department) => /elementary|grade school/i.test(department.name ?? '') || /elem/i.test(department.code ?? ''),
    };

    const blankFormData = () => ({
        branch_id: activeBranchId,
        department_id: '',
        program_id: '',
        strand_id: '',
        name: '',
        type: subjectType,
        is_gened: false,
        is_activated: true,
        teacher_ids: [''],
    });

    const { data, setData, errors, processing, reset, clearErrors } = useForm(blankFormData());

    const { isDirty } = useFormDirty(data, editing?.id ?? 'new');
    const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
    const [createDraft, setCreateDraft] = useState(null);
    const [editDrafts, setEditDrafts] = useState({});

    const filteredDepartments = useMemo(
        () => departments.filter((department) => {
            const branchMatches = !data.branch_id || String(department.branch_id) === String(data.branch_id);
            const matchesEducationType = departmentMatchers[educationType]?.(department) ?? true;

            return branchMatches && matchesEducationType;
        }),
        [data.branch_id, departments, educationType],
    );
    const autoDepartmentId = useMemo(() => {
        if (educationType === 'college' && data.program_id) {
            const selectedProgram = programs.find((program) => String(program.id) === String(data.program_id));
            return String(selectedProgram?.department_id ?? '');
        }

        return String(filteredDepartments[0]?.id ?? '');
    }, [data.program_id, educationType, filteredDepartments, programs]);
    const filteredPrograms = useMemo(
        () => programs.filter((program) => {
            const selectedDepartment = departments.find((department) => String(department.id) === String(program.department_id));
            return !data.branch_id || String(selectedDepartment?.branch_id ?? '') === String(data.branch_id);
        }),
        [data.branch_id, departments, programs],
    );
    const filteredStrands = useMemo(
        () => strands.filter((strand) => {
            const selectedDepartment = departments.find((department) => String(department.id) === String(strand.department_id));
            return !data.branch_id || String(selectedDepartment?.branch_id ?? '') === String(data.branch_id);
        }),
        [data.branch_id, departments, strands],
    );
    const filteredTeachers = useMemo(
        () => teachers.filter((teacher) => (
            (!data.branch_id || String(teacher.branch_id) === String(data.branch_id))
            && (!autoDepartmentId || String(teacher.department_id) === String(autoDepartmentId))
        )),
        [teachers, autoDepartmentId, data.branch_id],
    );
    const isFormComplete = hasValue(data.branch_id)
        && hasValue(data.name)
        && (educationType !== 'college' || hasValue(data.program_id))
        && (educationType !== 'senior-high' || hasValue(data.strand_id));
    const isSubmitDisabled = !isFormComplete || (Boolean(editing) && !isDirty);

    useEffect(() => {
        if (!errorNotification) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setErrorNotification('');
        }, 3500);

        return () => window.clearTimeout(timeoutId);
    }, [errorNotification]);

    useEffect(() => {
        if (String(data.department_id ?? '') !== String(autoDepartmentId ?? '')) {
            setData('department_id', autoDepartmentId);
        }
    }, [autoDepartmentId, data.department_id, setData]);

    const formDataFromSubject = (row) => {
        const teacherIds = Array.isArray(row.teacher_id) && row.teacher_id.length > 0
            ? row.teacher_id.map((id) => String(id))
            : [''];

        return {
            branch_id: String(row.department?.branch_id ?? activeBranchId ?? ''),
            department_id: String(row.department_id ?? ''),
            program_id: String(row.program_id ?? ''),
            strand_id: String(row.strand_id ?? ''),
            name: row.name ?? '',
            type: row.type ?? subjectType,
            is_gened: Boolean(row.is_gened),
            is_activated: Boolean(row.is_activated),
            teacher_ids: teacherIds,
        };
    };

    const updateFormData = (nextData) => {
        setData(nextData);

        if (editing) {
            setEditDrafts((drafts) => ({
                ...drafts,
                [editing.id]: nextData,
            }));
        } else {
            setCreateDraft(nextData);
        }
    };

    const updateField = (field, value) => {
        updateFormData({ ...data, [field]: value });
    };

    const closeSlideOver = () => {
        setSlideOpen(false);
    };

    const cancelSlideOver = () => {
        if (editing) {
            setEditDrafts((drafts) => {
                const nextDrafts = { ...drafts };
                delete nextDrafts[editing.id];

                return nextDrafts;
            });
            setData(formDataFromSubject(editing));
        } else {
            setCreateDraft(null);
            setData(blankFormData());
        }

        setSubmitError('');
        setErrorNotification('');
        clearErrors();
        setSlideOpen(false);
    };

    const openCreate = () => {
        setSubmitError('');
        setErrorNotification('');
        setData(createDraft ?? blankFormData());
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setSubmitError('');
        setErrorNotification('');
        setData(editDrafts[row.id] ?? formDataFromSubject(row));
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

    const updateTeacherSlot = (index, value) => {
        const nextTeacherIds = [...data.teacher_ids];
        nextTeacherIds[index] = value;
        updateField('teacher_ids', nextTeacherIds);
    };

    const addTeacherSlot = () => {
        updateField('teacher_ids', [...data.teacher_ids, '']);
    };

    const removeTeacherSlot = (index) => {
        const nextTeacherIds = data.teacher_ids.filter((_, teacherIndex) => teacherIndex !== index);
        updateField('teacher_ids', nextTeacherIds.length > 0 ? nextTeacherIds : ['']);
    };

    const submit = (e) => {
        e.preventDefault();
        if (isSubmitDisabled) return;
        if (editing) { setConfirmUpdateOpen(true); return; }
        performSave();
    };

    const performSave = () => {
        setSubmitError('');
        setErrorNotification('');
        const url = editing ? '/admin/subjects/' + editing.id : '/admin/subjects';
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                setConfirmUpdateOpen(false);
                if (editing) {
                    setEditDrafts((drafts) => {
                        const nextDrafts = { ...drafts };
                        delete nextDrafts[editing.id];

                        return nextDrafts;
                    });
                } else {
                    setCreateDraft(null);
                }
                reset();
            },
            onError: (formErrors) => {
                const message = getFirstErrorMessage(formErrors, 'Unable to save subject.');
                setSubmitError(message);
                setErrorNotification(message);
                setConfirmUpdateOpen(false);
            },
        });
    };

    const switchBranch = (branchId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: branchId,
            ...(educationType === 'college' ? { program_id: '' } : {}),
            ...(educationType === 'senior-high' ? { strand_id: '' } : {}),
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeProgramFilter = (programId) => {
        router.get(route(activeRoute), {
            ...filters,
            program_id: programId,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeGenEdFilter = (value) => {
        router.get(route(activeRoute), {
            ...filters,
            is_gened: value,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeStrandFilter = (strandId) => {
        router.get(route(activeRoute), {
            ...filters,
            strand_id: strandId,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const showsGenEd = educationType === 'college' || educationType === 'senior-high';

    const columns = educationType === 'college'
        ? [
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Subject Name' },
            { key: 'branch', label: 'Branch', render: (row) => row.department?.branch?.name ?? activeBranch?.name ?? '-' },
            { key: 'program', label: 'Program', render: (row) => row.program?.name ?? '-' },
            { key: 'is_gened', label: 'Gen Ed', render: (row) => row.is_gened ? 'Yes' : 'No' },
        ]
        : educationType === 'senior-high'
            ? [
                { key: 'code', label: 'Code' },
                { key: 'name', label: 'Subject Name' },
                { key: 'branch', label: 'Branch', render: (row) => row.department?.branch?.name ?? activeBranch?.name ?? '-' },
                { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
                { key: 'strand', label: 'Strand', render: (row) => row.strand?.name ?? '-' },
                { key: 'assigned_teachers', label: 'Assigned Teachers', render: (row) => (row.assigned_teacher_names?.join(', ') || '-') },
                { key: 'is_activated', label: 'Status', render: (row) => <StatusBadge active={row.is_activated} /> },
            ]
        : [
            { key: 'code', label: 'Code' },
            { key: 'name', label: 'Subject Name' },
            { key: 'branch', label: 'Branch', render: (row) => row.department?.branch?.name ?? activeBranch?.name ?? '-' },
            { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
            { key: 'assigned_teachers', label: 'Assigned Teachers', render: (row) => (row.assigned_teacher_names?.join(', ') || '-') },
            { key: 'is_activated', label: 'Status', render: (row) => <StatusBadge active={row.is_activated} /> },
        ].filter((column) => showsGenEd || column.key !== 'is_gened');

    const titleMap = {
        college: 'College Subjects',
        'senior-high': 'Senior High Subjects',
        'junior-high': 'Junior High Subjects',
        'grade-school': 'Grade School Subjects',
    };

    return (
        <AdminLayout title={titleMap[educationType]} activeRoute={activeRoute} breadcrumbs={['Academic Setup', educationLevelName]}>
            <ErrorNotification message={errorNotification} onClose={() => setErrorNotification('')} />

            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{titleMap[educationType]}</h2>
                    <p className="text-sm text-slate-500">Subject catalog for {educationLevelName} level courses.</p>
                </div>
                <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Subject</button>
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
                data={subjects}
                filters={filters}
                routeName={activeRoute}
                searchPlaceholder="Search subjects..."
                onRowClick={openView}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                extraHeaderActions={educationType === 'college' ? (
                    <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
                        <div className="w-full md:w-[220px]">
                            <SelectInput value={selectedFilterProgramId} onChange={(e) => changeProgramFilter(e.target.value)}>
                                <option value="">All programs</option>
                                {programs.map((program) => (
                                    <option key={program.id} value={program.id}>{program.name}</option>
                                ))}
                            </SelectInput>
                        </div>
                        <div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 md:w-auto">
                            {[
                                { label: 'All', value: '' },
                                { label: 'Gen Ed', value: '1' },
                                { label: 'Non-Gen Ed', value: '0' },
                            ].map((option) => (
                                <label
                                    key={option.label}
                                    className={[
                                        'flex-1 cursor-pointer rounded-md px-3 py-1.5 text-center text-sm transition md:flex-none',
                                        selectedGenEdFilter === option.value
                                            ? 'bg-slate-900 text-white'
                                            : 'text-slate-600 hover:bg-slate-50',
                                    ].join(' ')}
                                >
                                    <input
                                        type="radio"
                                        name="gen-ed-filter"
                                        value={option.value}
                                        checked={selectedGenEdFilter === option.value}
                                        onChange={(e) => changeGenEdFilter(e.target.value)}
                                        className="sr-only"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </div>
                ) : educationType === 'senior-high' ? (
                    <div className="w-full md:w-[220px]">
                        <SelectInput value={selectedFilterStrandId} onChange={(e) => changeStrandFilter(e.target.value)}>
                            <option value="">All strands</option>
                            {strands.map((strand) => (
                                <option key={strand.id} value={strand.id}>{strand.name}</option>
                            ))}
                        </SelectInput>
                    </div>
                ) : null}
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Subject Information" width="max-w-xl">
                {viewing && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.name ?? '-'}</h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.code ?? '-'}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p><p className="mt-1 text-sm text-slate-900">{viewing.department?.branch?.name ?? activeBranch?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p><p className="mt-1 text-sm text-slate-900">{viewing.department?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Teachers</p><p className="mt-1 text-sm text-slate-900">{viewing.assigned_teacher_names?.join(', ') || '-'}</p></div>
                            {showsGenEd && <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gen Ed</p><p className="mt-1 text-sm text-slate-900">{viewing.is_gened ? 'Yes' : 'No'}</p></div>}
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><StatusBadge active={viewing.is_activated} /></div></div>
                        </div>

                        <button type="button" onClick={editFromDetails} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
                            Edit Subject
                        </button>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={closeSlideOver} title={editing ? 'Edit Subject' : 'New Subject'} width="max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    {(submitError || Object.keys(errors).length > 0) && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {submitError || 'Please review the highlighted fields and try again.'}
                        </div>
                    )}

                    <FormField label="Branch" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => updateFormData({ ...data, branch_id: e.target.value, department_id: '', program_id: '', strand_id: '', teacher_ids: [''] })}>
                            <option value="">Select branch...</option>
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </SelectInput>
                    </FormField>

                    {educationType === 'college' && (
                        <FormField label="Program" error={errors.program_id} required>
                            <SelectInput value={data.program_id} onChange={(e) => updateField('program_id', e.target.value)} disabled={!data.branch_id}>
                                <option value="">Select program...</option>
                                {filteredPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    {educationType === 'senior-high' && (
                        <FormField label="Strand" error={errors.strand_id} required>
                            <SelectInput value={data.strand_id} onChange={(e) => updateField('strand_id', e.target.value)} disabled={!data.branch_id}>
                                <option value="">Select strand...</option>
                                {filteredStrands.map((strand) => <option key={strand.id} value={strand.id}>{strand.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    <FormField label="Subject Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => updateField('name', e.target.value)} />
                    </FormField>

                    {showsGenEd && (
                        <FormField label="Gen Ed">
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1">
                                {[
                                    { label: 'Yes', value: true },
                                    { label: 'No', value: false },
                                ].map((option) => (
                                    <label
                                        key={option.label}
                                        className={[
                                            'cursor-pointer rounded-md px-3 py-1.5 text-sm transition',
                                            data.is_gened === option.value
                                                ? 'bg-slate-900 text-white'
                                                : 'text-slate-600 hover:bg-slate-50',
                                        ].join(' ')}
                                    >
                                        <input
                                            type="radio"
                                            name="is_gened"
                                            checked={data.is_gened === option.value}
                                            onChange={() => updateField('is_gened', option.value)}
                                            className="sr-only"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </FormField>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-700">Assigned Teachers</p>
                            <button type="button" onClick={addTeacherSlot} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                                Add Teacher
                            </button>
                        </div>

                        {data.teacher_ids.map((teacherId, index) => (
                            <div key={index} className="flex gap-2">
                                <div className="flex-1">
                                    <SelectInput value={teacherId} onChange={(e) => updateTeacherSlot(index, e.target.value)} disabled={!data.branch_id || !data.department_id}>
                                        <option value="">Select teacher...</option>
                                        {filteredTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}
                                    </SelectInput>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeTeacherSlot(index)}
                                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_activated} onChange={(e) => updateField('is_activated', e.target.checked)} className="rounded border-slate-300" /> Active
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={cancelSlideOver} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} disabled={isSubmitDisabled} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete('/admin/subjects/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Subject" message={`Delete "${deleteTarget?.name}"?`} />

            <AppConfirmDialog
                open={confirmUpdateOpen}
                title="Save changes?"
                message={`Save changes to ${editing?.name ?? 'this subject'}?`}
                confirmLabel="Update"
                tone="primary"
                loading={processing}
                onConfirm={performSave}
                onCancel={() => setConfirmUpdateOpen(false)}
            />
        </AdminLayout>
    );
}
