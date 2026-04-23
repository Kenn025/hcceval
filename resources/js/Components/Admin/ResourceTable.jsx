import { router } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import Pagination from './Pagination';

export default function ResourceTable({
    columns,
    data,
    onEdit,
    onDelete,
    searchPlaceholder = 'Search…',
    filters = {},
    routeName,
    extraHeaderActions,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const timerRef = useRef(null);

    const handleSearch = useCallback(
        (value) => {
            setSearch(value);
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                router.get(route(routeName), { ...filters, search: value }, {
                    preserveState: true,
                    replace: true,
                });
            }, 400);
        },
        [routeName, filters],
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="relative max-w-xs flex-1">
                    <svg
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                {extraHeaderActions}
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                        <tr className="bg-slate-50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                    {col.label}
                                </th>
                            ))}
                            {(onEdit || onDelete) && (
                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.data?.length === 0 && (
                            <tr>
                                <td
                                    colSpan={columns.length + 1}
                                    className="px-4 py-10 text-center text-sm text-slate-500"
                                >
                                    No records found.
                                </td>
                            </tr>
                        )}
                        {data.data?.map((row, i) => (
                            <tr key={row.id ?? i} className="hover:bg-slate-50/70">
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3 text-sm text-slate-800">
                                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {onEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => onEdit(row)}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => onDelete(row)}
                                                    className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination links={data.links} meta={data.meta} />
        </div>
    );
}
