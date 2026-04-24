export default function SubmitButton({
    className = '',
    disabled = false,
    processing = false,
    children,
    ...props
}) {
    return (
        <button
            {...props}
            type="submit"
            disabled={disabled || processing}
            className={[
                'inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white',
                'transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60',
                className,
            ].join(' ')}
        >
            <span>{children}</span>
        </button>
    );
}
