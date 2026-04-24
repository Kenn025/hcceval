import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

const POLL_MS = 60_000;

function timeAgo(iso) {
    if (!iso) return '';
    const d = new Date(iso.replace(' ', 'T'));
    const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 60)    return `${s}s ago`;
    if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationBell({ routePrefix = '' }) {
    const [open, setOpen]       = useState(false);
    const [items, setItems]     = useState([]);
    const [unread, setUnread]   = useState(0);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

    const url = (suffix) => `${routePrefix}${suffix}`;

    const fetchNotifications = async () => {
        try {
            const { data } = await axios.get(url('/notifications'));
            setItems(data.items ?? []);
            setUnread(data.unread ?? 0);
        } catch {
            // silent — bell just won't update
        }
    };

    useEffect(() => {
        fetchNotifications();
        const t = setInterval(fetchNotifications, POLL_MS);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next) await fetchNotifications();
    };

    const openItem = async (n) => {
        try {
            await axios.post(url(`/notifications/${n.id}/read`));
        } catch { /* ignore */ }
        if (n.action_url) {
            window.location.href = n.action_url;
        } else {
            fetchNotifications();
        }
    };

    const markAllRead = async () => {
        setLoading(true);
        try {
            await axios.post(url('/notifications/read-all'));
            await fetchNotifications();
        } finally {
            setLoading(false);
        }
    };

    const clearAll = async () => {
        if (!confirm('Clear all notifications?')) return;
        setLoading(true);
        try {
            await axios.delete(url('/notifications/clear'));
            await fetchNotifications();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={toggle}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                aria-label="Notifications"
            >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <div>
                            <p className="text-sm font-bold text-slate-800">Notifications</p>
                            <p className="text-xs text-slate-400">{unread} unread</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={markAllRead}
                                disabled={loading || unread === 0}
                                className="text-xs font-semibold text-blue-600 disabled:text-slate-300 hover:underline"
                            >
                                Mark all read
                            </button>
                            <button
                                type="button"
                                onClick={clearAll}
                                disabled={loading || items.length === 0}
                                className="text-xs font-semibold text-slate-500 disabled:text-slate-300 hover:underline"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto">
                        {items.length === 0 ? (
                            <div className="flex flex-col items-center py-12 text-slate-400">
                                <svg viewBox="0 0 24 24" className="h-10 w-10 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                <p className="mt-3 text-sm">You're all caught up.</p>
                            </div>
                        ) : (
                            items.map((n) => (
                                <button
                                    key={n.id}
                                    type="button"
                                    onClick={() => openItem(n)}
                                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50 ${n.read ? '' : 'bg-blue-50/40'}`}
                                >
                                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-blue-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate text-sm ${n.read ? 'text-slate-600' : 'font-semibold text-slate-900'}`}>{n.title}</p>
                                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.body}</p>
                                        <p className="mt-1 text-[10px] text-slate-400">{timeAgo(n.created_at)}</p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
