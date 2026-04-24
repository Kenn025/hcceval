import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const IDLE_MINUTES  = 25;
const WARN_SECONDS  = 60;

export default function SessionTimeoutWarning({ logoutRoute = 'logout' }) {
    const [secondsLeft, setSecondsLeft] = useState(null);
    const timerRef    = useRef(null);
    const countdownRef = useRef(null);

    const reset = () => {
        setSecondsLeft(null);
        clearTimeout(timerRef.current);
        clearInterval(countdownRef.current);
        timerRef.current = setTimeout(() => {
            setSecondsLeft(WARN_SECONDS);
            countdownRef.current = setInterval(() => {
                setSecondsLeft((s) => {
                    if (s === null) return null;
                    if (s <= 1) {
                        clearInterval(countdownRef.current);
                        try { router.post(route(logoutRoute)); } catch { window.location.href = '/'; }
                        return 0;
                    }
                    return s - 1;
                });
            }, 1000);
        }, IDLE_MINUTES * 60 * 1000);
    };

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach((e) => window.addEventListener(e, reset));
        reset();
        return () => {
            events.forEach((e) => window.removeEventListener(e, reset));
            clearTimeout(timerRef.current);
            clearInterval(countdownRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (secondsLeft === null) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
                <h3 className="text-base font-bold text-slate-900">Session expiring</h3>
                <p className="mt-2 text-sm text-slate-500">
                    You've been idle for a while. You'll be signed out in <strong className="text-rose-600">{secondsLeft}s</strong>.
                </p>
                <div className="mt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={reset}
                        className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                        Stay signed in
                    </button>
                    <button
                        type="button"
                        onClick={() => router.post(route(logoutRoute))}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    );
}
