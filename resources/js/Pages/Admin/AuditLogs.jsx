import ResourceTable from '@/Components/Admin/ResourceTable';
import AdminLayout from '@/Layouts/AdminLayout';

const COLUMNS = [
    { key: 'created_at', label: 'When', render: (r) => r.created_at ?? '-' },
    { key: 'actor_email', label: 'Actor', render: (r) => r.actor_email ?? '-' },
    { key: 'actor_type', label: 'Role' },
    { key: 'event', label: 'Event', render: (r) => r.event ?? r.action ?? '-' },
    { key: 'details', label: 'Details', render: (r) => r.details ?? r.target ?? '-' },
    { key: 'ip_address', label: 'IP' },
];

export default function AuditLogs({ logs, filters }) {
    return (
        <AdminLayout title="Audit Logs" activeRoute="admin.audit-logs" breadcrumbs={['System']}>
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900">Audit Logs</h2>
                <p className="text-sm text-slate-500">
                    Record of admin logins, report printing, exports, and admin actions.
                </p>
            </div>

            <ResourceTable
                columns={COLUMNS}
                data={logs}
                filters={filters}
                routeName="admin.audit-logs"
                searchPlaceholder="Search actor / event / target / IP..."
            />
        </AdminLayout>
    );
}
