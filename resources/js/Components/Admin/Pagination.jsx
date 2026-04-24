import { Link } from '@inertiajs/react';

export default function Pagination({ data }) {
    const { links = [], from = 0, to = 0, total = 0, meta } = data || {};
    
    // Support both direct paginator and API resources with 'meta' wrapper
    const actualLinks = meta?.links || links;
    const actualFrom = meta?.from ?? from;
    const actualTo = meta?.to ?? to;
    const actualTotal = meta?.total ?? total;

    if (!actualTotal) return null;

    return (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 sm:flex-row">
            <div className="text-sm font-medium text-slate-500">
                Showing <span className="font-bold text-slate-800">{actualFrom}</span> to <span className="font-bold text-slate-800">{actualTo}</span> of <span className="font-bold text-slate-800">{actualTotal}</span> results
            </div>

            {actualLinks.length > 3 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {actualLinks.map((link, index) => {
                        const isActive = link.active;
                        const isNav = link.label.includes('Previous') || link.label.includes('Next');
                        
                        return (
                            <Link
                                key={index}
                                href={link.url ?? '#'}
                                preserveScroll
                                preserveState
                                className={[
                                    'inline-flex min-w-[2.5rem] h-10 items-center justify-center rounded-2xl px-3 text-sm font-bold transition-all duration-200',
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)]'
                                        : link.url
                                          ? 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm'
                                          : 'cursor-not-allowed border border-slate-100 text-slate-300',
                                    isNav ? 'px-4' : '',
                                ].join(' ')}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
