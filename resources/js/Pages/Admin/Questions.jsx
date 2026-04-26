import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import useFormDirty from '@/Components/Admin/useFormDirty';
import AppIcon from '@/Components/AppIcon';
import AppConfirmDialog from '@/Components/ConfirmDialog';
import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';

const QUESTION_CSV_TEMPLATE_COLUMNS = [
    'Question Type',
    'Question Class',
    'Question Text',
    'Status',
];

const CSV_REQUIRED_COLUMNS = ['Question Type', 'Question Class', 'Question Text'];

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

export default function Questions({ questions, questionTypes, questionClasses, nextQuestionCode, filters, routeName, title, description }) {
    const fileInputRef = useRef(null);
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [csvInspection, setCsvInspection] = useState({ status: 'idle', rows: 0, errors: [], warnings: [] });

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        question_code: nextQuestionCode ?? 'Q-001',
        question_type_id: '',
        question_class_id: '',
        question_text: '',
        is_active: true,
    });
    const importForm = useForm({ file: null });

    const { isDirty } = useFormDirty(data, editing?.question_id ?? 'new');
    const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);
    const selectedQuestionClassId = String(filters.question_class_id ?? '');
    const selectedQuestionTypeId = String(filters.question_type_id ?? '');
    const csvReferenceRows = useMemo(() => uniqueBy([
        ...questionTypes.map((type) => `Question Type: ${type.name}`),
        ...questionClasses.map((questionClass) => `Question Class: ${questionClass.name}`),
    ], (row) => row.toLowerCase()), [questionClasses, questionTypes]);
    const questionRequiredFieldsComplete = Boolean(
        String(data.question_type_id ?? '').trim()
        && String(data.question_class_id ?? '').trim()
        && String(data.question_text ?? '').trim()
    );

    const openCreate = () => {
        reset();
        clearErrors();
        setData({
            question_code: nextQuestionCode ?? 'Q-001',
            question_type_id: '',
            question_class_id: '',
            question_text: '',
            is_active: true,
        });
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({
            question_code: row.question_code ?? '',
            question_type_id: row.question_type_id ?? '',
            question_class_id: row.question_class_id ?? '',
            question_text: row.question_text ?? '',
            is_active: Boolean(row.is_active),
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
        if (!questionRequiredFieldsComplete) return;
        if (editing && !isDirty) return;
        if (editing) { setConfirmUpdateOpen(true); return; }
        performSave();
    };

    const performSave = () => {
        const url = editing ? '/admin/questions/' + editing.question_id : '/admin/questions';
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                setConfirmUpdateOpen(false);
                reset();
            },
            onError: () => setConfirmUpdateOpen(false),
        });
    };

    const columns = [
        { key: 'question_code', label: 'Question Code' },
        { key: 'question_type_name', label: 'Question Type', render: (r) => r.question_type_name ?? '-' },
        { key: 'question_class_name', label: 'Class', render: (r) => r.question_class_name ?? '-' },
        { key: 'question_text', label: 'Question', render: (r) => <span className="line-clamp-2">{r.question_text}</span> },
    ];

    const changeQuestionClassFilter = (questionClassId) => {
        router.get(route(routeName), { ...filters, question_class_id: questionClassId }, {
            preserveState: true,
            replace: true,
        });
    };

    const changeQuestionTypeFilter = (questionTypeId) => {
        router.get(route(routeName), { ...filters, question_type_id: questionTypeId }, {
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

        if (rows.length === 0) {
            return { status: 'error', rows: 0, errors: ['CSV is empty.'], warnings: [] };
        }

        const header = rows[0].map((cell) => normalizeCsvKey(cell));
        const columnIndex = (names) => names.map((name) => header.indexOf(normalizeCsvKey(name))).find((index) => index >= 0);
        const getCell = (row, names) => {
            const index = columnIndex(Array.isArray(names) ? names : [names]);
            return index >= 0 ? String(row[index] ?? '').trim() : '';
        };
        const missingHeaders = CSV_REQUIRED_COLUMNS
            .filter((column) => columnIndex([column]) === undefined)
            .map((column) => `"${column}"`);

        if (missingHeaders.length > 0) {
            errors.push(`Missing required column(s): ${missingHeaders.join(', ')}.`);
        }

        const findByValue = (items, value) => {
            const normalized = normalizeCsvValue(value);
            if (!normalized) return null;
            if (/^\d+$/.test(String(value).trim())) return items.find((item) => String(item.id) === String(value).trim()) ?? null;

            const matches = items.filter((item) => [item.name, item.code]
                .filter(Boolean)
                .map((label) => normalizeCsvValue(label))
                .includes(normalized));

            return matches.length === 1 ? matches[0] : null;
        };

        const seenQuestions = new Map();

        rows.slice(1).forEach((row, index) => {
            const rowNum = index + 2;
            const typeValue = getCell(row, ['Question Type', 'Question Type ID', 'Type']);
            const classValue = getCell(row, ['Question Class', 'Question Class ID', 'Class']);
            const textValue = getCell(row, ['Question Text', 'Question']);
            const statusValue = getCell(row, ['Status', 'Is Active']);

            if (!typeValue) errors.push(`Row ${rowNum}: Question Type is required.`);
            if (!classValue) errors.push(`Row ${rowNum}: Question Class is required.`);
            if (!textValue) errors.push(`Row ${rowNum}: Question Text is required.`);
            if (textValue.length > 1000) errors.push(`Row ${rowNum}: Question Text must be 1000 characters or fewer.`);

            if (typeValue && !findByValue(questionTypes, typeValue)) {
                errors.push(`Row ${rowNum}: Question Type was not found.`);
            }
            if (classValue && !findByValue(questionClasses, classValue)) {
                errors.push(`Row ${rowNum}: Question Class was not found.`);
            }
            if (statusValue && !['active', 'inactive', 'disabled', '1', '0', 'true', 'false', 'yes', 'no'].includes(normalizeCsvValue(statusValue))) {
                warnings.push(`Row ${rowNum}: Status is not a standard value; it will import as active unless it is inactive, disabled, or 0.`);
            }

            const normalizedQuestion = normalizeCsvValue(textValue);
            if (normalizedQuestion) {
                if (seenQuestions.has(normalizedQuestion)) {
                    warnings.push(`Row ${rowNum}: Question text duplicates row ${seenQuestions.get(normalizedQuestion)}.`);
                }
                seenQuestions.set(normalizedQuestion, rowNum);
            }
        });

        const dataRows = Math.max(rows.length - 1, 0);
        if (dataRows === 0) {
            errors.push('CSV has a header but no question rows.');
        }

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
            csvInspection.status === 'error' ? 'CSV needs changes before upload' : `CSV ready: ${csvInspection.rows} question row(s) found`,
            ...csvInspection.errors.map((message) => `Error: ${message}`),
            ...csvInspection.warnings.map((message) => `Warning: ${message}`),
        ];
        navigator.clipboard?.writeText(lines.join('\n'));
    };

    const submitBulkUpload = (e) => {
        e.preventDefault();
        if (csvInspection.status === 'error') return;
        importForm.post(route('admin.import.questions'), { forceFormData: true, preserveScroll: true, onSuccess: closeBulkUpload });
    };

    const downloadCsvTemplate = () => {
        const rows = [
            QUESTION_CSV_TEMPLATE_COLUMNS,
            [
                questionTypes[0]?.name ?? 'Student to Teacher',
                questionClasses[0]?.name ?? 'Professional Competence',
                'The teacher explains the lesson clearly.',
                'active',
            ],
        ];
        const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'question-upload-template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const filterActions = (
        <div className="flex flex-wrap items-center gap-2">
            <SelectInput
                value={selectedQuestionClassId}
                onChange={(e) => changeQuestionClassFilter(e.target.value)}
                className="w-full md:w-56"
            >
                <option value="">All question classes</option>
                {questionClasses.map((questionClass) => (
                    <option key={questionClass.id} value={questionClass.id}>{questionClass.name}</option>
                ))}
            </SelectInput>
            <SelectInput
                value={selectedQuestionTypeId}
                onChange={(e) => changeQuestionTypeFilter(e.target.value)}
                className="w-full md:w-56"
            >
                <option value="">All question types</option>
                {questionTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                ))}
            </SelectInput>
        </div>
    );

    const questionRowActions = (row) => (
        <div className="flex justify-end gap-2">
            <button
                type="button"
                onClick={() => openEdit(row)}
                title="Edit question"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
                <AppIcon name="edit" className="h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={() => setDeleteTarget(row)}
                title="Delete question"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
            >
                <AppIcon name="trash" className="h-4 w-4" />
            </button>
        </div>
    );

    return (
        <AdminLayout title={title} activeRoute={routeName} breadcrumbs={['Question Bank']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setBulkUploadOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <AppIcon name="upload" className="h-4 w-4" />
                        Bulk Upload CSV
                    </button>
                    <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Question</button>
                </div>
            </div>

            <ResourceTable columns={columns} data={questions} filters={filters} routeName={routeName} searchPlaceholder="Search questions..." onRowClick={openView} rowActions={questionRowActions} extraHeaderActions={filterActions} />

            <Modal show={bulkUploadOpen} maxWidth="2xl" onClose={closeBulkUpload}>
                <form onSubmit={submitBulkUpload} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Bulk Upload</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">Upload Questions CSV</h3>
                            <p className="mt-1 text-sm text-slate-500">Question codes are generated automatically.</p>
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
                                    <p className="mt-1 text-sm text-slate-600">Enter names for Question Type and Question Class. Numeric ID columns still work.</p>
                                </div>
                                <button type="button" onClick={downloadCsvTemplate} className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50">Download Template</button>
                            </div>
                            <pre className="mt-3 overflow-x-auto rounded-md bg-white p-3 text-xs text-slate-700 ring-1 ring-slate-200">{QUESTION_CSV_TEMPLATE_COLUMNS.join(',')}</pre>
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
                                <p className="font-semibold">{csvInspection.status === 'checking' ? 'Inspecting CSV...' : csvInspection.status === 'error' ? 'CSV needs changes before upload' : `CSV ready: ${csvInspection.rows} question row(s) found`}</p>
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

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Question Information">
                {viewing && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question Code</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.question_code ?? '-'}</h3>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question Type</p><p className="mt-1 text-sm text-slate-900">{viewing.question_type_name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question Class</p><p className="mt-1 text-sm text-slate-900">{viewing.question_class_name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><p className="mt-1 text-sm text-slate-900">{viewing.is_active ? 'Active' : 'Inactive'}</p></div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question Text</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{viewing.question_text ?? '-'}</p>
                        </div>

                        <button type="button" onClick={editFromDetails} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
                            Edit Question
                        </button>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Question' : 'New Question'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Question Code" error={errors.question_code} required>
                        <TextInput value={editing ? (data.question_code || editing.question_code || '-') : (nextQuestionCode ?? data.question_code)} readOnly className="cursor-not-allowed bg-slate-50 text-slate-600" />
                    </FormField>

                    <FormField label="Question Type" error={errors.question_type_id} required>
                        <SelectInput value={data.question_type_id} onChange={(e) => setData('question_type_id', e.target.value)}>
                            <option value="">Select question type...</option>
                            {questionTypes.map((type) => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </SelectInput>
                    </FormField>

                    <FormField label="Class" error={errors.question_class_id} required>
                        <SelectInput value={data.question_class_id} onChange={(e) => setData('question_class_id', e.target.value)}>
                            <option value="">Select class...</option>
                            {questionClasses.map((questionClass) => (
                                <option key={questionClass.id} value={questionClass.id}>{questionClass.name}</option>
                            ))}
                        </SelectInput>
                    </FormField>

                    <FormField label="Question Text" error={errors.question_text} required>
                        <TextareaInput value={data.question_text} onChange={(e) => setData('question_text', e.target.value)} rows={5} placeholder="Enter the evaluation question..." />
                    </FormField>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="rounded border-slate-300" /> Active
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} disabled={!questionRequiredFieldsComplete || (Boolean(editing) && !isDirty)} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onConfirm={() => { router.delete('/admin/questions/' + deleteTarget.question_id, { onSuccess: () => setDeleteTarget(null) }); }}
                onCancel={() => setDeleteTarget(null)}
                title="Delete Question"
                message={`Delete question "${deleteTarget?.question_code}"? This may affect existing evaluations.`}
            />

            <AppConfirmDialog
                open={confirmUpdateOpen}
                title="Save changes?"
                message={`Save changes to ${editing?.question_code ?? 'this question'}?`}
                confirmLabel="Update"
                tone="primary"
                loading={processing}
                onConfirm={performSave}
                onCancel={() => setConfirmUpdateOpen(false)}
            />
        </AdminLayout>
    );
}
