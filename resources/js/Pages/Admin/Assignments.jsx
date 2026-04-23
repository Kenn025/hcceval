import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import ResourceTable from '@/Components/Admin/ResourceTable';
import AdminLayout from '@/Layouts/AdminLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const ROUTE_MAP = {
    subject: 'admin.subject-assignments',
    peer: 'admin.peer-assignments',
    employee: 'admin.employee-assignments',
};

const TITLE_MAP = {
    subject: 'Subject Assignments',
    peer: 'Peer Assignments',
    employee: 'Employee Assignments',
};

export default function Assignments({ assignments, assignmentType, filters, questionnaires, subjects }) {
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeRoute = ROUTE_MAP[assignmentType] ?? 'admin.subject-assignments';

    const columns = [
        { key: 'distribution_id', label: '#' },
        { key: 'questionnaire_title', label: 'Questionnaire', render: (r) => r.questionnaire_title ?? '—' },
        ...(assignmentType === 'subject' ? [{ key: 'subject_name', label: 'Subject', render: (r) => r.subject_name ?? '—' }] : []),
        { key: 'target_type', label: 'Target Type', render: (r) => r.target_type ?? '—' },
        { key: 'school_year', label: 'School Year', render: (r) => r.school_year ?? '—' },
        { key: 'semester', label: 'Semester', render: (r) => r.semester ?? '—' },
    ];

    return (
        <AdminLayout title={TITLE_MAP[assignmentType]} activeRoute={activeRoute} breadcrumbs={['Question Bank']}>
            <div className="mb-4">
                <h2 className="text-base font-semibold text-slate-900">{TITLE_MAP[assignmentType]}</h2>
                <p className="text-sm text-slate-500">Questionnaire assignment rules for {assignmentType} evaluations.</p>
            </div>

            <ResourceTable
                columns={columns}
                data={assignments}
                filters={filters}
                routeName={activeRoute}
                searchPlaceholder="Search assignments…"
                onDelete={setDeleteTarget}
            />

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onConfirm={() => { router.delete('/admin/assignments/' + deleteTarget.distribution_id, { onSuccess: () => setDeleteTarget(null) }); }}
                onCancel={() => setDeleteTarget(null)}
                title="Remove Assignment"
                message="Remove this questionnaire assignment?"
                confirmLabel="Remove"
            />
        </AdminLayout>
    );
}
