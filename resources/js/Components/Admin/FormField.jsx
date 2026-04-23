export default function FormField({ label, error, children, required }) {
    return (
        <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {label}
                {required && <span className="ml-1 text-rose-500">*</span>}
            </label>
            {children}
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
        </div>
    );
}

export function TextInput({ className = '', ...props }) {
    return (
        <input
            {...props}
            className={[
                'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                className,
            ].join(' ')}
        />
    );
}

export function SelectInput({ className = '', children, ...props }) {
    return (
        <select
            {...props}
            className={[
                'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                className,
            ].join(' ')}
        >
            {children}
        </select>
    );
}

export function TextareaInput({ className = '', ...props }) {
    return (
        <textarea
            {...props}
            rows={3}
            className={[
                'w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                className,
            ].join(' ')}
        />
    );
}
