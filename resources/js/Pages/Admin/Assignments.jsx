import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import ResourceTable from '@/Components/Admin/ResourceTable';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const ROUTE_MAP = {
    'student-teacher': 'admin.subject-assignments',
    peer: 'admin.peer-assignments',
    head: 'admin.head-assignments',
    employee: 'admin.employee-assignments',
};

const TITLE_MAP = {
    'student-teacher': 'Questionnaire Distribution',
    peer: 'Questionnaire Distribution',
    head: 'Questionnaire Distribution',
    employee: 'Questionnaire Distribution',
};

function DistributionSettingsDialog({ distribution, onClose }) {
    if (!distribution) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
            <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Distribution Settings</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Review the selected questionnaire distribution before connecting more settings.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        Close
                    </button>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Distribution Code</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{distribution.distribution_code ?? '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{distribution.is_activated ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questionnaire</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{distribution.questionnaire_title ?? '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questionnaire Type</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{distribution.questionnaire_type_name ?? '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Semester</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{distribution.semester ?? '-'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">School Year</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{distribution.school_year ?? '-'}</p>
                    </div>
                </div>

                <div className="mt-6 rounded-xl border border-dashed border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                    Distribution settings are now accessible from the table. If you want, I can wire this modal next to actual saveable options like branch, academic year, assigned targets, and activation rules.
                </div>
            </div>
        </div>
    );
}

export default function Assignments({ assignments, assignmentType, filters }) {
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [settingsTarget, setSettingsTarget] = useState(null);
    const activeRoute = ROUTE_MAP[assignmentType] ?? 'admin.subject-assignments';
    const tabs = [
        { key: 'student-teacher', label: 'Subject Teacher', routeName: 'admin.subject-assignments' },
        { key: 'peer', label: 'Peer to Peer', routeName: 'admin.peer-assignments' },
        { key: 'head', label: 'School Heads', routeName: 'admin.head-assignments' },
        { key: 'employee', label: 'Employee Feedback', routeName: 'admin.employee-assignments' },
    ];

    const columns = [
        { key: 'distribution_code', label: 'Distribution Code', render: (row) => row.distribution_code ?? '-' },
        { key: 'questionnaire_title', label: 'Questionnaire', render: (row) => row.questionnaire_title ?? '-' },
        { key: 'questionnaire_type_name', label: 'Questionnaire Type', render: (row) => row.questionnaire_type_name ?? '-' },
        { key: 'school_year', label: 'School Year', render: (row) => row.school_year ?? '-' },
        { key: 'semester', label: 'Semester', render: (row) => row.semester ?? '-' },
        {
            key: 'is_activated',
            label: 'Status',
            render: (row) => (
                <span
                    className={[
                        'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                        row.is_activated ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
                    ].join(' ')}
                >
                    {row.is_activated ? 'Active' : 'Inactive'}
                </span>
            ),
        },
    ];

    return (
        <AdminLayout title={TITLE_MAP[assignmentType]} activeRoute="admin.questionnaire-distribution" breadcrumbs={['Question Bank']}>
            <div className="mb-6">
                <h2 className="text-base font-semibold text-slate-900">Questionnaire Distribution</h2>
                <p className="text-sm text-slate-500">Manage which questionnaire set is used for each evaluation flow.</p>
            </div>

            <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {tabs.map((tab) => {
                    const isActive = tab.key === assignmentType;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => router.get(route(tab.routeName), filters, { preserveScroll: true })}
                            className={[
                                'rounded-xl px-4 py-2 text-sm font-semibold transition',
                                isActive
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                            ].join(' ')}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <ResourceTable
                columns={columns}
                data={assignments}
                filters={filters}
                routeName={activeRoute}
                searchPlaceholder="Search distributions..."
                onEdit={setSettingsTarget}
                editLabel="Distribute"
                onDelete={setDeleteTarget}
            />

            <DistributionSettingsDialog
                distribution={settingsTarget}
                onClose={() => setSettingsTarget(null)}
            />

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onConfirm={() => {
                    router.delete('/admin/assignments/' + deleteTarget.distribution_id, {
                        onSuccess: () => setDeleteTarget(null),
                    });
                }}
                onCancel={() => setDeleteTarget(null)}
                title="Remove Distribution"
                message="Remove this questionnaire distribution?"
                confirmLabel="Remove"
            />
        </AdminLayout>
    );
}
