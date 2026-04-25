import ConfirmDialog from '@/Components/Admin/ConfirmDialog';
import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function BranchSummaryCard({ branch, featured = false, selected = false, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={[
                'w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/60',
                featured ? 'border-blue-200 bg-blue-50/40' : '',
                selected ? 'border-blue-400 ring-2 ring-blue-100' : '',
            ].join(' ')}
        >
            <div className="flex items-start gap-3">
                <div className={[
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                    featured || selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700',
                ].join(' ')}>
                    <AppIcon name="branches" className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{branch.name}</p>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{branch.code}</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                    ['Departments', branch.departments_count],
                    ['Programs', branch.programs_count],
                    ['Strands', branch.strands_count],
                ].map(([label, value]) => (
                    <div key={label} className={['rounded-lg px-3 py-2', featured || selected ? 'bg-white' : 'bg-slate-50'].join(' ')}>
                        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
                        <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{Number(value ?? 0).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </button>
    );
}

function BranchSummaryDetail({ branch }) {
    if (!branch) {
        return null;
    }

    const overviewItems = [
        ['Departments', branch.departments_count, 'departments'],
        ['Programs', branch.programs_count, 'programs'],
        ['Strands', branch.strands_count, 'layers'],
    ];
    const totalSetupItems = overviewItems.reduce((sum, [, value]) => sum + Number(value ?? 0), 0);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <AppIcon name="branches" className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected Branch</p>
                        <h4 className="mt-1 truncate text-lg font-semibold text-slate-900">{branch.name}</h4>
                        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-slate-500">{branch.code}</p>
                    </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Setup</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{totalSetupItems.toLocaleString()}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {overviewItems.map(([label, value, icon]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                            <AppIcon name={icon} className="h-4 w-4" />
                            <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
                        </div>
                        <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{Number(value ?? 0).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function OverallBranchSummary({ branch, campusBranches = [] }) {
    if (!branch) {
        return null;
    }

    const totals = campusBranches.reduce((summary, campusBranch) => ({
        departments: summary.departments + Number(campusBranch.departments_count ?? 0),
        programs: summary.programs + Number(campusBranch.programs_count ?? 0),
        strands: summary.strands + Number(campusBranch.strands_count ?? 0),
    }), { departments: 0, programs: 0, strands: 0 });

    return (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <AppIcon name="branches" className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Branch</p>
                        <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">{branch.name}</h3>
                        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-slate-500">{branch.code}</p>
                    </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Campus Branches</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{campusBranches.length.toLocaleString()}</p>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                    ['Departments', totals.departments, 'departments'],
                    ['Programs', totals.programs, 'programs'],
                    ['Strands', totals.strands, 'layers'],
                ].map(([label, value, icon]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-500">
                            <AppIcon name={icon} className="h-4 w-4" />
                            <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
                        </div>
                        <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{Number(value ?? 0).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BranchSummarySection({ branches = [] }) {
    const [selectedBranchId, setSelectedBranchId] = useState(null);

    const overallBranch = branches.find((branch) => (
        String(branch.code ?? '').toUpperCase() === 'OVERALL'
        || String(branch.name ?? '').toLowerCase().includes('overall')
    ));
    const campusBranches = branches.filter((branch) => branch.id !== overallBranch?.id);
    const selectedBranch = campusBranches.find((branch) => String(branch.id) === String(selectedBranchId));

    if (!overallBranch && !campusBranches.length) {
        return null;
    }

    return (
        <section className="mt-6">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-slate-700">Branch Overview</h3>
                    <p className="text-xs text-slate-500">{campusBranches.length} campus branch{campusBranches.length === 1 ? '' : 'es'} with academic setup counts.</p>
                </div>
            </div>

            <OverallBranchSummary branch={overallBranch} campusBranches={campusBranches} />

            <div className="grid gap-3 xl:grid-cols-3">
                <div className="space-y-3">
                    {campusBranches.map((branch) => (
                        <BranchSummaryCard
                            key={branch.id}
                            branch={branch}
                            selected={String(branch.id) === String(selectedBranch?.id)}
                            onSelect={() => setSelectedBranchId(branch.id)}
                        />
                    ))}
                </div>

                {selectedBranch ? <BranchSummaryDetail branch={selectedBranch} /> : null}
            </div>
        </section>
    );
}

function FlowStatusRow({ flow, branchId }) {
    const href = flow.route_name
        ? route(flow.route_name, branchId ? { branch_id: branchId } : {})
        : null;
    const content = (
        <>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">{flow.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{flow.loaded}/{flow.total} {flow.scope_label}</p>
                </div>
                <span className={[
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                    flow.is_complete
                        ? 'bg-emerald-50 text-emerald-700'
                        : flow.loaded > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600',
                ].join(' ')}>
                    {flow.status}
                </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                    className={['h-full rounded-full', flow.is_complete ? 'bg-emerald-500' : 'bg-blue-600'].join(' ')}
                    style={{ width: `${flow.percent}%` }}
                />
            </div>
        </>
    );

    if (href) {
        return (
            <Link
                href={href}
                className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-200 hover:bg-blue-50"
            >
                {content}
            </Link>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
            {content}
        </div>
    );
}

function DepartmentStatusModal({ department, onClose, onStartEvaluation }) {
    if (!department) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
            <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{department.branch}</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-900">{department.name}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Progress across this department's evaluation scope plus overall Employee Feedback setup.
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

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-slate-700">Overall</span>
                        <span className="text-slate-500">{department.loaded}/{department.total} evaluation items</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className={['h-full rounded-full', department.is_complete ? 'bg-emerald-500' : 'bg-blue-600'].join(' ')}
                            style={{ width: `${department.percent}%` }}
                        />
                    </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {(department.flows ?? []).map((flow) => (
                        <FlowStatusRow key={flow.label} flow={flow} branchId={department.branch_id} />
                    ))}
                </div>

                <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
                    <button
                        type="button"
                        onClick={() => onStartEvaluation(department)}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        <AppIcon name="calendar" className="h-4 w-4" />
                        Start Evaluation
                    </button>
                </div>
            </div>
        </div>
    );
}

function DepartmentStatusCard({ department, onOpen, onStartEvaluation }) {
    const isComplete = department.is_complete;
    const hasProgress = department.loaded > 0;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onOpen(department)}
            onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(department);
                }
            }}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{department.name}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{department.branch}</p>
                </div>
                <span className={[
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold',
                    isComplete
                        ? 'bg-emerald-50 text-emerald-700'
                        : hasProgress
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600',
                ].join(' ')}>
                    {department.status}
                </span>
            </div>

            <div className="mt-4">
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={['h-full rounded-full transition-all', isComplete ? 'bg-emerald-500' : 'bg-blue-600'].join(' ')}
                        style={{ width: `${department.percent}%` }}
                    />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{department.percent}% ready</span>
                    <span>{department.loaded}/{department.total} {department.scope_label}</span>
                </div>
            </div>

            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    onStartEvaluation(department);
                }}
                className={[
                    'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
                    isComplete
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800',
                ].join(' ')}
            >
                <AppIcon name="calendar" className="h-4 w-4" />
                Start Evaluation
            </button>
        </div>
    );
}

const QUICK_LINKS = [
    { label: 'Branches', route: 'admin.branches', icon: 'branches', desc: 'Campus branches' },
    { label: 'Departments', route: 'admin.departments', icon: 'departments', desc: 'Academic departments' },
    { label: 'Programs', route: 'admin.college.programs', icon: 'programs', desc: 'Degree programs' },
    { label: 'Students', route: 'admin.students', icon: 'students', desc: 'Student directory' },
    { label: 'Teachers', route: 'admin.teachers', icon: 'teachers', desc: 'Faculty directory' },
    { label: 'Employees', route: 'admin.employees', icon: 'briefcase', desc: 'Staff directory' },
    { label: 'Questionnaires', route: 'admin.questionnaires', icon: 'questions', desc: 'Questionnaire builder' },
    { label: 'Peer Ratings', route: 'admin.peer-ratings', icon: 'group', desc: 'Peer evaluations' },
];

export default function Dashboard({ branchSummaries = [], departmentStatuses = [] }) {
    const { activeAcademicYear } = usePage().props;
    const [selectedDepartmentStatus, setSelectedDepartmentStatus] = useState(null);
    const [startWarningTarget, setStartWarningTarget] = useState(null);
    const readyDepartments = departmentStatuses.filter((department) => department.is_complete).length;
    const branchTabs = useMemo(() => {
        const tabs = [];

        departmentStatuses.forEach((department) => {
            const key = String(department.branch_id ?? department.branch ?? 'all');

            if (!tabs.some((tab) => tab.key === key)) {
                tabs.push({
                    key,
                    label: department.branch ?? 'All Branches',
                });
            }
        });

        return tabs;
    }, [departmentStatuses]);
    const [activeBranchTab, setActiveBranchTab] = useState(branchTabs[0]?.key ?? 'all');
    const selectedBranchTab = branchTabs.some((tab) => tab.key === activeBranchTab)
        ? activeBranchTab
        : branchTabs[0]?.key ?? 'all';
    const visibleDepartmentStatuses = departmentStatuses.filter((department) => (
        String(department.branch_id ?? department.branch ?? 'all') === selectedBranchTab
    ));
    const visitEvaluationCycle = () => router.visit(route('admin.evaluation-cycle'));
    const handleStartEvaluation = (department) => {
        if ((department?.percent ?? 0) < 100) {
            setStartWarningTarget(department);
            return;
        }

        visitEvaluationCycle();
    };

    return (
        <AdminLayout title="Dashboard" activeRoute="dashboard" breadcrumbs={['HCC Admin']}>
            <div className="mb-6 rounded-xl bg-slate-950 px-6 py-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">HCC Evaluation Platform</p>
                        <h2 className="mt-1 text-xl font-semibold">Welcome to the Admin Dashboard</h2>
                        <p className="mt-1 text-sm text-slate-300">Manage evaluation workflows, users, academic structure, and reports across all campuses.</p>
                    </div>
                    <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
                        <div className="flex items-center gap-2 text-sky-200">
                            <AppIcon name="calendar" className="h-4 w-4" />
                            <span className="text-[10px] font-semibold uppercase tracking-widest">Active Term</span>
                        </div>
                        {activeAcademicYear ? (
                            <>
                                <p className="mt-1 text-sm font-semibold text-white">{activeAcademicYear.school_year}</p>
                                <p className="text-xs text-slate-300">{activeAcademicYear.term}</p>
                            </>
                        ) : (
                            <p className="mt-1 text-sm font-semibold text-white">No active term set</p>
                        )}
                    </div>
                </div>
            </div>

            <BranchSummarySection branches={branchSummaries} />

            <section className="mt-6">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700">Department Evaluation Status</h3>
                        <p className="text-xs text-slate-500">
                            {readyDepartments}/{departmentStatuses.length} departments ready for evaluation.
                        </p>
                    </div>
                </div>

                {branchTabs.length > 1 ? (
                    <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                        {branchTabs.map((branch) => {
                            const isActive = branch.key === selectedBranchTab;

                            return (
                                <button
                                    key={branch.key}
                                    type="button"
                                    onClick={() => setActiveBranchTab(branch.key)}
                                    className={[
                                        'rounded-xl px-4 py-2 text-sm font-semibold transition',
                                        isActive
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                                    ].join(' ')}
                                >
                                    {branch.label}
                                </button>
                            );
                        })}
                    </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {visibleDepartmentStatuses.map((department) => (
                        <DepartmentStatusCard
                            key={department.id}
                            department={department}
                            onOpen={setSelectedDepartmentStatus}
                            onStartEvaluation={handleStartEvaluation}
                        />
                    ))}
                </div>
            </section>

            <section className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Quick Access</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {QUICK_LINKS.map((item) => (
                        <Link
                            key={item.route}
                            href={route(item.route)}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                                <AppIcon name={item.icon} className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{item.label}</p>
                                <p className="truncate text-xs text-slate-500">{item.desc}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            <DepartmentStatusModal
                department={selectedDepartmentStatus}
                onClose={() => setSelectedDepartmentStatus(null)}
                onStartEvaluation={handleStartEvaluation}
            />

            <ConfirmDialog
                open={Boolean(startWarningTarget)}
                danger={false}
                title="Evaluation setup is incomplete"
                message={startWarningTarget
                    ? `${startWarningTarget.name} is only ${startWarningTarget.percent}% ready. Some questionnaire distribution setup is still incomplete. Continue to Start Evaluation?`
                    : ''}
                confirmLabel="Continue"
                onCancel={() => setStartWarningTarget(null)}
                onConfirm={() => {
                    setStartWarningTarget(null);
                    visitEvaluationCycle();
                }}
            />
        </AdminLayout>
    );
}
