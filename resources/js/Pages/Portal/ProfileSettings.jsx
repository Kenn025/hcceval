import AppIcon from "@/Components/AppIcon";
import PortalLayout from "@/Layouts/PortalLayout";
import { router, useForm } from "@inertiajs/react";
import { useEffect, useMemo } from "react";

function Field({ label, children, error }) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {label}
            </span>
            {children}
            {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
        </label>
    );
}

function InfoItem({ label, value }) {
    if (!value) return null;

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                {label}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
        </div>
    );
}

export default function ProfileSettings({ account, status }) {
    const form = useForm({
        _method: "patch",
        email: account.email ?? "",
        profile_photo: null,
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const photoPreview = useMemo(() => {
        if (!form.data.profile_photo) return account.photoUrl;
        return URL.createObjectURL(form.data.profile_photo);
    }, [account.photoUrl, form.data.profile_photo]);

    useEffect(() => {
        return () => {
            if (photoPreview && photoPreview !== account.photoUrl) {
                URL.revokeObjectURL(photoPreview);
            }
        };
    }, [account.photoUrl, photoPreview]);

    const sidebarDetails = [
        { label: "Department", value: account.department },
        { label: account.programOrStrandLabel, value: account.programOrStrand },
        { label: "Campus", value: account.branch },
    ].filter((item) => item.value);

    const navToDashboard = (key) => {
        router.visit(route(account.dashboardRoute), {
            data: { tab: key },
            preserveScroll: false,
        });
    };

    const submit = (event) => {
        event.preventDefault();

        form.post(route("portal.profile.update"), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset("profile_photo", "current_password", "password", "password_confirmation");
            },
        });
    };

    return (
        <PortalLayout
            title="Profile Settings"
            user={{
                id: account.id,
                name: account.name,
                photo_url: account.photoUrl,
                branch: account.branch,
            }}
            userType={account.userType}
            activeNav="profile-settings"
            onNavChange={navToDashboard}
            sidebarDetails={sidebarDetails}
        >
            <div className="w-full">
                <div className="mb-5">
                    <h2 className="text-base font-semibold text-slate-800">
                        Profile Settings
                    </h2>
                    <p className="text-xs text-slate-400">
                        Manage your account email and password.
                    </p>
                </div>

                {status === "profile-updated" && (
                    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                        Profile settings updated.
                    </div>
                )}

                <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(520px,1.35fr)]">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center gap-3">
                            {photoPreview ? (
                                <img
                                    src={photoPreview}
                                    alt=""
                                    className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200"
                                />
                            ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <AppIcon name="profile" className="h-6 w-6" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-900">
                                    {account.name}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {account.portalLabel}
                                </p>
                            </div>
                        </div>

                        <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-blue-200 bg-blue-50/60 px-3 py-2.5 text-sm font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50">
                            <AppIcon name="upload" className="h-4 w-4" />
                            Upload a Photo
                            <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(event) => form.setData("profile_photo", event.target.files?.[0] ?? null)}
                            />
                        </label>
                        {form.errors.profile_photo && (
                            <p className="-mt-2 mb-3 text-xs font-medium text-rose-600">
                                {form.errors.profile_photo}
                            </p>
                        )}

                        <div className="space-y-2">
                            <InfoItem label="Account Code" value={account.code} />
                            <InfoItem label="Department" value={account.department} />
                            <InfoItem label={account.programOrStrandLabel} value={account.programOrStrand} />
                            <InfoItem label="Campus" value={account.branch} />
                        </div>
                    </div>

                    <form
                        onSubmit={submit}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="space-y-4">
                            <Field label="Email Address" error={form.errors.email}>
                                <input
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) => form.setData("email", event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    autoComplete="email"
                                />
                            </Field>

                            <div className="border-t border-slate-100 pt-4">
                                <p className="text-sm font-semibold text-slate-800">
                                    Change Password
                                </p>
                                <p className="mt-0.5 text-xs text-slate-400">
                                    Leave these fields blank to keep your current password.
                                </p>
                            </div>

                            <Field label="Current Password" error={form.errors.current_password}>
                                <input
                                    type="password"
                                    value={form.data.current_password}
                                    onChange={(event) => form.setData("current_password", event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    autoComplete="current-password"
                                />
                            </Field>

                            <Field label="New Password" error={form.errors.password}>
                                <input
                                    type="password"
                                    value={form.data.password}
                                    onChange={(event) => form.setData("password", event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    autoComplete="new-password"
                                />
                            </Field>

                            <Field label="Confirm Password" error={form.errors.password_confirmation}>
                                <input
                                    type="password"
                                    value={form.data.password_confirmation}
                                    onChange={(event) => form.setData("password_confirmation", event.target.value)}
                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    autoComplete="new-password"
                                />
                            </Field>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                type="submit"
                                disabled={form.processing}
                                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </PortalLayout>
    );
}
