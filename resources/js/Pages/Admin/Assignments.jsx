import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const TITLE_MAP = {
    'student-teacher': 'Questionnaire Distribution',
    peer: 'Questionnaire Distribution',
    head: 'Questionnaire Distribution',
    employee: 'Questionnaire Distribution',
};

const DEPARTMENT_LAYER_TABS = [
    { key: 'college', label: 'College Department' },
    { key: 'senior-high', label: 'Senior High Department' },
    { key: 'junior-high', label: 'Junior High Department' },
    { key: 'elementary', label: 'Elementary Department' },
];

const getDepartmentKind = (department) => {
    const name = String(department?.name ?? '').toLowerCase();
    const code = String(department?.code ?? '').toLowerCase();

    if (name.includes('college') || code.includes('col')) {
        return 'college';
    }

    if (name.includes('senior high') || code.includes('shs')) {
        return 'senior-high';
    }

    if (name.includes('junior high') || code.includes('jhs')) {
        return 'junior-high';
    }

    if (name.includes('elementary') || name.includes('grade school') || code.includes('elem')) {
        return 'elementary';
    }

    return 'other';
};

const formatYearLevelOption = (yearLevel) => {
    const yearName = String(yearLevel?.year_level ?? '').trim();
    const sectionName = String(yearLevel?.section ?? '').trim();

    if (yearName && sectionName) {
        return `${yearName} - ${sectionName}`;
    }

    return yearName || sectionName || 'Unnamed level';
};

const getScopeListHeading = (layer) => {
    if (layer === 'college') {
        return 'Programs';
    }

    if (layer === 'senior-high') {
        return 'Strands';
    }

    return 'Grade Levels';
};

const getTableHeading = (assignmentType, layer) => {
    if (assignmentType === 'peer') {
        return 'Departments';
    }

    return getScopeListHeading(layer);
};

