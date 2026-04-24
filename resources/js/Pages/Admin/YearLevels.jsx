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
        adviser_teacher_id: '',
        year_level: '',
        section: '',
        education_type: educationType,
    });
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
            year_level: '',
            section: '',
            education_type: educationType,
        });
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setErrorNotification('');
        setData({
            branch_id: String(row.department?.branch_id ?? activeBranchId),
            program_id: String(row.program_id ?? ''),
            adviser_teacher_id: String(row.adviser_teacher_id ?? ''),
            year_level: row.year_level ?? '',
            section: row.section ?? '',
            education_type: educationType,
        });
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
        { key: 'program', label: 'Program', render: (row) => stripCampusSuffix(row.program?.name) || '-' },
        { key: 'is_activated', label: 'Status', render: (row) => <StatusBadge active={row.is_activated} /> },
    ];

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

            <ResourceTable columns={columns} data={yearLevels} filters={filters} routeName={activeRoute} searchPlaceholder="Search levels..." onRowClick={openView} onEdit={openEdit} onDelete={setDeleteTarget} />

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
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program</p><p className="mt-1 text-sm text-slate-900">{viewing.program?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adviser</p><p className="mt-1 text-sm text-slate-900">{viewing.adviser?.full_name ?? viewing.assigned_adviser_name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><StatusBadge active={viewing.is_activated} /></div></div>
                        </div>

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
                            adviser_teacher_id: '',
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
                                });
                            }}>
                                <option value="">Select program...</option>
                                {filteredPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
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
