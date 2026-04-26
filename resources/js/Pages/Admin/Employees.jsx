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
import { router, useForm } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

const buildEmployeeCode = (branch, nextEmployeeCodes = {}) => {
    if (!branch?.code) {
        return nextEmployeeCodes.default ?? 'EMP-GEN-00001';
    }

    return nextEmployeeCodes[String(branch.id)] ?? `EMP-${String(branch.code).replace(/[^A-Za-z0-9]/g, '').toUpperCase()}-00001`;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value ?? '').trim());

const EMPLOYEE_CSV_TEMPLATE_COLUMNS = [
    'First Name',
    'Middle Name',
    'Last Name',
    'Branch',
    'Employee Department',
    'Email',
    'Password',
];

const CSV_REQUIRED_COLUMNS = ['First Name', 'Last Name', 'Email'];
const normalizeCsvKey = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const normalizeCsvValue = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');

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
            if (char === '\r' && next === '\n') i += 1;
            row.push(value);
            if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
            row = [];
            value = '';
        } else {
            value += char;
        }
    }

    row.push(value);
    if (row.some((cell) => String(cell).trim() !== '')) rows.push(row);
    return rows;
};

const uniqueBy = (items, keyFn) => {
    const seen = new Set();
    return items.filter((item) => {
        const key = keyFn(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

export default function Employees({
    employees,
    filters,
    branches,
    departments,
    employeeDepartments = [],
    programs,
    strands,
    nextEmployeeCodes,
    isBranchAdmin,
    selectedBranchId,
    scopedBranchId,
}) {
    const fileInputRef = useRef(null);
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [emailCheck, setEmailCheck] = useState({ status: 'idle', message: '' });
    const [createDraft, setCreateDraft] = useState(null);
    const [editDrafts, setEditDrafts] = useState({});
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const selectedFilterBranchId = String(filters.branch_id ?? activeBranchId ?? '');
    const selectedFilterEmployeeDepartmentId = String(filters.employee_department_id ?? '');

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        employee_no: '',
        branch_id: activeBranchId,
        department_id: '',
        employee_department_id: '',
        program_id: '',
        strand_id: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix_name: '',
        email: '',
        password: '',
        role: 'Employee',
    });
    const importForm = useForm({ file: null });
    const [csvInspection, setCsvInspection] = useState({ status: 'idle', rows: 0, errors: [], warnings: [] });

    const { isDirty: employeeIsDirty } = useFormDirty(data, editing?.id ?? 'new');
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
            && String(data.employee_department_id ?? '').trim()
            && String(data.first_name ?? '').trim()
            && String(data.last_name ?? '').trim()
            && (!email || isValidEmail(email))
            && !emailIsUnavailable
        );
    }, [data.branch_id, data.email, data.employee_department_id, data.first_name, data.last_name, editing, emailIsUnavailable]);

    const selectedBranch = useMemo(
        () => branches.find((branch) => String(branch.id) === String(data.branch_id)),
        [branches, data.branch_id],
    );
    const csvReferenceRows = useMemo(() => uniqueBy([
        ...branches.map((branch) => `Branch: ${branch.name}`),
        ...employeeDepartments.map((department) => `Employee Department: ${department.name}`),
    ].filter(Boolean), (row) => row.toLowerCase()).slice(0, 80), [branches, employeeDepartments]);
    const existingEmployeeEmails = useMemo(
        () => new Set((employees?.data ?? []).map((employee) => normalizeCsvValue(employee.email)).filter(Boolean)),
        [employees],
    );
    const filterEmployeeDepartments = useMemo(
        () => employeeDepartments.filter((department) => (
            !selectedFilterBranchId
            || !department.branch_id
            || String(department.branch_id) === selectedFilterBranchId
        )),
        [employeeDepartments, selectedFilterBranchId],
    );
    const generatedEmployeeCode = editing ? data.employee_no : buildEmployeeCode(selectedBranch, nextEmployeeCodes);

    useEffect(() => {
        if (!data.branch_id && activeBranchId) {
            setData('branch_id', activeBranchId);
        }
    }, [activeBranchId, data.branch_id, setData]);

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
            employee_department_id: draft.employee_department_id ?? '',
            program_id: draft.program_id ?? '',
            strand_id: draft.strand_id ?? '',
            first_name: draft.first_name ?? '',
            middle_name: draft.middle_name ?? '',
            last_name: draft.last_name ?? '',
            suffix_name: draft.suffix_name ?? '',
            email: draft.email ?? '',
            password: draft.password ?? '',
            role: draft.role ?? 'Employee',
        });
        setSlideOpen(true);
    };

    const closeSlideOver = () => {
        const draft = {
            employee_no: data.employee_no,
            branch_id: data.branch_id,
            department_id: data.department_id,
            employee_department_id: data.employee_department_id,
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
            department_id: draft.department_id ?? row.department_id ?? '',
            employee_department_id: draft.employee_department_id ?? row.employee_department_id ?? '',
            program_id: draft.program_id ?? row.program_id ?? '',
            strand_id: draft.strand_id ?? row.strand_id ?? '',
            first_name: draft.first_name ?? row.first_name,
            middle_name: draft.middle_name ?? row.middle_name ?? '',
            last_name: draft.last_name ?? row.last_name,
            suffix_name: draft.suffix_name ?? row.suffix_name ?? '',
            email: draft.email ?? row.email ?? '',
            password: draft.password ?? '',
            role: draft.role ?? row.role ?? 'Employee',
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
        if (editing && !employeeIsDirty) return;
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
                .get(route('admin.employees.email-availability'), {
                    params: {
                        email,
                        employee_id: editing?.id ?? '',
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
        const url = editing ? route('admin.employees') + '/' + editing.id : route('admin.employees');
        const payload = {
            ...data,
            employee_no: generatedEmployeeCode,
        };
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, payload, {
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
                setSubmitError(firstError || 'Unable to save employee.');
                setConfirmUpdateOpen(false);
            },
        });
    };

    const changeBranch = (branchId = '') => {
        router.get(route('admin.employees'), { ...filters, branch_id: branchId, employee_department_id: '' }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeEmployeeDepartmentFilter = (employeeDepartmentId = '') => {
        router.get(route('admin.employees'), { ...filters, employee_department_id: employeeDepartmentId }, {
            preserveState: true,
            replace: true,
        });
    };

    const closeBulkUpload = () => {
        setBulkUploadOpen(false);
        importForm.reset();
        importForm.clearErrors();
        setCsvInspection({ status: 'idle', rows: 0, errors: [], warnings: [] });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const inspectCsvText = (text) => {
        const rows = parseCsvText(text);
        const errors = [];
        const warnings = [];
        if (rows.length === 0) return { status: 'error', rows: 0, errors: ['CSV is empty.'], warnings: [] };

        const header = rows[0].map((cell) => normalizeCsvKey(cell));
        const columnIndex = (names) => names.map((name) => header.indexOf(normalizeCsvKey(name))).find((index) => index >= 0);
        const getCell = (row, names) => {
            const index = columnIndex(Array.isArray(names) ? names : [names]);
            return index >= 0 ? String(row[index] ?? '').trim() : '';
        };
        const missingHeaders = CSV_REQUIRED_COLUMNS.filter((column) => columnIndex([column]) === undefined).map((column) => `"${column}"`);
        if (missingHeaders.length) errors.push(`Missing required column(s): ${missingHeaders.join(', ')}.`);

        const findByValue = (items, value, labelFn, scopedFn = () => true) => {
            const normalized = normalizeCsvValue(value);
            if (!normalized) return null;
            if (/^\d+$/.test(String(value).trim())) return items.find((item) => String(item.id) === String(value).trim()) ?? null;
            const matches = items.filter((item) => scopedFn(item)).filter((item) => [labelFn(item), item.name, item.code].filter(Boolean).map((label) => normalizeCsvValue(label)).includes(normalized));
            return matches.length === 1 ? matches[0] : null;
        };
        const seenEmails = new Map();

        rows.slice(1).forEach((row, index) => {
            const rowNum = index + 2;
            const firstName = getCell(row, 'First Name');
            const lastName = getCell(row, 'Last Name');
            const email = getCell(row, 'Email');
            const branchValue = getCell(row, ['Branch', 'Branch ID']);
            const employeeDepartmentValue = getCell(row, ['Employee Department', 'Employee Department ID', 'Department', 'Department ID']);

            if (!firstName) errors.push(`Row ${rowNum}: First Name is required.`);
            if (!lastName) errors.push(`Row ${rowNum}: Last Name is required.`);
            if (!email) {
                errors.push(`Row ${rowNum}: Email is required.`);
            } else if (!isValidEmail(email)) {
                errors.push(`Row ${rowNum}: Email is not valid.`);
            } else {
                const normalizedEmail = normalizeCsvValue(email);
                if (seenEmails.has(normalizedEmail)) errors.push(`Row ${rowNum}: Email duplicates row ${seenEmails.get(normalizedEmail)}.`);
                if (existingEmployeeEmails.has(normalizedEmail)) warnings.push(`Row ${rowNum}: Email already appears in the current employees list; server will reject it if it already exists.`);
                seenEmails.set(normalizedEmail, rowNum);
            }

            const branch = scopedBranchId ? branches.find((item) => String(item.id) === String(scopedBranchId)) : findByValue(branches, branchValue, (item) => item.name);
            const employeeDepartment = findByValue(
                employeeDepartments,
                employeeDepartmentValue,
                (item) => item.name,
                (item) => !branch || !item.branch_id || String(item.branch_id) === String(branch.id),
            );

            if (!scopedBranchId && branchValue && !branch) errors.push(`Row ${rowNum}: Branch was not found.`);
            if (!employeeDepartmentValue) errors.push(`Row ${rowNum}: Employee Department is required.`);
            if (employeeDepartmentValue && !employeeDepartment) errors.push(`Row ${rowNum}: Employee Department was not found or does not match the branch.`);
            if (!branchValue && !scopedBranchId) warnings.push(`Row ${rowNum}: Branch is blank, so the employee number will use the generic EMP-GEN prefix.`);
        });

        const dataRows = Math.max(rows.length - 1, 0);
        if (dataRows === 0) errors.push('CSV has a header but no employee rows.');
        return { status: errors.length ? 'error' : 'ready', rows: dataRows, errors, warnings };
    };

    const inspectCsvFile = (file) => {
        setCsvInspection({ status: 'idle', rows: 0, errors: [], warnings: [] });
        if (!file) return;
        setCsvInspection({ status: 'checking', rows: 0, errors: [], warnings: [] });
        const reader = new FileReader();
        reader.onload = () => setCsvInspection(inspectCsvText(String(reader.result ?? '')));
        reader.onerror = () => setCsvInspection({ status: 'error', rows: 0, errors: ['Unable to read the selected CSV file.'], warnings: [] });
        reader.readAsText(file);
    };

    const handleCsvFileChange = (e) => {
        const file = e.target.files?.[0] ?? null;
        importForm.setData('file', file);
        importForm.clearErrors('file');
        inspectCsvFile(file);
    };

    const copyCsvInspectionMessages = () => {
        const lines = [
            csvInspection.status === 'error' ? 'CSV needs changes before upload' : `CSV ready: ${csvInspection.rows} employee row(s) found`,
            ...csvInspection.errors.map((message) => `Error: ${message}`),
            ...csvInspection.warnings.map((message) => `Warning: ${message}`),
        ];
        navigator.clipboard?.writeText(lines.join('\n'));
    };

    const submitBulkUpload = (e) => {
        e.preventDefault();
        if (csvInspection.status === 'error') return;
        importForm.post(route('admin.import.employees'), { forceFormData: true, preserveScroll: true, onSuccess: closeBulkUpload });
    };

    const downloadCsvTemplate = () => {
        const exampleBranchId = selectedFilterBranchId || activeBranchId || '1';
        const exampleBranch = branches.find((branch) => String(branch.id) === String(exampleBranchId)) ?? branches[0];
        const exampleDepartment = employeeDepartments.find((department) => !exampleBranch || !department.branch_id || String(department.branch_id) === String(exampleBranch.id)) ?? employeeDepartments[0];
        const rows = [EMPLOYEE_CSV_TEMPLATE_COLUMNS, ['Pedro', 'S', 'Reyes', exampleBranch?.name ?? 'Santa Rosa', exampleDepartment?.name ?? 'Administrative Office', 'pedro.reyes@example.com', 'hcc1234']];
        const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
        const link = document.createElement('a');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        link.href = url;
        link.download = 'employee-upload-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const columns = [
        { key: 'employee_no', label: 'Employee No.' },
        { key: 'full_name', label: 'Full Name', render: (row) => `${row.last_name}, ${row.first_name} ${row.middle_name ?? ''}`.trim() },
        { key: 'branch', label: 'Branch', render: (row) => row.branch?.name ?? '-' },
        { key: 'employee_department', label: 'Department', render: (row) => row.employee_department?.name ?? row.department?.name ?? '-' },
        { key: 'role', label: 'Role' },
        { key: 'is_active', label: 'Status', render: (row) => <StatusBadge active={row.is_active} activeLabel={row.status ?? 'Active'} inactiveLabel="Inactive" /> },
    ];

    return (
        <AdminLayout title="Employees" activeRoute="admin.employees" breadcrumbs={['User Management']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Employees</h2>
                    <p className="text-sm text-slate-500">Manage non-teaching staff, office assignments, and branch-scoped employee accounts.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setBulkUploadOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <AppIcon name="upload" className="h-4 w-4" />
                        Bulk Upload CSV
                    </button>
                    <button type="button" onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Employee</button>
                </div>
            </div>

            {branches.length > 0 && (
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
                data={employees}
                filters={filters}
                routeName="admin.employees"
                searchPlaceholder="Search by name or employee no..."
                onRowClick={openView}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                extraHeaderActions={(
                    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
                        <SelectInput
                            value={selectedFilterEmployeeDepartmentId}
                            onChange={(e) => changeEmployeeDepartmentFilter(e.target.value)}
                            className="w-full md:w-56"
                        >
                            <option value="">All employee departments</option>
                            {filterEmployeeDepartments.map((department) => (
                                <option key={department.id} value={department.id}>{department.name}</option>
                            ))}
                        </SelectInput>
                    </div>
                )}
            />

            <Modal show={bulkUploadOpen} maxWidth="2xl" onClose={closeBulkUpload}>
                <form onSubmit={submitBulkUpload} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Bulk Upload</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">Upload Employees CSV</h3>
                            <p className="mt-1 text-sm text-slate-500">Employee numbers are generated automatically. New accounts use the default password hcc1234.</p>
                        </div>
                        <button type="button" onClick={closeBulkUpload} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Close</button>
                    </div>

                    <div className="mt-5 space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">CSV File</label>
                            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvFileChange} className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            {importForm.errors.file && <p className="mt-1 text-sm text-rose-600">{importForm.errors.file}</p>}
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">CSV Template</p>
                                    <p className="mt-1 text-sm text-slate-600">Enter names for Branch and Employee Department. Old numeric ID columns still work.</p>
                                </div>
                                <button type="button" onClick={downloadCsvTemplate} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Download Template</button>
                            </div>
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">{EMPLOYEE_CSV_TEMPLATE_COLUMNS.join(',')}</pre>
                            {csvReferenceRows.length > 0 && (
                                <details className="mt-3 rounded-md bg-white p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                                    <summary className="cursor-pointer font-semibold text-slate-800">Name reference for CSV values</summary>
                                    <div className="mt-2 grid max-h-48 gap-1 overflow-y-auto sm:grid-cols-2">
                                        {csvReferenceRows.map((row) => <span key={row}>{row}</span>)}
                                    </div>
                                </details>
                            )}
                        </div>
                    </div>

                    {csvInspection.status !== 'idle' && (
                        <div className={`mt-6 rounded-lg border px-4 py-3 text-sm ${csvInspection.status === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <p className="font-semibold">{csvInspection.status === 'checking' ? 'Inspecting CSV...' : csvInspection.status === 'error' ? 'CSV needs changes before upload' : `CSV ready: ${csvInspection.rows} employee row(s) found`}</p>
                                {csvInspection.status !== 'checking' && (
                                    <button type="button" onClick={copyCsvInspectionMessages} title="Copy CSV inspection messages" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/80 text-slate-600 ring-1 ring-slate-200 hover:bg-white hover:text-slate-900">
                                        <AppIcon name="copy" className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                            {csvInspection.errors.length > 0 && (
                                <ul className="mt-2 max-h-36 list-disc space-y-1 overflow-y-auto pl-5 text-xs">
                                    {csvInspection.errors.slice(0, 12).map((message) => <li key={message}>{message}</li>)}
                                    {csvInspection.errors.length > 12 && <li>{csvInspection.errors.length - 12} more issue(s) hidden.</li>}
                                </ul>
                            )}
                            {csvInspection.warnings.length > 0 && (
                                <div className="mt-2 rounded-md bg-white/70 p-2 text-xs text-amber-700 ring-1 ring-amber-200">
                                    <p className="font-semibold">Warnings</p>
                                    <ul className="mt-1 list-disc space-y-1 pl-5">
                                        {csvInspection.warnings.slice(0, 6).map((message) => <li key={message}>{message}</li>)}
                                        {csvInspection.warnings.length > 6 && <li>{csvInspection.warnings.length - 6} more warning(s) hidden.</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button type="button" onClick={closeBulkUpload} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={importForm.processing || !importForm.data.file || ['checking', 'error'].includes(csvInspection.status)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">{importForm.processing ? 'Uploading...' : 'Upload CSV'}</button>
                    </div>
                </form>
            </Modal>

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Employee Information" width="max-w-xl">
                {viewing && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</p>
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
                                    <StatusBadge active={viewing.is_active} activeLabel={viewing.status ?? 'Active'} inactiveLabel="Inactive" />
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.branch?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.employee_department?.name ?? viewing.department?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Program</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.program?.name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                                <p className="mt-1 text-sm text-slate-900">{viewing.role ?? '-'}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setDetailOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Close</button>
                            <button type="button" onClick={editFromDetails} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">Edit Employee</button>
                        </div>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={closeSlideOver} title={editing ? 'Edit Employee' : 'New Employee'} width="max-w-xl">
                <form onSubmit={submit} className="space-y-4">
                    {(submitError || Object.keys(errors).length > 0) && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {submitError || 'Please review the highlighted fields and try again.'}
                        </div>
                    )}
                    <FormField label="Employee No." error={errors.employee_no} required>
                        <TextInput value={generatedEmployeeCode} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
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
                            <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                                <option value="">Select branch...</option>
                                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                            </SelectInput>
                        )}
                    </FormField>
                    <FormField label="Department" error={errors.employee_department_id} required>
                        <SelectInput value={data.employee_department_id} onChange={(e) => {
                            setData('employee_department_id', e.target.value);
                            clearErrors('employee_department_id');
                        }}>
                            <option value="">Select department...</option>
                            {employeeDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
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
                        <SubmitButton processing={processing} disabled={editing ? emailIsUnavailable || !employeeIsDirty : !createFormIsComplete} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.employees') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Employee" message={`Delete employee "${deleteTarget?.first_name} ${deleteTarget?.last_name}"?`} />

            <AppConfirmDialog
                open={confirmUpdateOpen}
                title="Save changes?"
                message={`Save changes to ${`${editing?.first_name ?? ''} ${editing?.last_name ?? ''}`.trim() || 'this employee'}?`}
                confirmLabel="Update"
                tone="primary"
                loading={processing}
                onConfirm={performSave}
                onCancel={() => setConfirmUpdateOpen(false)}
            />
        </AdminLayout>
    );
}