function QuestionnaireListModal({ open, scopeItem, questionnaires, onClose }) {
    const [viewTarget, setViewTarget] = useState(null);

    if (!open || !scopeItem) {
        return null;
    }

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
                <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Distribute Questionnaire</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Select a questionnaire for <span className="font-medium text-slate-700">{scopeItem.primary}</span>.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {questionnaires.length > 0 ? (
                                        questionnaires.map((questionnaire, index) => (
                                            <tr key={questionnaire.questionnaire_id} className="hover:bg-slate-50/80">
                                                <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{questionnaire.questionnaire_code ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{questionnaire.title ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{questionnaire.questionnaire_type_name ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{questionnaire.notes ?? '-'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewTarget(questionnaire)}
                                                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            View
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                router.post(route('admin.assignments.select-questionnaire'), {
                                                                    assignment_type: 'student-teacher',
                                                                    questionnaire_id: questionnaire.questionnaire_id,
                                                                    scope_type: scopeItem.scopeType,
                                                                    scope_id: scopeItem.entityId,
                                                                    branch_id: scopeItem.branchId,
                                                                    department_id: scopeItem.departmentId,
                                                                }, {
                                                                    preserveScroll: true,
                                                                    onSuccess: () => onClose(),
                                                                });
                                                            }}
                                                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                                                        >
                                                            Select
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                                                No questionnaires available for this distribution type yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {viewTarget ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/50" onClick={() => setViewTarget(null)} />
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Questionnaire Details</h3>
                                <p className="mt-1 text-sm text-slate-500">Review this questionnaire before distributing it.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewTarget(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{viewTarget.questionnaire_code ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{viewTarget.questionnaire_type_name ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{viewTarget.title ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                                <p className="mt-1 text-sm text-slate-700">{viewTarget.notes ?? 'No notes provided.'}</p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                                {Array.isArray(viewTarget.scale_questions) && viewTarget.scale_questions.length > 0 ? (
                                    <div className="mt-3 space-y-4">
                                        {viewTarget.scale_questions.map((group, groupIndex) => (
                                            <div key={`${group.class_name}-${groupIndex}`} className="rounded-lg border border-slate-200 bg-white p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-slate-900">{group.class_name || `Class ${groupIndex + 1}`}</p>
                                                    <span className="text-xs font-medium text-slate-500">
                                                        {group.weight_percentage != null ? `${group.weight_percentage}%` : 'No weight'}
                                                    </span>
                                                </div>
                                                {Array.isArray(group.questions) && group.questions.length > 0 ? (
                                                    <div className="mt-3 space-y-2">
                                                        {group.questions.map((question, questionIndex) => (
                                                            <div key={`${question.question_id}-${questionIndex}`} className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                                {question.description || `Question #${question.question_id}`}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="mt-3 text-sm text-slate-500">No item questions in this class.</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-slate-500">No questionnaire items found.</p>
                                )}
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
                                {((Array.isArray(viewTarget.comment_section) && viewTarget.comment_section.length > 0)
                                    || (Array.isArray(viewTarget.comments_list) && viewTarget.comments_list.length > 0)) ? (
                                    <div className="mt-3 space-y-3">
                                        {Array.isArray(viewTarget.comment_section) && viewTarget.comment_section.length > 0 ? (
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Comment Section</p>
                                                <div className="space-y-2">
                                                    {viewTarget.comment_section.map((question, index) => (
                                                        <div key={`comment-section-${question.question_id}-${index}`} className="rounded-md bg-white px-3 py-2 text-sm text-slate-700">
                                                            {question.description || `Question #${question.question_id}`}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}

                                        {Array.isArray(viewTarget.comments_list) && viewTarget.comments_list.length > 0 ? (
                                            <div>
                                                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Linked Comments</p>
                                                <div className="space-y-2">
                                                    {viewTarget.comments_list.map((question, index) => (
                                                        <div key={`comments-list-${question.question_id}-${index}`} className="rounded-md bg-white px-3 py-2 text-sm text-slate-700">
                                                            {question.description || `Question #${question.question_id}`}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-sm text-slate-500">No comment questions found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

function AssignedQuestionnairesModal({ open, scopeItem, questionnaires, onClose }) {
    const [viewTarget, setViewTarget] = useState(null);

    if (!open || !scopeItem) {
        return null;
    }

    const assignedQuestionnaires = Array.isArray(scopeItem.customGroups) && scopeItem.customGroups.length > 0
        ? scopeItem.customGroups
            .map((group) => ({
                ...group,
                questionnaire: questionnaires.find(
                    (questionnaire) => String(questionnaire.questionnaire_id) === String(group.questionnaire_id),
                ) ?? null,
            }))
            .filter((group) => group.questionnaire)
        : (scopeItem.selectedQuestionnaire ? [{
            id: `selected-${scopeItem.entityId}`,
            questionnaire_id: scopeItem.selectedQuestionnaire.questionnaire_id,
            questionnaire_code: scopeItem.selectedQuestionnaire.questionnaire_code,
            questionnaire_title: scopeItem.selectedQuestionnaire.questionnaire_title,
            subject_ids: scopeItem.selectedQuestionnaire.custom_subject_ids ?? [],
            questionnaire: questionnaires.find(
                (questionnaire) => String(questionnaire.questionnaire_id) === String(scopeItem.selectedQuestionnaire.questionnaire_id),
            ) ?? null,
        }].filter((group) => group.questionnaire) : []);

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
                <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Assigned Questionnaires</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Review the questionnaires assigned to <span className="font-medium text-slate-700">{scopeItem.primary}</span>.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Subjects</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {assignedQuestionnaires.length > 0 ? (
                                        assignedQuestionnaires.map((group, index) => (
                                            <tr key={`assigned-${group.id ?? group.questionnaire_id}-${index}`} className="hover:bg-slate-50/80">
                                                <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{group.questionnaire?.questionnaire_code ?? group.questionnaire_code ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{group.questionnaire?.title ?? group.questionnaire_title ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">{group.questionnaire?.questionnaire_type_name ?? '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-600">{Array.isArray(group.subject_ids) ? group.subject_ids.length : 0}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewTarget(group.questionnaire)}
                                                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                                                No assigned questionnaires found for this item yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {viewTarget ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/50" onClick={() => setViewTarget(null)} />
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Questionnaire Details</h3>
                                <p className="mt-1 text-sm text-slate-500">Review this assigned questionnaire.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewTarget(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{viewTarget.questionnaire_code ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{viewTarget.questionnaire_type_name ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{viewTarget.title ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                                <p className="mt-1 text-sm text-slate-700">{viewTarget.notes ?? 'No notes provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

function CustomSubjectsModal({ open, scopeItem, subjects, questionnaires, onClose }) {
    const [groups, setGroups] = useState([]);
    const [questionnairePickerGroupId, setQuestionnairePickerGroupId] = useState(null);
    const [questionnaireViewTarget, setQuestionnaireViewTarget] = useState(null);

    useEffect(() => {
        if (!scopeItem) {
            setGroups([]);
            setQuestionnairePickerGroupId(null);
            setQuestionnaireViewTarget(null);
            return;
        }

        const existingGroups = Array.isArray(scopeItem.customGroups) ? scopeItem.customGroups : [];

        if (scopeItem.scopeType === 'program' && existingGroups.length > 0) {
            setGroups(existingGroups.map((group, index) => ({
                localId: `${group.id ?? 'existing'}-${index}`,
                questionnaire_id: String(group.questionnaire_id ?? ''),
                subject_ids: (group.subject_ids ?? []).map((id) => String(id)),
            })));
            return;
        }

        setGroups([
            {
                localId: `new-${Date.now()}`,
                questionnaire_id: String(scopeItem?.selectedQuestionnaire?.questionnaire_id ?? ''),
                subject_ids: (scopeItem?.selectedQuestionnaire?.custom_subject_ids ?? []).map((id) => String(id)),
            },
        ]);
    }, [scopeItem]);

    if (!open || !scopeItem) {
        return null;
    }

    const availableSubjects = subjects.filter((subject) => {
        if (scopeItem.scopeType === 'program') {
            return String(subject.program_id ?? '') === String(scopeItem.entityId);
        }

        if (scopeItem.scopeType === 'strand') {
            return String(subject.strand_id ?? '') === String(scopeItem.entityId);
        }

        if (scopeItem.scopeType === 'level') {
            return (scopeItem.subjectIds ?? []).includes(String(subject.id));
        }

        return false;
    });
    const renderSubjectItem = (subject, group) => (
        <label
            key={subject.id}
            className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
            <input
                type="checkbox"
                checked={group.subject_ids.includes(String(subject.id))}
                onChange={() => {
                    const subjectKey = String(subject.id);
                    setGroups((currentGroups) => {
                        const isAlreadySelected = group.subject_ids.includes(subjectKey);

                        return currentGroups.map((currentGroup) => {
                            if (currentGroup.localId === group.localId) {
                                const nextSubjectIds = isAlreadySelected
                                    ? currentGroup.subject_ids.filter((id) => id !== subjectKey)
                                    : [...currentGroup.subject_ids, subjectKey];

                                return {
                                    ...currentGroup,
                                    subject_ids: nextSubjectIds,
                                };
                            }

                            if (!isAlreadySelected && currentGroup.subject_ids.includes(subjectKey)) {
                                return {
                                    ...currentGroup,
                                    subject_ids: currentGroup.subject_ids.filter((id) => id !== subjectKey),
                                };
                            }

                            return currentGroup;
                        });
                    });
                }}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="min-w-0">
                <span className="block font-medium text-slate-900">{subject.name}</span>
                <span className="block text-xs text-slate-500">{subject.code}</span>
            </span>
        </label>
    );

    const activeQuestionnaireGroup = groups.find((group) => group.localId === questionnairePickerGroupId) ?? null;
    const activeQuestionnaire = questionnaires.find(
        (questionnaire) => String(questionnaire.questionnaire_id) === String(activeQuestionnaireGroup?.questionnaire_id ?? ''),
    );

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
                <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Custom Subjects</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Choose subjects for <span className="font-medium text-slate-700">{scopeItem.primary}</span>.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Close
                        </button>
                    </div>

                    <div className="mt-6 space-y-4">
                        {scopeItem.scopeType === 'program' ? (
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGroups((current) => [
                                            ...current,
                                            {
                                                localId: `new-${Date.now()}-${current.length}`,
                                                questionnaire_id: '',
                                                subject_ids: [],
                                            },
                                        ]);
                                    }}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                >
                                    + Add Custom Group
                                </button>
                            </div>
                        ) : null}

                        {groups.map((group, groupIndex) => {
                            const subjectIdsUsedByOtherGroups = new Set(
                                groups
                                    .filter((currentGroup) => currentGroup.localId !== group.localId)
                                    .flatMap((currentGroup) => currentGroup.subject_ids),
                            );
                            const groupedSelectedSubjects = availableSubjects.filter((subject) => group.subject_ids.includes(String(subject.id)));
                            const groupedAvailableSubjects = availableSubjects.filter((subject) => {
                                const subjectKey = String(subject.id);

                                return !group.subject_ids.includes(subjectKey) && !subjectIdsUsedByOtherGroups.has(subjectKey);
                            });
                            const selectedQuestionnaire = questionnaires.find(
                                (questionnaire) => String(questionnaire.questionnaire_id) === String(group.questionnaire_id),
                            );

                            return (
                                <div key={group.localId} className="rounded-2xl border border-slate-200">
                                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Custom Group {groupIndex + 1}</p>
                                            <p className="text-xs text-slate-500">Assign a questionnaire and subject set.</p>
                                        </div>
                                        {scopeItem.scopeType === 'program' && groups.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => setGroups((current) => current.filter((item) => item.localId !== group.localId))}
                                                className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                                            >
                                                Remove
                                            </button>
                                        ) : null}
                                    </div>

                                    <div className="p-4">
                                        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-700">Questionnaire</p>
                                                    {selectedQuestionnaire ? (
                                                        <div className="mt-1">
                                                            <p className="truncate text-sm font-semibold text-slate-900">{selectedQuestionnaire.title}</p>
                                                            <p className="text-xs text-slate-500">{selectedQuestionnaire.questionnaire_code}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1 text-sm text-slate-500">No questionnaire selected yet.</p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setQuestionnairePickerGroupId(group.localId)}
                                                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
                                                >
                                                    {selectedQuestionnaire ? 'Change Questionnaire' : 'Select Questionnaire'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200">
                                            {availableSubjects.length > 0 ? (
                                                <div className="max-h-96 space-y-5 overflow-y-auto p-3">
                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Subjects</p>
                                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                                {groupedSelectedSubjects.length}
                                                            </span>
                                                        </div>

                                                        {groupedSelectedSubjects.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {groupedSelectedSubjects.map((subject) => renderSubjectItem(subject, group))}
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                                                                No selected subjects yet.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available Subjects</p>
                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                                {groupedAvailableSubjects.length}
                                                            </span>
                                                        </div>

                                                        {groupedAvailableSubjects.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {groupedAvailableSubjects.map((subject) => renderSubjectItem(subject, group))}
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                                                                All subjects in this scope are already grouped above.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-8 text-center text-sm text-slate-500">
                                                    No subjects found for this scope.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                router.post(route('admin.assignments.custom-subjects'), {
                                    assignment_type: 'student-teacher',
                                    scope_type: scopeItem.scopeType,
                                    scope_id: scopeItem.entityId,
                                    questionnaire_id: scopeItem.selectedQuestionnaire?.questionnaire_id ?? null,
                                    subject_ids: groups[0]?.subject_ids ?? [],
                                    groups: groups.map((group) => ({
                                        questionnaire_id: group.questionnaire_id || null,
                                        subject_ids: group.subject_ids,
                                    })).filter((group) => group.questionnaire_id),
                                }, {
                                    preserveScroll: true,
                                    onSuccess: () => onClose(),
                                });
                            }}
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Save Custom
                        </button>
                    </div>
                </div>
            </div>

            {questionnairePickerGroupId ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/50" onClick={() => setQuestionnairePickerGroupId(null)} />
                    <div className="relative max-h-[85vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Select Questionnaire</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Choose a questionnaire for custom group {groups.findIndex((group) => group.localId === questionnairePickerGroupId) + 1}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuestionnairePickerGroupId(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {questionnaires.length > 0 ? (
                                            questionnaires.map((questionnaire, index) => (
                                                <tr key={`picker-${questionnaire.questionnaire_id}`} className="hover:bg-slate-50/80">
                                                    <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-700">{questionnaire.questionnaire_code ?? '-'}</td>
                                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{questionnaire.title ?? '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-700">{questionnaire.questionnaire_type_name ?? '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-slate-600">{questionnaire.notes ?? '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setQuestionnaireViewTarget(questionnaire)}
                                                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                View
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setGroups((current) => current.map((group) => (
                                                                        group.localId === questionnairePickerGroupId
                                                                            ? { ...group, questionnaire_id: String(questionnaire.questionnaire_id) }
                                                                            : group
                                                                    )));
                                                                    setQuestionnairePickerGroupId(null);
                                                                }}
                                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
                                                            >
                                                                Select
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                                                    No questionnaires available for this distribution type yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {questionnaireViewTarget ? (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/55" onClick={() => setQuestionnaireViewTarget(null)} />
                    <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Questionnaire Details</h3>
                                <p className="mt-1 text-sm text-slate-500">Review this questionnaire before assigning it to the custom group.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQuestionnaireViewTarget(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Code</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{questionnaireViewTarget.questionnaire_code ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{questionnaireViewTarget.questionnaire_type_name ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Title</p>
                                <p className="mt-1 text-sm font-semibold text-slate-900">{questionnaireViewTarget.title ?? '-'}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                                <p className="mt-1 text-sm text-slate-700">{questionnaireViewTarget.notes ?? 'No notes provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
export default function Assignments({
    assignmentType,
    filters = {},
    questionnaires = [],
    branches = [],
    departments = [],
    programs = [],
    strands = [],
    yearLevels = [],
    subjects = [],
    selectedQuestionnaires = {},
    customSubjectGroups = {},
}) {
    const [activeDepartmentLayer, setActiveDepartmentLayer] = useState('college');
    const [distributeTarget, setDistributeTarget] = useState(null);
    const [customTarget, setCustomTarget] = useState(null);
    const [assignedQuestionnaireTarget, setAssignedQuestionnaireTarget] = useState(null);
    const tabs = [
        { key: 'student-teacher', label: 'Subject Teacher', routeName: 'admin.subject-assignments' },
        { key: 'peer', label: 'Peer to Peer', routeName: 'admin.peer-assignments' },
        { key: 'head', label: 'School Heads', routeName: 'admin.head-assignments' },
        { key: 'employee', label: 'Employee Feedback', routeName: 'admin.employee-assignments' },
    ];
    const filteredScopeItems = useMemo(() => {
        if (assignmentType === 'peer') {
            return departments.map((department) => ({
                id: `department-${department.id}`,
                entityId: department.id,
                scopeType: 'department',
                branchId: department.branch_id ?? null,
                departmentId: department.id ?? null,
                branchName: branches.find((branch) => String(branch.id) === String(department.branch_id))?.name ?? '-',
                primary: department.name,
                secondary: department.code,
                selectedQuestionnaire: selectedQuestionnaires[`department-${department.id}`] ?? null,
                customGroups: [],
            }));
        }

        if (activeDepartmentLayer === 'college') {
            return programs
                .map((program) => {
                    const department = departments.find((item) => String(item.id) === String(program.department_id));

                    if (!department || getDepartmentKind(department) !== 'college') {
                        return null;
                    }

                    return {
                        id: `program-${program.id}`,
                        entityId: program.id,
                        scopeType: 'program',
                        branchId: department.branch_id ?? null,
                        departmentId: department.id ?? null,
                        primary: program.name,
                        secondary: program.code,
                        selectedQuestionnaire: selectedQuestionnaires[`program-${program.id}`] ?? null,
                        customGroups: customSubjectGroups[String(program.id)] ?? [],
                    };
                })
                .filter(Boolean);
        }

        if (activeDepartmentLayer === 'senior-high') {
            return strands
                .map((strand) => {
                    const department = departments.find((item) => String(item.id) === String(strand.department_id));

                    if (!department || getDepartmentKind(department) !== 'senior-high') {
                        return null;
                    }

                    return {
                        id: `strand-${strand.id}`,
                        entityId: strand.id,
                        scopeType: 'strand',
                        branchId: department.branch_id ?? null,
                        departmentId: department.id ?? null,
                        primary: strand.name,
                        secondary: strand.code,
                        selectedQuestionnaire: selectedQuestionnaires[`strand-${strand.id}`] ?? null,
                    };
                })
                .filter(Boolean);
        }

        return yearLevels
            .map((yearLevel) => {
                const department = departments.find((item) => String(item.id) === String(yearLevel.department_id));

                if (!department || getDepartmentKind(department) !== activeDepartmentLayer) {
                    return null;
                }

                return {
                    id: `level-${yearLevel.id}`,
                    entityId: yearLevel.id,
                    scopeType: 'level',
                    branchId: department.branch_id ?? null,
                    departmentId: department.id ?? null,
                    primary: formatYearLevelOption(yearLevel),
                    secondary: '',
                    subjectIds: (() => {
                        try {
                            const parsed = typeof yearLevel.subject_id === 'string'
                                ? JSON.parse(yearLevel.subject_id)
                                : yearLevel.subject_id;
                            return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
                        } catch {
                            return [];
                        }
                    })(),
                    selectedQuestionnaire: selectedQuestionnaires[`level-${yearLevel.id}`] ?? null,
                };
            })
            .filter(Boolean);
    }, [activeDepartmentLayer, assignmentType, branches, departments, programs, selectedQuestionnaires, strands, yearLevels]);

    return (
        <AdminLayout title={TITLE_MAP[assignmentType]} activeRoute="admin.questionnaire-distribution" breadcrumbs={['Question Bank']}>
            <div className="mb-6">
                <h2 className="text-base font-semibold text-slate-900">Questionnaire Distribution</h2>
                <p className="text-sm text-slate-500">Manage which questionnaire set is used for each evaluation flow.</p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {tabs.map((tab) => {
                    const isActive = tab.key === assignmentType;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => router.get(route(tab.routeName), filters, { preserveScroll: true })}
                            className={[
                                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                                isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                            ].join(' ')}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {assignmentType === 'student-teacher' ? (
                <>
                    <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                        {DEPARTMENT_LAYER_TABS.map((tab) => {
                            const isActive = tab.key === activeDepartmentLayer;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveDepartmentLayer(tab.key)}
                                    className={[
                                        'rounded-xl px-4 py-2 text-sm font-semibold transition',
                                        isActive
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                                    ].join(' ')}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                </>
            ) : null}

            {assignmentType === 'student-teacher' || assignmentType === 'peer' ? (
                <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">{getTableHeading(assignmentType, activeDepartmentLayer)}</h3>
                            <p className="text-sm text-slate-500">
                                {assignmentType === 'peer'
                                    ? 'Showing all active departments for peer-to-peer questionnaire distribution.'
                                    : `Showing all available ${getScopeListHeading(activeDepartmentLayer).toLowerCase()} for this department layer.`}
                            </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {filteredScopeItems.length} items
                        </span>
                    </div>

                    {filteredScopeItems.length > 0 ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                                            {assignmentType === 'peer' ? (
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</th>
                                            ) : null}
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Questionnaire</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {filteredScopeItems.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-slate-50/80">
                                                <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.primary}</td>
                                                {assignmentType === 'peer' ? (
                                                    <td className="px-4 py-3 text-sm text-slate-600">{item.branchName ?? '-'}</td>
                                                ) : null}
                                                <td className="px-4 py-3 text-sm text-slate-600">{item.secondary || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-slate-700">
                                                    {(Array.isArray(item.customGroups) && item.customGroups.length > 0) || item.selectedQuestionnaire ? (
                                                        <div className="space-y-2">
                                                            {Array.isArray(item.customGroups) && item.customGroups.length > 0 ? (
                                                                <div>
                                                                    <div className="font-medium text-slate-900">Custom</div>
                                                                    <div className="text-xs text-slate-500">{item.customGroups.length} questionnaire{item.customGroups.length > 1 ? 's' : ''} assigned</div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAssignedQuestionnaireTarget(item)}
                                                                        className="mt-1 text-xs font-medium text-blue-600 transition hover:text-blue-700"
                                                                    >
                                                                        Open assigned questionnaires
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    <div className="font-medium text-slate-900">{item.selectedQuestionnaire.questionnaire_title}</div>
                                                                    <div className="text-xs text-slate-500">{item.selectedQuestionnaire.questionnaire_code}</div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const hasCustomDistribution = assignmentType === 'student-teacher'
                                                                        && item.scopeType === 'program'
                                                                        && Array.isArray(item.customGroups)
                                                                        && item.customGroups.length > 0;

                                                                    if (hasCustomDistribution) {
                                                                        const shouldContinue = window.confirm(
                                                                            'This program is currently using custom questionnaire distribution. Continuing will reset all custom distributions for this program. Do you want to continue?',
                                                                        );

                                                                        if (!shouldContinue) {
                                                                            return;
                                                                        }
                                                                    }

                                                                    setDistributeTarget(item);
                                                                }}
                                                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                            >
                                                                Distribute
                                                            </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (assignmentType === 'peer') {
                                                                    if (item.selectedQuestionnaire) {
                                                                        setAssignedQuestionnaireTarget(item);
                                                                        return;
                                                                    }

                                                                    setDistributeTarget(item);
                                                                    return;
                                                                }

                                                                setCustomTarget(item);
                                                            }}
                                                            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
                                                        >
                                                            Custom
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            {assignmentType === 'peer'
                                ? 'No departments found yet.'
                                : 'No items found for this department layer yet.'}
                        </div>
                    )}
                </div>
            ) : null}

            <QuestionnaireListModal
                open={Boolean(distributeTarget)}
                scopeItem={distributeTarget}
                questionnaires={questionnaires}
                onClose={() => setDistributeTarget(null)}
            />

            <CustomSubjectsModal
                open={Boolean(customTarget)}
                scopeItem={customTarget}
                subjects={subjects}
                questionnaires={questionnaires}
                onClose={() => setCustomTarget(null)}
            />

            <AssignedQuestionnairesModal
                open={Boolean(assignedQuestionnaireTarget)}
                scopeItem={assignedQuestionnaireTarget}
                questionnaires={questionnaires}
                onClose={() => setAssignedQuestionnaireTarget(null)}
            />
        </AdminLayout>
    );
}
