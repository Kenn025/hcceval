import { router } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';
import Pagination from './Pagination';

export default function ResourceTable({
    columns,
    data,
    onRowClick,
    onEdit,
    editLabel = 'Edit',
    onDelete,
    showRowNumbers = true,
    searchPlaceholder = 'Search...',
    filters = {},
    routeName,
    extraHeaderActions,
    rowActions,
}) {
    const [search, setSearch] = useState(filters.search ?? '');
    const timerRef = useRef(null);

    const handleSearch = useCallback(
        (value) => {
            setSearch(value);
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                router.get(route(routeName), { ...filters, search: value, per_page: filters.per_page ?? 15 }, {
                    preserveState: true,
                    replace: true,
                });
            }, 400);
        },
        [routeName, filters],
    );

    const handlePerPageChange = (value) => {
        router.get(route(routeName), { ...filters, per_page: value, page: 1 }, {
            preserveState: true,
        });
    };

    const pageStart = data?.from ?? (
        ((data?.current_page ?? 1) - 1) * (data?.per_page ?? data?.data?.length ?? 0) + 1
    );

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="flex flex-1 items-center gap-4">
                    <div className="relative min-w-0 flex-1 md:max-w-xs">
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

                    {data.total > 0 && (
                        <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-tight">
                            <span>Page</span>
                            <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-slate-100 px-1 text-blue-600">
                                {data.current_page}
                            </span>
                            <span>of</span>
                            <span className="text-slate-900">{data.last_page}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="hidden text-xs font-bold uppercase tracking-tight text-slate-500 sm:block">
                            Show
                        </label>
                        <select
                            value={filters.per_page ?? 15}
                            onChange={(e) => handlePerPageChange(e.target.value)}
                            className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-8 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            {[10, 15, 25, 50, 100].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                    {extraHeaderActions && (
                        <div className="flex flex-wrap items-center gap-2">
                            {extraHeaderActions}
                        </div>
                    )}
                </div>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead>
                        <tr className="bg-slate-50">
                            {showRowNumbers && (
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    #
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                                >
                                    {col.label}
                                </th>
                            ))}
                            {(onEdit || onDelete || rowActions) && (
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
                                    colSpan={columns.length + (showRowNumbers ? 1 : 0) + ((onEdit || onDelete || rowActions) ? 1 : 0)}
                                    className="px-4 py-10 text-center text-sm text-slate-500"
                                >
                                    No records found.
                                </td>
                            </tr>
                        )}
                        {data.data?.map((row, i) => (
                            <tr
                                key={row.id ?? i}
                                className={[
                                    'hover:bg-slate-50/70',
                                    onRowClick ? 'cursor-pointer' : '',
                                ].join(' ')}
                                onClick={onRowClick ? () => onRowClick(row) : undefined}
                            >
                                {showRowNumbers && (
                                    <td className="px-4 py-3 text-sm font-medium text-slate-500">
                                        {pageStart + i}
                                    </td>
                                )}
                                {columns.map((col) => (
                                    <td key={col.key} className="px-4 py-3 text-sm text-slate-800">
                                        {col.render ? col.render(row) : row[col.key] ?? '-'}
                                    </td>
                                ))}
                                {(onEdit || onDelete || rowActions) && (
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            {rowActions && (
                                                <div
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {rowActions(row)}
                                                </div>
                                            )}
                                            {onEdit && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(row);
                                                    }}
                                                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    {editLabel}
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(row);
                                                    }}
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

            {/* Mobile View */}
            <div className="md:hidden divide-y divide-slate-100 border-t border-slate-100">
                {data.data?.length === 0 && (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No records found.
                    </div>
                )}
                {data.data?.map((row, i) => (
                    <div
                        key={row.id ?? i}
                        className={[
                            'p-4 active:bg-slate-50 transition-colors',
                            onRowClick ? 'cursor-pointer' : '',
                        ].join(' ')}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                                {showRowNumbers && (
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        # {pageStart + i}
                                    </div>
                                )}
                                {columns.map((col) => (
                                    <div key={col.key}>
                                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {col.label}
                                        </div>
                                        <div className="mt-0.5 text-sm font-medium text-slate-900">
                                            {col.render ? col.render(row) : row[col.key] ?? '-'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {(onEdit || onDelete || rowActions) && (
                                <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {rowActions && rowActions(row)}
                                    {onEdit && (
                                        <button
                                            type="button"
                                            onClick={() => onEdit(row)}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm"
                                        >
                                            {editLabel}
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            type="button"
                                            onClick={() => onDelete(row)}
                                            className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 shadow-sm"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Pagination data={data} />
        </div>
    );
}
