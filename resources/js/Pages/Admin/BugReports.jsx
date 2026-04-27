import ResourceTable from "@/Components/Admin/ResourceTable";
import AdminLayout from "@/Layouts/AdminLayout";
import { router } from "@inertiajs/react";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";

function formatDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
}

function SeverityBadge({ value }) {
    const severity = String(value ?? "medium").toLowerCase();
    const map = {
        low: "bg-slate-100 text-slate-700",
        medium: "bg-amber-100 text-amber-800",
        high: "bg-orange-100 text-orange-800",
        critical: "bg-rose-100 text-rose-800",
    };

    return (
        <span
            className={[
                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                map[severity] ?? map.medium,
            ].join(" ")}
        >
            {severity}
        </span>
    );
}

function StatusBadge({ value }) {
    const status = String(value ?? "new").toLowerCase();
    const map = {
        new: "bg-blue-100 text-blue-800",
        in_progress: "bg-indigo-100 text-indigo-800",
        resolved: "bg-emerald-100 text-emerald-800",
    };

    return (
        <span
            className={[
                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                map[status] ?? map.new,
            ].join(" ")}
        >
            {status.replace("_", " ")}
        </span>
    );
}

const BASE_COLUMNS = [
    {
        key: "created_at",
        label: "Reported",
        render: (row) => formatDateTime(row.created_at),
    },
    {
        key: "reporter_name",
        label: "Reporter",
        render: (row) => (
            <div>
                <p className="font-semibold text-slate-900">
                    {row.reporter_name || "Unknown"}
                </p>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                    {row.reporter_type || "unknown"} #{row.reporter_id ?? 0}
                </p>
            </div>
        ),
    },
    { key: "subject", label: "Subject" },
    {
        key: "severity",
        label: "Severity",
        render: (row) => <SeverityBadge value={row.severity} />,
    },
    {
        key: "status",
        label: "Status",
        render: (row) => <StatusBadge value={row.status} />,
    },
];

export default function BugReports({ reports, filters, tableMissing = false }) {
    const [resolvingId, setResolvingId] = useState(null);
    const [expandedDescription, setExpandedDescription] = useState(null);
    const severity = filters?.severity ?? "all";
    const currentView = filters?.view === "resolved" ? "resolved" : "open";
    const isResolvedView = currentView === "resolved";
    const descriptionPreviewLength = 120;

    useEffect(() => {
        const refreshReports = () => {
            router.reload({
                only: ["reports"],
                preserveState: true,
                preserveScroll: true,
            });
        };

        const intervalId = setInterval(refreshReports, 8000);

        const handleFocus = () => refreshReports();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                refreshReports();
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
        };
    }, []);

    const columns = [
        ...BASE_COLUMNS.slice(0, 3),
        {
            key: "description",
            label: "Description",
            render: (row) => {
                const description = row.description || "-";
                const hasDescription = description !== "-";
                const shouldUsePreview =
                    hasDescription &&
                    description.length > descriptionPreviewLength;
                const preview = shouldUsePreview
                    ? `${description.slice(0, descriptionPreviewLength)}...`
                    : description;

                return (
                    <div className="flex max-w-[420px] items-center gap-2">
                        <p
                            className="min-w-0 flex-1 truncate"
                            title={description}
                        >
                            {preview}
                        </p>
                        {hasDescription && (
                            <button
                                type="button"
                                onClick={() =>
                                    setExpandedDescription(description)
                                }
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                aria-label="Expand description"
                                title="Expand description"
                            >
                                <Maximize2 className="h-4 w-4 shrink-0" />
                            </button>
                        )}
                    </div>
                );
            },
        },
        ...BASE_COLUMNS.slice(3),
    ];

    const applySeverityFilter = (nextSeverity) => {
        router.get(
            route("admin.bug-reports"),
            {
                ...filters,
                severity: nextSeverity,
                page: 1,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const toggleResolvedView = () => {
        router.get(
            route("admin.bug-reports"),
            {
                ...filters,
                view: isResolvedView ? "open" : "resolved",
                page: 1,
            },
            {
                preserveState: true,
                replace: true,
                preserveScroll: true,
            },
        );
    };

    const resolveReport = (reportId) => {
        if (!reportId || resolvingId !== null) return;

        setResolvingId(reportId);
        router.put(
            route("admin.bug-reports.resolve", { bugReport: reportId }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setResolvingId(null),
            },
        );
    };

    const severityFilterControl = (
        <div className="flex items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-tight text-slate-500">
                Severity
            </label>
            <select
                value={severity}
                onChange={(event) => applySeverityFilter(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
                <option value="all">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
            </select>
        </div>
    );

    const resolvedToggleControl = (
        <button
            type="button"
            onClick={toggleResolvedView}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
            {isResolvedView ? "Hide Resolved" : "Show Resolved"}
        </button>
    );

    return (
        <AdminLayout
            title="Bug Reports"
            activeRoute="admin.bug-reports"
            breadcrumbs={["System Controls"]}
        >
            {tableMissing && (
                <p className="mb-4 text-sm font-medium text-rose-600">
                    Bug reports table is missing. Run migrations to enable
                    report collection.
                </p>
            )}

            <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                    {isResolvedView ? "Resolved Reports" : "Open Reports"}
                </h3>
                <p className="text-xs text-slate-500">
                    {isResolvedView
                        ? "Completed reports separated for review history."
                        : "Active reports waiting for triage or resolution."}
                </p>
            </div>

            <ResourceTable
                columns={columns}
                data={reports}
                filters={filters}
                routeName="admin.bug-reports"
                showPageIndicator={false}
                searchPlaceholder="Search subject, description, reporter, severity..."
                extraHeaderActions={
                    <div className="flex items-center gap-2">
                        {severityFilterControl}
                        {resolvedToggleControl}
                    </div>
                }
                rowActions={
                    isResolvedView
                        ? undefined
                        : (row) => (
                              <button
                                  type="button"
                                  onClick={() => resolveReport(row.id)}
                                  disabled={resolvingId !== null}
                                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                              >
                                  {resolvingId === row.id
                                      ? "Resolving..."
                                      : "Resolve"}
                              </button>
                          )
                }
            />

            {expandedDescription !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h4 className="text-lg font-semibold text-slate-900">
                                Bug Description
                            </h4>
                            <button
                                type="button"
                                onClick={() => setExpandedDescription(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                                {expandedDescription}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
