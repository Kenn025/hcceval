import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }) {
    return (
        <>
            <Head title="HCC Evaluation Platform" />

            <div className="min-h-screen bg-slate-100 px-6 py-10 text-slate-900">
                <div className="mx-auto max-w-6xl">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                                Migration Workspace
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold">
                                HCC Evaluation Platform
                            </h1>
                        </div>
                        <div className="flex gap-3">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Open Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                                    >
                                        Log In
                                    </Link>
                                    <Link
                                        href={route('register')}
                                        className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <section className="rounded-lg bg-slate-950 px-7 py-8 text-white shadow-xl">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                                Laravel + Inertia + React
                            </p>
                            <h2 className="mt-3 text-4xl font-semibold leading-tight">
                                The legacy evaluation system is now being rebuilt on a modern stack.
                            </h2>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                                This workspace is the new home for the admin shell, authentication, and every evaluation flow that currently lives in procedural PHP.
                            </p>
                        </section>

                        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                            <p className="text-sm font-semibold text-slate-900">
                                First migration slice
                            </p>
                            <div className="mt-4 space-y-3">
                                {[
                                    'Laravel application scaffolded side-by-side with the current project',
                                    'Inertia React auth installed and ready',
                                    'Responsive admin navigation mirrored from the legacy sidebar',
                                    'Major modules mapped to React pages for incremental porting',
                                ].map((item) => (
                                    <div
                                        key={item}
                                        className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                                    >
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}
