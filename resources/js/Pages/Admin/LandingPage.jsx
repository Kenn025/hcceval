import FormField, { SelectInput, TextInput } from "@/Components/Admin/FormField";
import ResourceTable from "@/Components/Admin/ResourceTable";
import SubmitButton from "@/Components/Admin/SubmitButton";
import StatusBadge from "@/Components/Admin/StatusBadge";
import AppIcon from "@/Components/AppIcon";
import AdminLayout from "@/Layouts/AdminLayout";
import { router, useForm } from "@inertiajs/react";
import { useEffect, useMemo, useRef, useState } from "react";

function normalizeHeaders(headers = []) {
    return headers.map((row) => ({
        id: row.id ?? null,
        label: String(row.label ?? "").trim(),
        target: String(row.target ?? "").trim(),
        item_type: String(row.item_type ?? "link"),
        sort_order: Number(row.sort_order ?? 0),
        is_active: Boolean(row.is_active),
        logo_file: row.logo_file ? String(row.logo_file.name ?? "") : "",
    }));
}

const ITEM_TYPE_OPTIONS = [
    { value: "link", label: "Link" },
    { value: "logo", label: "Logo" },
    { value: "brand_title", label: "Brand Title" },
    { value: "brand_subtitle", label: "Brand Subtitle" },
    { value: "toggle", label: "Theme Toggle" },
    { value: "signin", label: "Sign In Button" },
];
const HOME_TARGET_TYPES = new Set(["logo", "brand_title", "brand_subtitle"]);

function isImageTarget(value) {
    if (!value) return false;
    const target = String(value).trim();
    if (target === "") return false;

    return (
        target.startsWith("/storage/") ||
        target.startsWith("http://") ||
        target.startsWith("https://") ||
        /\.(png|jpe?g|gif|webp|svg|bmp|ico)(\?.*)?$/i.test(target)
    );
}

