import AppIcon from '@/Components/AppIcon';
import FlashNotification from '@/Components/FlashNotification';
import { Head, Link, usePage, useForm, router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState } from 'react';

function routeIsActive(routeName, currentRoute) {
    return Boolean(routeName && currentRoute && routeName === currentRoute);
}

function NavItem({ item, activeRoute, collapsed, onClick }) {
    const isActive = routeIsActive(item.route, activeRoute);
    return (
        <Link
            href={route(item.route)}
            onClick={onClick}
            title={collapsed ? item.label : undefined}
            className={[
                'group relative flex items-center gap-3 rounded-2xl px-4 py-3.5 text-[0.85rem] font-bold tracking-tight transition-all duration-200',
                collapsed ? 'justify-center px-0' : '',
                isActive
                    ? 'bg-blue-600 text-white shadow-[0_10px_25px_-5px_rgba(37,99,235,0.4)]'
                    : 'bg-white/5 text-blue-100 shadow-sm hover:bg-white/10 hover:text-white',
            ].join(' ')}
        >
            <span className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all',
                isActive ? 'bg-white/20 text-white shadow-sm' : 'text-blue-300 group-hover:text-white',
            ].join(' ')}>
                <AppIcon name={item.icon} className="h-4 w-4" />
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {isActive && !collapsed && (
                <div className="ml-auto flex h-5 items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]" />
                </div>
            )}
        </Link>
    );
}

