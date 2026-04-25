import AppIcon from '@/Components/AppIcon';
import FlashNotification from '@/Components/FlashNotification';
import NotificationBell from '@/Components/NotificationBell';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

const THEMES = {
    student: {
        gradient: 'linear-gradient(170deg, #0d2454 0%, #0b1f47 40%, #091a3e 100%)',
        activeText: 'text-[#0d2454]',
        activeDot: 'bg-blue-400',
        activeIconBg: 'bg-blue-600',
        avatarGradient: 'from-blue-400 to-blue-600',
        topAvatarBg: 'from-blue-600 to-blue-900',
        portalLabel: 'Student Portal',
        mainBg: 'bg-[#f0f4f9]',
        headerBg: 'bg-white',
        headerBorder: 'border-slate-200',
        headerLabel: 'text-slate-400',
        headerTitle: 'text-slate-800',
    },
    teacher: {
        gradient: 'linear-gradient(170deg, #0d2454 0%, #0b1f47 40%, #091a3e 100%)',
        activeText: 'text-[#0d2454]',
        activeDot: 'bg-blue-400',
        activeIconBg: 'bg-blue-600',
        avatarGradient: 'from-blue-400 to-blue-600',
        topAvatarBg: 'from-blue-600 to-blue-900',
        portalLabel: 'Faculty Portal',
        mainBg: 'bg-[#f0f4f9]',
        headerBg: 'bg-white',
        headerBorder: 'border-slate-200',
        headerLabel: 'text-slate-400',
        headerTitle: 'text-slate-800',
    },
    employee: {
        gradient: 'linear-gradient(170deg, #0d2454 0%, #0b1f47 40%, #091a3e 100%)',
        activeText: 'text-[#0d2454]',
        activeDot: 'bg-blue-400',
        activeIconBg: 'bg-blue-600',
        avatarGradient: 'from-blue-400 to-blue-600',
        topAvatarBg: 'from-blue-600 to-blue-900',
        portalLabel: 'Employee Portal',
        mainBg: 'bg-[#f0f4f9]',
        headerBg: 'bg-white',
        headerBorder: 'border-slate-200',
        headerLabel: 'text-slate-400',
        headerTitle: 'text-slate-800',
    },
};

const NAV_ITEMS = {
    student: [
        { key: 'subjects',    label: 'My Subjects',    icon: 'subjects' },
        { key: 'evaluations', label: 'My Evaluations', icon: 'check-circle' },
        { key: 'archive',     label: 'Archive',        icon: 'archive' },
    ],
    teacher: [
        { key: 'classes',  label: 'My Classes', icon: 'teachers' },
        { key: 'ratings',  label: 'My Ratings', icon: 'ratings' },
        { key: 'evaluate', label: 'Evaluate',   icon: 'peer' },
        { key: 'archive',  label: 'Archive',    icon: 'archive' },
    ],
    employee: [
        { key: 'ratings', label: 'My Ratings', icon: 'ratings' },
        { key: 'evaluate', label: 'Evaluate',  icon: 'peer' },
        { key: 'archive', label: 'Archive',    icon: 'archive' },
    ],
};

