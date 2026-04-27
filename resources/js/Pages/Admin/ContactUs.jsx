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

function StatusBadge({ value }) {
    const status = String(value ?? "new").toLowerCase();
    const map = {
        new: "bg-blue-100 text-blue-800",
        read: "bg-indigo-100 text-indigo-800",
        resolved: "bg-emerald-100 text-emerald-800",
    };

    return (
        <span
            className={[
                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                map[status] ?? map.new,
            ].join(" ")}
        >
            {status}
        </span>
    );
}

export default function ContactUs({ messages, filters, tableMissing = false }) {
    const [busyId, setBusyId] = useState(null);
    const [expandedMessage, setExpandedMessage] = useState(null);
    const currentView = filters?.view === "resolved" ? "resolved" : "open";
    const isResolvedView = currentView === "resolved";
    const previewLength = 120;

    useEffect(() => {
        const refreshMessages = () => {
            router.reload({
                only: ["messages"],
                preserveState: true,
                preserveScroll: true,
            });
        };

        const intervalId = setInterval(refreshMessages, 8000);
        const handleFocus = () => refreshMessages();
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") refreshMessages();
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

    const toggleResolvedView = () => {
        router.get(
            route("admin.contact-us"),
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

    const markRead = (messageId) => {
        if (!messageId || busyId !== null) return;

        setBusyId(messageId);
        router.put(
            route("admin.contact-us.read", { contactMessage: messageId }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusyId(null),
            },
        );
    };

    const resolveMessage = (messageId) => {
        if (!messageId || busyId !== null) return;

        setBusyId(messageId);
        router.put(
            route("admin.contact-us.resolve", { contactMessage: messageId }),
            {},
            {
                preserveScroll: true,
                onFinish: () => setBusyId(null),
            },
        );
    };

    const columns = [
        {
            key: "created_at",
            label: "Received",
            render: (row) => formatDateTime(row.created_at),
        },
        {
            key: "name",
            label: "Sender",
            render: (row) => (
                <div>
                    <p className="font-semibold text-slate-900">
                        {row.name || "Unknown"}
                    </p>
                    <p className="text-xs text-slate-500">
                        {row.email || "-"}
                    </p>
                </div>
            ),
        },
        {
            key: "subject",
            label: "Subject",
            render: (row) => row.subject || "No subject",
        },
        {
            key: "message",
            label: "Message",
            render: (row) => {
                const message = row.message || "-";
                const shouldUsePreview =
                    message !== "-" && message.length > previewLength;
                const preview = shouldUsePreview
                    ? `${message.slice(0, previewLength)}...`
                    : message;

                return (
                    <div className="flex max-w-[420px] items-center gap-2">
                        <p className="min-w-0 flex-1 truncate" title={message}>
                            {preview}
                        </p>
                        {message !== "-" && (
                            <button
                                type="button"
                                onClick={() => setExpandedMessage(message)}
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                aria-label="Expand message"
                                title="Expand message"
                            >
                                <Maximize2 className="h-4 w-4 shrink-0" />
                            </button>
                        )}
                    </div>
                );
            },
        },
        {
            key: "status",
            label: "Status",
            render: (row) => <StatusBadge value={row.status} />,
        },
    ];

    return (
        <AdminLayout
            title="Contact Us"
            activeRoute="admin.contact-us"
            breadcrumbs={["System Controls"]}
        >
            {tableMissing && (
                <p className="mb-4 text-sm font-medium text-rose-600">
                    Contact messages table is missing. Run migrations to enable
                    contact message collection.
                </p>
            )}

            <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-900">
                    {isResolvedView ? "Resolved Messages" : "Open Messages"}
                </h3>
                <p className="text-xs text-slate-500">
                    {isResolvedView
                        ? "Completed contact messages kept for review history."
                        : "New and read contact messages from the landing page."}
                </p>
            </div>

            <ResourceTable
                columns={columns}
                data={messages}
                filters={filters}
                routeName="admin.contact-us"
                showPageIndicator={false}
                searchPlaceholder="Search sender, email, subject, message..."
                extraHeaderActions={
                    <button
                        type="button"
                        onClick={toggleResolvedView}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        {isResolvedView ? "Hide Resolved" : "Show Resolved"}
                    </button>
                }
                rowActions={
                    isResolvedView
                        ? undefined
                        : (row) => (
                              <>
                                  {row.status === "new" && (
                                      <button
                                          type="button"
                                          onClick={() => markRead(row.id)}
                                          disabled={busyId !== null}
                                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                                      >
                                          {busyId === row.id
                                              ? "Saving..."
                                              : "Read"}
                                      </button>
                                  )}
                                  <button
                                      type="button"
                                      onClick={() => resolveMessage(row.id)}
                                      disabled={busyId !== null}
                                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                                  >
                                      {busyId === row.id
                                          ? "Resolving..."
                                          : "Resolve"}
                                  </button>
                              </>
                          )
                }
            />

            {expandedMessage !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h4 className="text-lg font-semibold text-slate-900">
                                Contact Message
                            </h4>
                            <button
                                type="button"
                                onClick={() => setExpandedMessage(null)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                                {expandedMessage}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