function NavGroup({ group, activeRoute, collapsed, onItemClick }) {
    const hasActive = group.items.some((i) => routeIsActive(i.route, activeRoute));
    const [open, setOpen] = useState(hasActive);

    useEffect(() => { if (hasActive) setOpen(true); }, [hasActive]);

    if (collapsed) {
        return (
            <div className="flex flex-col items-center gap-1">
                {group.items.map((item) => (
                    <NavItem key={item.route} item={item} activeRoute={activeRoute} collapsed={true} onClick={onItemClick} />
                ))}
            </div>
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={[
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-[0.85rem] font-bold tracking-tight transition-all duration-200',
                    hasActive ? 'bg-blue-600/20 text-white ring-1 ring-blue-500/30' : 'text-blue-100 hover:bg-white/10 hover:text-white',
                ].join(' ')}
            >
                <span className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-xl',
                    hasActive ? 'bg-blue-600 text-white shadow' : 'text-blue-300',
                ].join(' ')}>
                    <AppIcon name={group.icon} className="h-4 w-4" />
                </span>
                <span className="flex-1 truncate text-left">{group.title}</span>
                <span className={['transition-transform duration-200', open ? 'rotate-180' : ''].join(' ')}>
                    <AppIcon name="chevronDown" className="h-3.5 w-3.5 opacity-60" />
                </span>
            </button>

            {open && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                    {group.items.map((item) => {
                        const isActive = routeIsActive(item.route, activeRoute);
                        return (
                            <Link
                                key={item.route}
                                href={route(item.route)}
                                onClick={onItemClick}
                                className={[
                                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all',
                                    isActive
                                        ? 'bg-white/15 font-semibold text-white'
                                        : 'text-blue-200 hover:bg-white/8 hover:text-white',
                                ].join(' ')}
                            >
                                <AppIcon name={item.icon} className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                <span className="truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

const ROLE_LABELS = {
    superadmin: 'Super Admin',
    overalladmin: 'Overall Admin',
    admin: 'Branch Admin',
};

export default function AdminLayout({ title, children, header, activeRoute, breadcrumbs = [] }) {
    const { auth, portal } = usePage().props;
    const role = auth?.role ?? 'admin';
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showBugReport, setShowBugReport] = useState(false);
    const [bugSuccess, setBugSuccess] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const navRef = useRef(null);
    const userMenuRef = useRef(null);

    const bugForm = useForm({
        subject: '',
        description: '',
        severity: 'medium',
        reporter_type: 'admin',
        reporter_id: auth?.user?.id ?? 0,
        reporter_name: auth?.user?.name ?? 'Admin',
    });

    // Close user menu on outside click
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

    // Preserve sidebar scroll position across page navigations
    useEffect(() => {
        const nav = navRef.current;
        if (!nav) return;
        const saved = sessionStorage.getItem('sidebar-scroll');
        if (saved) nav.scrollTop = parseInt(saved, 10);
        return () => {
            if (navRef.current) {
                sessionStorage.setItem('sidebar-scroll', String(navRef.current.scrollTop));
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
        const label = auth?.user?.name?.trim() || 'Admin';
        return label.split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
    }, [auth?.user?.name]);

    const sidebarW = collapsed ? 'lg:w-20' : 'lg:w-64';
    const mainPad = collapsed ? 'lg:pl-20' : 'lg:pl-64';
    const closeMobile = () => setMobileOpen(false);

    const SidebarContent = () => (
        <div className="flex h-full flex-col">
            {/* Brand */}
            <div className={['flex items-center gap-3 px-4 py-5', collapsed ? 'justify-center px-2' : ''].join(' ')}>
                <Link
                    href={route('dashboard')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white shadow-inner ring-1 ring-white/20"
                >
                    <AppIcon name="graduation" className="h-5 w-5" />
                </Link>
                {!collapsed && (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold tracking-wide text-white">HCC Admin</p>
                        <p className="truncate text-[11px] text-blue-300">Evaluation Platform</p>
                    </div>
                )}
            </div>

            {/* User card */}
            {!collapsed && (
                <div className="mx-3 mb-4 flex items-center gap-3 rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/10 shadow-sm">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-300 to-blue-500 text-xs font-bold text-white shadow">
                        {userInitials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">{auth?.user?.name ?? 'Admin'}</p>
                        <p className="truncate text-[10px] text-blue-300 uppercase tracking-wider">{ROLE_LABELS[role] ?? 'Admin'}</p>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav ref={navRef} className="sidebar-scroll flex-1 overflow-y-auto px-2 pb-2">
                {portal.navigation.filter(s => !s.roles || s.roles.includes(role)).map((section) => (
                    <div key={section.title} className="mb-4">
                        {!collapsed && (
                            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-blue-400/70">
                                {section.title}
                            </p>
                        )}
                        {collapsed && <div className="my-2 border-t border-white/10" />}

                        <div className="space-y-0.5">
                            {section.items?.map((item) => (
                                <NavItem key={item.route} item={item} activeRoute={activeRoute} collapsed={collapsed} onClick={closeMobile} />
                            ))}
                            {section.groups?.map((group) => (
                                <NavGroup key={group.title} group={group} activeRoute={activeRoute} collapsed={collapsed} onItemClick={closeMobile} />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom: logout only */}
            <div className="flex items-center justify-center border-t border-white/10 p-3">
                <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(true)}
                    title="Sign out"
                    className={[
                        'flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-bold text-blue-200 transition-all hover:bg-rose-500/20 hover:text-rose-300',
                        collapsed ? 'justify-center w-12 h-12 px-0' : 'w-full',
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
            <div className="min-h-screen bg-[#f0f4f9] text-slate-900">

                {/* Mobile backdrop */}
                <div
                    className={['fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden', mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'].join(' ')}
                    onClick={closeMobile}
                />

                {/* Sidebar */}
                <aside className={[
                    'fixed inset-y-0 left-0 z-40 flex flex-col w-64 transition-all duration-300',
                    sidebarW,
                    mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
                ].join(' ')}
                    style={{ backgroundImage: 'linear-gradient(170deg, #0d2454 0%, #0b1f47 40%, #091a3e 100%)' }}
                >
                    {/* Mobile close */}
                    <button
                        type="button"
                        onClick={closeMobile}
                        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white lg:hidden"
                    >
                        <AppIcon name="close" className="h-4 w-4" />
                    </button>

                    <SidebarContent />

                    {/* Floating collapse tab — right edge, desktop only */}
                    <button
                        type="button"
                        onClick={() => setCollapsed((v) => !v)}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className="absolute -right-3.5 top-5 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 hover:text-slate-900 lg:flex"
                    >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            {collapsed ? <path d="M9 18l6-6-6-6"/> : <path d="M15 18l-6-6 6-6"/>}
                        </svg>
                    </button>
                </aside>

                {/* Main */}
                <div className={['transition-all duration-300', mainPad].join(' ')}>

                    {/* Top bar */}
                    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
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
                                    {breadcrumbs[0] && (
                                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                            {breadcrumbs[0]}
                                        </p>
                                    )}
                                    <h1 className="truncate text-lg font-bold text-slate-800">{title}</h1>
                                </div>
                            </div>

                            <div className="relative" ref={userMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setShowUserMenu((v) => !v)}
                                    className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
                                >
                                    <div className="hidden text-right sm:block">
                                        <p className="text-sm font-semibold text-slate-800">{auth?.user?.name ?? 'Admin'}</p>
                                        <p className="text-xs text-slate-400">{ROLE_LABELS[role] ?? 'Admin'}</p>
                                    </div>
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-bold text-white shadow">
                                        {userInitials}
                                    </div>
                                    <AppIcon name="chevronDown" className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                                </button>

                                {/* Dropdown menu */}
                                {showUserMenu && (
                                    <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl z-50">
                                        <div className="px-3 py-2 border-b border-slate-100 sm:hidden">
                                            <p className="text-sm font-semibold text-slate-800">{auth?.user?.name ?? 'Admin'}</p>
                                            <p className="text-xs text-slate-400">{ROLE_LABELS[role] ?? 'Admin'}</p>
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
                    </header>

                    <main className="px-4 py-6 sm:px-6">
                        {header}
                        {children}
                    </main>
                </div>
            </div>

            {/* Logout confirmation modal */}
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
                            Are you sure you want to sign out? You will need to log in again to access the admin panel.
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
                                onClick={() => router.post(route('logout'))}
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
                    <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {bugSuccess ? (
                            <div className="text-center py-6">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                        <path d="M22 4 12 14.01l-3-3" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">Report Submitted!</h3>
                                <p className="mt-1 text-sm text-slate-500">Thank you for helping us improve. The admin team will review your report.</p>
                                <button type="button" onClick={() => { setShowBugReport(false); setBugSuccess(false); }} className="mt-5 rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">Close</button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-5 flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                                        <AppIcon name="bug" className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">Report a Bug</h3>
                                        <p className="text-xs text-slate-400">This will be sent to the super admin</p>
                                    </div>
                                </div>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    bugForm.post(route('bug-report.store'), {
                                        onSuccess: () => { setBugSuccess(true); bugForm.reset('subject', 'description', 'severity'); },
                                    });
                                }}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                                            <input type="text" value={bugForm.data.subject} onChange={(e) => bugForm.setData('subject', e.target.value)} placeholder="Brief description of the issue" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" required />
                                            {bugForm.errors.subject && <p className="mt-1 text-xs text-rose-500">{bugForm.errors.subject}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
                                            <select value={bugForm.data.severity} onChange={(e) => bugForm.setData('severity', e.target.value)} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100">
                                                <option value="low">Low — Minor visual issue</option>
                                                <option value="medium">Medium — Something isn't working right</option>
                                                <option value="high">High — Feature is broken</option>
                                                <option value="critical">Critical — Cannot use the system</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                            <textarea value={bugForm.data.description} onChange={(e) => bugForm.setData('description', e.target.value)} placeholder="Please describe the issue, what you expected, and steps to reproduce..." rows={4} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" required />
                                            {bugForm.errors.description && <p className="mt-1 text-xs text-rose-500">{bugForm.errors.description}</p>}
                                        </div>
                                    </div>
                                    <div className="mt-6 flex gap-3">
                                        <button type="button" onClick={() => setShowBugReport(false)} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Cancel</button>
                                        <button type="submit" disabled={bugForm.processing} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-rose-700 disabled:opacity-50">{bugForm.processing ? 'Submitting...' : 'Submit Report'}</button>
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
