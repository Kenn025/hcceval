import { Link } from '@inertiajs/react';

export default function Pagination({ links, meta }) {
    if (!links || links.length <= 3) return null;

    return (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-sm text-slate-600">
                Showing {meta?.from ?? 0}–{meta?.to ?? 0} of {meta?.total ?? 0}
            </p>
            <div className="flex gap-1">
                {links.map((link, index) => (
                    <Link
                        key={index}
                        href={link.url ?? '#'}
                        preserveScroll
                        className={[
                            'inline-flex min-w-[2rem] items-center justify-center rounded-lg px-2 py-1.5 text-sm font-medium transition',
                            link.active
                                ? 'bg-slate-900 text-white'
                                : link.url
                                  ? 'text-slate-600 hover:bg-slate-100'
                                  : 'cursor-not-allowed text-slate-300',
                        ].join(' ')}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ))}
            </div>
        </div>
    );
}
