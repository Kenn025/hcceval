import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import FormField, { SelectInput, TextInput } from '@/Components/Admin/FormField';
import ResourceTable from '@/Components/Admin/ResourceTable';
import SlideOver from '@/Components/Admin/SlideOver';
import StatusBadge from '@/Components/Admin/StatusBadge';
import AdminLayout from '@/Layouts/AdminLayout';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

const HIGHEST_DEPT_OPTIONS = [
    { value: 'elementary', label: 'Elementary' },
    { value: 'junior_high', label: 'Junior High' },
    { value: 'senior_high', label: 'Senior High' },
    { value: 'college', label: 'College' },
];

export default function Branches({ branches, filters }) {
    const [slideOpen, setSlideOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data, setData, post, put, errors, processing, reset, clearErrors } = useForm({
        code: '', name: '', highest_department: 'college', address: '', is_main: false, is_active: true,
    });

    const openCreate = () => {
        reset(); clearErrors(); setEditing(null); setSlideOpen(true);
    };

    const openEdit = (row) => {
        setData({ code: row.code, name: row.name, highest_department: row.highest_department ?? 'college', address: row.address ?? '', is_main: Boolean(row.is_main), is_active: Boolean(row.is_active) });
        clearErrors(); setEditing(row); setSlideOpen(true);
    };

    const submit = (e) => {
        e.preventDefault();
        if (editing) {
            router.put(route('admin.branches') + '/' + editing.id, data, {
                onSuccess: () => { setSlideOpen(false); reset(); },
            });
        } else {
            router.post(route('admin.branches'), data, {
                onSuccess: () => { setSlideOpen(false); reset(); },
            });
        }
    };

    const confirmDelete = () => {
        router.delete(route('admin.branches') + '/' + deleteTarget.id, {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const columns = [
        { key: 'code', label: 'Code' },
        { key: 'name', label: 'Branch Name' },
        { key: 'highest_department', label: 'Highest Dept.' },
        { key: 'departments_count', label: 'Departments', render: (r) => r.departments_count ?? 0 },
        { key: 'is_active', label: 'Status', render: (r) => <StatusBadge active={r.is_active} /> },
    ];

    return (
        <AdminLayout title="Branches" activeRoute="admin.branches" breadcrumbs={['System Controls']}>
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-slate-900">Branches</h2>
                    <p className="text-sm text-slate-500">Manage campus branches and their admin accounts.</p>
                </div>
                <button onClick={openCreate} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
                    + New Branch
                </button>
            </div>

            <ResourceTable
                columns={columns}
                data={branches}
                filters={filters}
                routeName="admin.branches"
                searchPlaceholder="Search branches…"
                onEdit={openEdit}
                onDelete={setDeleteTarget}
            />

            <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title={editing ? 'Edit Branch' : 'New Branch'}>
                <form onSubmit={submit} className="space-y-4">
                    <FormField label="Branch Code" error={errors.code} required>
                        <TextInput value={data.code} onChange={(e) => setData('code', e.target.value)} placeholder="e.g. HCC-MAIN" />
                    </FormField>
                    <FormField label="Branch Name" error={errors.name} required>
                        <TextInput value={data.name} onChange={(e) => setData('name', e.target.value)} placeholder="Main Campus" />
                    </FormField>
                    <FormField label="Highest Department" error={errors.highest_department}>
                        <SelectInput value={data.highest_department} onChange={(e) => setData('highest_department', e.target.value)}>
                            {HIGHEST_DEPT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </SelectInput>
                    </FormField>
                    <FormField label="Address" error={errors.address}>
                        <TextInput value={data.address} onChange={(e) => setData('address', e.target.value)} placeholder="Branch address" />
                    </FormField>
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={data.is_main} onChange={(e) => setData('is_main', e.target.checked)} className="rounded border-slate-300" />
                            Main Campus
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={data.is_active} onChange={(e) => setData('is_active', e.target.checked)} className="rounded border-slate-300" />
                            Active
                        </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setSlideOpen(false)} className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={processing} className="flex-1 rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60">
                            {processing ? 'Saving…' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </SlideOver>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
                title="Delete Branch"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
            />
        </AdminLayout>
    );
}
