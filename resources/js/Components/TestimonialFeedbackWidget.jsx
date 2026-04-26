import { useEffect, useMemo, useState } from "react";

function getCsrfToken() {
    if (typeof document === "undefined") return "";
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute("content") ?? ""
    );
}

function statusBadgeClass(status) {
    const value = String(status ?? "").toLowerCase();
    if (value.includes("approved")) {
        return "bg-blue-50 text-blue-700 ring-blue-200";
    }
    if (value.includes("rejected")) {
        return "bg-rose-50 text-rose-700 ring-rose-200";
    }
    return "bg-cyan-50 text-cyan-700 ring-cyan-200";
}

export default function TestimonialFeedbackWidget({
    visible = true,
    storeUrl,
    historyUrl,
    title = "Insight Hub",
    subtitle = "Send a quick experience note from your dashboard.",
}) {
    const [open, setOpen] = useState(false);
    const [feedback, setFeedback] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [items, setItems] = useState([]);

    const remaining = useMemo(() => 1000 - feedback.length, [feedback.length]);

    useEffect(() => {
        if (!open || !historyUrl) return;

        const loadHistory = async () => {
            try {
                const response = await fetch(historyUrl, {
                    credentials: "same-origin",
                    headers: { Accept: "application/json" },
                });
                if (!response.ok) return;
                const data = await response.json();
                setItems(Array.isArray(data?.items) ? data.items : []);
            } catch {
                // Ignore history errors to keep widget non-blocking.
            }
        };

        loadHistory();
    }, [open, historyUrl]);

    if (!visible || !storeUrl || !historyUrl) {
        return null;
    }

    const submit = async (event) => {
        event.preventDefault();

        const message = feedback.trim();
        if (message === "") {
            setError("Feedback is required.");
            return;
        }
        if (message.length > 1000) {
            setError("Feedback must not exceed 1000 characters.");
            return;
        }

        setSubmitting(true);
        setError("");

        try {
            const response = await fetch(storeUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": getCsrfToken(),
                },
                body: JSON.stringify({ feedback: message }),
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                const firstError =
                    payload?.errors && typeof payload.errors === "object"
                        ? Object.values(payload.errors)?.[0]?.[0]
                        : null;
                setError(
                    String(
                        firstError ||
                            payload?.message ||
                            "Unable to submit feedback right now.",
                    ),
                );
                return;
            }

            setFeedback("");
            if (payload?.item) {
                setItems((prev) => [payload.item, ...prev].slice(0, 5));
            }
        } catch {
            setError("Unable to submit feedback right now.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-[0_16px_35px_-12px_rgba(37,99,235,0.7)] transition hover:scale-105 hover:shadow-[0_20px_38px_-12px_rgba(8,145,178,0.75)]"
                aria-label="Open testimonial feedback form"
            >
                <svg
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.92-.38-4.15-1.05L3 20l1.05-5.35A8.46 8.46 0 0 1 3.5 11.5 8.5 8.5 0 1 1 21 11.5Z" />
                </svg>
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900">
                                    {title}
                                </h3>
                                <p className="text-sm text-slate-500">
                                    {subtitle}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close feedback modal"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={submit} className="space-y-5 p-5">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">
                                    Your Message
                                </label>
                                <textarea
                                    value={feedback}
                                    onChange={(event) =>
                                        setFeedback(event.target.value.slice(0, 1000))
                                    }
                                    rows={5}
                                    placeholder="Share your experience or suggestion..."
                                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <div className="mt-2 flex items-center justify-between">
                                    <p className="text-xs text-slate-500">
                                        {remaining}/1000 remaining
                                    </p>
                                    {error && (
                                        <p className="text-xs font-medium text-rose-600">
                                            {error}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:from-blue-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-4 w-4"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="m22 2-7 20-4-9-9-4Z" />
                                        <path d="M22 2 11 13" />
                                    </svg>
                                    {submitting ? "Sending..." : "Send Insight"}
                                </button>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                                <h4 className="mb-2 text-base font-semibold text-slate-900">
                                    Recent Submissions
                                </h4>
                                <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                                    {items.length === 0 && (
                                        <p className="text-sm text-slate-500">
                                            No submissions yet.
                                        </p>
                                    )}
                                    {items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="rounded-lg border border-slate-200 bg-white p-3"
                                        >
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusBadgeClass(item.status)}`}
                                                >
                                                    {item.status}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {item.created_at || "-"}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700">
                                                {item.feedback}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
