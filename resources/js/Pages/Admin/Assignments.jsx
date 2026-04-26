import ConfirmDialog from '@/Components/ConfirmDialog';
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

const formatGradeLevelOption = (yearLevel) => {
    const yearName = String(yearLevel?.year_level ?? '').trim();

    if (!yearName) {
        return 'Unnamed grade level';
    }

    return yearName.toLowerCase().startsWith('grade ') ? yearName : `Grade ${yearName}`;
};

const getUniqueGradeLevelScopes = (yearLevels, departmentId) => {
    const scopes = new Map();

    yearLevels
        .filter((yearLevel) => String(yearLevel.department_id ?? '') === String(departmentId))
        .forEach((yearLevel) => {
            const levelKey = String(yearLevel.year_level ?? '').trim();

            if (!levelKey) {
                return;
            }

            if (!scopes.has(levelKey)) {
                scopes.set(levelKey, {
                    ...yearLevel,
                    primary: formatGradeLevelOption(yearLevel),
                    levelIds: [],
                    subjectIds: [],
                });
            }

            const scope = scopes.get(levelKey);
            scope.levelIds.push(yearLevel.id);
            scope.subjectIds = Array.from(new Set([
                ...scope.subjectIds,
                ...parseIdList(yearLevel.subject_id),
            ]));
        });

    return Array.from(scopes.values());
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

const getPeerScopeLabel = (departmentKind) => {
    if (departmentKind === 'college') {
        return 'Programs';
    }

    if (departmentKind === 'senior-high') {
        return 'Strands';
    }

    return 'Grade Levels';
};

const hasSelectedQuestionnaire = (selectedQuestionnaire) => Boolean(selectedQuestionnaire?.questionnaire_id);

const parseIdList = (value) => {
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
    } catch {
        return [];
    }
};

const getSubjectTeacherStatusCards = ({
    departments,
    programs,
    strands,
    yearLevels,
    subjects,
    selectedQuestionnaires,
    customSubjectGroups,
}) => {
    const count = (items, isLoaded, getSubjectIds = () => [], getLoadedSubjectIds = () => []) => {
        const subjectIds = new Set();
        const loadedSubjectIds = new Set();
        let loaded = 0;

        items.forEach((item) => {
            const currentSubjectIds = getSubjectIds(item).map((id) => String(id));
            currentSubjectIds.forEach((id) => subjectIds.add(id));

            if (isLoaded(item, currentSubjectIds)) {
                loaded += 1;
                currentSubjectIds.forEach((id) => loadedSubjectIds.add(id));
                return;
            }

            const currentSubjectIdSet = new Set(currentSubjectIds);
            getLoadedSubjectIds(item, currentSubjectIds)
                .map((id) => String(id))
                .filter((id) => currentSubjectIdSet.has(id))
                .forEach((id) => loadedSubjectIds.add(id));
        });

        return {
            total: items.length,
            loaded,
            subjectTotal: subjectIds.size,
            subjectLoaded: loadedSubjectIds.size,
        };
    };

    const collegePrograms = programs.filter((program) => {
        const department = departments.find((item) => String(item.id) === String(program.department_id));
        return department && getDepartmentKind(department) === 'college';
    });
    const seniorHighStrands = strands.filter((strand) => {
        const department = departments.find((item) => String(item.id) === String(strand.department_id));
        return department && getDepartmentKind(department) === 'senior-high';
    });
    const juniorHighLevels = departments
        .filter((department) => getDepartmentKind(department) === 'junior-high')
        .flatMap((department) => getUniqueGradeLevelScopes(yearLevels, department.id));
    const elementaryLevels = departments
        .filter((department) => getDepartmentKind(department) === 'elementary')
        .flatMap((department) => getUniqueGradeLevelScopes(yearLevels, department.id));

    const collegeStatus = count(
        collegePrograms,
        (program, subjectIds) => {
            const selected = selectedQuestionnaires[`program-${program.id}`];
            const groups = customSubjectGroups[String(program.id)] ?? [];
            const selectedCustomSubjectIds = (selected?.custom_subject_ids ?? []).map((id) => String(id));

            if (groups.length > 0) {
                const coveredSubjectIds = new Set(groups.flatMap((group) => group.subject_ids ?? []).map((id) => String(id)));
                return groups.every((group) => group.questionnaire_id) && subjectIds.every((id) => coveredSubjectIds.has(id));
            }

            if (selectedCustomSubjectIds.length > 0) {
                const coveredSubjectIds = new Set(selectedCustomSubjectIds);
                return subjectIds.every((id) => coveredSubjectIds.has(id));
            }

            return hasSelectedQuestionnaire(selected);
        },
        (program) => subjects
            .filter((subject) => String(subject.program_id ?? '') === String(program.id))
            .map((subject) => subject.id),
        (program) => {
            const selected = selectedQuestionnaires[`program-${program.id}`];
            const groups = customSubjectGroups[String(program.id)] ?? [];

            if (groups.length > 0) {
                return groups
                    .filter((group) => group.questionnaire_id)
                    .flatMap((group) => group.subject_ids ?? []);
            }

            return selected?.custom_subject_ids ?? [];
        },
    );

    const seniorHighStatus = count(
        seniorHighStrands,
        (strand) => hasSelectedQuestionnaire(selectedQuestionnaires[`strand-${strand.id}`]),
        (strand) => subjects
            .filter((subject) => String(subject.strand_id ?? '') === String(strand.id))
            .map((subject) => subject.id),
    );

    const levelSubjectIds = (level) => level.subjectIds ?? parseIdList(level.subject_id);
    const levelHasQuestionnaire = (level) => (level.levelIds ?? [level.id])
        .some((levelId) => hasSelectedQuestionnaire(selectedQuestionnaires[`level-${levelId}`]));
    const juniorHighStatus = count(
        juniorHighLevels,
        levelHasQuestionnaire,
        levelSubjectIds,
    );
    const elementaryStatus = count(
        elementaryLevels,
        levelHasQuestionnaire,
        levelSubjectIds,
    );

    return DEPARTMENT_LAYER_TABS.map((tab) => {
        const status = {
            college: collegeStatus,
            'senior-high': seniorHighStatus,
            'junior-high': juniorHighStatus,
            elementary: elementaryStatus,
        }[tab.key];
        const scopePercent = status.total > 0 ? Math.round((status.loaded / status.total) * 100) : 0;
        const subjectPercent = status.subjectTotal > 0 ? Math.round((status.subjectLoaded / status.subjectTotal) * 100) : 0;
        const percent = status.subjectTotal > 0 ? subjectPercent : scopePercent;
        const isComplete = status.total > 0 && status.loaded === status.total && status.subjectLoaded === status.subjectTotal;

        return {
            ...tab,
            ...status,
            percent,
            subjectPercent,
            isComplete,
            statusLabel: isComplete ? 'Complete' : (status.loaded > 0 || status.subjectLoaded > 0) ? 'In Progress' : 'Not Started',
        };
    });
};

