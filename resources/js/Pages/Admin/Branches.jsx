import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import useFormDirty from '@/Components/Admin/useFormDirty';
import AppIcon from '@/Components/AppIcon';
import AppConfirmDialog from '@/Components/ConfirmDialog';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const DEPARTMENT_OPTIONS = [
    { value: 'college', label: 'College' },
    { value: 'senior_high', label: 'Senior High' },
    { value: 'junior_high', label: 'Junior High' },
];

const buildBranchCodePreview = (name) => {
    const ignore = new Set(['AND', 'OF', 'THE', 'CAMPUS', 'NUEVA', 'ECIJA']);
    const words = String(name ?? '')
        .trim()
        .toUpperCase()
        .split(/\s+/)
        .filter(Boolean)
        .filter((word) => !ignore.has(word));
    const initials = words
        .map((word) => word.replace(/[^A-Z0-9]/g, ''))
        .filter(Boolean)
        .map((word) => word[0])
        .join('');

    return (initials || 'BRANCH').slice(0, 12);
};

const buildAdminEmailPreview = (name) => {
    const slug = String(name ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '');

    return `${slug || 'admin.branch'}@hcc.local`;
};

const buildPasswordPreview = () => `HCC${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());

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

function Notification({ type = 'success', message, onClose }) {
    if (!message) {
        return null;
    }

    const isSuccess = type === 'success';

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-[80] sm:right-6">
            <div
                className={[
                    'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur',
                    isSuccess ? 'border-emerald-200 text-emerald-900' : 'border-rose-200 text-rose-900',
                ].join(' ')}
            >
                <div className={[ 'mt-0.5 rounded-full p-1', isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600' ].join(' ')}>
                    <AppIcon name={isSuccess ? 'check-circle' : 'close'} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{isSuccess ? 'Success' : 'Error'}</p>
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

export default function Branches({ branches, filters }) {
    const { props } = usePage();
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [successNotification, setSuccessNotification] = useState(props.flash?.success ?? '');
    const [errorNotification, setErrorNotification] = useState('');
    const [adminEmailTouched, setAdminEmailTouched] = useState(false);
    const [adminEmailError, setAdminEmailError] = useState('');
    const [adminEmailCheck, setAdminEmailCheck] = useState({ status: 'idle', message: '' });
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [unlinkAdminTarget, setUnlinkAdminTarget] = useState(null);
    const [createDraft, setCreateDraft] = useState(null);
    const [editDrafts, setEditDrafts] = useState({});

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        code: '',
        name: '',
        highest_department: 'college',
        department_levels: DEPARTMENT_OPTIONS.map((option) => option.value),
        admin_email: '',
        admin_password: '',
        address: '',
        is_main: false,
        is_active: true,
    });

    const { isDirty: branchIsDirty } = useFormDirty(data, editing?.id ?? 'new');
    const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
    const generatedBranchCode = useMemo(() => buildBranchCodePreview(data.name), [data.name]);
    const generatedAdminEmail = useMemo(() => buildAdminEmailPreview(data.name), [data.name]);
    const adminEmailTakenError = adminEmailCheck.status === 'taken' ? adminEmailCheck.message : '';
    const adminEmailIsUnavailable = adminEmailCheck.status === 'checking' || adminEmailCheck.status === 'taken';
    const createFormIsComplete = useMemo(() => {
        if (editing) {
            return true;
        }

        return Boolean(
            String(data.name ?? '').trim()
            && (data.department_levels ?? []).length > 0
            && isValidEmail(data.admin_email)
            && String(data.admin_password ?? '').trim().length >= 6
            && !adminEmailError
            && !adminEmailIsUnavailable
            && !errors.admin_email
        );
    }, [adminEmailError, adminEmailIsUnavailable, data.admin_email, data.admin_password, data.department_levels, data.name, editing, errors.admin_email]);

    const openCreate = () => {
        const draft = createDraft ?? {};

        reset();
        clearErrors();
        setDetailOpen(false);
        setViewing(null);
        setEditing(null);
        setAdminEmailTouched(draft.adminEmailTouched ?? false);
        setAdminEmailError('');
        setAdminEmailCheck({ status: 'idle', message: '' });
        setShowAdminPassword(false);
        setData({
            code: draft.code ?? '',
            name: draft.name ?? '',
            highest_department: draft.highest_department ?? 'college',
            department_levels: draft.department_levels ?? DEPARTMENT_OPTIONS.map((option) => option.value),
            admin_email: draft.admin_email ?? '',
            admin_password: draft.admin_password ?? buildPasswordPreview(),
            address: draft.address ?? '',
            is_main: draft.is_main ?? false,
            is_active: draft.is_active ?? true,
        });
        setSlideOpen(true);
    };

    const closeSlideOver = () => {
        const draft = {
            code: data.code,
            name: data.name,
            highest_department: data.highest_department,
            department_levels: data.department_levels,
            admin_email: data.admin_email,
            admin_password: data.admin_password,
            address: data.address,
            is_main: data.is_main,
            is_active: data.is_active,
            adminEmailTouched,
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

        setDetailOpen(false); setViewing(null);
        setData({
            code: draft.code ?? row.code,
            name: draft.name ?? row.name,
            highest_department: draft.highest_department ?? row.highest_department ?? 'college',
            department_levels: draft.department_levels ?? (row.departments ?? [])
                .filter((department) => Boolean(department.is_activated))
                .map((department) => {
                    const departmentName = String(department.name ?? '').toLowerCase();
                    const departmentCode = String(department.code ?? '').toLowerCase();

                    if (departmentName.includes('junior high') || departmentCode.includes('jhs')) {
                        return 'junior_high';
                    }

                    if (departmentName.includes('senior high') || departmentCode.includes('shs')) {
                        return 'senior_high';
                    }

                    return 'college';
                }),
            admin_email: draft.admin_email ?? '',
            admin_password: draft.admin_password ?? '',
            address: draft.address ?? row.address ?? '',
            is_main: draft.is_main ?? Boolean(row.is_main),
            is_active: draft.is_active ?? Boolean(row.is_active),
        });
        setAdminEmailTouched(draft.adminEmailTouched ?? false);
        setAdminEmailError('');
        setAdminEmailCheck({ status: 'idle', message: '' });
        setShowAdminPassword(false);
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const editFromDetails = () => viewing && openEdit(viewing);

    useEffect(() => {
        if (editing) {
            return;
        }

        setData('code', generatedBranchCode);
        if (!adminEmailTouched) {
            setData('admin_email', generatedAdminEmail);
        }
    }, [adminEmailTouched, editing, generatedAdminEmail, generatedBranchCode, setData]);

    useEffect(() => {
        setSuccessNotification(props.flash?.success ?? '');
    }, [props.flash?.success]);

    useEffect(() => {
        if (editing) {
            setAdminEmailCheck({ status: 'idle', message: '' });
            return;
        }

        const email = String(data.admin_email ?? '').trim();

        if (!slideOpen || !email || !isValidEmail(email)) {
            setAdminEmailCheck({ status: 'idle', message: '' });
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => {
            setAdminEmailCheck({ status: 'checking', message: 'Checking email...' });
            axios
                .get(route('admin.admin-users.email-availability'), {
                    params: { email },
                    signal: controller.signal,
                })
                .then((response) => {
                    setAdminEmailCheck({
                        status: response.data.available ? 'available' : 'taken',
                        message: response.data.message ?? '',
                    });
                })
                .catch((error) => {
                    if (axios.isCancel(error) || error.name === 'CanceledError') {
                        return;
                    }

                    setAdminEmailCheck({ status: 'idle', message: '' });
                });
        }, 350);

        return () => {
            window.clearTimeout(timeoutId);
            controller.abort();
        };
    }, [data.admin_email, editing, slideOpen]);

    useEffect(() => {
        if (!successNotification && !errorNotification) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setSuccessNotification('');
            setErrorNotification('');
        }, 3500);

        return () => window.clearTimeout(timeoutId);
    }, [successNotification, errorNotification]);

    const toggleDepartmentLevel = (departmentLevel) => {
        const selectedLevels = data.department_levels ?? [];
        const exists = selectedLevels.includes(departmentLevel);

        setData('department_levels', exists
            ? selectedLevels.filter((value) => value !== departmentLevel)
            : [...selectedLevels, departmentLevel]);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing && !branchIsDirty) return;
        if (editing) {
            setConfirmUpdateOpen(true);
            return;
        }

        if (!isValidEmail(data.admin_email)) {
            setAdminEmailError('Enter a valid email address.');
            return;
        }

        if (adminEmailIsUnavailable) {
            return;
        }

        performSave();
    };

    const performSave = () => {
        setErrorNotification('');
        setAdminEmailError('');

        if (editing) {
            router.put(route('admin.branches') + '/' + editing.id, {
                code: data.code,
                name: data.name,
                department_levels: data.department_levels,
                address: data.address,
            }, {
                onSuccess: () => {
                    const savedEditingId = editing.id;

                    setSlideOpen(false);
                    setConfirmUpdateOpen(false);
                    setEditDrafts((drafts) => {
                        const nextDrafts = { ...drafts };
                        delete nextDrafts[savedEditingId];
                        return nextDrafts;
                    });
                    reset();
                },
                onError: (formErrors) => { setErrorNotification(getFirstErrorMessage(formErrors, 'Unable to update branch.')); setConfirmUpdateOpen(false); },
            });
        } else {
            router.post(route('admin.branches'), {
                name: data.name,
                department_levels: data.department_levels,
                admin_email: data.admin_email,
                admin_password: data.admin_password,
                address: data.address,
            }, {
                onSuccess: () => { setSlideOpen(false); setCreateDraft(null); reset(); },
                onError: (formErrors) => setErrorNotification(getFirstErrorMessage(formErrors, 'Unable to create branch.')),
            });
        }
    };

    const confirmDelete = () => {
        setErrorNotification('');
        router.delete(route('admin.branches') + '/' + deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
            onError: () => setErrorNotification('Unable to delete branch.'),
        });
    };

    const confirmUnlinkAdmin = () => {
        if (!editing || !unlinkAdminTarget) {
            return;
        }

        setErrorNotification('');
        router.delete(route('admin.branches.admins.unlink', [editing.id, unlinkAdminTarget.id]), {
            onSuccess: () => {
                setUnlinkAdminTarget(null);
                setSlideOpen(false);
            },
            onError: () => setErrorNotification('Unable to unlink admin account.'),
        });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Branch Name' },
        { key: 'highest_department', label: 'Highest Dept.' },
        { key: 'departments_count', label: 'Departments', render: (r) => r.departments_count ?? 0 },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    return (
        <AdminLayout title="Branches" activeRoute="admin.branches" breadcrumbs={['System Controls']}>
            <Notification type="success" message={successNotification} onClose={() => setSuccessNotification('')} />
            <Notification type="error" message={errorNotification} onClose={() => setErrorNotification('')} />

            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Branches</h2>
                    <p className="text-sm text-slate-500">Manage campus branches and their admin accounts.</p>
                </div>
                <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    + New Branch
                </button>
            </div>

            <ResourceTable
                columns={columns}
                data={branches}
                filters={filters}
                routeName="admin.branches"
                searchPlaceholder="Search branches..."
                onRowClick={openView}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
            />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Branch Information">
                {viewing && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.name ?? '-'}</h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.code ?? '-'}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Highest Department</p><p className="mt-1 text-sm text-slate-900">{viewing.highest_department ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Departments</p><p className="mt-1 text-sm text-slate-900">{viewing.departments_count ?? 0}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p><p className="mt-1 text-sm text-slate-900">{viewing.address ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><StatusBadge active={viewing.is_active} /></div></div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDetailOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Close</button>
                            <button type="button" onClick={editFromDetails} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">Edit Branch</button>
                        </div>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={closeSlideOver} title={editing ? 'Edit Branch' : 'New Branch'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch Code" error={errors.code} required>
                        <TextInput
                            value={data.code}
                            onChange={(e) => setData('code', e.target.value)}
                            placeholder="Auto-generated"
                            readOnly={!editing}
                            className={!editing ? 'cursor-not-allowed bg-slate-50 text-slate-600' : ''}
                        />
                    </FormField>
                    <FormField label="Branch Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Main Campus" />
                    </FormField>
                    <FormField label="Address" error={errors.address}>
                        <TextInput value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Branch address" />
                    </FormField>

                    {editing ? (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                            <div>
                                <p className="text-sm font-medium text-slate-900">Active Departments</p>
                                <p className="text-xs text-slate-500">Configured departments currently active for this branch.</p>
                            </div>

                            {(editing.departments ?? []).filter((department) => Boolean(department.is_activated)).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {(editing.departments ?? [])
                                        .filter((department) => Boolean(department.is_activated))
                                        .map((department) => (
                                            <span
                                                key={department.id}
                                                className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                                            >
                                                {department.name}
                                            </span>
                                        ))}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                                    No active departments configured for this branch yet.
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => router.get(route('admin.departments'), { branch_id: editing.id })}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Configure Departments
                            </button>
                        </div>
                    ) : (
                        <FormField label="Departments" error={errors.department_levels} required>
                            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3">
                                {DEPARTMENT_OPTIONS.map((option) => {
                                    const checked = (data.department_levels ?? []).includes(option.value);

                                    return (
                                        <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleDepartmentLevel(option.value)}
                                                className="rounded border-slate-300"
                                            />
                                            {option.label} Department
                                        </label>
                                    );
                                })}
                            </div>
                        </FormField>
                    )}

                    {!editing && (
                        <>
                            <FormField label="Admin Email" error={adminEmailError || adminEmailTakenError || errors.admin_email} required>
                                <TextInput
                                    type="email"
                                    value={data.admin_email}
                                    onChange={(e) => {
                                        const value = e.target.value;

                                        setAdminEmailTouched(true);
                                        setData('admin_email', value);
                                        clearErrors('admin_email');
                                        if (adminEmailError && isValidEmail(value)) {
                                            setAdminEmailError('');
                                        }
                                    }}
                                    placeholder="Auto-generated"
                                />
                                {adminEmailCheck.status === 'checking' && (
                                    <p className="mt-1 text-xs text-slate-500">Checking email...</p>
                                )}
                                {adminEmailCheck.status === 'available' && (
                                    <p className="mt-1 text-xs text-emerald-600">Email is available.</p>
                                )}
                            </FormField>
                            <FormField label="Admin Password" error={errors.admin_password} required>
                                <div className="relative">
                                    <TextInput
                                        type={showAdminPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        data-lpignore="true"
                                        data-1p-ignore="true"
                                        value={data.admin_password}
                                        onChange={(e) => setData('admin_password', e.target.value)}
                                        placeholder="Auto-generated"
                                        className="pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowAdminPassword((value) => !value)}
                                        className="absolute inset-y-0 right-2 flex items-center rounded-md px-2 text-slate-400 hover:text-slate-600"
                                        aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                                    >
                                        <AppIcon name={showAdminPassword ? 'eyeOff' : 'eye'} className="h-4 w-4" />
                                    </button>
                                </div>
                            </FormField>
                        </>
                    )}

                    {editing && (
                        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Linked Admin Accounts</p>
                                    <p className="text-xs text-slate-500">Manage the admin accounts currently linked to this branch.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => router.get(route('admin.admin-users'), { create_branch_id: editing.id })}
                                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Add Admin Account
                                </button>
                            </div>
                            <div className="space-y-3">
                                {(editing.admins ?? []).length > 0 ? (
                                    editing.admins.map((admin) => (
                                        <div key={admin.id} className="rounded-lg border border-slate-200 px-4 py-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900">{admin.name}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{admin.email}</p>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                            {admin.role}
                                                        </span>
                                                        <StatusBadge active={Boolean(admin.is_activated)} />
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => router.get(route('admin.admin-users'), { search: admin.email, edit_id: admin.id })}
                                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setUnlinkAdminTarget(admin)}
                                                        className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                                    >
                                                        Unlink
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                                        No admin accounts are linked to this branch yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={cancelSlideOver} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <SubmitButton processing={processing} disabled={editing ? !branchIsDirty : !createFormIsComplete} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                title="Delete Branch"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
            />
            <ConfirmDialog
                open={Boolean(unlinkAdminTarget)}
                onConfirm={confirmUnlinkAdmin}
                onCancel={() => setUnlinkAdminTarget(null)}
                title="Unlink Admin Account"
                message={`Unlink admin "${unlinkAdminTarget?.name}" from this branch?`}
            />

            <AppConfirmDialog
                open={confirmUpdateOpen}
                title="Save changes?"
                message={`Save changes to ${editing?.name ?? 'this branch'}?`}
                confirmLabel="Update"
                tone="primary"
                loading={processing}
                onConfirm={performSave}
                onCancel={() => setConfirmUpdateOpen(false)}
            />
        </AdminLayout>
    );
}
