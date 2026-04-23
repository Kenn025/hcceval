import { Head, Link } from '@inertiajs/react';

export default function ClientLayout({ title, children, user, userType = 'student' }) {
  const isStudent = userType === 'student';
  const accent    = isStudent ? '#1e6e40' : '#1a4a8a';
  const logoutRoute = 'portal.logout';

  return (
    <>
      <Head title={title} />
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l9-4 9 4-9 4-9-4Z" />
                  <path d="M7 10.5v4.5c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 leading-none">HCC Portal</p>
                <p className="text-[11px] text-slate-400">{isStudent ? 'Student' : 'Faculty'} Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-800 leading-none">{user?.name ?? ''}</p>
                <p className="text-[11px] text-slate-400">{user?.branch ?? ''}</p>
              </div>
              <Link
                href={route(logoutRoute)}
                method="post"
                as="button"
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </>
  );
}
