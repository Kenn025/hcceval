import AppIcon from '@/Components/AppIcon';
import { Head, Link, usePage } from '@inertiajs/react';
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
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                collapsed ? 'justify-center px-0' : '',
                isActive
                    ? 'bg-white text-[#0f2d63] shadow-sm'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white',
            ].join(' ')}
        >
            <span className={[
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all',
                isActive ? 'bg-blue-600 text-white shadow' : 'text-blue-200 group-hover:text-white',
            ].join(' ')}>
                <AppIcon name={item.icon} className="h-4 w-4" />
            </span>
            {!collapsed && <span className="truncate">{item.label}</span>}
            {isActive && !collapsed && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
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
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                    hasActive ? 'text-white' : 'text-blue-200 hover:bg-white/10 hover:text-white',
                ].join(' ')}
            >
                <span className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
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
    const navRef = useRef(null);

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
                <div className="mx-3 mb-4 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5 ring-1 ring-white/10">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-300 to-blue-500 text-xs font-bold text-white shadow">
                        {userInitials}
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{auth?.user?.name ?? 'Admin'}</p>
                        <p className="truncate text-[11px] text-blue-300">{ROLE_LABELS[role] ?? 'Admin'}</p>
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
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    title="Sign out"
                    className={[
                        'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-blue-200 transition hover:bg-rose-500/20 hover:text-rose-300',
                        collapsed ? 'justify-center w-10 h-10 px-0' : 'w-full',
                    ].join(' ')}
                >
                    <AppIcon name="logout" className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>Sign Out</span>}
                </Link>
            </div>
        </div>
    );

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-slate-50 text-slate-900">

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
                        className="absolute -right-3.5 top-20 hidden h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 hover:text-slate-900 lg:flex"
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

                            <div className="flex items-center gap-3">
                                <div className="hidden text-right sm:block">
                                    <p className="text-sm font-semibold text-slate-800">{auth?.user?.name ?? 'Admin'}</p>
                                    <p className="text-xs text-slate-400">{ROLE_LABELS[role] ?? 'Admin'}</p>
                                </div>
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-bold text-white shadow">
                                    {userInitials}
                                </div>
                            </div>
                        </div>
                    </header>

                    <main className="px-4 py-6 sm:px-6">
                        {header}
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}
