export default function ConfirmDialog({ open, onConfirm, onCancel, title, message, confirmLabel = 'Delete', danger = true }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40" onClick={onCancel} />
            <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
                <div className="flex items-start gap-4">
                    {danger && (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
                            <svg className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="text-base font-semibold text-slate-900">{title}</p>
                        <p className="mt-1 text-sm text-slate-600">{message}</p>
                    </div>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={[
                            'rounded-lg px-4 py-2 text-sm font-medium text-white',
                            danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700',
                        ].join(' ')}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
