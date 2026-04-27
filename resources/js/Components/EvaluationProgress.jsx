export default function EvaluationProgress({
    answeredCount = 0,
    totalCount = 0,
    color = 'blue',
    sticky = false,
    bare = false,
    className = '',
}) {
    const safeTotal = Math.max(Number(totalCount) || 0, 0);
    const safeAnswered = Math.min(Math.max(Number(answeredCount) || 0, 0), safeTotal);
    const percent = safeTotal > 0 ? Math.round((safeAnswered / safeTotal) * 100) : 0;
    const colorClasses = {
        emerald: 'bg-emerald-600',
        blue: 'bg-blue-600',
        amber: 'bg-amber-600',
        stone: 'bg-stone-600',
    };

    return (
        <div
            className={[
                sticky ? 'sticky top-0 z-20' : '',
                bare
                    ? 'bg-transparent'
                    : 'rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur',
                className,
            ].filter(Boolean).join(' ')}
        >
            <div className="mb-1.5 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-700">Evaluation Progress</p>
                <p className="text-xs font-semibold text-slate-500">
                    {safeAnswered}/{safeTotal} completed - {percent}%
                </p>
            </div>
            <div
                className="h-1.5 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={percent}
                aria-label="Evaluation completion progress"
            >
                <div
                    className={['h-full rounded-full transition-all duration-300', colorClasses[color] ?? colorClasses.emerald].join(' ')}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

