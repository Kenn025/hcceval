import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const DEPARTMENT_OPTIONS = [
    { value: 'elementary', label: 'Elementary' },
    { value: 'junior_high', label: 'Junior High' },
    { value: 'senior_high', label: 'Senior High' },
    { value: 'college', label: 'College' },
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
    const generatedBranchCode = useMemo(() => buildBranchCodePreview(data.name), [data.name]);
    const generatedAdminEmail = useMemo(() => buildAdminEmailPreview(data.name), [data.name]);

    const openCreate = () => {
        reset();
        clearErrors();
        setDetailOpen(false);
        setViewing(null);
        setEditing(null);
        setAdminEmailTouched(false);
        setData({
            code: '',
            name: '',
            highest_department: 'college',
            department_levels: DEPARTMENT_OPTIONS.map((option) => option.value),
            admin_email: '',
            admin_password: buildPasswordPreview(),
            address: '',
            is_main: false,
            is_active: true,
        });
        setSlideOpen(true);
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const openEdit = (row) => {
        setDetailOpen(false); setViewing(null);
        setData({
            code: row.code,
            name: row.name,
            highest_department: row.highest_department ?? 'college',
            department_levels: [],
            admin_email: '',
            admin_password: '',
            address: row.address ?? '',
            is_main: Boolean(row.is_main),
            is_active: Boolean(row.is_active),
        });
        setAdminEmailTouched(false);
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
        setErrorNotification('');

        if (editing) {
            router.put(route('admin.branches') + '/' + editing.id, {
                code: data.code,
                name: data.name,
                highest_department: data.highest_department,
                address: data.address,
                is_main: data.is_main,
                is_active: data.is_active,
            }, {
                onSuccess: () => { setSlideOpen(false); reset(); },
                onError: (formErrors) => setErrorNotification(getFirstErrorMessage(formErrors, 'Unable to update branch.')),
            });
        } else {
            router.post(route('admin.branches'), {
                name: data.name,
                department_levels: data.department_levels,
                admin_email: data.admin_email,
                admin_password: data.admin_password,
                address: data.address,
                is_main: data.is_main,
                is_active: data.is_active,
            }, {
                onSuccess: () => { setSlideOpen(false); reset(); },
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

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Branch' : 'New Branch'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch Code" error={errors.code} required>
                        <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="Auto-generated" readOnly={!editing} />
                    </FormField>
                    <FormField label="Branch Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Main Campus" />
                    </FormField>
                    <FormField label="Address" error={errors.address}>
                        <TextInput value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Branch address" />
                    </FormField>
                    {!editing && (
                        <>
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
                            <FormField label="Admin Email" error={errors.admin_email} required>
                                <TextInput
                                    value={data.admin_email}
                                    onChange={(e) => {
                                        setAdminEmailTouched(true);
                                        setData('admin_email', e.target.value);
                                    }}
                                    placeholder="Auto-generated"
                                />
                            </FormField>
                            <FormField label="Admin Password" error={errors.admin_password} required>
                                <TextInput value={data.admin_password} onChange={(e) => setData('admin_password', e.target.value)} placeholder="Auto-generated" />
                            </FormField>
                        </>
                    )}
                    {editing && (
                        <FormField label="Highest Department" error={errors.highest_department}>
                            <SelectInput value={data.highest_department} onChange={(e) => setData('highest_department', e.target.value)}>
                                {DEPARTMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </SelectInput>
                        </FormField>
                    )}
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={data.is_main} onChange={(e) => setData('is_main', e.target.checked)} className="rounded border-slate-300" />
                            Main Campus
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="rounded border-slate-300" />
                            Active
                        </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <SubmitButton processing={processing} className="flex-1">
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
        </AdminLayout>
    );
}
