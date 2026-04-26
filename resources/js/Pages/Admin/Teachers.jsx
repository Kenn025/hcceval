import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import useFormDirty from '@/Components/Admin/useFormDirty';
import AppIcon from '@/Components/AppIcon';
import AppConfirmDialog from '@/Components/ConfirmDialog';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const buildTeacherCode = (branch, nextTeacherCodes = {}) => {
    if (!branch?.code) {
        return nextTeacherCodes.default ?? 'TCH-GEN-00001';
    }

    return nextTeacherCodes[String(branch.id)] ?? `TCH-${String(branch.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-00001`;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());

const getProgramStrandLabel = (row) => {
    const departmentName = String(row.department?.name ?? '').toLowerCase();

    if (departmentName.includes('junior high') || departmentName.includes('elementary')) {
        return 'N/A';
    }

    return row.program?.name ?? row.strand?.name ?? '-';
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

    if (departmentName.includes('elementary') || departmentCode.includes('elem')) {
        return 'elementary';
    }

    return null;
};

export default function Teachers({ teachers, filters, branches, departments, programs, strands, nextTeacherCodes, isBranchAdmin, selectedBranchId, scopedBranchId }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [emailCheck, setEmailCheck] = useState({ status: 'idle', message: '' });
    const [createDraft, setCreateDraft] = useState(null);
    const [editDrafts, setEditDrafts] = useState({});
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        employee_no: '',
        branch_id: activeBranchId,
        department_id: '',
        program_id: '',
        strand_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix_name: '',
        email: '',
        password: '',
        role: 'Teacher',
    });

    const { isDirty: teacherIsDirty } = useFormDirty(data, editing?.id ?? 'new');
    const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
    const emailError = emailCheck.status === 'taken' ? emailCheck.message : errors.email;
    const emailIsUnavailable = emailCheck.status === 'checking' || emailCheck.status === 'taken';
    const createFormIsComplete = useMemo(() => {
        if (editing) {
            return true;
        }

        const email = String(data.email ?? '').trim();

        return Boolean(
            String(data.branch_id ?? '').trim()
            && String(data.department_id ?? '').trim()
            && String(data.first_name ?? '').trim()
            && String(data.last_name ?? '').trim()
            && String(data.role ?? '').trim()
            && (!email || isValidEmail(email))
            && !emailIsUnavailable
        );
    }, [data.branch_id, data.department_id, data.email, data.first_name, data.last_name, data.role, editing, emailIsUnavailable]);

    const selectedBranch = useMemo(
        () => branches.find((branch) => String(branch.id) === String(data.branch_id)),
        [branches, data.branch_id],
    );
    const filteredDepartments = useMemo(
        () => departments.filter((department) => (
            (!data.branch_id || String(department.branch_id) === String(data.branch_id))
            && Boolean(department.is_activated)
        )),
        [data.branch_id, departments],
    );
    const filterDepartments = useMemo(
        () => departments.filter((department) => (
            (!filters.branch_id || String(department.branch_id) === String(filters.branch_id))
            && Boolean(department.is_activated)
        )),
        [departments, filters.branch_id],
    );
    const selectedDepartment = useMemo(
        () => filteredDepartments.find((department) => String(department.id) === String(data.department_id)),
        [data.department_id, filteredDepartments],
    );
    const selectedDepartmentType = useMemo(
        () => getDepartmentType(selectedDepartment),
        [selectedDepartment],
    );
    const filteredPrograms = useMemo(
        () => programs.filter((program) => String(program.department_id) === String(data.department_id)),
        [data.department_id, programs],
    );
    const filteredStrands = useMemo(
        () => strands.filter((strand) => String(strand.department_id) === String(data.department_id)),
        [data.department_id, strands],
    );
    const generatedTeacherCode = editing ? data.employee_no : buildTeacherCode(selectedBranch, nextTeacherCodes);

    useEffect(() => {
        if (!data.branch_id && activeBranchId) {
            setData('branch_id', activeBranchId);
        }
    }, [activeBranchId, data.branch_id, setData]);

    useEffect(() => {
        if (data.department_id && !filteredDepartments.some((department) => String(department.id) === String(data.department_id))) {
            setData('department_id', '');
        }
    }, [data.department_id, filteredDepartments, setData]);

    useEffect(() => {
        if (data.program_id && !filteredPrograms.some((program) => String(program.id) === String(data.program_id))) {
            setData('program_id', '');
        }
    }, [data.program_id, filteredPrograms, setData]);

    useEffect(() => {
        if (data.strand_id && !filteredStrands.some((strand) => String(strand.id) === String(data.strand_id))) {
            setData('strand_id', '');
        }
    }, [data.strand_id, filteredStrands, setData]);

    useEffect(() => {
        if (selectedDepartmentType !== 'college' && data.program_id) {
            setData('program_id', '');
        }

        if (selectedDepartmentType !== 'senior-high' && data.strand_id) {
            setData('strand_id', '');
        }
    }, [data.program_id, data.strand_id, selectedDepartmentType, setData]);

    const handleBranchChange = (branchId) => {
        setData('branch_id', branchId);
        setData('department_id', '');
        setData('program_id', '');
        setData('strand_id', '');
    };

    const openCreate = () => {
        const draft = createDraft ?? {};

        reset();
        setSubmitError('');
        setEmailCheck({ status: 'idle', message: '' });
        setDetailOpen(false);
        setViewing(null);
        setShowPassword(false);
        clearErrors();
        setEditing(null);
        setData({
            employee_no: draft.employee_no ?? '',
            branch_id: draft.branch_id ?? activeBranchId,
            department_id: draft.department_id ?? '',
            program_id: draft.program_id ?? '',
            strand_id: draft.strand_id ?? '',
            first_name: draft.first_name ?? '',
            middle_name: draft.middle_name ?? '',
            last_name: draft.last_name ?? '',
            suffix_name: draft.suffix_name ?? '',
            email: draft.email ?? '',
            password: draft.password ?? '',
            role: draft.role ?? 'Teacher',
        });
        setSlideOpen(true);
    };

    const closeSlideOver = () => {
        const draft = {
            employee_no: data.employee_no,
            branch_id: data.branch_id,
            department_id: data.department_id,
            program_id: data.program_id,
            strand_id: data.strand_id,
            first_name: data.first_name,
            middle_name: data.middle_name,
            last_name: data.last_name,
            suffix_name: data.suffix_name,
            email: data.email,
            password: data.password,
            role: data.role,
        };

        if (editing) {
            setEditDrafts((drafts) => ({
                ...drafts,
                [editing.id]: draft,
            }));
        } else {
            setCreateDraft(draft);
        }

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

        setSlideOpen(false);
        reset();
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const openEdit = (row) => {
        const draft = editDrafts[row.id] ?? {};

        setData({
            employee_no: draft.employee_no ?? row.employee_no,
            branch_id: draft.branch_id ?? String(row.branch_id ?? ''),
            department_id: draft.department_id ?? (row.department_id ? String(row.department_id) : ''),
            program_id: draft.program_id ?? (row.program_id ? String(row.program_id) : ''),
            strand_id: draft.strand_id ?? (row.strand_id ? String(row.strand_id) : ''),
            first_name: draft.first_name ?? row.first_name,
            middle_name: draft.middle_name ?? row.middle_name ?? '',
            last_name: draft.last_name ?? row.last_name,
            suffix_name: draft.suffix_name ?? row.suffix_name ?? '',
            email: draft.email ?? row.email ?? '',
            password: draft.password ?? '',
            role: draft.role ?? row.role ?? 'Teacher',
        });
        setSubmitError('');
        setEmailCheck({ status: 'idle', message: '' });
        setDetailOpen(false);
        setViewing(null);
        setShowPassword(false);
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const editFromDetails = () => {
        if (!viewing) return;
        openEdit(viewing);
    };

    const submit = (e) => {
        e.preventDefault();
        if (emailIsUnavailable) return;
        if (editing && !teacherIsDirty) return;
        if (editing) {
            setConfirmUpdateOpen(true);
            return;
        }
        performSave();
    };

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
                .get(route('admin.teachers.email-availability'), {
                    params: {
                        email,
                        teacher_id: editing?.id ?? '',
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

    const performSave = () => {
        setSubmitError('');
        const url = editing ? route('admin.teachers') + '/' + editing.id : route('admin.teachers');
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
                setSubmitError(firstError || 'Unable to save teacher.');
                setConfirmUpdateOpen(false);
            },
        });
    };

    const changeBranch = (branchId = '') => {
        router.get(route('admin.teachers'), { ...filters, branch_id: branchId }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleFilterChange = (key, value) => {
        router.get(route('admin.teachers'), { ...filters, [key]: value }, {
            preserveState: true,
            replace: true,
        });
    };

    const columns = [
        { key: 'employee_no', label: 'Employee No.' },
        { key: 'full_name', label: 'Full Name', render: (row) => `${row.last_name}, ${row.first_name} ${row.middle_name ?? ''}`.trim() },
        { key: 'branch', label: 'Branch', render: (row) => row.branch?.name ?? '-' },
        { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
        { key: 'program_strand', label: 'Program / Strand', render: (row) => getProgramStrandLabel(row) },
        { key: 'role', label: 'Role' },
        { key: 'is_active', label: 'Status', render: (row) => <StatusBadge active={row.is_active} /> },
    ];

    return (
        <AdminLayout title="Teachers" activeRoute="admin.teachers" breadcrumbs={['User Management']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Teachers</h2>
                    <p className="text-sm text-slate-500">Manage teaching faculty, their branch scope, and academic role assignments.</p>
                </div>
                <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Teacher</button>
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
                data={teachers} 
                filters={filters} 
                routeName="admin.teachers" 
                searchPlaceholder="Search by name or employee no..." 
                onRowClick={openView} 
                onEdit={openEdit} 
                onDelete={setDeleteTarget} 
                extraHeaderActions={
                    <div className="flex w-full flex-wrap gap-2 md:w-auto">
                        <select
                            value={filters.department_id ?? ''}
                            onChange={(e) => handleFilterChange('department_id', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-auto"
                        >
                            <option value="">All Departments</option>
                            {filterDepartments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select
                            value={filters.program_id ?? ''}
                            onChange={(e) => handleFilterChange('program_id', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-auto"
                        >
                            <option value="">All Programs</option>
                            {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                }
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Teacher Information" width="max-w-xl">
                {viewing && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teacher</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                {[viewing.first_name, viewing.middle_name, viewing.last_name].filter(Boolean).join(' ')}
                            </h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.employee_no ?? '-'}</p>
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
                                    <StatusBadge active={viewing.is_active} />
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
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program / Strand</p>
                                <p className="mt-1 text-sm text-slate-900">{getProgramStrandLabel(viewing)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.role ?? '-'}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDetailOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Close</button>
                            <button type="button" onClick={editFromDetails} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">Edit Teacher</button>
                        </div>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={closeSlideOver} title={editing ? 'Edit Teacher' : 'New Teacher'} width="max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    {(submitError || Object.keys(errors).length > 0) && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {submitError || 'Please review the highlighted fields and try again.'}
                        </div>
                    )}
                    <FormField label="Employee No." error={errors.employee_no} required>
                        <TextInput value={generatedTeacherCode} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
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
                            <TextInput value={data.suffix_name} onChange={(e) => setData('suffix_name', e.target.value)} placeholder="Jr., Sr." />
                        </FormField>
                    </div>
                    <FormField label="Branch" error={errors.branch_id} required>
                        {isBranchAdmin ? (
                            <TextInput value={selectedBranch?.name ?? ''} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
                        ) : (
                            <SelectInput value={data.branch_id} onChange={(e) => handleBranchChange(e.target.value)}>
                                <option value="">Select branch...</option>
                                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </SelectInput>
                        )}
                    </FormField>
                    <FormField label="Department" error={errors.department_id} required>
                        <SelectInput
                            value={data.department_id}
                            onChange={(e) => {
                                setData('department_id', e.target.value);
                                setData('program_id', '');
                                setData('strand_id', '');
                                clearErrors('department_id');
                            }}
                            disabled={!data.branch_id}
                        >
                            <option value="">{data.branch_id ? 'Select department...' : 'Select branch first...'}</option>
                            {filteredDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                        </SelectInput>
                    </FormField>
                    {selectedDepartmentType === 'college' && (
                        <FormField label="Program" error={errors.program_id}>
                            <SelectInput
                                value={data.program_id}
                                onChange={(e) => setData('program_id', e.target.value)}
                                disabled={!data.department_id}
                            >
                                <option value="">Select program...</option>
                                {filteredPrograms.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}
                    {selectedDepartmentType === 'senior-high' && (
                        <FormField label="Strand" error={errors.strand_id}>
                            <SelectInput
                                value={data.strand_id}
                                onChange={(e) => setData('strand_id', e.target.value)}
                                disabled={!data.department_id}
                            >
                                <option value="">Select strand...</option>
                                {filteredStrands.map((strand) => <option key={strand.id} value={strand.id}>{strand.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}
                    <FormField label="Role" error={errors.role} required>
                        <SelectInput value={data.role} onChange={(e) => {
                            setData('role', e.target.value);
                            clearErrors('role');
                        }}>
                            <option value="Teacher">Teacher</option>
                            <option value="Program Chair">Program Chair</option>
                            <option value="Department Head">Department Head</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Email" error={emailError}>
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
                        <SubmitButton processing={processing} disabled={editing ? emailIsUnavailable || !teacherIsDirty : !createFormIsComplete} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.teachers') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Teacher" message={`Delete teacher "${deleteTarget?.first_name} ${deleteTarget?.last_name}"?`} />

            <AppConfirmDialog
                open={confirmUpdateOpen}
                title="Save changes?"
                message={`Save changes to ${`${editing?.first_name ?? ''} ${editing?.last_name ?? ''}`.trim() || 'this teacher'}?`}
                confirmLabel="Update"
                tone="primary"
                loading={processing}
                onConfirm={performSave}
                onCancel={() => setConfirmUpdateOpen(false)}
            />
        </AdminLayout>
    );
}
