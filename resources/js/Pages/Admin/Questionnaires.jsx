import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

function CheckboxList({ options, selected, onToggle, emptyLabel }) {
    if (!options.length) {
        return <p className="text-sm text-slate-500">{emptyLabel}</p>;
    }

    return (
        <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {options.map((option) => {
                const checked = selected.includes(option.id);

                return (
                    <label key={option.id} className="flex items-start gap-3 text-sm text-slate-700">
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggle(option.id)}
                            className="mt-0.5 rounded border-slate-300"
                        />
                        <span>
                            <span className="font-medium text-slate-900">{option.code}</span>
                            <span className="ml-2 text-slate-500">{option.question_type_name ?? '-'}</span>
                            <span className="mt-1 block text-slate-600">{option.description}</span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

export default function Questionnaires({ questionnaires, questionnaireTypes, questionChoices, questions, filters }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        questionnaire_code: '',
        questionnaire_type_id: '',
        question_choices_id: '',
        items: [],
        comments: [],
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
            questionnaire_code: row.questionnaire_code ?? '',
            questionnaire_type_id: row.questionnaire_type_id ?? '',
            question_choices_id: row.question_choices_id ?? '',
            items: row.items ?? [],
            comments: row.comments ?? [],
            is_active: Boolean(row.is_active),
        });
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const toggleArrayValue = (key, value) => {
        const current = data[key] ?? [];
        const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];

        setData(key, next);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? '/admin/questionnaires/' + editing.questionnaire_id : '/admin/questionnaires';
        (editing ? router.put : router.post)(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
        });
    };

    const itemQuestions = questions.filter((question) => !String(question.question_type_name ?? '').toLowerCase().includes('comment'));
    const commentQuestions = questions.filter((question) => String(question.question_type_name ?? '').toLowerCase().includes('comment'));

    const columns = [
        { key: 'questionnaire_code', label: 'Questionnaire Code' },
        { key: 'questionnaire_type_name', label: 'Questionnaire Type', render: (r) => r.questionnaire_type_name ?? '-' },
        { key: 'question_choices_code', label: 'Choice Set', render: (r) => r.question_choices_code ? `${r.question_choices_code} (${r.question_choices_quantity})` : '-' },
        { key: 'item_count', label: 'Items' },
        { key: 'comment_count', label: 'Comments' },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} activeLabel="Active" inactiveLabel="Inactive" /> },
    ];

    return (
        <AdminLayout title="Questionnaires" activeRoute="admin.questionnaires" breadcrumbs={['Question Bank']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Questionnaires</h2>
                    <p className="text-sm text-slate-500">Build reusable questionnaires with a code, type, choice set, and linked question items.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Questionnaire</button>
            </div>

            <ResourceTable columns={columns} data={questionnaires} filters={filters} routeName="admin.questionnaires" searchPlaceholder="Search questionnaires..." onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Questionnaire' : 'New Questionnaire'} width="max-w-2xl">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Questionnaire Code" error={errors.questionnaire_code} required>
                        <TextInput value={data.questionnaire_code} onChange={(e) => setData('questionnaire_code', e.target.value)} placeholder="QUES-001" />
                    </FormField>

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Questionnaire Type" error={errors.questionnaire_type_id} required>
                            <SelectInput value={data.questionnaire_type_id} onChange={(e) => setData('questionnaire_type_id', e.target.value)}>
                                <option value="">Select questionnaire type...</option>
                                {questionnaireTypes.map((type) => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </SelectInput>
                        </FormField>

                        <FormField label="Choice Set" error={errors.question_choices_id} required>
                            <SelectInput value={data.question_choices_id} onChange={(e) => setData('question_choices_id', e.target.value)}>
                                <option value="">Select choice set...</option>
                                {questionChoices.map((choice) => (
                                    <option key={choice.id} value={choice.id}>{choice.code} ({choice.quantity})</option>
                                ))}
                            </SelectInput>
                        </FormField>
                    </div>

                    <FormField label="Item Questions" error={errors.items}>
                        <CheckboxList
                            options={itemQuestions}
                            selected={data.items}
                            onToggle={(id) => toggleArrayValue('items', id)}
                            emptyLabel="No active item questions available."
                        />
                    </FormField>

                    <FormField label="Comment Questions" error={errors.comments}>
                        <CheckboxList
                            options={commentQuestions}
                            selected={data.comments}
                            onToggle={(id) => toggleArrayValue('comments', id)}
                            emptyLabel="No active comment questions available."
                        />
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
                onConfirm={() => { router.delete('/admin/questionnaires/' + deleteTarget.questionnaire_id, { onSuccess: () => setDeleteTarget(null) }); }}
                onCancel={() => setDeleteTarget(null)}
                title="Delete Questionnaire"
                message={`Delete questionnaire "${deleteTarget?.questionnaire_code}"?`}
            />
        </AdminLayout>
    );
}
