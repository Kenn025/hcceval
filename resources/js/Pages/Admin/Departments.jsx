import ResourceTable from '@/Components/Admin/ResourceTable';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';

export default function Departments({ departments, filters, branches, selectedBranchId }) {
    const toggleDepartmentActivation = (departmentId) => {
        router.post(route('admin.departments.toggle-activation', { department: departmentId }), {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };
    const activeBranchId = String(selectedBranchId ?? filters.branch_id ?? '');

    const switchBranch = (branchId) => {
        router.get(route('admin.departments'), {
            ...filters,
            branch_id: branchId,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Name' },
        { key: 'branch', label: 'Branch', render: (r) => r.branch?.name ?? '-' },
        { key: 'is_activated', label: 'Is Active', render: (r) => <StatusBadge active={r.is_activated} /> },
    ];

    return (
        <AdminLayout title="Departments" activeRoute="admin.departments" breadcrumbs={['System Controls']}>
            <div className="mb-4">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Departments</h2>
                    <p className="text-sm text-slate-500">View branch departments and activate inactive records.</p>
                </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {branches.map((branch) => {
                    const isActive = String(branch.id) === activeBranchId;

                    return (
                        <button
                            key={branch.id}
                            type="button"
                            onClick={() => switchBranch(branch.id)}
                            className={[
                                'rounded-full border px-4 py-2 text-sm font-medium transition',
                                isActive
                                    ? 'border-slate-900 bg-slate-900 text-white'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
                            ].join(' ')}
                        >
                            {branch.name}
                        </button>
                    );
                })}
            </div>

            <ResourceTable
                columns={columns}
                data={departments}
                filters={filters}
                routeName="admin.departments"
                searchPlaceholder="Search departments..."
                rowActions={(row) => (
                    <button
                        type="button"
                        onClick={() => toggleDepartmentActivation(row.id)}
                        role="switch"
                        aria-checked={row.is_activated}
                        aria-label={row.is_activated ? 'Deactivate department' : 'Activate department'}
                        className={[
                            'relative inline-flex h-7 w-12 items-center rounded-full border transition',
                            row.is_activated
                                ? 'border-emerald-200 bg-emerald-500'
                                : 'border-slate-300 bg-slate-200 hover:bg-slate-300',
                        ].join(' ')}
                    >
                        <span
                            className={[
                                'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
                                row.is_activated ? 'translate-x-6' : 'translate-x-1',
                            ].join(' ')}
                        />
                    </button>
                )}
            />
        </AdminLayout>
    );
}
