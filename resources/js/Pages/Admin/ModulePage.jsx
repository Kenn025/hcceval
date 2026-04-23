import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';

export default function ModulePage({ page }) {
    return (
        <AdminLayout
            title={page.title}
            activeRoute={page.route}
            breadcrumbs={[page.eyebrow, page.title]}
            header={
                <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                                <AppIcon name={page.icon} className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                                    {page.eyebrow}
                                </p>
                                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                                    {page.title}
                                </h2>
                                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                                    {page.description}
                                </p>
                            </div>
                        </div>
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            Migration target
                        </span>
                    </div>
                </section>
            }
        >
            <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">
                        Planned Laravel shape
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
                            {
                                label: 'Inertia Page',
                                value: page.title,
                                note: 'This route already renders inside the new admin shell.',
                            },
                            {
                                label: 'Controller target',
                                value: 'Pending',
                                note: 'Next step is replacing the placeholder view with live controller data.',
                            },
                            {
                                label: 'Data layer',
                                value: 'To map',
                                note: 'Model and query strategy will follow the final schema decision.',
                            },
                            {
                                label: 'Permissions',
                                value: 'To enforce',
                                note: 'Overall-admin and branch-admin policy checks belong here.',
                            },
                        ].map((card) => (
                            <div
                                key={card.label}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
                            >
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                                    {card.label}
                                </p>
                                <p className="mt-2 text-lg font-semibold text-slate-950">
                                    {card.value}
                                </p>
                                <p className="mt-2 text-sm text-slate-600">{card.note}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">
                        Legacy source touchpoints
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                        These current PHP files are the main references for the next porting pass.
                    </p>
                    <div className="mt-4 space-y-2">
                        {page.source.map((source) => (
                            <div
                                key={source}
                                className="rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700"
                            >
                                {source}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-900">
                    Recommended next implementation slice
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    {[
                        'Map the legacy query or API logic into a dedicated Laravel controller and service class.',
                        'Create or align Eloquent models against the current working schema for this feature.',
                        'Replace placeholder cards with real tables, forms, filters, and actions inside React.',
                    ].map((step, index) => (
                        <div
                            key={step}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4"
                        >
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                {index + 1}
                            </span>
                            <p className="mt-3 text-sm leading-6 text-slate-700">{step}</p>
                        </div>
                    ))}
                </div>
            </section>
        </AdminLayout>
    );
}
