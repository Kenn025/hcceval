import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Questions({ questions, questionTypes, questionClasses, nextQuestionCode, filters, routeName, title, description }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        question_code: nextQuestionCode ?? 'Q-001',
        question_type_id: '',
        question_class_id: '',
        question_text: '',
        is_active: true,
    });

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
        const url = editing ? '/admin/questions/' + editing.question_id : '/admin/questions';
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
        });
    };

    const columns = [
        { key: 'question_code', label: 'Question Code' },
        { key: 'question_type_name', label: 'Question Type', render: (r) => r.question_type_name ?? '-' },
        { key: 'question_class_name', label: 'Class', render: (r) => r.question_class_name ?? '-' },
        { key: 'question_text', label: 'Question', render: (r) => <span className="line-clamp-2">{r.question_text}</span> },
    ];

    return (
        <AdminLayout title={title} activeRoute={routeName} breadcrumbs={['Question Bank']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Question</button>
            </div>

            <ResourceTable columns={columns} data={questions} filters={filters} routeName={routeName} searchPlaceholder="Search questions..." onRowClick={openView} onEdit={openEdit} onDelete={setDeleteTarget} />

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
                        <SubmitButton processing={processing} className="flex-1">
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
        </AdminLayout>
    );
}
