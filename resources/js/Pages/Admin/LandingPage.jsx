import FormField, {
    SelectInput,
    TextareaInput,
    TextInput,
} from "@/Components/Admin/FormField";
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

function normalizeHomeSection(homeSection = {}) {
    return {
        badge_text: String(homeSection.badge_text ?? "").trim(),
        title_text: String(homeSection.title_text ?? "").trim(),
        title_highlight_text: String(
            homeSection.title_highlight_text ?? "",
        ).trim(),
        subtitle_text: String(homeSection.subtitle_text ?? "").trim(),
        primary_cta_label: String(homeSection.primary_cta_label ?? "").trim(),
        primary_cta_target: String(homeSection.primary_cta_target ?? "").trim(),
        secondary_cta_label: String(
            homeSection.secondary_cta_label ?? "",
        ).trim(),
        secondary_cta_target: String(
            homeSection.secondary_cta_target ?? "",
        ).trim(),
        background_video_path: String(
            homeSection.background_video_path ?? "",
        ).trim(),
        background_video_file: homeSection.background_video_file
            ? String(homeSection.background_video_file.name ?? "")
            : "",
    };
}

function normalizeStatsSection(stats = []) {
    return stats.map((row) => ({
        id: row.id ?? null,
        stat_key: String(row.stat_key ?? "").trim(),
        label: String(row.label ?? "").trim(),
        value: Number(row.value ?? 0),
        icon: String(row.icon ?? "").trim(),
        sort_order: Number(row.sort_order ?? 0),
    }));
}

function normalizeFeaturesSection(featuresSection = {}) {
    return {
        badge_text: String(featuresSection.badge_text ?? "").trim(),
        title_text: String(featuresSection.title_text ?? "").trim(),
        subtitle_text: String(featuresSection.subtitle_text ?? "").trim(),
        features: (featuresSection.features ?? []).map((row) => ({
            id: row.id ?? null,
            title: String(row.title ?? "").trim(),
            subtitle: String(row.subtitle ?? "").trim(),
            sort_order: Number(row.sort_order ?? 0),
        })),
    };
}

function normalizeRolesSection(rolesSection = {}) {
    return {
        badge_text: String(rolesSection.badge_text ?? "").trim(),
        title_text: String(rolesSection.title_text ?? "").trim(),
        subtitle_text: String(rolesSection.subtitle_text ?? "").trim(),
        roles: (rolesSection.roles ?? []).map((row) => ({
            id: row.id ?? null,
            title: String(row.title ?? "").trim(),
            desc_text: String(row.desc_text ?? "").trim(),
            features: (row.features ?? []).map((f) => String(f ?? "").trim()),
            progress: Number(row.progress ?? 0),
            icon_type: String(row.icon_type ?? "faculty"),
            sort_order: Number(row.sort_order ?? 0),
        })),
    };
}

function normalizeHowItWorksSection(howItWorksSection = {}) {
    return {
        badge_text: String(howItWorksSection.badge_text ?? "").trim(),
        title_text: String(howItWorksSection.title_text ?? "").trim(),
        subtitle_text: String(howItWorksSection.subtitle_text ?? "").trim(),
        steps: (howItWorksSection.steps ?? []).map((row) => ({
            id: row.id ?? null,
            step_number: String(row.step_number ?? "").trim(),
            title: String(row.title ?? "").trim(),
            subtitle: String(row.subtitle ?? "").trim(),
            sort_order: Number(row.sort_order ?? 0),
        })),
    };
}

