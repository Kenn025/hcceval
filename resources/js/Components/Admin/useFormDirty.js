import { useEffect, useState } from 'react';

/**
 * Track whether an Inertia useForm() state has changed since the
 * edit target was last opened. Pass the form `data` object and a
 * stable identifier for the current edit target (e.g. row.id).
 *
 *   const { isDirty, refresh } = useFormDirty(data, editing?.id ?? 'new');
 *
 * - `isDirty` is true when any field has been edited.
 * - `refresh()` resets the baseline (call after a successful save
 *   if you keep the form open, or after manually setting fresh data).
 */
export default function useFormDirty(data, key) {
    const [snapshot, setSnapshot] = useState(() => safeStringify(data));

    useEffect(() => {
        setSnapshot(safeStringify(data));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const isDirty = safeStringify(data) !== snapshot;

    return {
        isDirty,
        refresh: () => setSnapshot(safeStringify(data)),
    };
}

function safeStringify(value) {
    try {
        return JSON.stringify(value, Object.keys(value ?? {}).sort());
    } catch {
        return '';
    }
}