const getPeerDepartmentStatusCards = ({
    departments,
    branches,
    programs,
    strands,
    yearLevels,
    selectedQuestionnaires,
}) => departments.map((department) => {
    const departmentKind = getDepartmentKind(department);
    const branch = branches.find((item) => String(item.id) === String(department.branch_id));
    const selectedQuestionnaire = selectedQuestionnaires[`department-${department.id}`] ?? null;
    const customGroups = selectedQuestionnaire?.custom_scope_groups ?? [];
    const scopeItems = (() => {
        if (departmentKind === 'college') {
            return programs.filter((program) => String(program.department_id ?? '') === String(department.id));
        }

        if (departmentKind === 'senior-high') {
            return strands.filter((strand) => String(strand.department_id ?? '') === String(department.id));
        }

        return getUniqueGradeLevelScopes(yearLevels, department.id);
    })();
    const total = scopeItems.length;
    const coveredScopeIds = new Set(
        customGroups
            .filter((group) => group.questionnaire_id)
            .flatMap((group) => group.subject_ids ?? [])
            .map((id) => String(id)),
    );
    const loaded = customGroups.length > 0
        ? scopeItems.filter((item) => coveredScopeIds.has(String(item.id))).length
        : hasSelectedQuestionnaire(selectedQuestionnaire)
            ? total
            : 0;
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
    const isComplete = total > 0 && loaded === total;

    return {
        id: `department-${department.id}`,
        entityId: department.id,
        scopeType: 'department',
        branchId: department.branch_id ?? null,
        departmentId: department.id ?? null,
        departmentKind,
        primary: department.name,
        secondary: department.code,
        branchName: branch?.name ?? '-',
        scopeLabel: getPeerScopeLabel(departmentKind),
        selectedQuestionnaire,
        customGroups,
        total,
        loaded,
        percent,
        isComplete,
        statusLabel: isComplete ? 'Complete' : loaded > 0 ? 'In Progress' : 'Not Started',
    };
});

const getHeadDepartmentStatusCards = ({
    departments,
    branches,
    faculty,
    selectedQuestionnaires,
}) => departments.map((department) => {
    const branch = branches.find((item) => String(item.id) === String(department.branch_id));
    const programChairs = faculty.filter((teacher) => (
        String(teacher.department_id ?? '') === String(department.id)
        && String(teacher.role ?? '').toLowerCase().includes('program chair')
    ));
    const loaded = programChairs.filter((teacher) => hasSelectedQuestionnaire(selectedQuestionnaires[`teacher-${teacher.id}`])).length;
    const total = programChairs.length;
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
    const isComplete = total > 0 && loaded === total;

    return {
        id: `head-department-${department.id}`,
        entityId: department.id,
        primary: department.name,
        secondary: department.code,
        branchName: branch?.name ?? '-',
        total,
        loaded,
        percent,
        isComplete,
        statusLabel: isComplete ? 'Complete' : loaded > 0 ? 'In Progress' : 'Not Started',
    };
});

