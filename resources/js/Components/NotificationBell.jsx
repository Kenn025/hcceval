import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from '@/Components/ConfirmDialog';

const CLOSED_POLL_MS = 15_000;
const OPEN_POLL_MS = 5_000;

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
    const [confirm, setConfirm] = useState(null);
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

        const pollMs = open ? OPEN_POLL_MS : CLOSED_POLL_MS;
        const t = setInterval(fetchNotifications, pollMs);

        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        const onFocus = () => fetchNotifications();
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchNotifications();
            }
        };

        window.addEventListener('focus', onFocus);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
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

    const askMarkAllRead = () => {
        if (unread === 0) return;
        setConfirm({
            title: 'Mark all notifications as read?',
            message: `This will mark all ${unread} unread notification${unread === 1 ? '' : 's'} as read.`,
            confirmLabel: 'Mark all read',
            tone: 'primary',
            run: async () => {
                setLoading(true);
                try {
                    await axios.post(url('/notifications/read-all'));
                    await fetchNotifications();
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const askClearAll = () => {
        if (items.length === 0) return;
        setConfirm({
            title: 'Clear all notifications?',
            message: 'This permanently deletes every notification in your inbox. This cannot be undone.',
            confirmLabel: 'Clear all',
            tone: 'danger',
            run: async () => {
                setLoading(true);
                try {
                    await axios.delete(url('/notifications/clear'));
                    await fetchNotifications();
                } finally {
                    setLoading(false);
                }
            },
        });
    };

    const handleConfirm = async () => {
        if (!confirm) return;
        const job = confirm;
        setConfirm(null);
        await job.run();
    };

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={toggle}
                className={[
                    'group relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-slate-50 hover:text-blue-600 active:scale-95 sm:h-10 sm:w-10',
                    open ? 'border-blue-200 bg-blue-50 text-blue-600 ring-4 ring-blue-50' : '',
                ].join(' ')}
                aria-label="Notifications"
            >
                <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white shadow-[0_0_10px_rgba(244,63,94,0.5)] ring-2 ring-white">
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <>
                    {/* Triangle Arrow */}
                    <div className="absolute right-3 top-[calc(100%+2px)] z-[51] h-3 w-3 rotate-45 border-l border-t border-slate-200/50 bg-white/80 backdrop-blur-xl sm:right-4" />
                    
                    <div className="absolute right-[-48px] sm:right-0 top-[calc(100%+8px)] z-50 w-[calc(100vw-2rem)] sm:w-[400px] origin-top-right animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200 overflow-hidden rounded-[24px] border border-white/40 bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)]">
                        {/* Header */}
                        <div className="relative border-b border-slate-100/50 bg-gradient-to-r from-white/50 to-slate-50/50 px-5 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-black tracking-tight text-slate-900">Notifications</h3>
                                    <div className="mt-0.5 flex items-center gap-1.5">
                                        <span className="flex h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                                        <p className="text-[11px] font-bold text-blue-600/80 uppercase tracking-wider">{unread} New Activity</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={askMarkAllRead}
                                        disabled={loading || unread === 0}
                                        className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-blue-600 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-30"
                                    >
                                        Mark all read
                                    </button>
                                    <div className="h-3 w-px bg-slate-200/50" />
                                    <button
                                        type="button"
                                        onClick={askClearAll}
                                        disabled={loading || items.length === 0}
                                        className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-tighter text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <div className="relative mb-6">
                                        <div className="absolute inset-0 animate-ping rounded-full bg-blue-100/50 opacity-20" />
                                        <div className="relative flex h-20 w-20 items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-50 to-white shadow-inner text-slate-200">
                                            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.2">
                                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                            </svg>
                                        </div>
                                    </div>
                                    <h4 className="text-sm font-black text-slate-900">You're all caught up!</h4>
                                    <p className="mt-1.5 max-w-[240px] text-xs font-medium leading-relaxed text-slate-400">
                                        No new notifications at the moment. We'll alert you when there's an update.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-1.5">
                                    <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400/80">Recent Activity</p>
                                    {items.map((n) => (
                                        <button
                                            key={n.id}
                                            type="button"
                                            onClick={() => openItem(n)}
                                            className={`group relative flex w-full items-start gap-4 rounded-[18px] p-4 text-left transition-all duration-300 ${n.read ? 'bg-transparent hover:bg-white/60 hover:shadow-sm' : 'bg-blue-600/[0.03] hover:bg-blue-600/[0.06] shadow-sm'}`}
                                        >
                                            <div className="relative mt-1 shrink-0">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-colors duration-300 ${n.read ? 'bg-slate-50 text-slate-400 group-hover:bg-white' : 'bg-blue-50 text-blue-600'}`}>
                                                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
                                                    </svg>
                                                </div>
                                                {!n.read && (
                                                    <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-blue-600 ring-2 ring-white">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className={`truncate text-sm ${n.read ? 'font-medium text-slate-600' : 'font-black text-slate-900'}`}>{n.title}</p>
                                                    <p className="shrink-0 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{timeAgo(n.created_at)}</p>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500/90">{n.body}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-100/50 bg-slate-50/30 p-3">
                            <button
                                type="button"
                                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 transition hover:bg-white hover:text-blue-600 hover:shadow-sm active:scale-[0.98]"
                            >
                                <span>View all notifications</span>
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </>
            )}

            <ConfirmDialog
                open={Boolean(confirm)}
                title={confirm?.title}
                message={confirm?.message}
                confirmLabel={confirm?.confirmLabel}
                tone={confirm?.tone ?? 'primary'}
                loading={loading}
                onConfirm={handleConfirm}
                onCancel={() => setConfirm(null)}
            />
        </div>
    );
}
