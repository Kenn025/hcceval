import ConfirmDialog from '@/Components/ConfirmDialog';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const formatDate = (value) => {
    if (!value) return '-';

    return new Date(value).toLocaleString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

export default function EvaluationCommentsReview({ comments = [], filters = {}, scope = {}, stats = {} }) {
    const [confirmAction, setConfirmAction] = useState(null);
    const title = scope.rating_type === 'peer' ? 'Peer Evaluation Comments' : 'Subject Evaluation Comments';
    const visibleComments = useMemo(() => comments, [comments]);
    const isProgramReviewed = visibleComments.length > 0 && visibleComments.every((comment) => comment.is_reviewed);

    const markProgramReviewed = () => {
        router.post(route('admin.ratings.comments-review.program-reviewed'), filters, {
            preserveScroll: true,
        });
    };

    const toggleHidden = (comment) => {
        router.post(route('admin.ratings.comments-review.hidden', comment.id), {}, {
            preserveScroll: true,
        });
    };

    const askProgramReview = () => setConfirmAction({
        title: 'Mark program reviewed?',
        message: `This marks all ${visibleComments.length} submitted comment${visibleComments.length === 1 ? '' : 's'} in this selected program scope as reviewed.`,
        confirm: 'Mark Program Reviewed',
        tone: 'success',
        run: () => markProgramReviewed(),
    });

    const askHide = (comment) => setConfirmAction({
        title: comment.is_hidden ? 'Restore comment?' : 'Hide comment?',
        message: comment.is_hidden
            ? 'This will allow the comment to appear anywhere reviewed comments are shown.'
            : 'This hides the comment from teacher-facing rating views.',
        confirm: comment.is_hidden ? 'Restore Comment' : 'Hide Comment',
        tone: comment.is_hidden ? 'primary' : 'warning',
        run: () => toggleHidden(comment),
    });

    const handleConfirm = () => {
        confirmAction?.run?.();
        setConfirmAction(null);
    };

    return (
        <AdminLayout title={title} activeRoute={filters.rating_type === 'peer' ? 'admin.peer-ratings' : 'admin.subject-ratings'} breadcrumbs={['Ratings & Reports']}>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Comment Review</p>
                    <h2 className="mt-1 text-base font-semibold text-slate-900">{title}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        {[scope.teacher_name, scope.subject_name, scope.program_name ?? scope.strand_name, scope.department_name, scope.school_year].filter(Boolean).join(' - ') || 'Submitted evaluation comments'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => router.visit(route(filters.rating_type === 'peer' ? 'admin.peer-ratings' : 'admin.subject-ratings'))}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                    Back to Ratings
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div>
                    <p className="text-sm font-semibold text-slate-900">Program Review Status</p>
                    <p className="mt-1 text-xs text-slate-500">
                        {isProgramReviewed ? 'All comments in this selected scope are reviewed.' : 'Mark this selected program scope reviewed after checking the submitted comments.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={askProgramReview}
                    disabled={!visibleComments.length || isProgramReviewed}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    {isProgramReviewed ? 'Program Reviewed' : 'Reviewed Program'}
                </button>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{stats.total ?? visibleComments.length}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Reviewed</p>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">{stats.reviewed ?? 0}</p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Hidden</p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">{stats.hidden ?? 0}</p>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="hidden grid-cols-[72px_1.2fr_1fr_1.8fr_0.8fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                    <span>#</span>
                    <span>Teacher</span>
                    <span>Scope</span>
                    <span>Comment</span>
                    <span>Status</span>
                    <span className="text-right">Actions</span>
                </div>

                <div className="divide-y divide-slate-100">
                    {visibleComments.length === 0 && (
                        <div className="px-4 py-10 text-center text-sm text-slate-500">
                            No submitted comments found for this scope.
                        </div>
                    )}
                    {visibleComments.map((comment, index) => (
                        <div key={comment.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[72px_1.2fr_1fr_1.8fr_0.8fr_1fr] lg:items-start">
                            <p className="text-sm font-medium text-slate-500">{index + 1}</p>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{comment.teacher_name || '-'}</p>
                                <p className="mt-1 text-xs text-slate-500">{formatDate(comment.submitted_at ?? comment.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-800">{comment.subject_name || comment.program_name || comment.strand_name || '-'}</p>
                                <p className="mt-1 text-xs text-slate-500">{comment.school_year || '-'}</p>
                            </div>
                            <p className={`text-sm leading-6 ${comment.is_hidden ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {comment.comment_text}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${comment.is_reviewed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                                    {comment.is_reviewed ? 'Reviewed' : 'Pending'}
                                </span>
                                {comment.is_hidden && (
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                        Hidden
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                                <button
                                    type="button"
                                    onClick={() => askHide(comment)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${comment.is_hidden ? 'border-blue-200 bg-white text-blue-700 hover:bg-blue-50' : 'border-amber-200 bg-white text-amber-700 hover:bg-amber-50'}`}
                                >
                                    {comment.is_hidden ? 'Restore' : 'Hide'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ConfirmDialog
                open={Boolean(confirmAction)}
                title={confirmAction?.title}
                message={confirmAction?.message}
                confirmLabel={confirmAction?.confirm}
                tone={confirmAction?.tone ?? 'primary'}
                onConfirm={handleConfirm}
                onCancel={() => setConfirmAction(null)}
            />
        </AdminLayout>
    );
}
