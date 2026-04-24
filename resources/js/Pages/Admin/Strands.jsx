import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import SubmitButton from '@/Components/Admin/SubmitButton';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const stripCampusSuffix = (value) => String(value ?? '').replace(/\s*-\s*(Santa Rosa|Concepcion)\s*$/i, '').trim();

export default function Strands({ strands, filters, branches, selectedBranchId, scopedBranchId, advisers, strandNameOptions }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        branch_id: activeBranchId,
        name: '',
        adviser_teacher_id: '',
        is_activated: true,
    });

    const filteredAdvisers = useMemo(
        () => advisers.filter((adviser) => {
            const adviserBranchId = adviser.department_branch_id ?? adviser.branch_id;
            const branchMatches = !data.branch_id || String(adviserBranchId) === String(data.branch_id);
            return branchMatches;
        }),
        [advisers, data.branch_id],
    );

    const openCreate = () => {
        reset();
        setData({
            branch_id: activeBranchId,
            name: '',
            adviser_teacher_id: '',
            is_activated: true,
        });
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({
            branch_id: String(row.department?.branch_id ?? activeBranchId),
            name: row.name ?? '',
            adviser_teacher_id: String(row.assigned_adviser?.id ?? ''),
            is_activated: Boolean(row.is_activated),
        });
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const openView = (row) => {
        setViewing(row);
        setDetailOpen(true);
    };

    const editFromDetails = () => {
        if (!viewing) return;
        openEdit(viewing);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.senior-high.strands') + '/' + editing.id : route('admin.senior-high.strands');
        const request = editing
            ? (targetUrl, payload, options) => router.put(targetUrl, payload, options)
            : (targetUrl, payload, options) => router.post(targetUrl, payload, options);

        request(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
        });
    };

    const switchBranch = (branchId) => {
        router.get(route('admin.senior-high.strands'), {
            ...filters,
            branch_id: branchId,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Strand Name', render: (row) => stripCampusSuffix(row.name) || '-' },
        { key: 'branch', label: 'Branch', render: (row) => row.department?.branch?.name ?? '-' },
        { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
        { key: 'assigned_adviser', label: 'Assigned Adviser', render: (row) => row.assigned_adviser_name ?? '-' },
        { key: 'is_activated', label: 'Status', render: (row) => <StatusBadge active={row.is_activated} /> },
    ];

    return (
        <AdminLayout title="Senior High Strands" activeRoute="admin.senior-high.strands" breadcrumbs={['Academic Setup', 'Senior High']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Senior High Strands</h2>
                    <p className="text-sm text-slate-500">Track and strand administration for senior high school.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Strand</button>
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

            <ResourceTable columns={columns} data={strands} filters={filters} routeName="admin.senior-high.strands" searchPlaceholder="Search strands..." onRowClick={openView} onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={detailOpen} onClose={() => setDetailOpen(false)} title="Strand Information">
                {viewing && (
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">{viewing.name ?? '-'}</h3>
                            <p className="mt-1 text-sm text-slate-600">{viewing.code ?? '-'}</p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Branch</p><p className="mt-1 text-sm text-slate-900">{viewing.department?.branch?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Department</p><p className="mt-1 text-sm text-slate-900">{viewing.department?.name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned Adviser</p><p className="mt-1 text-sm text-slate-900">{viewing.assigned_adviser_name ?? '-'}</p></div>
                            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p><div className="mt-1"><StatusBadge active={viewing.is_activated} /></div></div>
                        </div>

                        <button type="button" onClick={editFromDetails} className="w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800">
                            Edit Strand
                        </button>
                    </div>
                )}
            </SlideOver>

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Strand' : 'New Strand'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch" error={errors.branch_id} required>
                        <SelectInput value={data.branch_id} onChange={(e) => setData({
                            ...data,
                            branch_id: e.target.value,
                            adviser_teacher_id: '',
                        })}>
                            <option value="">Select branch...</option>
                            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                        </SelectInput>
                    </FormField>

                    <FormField label="Strand Name" error={errors.name} required>
                        <SelectInput value={data.name} onChange={(e) => setData('name', e.target.value)}>
                            <option value="">Select strand...</option>
                            {strandNameOptions.map((strandName) => <option key={strandName} value={strandName}>{strandName}</option>)}
                        </SelectInput>
                    </FormField>

                    <FormField label="Assigned Adviser" error={errors.adviser_teacher_id}>
                        <SelectInput value={data.adviser_teacher_id} onChange={(e) => setData('adviser_teacher_id', e.target.value)}>
                            <option value="">Select adviser...</option>
                            {!filteredAdvisers.length && data.branch_id && <option value="" disabled>No Senior High advisers found for this branch.</option>}
                            {filteredAdvisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.full_name}</option>)}
                        </SelectInput>
                    </FormField>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_activated} onChange={(e) => setData('is_activated', e.target.checked)} className="rounded border-slate-300" /> Active
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <SubmitButton processing={processing} className="flex-1">
                            {editing ? 'Update' : 'Create'}
                        </SubmitButton>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.senior-high.strands') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Strand" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
