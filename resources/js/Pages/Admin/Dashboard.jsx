import AppIcon from '@/Components/AppIcon';
import AdminLayout from '@/Layouts/AdminLayout';
import { Link } from '@inertiajs/react';

const ICON_MAP = {
    branches: 'branches',
    departments: 'departments',
    programs: 'programs',
    students: 'students',
    teachers: 'teachers',
    briefcase: 'briefcase',
};

function StatCard({ stat }) {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <AppIcon name={ICON_MAP[stat.icon] ?? 'dashboard'} className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{stat.value.toLocaleString()}</p>
            </div>
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

export default function Dashboard({ stats }) {
    return (
        <AdminLayout title="Dashboard" activeRoute="dashboard" breadcrumbs={['HCC Admin']}>
            <div className="mb-6 rounded-xl bg-slate-950 px-6 py-5 text-white">
                <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">HCC Evaluation Platform</p>
                <h2 className="mt-1 text-xl font-semibold">Welcome to the Admin Dashboard</h2>
                <p className="mt-1 text-sm text-slate-300">Manage evaluation workflows, users, academic structure, and reports across all campuses.</p>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {stats.map((stat) => <StatCard key={stat.label} stat={stat} />)}
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
        </AdminLayout>
    );
}
