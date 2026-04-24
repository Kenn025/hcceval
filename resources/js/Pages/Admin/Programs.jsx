import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

export default function Programs({
    programs,
    filters,
    branches,
    chairs,
    programNameOptions,
    scopedBranchId,
    isBranchAdmin,
    selectedBranchId,
}) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const activeBranch = branches.find((branch) => String(branch.id) === activeBranchId);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        branch_id: activeBranchId,
        name: '',
        chair_teacher_id: '',
        duration_years: '',
        is_activated: true,
    });

    const filteredChairs = chairs.filter((chair) => {
        const branchMatches = !data.branch_id || String(chair.branch_id) === String(data.branch_id);
        const assignmentMatches = !chair.program_id || String(chair.program_id) === String(editing?.id ?? '');

        return branchMatches && assignmentMatches;
    });

    const openCreate = () => {
        reset();
        setData({
            branch_id: activeBranchId,
            name: '',
            chair_teacher_id: '',
            duration_years: '',
            is_activated: true,
        });
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({
            branch_id: String(row.department?.branch_id ?? row.branch_id ?? activeBranchId ?? ''),
            name: row.name,
            chair_teacher_id: String(row.assigned_chair?.id ?? ''),
            duration_years: row.duration_years ?? '',
            is_activated: Boolean(row.is_activated),
        });
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const switchBranch = (branchId) => {
        router.get(route('admin.college.programs'), {
            ...filters,
            branch_id: branchId,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? route('admin.college.programs') + '/' + editing.id : route('admin.college.programs');
        (editing ? router.put : router.post)(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
        });
    };

    const columns = [
        { key: 'row_number', label: '#' },
        { key: 'name', label: 'Program Name' },
        { key: 'branch', label: 'Branch', render: (r) => r.department?.branch?.name ?? '-' },
        { key: 'department', label: 'Department', render: (r) => r.department?.name ?? '-' },
        { key: 'assigned_chair', label: 'Assigned Chair', render: (r) => r.assigned_chair_name ?? '-' },
        { key: 'duration_years', label: 'Duration', render: (r) => r.duration_years ? `${r.duration_years} yr(s)` : '-' },
        { key: 'is_activated', label: 'Status', render: (r) => <StatusBadge active={r.is_activated} /> },
    ];

    return (
        <AdminLayout title="College Programs" activeRoute="admin.college.programs" breadcrumbs={['Academic Setup', 'College']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">College Programs</h2>
                    <p className="text-sm text-slate-500">Manage degree programs offered per department.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Program</button>
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

            <ResourceTable columns={columns} data={programs} filters={filters} routeName="admin.college.programs" searchPlaceholder="Search programs..." onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Program' : 'New Program'} width="max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch" error={errors.branch_id} required>
                        <div className="text-base font-medium text-slate-800">
                            {activeBranch?.name ?? 'No branch selected'}
                        </div>
                    </FormField>

                    <FormField label="Program Name" error={errors.name} required>
                        <SelectInput value={data.name} onChange={(e) => setData('name', e.target.value)}>
                            <option value="">Select college program...</option>
                            {programNameOptions.map((programName) => <option key={programName} value={programName}>{programName}</option>)}
                        </SelectInput>
                    </FormField>

                    <FormField label="Assigned Chair" error={errors.chair_teacher_id}>
                        <SelectInput value={data.chair_teacher_id} onChange={(e) => setData('chair_teacher_id', e.target.value)}>
                            <option value="">Select chair...</option>
                            {filteredChairs.map((chair) => <option key={chair.id} value={chair.id}>{chair.full_name}</option>)}
                        </SelectInput>
                    </FormField>

                    <FormField label="Duration (years)" error={errors.duration_years} required>
                        <TextInput type="number" min="1" value={data.duration_years} onChange={(e) => setData('duration_years', e.target.value)} />
                    </FormField>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_activated} onChange={(e) => setData('is_activated', e.target.checked)} className="rounded border-slate-300" /> Active
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                            {processing ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete(route('admin.college.programs') + '/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Program" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
