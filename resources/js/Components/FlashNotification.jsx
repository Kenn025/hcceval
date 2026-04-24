import AppIcon from '@/Components/AppIcon';
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

export default function FlashNotification() {
    const { flash = {} } = usePage().props;
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (flash.success) {
            setNotification({ type: 'success', message: flash.success });
        } else if (flash.error) {
            setNotification({ type: 'error', message: flash.error });
        }
    }, [flash.error, flash.success]);

    useEffect(() => {
        if (!notification) {
            return undefined;
        }

        const timeoutId = window.setTimeout(() => {
            setNotification(null);
        }, 3500);

        return () => window.clearTimeout(timeoutId);
    }, [notification]);

    if (!notification) {
        return null;
    }

    const isSuccess = notification.type === 'success';

    return (
        <div className="pointer-events-none fixed right-4 top-0 z-[60] sm:right-6">
            <div
                className={[
                    'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur',
                    isSuccess
                        ? 'border-emerald-200 bg-white/95 text-emerald-900'
                        : 'border-rose-200 bg-white/95 text-rose-900',
                ].join(' ')}
                role="alert"
                aria-live="polite"
            >
                <div className={['mt-0.5 rounded-full p-1', isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'].join(' ')}>
                    <AppIcon name={isSuccess ? 'check-circle' : 'close'} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{isSuccess ? 'Success' : 'Error'}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                </div>
                <button
                    type="button"
                    onClick={() => setNotification(null)}
                    className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Close notification"
                >
                    <AppIcon name="close" className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