function QuestionnaireListModal({ open, scopeItem, questionnaires, assignmentType, onClose }) {
    const [viewTarget, setViewTarget] = useState(null);
    const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState('');
    const [confirmTarget, setConfirmTarget] = useState(null);

    useEffect(() => {
        if (!open || !scopeItem) {
            setSelectedQuestionnaireId('');
            setViewTarget(null);
            setConfirmTarget(null);
            return;
        }

        setSelectedQuestionnaireId(String(scopeItem.selectedQuestionnaire?.questionnaire_id ?? ''));
    }, [open, scopeItem]);

    if (!open || !scopeItem) {
        return null;
    }

    const selectedQuestionnaire = questionnaires.find(
        (questionnaire) => String(questionnaire.questionnaire_id) === String(selectedQuestionnaireId),
    );
    const distributeQuestionnaire = () => {
        if (!selectedQuestionnaireId) {
            return;
        }

        setConfirmTarget({
            title: 'Confirm Distribution',
            message: `Are you sure you want to distribute "${selectedQuestionnaire?.title ?? 'this questionnaire'}" to ${scopeItem.primary}?`,
            onConfirm: () => {
                router.post(route('admin.assignments.select-questionnaire'), {
                    assignment_type: assignmentType,
                    questionnaire_id: selectedQuestionnaireId,
                    scope_type: scopeItem.scopeType,
                    scope_id: scopeItem.entityId,
                    branch_id: scopeItem.branchId,
                    department_id: scopeItem.departmentId,
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setConfirmTarget(null);
                        onClose();
                    },
                });
            },
        });
    };

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
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
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
                                        questionnaires.map((questionnaire, index) => {
                                            const isSelected = String(questionnaire.questionnaire_id) === String(selectedQuestionnaireId);

                                            return (
                                            <tr key={questionnaire.questionnaire_id} className={isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50/80'}>
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
                                                            onClick={() => setSelectedQuestionnaireId(
                                                                isSelected ? '' : String(questionnaire.questionnaire_id),
                                                            )}
                                                            className={isSelected
                                                                ? 'rounded-lg bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-blue-200'
                                                                : 'rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700'}
                                                        >
                                                            {isSelected ? 'Unselect' : 'Select'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            );
                                        })
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

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {questionnaires.length > 0 ? (
                                questionnaires.map((questionnaire, index) => {
                                    const isSelected = String(questionnaire.questionnaire_id) === String(selectedQuestionnaireId);

                                    return (
                                    <div key={`mobile-q-${questionnaire.questionnaire_id}`} className={`p-4 transition-colors ${isSelected ? 'bg-blue-50/70' : 'active:bg-slate-50'}`}>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400"># {index + 1}</div>
                                                    <div className="mt-0.5 text-sm font-semibold text-slate-900">{questionnaire.title ?? '-'}</div>
                                                    <div className="text-xs text-slate-500">{questionnaire.questionnaire_code ?? '-'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</div>
                                                    <div className="mt-0.5 text-xs text-slate-600">{questionnaire.questionnaire_type_name ?? '-'}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewTarget(questionnaire)}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                                                >
                                                    View
                                                </button>
                                                 <button
                                                    type="button"
                                                    onClick={() => setSelectedQuestionnaireId(
                                                        isSelected ? '' : String(questionnaire.questionnaire_id),
                                                    )}
                                                    className={isSelected
                                                        ? 'rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm ring-1 ring-blue-200'
                                                        : 'rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm'}
                                                >
                                                    {isSelected ? 'Unselect' : 'Select'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-slate-500">
                                    No questionnaires found.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 text-sm text-slate-500">
                            {selectedQuestionnaire ? (
                                <span>
                                    Selected: <span className="font-semibold text-slate-800">{selectedQuestionnaire.title}</span>
                                </span>
                            ) : (
                                <span>Select a questionnaire before distributing.</span>
                            )}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={distributeQuestionnaire}
                                disabled={!selectedQuestionnaireId}
                                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Distribute
                            </button>
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
            {confirmTarget && (
                <ConfirmDialog
                    open={Boolean(confirmTarget)}
                    title={confirmTarget.title}
                    message={confirmTarget.message}
                    onConfirm={confirmTarget.onConfirm}
                    onCancel={() => setConfirmTarget(null)}
                />
            )}
        </>
    );
}

function AssignedQuestionnairesModal({
    open,
    scopeItem,
    questionnaires,
    assignmentType,
    programs = [],
    strands = [],
    yearLevels = [],
    onClose,
}) {
    const [viewTarget, setViewTarget] = useState(null);

    if (!open || !scopeItem) {
        return null;
    }

    const itemLabel = assignmentType === 'peer' ? getPeerScopeLabel(scopeItem.departmentKind) : 'Subjects';
    const peerScopeLookup = assignmentType === 'peer'
        ? (() => {
            if (scopeItem.departmentKind === 'college') {
                return new Map(
                    programs
                        .filter((program) => String(program.department_id ?? '') === String(scopeItem.entityId))
                        .map((program) => [String(program.id), program.name]),
                );
            }

            if (scopeItem.departmentKind === 'senior-high') {
                return new Map(
                    strands
                        .filter((strand) => String(strand.department_id ?? '') === String(scopeItem.entityId))
                        .map((strand) => [String(strand.id), strand.name]),
                );
            }

            return new Map(
                getUniqueGradeLevelScopes(yearLevels, scopeItem.entityId)
                    .map((yearLevel) => [String(yearLevel.id), yearLevel.primary]),
            );
        })()
        : new Map();
    const assignedQuestionnaires = Array.isArray(scopeItem.customGroups) && scopeItem.customGroups.length > 0
        ? scopeItem.customGroups
            .map((group) => ({
                ...group,
                selectedLabels: assignmentType === 'peer'
                    ? (group.subject_ids ?? [])
                        .map((id) => peerScopeLookup.get(String(id)))
                        .filter(Boolean)
                    : [],
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
            selectedLabels: assignmentType === 'peer'
                ? (scopeItem.selectedQuestionnaire.custom_subject_ids ?? [])
                    .map((id) => peerScopeLookup.get(String(id)))
                    .filter(Boolean)
                : [],
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
                        {/* Desktop Table View */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Selected {itemLabel}</th>
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
                                                <td className="px-4 py-3 text-sm text-slate-600">
                                                    {assignmentType === 'peer' ? (
                                                        group.selectedLabels?.length > 0
                                                            ? group.selectedLabels.join(', ')
                                                            : `All ${itemLabel.toLowerCase()}`
                                                    ) : (
                                                        Array.isArray(group.subject_ids) ? group.subject_ids.length : 0
                                                    )}
                                                </td>
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

                        {/* Mobile Card View */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {assignedQuestionnaires.length > 0 ? (
                                assignedQuestionnaires.map((group, index) => (
                                    <div key={`mobile-assigned-${group.id ?? group.questionnaire_id}-${index}`} className="p-4 active:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400"># {index + 1}</div>
                                                    <div className="mt-0.5 text-sm font-semibold text-slate-900">{group.questionnaire?.title ?? group.questionnaire_title ?? '-'}</div>
                                                    <div className="text-xs text-slate-500">{group.questionnaire?.questionnaire_code ?? group.questionnaire_code ?? '-'}</div>
                                                </div>
                                                <div className="flex gap-4">
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</div>
                                                        <div className="mt-0.5 text-xs text-slate-600">{group.questionnaire?.questionnaire_type_name ?? '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{itemLabel}</div>
                                                        <div className="mt-0.5 text-xs text-slate-600 font-bold">
                                                            {assignmentType === 'peer'
                                                                ? (group.selectedLabels?.length > 0
                                                                    ? group.selectedLabels.join(', ')
                                                                    : `All ${itemLabel.toLowerCase()}`)
                                                                : (Array.isArray(group.subject_ids) ? group.subject_ids.length : 0)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setViewTarget(group.questionnaire)}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                                                >
                                                    View
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-8 text-center text-sm text-slate-500">
                                    No assigned questionnaires found.
                                </div>
                            )}
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

function CustomSubjectsModal({
    open,
    scopeItem,
    subjects,
    faculty,
    programs = [],
    strands = [],
    yearLevels = [],
    questionnaires,
    assignmentType,
    onClose,
}) {
    const [groups, setGroups] = useState([]);
    const [questionnairePickerGroupId, setQuestionnairePickerGroupId] = useState(null);
    const [questionnaireViewTarget, setQuestionnaireViewTarget] = useState(null);
    const getAvailableCustomItemIds = (target = scopeItem) => {
        if (!target) {
            return [];
        }

        if (assignmentType === 'peer') {
            if (target.departmentKind === 'college') {
                return programs
                    .filter((program) => String(program.department_id ?? '') === String(target.entityId))
                    .map((program) => String(program.id));
            }

            if (target.departmentKind === 'senior-high') {
                return strands
                    .filter((strand) => String(strand.department_id ?? '') === String(target.entityId))
                    .map((strand) => String(strand.id));
            }

            return getUniqueGradeLevelScopes(yearLevels, target.entityId)
                .map((yearLevel) => String(yearLevel.id));
        }

        if (target.scopeType === 'program') {
            return subjects
                .filter((subject) => String(subject.program_id ?? '') === String(target.entityId))
                .map((subject) => String(subject.id));
        }

        if (target.scopeType === 'strand') {
            return subjects
                .filter((subject) => String(subject.strand_id ?? '') === String(target.entityId))
                .map((subject) => String(subject.id));
        }

        if (target.scopeType === 'level') {
            return (target.subjectIds ?? []).map((id) => String(id));
        }

        return [];
    };
    const [confirmSave, setConfirmSave] = useState(false);

    useEffect(() => {
        if (!scopeItem) {
            setGroups([]);
            setQuestionnairePickerGroupId(null);
            setQuestionnaireViewTarget(null);
            return;
        }

        const existingGroups = Array.isArray(scopeItem.customGroups) ? scopeItem.customGroups : [];

        const canUseCustomGroups = assignmentType === 'peer' || assignmentType === 'student-teacher';

        if (canUseCustomGroups && existingGroups.length > 0) {
            setGroups(existingGroups.map((group, index) => ({
                localId: `${group.id ?? 'existing'}-${index}`,
                questionnaire_id: String(group.questionnaire_id ?? ''),
                subject_ids: (group.subject_ids ?? []).map((id) => String(id)),
            })));
            return;
        }

        const selectedQuestionnaireId = String(scopeItem?.selectedQuestionnaire?.questionnaire_id ?? '');
        const selectedCustomSubjectIds = (scopeItem?.selectedQuestionnaire?.custom_subject_ids ?? []).map((id) => String(id));
        const startingSubjectIds = selectedCustomSubjectIds.length > 0
            ? selectedCustomSubjectIds
            : (selectedQuestionnaireId ? getAvailableCustomItemIds(scopeItem) : []);

        setGroups([
            {
                localId: `new-${Date.now()}`,
                questionnaire_id: selectedQuestionnaireId,
                subject_ids: startingSubjectIds,
            },
        ]);
    }, [assignmentType, scopeItem, programs, strands, subjects, yearLevels]);

    if (!open || !scopeItem) {
        return null;
    }

    const isPeer = assignmentType === 'peer';
    const canUseCustomGroups = isPeer || assignmentType === 'student-teacher';
    const peerScopeLabel = getPeerScopeLabel(scopeItem.departmentKind);
    const itemNoun = isPeer ? peerScopeLabel.toLowerCase() : 'subjects';
    const itemLabel = isPeer ? peerScopeLabel : 'Subjects';
    const selectedQuestionnaireId = groups[0]?.questionnaire_id || scopeItem.selectedQuestionnaire?.questionnaire_id || null;
    const peerScopeItems = (() => {
        if (!isPeer) {
            return [];
        }

        if (scopeItem.departmentKind === 'college') {
            return programs
                .filter((program) => String(program.department_id ?? '') === String(scopeItem.entityId))
                .map((program) => ({
                    id: program.id,
                    name: program.name,
                    code: program.code,
                    role: null,
                }));
        }

        if (scopeItem.departmentKind === 'senior-high') {
            return strands
                .filter((strand) => String(strand.department_id ?? '') === String(scopeItem.entityId))
                .map((strand) => ({
                    id: strand.id,
                    name: strand.name,
                    code: strand.code,
                    role: null,
                }));
        }

        return getUniqueGradeLevelScopes(yearLevels, scopeItem.entityId)
            .map((yearLevel) => ({
                id: yearLevel.id,
                name: yearLevel.primary,
                code: null,
                role: null,
            }));
    })();
    const availableItems = (isPeer ? peerScopeItems : subjects).filter((item) => {
        if (isPeer) {
            return true;
        }

        if (scopeItem.scopeType === 'program') {
            return String(item.program_id ?? '') === String(scopeItem.entityId);
        }

        if (scopeItem.scopeType === 'strand') {
            return String(item.strand_id ?? '') === String(scopeItem.entityId);
        }

        if (scopeItem.scopeType === 'level') {
            return (scopeItem.subjectIds ?? []).includes(String(item.id));
        }

        return false;
    });
    const renderSelectableItem = (item, group) => (
        <label
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
        >
            <input
                type="checkbox"
                checked={group.subject_ids.includes(String(item.id))}
                onChange={() => {
                    const subjectKey = String(item.id);
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
                <span className="block font-medium text-slate-900">{item.name}</span>
                <span className="block text-xs text-slate-500">{[item.code, item.role].filter(Boolean).join(' - ')}</span>
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
                            <h3 className="text-lg font-semibold text-slate-900">Custom {itemLabel}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Choose {itemNoun} for <span className="font-medium text-slate-700">{scopeItem.primary}</span>.
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
                        {canUseCustomGroups ? (
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
                            const groupedSelectedItems = availableItems.filter((item) => group.subject_ids.includes(String(item.id)));
                            const groupedAvailableItems = availableItems.filter((item) => {
                                const subjectKey = String(item.id);

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
                                            <p className="text-xs text-slate-500">Assign a questionnaire and {itemNoun} set.</p>
                                        </div>
                                        {canUseCustomGroups && groups.length > 1 ? (
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
                                            {availableItems.length > 0 ? (
                                                <div className="max-h-96 space-y-5 overflow-y-auto p-3">
                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected {itemLabel}</p>
                                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                                {groupedSelectedItems.length}
                                                            </span>
                                                        </div>

                                                        {groupedSelectedItems.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {groupedSelectedItems.map((item) => renderSelectableItem(item, group))}
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                                                                No selected {itemNoun} yet.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <div className="mb-2 flex items-center justify-between gap-3">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available {itemLabel}</p>
                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                                {groupedAvailableItems.length}
                                                            </span>
                                                        </div>

                                                        {groupedAvailableItems.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {groupedAvailableItems.map((item) => renderSelectableItem(item, group))}
                                                            </div>
                                                        ) : (
                                                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                                                                All {itemNoun} in this scope are already grouped above.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="px-4 py-8 text-center text-sm text-slate-500">
                                                    No {itemNoun} found for this scope.
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
                            onClick={() => setConfirmSave(true)}
                            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                            Distribute
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={confirmSave}
                title="Save Custom Distribution"
                message="Are you sure you want to save these custom groups? This will update the questionnaire assignments for the selected subjects."
                onConfirm={() => {
                    router.post(route('admin.assignments.custom-subjects'), {
                        assignment_type: assignmentType,
                        scope_type: scopeItem.scopeType,
                        scope_id: scopeItem.entityId,
                        branch_id: scopeItem.branchId,
                        department_id: scopeItem.departmentId,
                        questionnaire_id: selectedQuestionnaireId,
                        subject_ids: groups[0]?.subject_ids ?? [],
                        groups: groups.map((group) => ({
                            questionnaire_id: group.questionnaire_id || null,
                            subject_ids: group.subject_ids,
                        })).filter((group) => group.questionnaire_id),
                    }, {
                        preserveScroll: true,
                        onSuccess: () => {
                            setConfirmSave(false);
                            onClose();
                        },
                    });
                }}
                onCancel={() => setConfirmSave(false)}
            />

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
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
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

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {questionnaires.length > 0 ? (
                                    questionnaires.map((questionnaire, index) => (
                                        <div key={`mobile-picker-${questionnaire.questionnaire_id}`} className="p-4 active:bg-slate-50 transition-colors">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-3">
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400"># {index + 1}</div>
                                                        <div className="mt-0.5 text-sm font-semibold text-slate-900">{questionnaire.title ?? '-'}</div>
                                                        <div className="text-xs text-slate-500">{questionnaire.questionnaire_code ?? '-'}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Type</div>
                                                        <div className="mt-0.5 text-xs text-slate-600">{questionnaire.questionnaire_type_name ?? '-'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuestionnaireViewTarget(questionnaire)}
                                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
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
                                                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                                                    >
                                                        Select
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                                        No questionnaires found.
                                    </div>
                                )}
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

function EmployeeDepartmentEmployeesModal({
    open,
    scopeItem,
    employees = [],
    onClose,
}) {
    if (!open || !scopeItem) {
        return null;
    }

    const scopedEmployees = employees.filter((employee) => (
        String(employee.employee_department_id ?? '') === String(scopeItem.entityId)
            && String(employee.branch_id ?? '') === String(scopeItem.branchId ?? '')
    ));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Custom Employees</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {scopeItem.primary} employees in {scopeItem.branchName ?? 'the active branch'}.
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
                    <div className="hidden md:block overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Code</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {scopedEmployees.length > 0 ? (
                                    scopedEmployees.map((employee, index) => (
                                        <tr key={`employee-scope-${employee.id}`} className="hover:bg-slate-50/80">
                                            <td className="px-4 py-3 text-sm text-slate-600">{index + 1}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{employee.name || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{employee.code || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-slate-600">{employee.role || '-'}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                                            No active employees found for this employee department in the active branch.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="md:hidden divide-y divide-slate-100">
                        {scopedEmployees.length > 0 ? (
                            scopedEmployees.map((employee, index) => (
                                <div key={`mobile-employee-scope-${employee.id}`} className="p-4 active:bg-slate-50 transition-colors">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400"># {index + 1}</div>
                                    <div className="mt-0.5 text-sm font-semibold text-slate-900">{employee.name || '-'}</div>
                                    <div className="text-xs text-slate-500">{employee.code || '-'}</div>
                                    <div className="mt-3">
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Role</div>
                                        <div className="mt-0.5 text-xs text-slate-600">{employee.role || '-'}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-slate-500">
                                No active employees found for this employee department in the active branch.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Assignments({
    assignmentType,
    filters = {},
    questionnaires = [],
    branches = [],
    departments = [],
    employeeDepartments = [],
    programs = [],
    strands = [],
    yearLevels = [],
    subjects = [],
    faculty = [],
    employees = [],
    selectedQuestionnaires = {},
    customSubjectGroups = {},
}) {
    const [activeDepartmentLayer, setActiveDepartmentLayer] = useState('college');
    const [activeHeadDepartmentId, setActiveHeadDepartmentId] = useState(null);
    const [distributeTarget, setDistributeTarget] = useState(null);
    const [customResetTarget, setCustomResetTarget] = useState(null);
    const [customTarget, setCustomTarget] = useState(null);
    const [assignedQuestionnaireTarget, setAssignedQuestionnaireTarget] = useState(null);
    const [confirmDistribute, setConfirmDistribute] = useState(null);
    const tabs = [
        { key: 'student-teacher', label: 'Subject Teacher', routeName: 'admin.subject-assignments' },
        { key: 'peer', label: 'Peer to Peer', routeName: 'admin.peer-assignments' },
        { key: 'head', label: 'School Heads', routeName: 'admin.head-assignments' },
        { key: 'employee', label: 'Employee Feedback', routeName: 'admin.employee-assignments' },
    ];
    const activeTab = tabs.find((tab) => tab.key === assignmentType) ?? tabs[0];
    const activeBranchId = String(filters.branch_id ?? '');
    const branchOptions = branches.filter((branch) => String(branch.code ?? '').toUpperCase() !== 'OVERALL');
    const openDistribute = (item) => {
        const hasCustomDistribution = assignmentType === 'student-teacher'
            && Array.isArray(item.customGroups)
            && item.customGroups.length > 0;

        if (hasCustomDistribution) {
            setCustomResetTarget(item);
            return;
        }

        setDistributeTarget(item);
    };
    const changeBranchFilter = (branchId) => {
        router.get(route(activeTab.routeName), {
            ...filters,
            branch_id: branchId,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };
    const subjectTeacherStatusCards = useMemo(() => getSubjectTeacherStatusCards({
        departments,
        programs,
        strands,
        yearLevels,
        subjects,
        selectedQuestionnaires,
        customSubjectGroups,
    }), [customSubjectGroups, departments, programs, selectedQuestionnaires, strands, subjects, yearLevels]);
    const peerDepartmentStatusCards = useMemo(() => getPeerDepartmentStatusCards({
        departments,
        branches,
        programs,
        strands,
        yearLevels,
        selectedQuestionnaires,
    }), [branches, departments, programs, selectedQuestionnaires, strands, yearLevels]);
    const headDepartmentStatusCards = useMemo(() => getHeadDepartmentStatusCards({
        departments,
        branches,
        faculty,
        selectedQuestionnaires,
    }), [branches, departments, faculty, selectedQuestionnaires]);
    const peerDepartmentStatusGroups = useMemo(() => {
        const groups = new Map();

        peerDepartmentStatusCards.forEach((card) => {
            const groupKey = String(card.branchId ?? card.branchName ?? 'all');

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    id: groupKey,
                    label: card.branchName ?? 'All Branches',
                    cards: [],
                });
            }

            groups.get(groupKey).cards.push(card);
        });

        return Array.from(groups.values());
    }, [peerDepartmentStatusCards]);
    const filteredScopeItems = useMemo(() => {
        if (assignmentType === 'peer') {
            return peerDepartmentStatusCards;
        }

        if (assignmentType === 'head') {
            return faculty
                .filter((teacher) => String(teacher.role ?? '').toLowerCase().includes('program chair'))
                .filter((teacher) => !activeHeadDepartmentId || String(teacher.department_id ?? '') === String(activeHeadDepartmentId))
                .map((teacher) => {
                    const program = programs.find((item) => String(item.id) === String(teacher.program_id));
                    const department = departments.find((item) => String(item.id) === String(teacher.department_id));
                    const branch = branches.find((item) => String(item.id) === String(teacher.branch_id));

                    return {
                        id: `teacher-${teacher.id}`,
                        entityId: teacher.id,
                        scopeType: 'teacher',
                        branchId: teacher.branch_id ?? null,
                        departmentId: teacher.department_id ?? null,
                        primary: teacher.name,
                        secondary: teacher.code,
                        role: teacher.role,
                        programName: program?.name ?? '-',
                        departmentName: department?.name ?? '-',
                        branchName: branch?.name ?? '-',
                        selectedQuestionnaire: selectedQuestionnaires[`teacher-${teacher.id}`] ?? null,
                    };
                });
        }

        if (assignmentType === 'employee') {
            return employeeDepartments.map((department) => {
                const branch = branches.find((item) => String(item.id) === String(department.branch_id));
                const scopedEmployees = employees.filter((employee) => (
                    String(employee.employee_department_id ?? '') === String(department.id)
                        && String(employee.branch_id ?? '') === String(activeBranchId)
                ));

                return {
                    id: `employee-department-${department.id}`,
                    entityId: department.id,
                    scopeType: 'employee-department',
                    branchId: activeBranchId || department.branch_id || null,
                    departmentId: null,
                    primary: department.name,
                    secondary: department.code,
                    branchName: branch?.name ?? branches.find((item) => String(item.id) === String(activeBranchId))?.name ?? 'Active Branch',
                    employeeCount: scopedEmployees.length,
                    selectedQuestionnaire: selectedQuestionnaires[`employee-department-${department.id}`] ?? null,
                };
            });
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
                        customGroups: selectedQuestionnaires[`program-${program.id}`]?.custom_scope_groups ?? customSubjectGroups[String(program.id)] ?? [],
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
                        customGroups: selectedQuestionnaires[`strand-${strand.id}`]?.custom_scope_groups ?? [],
                    };
                })
                .filter(Boolean);
        }

        return departments
            .filter((department) => getDepartmentKind(department) === activeDepartmentLayer)
            .flatMap((department) => getUniqueGradeLevelScopes(yearLevels, department.id).map((yearLevel) => {
                const selectedQuestionnaire = (yearLevel.levelIds ?? [])
                    .map((levelId) => selectedQuestionnaires[`level-${levelId}`])
                    .find((questionnaire) => hasSelectedQuestionnaire(questionnaire)) ?? null;

                return {
                    id: `level-${yearLevel.id}`,
                    entityId: yearLevel.id,
                    scopeType: 'level',
                    branchId: department.branch_id ?? null,
                    departmentId: department.id ?? null,
                    primary: yearLevel.primary,
                    secondary: '',
                    levelIds: yearLevel.levelIds ?? [yearLevel.id],
                    subjectIds: yearLevel.subjectIds ?? [],
                    selectedQuestionnaire,
                    customGroups: selectedQuestionnaire?.custom_scope_groups ?? [],
                };
            }));
    }, [activeBranchId, activeDepartmentLayer, activeHeadDepartmentId, assignmentType, branches, departments, employeeDepartments, employees, faculty, peerDepartmentStatusCards, programs, selectedQuestionnaires, strands, yearLevels]);

    return (
        <AdminLayout title={TITLE_MAP[assignmentType]} activeRoute="admin.questionnaire-distribution" breadcrumbs={['Question Bank']}>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Questionnaire Distribution</h2>
                    <p className="text-sm text-slate-500">Manage which questionnaire set is used for each evaluation flow.</p>
                </div>
                <label className="min-w-64">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Active Branch</span>
                    <select
                        value={activeBranchId}
                        onChange={(event) => changeBranchFilter(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        {branchOptions.map((branch) => (
                            <option key={branch.id} value={branch.id}>
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </label>
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
                    <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {subjectTeacherStatusCards.map((card) => {
                            const isActive = card.key === activeDepartmentLayer;

                            return (
                                <button
                                    key={`status-${card.key}`}
                                    type="button"
                                    onClick={() => setActiveDepartmentLayer(card.key)}
                                    className={[
                                        'rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md',
                                        isActive ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200',
                                    ].join(' ')}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-slate-900">{card.label}</p>
                                            <p className="mt-1 text-xs text-slate-500">
                                                {card.loaded}/{card.total} {getScopeListHeading(card.key).toLowerCase()} loaded
                                            </p>
                                        </div>
                                        <span className={[
                                            'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                                            card.isComplete
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : card.loaded > 0
                                                ? 'bg-amber-50 text-amber-700'
                                                : 'bg-slate-100 text-slate-600',
                                        ].join(' ')}>
                                            {card.statusLabel}
                                        </span>
                                    </div>

                                    <div className="mt-4">
                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={[
                                                    'h-full rounded-full transition-all',
                                                    card.isComplete ? 'bg-emerald-500' : 'bg-blue-600',
                                                ].join(' ')}
                                                style={{ width: `${card.percent}%` }}
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                                            <span>{card.percent}% assigned</span>
                                            <span>{card.subjectLoaded}/{card.subjectTotal} subjects</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

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

            {assignmentType === 'peer' ? (
                <div className="mb-5 space-y-5">
                    {peerDepartmentStatusGroups.map((group) => (
                        <section key={`peer-branch-${group.id}`}>
                            <div className="mb-3 flex items-center gap-3">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</span>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {group.cards.map((card) => (
                                    <button
                                        key={`peer-status-${card.id}`}
                                        type="button"
                                        onClick={() => setCustomTarget(card)}
                                        className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">{card.primary}</p>
                                                <p className="mt-1 truncate text-xs text-slate-500">{card.branchName}</p>
                                            </div>
                                            <span className={[
                                                'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                                                card.isComplete
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : card.loaded > 0
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-slate-100 text-slate-600',
                                            ].join(' ')}>
                                                {card.statusLabel}
                                            </span>
                                        </div>

                                        <div className="mt-4">
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={[
                                                        'h-full rounded-full transition-all',
                                                        card.isComplete ? 'bg-emerald-500' : 'bg-blue-600',
                                                    ].join(' ')}
                                                    style={{ width: `${card.percent}%` }}
                                                />
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                                                <span>{card.percent}% assigned</span>
                                                <span>{card.loaded}/{card.total} {card.scopeLabel.toLowerCase()}</span>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                                </div>
            ) : null}

            {assignmentType === 'head' ? (
                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {headDepartmentStatusCards.map((card) => {
                        const isActive = String(activeHeadDepartmentId ?? '') === String(card.entityId);

                        return (
                            <button
                                key={`head-status-${card.id}`}
                                type="button"
                                onClick={() => setActiveHeadDepartmentId(isActive ? null : card.entityId)}
                                className={[
                                    'rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md',
                                    isActive ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200',
                                ].join(' ')}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-900">{card.primary}</p>
                                        <p className="mt-1 truncate text-xs text-slate-500">{card.branchName}</p>
                                    </div>
                                    <span className={[
                                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                                        card.isComplete
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : card.loaded > 0
                                            ? 'bg-amber-50 text-amber-700'
                                            : 'bg-slate-100 text-slate-600',
                                    ].join(' ')}>
                                        {card.statusLabel}
                                    </span>
                                </div>

                                <div className="mt-4">
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={[
                                                'h-full rounded-full transition-all',
                                                card.isComplete ? 'bg-emerald-500' : 'bg-blue-600',
                                            ].join(' ')}
                                            style={{ width: `${card.percent}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                                        <span>{card.percent}% assigned</span>
                                        <span>{card.loaded}/{card.total} program chairs</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : null}

            {assignmentType === 'student-teacher' || assignmentType === 'peer' || assignmentType === 'head' || assignmentType === 'employee' ? (
                <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                {assignmentType === 'employee'
                                    ? 'Employee Departments'
                                    : assignmentType === 'head'
                                    ? 'Program Chairs'
                                    : getTableHeading(assignmentType, activeDepartmentLayer)}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {assignmentType === 'employee'
                                    ? 'Showing all active employee departments for employee-feedback questionnaire distribution.'
                                    : assignmentType === 'head'
                                    ? activeHeadDepartmentId
                                        ? 'Showing active program chairs for the selected department.'
                                        : 'Showing all active program chairs for school-head questionnaire distribution.'
                                    : assignmentType === 'peer'
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
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">#</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Name</th>
                                            {assignmentType === 'peer' ? (
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</th>
                                            ) : null}
                                            {assignmentType === 'head' ? (
                                                <>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Program</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</th>
                                                </>
                                            ) : null}
                                            {assignmentType === 'employee' ? (
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Employees</th>
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
                                                {assignmentType === 'head' ? (
                                                    <>
                                                        <td className="px-4 py-3 text-sm text-slate-600">{item.programName ?? '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-slate-600">{item.branchName ?? '-'}</td>
                                                    </>
                                                ) : null}
                                                {assignmentType === 'employee' ? (
                                                    <td className="px-4 py-3 text-sm text-slate-600">{item.employeeCount ?? 0}</td>
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
                                                                    setConfirmDistribute({
                                                                        title: 'Reset Custom Distribution?',
                                                                        message: 'This program is currently using custom questionnaire distribution. Continuing will reset all custom distributions for this program. Do you want to continue?',
                                                                        onConfirm: () => {
                                                                            setConfirmDistribute(null);
                                                                            setDistributeTarget(item);
                                                                        }
                                                                    });
                                                                    return;
                                                                }

                                                                setDistributeTarget(item);
                                                            }}
                                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                                        >
                                                            {assignmentType === 'head' ? 'Assign' : 'Distribute'}
                                                        </button>
                                                        {assignmentType !== 'head' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (assignmentType === 'employee') {
                                                                        setCustomTarget(item);
                                                                        return;
                                                                    }

                                                                    if (assignmentType === 'peer') {
                                                                        setCustomTarget(item);
                                                                        return;
                                                                    }

                                                                    setCustomTarget(item);
                                                                }}
                                                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-slate-800"
                                                            >
                                                                Custom
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {filteredScopeItems.map((item, index) => (
                                    <div key={`mobile-dist-${item.id}`} className="p-4 active:bg-slate-50 transition-colors">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400"># {index + 1}</div>
                                                    <div className="mt-0.5 text-sm font-semibold text-slate-900">{item.primary}</div>
                                                    <div className="text-xs text-slate-500">{item.secondary || '-'}</div>
                                                </div>

                                                {item.branchName && (
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch</div>
                                                        <div className="mt-0.5 text-xs text-slate-600">{item.branchName}</div>
                                                    </div>
                                                )}

                                                {assignmentType === 'head' && item.programName && (
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Program</div>
                                                        <div className="mt-0.5 text-xs text-slate-600">{item.programName}</div>
                                                    </div>
                                                )}

                                                {assignmentType === 'employee' ? (
                                                    <div>
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Employees</div>
                                                        <div className="mt-0.5 text-xs text-slate-600">{item.employeeCount ?? 0}</div>
                                                    </div>
                                                ) : null}

                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Questionnaire</div>
                                                    <div className="mt-1">
                                                        {(Array.isArray(item.customGroups) && item.customGroups.length > 0) || item.selectedQuestionnaire ? (
                                                            <div className="space-y-1">
                                                                {Array.isArray(item.customGroups) && item.customGroups.length > 0 ? (
                                                                    <div>
                                                                        <div className="text-xs font-semibold text-blue-600">Custom ({item.customGroups.length})</div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setAssignedQuestionnaireTarget(item)}
                                                                            className="text-[10px] font-medium text-slate-500 underline"
                                                                        >
                                                                            Open list
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <div className="text-xs font-medium text-slate-900 truncate max-w-[150px]">{item.selectedQuestionnaire.questionnaire_title}</div>
                                                                        <div className="text-[10px] text-slate-500">{item.selectedQuestionnaire.questionnaire_code}</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs italic text-slate-400">None assigned</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const hasCustomDistribution = assignmentType === 'student-teacher'
                                                            && item.scopeType === 'program'
                                                            && Array.isArray(item.customGroups)
                                                            && item.customGroups.length > 0;

                                                        if (hasCustomDistribution) {
                                                            setConfirmDistribute({
                                                                title: 'Reset Custom Distribution?',
                                                                message: 'This program is currently using custom questionnaire distribution. Continuing will reset all custom distributions for this program. Do you want to continue?',
                                                                onConfirm: () => {
                                                                    setConfirmDistribute(null);
                                                                    setDistributeTarget(item);
                                                                }
                                                            });
                                                            return;
                                                        }

                                                        setDistributeTarget(item);
                                                    }}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                                                >
                                                    {assignmentType === 'head' ? 'Assign' : 'Distribute'}
                                                </button>
                                                {assignmentType !== 'head' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (assignmentType === 'employee') {
                                                                setCustomTarget(item);
                                                                return;
                                                            }

                                                            if (assignmentType === 'peer') {
                                                                setCustomTarget(item);
                                                                return;
                                                            }

                                                            setCustomTarget(item);
                                                        }}
                                                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm"
                                                    >
                                                        Custom
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            {assignmentType === 'peer'
                                ? 'No departments found yet.'
                                : assignmentType === 'employee'
                                ? 'No employee departments found yet.'
                                : assignmentType === 'head'
                                ? 'No program chairs found yet.'
                                : 'No items found for this department layer yet.'}
                        </div>
                    )}
                </div>
            ) : null}

            <QuestionnaireListModal
                open={Boolean(distributeTarget)}
                scopeItem={distributeTarget}
                questionnaires={questionnaires}
                assignmentType={assignmentType}
                onClose={() => setDistributeTarget(null)}
            />

            <ConfirmDialog
                open={Boolean(customResetTarget)}
                title="Reset Custom Distribution?"
                message={`"${customResetTarget?.primary ?? 'This scope'}" is currently using custom questionnaire distribution. Continuing will reset those custom assignments when you distribute a questionnaire.`}
                tone="warning"
                confirmLabel="Continue"
                cancelLabel="Cancel"
                onCancel={() => setCustomResetTarget(null)}
                onConfirm={() => {
                    setDistributeTarget(customResetTarget);
                    setCustomResetTarget(null);
                }}
            />

            {assignmentType === 'employee' ? (
                <EmployeeDepartmentEmployeesModal
                    open={Boolean(customTarget)}
                    scopeItem={customTarget}
                    employees={employees}
                    onClose={() => setCustomTarget(null)}
                />
            ) : (
                <CustomSubjectsModal
                    open={Boolean(customTarget)}
                    scopeItem={customTarget}
                    subjects={subjects}
                    faculty={faculty}
                    programs={programs}
                    strands={strands}
                    yearLevels={yearLevels}
                    questionnaires={questionnaires}
                    assignmentType={assignmentType}
                    onClose={() => setCustomTarget(null)}
                />
            )}

            <AssignedQuestionnairesModal
                open={Boolean(assignedQuestionnaireTarget)}
                scopeItem={assignedQuestionnaireTarget}
                questionnaires={questionnaires}
                assignmentType={assignmentType}
                programs={programs}
                strands={strands}
                yearLevels={yearLevels}
                onClose={() => setAssignedQuestionnaireTarget(null)}
            />

            <ConfirmDialog
                open={Boolean(confirmDistribute)}
                title={confirmDistribute?.title}
                message={confirmDistribute?.message}
                tone="warning"
                onConfirm={confirmDistribute?.onConfirm}
                onCancel={() => setConfirmDistribute(null)}
            />
        </AdminLayout>
    );
}