function normalizeStatKey(value) {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
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

export default function LandingPage({
    headers,
    filters,
    homeSection,
    statsSection = [],
    featuresSection = {
        badge_text: "",
        title_text: "",
        subtitle_text: "",
        features: [],
    },
    rolesSection = {
        badge_text: "",
        title_text: "",
        subtitle_text: "",
        roles: [],
    },
    howItWorksSection = {
        badge_text: "",
        title_text: "",
        subtitle_text: "",
        steps: [],
    },
}) {
    const canEditStats =
        (statsSection ?? []).length > 0 &&
        (statsSection ?? []).every(
            (row) => row.id !== null && row.id !== undefined,
        );

    const [modalOpen, setModalOpen] = useState(false);
    const [homeModalOpen, setHomeModalOpen] = useState(false);
    const [statsModalOpen, setStatsModalOpen] = useState(false);
    const [featuresModalOpen, setFeaturesModalOpen] = useState(false);
    const [pendingScrollToIndex, setPendingScrollToIndex] = useState(null);
    const [pendingStatsScrollToIndex, setPendingStatsScrollToIndex] =
        useState(null);
    const [pendingFeaturesScrollToIndex, setPendingFeaturesScrollToIndex] =
        useState(null);
    const [rolesModalOpen, setRolesModalOpen] = useState(false);
    const [pendingRolesScrollToIndex, setPendingRolesScrollToIndex] =
        useState(null);
    const [howItWorksModalOpen, setHowItWorksModalOpen] = useState(false);
    const [pendingHowItWorksScrollToIndex, setPendingHowItWorksScrollToIndex] =
        useState(null);
    const linkContainerRefs = useRef([]);
    const statContainerRefs = useRef([]);
    const featureContainerRefs = useRef([]);
    const roleContainerRefs = useRef([]);
    const howItWorksContainerRefs = useRef([]);
    const initialHeadersSnapshotRef = useRef("[]");
    const initialHomeSectionSnapshotRef = useRef("{}");
    const initialStatsSnapshotRef = useRef("[]");
    const initialFeaturesSnapshotRef = useRef("{}");
    const initialRolesSnapshotRef = useRef("{}");
    const initialHowItWorksSnapshotRef = useRef("{}");

    const { data, setData, errors, processing, reset, clearErrors } = useForm({
        headers: [],
        delete_ids: [],
    });
    const {
        data: homeData,
        setData: setHomeData,
        errors: homeErrors,
        processing: homeProcessing,
        reset: resetHome,
        clearErrors: clearHomeErrors,
    } = useForm({
        badge_text: "",
        title_text: "",
        title_highlight_text: "",
        subtitle_text: "",
        primary_cta_label: "",
        primary_cta_target: "",
        secondary_cta_label: "",
        secondary_cta_target: "",
        background_video_path: "",
        background_video_file: null,
    });
    const {
        data: statsData,
        setData: setStatsData,
        errors: statsErrors,
        processing: statsProcessing,
        reset: resetStats,
        clearErrors: clearStatsErrors,
    } = useForm({
        stats: [],
        delete_ids: [],
    });
    const {
        data: featuresData,
        setData: setFeaturesData,
        errors: featuresErrors,
        processing: featuresProcessing,
        reset: resetFeatures,
        clearErrors: clearFeaturesErrors,
    } = useForm({
        badge_text: "",
        title_text: "",
        subtitle_text: "",
        features: [],
        delete_ids: [],
    });
    const {
        data: rolesData,
        setData: setRolesData,
        errors: rolesErrors,
        processing: rolesProcessing,
        reset: resetRoles,
        clearErrors: clearRolesErrors,
    } = useForm({
        badge_text: "",
        title_text: "",
        subtitle_text: "",
        roles: [],
        delete_ids: [],
    });
    const {
        data: howItWorksData,
        setData: setHowItWorksData,
        errors: howItWorksErrors,
        processing: howItWorksProcessing,
        reset: resetHowItWorks,
        clearErrors: clearHowItWorksErrors,
    } = useForm({
        badge_text: "",
        title_text: "",
        subtitle_text: "",
        steps: [],
        delete_ids: [],
    });

    const openEdit = () => {
        clearErrors();
        const mappedHeaders = (headers?.data ?? []).map((row, index) => ({
            id: row.id,
            label: row.label ?? "",
            target: row.target ?? "",
            item_type: row.item_type ?? "link",
            sort_order: index + 1,
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
    const openHomeEdit = () => {
        clearHomeErrors();

        const nextHomeData = {
            badge_text: homeSection?.badge_text ?? "",
            title_text: homeSection?.title_text ?? "",
            title_highlight_text: homeSection?.title_highlight_text ?? "",
            subtitle_text: homeSection?.subtitle_text ?? "",
            primary_cta_label: homeSection?.primary_cta_label ?? "",
            primary_cta_target: homeSection?.primary_cta_target ?? "",
            secondary_cta_label: homeSection?.secondary_cta_label ?? "",
            secondary_cta_target: homeSection?.secondary_cta_target ?? "",
            background_video_path: homeSection?.background_video_path ?? "",
            background_video_file: null,
        };

        setHomeData(nextHomeData);
        initialHomeSectionSnapshotRef.current = JSON.stringify(
            normalizeHomeSection(nextHomeData),
        );
        setHomeModalOpen(true);
    };
    const openStatsEdit = () => {
        clearStatsErrors();

        const nextStats = (statsSection ?? []).map((row) => ({
            id: row.id ?? null,
            stat_key: row.stat_key ?? "",
            label: row.label ?? "",
            value: row.value ?? 0,
            icon: row.icon ?? "",
            sort_order: row.sort_order ?? 0,
        }));

        setStatsData("stats", nextStats);
        setStatsData("delete_ids", []);
        initialStatsSnapshotRef.current = JSON.stringify(
            normalizeStatsSection(nextStats),
        );
        setStatsModalOpen(true);
    };
    const openFeaturesEdit = () => {
        clearFeaturesErrors();

        const nextFeatures = (featuresSection?.features ?? []).map((row) => ({
            id: row.id ?? null,
            title: row.title ?? "",
            subtitle: row.subtitle ?? "",
            sort_order: row.sort_order ?? 0,
        }));

        setFeaturesData("badge_text", featuresSection?.badge_text ?? "");
        setFeaturesData("title_text", featuresSection?.title_text ?? "");
        setFeaturesData("subtitle_text", featuresSection?.subtitle_text ?? "");
        setFeaturesData("features", nextFeatures);
        setFeaturesData("delete_ids", []);
        initialFeaturesSnapshotRef.current = JSON.stringify(
            normalizeFeaturesSection({
                badge_text: featuresSection?.badge_text ?? "",
                title_text: featuresSection?.title_text ?? "",
                subtitle_text: featuresSection?.subtitle_text ?? "",
                features: nextFeatures,
            }),
        );
        setFeaturesModalOpen(true);
    };

    const closeModal = () => {
        reset();
        setModalOpen(false);
        clearErrors();
        setPendingScrollToIndex(null);
        linkContainerRefs.current = [];
    };
    const closeHomeModal = () => {
        resetHome();
        setHomeModalOpen(false);
        clearHomeErrors();
    };
    const closeStatsModal = () => {
        resetStats();
        setStatsModalOpen(false);
        clearStatsErrors();
        setPendingStatsScrollToIndex(null);
        statContainerRefs.current = [];
    };
    const closeFeaturesModal = () => {
        resetFeatures();
        setFeaturesModalOpen(false);
        clearFeaturesErrors();
        setPendingFeaturesScrollToIndex(null);
        featureContainerRefs.current = [];
    };
    const openRolesEdit = () => {
        clearRolesErrors();
        const nextRoles = (rolesSection?.roles ?? []).map((row) => ({
            id: row.id ?? null,
            title: row.title ?? "",
            desc_text: row.desc_text ?? "",
            features: row.features ?? [],
            progress: String(row.progress ?? 0),
            icon_type: row.icon_type ?? "faculty",
            sort_order: row.sort_order ?? 0,
        }));
        setRolesData("badge_text", rolesSection?.badge_text ?? "");
        setRolesData("title_text", rolesSection?.title_text ?? "");
        setRolesData("subtitle_text", rolesSection?.subtitle_text ?? "");
        setRolesData("roles", nextRoles);
        setRolesData("delete_ids", []);
        initialRolesSnapshotRef.current = JSON.stringify(
            normalizeRolesSection({
                badge_text: rolesSection?.badge_text ?? "",
                title_text: rolesSection?.title_text ?? "",
                subtitle_text: rolesSection?.subtitle_text ?? "",
                roles: nextRoles,
            }),
        );
        setRolesModalOpen(true);
    };
    const closeRolesModal = () => {
        resetRoles();
        setRolesModalOpen(false);
        clearRolesErrors();
        setPendingRolesScrollToIndex(null);
        roleContainerRefs.current = [];
    };
    const openHowItWorksEdit = () => {
        clearHowItWorksErrors();
        const nextSteps = (howItWorksSection?.steps ?? []).map((row) => ({
            id: row.id ?? null,
            step_number: row.step_number ?? "",
            title: row.title ?? "",
            subtitle: row.subtitle ?? "",
            sort_order: row.sort_order ?? 0,
        }));
        setHowItWorksData("badge_text", howItWorksSection?.badge_text ?? "");
        setHowItWorksData("title_text", howItWorksSection?.title_text ?? "");
        setHowItWorksData(
            "subtitle_text",
            howItWorksSection?.subtitle_text ?? "",
        );
        setHowItWorksData("steps", nextSteps);
        setHowItWorksData("delete_ids", []);
        initialHowItWorksSnapshotRef.current = JSON.stringify(
            normalizeHowItWorksSection({
                badge_text: howItWorksSection?.badge_text ?? "",
                title_text: howItWorksSection?.title_text ?? "",
                subtitle_text: howItWorksSection?.subtitle_text ?? "",
                steps: nextSteps,
            }),
        );
        setHowItWorksModalOpen(true);
    };
    const closeHowItWorksModal = () => {
        resetHowItWorks();
        setHowItWorksModalOpen(false);
        clearHowItWorksErrors();
        setPendingHowItWorksScrollToIndex(null);
        howItWorksContainerRefs.current = [];
    };

    const updateRow = (index, key, value) => {
        const next = [...data.headers];
        next[index] = {
            ...next[index],
            [key]: value,
        };
        setData("headers", next);
    };
    const withHeaderSortOrder = (rows = []) =>
        rows.map((item, idx) => ({
            ...item,
            sort_order: idx + 1,
        }));
    const addLink = () => {
        const nextHeaders = withHeaderSortOrder([
            ...data.headers,
            {
                id: null,
                label: "",
                target: "",
                item_type: "link",
                sort_order: 0,
                is_active: true,
                logo_file: null,
            },
        ]);
        setData("headers", nextHeaders);
        const nextIndex = nextHeaders.length - 1;
        setPendingScrollToIndex(nextIndex);
    };

    const removeLink = (index) => {
        const row = data.headers[index];
        const nextHeaders = withHeaderSortOrder(
            data.headers.filter((_, i) => i !== index),
        );

        setData("headers", nextHeaders);

        if (row?.id) {
            const nextDeleteIds = Array.from(
                new Set([...(data.delete_ids ?? []), row.id]),
            );
            setData("delete_ids", nextDeleteIds);
        }
    };
    const moveLinkRow = (index, direction) => {
        const rows = [...data.headers];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= rows.length) {
            return;
        }

        const temp = rows[index];
        rows[index] = rows[targetIndex];
        rows[targetIndex] = temp;

        setData("headers", withHeaderSortOrder(rows));
    };

    useEffect(() => {
        if (!modalOpen || pendingScrollToIndex === null) return;

        const target = linkContainerRefs.current[pendingScrollToIndex];
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingScrollToIndex(null);
        }
    }, [data.headers.length, modalOpen, pendingScrollToIndex]);
    useEffect(() => {
        if (!statsModalOpen || pendingStatsScrollToIndex === null) return;

        const target = statContainerRefs.current[pendingStatsScrollToIndex];
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingStatsScrollToIndex(null);
        }
    }, [statsData.stats?.length, statsModalOpen, pendingStatsScrollToIndex]);
    useEffect(() => {
        if (!featuresModalOpen || pendingFeaturesScrollToIndex === null) return;

        const target = featureContainerRefs.current[pendingFeaturesScrollToIndex];
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingFeaturesScrollToIndex(null);
        }
    }, [
        featuresData.features?.length,
        featuresModalOpen,
        pendingFeaturesScrollToIndex,
    ]);
    useEffect(() => {
        if (!rolesModalOpen || pendingRolesScrollToIndex === null) return;

        const target = roleContainerRefs.current[pendingRolesScrollToIndex];
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingRolesScrollToIndex(null);
        }
    }, [rolesData.roles?.length, rolesModalOpen, pendingRolesScrollToIndex]);
    useEffect(() => {
        if (
            !howItWorksModalOpen ||
            pendingHowItWorksScrollToIndex === null
        ) {
            return;
        }

        const target =
            howItWorksContainerRefs.current[pendingHowItWorksScrollToIndex];
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
            setPendingHowItWorksScrollToIndex(null);
        }
    }, [
        howItWorksData.steps?.length,
        howItWorksModalOpen,
        pendingHowItWorksScrollToIndex,
    ]);

    const hasEmptyRequiredFields = useMemo(
        () =>
            data.headers.some((row) => {
                const labelEmpty = String(row.label ?? "").trim() === "";
                const targetEmpty = String(row.target ?? "").trim() === "";
                const hasLogoFile = Boolean(row.logo_file);
                const missingLogoSource =
                    row.item_type === "logo" && targetEmpty && !hasLogoFile;

                return (
                    labelEmpty ||
                    (row.item_type !== "logo" && targetEmpty) ||
                    missingLogoSource
                );
            }),
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
    const updateHomeField = (key, value) => {
        setHomeData(key, value);
    };
    const hasEmptyHomeRequiredFields = useMemo(() => {
        const fields = [
            homeData.badge_text,
            homeData.title_text,
            homeData.subtitle_text,
            homeData.primary_cta_label,
            homeData.primary_cta_target,
            homeData.secondary_cta_label,
            homeData.secondary_cta_target,
        ];

        return fields.some((value) => String(value ?? "").trim() === "");
    }, [homeData]);
    const hasHomeSectionChanges = useMemo(() => {
        const currentSnapshot = JSON.stringify(normalizeHomeSection(homeData));
        return currentSnapshot !== initialHomeSectionSnapshotRef.current;
    }, [homeData]);
    const submitHomeSection = (event) => {
        event.preventDefault();

        if (hasEmptyHomeRequiredFields || !hasHomeSectionChanges) {
            return;
        }

        router.post(
            route("admin.landing-page.home-section.update"),
            {
                _method: "put",
                ...homeData,
            },
            {
                forceFormData: true,
                onSuccess: closeHomeModal,
            },
        );
    };
    const updateStatRow = (index, key, value) => {
        const next = [...(statsData.stats ?? [])];
        const knownValuesByKey = (statsSection ?? []).reduce((acc, row) => {
            const metricKey = normalizeStatKey(row.stat_key);
            if (metricKey) {
                acc[metricKey] = Number(row.value ?? 0);
            }
            return acc;
        }, {});

        next[index] = {
            ...next[index],
            [key]: value,
            ...(key === "stat_key"
                ? {
                      value:
                          knownValuesByKey[
                              normalizeStatKey(String(value ?? ""))
                          ] ??
                          next[index]?.value ??
                          0,
                  }
                : {}),
        };
        setStatsData("stats", next);
    };
    const addStatRow = () => {
        const nextIndex = (statsData.stats ?? []).length;
        setStatsData("stats", [
            ...(statsData.stats ?? []),
            {
                id: null,
                stat_key: "",
                label: "",
                value: 0,
                icon: "dashboard",
                sort_order: nextIndex + 1,
            },
        ]);
        setPendingStatsScrollToIndex(nextIndex);
    };
    const removeStatRow = (index) => {
        const row = (statsData.stats ?? [])[index];
        const nextStats = (statsData.stats ?? [])
            .filter((_, i) => i !== index)
            .map((item, idx) => ({
                ...item,
                sort_order: idx + 1,
            }));
        setStatsData("stats", nextStats);

        if (row?.id) {
            const nextDeleteIds = Array.from(
                new Set([...(statsData.delete_ids ?? []), row.id]),
            );
            setStatsData("delete_ids", nextDeleteIds);
        }
    };
    const moveStatRow = (index, direction) => {
        const rows = [...(statsData.stats ?? [])];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= rows.length) {
            return;
        }

        const temp = rows[index];
        rows[index] = rows[targetIndex];
        rows[targetIndex] = temp;

        const withSortOrder = rows.map((row, idx) => ({
            ...row,
            sort_order: idx + 1,
        }));
        setStatsData("stats", withSortOrder);
    };
    const hasEmptyStatsLabels = useMemo(
        () =>
            (statsData.stats ?? []).some(
                (row) =>
                    String(row.label ?? "").trim() === "" ||
                    String(row.stat_key ?? "").trim() === "",
            ),
        [statsData.stats],
    );
    const hasStatsSectionChanges = useMemo(() => {
        const currentSnapshot = JSON.stringify(
            normalizeStatsSection(statsData.stats ?? []),
        );
        return currentSnapshot !== initialStatsSnapshotRef.current;
    }, [statsData.stats]);
    const submitStatsSection = (event) => {
        event.preventDefault();

        if (hasEmptyStatsLabels || !hasStatsSectionChanges) {
            return;
        }

        router.post(
            route("admin.landing-page.stats-section.update"),
            {
                _method: "put",
                ...statsData,
            },
            {
                forceFormData: true,
                onSuccess: closeStatsModal,
            },
        );
    };
    const updateFeatureField = (key, value) => {
        setFeaturesData(key, value);
    };
    const updateFeatureRow = (index, key, value) => {
        const next = [...(featuresData.features ?? [])];
        next[index] = {
            ...next[index],
            [key]: value,
        };
        setFeaturesData("features", next);
    };
    const withFeatureSortOrder = (rows = []) =>
        rows.map((item, idx) => ({
            ...item,
            sort_order: idx + 1,
        }));
    const addFeatureRow = () => {
        const nextFeatures = withFeatureSortOrder([
            ...(featuresData.features ?? []),
            {
                id: null,
                title: "",
                subtitle: "",
                sort_order: 0,
            },
        ]);

        setFeaturesData("features", nextFeatures);
        setPendingFeaturesScrollToIndex(nextFeatures.length - 1);
    };
    const removeFeatureRow = (index) => {
        const row = (featuresData.features ?? [])[index];
        const nextRows = withFeatureSortOrder(
            (featuresData.features ?? []).filter((_, i) => i !== index),
        );

        setFeaturesData("features", nextRows);

        if (row?.id) {
            const nextDeleteIds = Array.from(
                new Set([...(featuresData.delete_ids ?? []), row.id]),
            );
            setFeaturesData("delete_ids", nextDeleteIds);
        }
    };
    const withRoleSortOrder = (rows = []) =>
        rows.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    const updateRoleField = (key, value) => {
        setRolesData(key, value);
    };
    const updateRoleRow = (index, key, value) => {
        const next = [...(rolesData.roles ?? [])];
        next[index] = { ...next[index], [key]: value };
        setRolesData("roles", next);
    };
