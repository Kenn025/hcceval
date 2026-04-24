import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

export default function GlobalSearch() {
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    useEffect(() => {
        if (q.trim().length < 2) { setResults([]); return; }
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const { data } = await axios.get(route('admin.search'), { params: { q } });
                setResults(data.results ?? []);
                setOpen(true);
            } finally {
                setLoading(false);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [q]);

    return (
        <div ref={ref} className="relative w-full max-w-md">
            <input
                type="text"
                placeholder="Search students, teachers, employees, subjects…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => q && setOpen(true)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />

            {open && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {results.map((r, i) => (
                        <a
                            key={`${r.type}-${i}`}
                            href={r.url}
                            className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
                        >
                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-700">{r.type}</span>
                            <span className="flex-1 text-slate-700">{r.label}</span>
                        </a>
                    ))}
                </div>
            )}

            {open && !loading && q.length >= 2 && results.length === 0 && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500 shadow-lg">
                    No matches for "{q}".
                </div>
            )}
        </div>
    );
}
