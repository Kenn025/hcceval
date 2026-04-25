import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

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
                            {option.question_class_name && <span className="ml-2 text-slate-400">· {option.question_class_name}</span>}
                            <span className="mt-1 block text-slate-600">{option.description}</span>
                        </span>
                    </label>
                );
            })}
        </div>
    );
}

const WEIGHT_OPTIONS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);

function emptyClassGroup() {
    return {
        question_class_id: '',
        question_class_name: '',
        weight: '',
        questions: [],
    };
}

export default function Questionnaires({ questionnaires, questionnaireTypes, questionChoices, questionClasses, questions, filters }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [itemSearch, setItemSearch] = useState('');
    const [commentSearch, setCommentSearch] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [confirmSave, setConfirmSave] = useState(false);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        questionnaire_title: '',
        questionnaire_type_id: '',
        question_choices_id: '',
        class_groups: [emptyClassGroup()],
        items: [],
        comments: [],
        notes: '',
        is_active: true,
    });

    const openCreate = () => {
        reset();
        clearErrors();
        setSubmitError('');
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({
            questionnaire_title: row.questionnaire_title ?? '',
            questionnaire_type_id: row.questionnaire_type_id ?? '',
            question_choices_id: row.question_choices_id ?? '',
            class_groups: row.class_groups?.length
                ? row.class_groups.map((group) => ({
                    question_class_id: questionClasses.find((questionClass) => questionClass.name === (group.question_class_name ?? ''))?.id ?? '',
                    question_class_name: group.question_class_name ?? '',
                    weight: group.weight ?? '',
                    questions: group.questions ?? [],
                }))
                : [emptyClassGroup()],
            items: row.items ?? [],
            comments: row.comments ?? [],
            notes: row.notes ?? '',
            is_active: Boolean(row.is_active),
        });
        clearErrors();
        setSubmitError('');
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

    const toggleArrayValue = (key, value) => {
        const current = data[key] ?? [];
        const next = current.includes(value)
            ? current.filter((item) => item !== value)
            : [...current, value];

        setData(key, next);
    };

    const updateClassGroups = (groups) => {
        setData('class_groups', groups);
        setData('items', groups.flatMap((group) => group.questions));
    };

    const updateClassGroup = (index, key, value) => {
        const nextGroups = data.class_groups.map((group, groupIndex) => (
            groupIndex === index ? {
                ...group,
                [key]: value,
                ...(key === 'question_class_id'
                    ? {
                        question_class_name: questionClasses.find((questionClass) => String(questionClass.id) === String(value))?.name ?? '',
                    }
                    : {}),
            } : group
        ));

        updateClassGroups(nextGroups);
    };

    const toggleClassGroupQuestion = (index, questionId) => {
        const nextGroups = data.class_groups.map((group, groupIndex) => {
            if (groupIndex !== index) {
                return group;
            }

            return {
                ...group,
                questions: group.questions.includes(questionId)
                    ? group.questions.filter((id) => id !== questionId)
                    : [...group.questions, questionId],
            };
        });

        updateClassGroups(nextGroups);
    };

    const addQuestionClassGroup = () => {
        updateClassGroups([...data.class_groups, emptyClassGroup()]);
    };

    const removeQuestionClassGroup = (index) => {
        const nextGroups = data.class_groups.filter((_, groupIndex) => groupIndex !== index);
        updateClassGroups(nextGroups.length ? nextGroups : [emptyClassGroup()]);
    };

    const handleSaveConfirm = () => {
        setSubmitError('');
        const url = editing ? '/admin/questionnaires/' + editing.questionnaire_id : '/admin/questionnaires';
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setConfirmSave(false);
                setSlideOpen(false);
                reset();
            },
            onError: (formErrors) => {
                setConfirmSave(false);
                const firstError = Object.values(formErrors ?? {}).find((value) => typeof value === 'string' && value.trim() !== '');
                setSubmitError(firstError || 'Unable to save questionnaire. Please check the form fields.');
            },
        });
    };

    const submit = (e) => {
        e.preventDefault();
        setConfirmSave(true);
    };

    const itemQuestions = questions.filter((question) => !String(question.question_type_name ?? '').toLowerCase().includes('comment'));
    const commentQuestions = questions.filter((question) => String(question.question_type_name ?? '').toLowerCase().includes('comment'));
    const filteredCommentQuestions = commentQuestions.filter((question) => {
        const haystack = `${question.code} ${question.description} ${question.question_type_name ?? ''}`.toLowerCase();
        return haystack.includes(commentSearch.toLowerCase());
    });
    const filteredItemQuestions = (questionClassId) => {
        if (!questionClassId) {
            return [];
        }

        return itemQuestions.filter((question) => {
        const haystack = `${question.code} ${question.description} ${question.question_type_name ?? ''}`.toLowerCase();
        const matchesSearch = haystack.includes(itemSearch.toLowerCase());
        const matchesClass = !questionClassId || String(question.question_class_id ?? '') === String(questionClassId);
        return matchesSearch && matchesClass;
        });
    };
    const usedWeight = data.class_groups.reduce((sum, group) => sum + Number(group.weight || 0), 0);
    const remainingWeight = Math.max(0, 100 - usedWeight);
    const selectedQuestionClassIds = useMemo(
        () => data.class_groups
            .map((group) => String(group.question_class_id ?? ''))
            .filter(Boolean),
        [data.class_groups],
    );

    const columns = [
        { key: 'questionnaire_code', label: 'Questionnaire Code' },
        { key: 'questionnaire_title', label: 'Questionnaire Title' },
        { key: 'questionnaire_type_name', label: 'Questionnaire Type', render: (r) => r.questionnaire_type_name ?? '-' },
        { key: 'question_choices_code', label: 'Choice Set', render: (r) => r.question_choices_code ? `${r.question_choices_name} - ${r.question_choices_code} (${r.question_choices_quantity})` : '-' },
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

            <ResourceTable columns={columns} data={questionnaires} filters={filters} routeName="admin.questionnaires" searchPlaceholder="Search questionnaires..." onRowClick={openView} onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Questionnaire Information" width="max-w-2xl">
                {viewing && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.questionnaire_title ?? '-'}</h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.questionnaire_code ?? '-'}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questionnaire Type</p><p className="mt-1 text-sm text-slate-900">{viewing.questionnaire_type_name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choice Set</p><p className="mt-1 text-sm text-slate-900">{viewing.question_choices_code ? `${viewing.question_choices_name} - ${viewing.question_choices_code} (${viewing.question_choices_quantity})` : '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p><p className="mt-1 text-sm text-slate-900">{viewing.item_count ?? 0}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p><p className="mt-1 text-sm text-slate-900">{viewing.comment_count ?? 0}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><StatusBadge active={viewing.is_active} activeLabel="Active" inactiveLabel="Inactive" /></div></div>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{viewing.notes || '-'}</p>
                        </div>

                        <button type="button" onClick={editFromDetails} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
                            Edit Questionnaire
                        </button>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Questionnaire' : 'New Questionnaire'} width="max-w-2xl">
                <form onSubmit={submit} className="space-y-4">
                    {(submitError || Object.keys(errors).length > 0) && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {submitError || 'Please review the highlighted fields and try again.'}
                        </div>
                    )}

                    <FormField label="Questionnaire Title" error={errors.questionnaire_title} required>
                        <TextInput value={data.questionnaire_title} onChange={(e) => setData('questionnaire_title', e.target.value)} placeholder="Teacher Evaluation Form" />
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

                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-slate-900">Question Items</h3>
                            <p className="mt-1 text-sm text-slate-500">Group questions by class and assign weights without going over 100% total.</p>
                        </div>

                        <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            Remaining Weight: <span className="font-semibold text-slate-900">{remainingWeight}%</span>
                        </div>

                        <div className="space-y-4">
                            {data.class_groups.map((group, index) => {
                                const otherGroupsWeight = data.class_groups.reduce((sum, currentGroup, groupIndex) => (
                                    groupIndex === index ? sum : sum + Number(currentGroup.weight || 0)
                                ), 0);
                                const allowedWeight = Math.max(0, 100 - otherGroupsWeight);
                                const weightOptions = WEIGHT_OPTIONS.filter((option) => option <= allowedWeight || option === Number(group.weight || 0));
                                const availableQuestionClasses = questionClasses.filter((questionClass) => (
                                    String(group.question_class_id ?? '') === String(questionClass.id)
                                    || !selectedQuestionClassIds.includes(String(questionClass.id))
                                ));

                                return (
                                    <div key={index} className="rounded-lg border border-slate-200 p-4">
                                        <div className="mb-4 flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-slate-900">Question Class {index + 1}</h4>
                                            {data.class_groups.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestionClassGroup(index)}
                                                    className="text-sm font-medium text-rose-600 hover:text-rose-700"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField label="Question Class">
                                                <SelectInput value={group.question_class_id} onChange={(e) => updateClassGroup(index, 'question_class_id', e.target.value)}>
                                                    <option value="">Select question class...</option>
                                                    {availableQuestionClasses.map((questionClass) => (
                                                        <option key={questionClass.id} value={questionClass.id}>{questionClass.name}</option>
                                                    ))}
                                                </SelectInput>
                                            </FormField>

                                            <FormField label="Weight">
                                                <SelectInput value={group.weight} onChange={(e) => updateClassGroup(index, 'weight', Number(e.target.value) || '')}>
                                                    <option value="">Select weight...</option>
                                                    {weightOptions.map((option) => (
                                                        <option key={option} value={option}>{option}%</option>
                                                    ))}
                                                </SelectInput>
                                            </FormField>
                                        </div>

                                        <FormField label="Search Questions">
                                            <TextInput value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Search by code or question text..." />
                                        </FormField>

                                        <FormField label="Questions in Scope of Selected Class">
                                            <CheckboxList
                                                options={filteredItemQuestions(group.question_class_id)}
                                                selected={group.questions}
                                                onToggle={(id) => toggleClassGroupQuestion(index, id)}
                                                emptyLabel={group.question_class_id ? 'No matching questions found for this class.' : 'Select a question class first.'}
                                            />
                                        </FormField>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-4">
                            <button
                                type="button"
                                onClick={addQuestionClassGroup}
                                disabled={remainingWeight === 0 || selectedQuestionClassIds.length >= questionClasses.length}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Add Question Class
                            </button>
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-4">
                        <div className="mb-3">
                            <h3 className="text-sm font-semibold text-slate-900">Comment Section</h3>
                            <p className="mt-1 text-sm text-slate-500">Select the comment-type questions to include in this questionnaire.</p>
                        </div>

                        <FormField label="Search Comment Questions">
                            <TextInput value={commentSearch} onChange={(e) => setCommentSearch(e.target.value)} placeholder="Search by code or question text..." />
                        </FormField>

                        <FormField label="Comment Questions" error={errors.comments}>
                            <CheckboxList
                                options={filteredCommentQuestions}
                                selected={data.comments}
                                onToggle={(id) => toggleArrayValue('comments', id)}
                                emptyLabel="No matching comment questions found."
                            />
                        </FormField>
                    </div>

                    <FormField label="Notes to This Questionnaire">
                        <TextareaInput value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={4} placeholder="Add notes for this questionnaire..." />
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
                onConfirm={() => { router.delete('/admin/questionnaires/' + deleteTarget.questionnaire_id, { onSuccess: () => setDeleteTarget(null) }); }}
                onCancel={() => setDeleteTarget(null)}
                title="Delete Questionnaire"
                message={`Delete questionnaire "${deleteTarget?.questionnaire_code}"?`}
            />

            <ConfirmDialog
                open={confirmSave}
                title={editing ? 'Update Questionnaire?' : 'Create Questionnaire?'}
                message={editing 
                    ? `Are you sure you want to update the questionnaire "${data.questionnaire_title}"?` 
                    : `Are you sure you want to create the new questionnaire "${data.questionnaire_title}"?`}
                onConfirm={handleSaveConfirm}
                onCancel={() => setConfirmSave(false)}
            />
        </AdminLayout>
    );
}
