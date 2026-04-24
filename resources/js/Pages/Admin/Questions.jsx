import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Questions({ questions, questionTypes, filters, routeName, title, description }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        question_code: '',
        question_type_id: '',
        question_text: '',
        is_active: true,
    });

    const openCreate = () => {
        reset();
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({
            question_code: row.question_code ?? '',
            question_type_id: row.question_type_id ?? '',
            question_text: row.question_text ?? '',
            is_active: Boolean(row.is_active),
        });
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? '/admin/questions/' + editing.question_id : '/admin/questions';
        (editing ? router.put : router.post)(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
        });
    };

    const columns = [
        { key: 'question_code', label: 'Question Code' },
        { key: 'question_type_name', label: 'Question Type', render: (r) => r.question_type_name ?? '-' },
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

            <ResourceTable columns={columns} data={questions} filters={filters} routeName={routeName} searchPlaceholder="Search questions..." onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Question' : 'New Question'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Question Code" error={errors.question_code} required>
                        <TextInput value={data.question_code} onChange={(e) => setData('question_code', e.target.value)} placeholder="Q-001" />
                    </FormField>

                    <FormField label="Question Type" error={errors.question_type_id} required>
                        <SelectInput value={data.question_type_id} onChange={(e) => setData('question_type_id', e.target.value)}>
                            <option value="">Select question type...</option>
                            {questionTypes.map((type) => (
                                <option key={type.id} value={type.id}>{type.name}</option>
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
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-60">
                            {processing ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </button>
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
