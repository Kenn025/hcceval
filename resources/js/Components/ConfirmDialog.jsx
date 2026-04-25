import { useEffect } from 'react';

const TONES = {
    primary: {
        iconBg: 'bg-blue-100 text-blue-600',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/40',
    },
    danger: {
        iconBg: 'bg-rose-100 text-rose-600',
        confirmBtn: 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500/40',
    },
    warning: {
        iconBg: 'bg-amber-100 text-amber-600',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/40',
    },
    success: {
        iconBg: 'bg-emerald-100 text-emerald-600',
        confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/40',
    },
};

const ICONS = {
    primary: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
        </svg>
    ),
    danger: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
        </svg>
    ),
    warning: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <path d="M12 9v4M12 17h.01" />
        </svg>
    ),
    success: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
};

export default function ConfirmDialog({
    open,
    title = 'Confirm action',
    message = 'Are you sure you want to proceed?',
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'primary',
    loading = false,
    onConfirm,
    onCancel,
}) {
    const palette = TONES[tone] ?? TONES.primary;
    const icon    = ICONS[tone] ?? ICONS.primary;

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !loading) onCancel?.();
            if (e.key === 'Enter'  && !loading) onConfirm?.();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, loading, onConfirm, onCancel]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => { if (!loading) onCancel?.(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 fade-in slide-in-from-bottom-2 duration-200"
            >
                <div className="px-6 pt-6 pb-4">
                    <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${palette.iconBg}`}>
                        {icon}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{message}</p>
                </div>
                <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 disabled:opacity-60 ${palette.confirmBtn}`}
                    >
                        {loading ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
