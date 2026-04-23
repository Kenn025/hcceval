export default function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }) {
    return (
        <span className={[
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
        ].join(' ')}>
            {active ? activeLabel : inactiveLabel}
        </span>
    );
}
