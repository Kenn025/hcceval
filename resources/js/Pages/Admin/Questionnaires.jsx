import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput, TextareaInput } from '@/Components/Admin/FormField';
import Pagination from '@/Components/Admin/Pagination';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import useFormDirty from '@/Components/Admin/useFormDirty';
import Modal from '@/Components/Modal';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { Eye, Pencil, Printer, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

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
        questions_by_class: {},
    };
}

function QuestionnaireCards({ data, filters, onView, onEdit, onDelete }) {
    const [search, setSearch] = useState(filters.search ?? '');
    const timerRef = useRef(null);
    const pageStart = data?.from ?? (
        ((data?.current_page ?? 1) - 1) * (data?.per_page ?? data?.data?.length ?? 0) + 1
    );

    const handleSearch = useCallback((value) => {
        setSearch(value);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            router.get(route('admin.questionnaires'), { ...filters, search: value, per_page: filters.per_page ?? 15 }, {
                preserveState: true,
                replace: true,
            });
        }, 400);
    }, [filters]);

    const handlePerPageChange = (value) => {
        router.get(route('admin.questionnaires'), { ...filters, per_page: value, page: 1 }, {
            preserveState: true,
        });
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative min-w-0 flex-1 md:max-w-sm">
                        <svg
                            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Search questionnaires..."
                            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>

                    {data.total > 0 && (
                        <div className="hidden items-center gap-2 text-xs font-bold uppercase tracking-tight text-slate-500 lg:flex">
                            <span>Page</span>
                            <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-slate-100 px-1 text-blue-600">
                                {data.current_page}
                            </span>
                            <span>of</span>
                            <span className="text-slate-900">{data.last_page}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <label className="hidden text-xs font-bold uppercase tracking-tight text-slate-500 sm:block">
                        Show
                    </label>
                    <select
                        value={filters.per_page ?? 15}
                        onChange={(e) => handlePerPageChange(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                        {[10, 15, 25, 50, 100].map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
            </div>

            {data.data?.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                    No records found.
                </div>
            ) : (
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {data.data?.map((row, index) => (
                        <article
                            key={row.questionnaire_id ?? index}
                            className="flex min-h-[18rem] flex-col rounded-lg border border-blue-100 bg-white p-3 shadow-sm shadow-slate-100 transition hover:border-blue-200 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        #{pageStart + index} · {row.questionnaire_code ?? '-'}
                                    </p>
                                    <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold text-slate-950">
                                        {row.questionnaire_title ?? '-'}
                                    </h3>
                                </div>
                                <StatusBadge active={row.is_active} activeLabel="Active" inactiveLabel="Inactive" />
                            </div>

                            <div className="mt-3 space-y-2 text-sm">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                                    <p className="mt-0.5 truncate font-medium text-slate-800">{row.branch_name ?? '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</p>
                                    <p className="mt-0.5 line-clamp-2 font-medium text-slate-800">{row.questionnaire_type_name ?? '-'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choice Set</p>
                                    <p className="mt-0.5 line-clamp-2 text-slate-700">
                                        {row.question_choices_code ? `${row.question_choices_name} - ${row.question_choices_code} (${row.question_choices_quantity})` : '-'}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                                    <p className="mt-0.5 text-base font-semibold text-slate-900">{row.item_count ?? 0}</p>
                                </div>
                                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
                                    <p className="mt-0.5 text-base font-semibold text-slate-900">{row.comment_count ?? 0}</p>
                                </div>
                            </div>

                            <p className="mt-3 line-clamp-2 text-xs text-slate-600">
                                {row.notes || 'No notes provided.'}
                            </p>

                            <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => onView(row)}
                                    title="View questionnaire"
                                    aria-label="View questionnaire"
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700 transition hover:border-blue-200 hover:bg-blue-100"
                                >
                                    <Eye className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onEdit(row)}
                                        title="Edit questionnaire"
                                        aria-label="Edit questionnaire"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                    >
                                        <Pencil className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDelete(row)}
                                        title="Delete questionnaire"
                                        aria-label="Delete questionnaire"
                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                                    >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            )}

            <Pagination data={data} />
        </div>
    );
}

const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function buildQuestionnairePrintHtml(questionnaire, questions) {
    const questionLookup = new Map(questions.map((question) => [Number(question.id), question]));
    const classGroups = Array.isArray(questionnaire.class_groups) ? questionnaire.class_groups : [];
    const commentQuestions = (questionnaire.comments ?? [])
        .map((id) => questionLookup.get(Number(id)))
        .filter(Boolean);
    const choiceCount = Math.max(1, Number(questionnaire.question_choices_quantity ?? 5) || 5);
    const choices = Array.from({ length: choiceCount }, (_, index) => index + 1);
    const ratingLabels = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };
    const groupsHtml = classGroups.map((group, groupIndex) => {
        const groupQuestions = (group.questions ?? [])
            .map((id) => questionLookup.get(Number(id)))
            .filter(Boolean);

        return `
            <section class="section">
                <div class="section-heading">
                    <strong>${escapeHtml(group.question_class_name || `Question Class ${groupIndex + 1}`)}</strong>
                    <span>${escapeHtml(group.weight ?? 0)}%</span>
                </div>
                ${groupQuestions.length ? groupQuestions.map((question, questionIndex) => `
                    <div class="question-card">
                        <p><strong>${questionIndex + 1}.</strong> ${escapeHtml(question.description ?? '-')}</p>
                        <div class="ratings">
                            ${choices.map((choice) => `
                                <div class="rating-choice">
                                    <span class="rating-value">${choice}</span>
                                    <span class="rating-label">${escapeHtml(ratingLabels[choice] ?? `Rating ${choice}`)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('') : '<p class="empty">No questions selected for this class.</p>'}
            </section>
        `;
    }).join('');
    const commentsHtml = commentQuestions.length ? commentQuestions.map((question, index) => `
        <div class="question-card">
            <p><strong>${index + 1}.</strong> ${escapeHtml(question.description ?? '-')}</p>
            <div class="comment-box"></div>
        </div>
    `).join('') : '<p class="empty">No comment questions found.</p>';

    return `<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>${escapeHtml(questionnaire.questionnaire_title ?? 'Questionnaire')}</title>
    <style>
        * { box-sizing: border-box; }
        body { background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
        .hero { background: linear-gradient(135deg, #0f3d24, #1e6e40); border-radius: 16px; color: white; margin-bottom: 20px; padding: 20px; }
        .eyebrow { color: #a7f3d0; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
        h1 { font-size: 24px; margin: 6px 0 8px; }
        h2 { font-size: 16px; margin: 0; }
        .muted { color: #64748b; font-size: 13px; }
        .info { background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 20px; padding: 16px; }
        .info-title { color: #059669; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .info h2 { color: #0f172a; font-size: 20px; margin: 4px 0; }
        .instruction { color: #64748b; font-size: 13px; margin: 0 0 16px; }
        .section { margin-top: 18px; break-inside: avoid; }
        .section-heading { align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 12px; color: #065f46; display: flex; justify-content: space-between; margin-bottom: 10px; padding: 10px 12px; }
        .question-card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; padding: 16px; break-inside: avoid; }
        .question-card p { color: #334155; font-size: 14px; margin: 0 0 12px; }
        .ratings { display: flex; flex-wrap: wrap; gap: 8px; }
        .rating-choice { border: 1px solid #e2e8f0; border-radius: 12px; color: #475569; min-width: 72px; padding: 8px 10px; text-align: center; }
        .rating-value { display: block; font-size: 16px; font-weight: 800; }
        .rating-label { display: block; font-size: 10px; margin-top: 2px; }
        .comment-box { border: 1px dashed #cbd5e1; border-radius: 8px; height: 84px; margin-top: 10px; }
        .notes { background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 18px; min-height: 72px; padding: 16px; white-space: pre-wrap; }
        .empty { background: white; border: 1px solid #e2e8f0; border-radius: 12px; color: #64748b; padding: 14px; }
        @media print {
            body { background: white; }
            body { margin: 18mm; }
            .no-print { display: none; }
            .hero { border-radius: 12px; }
            .question-card, .section { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <button class="no-print" onclick="window.print()" style="float:right;padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:white;font-weight:700;">Print / Save PDF</button>
    <div class="hero">
        <div class="eyebrow">Evaluation Submissions</div>
        <h1>My Evaluation</h1>
        <div>${escapeHtml(questionnaire.questionnaire_code ?? '-')}</div>
    </div>
    <div class="info">
        <div class="info-title">${escapeHtml(questionnaire.questionnaire_type_name ?? 'Questionnaire')}</div>
        <h2>${escapeHtml(questionnaire.questionnaire_title ?? '-')}</h2>
        <div class="muted">${escapeHtml(questionnaire.branch_name ?? '-')}</div>
    </div>
    <p class="instruction">Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>.</p>
    ${groupsHtml || '<p class="empty">No questionnaire items found.</p>'}
    <section class="section">
        <div class="section-heading"><strong>Comments</strong><span>${commentQuestions.length} question${commentQuestions.length === 1 ? '' : 's'}</span></div>
        ${commentsHtml}
    </section>
    <div class="notes">${escapeHtml(questionnaire.notes || '-')}</div>
    <script>
        window.onload = function () {
            window.focus();
            window.print();
        };
    </script>
</body>
</html>`;
}

function QuestionnaireFormPreview({ questionnaire, questions }) {
    const questionLookup = new Map(questions.map((question) => [Number(question.id), question]));
    const classGroups = Array.isArray(questionnaire.class_groups) ? questionnaire.class_groups : [];
    const commentQuestions = (questionnaire.comments ?? [])
        .map((id) => questionLookup.get(Number(id)))
        .filter(Boolean);
    const choiceCount = Math.max(1, Number(questionnaire.question_choices_quantity ?? 5) || 5);
    const choices = Array.from({ length: choiceCount }, (_, index) => index + 1);

    return (
        <div>
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{questionnaire.questionnaire_type_name ?? 'Questionnaire'}</p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900">{questionnaire.questionnaire_title ?? '-'}</h3>
                        <p className="mt-2 text-base text-slate-600">{questionnaire.branch_name ?? '-'}</p>
                        <p className="mt-1 text-sm text-slate-500">Questionnaire: {questionnaire.questionnaire_code ?? '-'}</p>
                    </div>
                    <StatusBadge active={questionnaire.is_active} activeLabel="Active" inactiveLabel="Inactive" />
                </div>
            </div>

            <div className="space-y-7 px-6 py-5">
            <p className="text-sm text-slate-600">Rate each item from <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>.</p>

            {classGroups.length > 0 ? (
                classGroups.map((group, groupIndex) => {
                    const groupQuestions = (group.questions ?? [])
                        .map((id) => questionLookup.get(Number(id)))
                        .filter(Boolean);

                    return (
                        <section key={`${group.question_class_name}-${groupIndex}`} className="space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="h-px flex-1 bg-slate-200" />
                                <h4 className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-600">
                                    {group.question_class_name || `Question Class ${groupIndex + 1}`} ({group.weight ?? 0}%)
                                </h4>
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            {groupQuestions.length > 0 ? (
                                <div className="space-y-4">
                                    {groupQuestions.map((question, questionIndex) => (
                                        <div key={`${question.id}-${questionIndex}`} className="rounded-lg border border-slate-200 bg-white p-5">
                                            <p className="mb-4 text-base text-slate-700">
                                                <span className="mr-1 font-semibold text-slate-500">{questionIndex + 1}.</span>{question.description}
                                            </p>
                                            <div className="grid gap-3 sm:grid-cols-5">
                                                {choices.map((choice) => (
                                                    <div key={choice} className="flex min-h-[68px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                                                        <span className="text-xl font-bold text-slate-600">{choice}</span>
                                                        <span className="mt-1 text-[11px] opacity-80">
                                                            {{ 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' }[choice] ?? `Rating ${choice}`}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No questions selected for this class.</p>
                            )}
                        </section>
                    );
                })
            ) : (
                <p className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
                    No questionnaire items found.
                </p>
            )}

            <section className="space-y-4">
                <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <h4 className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-slate-600">
                        Comments ({commentQuestions.length})
                    </h4>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>

                {commentQuestions.length > 0 ? (
                    <div className="space-y-4">
                        {commentQuestions.map((question, index) => (
                            <div key={`${question.id}-${index}`} className="rounded-lg border border-slate-200 bg-white p-5">
                                <p className="text-base text-slate-700">{index + 1}. {question.description}</p>
                                <div className="mt-3 h-24 rounded-lg border border-slate-200 bg-white" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No comment questions found.</p>
                )}
            </section>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{questionnaire.notes || '-'}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div className="rounded-xl border border-slate-200 py-3 text-center text-sm font-medium text-slate-700">Cancel</div>
                <div className="rounded-xl bg-blue-400 py-3 text-center text-sm font-semibold text-white">Submit Evaluation</div>
            </div>
            </div>
        </div>
    );
}

export default function Questionnaires({ questionnaires, branches = [], questionnaireTypes, questionChoices, questionClasses, questions, questionnaireTitleChecks = [], filters }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [itemSearch, setItemSearch] = useState('');
    const [commentSearch, setCommentSearch] = useState('');
    const [submitError, setSubmitError] = useState('');
    const [confirmSave, setConfirmSave] = useState(false);
    const [questionnairePreviewOpen, setQuestionnairePreviewOpen] = useState(false);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        questionnaire_title: '',
        branch_id: '',
        questionnaire_type_id: '',
        question_choices_id: '',
        class_groups: [emptyClassGroup()],
        items: [],
        comments: [],
        notes: '',
        is_active: true,
    });

    const { isDirty } = useFormDirty(data, editing?.questionnaire_id ?? 'new');
    const normalizedQuestionnaireTitle = String(data.questionnaire_title ?? '').trim().toLowerCase();
    const questionnaireTitleExists = normalizedQuestionnaireTitle !== ''
        && questionnaireTitleChecks.some((item) => (
            String(item.title ?? '').trim().toLowerCase() === normalizedQuestionnaireTitle
            && String(item.id) !== String(editing?.questionnaire_id ?? '')
        ));
    const questionnaireTitleError = questionnaireTitleExists
        ? 'A questionnaire with this title already exists.'
        : errors.questionnaire_title;
    const usedWeight = data.class_groups.reduce((sum, group) => sum + Number(group.weight || 0), 0);
    const remainingWeight = Math.max(0, 100 - usedWeight);
    const weightsTotalComplete = usedWeight === 100;
    const classGroupsComplete = data.class_groups.length > 0
        && data.class_groups.every((group) => (
            String(group.question_class_id ?? '').trim()
            && String(group.weight ?? '').trim()
            && (group.questions ?? []).length > 0
        ));
    const questionnaireRequiredFieldsComplete = Boolean(
        normalizedQuestionnaireTitle
        && String(data.branch_id ?? '').trim()
        && String(data.questionnaire_type_id ?? '').trim()
        && String(data.question_choices_id ?? '').trim()
        && classGroupsComplete
        && weightsTotalComplete
        && !questionnaireTitleExists
    );

    const clearQuestionnaireDraft = () => {
        reset();
        clearErrors();
        setSubmitError('');
        setConfirmSave(false);
        setQuestionnairePreviewOpen(false);
    };

    const closeQuestionnaireForm = ({ resetDraft = false } = {}) => {
        setSlideOpen(false);
        setConfirmSave(false);
        setQuestionnairePreviewOpen(false);

        if (resetDraft && !editing) {
            clearQuestionnaireDraft();
        }
    };

    const openCreate = () => {
        if (editing) {
            clearQuestionnaireDraft();
            setEditing(null);
        }

        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({
            questionnaire_title: row.questionnaire_title ?? '',
            branch_id: row.branch_id ?? '',
            questionnaire_type_id: row.questionnaire_type_id ?? '',
            question_choices_id: row.question_choices_id ?? '',
            class_groups: row.class_groups?.length
                ? row.class_groups.map((group) => ({
                    question_class_id: questionClasses.find((questionClass) => questionClass.name === (group.question_class_name ?? ''))?.id ?? '',
                    question_class_name: group.question_class_name ?? '',
                    weight: group.weight ?? '',
                    questions: group.questions ?? [],
                    questions_by_class: {
                        [questionClasses.find((questionClass) => questionClass.name === (group.question_class_name ?? ''))?.id ?? '']: group.questions ?? [],
                    },
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
        setQuestionnairePreviewOpen(false);
        setSlideOpen(true);
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
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
                        questions_by_class: {
                            ...(group.questions_by_class ?? {}),
                            ...(group.question_class_id ? { [group.question_class_id]: group.questions ?? [] } : {}),
                        },
                        questions: (group.questions_by_class ?? {})[value] ?? [],
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

        updateClassGroups(nextGroups.map((group, groupIndex) => {
            if (groupIndex !== index || !group.question_class_id) {
                return group;
            }

            return {
                ...group,
                questions_by_class: {
                    ...(group.questions_by_class ?? {}),
                    [group.question_class_id]: group.questions,
                },
            };
        }));
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

        const payload = {
            ...data,
            class_groups: data.class_groups.map(({ questions_by_class, ...group }) => group),
        };

        request(url, payload, {
            onSuccess: () => {
                setConfirmSave(false);
                setSlideOpen(false);
                reset();
                setEditing(null);
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
        if (!questionnaireRequiredFieldsComplete) return;
        if (editing && !isDirty) return;
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
    const selectedQuestionClassIds = useMemo(
        () => data.class_groups
            .map((group) => String(group.question_class_id ?? ''))
            .filter(Boolean),
        [data.class_groups],
    );
    const selectedCommentQuestions = commentQuestions.filter((question) => data.comments.includes(question.id));

    const printViewingAsPdf = () => {
        if (!viewing) return;

        const printWindow = window.open('', '_blank', 'width=900,height=700');

        if (!printWindow) {
            window.print();
            return;
        }

        printWindow.document.open();
        printWindow.document.write(buildQuestionnairePrintHtml(viewing, questions));
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <AdminLayout title="Questionnaires" activeRoute="admin.questionnaires" breadcrumbs={['Question Bank']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Questionnaires</h2>
                    <p className="text-sm text-slate-500">Build reusable questionnaires with a code, type, choice set, and linked question items.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Questionnaire</button>
            </div>

            <QuestionnaireCards
                data={questionnaires}
                filters={filters}
                onView={openView}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
            />

            <Modal show={detailOpen} maxWidth="5xl" onClose={() => setDetailOpen(false)}>
                {viewing && (
                    <div className="max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 z-10 flex justify-end gap-2 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
                                <button
                                    type="button"
                                    onClick={printViewingAsPdf}
                                    className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                                >
                                    <Printer className="h-4 w-4" aria-hidden="true" />
                                    Print as PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetailOpen(false)}
                                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    aria-label="Close questionnaire preview"
                                >
                                    Close
                                </button>
                        </div>

                        <QuestionnaireFormPreview questionnaire={viewing} questions={questions} />
                    </div>
                )}
            </Modal>

            <Modal show={slideOpen} maxWidth="5xl" closeable={!questionnairePreviewOpen && !confirmSave} onClose={() => {
                if (!questionnairePreviewOpen && !confirmSave) {
                    closeQuestionnaireForm();
                }
            }}>
                <form onSubmit={submit} className="max-h-[85vh] overflow-y-auto p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{editing ? 'Edit Questionnaire' : 'New Questionnaire'}</h3>
                            <p className="mt-1 text-sm text-slate-500">Set the title, type, choice set, question classes, and comments.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setQuestionnairePreviewOpen(true)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Preview
                            </button>
                            <button
                                type="button"
                                onClick={() => closeQuestionnaireForm()}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close questionnaire form"
                            >
                                <span className="block text-xl leading-none">&times;</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {(submitError || Object.keys(errors).length > 0) && (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {submitError || 'Please review the highlighted fields and try again.'}
                            </div>
                        )}

                    <FormField label="Questionnaire Title" error={questionnaireTitleError} required>
                        <TextInput
                            value={data.questionnaire_title}
                            onChange={(e) => {
                                setData('questionnaire_title', e.target.value);
                                clearErrors('questionnaire_title');
                            }}
                            placeholder="Teacher Evaluation Form"
                        />
                    </FormField>

                    <FormField label="Branch" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => setData('branch_id', e.target.value)}>
                            <option value="">Select branch...</option>
                            {branches.map((branch) => (
                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                        </SelectInput>
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
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

                    <section className="space-y-3">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Question Items</h3>
                            <p className="mt-1 text-sm text-slate-500">Group questions by class and assign weights without going over 100% total.</p>
                        </div>

                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            Remaining Weight: <span className="font-semibold text-slate-900">{remainingWeight}%</span>
                        </div>

                        <div className="divide-y divide-slate-200">
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
                                const selectedQuestions = questions.filter((question) => group.questions.includes(question.id));

                                return (
                                    <div key={index} className="py-3 first:pt-0 last:pb-0">
                                        <div className="mb-3 flex items-center justify-between">
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

                                        <div className="grid grid-cols-2 gap-3">
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

                                        <div className="my-3 grid gap-4 lg:grid-cols-2 lg:items-start">
                                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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

                                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Questions</p>
                                                {selectedQuestions.length > 0 ? (
                                                    <div className="space-y-2">
                                                        {selectedQuestions.map((question) => (
                                                            <div key={question.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-medium text-slate-900">{question.code}</p>
                                                                    <p className="mt-0.5 text-xs text-slate-600">{question.description}</p>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleClassGroupQuestion(index, question.id)}
                                                                    className="shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-500">No questions selected yet.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={addQuestionClassGroup}
                                disabled={remainingWeight === 0 || selectedQuestionClassIds.length >= questionClasses.length}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Add Question Class
                            </button>
                        </div>
                    </section>

                    <div className="rounded-xl border border-slate-200 p-3">
                        <div className="mb-2">
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

                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => closeQuestionnaireForm({ resetDraft: true })} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} disabled={!questionnaireRequiredFieldsComplete || (Boolean(editing) && !isDirty)} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                    </div>
                </form>

                <ConfirmDialog
                    open={confirmSave}
                    title={editing ? 'Update Questionnaire?' : 'Create Questionnaire?'}
                    message={editing
                        ? `Are you sure you want to update the questionnaire "${data.questionnaire_title}"?`
                        : `Are you sure you want to create the new questionnaire "${data.questionnaire_title}"?`}
                    confirmLabel={editing ? 'Update' : 'Create'}
                    danger={false}
                    onConfirm={handleSaveConfirm}
                    onCancel={() => setConfirmSave(false)}
                />
            </Modal>

            <Modal show={questionnairePreviewOpen} maxWidth="5xl" onClose={() => setQuestionnairePreviewOpen(false)}>
                <div className="max-h-[80vh] overflow-y-auto p-5">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">{data.questionnaire_title || 'Questionnaire Preview'}</h3>
                            <p className="mt-1 text-sm text-slate-500">Preview of the questionnaire form layout.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setQuestionnairePreviewOpen(false)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            aria-label="Close questionnaire preview"
                        >
                            <span className="block text-xl leading-none">&times;</span>
                        </button>
                    </div>

                    <div className="space-y-5">
                        <div className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p>
                                <p className="mt-1 text-sm text-slate-900">
                                    {branches.find((branch) => String(branch.id) === String(data.branch_id))?.name || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questionnaire Type</p>
                                <p className="mt-1 text-sm text-slate-900">
                                    {questionnaireTypes.find((type) => String(type.id) === String(data.questionnaire_type_id))?.name || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choice Set</p>
                                <p className="mt-1 text-sm text-slate-900">
                                    {questionChoices.find((choice) => String(choice.id) === String(data.question_choices_id))?.code || '-'}
                                </p>
                            </div>
                        </div>

                        {data.class_groups.map((group, groupIndex) => {
                            const selectedQuestions = questions.filter((question) => group.questions.includes(question.id));

                            return (
                                <section key={groupIndex} className="rounded-xl border border-slate-200 p-4">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">
                                                {group.question_class_name || `Question Class ${groupIndex + 1}`}
                                            </h4>
                                            <p className="mt-0.5 text-sm text-slate-500">Weight: {group.weight || 0}%</p>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                            {selectedQuestions.length} questions
                                        </span>
                                    </div>

                                    {selectedQuestions.length > 0 ? (
                                        <div className="space-y-3">
                                            {selectedQuestions.map((question, questionIndex) => (
                                                <div key={question.id} className="rounded-lg bg-slate-50 px-3 py-2">
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {questionIndex + 1}. {question.description}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">{question.code}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No questions selected for this class.</p>
                                    )}
                                </section>
                            );
                        })}

                        <section className="rounded-xl border border-slate-200 p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h4 className="text-sm font-semibold text-slate-900">Comments</h4>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                    {selectedCommentQuestions.length} questions
                                </span>
                            </div>

                            {selectedCommentQuestions.length > 0 ? (
                                <div className="space-y-3">
                                    {selectedCommentQuestions.map((question, questionIndex) => (
                                        <div key={question.id} className="rounded-lg bg-slate-50 px-3 py-2">
                                            <p className="text-sm font-medium text-slate-900">
                                                {questionIndex + 1}. {question.description}
                                            </p>
                                            <p className="mt-1 text-xs text-slate-500">{question.code}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No comment questions selected.</p>
                            )}
                        </section>

                        <div className="rounded-xl border border-slate-200 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{data.notes || '-'}</p>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setQuestionnairePreviewOpen(false)}
                            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

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