export default function LandingPage({ headers, filters }) {
    const [modalOpen, setModalOpen] = useState(false);
    const [pendingScrollToIndex, setPendingScrollToIndex] = useState(null);
    const linkContainerRefs = useRef([]);
    const initialHeadersSnapshotRef = useRef("[]");

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        headers: [],
        delete_ids: [],
    });

    const openEdit = () => {
        clearErrors();
        const mappedHeaders = (headers?.data ?? []).map((row) => ({
            id: row.id,
            label: row.label ?? "",
            target: row.target ?? "",
            item_type: row.item_type ?? "link",
            sort_order: row.sort_order ?? 0,
            is_active: Boolean(row.is_active),
            logo_file: null,
        }));

        setData("headers", mappedHeaders);
        setData("delete_ids", []);
        initialHeadersSnapshotRef.current = JSON.stringify(
            normalizeHeaders(mappedHeaders),
        );
        setModalOpen(true);
    };

    const closeModal = () => {
        reset();
        setModalOpen(false);
        clearErrors();
        setPendingScrollToIndex(null);
        linkContainerRefs.current = [];
    };

    const updateRow = (index, key, value) => {
        const next = [...data.headers];
        next[index] = {
            ...next[index],
            [key]: value,
        };
        setData("headers", next);
    };
    const addLink = () => {
        const nextIndex = data.headers.length;
        setData("headers", [
            ...data.headers,
            {
                id: null,
                label: "",
                target: "",
                item_type: "link",
                sort_order: nextIndex + 1,
                is_active: true,
                logo_file: null,
            },
        ]);
        setPendingScrollToIndex(nextIndex);
    };

    const removeLink = (index) => {
        const row = data.headers[index];
        const nextHeaders = data.headers.filter((_, i) => i !== index);

        setData("headers", nextHeaders);

        if (row?.id) {
            const nextDeleteIds = Array.from(
                new Set([...(data.delete_ids ?? []), row.id]),
            );
            setData("delete_ids", nextDeleteIds);
        }
    };

    useEffect(() => {
        if (!modalOpen || pendingScrollToIndex === null) return;

        const target = linkContainerRefs.current[pendingScrollToIndex];
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingScrollToIndex(null);
        }
    }, [data.headers.length, modalOpen, pendingScrollToIndex]);

    const hasEmptyRequiredFields = useMemo(
        () =>
            data.headers.some(
                (row) => {
                    const labelEmpty = String(row.label ?? "").trim() === "";
                    const targetEmpty = String(row.target ?? "").trim() === "";
                    const hasLogoFile = Boolean(row.logo_file);
                    const missingLogoSource =
                        row.item_type === "logo" && targetEmpty && !hasLogoFile;

                    return labelEmpty || (row.item_type !== "logo" && targetEmpty) || missingLogoSource;
                },
            ),
        [data.headers],
    );

    const hasChanges = useMemo(() => {
        const currentSnapshot = JSON.stringify(normalizeHeaders(data.headers));
        return currentSnapshot !== initialHeadersSnapshotRef.current;
    }, [data.headers]);

    const submit = (event) => {
        event.preventDefault();

        if (hasEmptyRequiredFields || !hasChanges) {
            return;
        }

        router.post(
            route("admin.landing-page.bulk-update"),
            {
                _method: "put",
                ...data,
            },
            {
                forceFormData: true,
                onSuccess: closeModal,
            },
        );
    };

    const columns = [
        { key: "label", label: "Label" },
        {
            key: "target",
            label: "Target",
            render: (row) =>
                HOME_TARGET_TYPES.has(row.item_type) ? "home" : row.target,
        },
        {
            key: "item_type",
            label: "Type",
            render: (row) =>
                ITEM_TYPE_OPTIONS.find((option) => option.value === row.item_type)
                    ?.label ?? row.item_type,
        },
        { key: "sort_order", label: "Order" },
        {
            key: "is_active",
            label: "Is Active",
            render: (row) => <StatusBadge active={Boolean(row.is_active)} />,
        },
    ];

    return (
        <AdminLayout
            title="Landing Page"
            activeRoute="admin.landing-page"
            breadcrumbs={["System Controls"]}
        >
            <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <div>
                        <h2 className="text-base font-semibold text-slate-900">
                            Header
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={openEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Edit
                    </button>
                </div>
                <ResourceTable
                    columns={columns}
                    data={headers}
                    filters={filters}
                    routeName="admin.landing-page"
                    searchPlaceholder="Search header links..."
                    perPageControlPosition="bottom"
                    showSearch={false}
                    showPageIndicator={false}
                    containerClassName=""
                />
            </section>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/40" onClick={closeModal} />
                    <div
                        className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">
                                Edit Header Links
                            </h3>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={submit} className="space-y-4">
                            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addLink}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        + Add Link
                                    </button>
                                </div>
                                {data.headers.map((row, index) => (
                                    <div
                                        key={row.id ?? `new-${index}`}
                                        ref={(el) => {
                                            linkContainerRefs.current[index] = el;
                                        }}
                                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {ITEM_TYPE_OPTIONS.find(
                                                    (option) => option.value === row.item_type,
                                                )?.label ?? "Item"}{" "}
                                                #{index + 1}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeLink(index)}
                                                aria-label={`Delete Link #${index + 1}`}
                                                className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                            >
                                                <AppIcon name="trash" className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr_120px_auto] md:items-end">
                                            <FormField
                                                label="Type"
                                                error={errors[`headers.${index}.item_type`]}
                                                required
                                            >
                                                <SelectInput
                                                    value={row.item_type}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            index,
                                                            "item_type",
                                                            event.target.value,
                                                        )
                                                    }
                                                >
                                                    {ITEM_TYPE_OPTIONS.map((option) => (
                                                        <option key={option.value} value={option.value}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </SelectInput>
                                            </FormField>
                                            <FormField
                                                label="Label"
                                                error={errors[`headers.${index}.label`]}
                                                required
                                            >
                                                <TextInput
                                                    value={row.label}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            index,
                                                            "label",
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </FormField>
                                            <FormField
                                                label="Target"
                                                error={errors[`headers.${index}.target`]}
                                                required
                                            >
                                                {row.item_type === "logo" ? (
                                                    <div className="space-y-2">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(event) =>
                                                                updateRow(
                                                                    index,
                                                                    "logo_file",
                                                                    event.target.files?.[0] ?? null,
                                                                )
                                                            }
                                                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                                                        />
                                                        {isImageTarget(row.target) && (
                                                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                                                                <img
                                                                    src={row.target}
                                                                    alt={`${row.label || "Logo"} preview`}
                                                                    className="h-10 w-10 rounded-full object-cover"
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <TextInput
                                                        value={row.target}
                                                        onChange={(event) =>
                                                            updateRow(
                                                                index,
                                                                "target",
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                )}
                                            </FormField>

                                            <FormField
                                                label="Order"
                                                error={errors[`headers.${index}.sort_order`]}
                                            >
                                                <TextInput
                                                    type="number"
                                                    min="0"
                                                    value={row.sort_order}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            index,
                                                            "sort_order",
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </FormField>

                                            <label className="flex items-center gap-2 text-sm text-slate-700 md:pb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(row.is_active)}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            index,
                                                            "is_active",
                                                            event.target.checked,
                                                        )
                                                    }
                                                    className="rounded border-slate-300"
                                                />
                                                Active
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                                >
                                    Cancel
                                </button>
                                <SubmitButton
                                    processing={processing}
                                    disabled={hasEmptyRequiredFields || !hasChanges}
                                    className="flex-1"
                                >
                                    Save Changes
                                </SubmitButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
