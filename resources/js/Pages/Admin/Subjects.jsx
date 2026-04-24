import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const ROUTE_MAP = {
    college: 'admin.college.subjects',
    'senior-high': 'admin.senior-high.subjects',
    'junior-high': 'admin.junior-high.subjects',
    'grade-school': 'admin.grade-school.subjects',
};

export default function Subjects({
    subjects,
    filters,
    educationType,
    educationLevelName,
    subjectType,
    branches,
    selectedBranchId,
    scopedBranchId,
    programs,
    strands,
}) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeRoute = ROUTE_MAP[educationType] ?? 'admin.college.subjects';
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const activeBranch = branches.find((branch) => String(branch.id) === activeBranchId);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        branch_id: activeBranchId,
        program_id: '',
        strand_id: '',
        name: '',
        type: subjectType,
        is_gened: false,
        is_activated: true,
    });

    const openCreate = () => {
        reset();
        setData({
            branch_id: activeBranchId,
            program_id: '',
            strand_id: '',
            name: '',
            type: subjectType,
            is_gened: false,
            is_activated: true,
        });
        clearErrors();
        setEditing(null);
        setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({
            branch_id: String(row.department?.branch_id ?? activeBranchId),
            program_id: String(row.program_id ?? ''),
            strand_id: String(row.strand_id ?? ''),
            name: row.name ?? '',
            type: row.type ?? subjectType,
            is_gened: Boolean(row.is_gened),
            is_activated: Boolean(row.is_activated),
        });
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const url = editing ? '/admin/subjects/' + editing.id : '/admin/subjects';
        (editing ? router.put : router.post)(url, data, {
            onSuccess: () => {
                setSlideOpen(false);
                reset();
            },
        });
    };

    const switchBranch = (branchId) => {
        router.get(route(activeRoute), {
            ...filters,
            branch_id: branchId,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Subject Name' },
        { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
        {
            key: 'program_or_strand',
            label: educationType === 'college' ? 'Program' : educationType === 'senior-high' ? 'Strand' : 'Level',
            render: (row) => educationType === 'college'
                ? (row.program?.name ?? '-')
                : educationType === 'senior-high'
                    ? (row.strand?.name ?? '-')
                    : (educationType === 'junior-high' ? 'Junior High' : 'Grade School'),
        },
        { key: 'is_gened', label: 'GenEd', render: (row) => row.is_gened ? 'Yes' : 'No' },
        { key: 'is_activated', label: 'Status', render: (row) => <StatusBadge active={row.is_activated} /> },
    ];

    const titleMap = {
        college: 'College Subjects',
        'senior-high': 'Senior High Subjects',
        'junior-high': 'Junior High Subjects',
        'grade-school': 'Grade School Subjects',
    };

    return (
        <AdminLayout title={titleMap[educationType]} activeRoute={activeRoute} breadcrumbs={['Academic Setup', educationLevelName]}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{titleMap[educationType]}</h2>
                    <p className="text-sm text-slate-500">Subject catalog for {educationLevelName} level courses.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Subject</button>
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

            <ResourceTable columns={columns} data={subjects} filters={filters} routeName={activeRoute} searchPlaceholder="Search subjects..." onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Subject' : 'New Subject'} width="max-w-lg">
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch" error={errors.branch_id} required>
                        <div className="text-base font-medium text-slate-800">
                            {activeBranch?.name ?? 'No branch selected'}
                        </div>
                    </FormField>

                    {educationType === 'college' && (
                        <FormField label="Program" error={errors.program_id} required>
                            <SelectInput value={data.program_id} onChange={(e) => setData('program_id', e.target.value)}>
                                <option value="">Select program...</option>
                                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    {educationType === 'senior-high' && (
                        <FormField label="Strand" error={errors.strand_id}>
                            <SelectInput value={data.strand_id} onChange={(e) => setData('strand_id', e.target.value)}>
                                <option value="">Select strand...</option>
                                {strands.map((strand) => <option key={strand.id} value={strand.id}>{strand.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    {(educationType === 'junior-high' || educationType === 'grade-school') && (
                        <FormField label="Grade Level" error={errors.type}>
                            <div className="text-base font-medium text-slate-800">
                                {educationType === 'junior-high' ? 'Junior High' : 'Grade School'}
                            </div>
                        </FormField>
                    )}

                    <FormField label="Subject Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} />
                    </FormField>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_gened} onChange={(e) => setData('is_gened', e.target.checked)} className="rounded border-slate-300" /> General Education Subject
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={data.is_activated} onChange={(e) => setData('is_activated', e.target.checked)} className="rounded border-slate-300" /> Active
                    </label>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-60">
                            {processing ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete('/admin/subjects/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Subject" message={`Delete "${deleteTarget?.name}"?`} />
        </AdminLayout>
    );
}