const removeRoleRow = (index) => {
        const row = (rolesData.roles ?? [])[index];
        const nextRows = withRoleSortOrder(
            (rolesData.roles ?? []).filter((_, i) => i !== index),
        );
        setRolesData("roles", nextRows);
        if (row?.id) {
            const nextDeleteIds = Array.from(
                new Set([...(rolesData.delete_ids ?? []), row.id]),
            );
            setRolesData("delete_ids", nextDeleteIds);
        }
    };
    const moveRoleRow = (index, direction) => {
        const rows = [...(rolesData.roles ?? [])];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= rows.length) return;
        const temp = rows[index];
        rows[index] = rows[targetIndex];
        rows[targetIndex] = temp;
        setRolesData("roles", withRoleSortOrder(rows));
    };
    const addFeatureToRole = (roleIndex) => {
        const next = [...(rolesData.roles ?? [])];
        next[roleIndex] = {
            ...next[roleIndex],
            features: [...(next[roleIndex].features ?? []), ""],
        };
        setRolesData("roles", next);
    };
    const removeFeatureFromRole = (roleIndex, featureIndex) => {
        const next = [...(rolesData.roles ?? [])];
        next[roleIndex] = {
            ...next[roleIndex],
            features: (next[roleIndex].features ?? []).filter(
                (_, i) => i !== featureIndex,
            ),
        };
        setRolesData("roles", next);
    };
    const updateFeatureInRole = (roleIndex, featureIndex, value) => {
        const next = [...(rolesData.roles ?? [])];
        const features = [...(next[roleIndex].features ?? [])];
        features[featureIndex] = value;
        next[roleIndex] = { ...next[roleIndex], features };
        setRolesData("roles", next);
    };
    const updateHowItWorksField = (key, value) => {
        setHowItWorksData(key, value);
    };
    const withHowItWorksSortOrder = (rows = []) =>
        rows.map((item, idx) => ({ ...item, sort_order: idx + 1 }));
    const updateHowItWorksRow = (index, key, value) => {
        const next = [...(howItWorksData.steps ?? [])];
        next[index] = {
            ...next[index],
            [key]: value,
        };
        setHowItWorksData("steps", next);
    };
    const addHowItWorksRow = () => {
        const nextRows = withHowItWorksSortOrder([
            ...(howItWorksData.steps ?? []),
            {
                id: null,
                step_number: String((howItWorksData.steps ?? []).length + 1).padStart(
                    2,
                    "0",
                ),
                title: "",
                subtitle: "",
                sort_order: 0,
            },
        ]);
        setHowItWorksData("steps", nextRows);
        setPendingHowItWorksScrollToIndex(nextRows.length - 1);
    };
    const removeHowItWorksRow = (index) => {
        const row = (howItWorksData.steps ?? [])[index];
        const nextRows = withHowItWorksSortOrder(
            (howItWorksData.steps ?? []).filter((_, i) => i !== index),
        );
        setHowItWorksData("steps", nextRows);
        if (row?.id) {
            const nextDeleteIds = Array.from(
                new Set([...(howItWorksData.delete_ids ?? []), row.id]),
            );
            setHowItWorksData("delete_ids", nextDeleteIds);
        }
    };
    const moveHowItWorksRow = (index, direction) => {
        const rows = [...(howItWorksData.steps ?? [])];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= rows.length) {
            return;
        }
        const temp = rows[index];
        rows[index] = rows[targetIndex];
        rows[targetIndex] = temp;
        setHowItWorksData("steps", withHowItWorksSortOrder(rows));
    };

    const moveFeatureRow = (index, direction) => {
        const rows = [...(featuresData.features ?? [])];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= rows.length) {
            return;
        }

        const temp = rows[index];
        rows[index] = rows[targetIndex];
        rows[targetIndex] = temp;

        setFeaturesData("features", withFeatureSortOrder(rows));
    };
    const hasEmptyFeaturesRequiredFields = useMemo(() => {
        const sectionFields = [
            featuresData.badge_text,
            featuresData.title_text,
            featuresData.subtitle_text,
        ];

        const sectionHasEmpty = sectionFields.some(
            (value) => String(value ?? "").trim() === "",
        );
        const rowHasEmpty = (featuresData.features ?? []).some(
            (row) =>
                String(row.title ?? "").trim() === "" ||
                String(row.subtitle ?? "").trim() === "",
        );

        return sectionHasEmpty || rowHasEmpty;
    }, [featuresData]);
    const hasFeaturesSectionChanges = useMemo(() => {
        const currentSnapshot = JSON.stringify(
            normalizeFeaturesSection(featuresData),
        );
        return currentSnapshot !== initialFeaturesSnapshotRef.current;
    }, [featuresData]);
    const submitFeaturesSection = (event) => {
        event.preventDefault();

        if (hasEmptyFeaturesRequiredFields || !hasFeaturesSectionChanges) {
            return;
        }

        router.post(
            route("admin.landing-page.features-section.update"),
            {
                _method: "put",
                ...featuresData,
            },
            {
                forceFormData: true,
                onSuccess: closeFeaturesModal,
            },
        );
    };
    const hasEmptyRolesRequiredFields = useMemo(() => {
        const sectionFields = [
            rolesData.badge_text,
            rolesData.title_text,
            rolesData.subtitle_text,
        ];
        const sectionHasEmpty = sectionFields.some(
            (value) => String(value ?? "").trim() === "",
        );
        const rowHasEmpty = (rolesData.roles ?? []).some(
            (row) => String(row.title ?? "").trim() === "",
        );
        return sectionHasEmpty || rowHasEmpty;
    }, [rolesData]);
    const hasRolesSectionChanges = useMemo(() => {
        const currentSnapshot = JSON.stringify(normalizeRolesSection(rolesData));
        return currentSnapshot !== initialRolesSnapshotRef.current;
    }, [rolesData]);
    const submitRolesSection = (event) => {
        event.preventDefault();
        if (hasEmptyRolesRequiredFields || !hasRolesSectionChanges) return;
        router.put(
            route("admin.landing-page.roles-section.update"),
            rolesData,
            { onSuccess: closeRolesModal },
        );
    };
    const hasEmptyHowItWorksRequiredFields = useMemo(() => {
        const sectionFields = [
            howItWorksData.badge_text,
            howItWorksData.title_text,
            howItWorksData.subtitle_text,
        ];
        const sectionHasEmpty = sectionFields.some(
            (value) => String(value ?? "").trim() === "",
        );
        const rowHasEmpty = (howItWorksData.steps ?? []).some(
            (row) =>
                String(row.step_number ?? "").trim() === "" ||
                String(row.title ?? "").trim() === "" ||
                String(row.subtitle ?? "").trim() === "",
        );
        return sectionHasEmpty || rowHasEmpty;
    }, [howItWorksData]);
    const hasHowItWorksSectionChanges = useMemo(() => {
        const currentSnapshot = JSON.stringify(
            normalizeHowItWorksSection(howItWorksData),
        );
        return currentSnapshot !== initialHowItWorksSnapshotRef.current;
    }, [howItWorksData]);
    const submitHowItWorksSection = (event) => {
        event.preventDefault();
        if (
            hasEmptyHowItWorksRequiredFields ||
            !hasHowItWorksSectionChanges
        ) {
            return;
        }
        router.post(
            route("admin.landing-page.how-it-works-section.update"),
            {
                _method: "put",
                ...howItWorksData,
            },
            { onSuccess: closeHowItWorksModal },
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
                ITEM_TYPE_OPTIONS.find(
                    (option) => option.value === row.item_type,
                )?.label ?? row.item_type,
        },
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
                    showPagination={false}
                    containerClassName=""
                />
            </section>

            <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <h2 className="text-base font-semibold text-slate-900">
                        Home
                    </h2>
                    <button
                        type="button"
                        onClick={openHomeEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Edit
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3 sm:px-5">Field</th>
                                <th className="px-4 py-3 sm:px-5">Value</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Background Video
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {homeSection?.background_video_path || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Badge
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {homeSection?.badge_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Title
                                </td>
                                <td className="px-4 py-3 sm:px-5 whitespace-pre-line">
                                    {homeSection?.title_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Title Highlight
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {homeSection?.title_highlight_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Subtitle
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {homeSection?.subtitle_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Primary CTA
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {homeSection?.primary_cta_label || "-"} (
                                    {homeSection?.primary_cta_target || "-"})
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Secondary CTA
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {homeSection?.secondary_cta_label || "-"} (
                                    {homeSection?.secondary_cta_target || "-"})
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <h2 className="text-base font-semibold text-slate-900">
                        Stats
                    </h2>
                    <button
                        type="button"
                        onClick={openStatsEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!canEditStats}
                    >
                        Edit
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3 sm:px-5">#</th>
                                <th className="px-4 py-3 sm:px-5">Metric</th>
                                <th className="px-4 py-3 sm:px-5">
                                    Value
                                </th>
                                <th className="px-4 py-3 sm:px-5">
                                    Text Label
                                </th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            {(statsSection ?? []).map((row, index) => (
                                <tr
                                    key={row.id ?? `stat-${index}`}
                                    className="border-b border-slate-100 last:border-b-0"
                                >
                                    <td className="px-4 py-3 sm:px-5">
                                        {index + 1}
                                    </td>
                                    <td className="px-4 py-3 sm:px-5">
                                        {String(row.stat_key ?? "").replace(
                                            /_/g,
                                            " ",
                                        )}
                                    </td>
                                    <td className="px-4 py-3 sm:px-5 font-semibold text-slate-900">
                                        {row.value ?? 0}
                                    </td>
                                    <td className="px-4 py-3 sm:px-5">
                                        {row.label ?? "-"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <h2 className="text-base font-semibold text-slate-900">
                        Features
                    </h2>
                    <button
                        type="button"
                        onClick={openFeaturesEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Edit
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3 sm:px-5">Field</th>
                                <th className="px-4 py-3 sm:px-5">Value</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Badge
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {featuresSection?.badge_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Title
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {featuresSection?.title_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Subtitle
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {featuresSection?.subtitle_text || "-"}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-medium sm:px-5 align-top">
                                    Cards
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    <div className="space-y-1">
                                        {(featuresSection?.features ?? []).map(
                                            (row, index) => (
                                                <div
                                                    key={
                                                        row.id ??
                                                        `feature-summary-${index}`
                                                    }
                                                >
                                                    <span className="font-medium text-slate-900">
                                                        {row.title ||
                                                            `Card ${index + 1}`}
                                                    </span>
                                                    <span className="text-slate-500">
                                                        {" "}
                                                        - {row.subtitle || "-"}
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <h2 className="text-base font-semibold text-slate-900">
                        User Roles
                    </h2>
                    <button
                        type="button"
                        onClick={openRolesEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Edit
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3 sm:px-5">Field</th>
                                <th className="px-4 py-3 sm:px-5">Value</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">Badge</td>
                                <td className="px-4 py-3 sm:px-5">{rolesSection?.badge_text || "-"}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">Title</td>
                                <td className="px-4 py-3 sm:px-5">{rolesSection?.title_text || "-"}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">Subtitle</td>
                                <td className="px-4 py-3 sm:px-5">{rolesSection?.subtitle_text || "-"}</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-medium sm:px-5 align-top">Roles</td>
                                <td className="px-4 py-3 sm:px-5">
                                    <div className="space-y-1">
                                        {(rolesSection?.roles ?? []).map((row, index) => (
                                            <div key={row.id ?? `role-summary-${index}`}>
                                                <span className="font-medium text-slate-900">
                                                    {row.title || `Role ${index + 1}`}
                                                </span>
                                                <span className="text-slate-500">
                                                    {" "}- {row.desc_text || "-"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="mb-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                    <h2 className="text-base font-semibold text-slate-900">
                        How It Works
                    </h2>
                    <button
                        type="button"
                        onClick={openHowItWorksEdit}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Edit
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <th className="px-4 py-3 sm:px-5">Field</th>
                                <th className="px-4 py-3 sm:px-5">Value</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Badge
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {howItWorksSection?.badge_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Title
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {howItWorksSection?.title_text || "-"}
                                </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="px-4 py-3 font-medium sm:px-5">
                                    Subtitle
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    {howItWorksSection?.subtitle_text || "-"}
                                </td>
                            </tr>
                            <tr>
                                <td className="px-4 py-3 font-medium sm:px-5 align-top">
                                    Cards
                                </td>
                                <td className="px-4 py-3 sm:px-5">
                                    <div className="space-y-1">
                                        {(howItWorksSection?.steps ?? []).map(
                                            (row, index) => (
                                                <div
                                                    key={
                                                        row.id ??
                                                        `how-it-works-summary-${index}`
                                                    }
                                                >
                                                    <span className="font-medium text-slate-900">
                                                        {row.step_number ||
                                                            String(
                                                                index + 1,
                                                            ).padStart(2, "0")}
                                                        {" - "}
                                                        {row.title ||
                                                            `Card ${index + 1}`}
                                                    </span>
                                                    <span className="text-slate-500">
                                                        {" "}
                                                        - {row.subtitle || "-"}
                                                    </span>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {homeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40"
                        onClick={closeHomeModal}
                    />
                    <div
                        className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">
                                Edit Home
                            </h3>
                            <button
                                type="button"
                                onClick={closeHomeModal}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <form
                            onSubmit={submitHomeSection}
                            className="space-y-4"
                        >
                            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                                <FormField
                                    label="Background Video"
                                    error={homeErrors.background_video_file}
                                >
                                    <div className="space-y-2">
                                        <input
                                            type="file"
                                            accept="video/mp4,video/webm,video/ogg"
                                            onChange={(event) =>
                                                updateHomeField(
                                                    "background_video_file",
                                                    event.target.files?.[0] ??
                                                        null,
                                                )
                                            }
                                            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
                                        />
                                        <p className="text-xs text-slate-500">
                                            Current:{" "}
                                            {homeData.background_video_path ||
                                                "-"}
                                        </p>
                                    </div>
                                </FormField>

                                <FormField
                                    label="Badge"
                                    error={homeErrors.badge_text}
                                    required
                                >
                                    <TextInput
                                        value={homeData.badge_text}
                                        onChange={(event) =>
                                            updateHomeField(
                                                "badge_text",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>

                                <FormField
                                    label="Title"
                                    error={homeErrors.title_text}
                                    required
                                >
                                    <TextareaInput
                                        value={homeData.title_text}
                                        onChange={(event) =>
                                            updateHomeField(
                                                "title_text",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Web-Based Multicampus Performance Evaluation System"
                                    />
                                </FormField>

                                <FormField
                                    label="Title Highlight"
                                    error={homeErrors.title_highlight_text}
                                >
                                    <TextInput
                                        value={homeData.title_highlight_text}
                                        onChange={(event) =>
                                            updateHomeField(
                                                "title_highlight_text",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>

                                <FormField
                                    label="Subtitle"
                                    error={homeErrors.subtitle_text}
                                    required
                                >
                                    <TextareaInput
                                        value={homeData.subtitle_text}
                                        onChange={(event) =>
                                            updateHomeField(
                                                "subtitle_text",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </FormField>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <FormField
                                        label="Primary CTA Label"
                                        error={homeErrors.primary_cta_label}
                                        required
                                    >
                                        <TextInput
                                            value={homeData.primary_cta_label}
                                            onChange={(event) =>
                                                updateHomeField(
                                                    "primary_cta_label",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Primary CTA Target"
                                        error={homeErrors.primary_cta_target}
                                        required
                                    >
                                        <TextInput
                                            value={homeData.primary_cta_target}
                                            onChange={(event) =>
                                                updateHomeField(
                                                    "primary_cta_target",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                </div>

                                <div className="grid gap-3 md:grid-cols-2">
                                    <FormField
                                        label="Secondary CTA Label"
                                        error={homeErrors.secondary_cta_label}
                                        required
                                    >
                                        <TextInput
                                            value={homeData.secondary_cta_label}
                                            onChange={(event) =>
                                                updateHomeField(
                                                    "secondary_cta_label",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Secondary CTA Target"
                                        error={homeErrors.secondary_cta_target}
                                        required
                                    >
                                        <TextInput
                                            value={
                                                homeData.secondary_cta_target
                                            }
                                            onChange={(event) =>
                                                updateHomeField(
                                                    "secondary_cta_target",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                </div>
                            </div>

                            <div className="pt-2">
                                <div className="flex flex-col md:flex-row-reverse gap-3 md:justify-start w-full">
                                    <SubmitButton
                                        processing={homeProcessing}
                                        disabled={
                                            hasEmptyHomeRequiredFields ||
                                            !hasHomeSectionChanges
                                        }
                                        className="w-full md:w-[180px]"
                                    >
                                        Save Changes
                                    </SubmitButton>
                                    <button
                                        type="button"
                                        onClick={closeHomeModal}
                                        className="w-full md:w-[180px] rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {statsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40"
                        onClick={closeStatsModal}
                    />
                    <div
                        className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">
                                Edit Stats Labels
                            </h3>
                            <button
                                type="button"
                                onClick={closeStatsModal}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <form
                            onSubmit={submitStatsSection}
                            className="space-y-4"
                        >
                            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addStatRow}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        + Add Stat
                                    </button>
                                </div>
                                {(statsData.stats ?? []).map((row, index) => (
                                    <div
                                        key={row.id ?? `edit-stat-${index}`}
                                        ref={(el) => {
                                            statContainerRefs.current[index] =
                                                el;
                                        }}
                                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Stat #{index + 1}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveStatRow(index, "up")
                                                    }
                                                    aria-label={`Move Stat #${index + 1} up`}
                                                    disabled={index === 0}
                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <AppIcon
                                                        name="arrow-up"
                                                        className="h-4 w-4"
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveStatRow(
                                                            index,
                                                            "down",
                                                        )
                                                    }
                                                    aria-label={`Move Stat #${index + 1} down`}
                                                    disabled={
                                                        index ===
                                                        (statsData.stats ?? [])
                                                            .length -
                                                            1
                                                    }
                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <AppIcon
                                                        name="arrow-down"
                                                        className="h-4 w-4"
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeStatRow(index)
                                                    }
                                                    aria-label={`Delete Stat #${index + 1}`}
                                                    className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                                >
                                                    <AppIcon
                                                        name="trash"
                                                        className="h-4 w-4"
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                            <div className="grid gap-3 md:grid-cols-2">
                                            <FormField
                                                label="Metric"
                                                error={
                                                    statsErrors[
                                                        `stats.${index}.stat_key`
                                                    ]
                                                }
                                                required
                                            >
                                                <TextInput
                                                    value={String(
                                                        row.stat_key ?? "",
                                                    )}
                                                    onChange={(event) =>
                                                        updateStatRow(
                                                            index,
                                                            "stat_key",
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="students"
                                                />
                                            </FormField>
                                            <FormField label="Value">
                                                <TextInput
                                                    value={row.value ?? 0}
                                                    disabled
                                                    className="bg-slate-100 text-slate-500 cursor-not-allowed"
                                                />
                                            </FormField>
                                            <FormField
                                                label="Text Label"
                                                error={
                                                    statsErrors[
                                                        `stats.${index}.label`
                                                    ]
                                                }
                                                required
                                            >
                                                <TextInput
                                                    value={row.label}
                                                    onChange={(event) =>
                                                        updateStatRow(
                                                            index,
                                                            "label",
                                                            event.target.value,
                                                        )
                                                    }
                                                />
                                            </FormField>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2">
                                <div className="flex flex-col md:flex-row-reverse gap-3 md:justify-start w-full">
                                    <SubmitButton
                                        processing={statsProcessing}
                                        disabled={
                                            hasEmptyStatsLabels ||
                                            !hasStatsSectionChanges
                                        }
                                        className="w-full md:w-[180px]"
                                    >
                                        Save Changes
                                    </SubmitButton>
                                    <button
                                        type="button"
                                        onClick={closeStatsModal}
                                        className="w-full md:w-[180px] rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {featuresModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40"
                        onClick={closeFeaturesModal}
                    />
                    <div
                        className="relative w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">
                                Edit Features
                            </h3>
                            <button
                                type="button"
                                onClick={closeFeaturesModal}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <form
                            onSubmit={submitFeaturesSection}
                            className="space-y-4"
                        >
                            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <FormField
                                        label="Badge"
                                        error={featuresErrors.badge_text}
                                        required
                                    >
                                        <TextInput
                                            value={featuresData.badge_text}
                                            onChange={(event) =>
                                                updateFeatureField(
                                                    "badge_text",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Title"
                                        error={featuresErrors.title_text}
                                        required
                                    >
                                        <TextInput
                                            value={featuresData.title_text}
                                            onChange={(event) =>
                                                updateFeatureField(
                                                    "title_text",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Subtitle"
                                        error={featuresErrors.subtitle_text}
                                        required
                                    >
                                        <TextInput
                                            value={featuresData.subtitle_text}
                                            onChange={(event) =>
                                                updateFeatureField(
                                                    "subtitle_text",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addFeatureRow}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        + Add Feature
                                    </button>
                                </div>

                                {(featuresData.features ?? []).map(
                                    (row, index) => (
                                        <div
                                            key={row.id ?? `feature-${index}`}
                                            ref={(el) => {
                                                featureContainerRefs.current[
                                                    index
                                                ] = el;
                                            }}
                                            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Card #{index + 1}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveFeatureRow(
                                                                index,
                                                                "up",
                                                            )
                                                        }
                                                        aria-label={`Move Feature #${index + 1} up`}
                                                        disabled={index === 0}
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <AppIcon
                                                            name="arrow-up"
                                                            className="h-4 w-4"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveFeatureRow(
                                                                index,
                                                                "down",
                                                            )
                                                        }
                                                        aria-label={`Move Feature #${index + 1} down`}
                                                        disabled={
                                                            index ===
                                                            (featuresData.features ??
                                                                []).length -
                                                                1
                                                        }
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <AppIcon
                                                            name="arrow-down"
                                                            className="h-4 w-4"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeFeatureRow(
                                                                index,
                                                            )
                                                        }
                                                        aria-label={`Delete Feature #${index + 1}`}
                                                        className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <AppIcon
                                                            name="trash"
                                                            className="h-4 w-4"
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                        <div className="grid gap-3 md:grid-cols-3">
                                                <FormField
                                                    label="Card Title"
                                                    error={
                                                        featuresErrors[
                                                            `features.${index}.title`
                                                        ]
                                                    }
                                                    required
                                                >
                                                    <TextInput
                                                        value={row.title ?? ""}
                                                        onChange={(event) =>
                                                            updateFeatureRow(
                                                                index,
                                                                "title",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </FormField>
                                                <FormField
                                                    label="Card Subtitle"
                                                    error={
                                                        featuresErrors[
                                                            `features.${index}.subtitle`
                                                        ]
                                                    }
                                                    required
                                                >
                                                    <TextInput
                                                        value={
                                                            row.subtitle ?? ""
                                                        }
                                                        onChange={(event) =>
                                                            updateFeatureRow(
                                                                index,
                                                                "subtitle",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </FormField>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="pt-2">
                                <div className="flex flex-col md:flex-row-reverse gap-3 md:justify-start w-full">
                                    <SubmitButton
                                        processing={featuresProcessing}
                                        disabled={
                                            hasEmptyFeaturesRequiredFields ||
                                            !hasFeaturesSectionChanges
                                        }
                                        className="w-full md:w-[180px]"
                                    >
                                        Save Changes
                                    </SubmitButton>
                                    <button
                                        type="button"
                                        onClick={closeFeaturesModal}
                                        className="w-full md:w-[180px] rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {howItWorksModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40"
                        onClick={closeHowItWorksModal}
                    />
                    <div
                        className="relative w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">
                                Edit How It Works
                            </h3>
                            <button
                                type="button"
                                onClick={closeHowItWorksModal}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <form
                            onSubmit={submitHowItWorksSection}
                            className="space-y-4"
                        >
                            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <FormField
                                        label="Badge"
                                        error={howItWorksErrors.badge_text}
                                        required
                                    >
                                        <TextInput
                                            value={howItWorksData.badge_text}
                                            onChange={(event) =>
                                                updateHowItWorksField(
                                                    "badge_text",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Title"
                                        error={howItWorksErrors.title_text}
                                        required
                                    >
                                        <TextInput
                                            value={howItWorksData.title_text}
                                            onChange={(event) =>
                                                updateHowItWorksField(
                                                    "title_text",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Subtitle"
                                        error={howItWorksErrors.subtitle_text}
                                        required
                                    >
                                        <TextInput
                                            value={howItWorksData.subtitle_text}
                                            onChange={(event) =>
                                                updateHowItWorksField(
                                                    "subtitle_text",
                                                    event.target.value,
                                                )
                                            }
                                        />
                                    </FormField>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={addHowItWorksRow}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                    >
                                        + Add Card
                                    </button>
                                </div>

                                {(howItWorksData.steps ?? []).map(
                                    (row, index) => (
                                        <div
                                            key={
                                                row.id ??
                                                `how-it-works-${index}`
                                            }
                                            ref={(el) => {
                                                howItWorksContainerRefs.current[
                                                    index
                                                ] = el;
                                            }}
                                            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <div className="mb-3 flex items-center justify-between gap-2">
                                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Card #{index + 1}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveHowItWorksRow(
                                                                index,
                                                                "up",
                                                            )
                                                        }
                                                        aria-label={`Move How It Works #${index + 1} up`}
                                                        disabled={index === 0}
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <AppIcon
                                                            name="arrow-up"
                                                            className="h-4 w-4"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveHowItWorksRow(
                                                                index,
                                                                "down",
                                                            )
                                                        }
                                                        aria-label={`Move How It Works #${index + 1} down`}
                                                        disabled={
                                                            index ===
                                                            (howItWorksData.steps ??
                                                                []).length -
                                                                1
                                                        }
                                                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        <AppIcon
                                                            name="arrow-down"
                                                            className="h-4 w-4"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeHowItWorksRow(
                                                                index,
                                                            )
                                                        }
                                                        aria-label={`Delete How It Works #${index + 1}`}
                                                        className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <AppIcon
                                                            name="trash"
                                                            className="h-4 w-4"
                                                        />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-3">
                                                <FormField
                                                    label="Number Order"
                                                    error={
                                                        howItWorksErrors[
                                                            `steps.${index}.step_number`
                                                        ]
                                                    }
                                                    required
                                                >
                                                    <TextInput
                                                        value={
                                                            row.step_number ??
                                                            ""
                                                        }
                                                        onChange={(event) =>
                                                            updateHowItWorksRow(
                                                                index,
                                                                "step_number",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="e.g. 01"
                                                    />
                                                </FormField>
                                                <FormField
                                                    label="Card Title"
                                                    error={
                                                        howItWorksErrors[
                                                            `steps.${index}.title`
                                                        ]
                                                    }
                                                    required
                                                >
                                                    <TextInput
                                                        value={row.title ?? ""}
                                                        onChange={(event) =>
                                                            updateHowItWorksRow(
                                                                index,
                                                                "title",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </FormField>
                                                <FormField
                                                    label="Card Subtitle"
                                                    error={
                                                        howItWorksErrors[
                                                            `steps.${index}.subtitle`
                                                        ]
                                                    }
                                                    required
                                                >
                                                    <TextInput
                                                        value={
                                                            row.subtitle ?? ""
                                                        }
                                                        onChange={(event) =>
                                                            updateHowItWorksRow(
                                                                index,
                                                                "subtitle",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                </FormField>
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>

                            <div className="pt-2">
                                <div className="flex flex-col md:flex-row-reverse gap-3 md:justify-start w-full">
                                    <SubmitButton
                                        processing={howItWorksProcessing}
                                        disabled={
                                            hasEmptyHowItWorksRequiredFields ||
                                            !hasHowItWorksSectionChanges
                                        }
                                        className="w-full md:w-[180px]"
                                    >
                                        Save Changes
                                    </SubmitButton>
                                    <button
                                        type="button"
                                        onClick={closeHowItWorksModal}
                                        className="w-full md:w-[180px] rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40"
                        onClick={closeModal}
                    />
                    <div
                        className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">
                                Edit Header
                            </h3>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
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
                                            linkContainerRefs.current[index] =
                                                el;
                                        }}
                                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {ITEM_TYPE_OPTIONS.find(
                                                    (option) =>
                                                        option.value ===
                                                        row.item_type,
                                                )?.label ?? "Item"}{" "}
                                                #{index + 1}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveLinkRow(index, "up")
                                                    }
                                                    aria-label={`Move Link #${index + 1} up`}
                                                    disabled={index === 0}
                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <AppIcon
                                                        name="arrow-up"
                                                        className="h-4 w-4"
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveLinkRow(
                                                            index,
                                                            "down",
                                                        )
                                                    }
                                                    aria-label={`Move Link #${index + 1} down`}
                                                    disabled={
                                                        index ===
                                                        data.headers.length - 1
                                                    }
                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <AppIcon
                                                        name="arrow-down"
                                                        className="h-4 w-4"
                                                    />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeLink(index)
                                                    }
                                                    aria-label={`Delete Link #${index + 1}`}
                                                    className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                                >
                                                    <AppIcon
                                                        name="trash"
                                                        className="h-4 w-4"
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                        {row.item_type === "logo" && (
                                            <div className="mb-3 h-20 rounded-lg border border-slate-200 bg-white px-3 pt-2">
                                                <div className="flex h-full items-center justify-center">
                                                    {isImageTarget(
                                                        row.target,
                                                    ) ? (
                                                        <img
                                                            src={row.target}
                                                            alt={`${row.label || "Logo"} preview`}
                                                            className="h-10 w-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">
                                                            Logo preview
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        <div className="grid gap-3 md:grid-cols-[145px_minmax(170px,0.8fr)_minmax(235px,1fr)_auto] md:items-end">
                                            <FormField
                                                label="Type"
                                                error={
                                                    errors[
                                                        `headers.${index}.item_type`
                                                    ]
                                                }
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
                                                    {ITEM_TYPE_OPTIONS.map(
                                                        (option) => (
                                                            <option
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </option>
                                                        ),
                                                    )}
                                                </SelectInput>
                                            </FormField>
                                            <FormField
                                                label="Label"
                                                error={
                                                    errors[
                                                        `headers.${index}.label`
                                                    ]
                                                }
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
                                                error={
                                                    errors[
                                                        `headers.${index}.target`
                                                    ]
                                                }
                                                required
                                            >
                                                {row.item_type === "logo" ? (
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) =>
                                                            updateRow(
                                                                index,
                                                                "logo_file",
                                                                event.target
                                                                    .files?.[0] ??
                                                                    null,
                                                            )
                                                        }
                                                        className="block h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs leading-8 text-slate-700 sm:h-9 sm:text-sm sm:leading-9 file:my-1 file:mr-2 sm:file:mr-3 file:h-6 sm:file:h-7 file:w-[5.5rem] sm:file:w-24 file:rounded-md file:border-0 file:bg-slate-900 file:px-2 file:py-0 file:text-center file:text-xs sm:file:text-sm file:font-medium file:leading-6 sm:file:leading-7 file:text-white hover:file:bg-slate-800"
                                                    />
                                                ) : (
                                                    <TextInput
                                                        value={row.target}
                                                        onChange={(event) =>
                                                            updateRow(
                                                                index,
                                                                "target",
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                    />
                                                )}
                                            </FormField>
                                            <label className="flex items-center gap-2 text-sm text-slate-700 md:pb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(
                                                        row.is_active,
                                                    )}
                                                    onChange={(event) =>
                                                        updateRow(
                                                            index,
                                                            "is_active",
                                                            event.target
                                                                .checked,
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

                            <div className="pt-2">
                                <div className="flex flex-col md:flex-row-reverse gap-3 md:justify-start w-full">
                                    <SubmitButton
                                        processing={processing}
                                        disabled={
                                            hasEmptyRequiredFields ||
                                            !hasChanges
                                        }
                                        className="w-full md:w-[180px]"
                                    >
                                        Save Changes
                                    </SubmitButton>
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="w-full md:w-[180px] rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {rolesModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/40"
                        onClick={closeRolesModal}
                    />
                    <div
                        className="relative w-full max-w-4xl rounded-xl bg-white p-6 shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-900">
                                Edit User Roles
                            </h3>
                            <button
                                type="button"
                                onClick={closeRolesModal}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={submitRolesSection} className="space-y-4">
                            <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                                <div className="grid gap-3 md:grid-cols-3">
                                    <FormField
                                        label="Badge"
                                        error={rolesErrors.badge_text}
                                        required
                                    >
                                        <TextInput
                                            value={rolesData.badge_text}
                                            onChange={(event) =>
                                                updateRoleField("badge_text", event.target.value)
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Title"
                                        error={rolesErrors.title_text}
                                        required
                                    >
                                        <TextInput
                                            value={rolesData.title_text}
                                            onChange={(event) =>
                                                updateRoleField("title_text", event.target.value)
                                            }
                                        />
                                    </FormField>
                                    <FormField
                                        label="Subtitle"
                                        error={rolesErrors.subtitle_text}
                                        required
                                    >
                                        <TextInput
                                            value={rolesData.subtitle_text}
                                            onChange={(event) =>
                                                updateRoleField("subtitle_text", event.target.value)
                                            }
                                        />
                                    </FormField>
                                </div>

                                {(rolesData.roles ?? []).map((row, index) => (
                                    <div
                                        key={row.id ?? `role-${index}`}
                                        ref={(el) => {
                                            roleContainerRefs.current[index] = el;
                                        }}
                                        className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-2">
                                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Role #{index + 1}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => moveRoleRow(index, "up")}
                                                    aria-label={`Move Role #${index + 1} up`}
                                                    disabled={index === 0}
                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <AppIcon name="arrow-up" className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => moveRoleRow(index, "down")}
                                                    aria-label={`Move Role #${index + 1} down`}
                                                    disabled={index === (rolesData.roles ?? []).length - 1}
                                                    className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                                >
                                                    <AppIcon name="arrow-down" className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeRoleRow(index)}
                                                    aria-label={`Delete Role #${index + 1}`}
                                                    className="rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                                >
                                                    <AppIcon name="trash" className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-2 mb-3">
                                            <FormField
                                                label="Title"
                                                error={rolesErrors[`roles.${index}.title`]}
                                                required
                                            >
                                                <TextInput
                                                    value={row.title ?? ""}
                                                    onChange={(event) =>
                                                        updateRoleRow(index, "title", event.target.value)
                                                    }
                                                    placeholder="e.g. Faculty"
                                                />
                                            </FormField>
                                            <FormField
                                                label="Description"
                                                error={rolesErrors[`roles.${index}.desc_text`]}
                                            >
                                                <TextInput
                                                    value={row.desc_text ?? ""}
                                                    onChange={(event) =>
                                                        updateRoleRow(index, "desc_text", event.target.value)
                                                    }
                                                />
                                            </FormField>
                                            <FormField
                                                label="Icon Type"
                                                error={rolesErrors[`roles.${index}.icon_type`]}
                                            >
                                                <SelectInput
                                                    value={row.icon_type ?? "faculty"}
                                                    onChange={(event) =>
                                                        updateRoleRow(index, "icon_type", event.target.value)
                                                    }
                                                >
                                                    <option value="faculty">Faculty</option>
                                                    <option value="peer">Peer</option>
                                                    <option value="student">Student</option>
                                                    <option value="admin">Administrator</option>
                                                </SelectInput>
                                            </FormField>
                                            <FormField
                                                label="Progress (%)"
                                                error={rolesErrors[`roles.${index}.progress`]}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <TextInput
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={String(row.progress ?? "")}
                                                        placeholder="0–100"
                                                        className="flex-1"
                                                        onChange={(event) => {
                                                            const raw = event.target.value.replace(/[^0-9]/g, "");
                                                            const clamped = raw === "" ? "" : String(Math.min(100, parseInt(raw, 10)));
                                                            updateRoleRow(index, "progress", clamped);
                                                        }}
                                                    />
                                                    {(() => {
                                                        const pct = Math.min(100, Math.max(0, Number(row.progress) || 0));
                                                        const r = 24;
                                                        const circ = 2 * Math.PI * r;
                                                        const offset = circ * (1 - pct / 100);
                                                        return (
                                                            <svg viewBox="0 0 60 60" className="w-14 h-14 shrink-0">
                                                                <circle cx="30" cy="30" r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
                                                                <circle
                                                                    cx="30" cy="30" r={r}
                                                                    fill="none" stroke="#3b82f6" strokeWidth="5"
                                                                    strokeDasharray={circ}
                                                                    strokeDashoffset={offset}
                                                                    strokeLinecap="round"
                                                                    transform="rotate(-90 30 30)"
                                                                />
                                                                <text x="30" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill="#3b82f6">
                                                                    {pct}%
                                                                </text>
                                                            </svg>
                                                        );
                                                    })()}
                                                </div>
                                            </FormField>
                                        </div>

                                        <div>
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Features
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => addFeatureToRole(index)}
                                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                                >
                                                    + Add
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {(row.features ?? []).map((feat, fi) => (
                                                    <div key={fi} className="flex gap-2">
                                                        <TextInput
                                                            value={feat}
                                                            onChange={(event) =>
                                                                updateFeatureInRole(index, fi, event.target.value)
                                                            }
                                                            placeholder={`Feature ${fi + 1}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFeatureFromRole(index, fi)}
                                                            aria-label={`Remove feature ${fi + 1}`}
                                                            className="shrink-0 rounded-lg border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <AppIcon name="trash" className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-2">
                                <div className="flex flex-col md:flex-row-reverse gap-3 md:justify-start w-full">
                                    <SubmitButton
                                        processing={rolesProcessing}
                                        disabled={hasEmptyRolesRequiredFields || !hasRolesSectionChanges}
                                        className="w-full md:w-[180px]"
                                    >
                                        Save Changes
                                    </SubmitButton>
                                    <button
                                        type="button"
                                        onClick={closeRolesModal}
                                        className="w-full md:w-[180px] rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </AdminLayout>
    );
}
