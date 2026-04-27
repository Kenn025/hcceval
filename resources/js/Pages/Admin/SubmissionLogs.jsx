import ResourceTable from "@/Components/Admin/ResourceTable";
import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { useState } from "react";

const TYPE_OPTIONS = [
    { value: "", label: "All Types" },
    { value: "subject", label: "Subject Evaluation" },
    { value: "peer", label: "Peer Evaluation" },
    { value: "head", label: "School Heads Evaluation" },
    { value: "employee", label: "Employee Evaluation" },
];

function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
}

function RatingBadge({ value }) {
    const numericValue = Number(value);
    const hasRating =
        value !== null &&
        value !== undefined &&
        value !== "-" &&
        value !== "" &&
        !Number.isNaN(numericValue);

    return (
        <span>
            {hasRating ? numericValue.toFixed(2) : "-"}
        </span>
    );
}

function SubmissionDetailModal({ submission, onClose }) {
    if (!submission) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="portal-modal flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                                {submission.type}
                            </p>
                            <h3 className="mt-1 text-xl font-black text-slate-900">
                                {submission.target}
                            </h3>
                            <p className="mt-1 text-sm font-medium text-slate-600">
                                {submission.questionnaire}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Close
                        </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 font-medium text-blue-700 ring-1 ring-blue-200">
                            Submitted {formatDateTime(submission.submitted_at)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700 ring-1 ring-slate-200">
                            {submission.branch}
                        </span>
                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 ring-1 ring-indigo-200">
                            {submission.academic_year} {submission.term}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 ring-1 ring-emerald-200">
                            Rating {submission.overall_average}
                        </span>
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {submission.answers?.length ? (
                        <div className="overflow-hidden rounded-lg border border-slate-200 shadow-sm">
                            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                                <thead className="bg-slate-50">
                                    <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                        <th className="w-14 px-3 py-2">#</th>
                                        <th className="px-3 py-2">Question</th>
                                        <th className="w-24 px-3 py-2 text-center">Rating</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {submission.answers.map((answer, index) => (
                                        <tr key={`${answer.question_id ?? "q"}-${index}`}>
                                            <td className="px-3 py-3 text-slate-500">
                                                {index + 1}
                                            </td>
                                            <td className="px-3 py-3 font-medium leading-6 text-slate-800">
                                                {answer.question_text ?? `Question #${answer.question_id ?? index + 1}`}
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <RatingBadge value={answer.rating} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                            No answer details were saved with this submission.
                        </div>
                    )}

                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Comments
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                            {submission.comments || "No comment provided."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SubmissionLogs({
    logs,
    filters,
    tableMissing = false,
}) {
    const [selected, setSelected] = useState(null);

    const updateType = (type) => {
        router.get(
            route("admin.submission-logs"),
            { ...filters, type, page: 1 },
            { preserveState: true, replace: true },
        );
    };

    const columns = [
        {
            key: "submitted_at",
            label: "Submitted",
            render: (row) => formatDateTime(row.submitted_at),
        },
        {
            key: "type",
            label: "Type",
            render: (row) => row.type ?? "-",
        },
        {
            key: "target",
            label: "Evaluation Target",
            render: (row) => (
                <div className="max-w-md">
                    <p className="truncate font-semibold text-slate-900">
                        {row.target}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                        {row.questionnaire}
                    </p>
                </div>
            ),
        },
        { key: "branch", label: "Branch" },
        {
            key: "period",
            label: "Period",
            render: (row) => `${row.academic_year} ${row.term}`,
        },
        {
            key: "overall_average",
            label: "Rating",
            render: (row) => <RatingBadge value={row.overall_average} />,
        },
        {
            key: "answer_count",
            label: "Items",
            render: (row) => row.answer_count ?? 0,
        },
    ];

    return (
        <AdminLayout
            title="Submission Logs"
            activeRoute="admin.submission-logs"
            breadcrumbs={["Ratings & Reports"]}
        >
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900">
                    Submission Logs
                </h2>
                <p className="text-sm text-slate-500">
                    Record of submitted evaluation forms across portal users.
                </p>
            </div>

            {tableMissing ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                    The evaluation submissions table is not available yet.
                </div>
            ) : (
                <ResourceTable
                    columns={columns}
                    data={logs}
                    filters={filters}
                    routeName="admin.submission-logs"
                    searchPlaceholder="Search type, target, questionnaire, branch..."
                    onRowClick={setSelected}
                    extraHeaderActions={
                        <select
                            value={filters?.type ?? ""}
                            onChange={(event) => updateType(event.target.value)}
                            className="rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    }
                />
            )}

            <SubmissionDetailModal
                submission={selected}
                onClose={() => setSelected(null)}
            />
        </AdminLayout>
    );
}