export default function PortalLayout({
    title,
    user,
    userType = 'student',
    activeNav,
    onNavChange,
    children,
}) {
    const theme    = THEMES[userType] ?? THEMES.student;
    const navItems = NAV_ITEMS[userType] ?? NAV_ITEMS.student;

    const [collapsed,  setCollapsed]  = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showBugReport, setShowBugReport] = useState(false);
    const [bugSuccess, setBugSuccess] = useState(false);
    const navRef = useRef(null);
    const userMenuRef = useRef(null);

    const bugForm = useForm({
        subject: '',
        description: '',
        severity: 'medium',
        reporter_type: userType,
        reporter_id: user?.id ?? 0,
        reporter_name: user?.name ?? '',
    });

    useEffect(() => {
        if (!showUserMenu) return;
        const handler = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showUserMenu]);

    useEffect(() => {
        const nav   = navRef.current;
        if (!nav) return;
        const saved = sessionStorage.getItem('portal-sidebar-scroll');
        if (saved) nav.scrollTop = parseInt(saved, 10);
        return () => {
            if (navRef.current) {
                sessionStorage.setItem('portal-sidebar-scroll', String(navRef.current.scrollTop));
            }
        };
    }, []);

    useEffect(() => {
        document.body.classList.toggle('overflow-hidden', mobileOpen);
        return () => document.body.classList.remove('overflow-hidden');
    }, [mobileOpen]);

    useEffect(() => {
        if (!mobileOpen) return;
        const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [mobileOpen]);

    const userInitials = useMemo(() => {
        const label = user?.name?.trim() || 'User';
        return label.split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
    }, [user?.name]);

    const sidebarW = collapsed ? 'lg:w-20' : 'lg:w-64';
    const mainPad  = collapsed ? 'lg:pl-20' : 'lg:pl-64';
    const closeMobile = () => setMobileOpen(false);

    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Brand */}
            <div className={['flex items-center gap-3 px-4 py-5', collapsed ? 'justify-center px-2' : ''].join(' ')}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white shadow-inner ring-1 ring-white/20">
                    <AppIcon name="graduation" className="h-5 w-5" />
                </div>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold tracking-wide text-white">HCC Portal</p>
                        <p className="truncate text-[11px] text-white/50">{theme.portalLabel}</p>
                    </div>
                )}
            </div>

            {/* User card */}
            {!collapsed && (
                <div className="mx-3 mb-4 flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/10 shadow-sm">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.avatarGradient} text-xs font-bold text-white shadow`}>
                        {userInitials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{user?.name ?? ''}</p>
                        <p className="truncate text-[10px] text-white/40 uppercase tracking-wider">{user?.branch ?? ''}</p>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav ref={navRef} className="flex-1 overflow-y-auto px-2 pb-2">
                <div className="space-y-0.5">
                    {navItems.map((item) => {
                        const isActive = item.key === activeNav;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => { onNavChange(item.key); closeMobile(); }}
                                title={collapsed ? item.label : undefined}
                                className={[
                                    'group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-[0.85rem] font-bold tracking-tight transition-all duration-200',
                                    collapsed ? 'justify-center px-0' : '',
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)]'
                                        : 'bg-white/5 text-white/60 shadow-sm hover:bg-white/10 hover:text-white',
                                ].join(' ')}
                            >
                                <span className={[
                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all',
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'text-white/40 group-hover:text-white',
                                ].join(' ')}>
                                    <AppIcon name={item.icon} className="h-4 w-4" />
                                </span>
                                {!collapsed && <span className="truncate">{item.label}</span>}
                                {isActive && !collapsed && (
                                    <div className="ml-auto flex h-5 items-center">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* Sign out */}
            <div className="flex items-center justify-center border-t border-white/10 p-3">
                <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    title="Sign out"
                    className={[
                        'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold text-white/50 transition-all hover:bg-rose-500/20 hover:text-rose-300',
                        collapsed ? 'w-12 h-12 justify-center px-0' : 'w-full',
                    ].join(' ')}
                >
                    <AppIcon name="logout" className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Sign Out</span>}
                </button>
            </div>
        </div>
    );

    return (
        <>
            <Head title={title} />
            <FlashNotification />
            <div className={`min-h-screen text-slate-900 ${theme.mainBg ?? 'bg-slate-50'}`}>

                {/* Mobile backdrop */}
                <div
                    className={[
                        'fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden',
                        mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
                    ].join(' ')}
                    onClick={closeMobile}
                />

                {/* Sidebar */}
                <aside
                    className={[
                        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col transition-all duration-300',
                        sidebarW,
                        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                    ].join(' ')}
                    style={{ backgroundImage: theme.gradient }}
                >
                    <button
                        type="button"
                        onClick={closeMobile}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white lg:hidden"
                    >
                        <AppIcon name="close" className="h-4 w-4" />
                    </button>

                    <SidebarContent />

                    {/* Collapse toggle — desktop only */}
                    <button
                        type="button"
                        onClick={() => setCollapsed((v) => !v)}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className="absolute -right-3.5 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 hover:text-slate-900 lg:flex"
                    >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {collapsed ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
                        </svg>
                    </button>
                </aside>

                {/* Main */}
                <div className={['transition-all duration-300', mainPad].join(' ')}>

                    {/* Top bar */}
                    <header className={`sticky top-0 z-20 border-b shadow-sm ${theme.headerBg ?? 'bg-white'} ${theme.headerBorder ?? 'border-slate-200'}`}>
                        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(true)}
                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
                                >
                                    <AppIcon name="menu" className="h-4 w-4" />
                                </button>
                                <div className="min-w-0">
                                    <p className={`text-[11px] font-semibold uppercase tracking-wider ${theme.headerLabel ?? 'text-slate-400'}`}>
                                        HCC Portal
                                    </p>
                                    <h1 className={`truncate text-lg font-bold ${theme.headerTitle ?? 'text-slate-800'}`}>{title}</h1>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <NotificationBell routePrefix="/portal" />

                                <div className="relative" ref={userMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowUserMenu((v) => !v)}
                                    className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-black/5"
                                >
                                    <div className="hidden text-right sm:block">
                                        <p className={`text-sm font-semibold leading-none ${theme.headerTitle ?? 'text-slate-800'}`}>{user?.name ?? ''}</p>
                                        <p className={`mt-0.5 text-xs ${theme.headerLabel ?? 'text-slate-400'}`}>{theme.portalLabel}</p>
                                    </div>
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${theme.topAvatarBg} text-xs font-bold text-white shadow`}>
                                        {userInitials}
                                    </div>
                                    <AppIcon name="chevronDown" className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                                </button>

                                {showUserMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-50">
                                        <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                                            <p className="text-sm font-semibold text-slate-800">{user?.name ?? ''}</p>
                                            <p className="text-xs text-slate-400">{theme.portalLabel}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setShowUserMenu(false); setShowBugReport(true); }}
                                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                        >
                                            <AppIcon name="bug" className="h-4 w-4 text-rose-500" />
                                            Report a Bug
                                        </button>
                                        <div className="border-t border-slate-100 my-1" />
                                        <button
                                            type="button"
                                            onClick={() => { setShowUserMenu(false); setShowLogoutConfirm(true); }}
                                            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50"
                                        >
                                            <AppIcon name="logout" className="h-4 w-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="px-4 py-6 sm:px-6">
                        {children}
                    </main>
                </div>
            </div>

            {/* Sign-out confirmation modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)}>
                    <div
                        className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                            <AppIcon name="logout" className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Sign Out</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Are you sure you want to sign out? You will need to log in again to access the portal.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowLogoutConfirm(false)}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => router.post(route('portal.logout'))}
                                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-rose-700"
                            >
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bug report modal */}
            {showBugReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setShowBugReport(false); setBugSuccess(false); }}>
                    <div
                        className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {bugSuccess ? (
                            <div className="text-center py-6">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <path d="M22 4 12 14.01l-3-3" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Report Submitted!</h3>
                                <p className="mt-1 text-sm text-slate-500">Thank you for helping us improve the system. The admin team will review your report.</p>
                                <button
                                    type="button"
                                    onClick={() => { setShowBugReport(false); setBugSuccess(false); }}
                                    className="mt-5 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                                >
                                    Close
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                                        <AppIcon name="bug" className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Report a Bug</h3>
                                        <p className="text-xs text-slate-400">This will be sent to the system administrator</p>
                                    </div>
                                </div>

                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    bugForm.post(route('portal.bug-report.store'), {
                                        onSuccess: () => {
                                            setBugSuccess(true);
                                            bugForm.reset('subject', 'description', 'severity');
                                        },
                                    });
                                }}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                            <input
                                                type="text"
                                                value={bugForm.data.subject}
                                                onChange={(e) => bugForm.setData('subject', e.target.value)}
                                                placeholder="Brief description of the issue"
                                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                                                required
                                            />
                                            {bugForm.errors.subject && <p className="mt-1 text-xs text-rose-500">{bugForm.errors.subject}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                                            <select
                                                value={bugForm.data.severity}
                                                onChange={(e) => bugForm.setData('severity', e.target.value)}
                                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                                            >
                                                <option value="low">Low — Minor visual issue</option>
                                                <option value="medium">Medium — Something isn't working right</option>
                                                <option value="high">High — Feature is broken</option>
                                                <option value="critical">Critical — Cannot use the system</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                            <textarea
                                                value={bugForm.data.description}
                                                onChange={(e) => bugForm.setData('description', e.target.value)}
                                                placeholder="Please describe what happened, what you expected, and steps to reproduce the issue..."
                                                rows={4}
                                                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none"
                                                required
                                            />
                                            {bugForm.errors.description && <p className="mt-1 text-xs text-rose-500">{bugForm.errors.description}</p>}
                                        </div>
                                    </div>

                                    <div className="mt-6 flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowBugReport(false)}
                                            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={bugForm.processing}
                                            className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-rose-700 disabled:opacity-50"
                                        >
                                            {bugForm.processing ? 'Submitting...' : 'Submit Report'}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
