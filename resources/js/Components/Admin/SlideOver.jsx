import { useEffect } from 'react';

export default function SlideOver({ open, onClose, title, children, width = 'max-w-md' }) {
    useEffect(() => {
        if (!open) return;
        const close = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', close);
        return () => window.removeEventListener('keydown', close);
    }, [open, onClose]);

    return (
        <>
            <div
                className={[
                    'fixed inset-0 z-40 bg-slate-950/40 transition-opacity duration-200',
                    open ? 'opacity-100' : 'pointer-events-none opacity-0',
                ].join(' ')}
                onClick={onClose}
            />
            <div
                className={[
                    'fixed inset-y-0 right-0 z-50 flex flex-col bg-white shadow-2xl transition-transform duration-300',
                    width,
                    'w-full',
                    open ? 'translate-x-0' : 'translate-x-full',
                ].join(' ')}
            >
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <h2 className="text-base font-semibold text-slate-900">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">{children}</div>
            </div>
        </>
    );
}
