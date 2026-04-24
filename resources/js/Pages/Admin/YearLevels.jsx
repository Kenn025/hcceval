import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const ROUTE_MAP = {
    college: 'admin.college.year-levels',
    'senior-high': 'admin.senior-high.year-levels',
    'junior-high': 'admin.junior-high.grade-levels',
    'grade-school': 'admin.grade-school.grade-levels',
};

export default function YearLevels({
    yearLevels,
    filters,
    educationType,
    educationLevelName,
    branches,
    selectedBranchId,
    scopedBranchId,
    programs,
    advisers,
}) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const activeRoute = ROUTE_MAP[educationType] ?? 'admin.college.year-levels';
    const activeBranchId = String(selectedBranchId ?? scopedBranchId ?? '');
    const activeBranch = branches.find((branch) => String(branch.id) === activeBranchId);

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        branch_id: activeBranchId,
        program_id: '',
        adviser_teacher_id: '',
        year_level: '',
        section: '',
        education_type: educationType,
        is_activated: true,
    });

    const filteredAdvisers = advisers.filter((adviser) => {
        const branchMatches = !data.branch_id || String(adviser.branch_id) === String(data.branch_id);
        const programMatches = !data.program_id || !adviser.program_id || String(adviser.program_id) === String(data.program_id);

        return branchMatches && programMatches;
    });
    const collegeYearLevels = [
        { value: '1', label: '1st Year' },
        { value: '2', label: '2nd Year' },
        { value: '3', label: '3rd Year' },
        { value: '4', label: '4th Year' },
        { value: '5', label: '5th Year' },
    ];

    const openCreate = () => {
        reset();
        setData({
            branch_id: activeBranchId,
            program_id: '',
            adviser_teacher_id: '',
            year_level: '',
            section: '',
            education_type: educationType,
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
            adviser_teacher_id: String(row.adviser_teacher_id ?? ''),
            year_level: row.year_level ?? '',
            section: row.section ?? '',
            education_type: educationType,
            is_activated: Boolean(row.is_activated),
        });
        clearErrors();
        setEditing(row);
        setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        const base = '/admin/year-levels';
        const url = editing ? base + '/' + editing.id : base;
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
        { key: 'display_name', label: 'Name' },
        { key: 'year_level', label: 'Year/Grade' },
        { key: 'section', label: 'Section' },
        { key: 'department', label: 'Department', render: (row) => row.department?.name ?? '-' },
        { key: 'program', label: 'Program', render: (row) => row.program?.name ?? '-' },
        { key: 'is_activated', label: 'Status', render: (row) => <StatusBadge active={row.is_activated} /> },
    ];

    const titleMap = {
        college: 'College Year Levels',
        'senior-high': 'Senior High Grade Levels',
        'junior-high': 'Junior High Grade Levels',
        'grade-school': 'Grade School Grade Levels',
    };

    return (
        <AdminLayout title={titleMap[educationType]} activeRoute={activeRoute} breadcrumbs={['Academic Setup', educationLevelName]}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">{titleMap[educationType]}</h2>
                    <p className="text-sm text-slate-500">Manage year/grade levels for {educationLevelName}.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">+ New Level</button>
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

            <ResourceTable columns={columns} data={yearLevels} filters={filters} routeName={activeRoute} searchPlaceholder="Search levels..." onEdit={openEdit} onDelete={setDeleteTarget} />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Level' : 'New Level'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch" error={errors.branch_id} required>
                        <div className="text-base font-medium text-slate-800">
                            {activeBranch?.name ?? 'No branch selected'}
                        </div>
                    </FormField>

                    {educationType === 'college' && (
                        <FormField label="Program" error={errors.program_id} required>
                            <SelectInput value={data.program_id} onChange={(e) => {
                                setData({
                                    ...data,
                                    program_id: e.target.value,
                                    adviser_teacher_id: '',
                                });
                            }}>
                                <option value="">Select program...</option>
                                {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <FormField label={educationType === 'college' ? 'Year Level' : 'Grade Level'} error={errors.year_level} required>
                            {educationType === 'college' ? (
                                <SelectInput value={data.year_level} onChange={(e) => setData('year_level', e.target.value)}>
                                    <option value="">Select year level...</option>
                                    {collegeYearLevels.map((level) => <option key={level.value} value={level.value}>{level.label}</option>)}
                                </SelectInput>
                            ) : (
                                <TextInput value={data.year_level} onChange={(e) => setData('year_level', e.target.value)} placeholder="11" />
                            )}
                        </FormField>
                        <FormField label="Section" error={errors.section} required>
                            <TextInput value={data.section} onChange={(e) => setData('section', e.target.value)} placeholder="A" />
                        </FormField>
                    </div>

                    {educationType === 'college' && (
                        <FormField label="Adviser Assignment" error={errors.adviser_teacher_id}>
                            <SelectInput value={data.adviser_teacher_id} onChange={(e) => setData('adviser_teacher_id', e.target.value)} disabled={!data.program_id}>
                                <option value="">Select adviser...</option>
                                {filteredAdvisers.map((adviser) => <option key={adviser.id} value={adviser.id}>{adviser.full_name}</option>)}
                            </SelectInput>
                        </FormField>
                    )}

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

            <ConfirmDialog open={Boolean(deleteTarget)} onConfirm={() => { router.delete('/admin/year-levels/' + deleteTarget.id, { onSuccess: () => setDeleteTarget(null) }); }} onCancel={() => setDeleteTarget(null)} title="Delete Level" message={`Delete "${deleteTarget?.display_name ?? deleteTarget?.code}"?`} />
        </AdminLayout>
    );
}
