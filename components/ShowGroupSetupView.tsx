"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

// ─── Types ─────────────────────────────────────────────────────────────────

type Season = {
    id: string;
    year: number;
    season_key: string;
};

type ShowThemeType = {
    id: string;
    name: string;
    is_active: boolean;
};

type ShowTheme = {
    id: string;
    name: string;
    show_theme_type_id: string;
    is_active: boolean;
};

type ShowGroupInstance = {
    id: string;
    school_id: string;
    season_id: string | null;
    theme_type_id: string | null;
    show_theme_id: string | null;
    name: string;
    venue_name: string | null;
    class_instructor_id: string | null;
    start_date: string | null;
    end_date: string | null;
    status: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
};

type RehearsalRoom = {
    id: string;
    name: string;
    order_index: number;
};

type Membership = {
    id: string;
    show_group_instance_id: string;
    student_id: string;
    status: string;
    joined_at: string | null;
};

type StudentRow = {
    id: string;
    firstName: string;
    lastInitial: string;
    instrument: string;
    schoolId: string;
    program: string;
    active: boolean;
};

type ShowTypeKey = "heavy" | "steady" | "custom";

type FormState = {
    seasonId: string;
    showType: ShowTypeKey | null;
    themeId: string;
    name: string;
    venueName: string;
    instructorId: string;
};

type ShowGroupSetupViewProps = {
    schoolId: string;
    schoolName: string;
    users: { id: string; name: string; email: string; role: string }[];
    students: StudentRow[];
    onStartCasting?: (showGroupId: string) => void;
};

// ─── Constants ─────────────────────────────────────────────────────────────

const SEASON_ORDER: Record<string, number> = { spring: 1, summer: 2, fall: 3 };

const INSTRUMENT_ORDER = ["vocals", "guitar", "bass", "drums", "keys"];

const DEFAULT_FORM: FormState = {
    seasonId: "",
    showType: null,
    themeId: "",
    name: "",
    venueName: "",
    instructorId: "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatSeason(s: Season): string {
    const key = s.season_key.toLowerCase();
    return `${key.charAt(0).toUpperCase()}${key.slice(1)} ${s.year}`;
}

function sortSeasons(a: Season, b: Season): number {
    if (a.year !== b.year) return b.year - a.year;
    const ao = SEASON_ORDER[a.season_key.toLowerCase()] ?? 99;
    const bo = SEASON_ORDER[b.season_key.toLowerCase()] ?? 99;
    return ao - bo;
}

function getThemeTypeId(
    showType: ShowTypeKey,
    themeTypes: ShowThemeType[]
): string | null {
    if (showType === "custom") return null;
    const keyword = showType === "heavy" ? "heavy" : "steady";
    return themeTypes.find((t) => t.name.toLowerCase().includes(keyword))?.id ?? null;
}

function getFilteredThemes(
    showType: ShowTypeKey | null,
    themeTypes: ShowThemeType[],
    allThemes: ShowTheme[]
): ShowTheme[] {
    if (!showType || showType === "custom") return [];
    const typeId = getThemeTypeId(showType, themeTypes);
    if (!typeId) return allThemes;
    return allThemes.filter((t) => t.show_theme_type_id === typeId);
}

function detectShowType(
    group: ShowGroupInstance,
    themeTypes: ShowThemeType[]
): ShowTypeKey {
    if (!group.theme_type_id) return "custom";
    const tt = themeTypes.find((t) => t.id === group.theme_type_id);
    if (!tt) return "custom";
    const name = tt.name.toLowerCase();
    if (name.includes("heavy")) return "heavy";
    if (name.includes("steady")) return "steady";
    return "custom";
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function ShowGroupSetupView({
    schoolId,
    schoolName,
    users,
    students,
    onStartCasting,
}: ShowGroupSetupViewProps) {
    const [showGroups, setShowGroups] = useState<ShowGroupInstance[]>([]);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [themeTypes, setThemeTypes] = useState<ShowThemeType[]>([]);
    const [themes, setThemes] = useState<ShowTheme[]>([]);
    const [rooms, setRooms] = useState<RehearsalRoom[]>([]);
    const [loading, setLoading] = useState(true);

    // Create form
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [createForm, setCreateForm] = useState<FormState>({ ...DEFAULT_FORM });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState("");

    // Expand / edit
    const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<FormState>({ ...DEFAULT_FORM });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    // Rooms
    const [newRoomName, setNewRoomName] = useState("");
    const [addingRoom, setAddingRoom] = useState(false);

    // Roster tab
    const [activeTab, setActiveTab] = useState<"editDetails" | "roster">("editDetails");
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loadingRoster, setLoadingRoster] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    // ─── Data loading ────────────────────────────────────────────────────

    const loadAll = useCallback(async () => {
        setLoading(true);
        const [groupsRes, seasonsRes, typesRes, themesRes, roomsRes] =
            await Promise.all([
                supabase
                    .from("show_group_instances")
                    .select(
                        "id, school_id, season_id, theme_type_id, show_theme_id, name, venue_name, class_instructor_id, start_date, end_date, status, day_of_week, start_time, end_time"
                    )
                    .eq("school_id", schoolId)
                    .order("start_date", { ascending: false }),
                supabase.from("seasons").select("id, year, season_key"),
                supabase
                    .from("show_theme_types")
                    .select("id, name, is_active")
                    .eq("is_active", true),
                supabase
                    .from("show_themes")
                    .select("id, name, show_theme_type_id, is_active")
                    .eq("is_active", true)
                    .order("name"),
                supabase
                    .from("rehearsal_rooms")
                    .select("id, name, order_index")
                    .eq("school_id", schoolId)
                    .eq("is_active", true)
                    .order("order_index"),
            ]);

        setShowGroups((groupsRes.data ?? []) as ShowGroupInstance[]);
        setSeasons(
            [...((seasonsRes.data ?? []) as Season[])].sort(sortSeasons)
        );
        setThemeTypes((typesRes.data ?? []) as ShowThemeType[]);
        setThemes((themesRes.data ?? []) as ShowTheme[]);
        setRooms((roomsRes.data ?? []) as RehearsalRoom[]);
        setLoading(false);
    }, [schoolId]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const loadMemberships = useCallback(async (groupId: string) => {
        setLoadingRoster(true);
        const { data, error } = await supabase
            .from("show_group_student_memberships")
            .select("id, show_group_instance_id, student_id, status, joined_at")
            .eq("show_group_instance_id", groupId)
            .neq("status", "removed");
        if (!error) setMemberships((data ?? []) as Membership[]);
        setLoadingRoster(false);
    }, []);

    // ─── Derived helpers ─────────────────────────────────────────────────

    function getInstructors() {
        return users.filter(
            (u) => u.role === "instructor" || u.role === "music_director"
        );
    }

    function getSeasonLabel(seasonId: string | null): string {
        if (!seasonId) return "";
        const s = seasons.find((x) => x.id === seasonId);
        return s ? formatSeason(s) : "";
    }

    function getThemeLabel(themeId: string | null): string {
        if (!themeId) return "Custom Show";
        return themes.find((t) => t.id === themeId)?.name ?? "Custom Show";
    }

    function getInstructorName(instructorId: string | null): string {
        if (!instructorId) return "";
        return users.find((u) => u.id === instructorId)?.name ?? "";
    }

    function buildAutoName(form: FormState): string {
        if (!schoolName || schoolName === "All Schools") return "";
        if (!form.showType || form.showType === "custom") return "";
        const theme = themes.find((t) => t.id === form.themeId);
        const season = seasons.find((s) => s.id === form.seasonId);
        if (!theme || !season) return "";
        return `${schoolName} – ${theme.name} ${formatSeason(season)}`;
    }

    // ─── Form change handlers ────────────────────────────────────────────

    function applyFormChanges(
        prev: FormState,
        updates: Partial<FormState>
    ): FormState {
        const next = { ...prev, ...updates };

        // Switching to custom: clear theme + name
        if (updates.showType === "custom") {
            next.themeId = "";
            next.name = "";
            return next;
        }

        // Switching between heavy/steady: clear theme + name
        if (
            updates.showType &&
            updates.showType !== prev.showType
        ) {
            next.themeId = "";
            next.name = "";
            return next;
        }

        // Auto-populate name when themed + both theme and season are set
        if (
            next.showType &&
            next.showType !== "custom" &&
            next.themeId &&
            next.seasonId &&
            (updates.themeId !== undefined ||
                updates.seasonId !== undefined ||
                updates.showType !== undefined)
        ) {
            const autoName = buildAutoName(next);
            if (autoName) next.name = autoName;
        }

        return next;
    }

    function handleCreateFormChange(updates: Partial<FormState>) {
        setCreateForm((prev) => applyFormChanges(prev, updates));
    }

    function handleEditFormChange(updates: Partial<FormState>) {
        setEditForm((prev) => applyFormChanges(prev, updates));
    }

    // ─── Create ──────────────────────────────────────────────────────────

    async function handleCreate() {
        if (!createForm.name.trim()) {
            setCreateError("Show group name is required.");
            return;
        }
        setCreating(true);
        setCreateError("");
        const themeTypeId =
            createForm.showType && createForm.showType !== "custom"
                ? getThemeTypeId(createForm.showType, themeTypes)
                : null;
        const { error } = await supabase.from("show_group_instances").insert({
            school_id: schoolId,
            season_id: createForm.seasonId || null,
            theme_type_id: themeTypeId,
            show_theme_id:
                createForm.showType !== "custom"
                    ? createForm.themeId || null
                    : null,
            name: createForm.name.trim(),
            venue_name: createForm.venueName.trim() || null,
            class_instructor_id: createForm.instructorId || null,
            status: "active",
        });
        setCreating(false);
        if (error) {
            setCreateError(error.message);
            return;
        }
        setCreateForm({ ...DEFAULT_FORM });
        setShowCreateForm(false);
        await loadAll();
    }

    // ─── Expand / edit ───────────────────────────────────────────────────

    function handleExpand(group: ShowGroupInstance) {
        if (expandedGroupId === group.id) {
            setExpandedGroupId(null);
            return;
        }
        setExpandedGroupId(group.id);
        setSaveError("");
        setActiveTab("editDetails");
        setMemberships([]);
        setShowPicker(false);
        const showType = detectShowType(group, themeTypes);
        setEditForm({
            seasonId: group.season_id ?? "",
            showType,
            themeId: group.show_theme_id ?? "",
            name: group.name,
            venueName: group.venue_name ?? "",
            instructorId: group.class_instructor_id ?? "",
        });
    }

    async function handleSaveEdit(groupId: string) {
        if (!editForm.name.trim()) {
            setSaveError("Show group name is required.");
            return;
        }
        setSaving(true);
        setSaveError("");
        const themeTypeId =
            editForm.showType && editForm.showType !== "custom"
                ? getThemeTypeId(editForm.showType, themeTypes)
                : null;
        const { error } = await supabase
            .from("show_group_instances")
            .update({
                season_id: editForm.seasonId || null,
                theme_type_id: themeTypeId,
                show_theme_id:
                    editForm.showType !== "custom"
                        ? editForm.themeId || null
                        : null,
                name: editForm.name.trim(),
                venue_name: editForm.venueName.trim() || null,
                class_instructor_id: editForm.instructorId || null,
            })
            .eq("id", groupId);
        setSaving(false);
        if (error) {
            setSaveError(error.message);
            return;
        }
        await loadAll();
    }

    async function handleToggleStatus(group: ShowGroupInstance) {
        const newStatus = group.status === "active" ? "inactive" : "active";
        await supabase
            .from("show_group_instances")
            .update({ status: newStatus })
            .eq("id", group.id);
        await loadAll();
    }

    // ─── Rooms ───────────────────────────────────────────────────────────

    async function handleAddRoom() {
        if (!newRoomName.trim()) return;
        setAddingRoom(true);
        const nextOrder =
            rooms.length > 0
                ? Math.max(...rooms.map((r) => r.order_index)) + 1
                : 1;
        const { error } = await supabase.from("rehearsal_rooms").insert({
            school_id: schoolId,
            name: newRoomName.trim(),
            order_index: nextOrder,
            is_active: true,
        });
        setAddingRoom(false);
        if (!error) {
            setNewRoomName("");
            await loadAll();
        }
    }

    async function handleDeleteRoom(roomId: string, roomName: string) {
        if (
            !window.confirm(
                `Remove rehearsal room "${roomName}"? This affects all show groups at this school.`
            )
        )
            return;
        await supabase
            .from("rehearsal_rooms")
            .update({ is_active: false })
            .eq("id", roomId);
        await loadAll();
    }

    // ─── Roster handlers ────────────────────────────────────────────────

    function handleRosterTabOpen(groupId: string) {
        setActiveTab("roster");
        setMemberships([]);
        loadMemberships(groupId);
    }

    async function handleAddStudent(studentId: string) {
        if (!expandedGroupId) return;
        const { error } = await supabase
            .from("show_group_student_memberships")
            .insert({
                show_group_instance_id: expandedGroupId,
                student_id: studentId,
                status: "active",
                joined_at: new Date().toISOString(),
            });
        if (!error) await loadMemberships(expandedGroupId);
    }

    async function handleRemoveStudent(membershipId: string) {
        if (!expandedGroupId) return;
        const { error } = await supabase
            .from("show_group_student_memberships")
            .update({ status: "removed" })
            .eq("id", membershipId);
        if (!error) await loadMemberships(expandedGroupId);
    }

    function getInstrumentBucket(instrument: string): string {
        const lower = instrument.toLowerCase();
        return INSTRUMENT_ORDER.includes(lower) ? lower : "other";
    }

    function instrumentLabel(bucket: string): string {
        return bucket === "other"
            ? "Other"
            : bucket.charAt(0).toUpperCase() + bucket.slice(1);
    }

    function renderRosterTab(group: ShowGroupInstance) {
        type EnrolledEntry = { membership: Membership; student: StudentRow };

        const enrolledIds = new Set(memberships.map((m) => m.student_id));

        const enrolled: EnrolledEntry[] = memberships
            .map((m) => {
                const s = students.find((st) => st.id === m.student_id);
                return s ? { membership: m, student: s } : null;
            })
            .filter((x): x is EnrolledEntry => x !== null)
            .sort((a, b) => {
                const ai = INSTRUMENT_ORDER.indexOf(getInstrumentBucket(a.student.instrument));
                const bi = INSTRUMENT_ORDER.indexOf(getInstrumentBucket(b.student.instrument));
                const ao = ai === -1 ? INSTRUMENT_ORDER.length : ai;
                const bo = bi === -1 ? INSTRUMENT_ORDER.length : bi;
                if (ao !== bo) return ao - bo;
                return (a.student.firstName + a.student.lastInitial).localeCompare(
                    b.student.firstName + b.student.lastInitial
                );
            });

        const counts: Record<string, number> = {};
        enrolled.forEach(({ student }) => {
            const bucket = getInstrumentBucket(student.instrument);
            counts[bucket] = (counts[bucket] ?? 0) + 1;
        });
        const summaryParts = [
            ...INSTRUMENT_ORDER.filter((i) => counts[i] > 0).map(
                (i) => `${counts[i]} ${i}`
            ),
            ...(counts["other"] > 0 ? [`${counts["other"]} other`] : []),
        ];

        const enrolledByInstrument: { bucket: string; entries: EnrolledEntry[] }[] = [];
        INSTRUMENT_ORDER.forEach((bucket) => {
            const entries = enrolled.filter(
                (e) => getInstrumentBucket(e.student.instrument) === bucket
            );
            if (entries.length > 0) enrolledByInstrument.push({ bucket, entries });
        });
        const otherEnrolled = enrolled.filter(
            (e) => getInstrumentBucket(e.student.instrument) === "other"
        );
        if (otherEnrolled.length > 0)
            enrolledByInstrument.push({ bucket: "other", entries: otherEnrolled });

        const available = students
            .filter(
                (s) =>
                    s.program === "performance_program" &&
                    s.schoolId === group.school_id &&
                    s.active &&
                    !enrolledIds.has(s.id)
            )
            .sort((a, b) => {
                const ai = INSTRUMENT_ORDER.indexOf(getInstrumentBucket(a.instrument));
                const bi = INSTRUMENT_ORDER.indexOf(getInstrumentBucket(b.instrument));
                const ao = ai === -1 ? INSTRUMENT_ORDER.length : ai;
                const bo = bi === -1 ? INSTRUMENT_ORDER.length : bi;
                if (ao !== bo) return ao - bo;
                return (a.firstName + a.lastInitial).localeCompare(b.firstName + b.lastInitial);
            });

        const availableByInstrument: { bucket: string; items: StudentRow[] }[] = [];
        INSTRUMENT_ORDER.forEach((bucket) => {
            const items = available.filter(
                (s) => getInstrumentBucket(s.instrument) === bucket
            );
            if (items.length > 0) availableByInstrument.push({ bucket, items });
        });
        const otherAvailable = available.filter(
            (s) => getInstrumentBucket(s.instrument) === "other"
        );
        if (otherAvailable.length > 0)
            availableByInstrument.push({ bucket: "other", items: otherAvailable });

        if (loadingRoster) {
            return (
                <div className="py-8 text-center text-sm text-zinc-400">
                    Loading roster...
                </div>
            );
        }

        return (
            <div>
                {/* Section A — Enrolled Students */}
                <div>
                    {enrolled.length === 0 ? (
                        <p className="mb-3 text-sm text-zinc-500">
                            No students enrolled yet.
                        </p>
                    ) : (
                        <>
                            <p className="mb-3 text-sm text-zinc-400">
                                {enrolled.length} student
                                {enrolled.length !== 1 ? "s" : ""} enrolled
                                {summaryParts.length > 0 &&
                                    ` — ${summaryParts.join(" · ")}`}
                            </p>
                            {enrolledByInstrument.map(({ bucket, entries }) => (
                                <div key={bucket}>
                                    <div
                                        className="mb-1 mt-3 text-xs font-bold uppercase text-zinc-400"
                                        style={{ fontFamily: "var(--font-oswald)" }}
                                    >
                                        {instrumentLabel(bucket)}
                                    </div>
                                    {entries.map(({ membership, student }) => (
                                        <div
                                            key={membership.id}
                                            className="flex items-center gap-3 bg-[#111111] px-3 py-2"
                                        >
                                            <span className="flex-1 text-sm text-white">
                                                {student.firstName}{" "}
                                                {student.lastInitial}
                                            </span>
                                            <span className="rounded-none bg-zinc-700 px-2 py-0.5 text-xs uppercase text-white">
                                                {student.instrument}
                                            </span>
                                            {membership.status !== "active" && (
                                                <span className="rounded-none bg-zinc-800 px-2 py-0.5 text-xs uppercase text-zinc-400">
                                                    {membership.status}
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveStudent(membership.id)
                                                }
                                                className="rounded-none border border-[#cc0000] px-2 py-1 text-xs text-[#cc0000] hover:bg-[#cc0000] hover:text-white"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Section B — Add Students */}
                <div className="mt-4">
                    {!showPicker ? (
                        <button
                            type="button"
                            onClick={() => setShowPicker(true)}
                            className="rounded-none border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                        >
                            + Add Student
                        </button>
                    ) : (
                        <div className="border border-zinc-700 p-4">
                            <div
                                className="mb-3 text-sm font-bold uppercase text-zinc-300"
                                style={{ fontFamily: "var(--font-oswald)" }}
                            >
                                Add Students
                            </div>
                            {available.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No available Performance Program students to add.
                                </p>
                            ) : (
                                availableByInstrument.map(({ bucket, items }) => (
                                    <div key={bucket}>
                                        <div
                                            className="mb-1 mt-3 text-xs font-bold uppercase text-zinc-400"
                                            style={{ fontFamily: "var(--font-oswald)" }}
                                        >
                                            {instrumentLabel(bucket)}
                                        </div>
                                        {items.map((s) => (
                                            <div
                                                key={s.id}
                                                className="flex items-center gap-3 bg-[#111111] px-3 py-2"
                                            >
                                                <span className="flex-1 text-sm text-white">
                                                    {s.firstName} {s.lastInitial}
                                                </span>
                                                <span className="rounded-none bg-zinc-700 px-2 py-0.5 text-xs uppercase text-white">
                                                    {s.instrument}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAddStudent(s.id)}
                                                    className="rounded-none bg-[#cc0000] px-2 py-1 text-xs text-white hover:bg-[#b30000]"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ))
                            )}
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPicker(false)}
                                    className="rounded-none border border-zinc-600 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── Form fields renderer ────────────────────────────────────────────

    function renderFormFields(
        form: FormState,
        onChange: (updates: Partial<FormState>) => void
    ) {
        const instructors = getInstructors();
        const filteredThemes = getFilteredThemes(form.showType, themeTypes, themes);

        return (
            <div className="space-y-4">
                {/* Season */}
                <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
                        Season
                    </label>
                    <select
                        value={form.seasonId}
                        onChange={(e) => onChange({ seasonId: e.target.value })}
                        className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                    >
                        <option value="">— Select Season —</option>
                        {seasons.map((s) => (
                            <option
                                key={s.id}
                                value={s.id}
                                style={{ backgroundColor: "#000" }}
                            >
                                {formatSeason(s)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Show Type — three buttons */}
                <div>
                    <label className="mb-2 block text-xs uppercase tracking-wide text-zinc-400">
                        Show Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {(["heavy", "steady", "custom"] as ShowTypeKey[]).map(
                            (type) => {
                                const labels: Record<ShowTypeKey, string> = {
                                    heavy: "Heavy Rotation",
                                    steady: "Steady Rotation",
                                    custom: "Custom Show",
                                };
                                const isSelected = form.showType === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() =>
                                            onChange({ showType: type })
                                        }
                                        className={`rounded-none px-4 py-2 text-sm font-medium ${
                                            isSelected
                                                ? "bg-[#cc0000] text-white"
                                                : "border border-zinc-600 bg-transparent text-zinc-300 hover:bg-zinc-800"
                                        }`}
                                    >
                                        {labels[type]}
                                    </button>
                                );
                            }
                        )}
                    </div>
                </div>

                {/* Theme — only for heavy/steady */}
                {form.showType && form.showType !== "custom" && (
                    <div>
                        <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
                            Theme
                        </label>
                        <select
                            value={form.themeId}
                            onChange={(e) =>
                                onChange({ themeId: e.target.value })
                            }
                            className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                        >
                            <option value="">— Select Theme —</option>
                            {filteredThemes.map((t) => (
                                <option
                                    key={t.id}
                                    value={t.id}
                                    style={{ backgroundColor: "#000" }}
                                >
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Show Group Name */}
                <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
                        Show Group Name
                        {form.showType === "custom" && (
                            <span className="ml-1 text-[#cc0000]">*</span>
                        )}
                    </label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => onChange({ name: e.target.value })}
                        placeholder={
                            form.showType === "custom"
                                ? "Enter show group name"
                                : "Auto-populated from theme + season"
                        }
                        className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                </div>

                {/* Venue */}
                <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
                        Venue Name{" "}
                        <span className="normal-case text-zinc-500">
                            (optional)
                        </span>
                    </label>
                    <input
                        type="text"
                        value={form.venueName}
                        onChange={(e) =>
                            onChange({ venueName: e.target.value })
                        }
                        placeholder="Performance venue"
                        className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                    />
                </div>

                {/* Class Instructor */}
                <div>
                    <label className="mb-1 block text-xs uppercase tracking-wide text-zinc-400">
                        Class Instructor{" "}
                        <span className="normal-case text-zinc-500">
                            (optional)
                        </span>
                    </label>
                    <select
                        value={form.instructorId}
                        onChange={(e) =>
                            onChange({ instructorId: e.target.value })
                        }
                        className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none"
                    >
                        <option value="">— Unassigned —</option>
                        {instructors.map((u) => (
                            <option
                                key={u.id}
                                value={u.id}
                                style={{ backgroundColor: "#000" }}
                            >
                                {u.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    // ─── Render ──────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-white">
            <div className="space-y-4 px-6 pb-6 pt-6">
                {/* Header tile */}
                <div className="rounded-none bg-[#111111] p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1
                                className="text-2xl font-bold uppercase leading-none"
                                style={{ fontFamily: "var(--font-oswald)" }}
                            >
                                <span style={{ color: "#cc0000" }}>SHOW</span>{" "}
                                <em className="not-italic text-white">GROUPS</em>
                            </h1>
                            <div className="mt-2 h-0.5 w-12 bg-[#cc0000]" />
                            <p className="mt-2 text-sm text-zinc-400">
                                Create and manage Performance Program show
                                groups for this school.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreateForm((prev) => !prev);
                                setCreateForm({ ...DEFAULT_FORM });
                                setCreateError("");
                            }}
                            className="shrink-0 rounded-none bg-[#cc0000] px-4 py-2 text-sm font-medium text-white hover:bg-[#b30000]"
                        >
                            {showCreateForm ? "Cancel" : "+ New Show Group"}
                        </button>
                    </div>
                </div>

                {/* Create form */}
                {showCreateForm && (
                    <div className="rounded-none bg-[#111111] p-5">
                        <h2
                            className="mb-4 text-lg font-bold uppercase text-white"
                            style={{ fontFamily: "var(--font-oswald)" }}
                        >
                            New Show Group
                        </h2>
                        {renderFormFields(createForm, handleCreateFormChange)}
                        {createError && (
                            <p className="mt-3 text-sm text-[#cc0000]">
                                {createError}
                            </p>
                        )}
                        <div className="mt-5 flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleCreate}
                                disabled={creating}
                                className="rounded-none bg-[#cc0000] px-5 py-2 text-sm font-medium text-white hover:bg-[#b30000] disabled:opacity-50"
                            >
                                {creating ? "Creating..." : "Create Show Group"}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setCreateForm({ ...DEFAULT_FORM });
                                    setCreateError("");
                                }}
                                className="rounded-none border border-zinc-600 px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* Group list */}
                {loading ? (
                    <div className="rounded-none bg-[#111111] p-8 text-center text-zinc-400">
                        Loading show groups...
                    </div>
                ) : showGroups.length === 0 ? (
                    <div className="rounded-none bg-[#111111] p-8 text-center text-zinc-400">
                        No show groups yet. Click &ldquo;+ New Show Group&rdquo; to
                        create one.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {showGroups.map((group) => {
                            const isExpanded = expandedGroupId === group.id;
                            const seasonLabel = getSeasonLabel(group.season_id);
                            const themeName = getThemeLabel(group.show_theme_id);
                            const instructorName = getInstructorName(
                                group.class_instructor_id
                            );
                            const isActive = group.status === "active";

                            return (
                                <div
                                    key={group.id}
                                    className="rounded-none bg-[#1a1a1a]"
                                >
                                    {/* Tile header */}
                                    <button
                                        type="button"
                                        onClick={() => handleExpand(group)}
                                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                                    >
                                        <div className="flex min-w-0 flex-1 items-start gap-4">
                                            <div className="min-w-0 flex-1">
                                                <div
                                                    className="truncate text-base font-bold uppercase text-white"
                                                    style={{
                                                        fontFamily:
                                                            "var(--font-oswald)",
                                                    }}
                                                >
                                                    {group.name}
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-zinc-400">
                                                    {group.day_of_week && (
                                                        <span>
                                                            {group.day_of_week}
                                                        </span>
                                                    )}
                                                    {group.start_time &&
                                                        group.end_time && (
                                                            <span>
                                                                ·{" "}
                                                                {group.start_time}{" "}
                                                                –{" "}
                                                                {group.end_time}
                                                            </span>
                                                        )}
                                                    {themeName && (
                                                        <span>
                                                            · {themeName}
                                                        </span>
                                                    )}
                                                    {instructorName && (
                                                        <span>
                                                            · {instructorName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-2">
                                                {seasonLabel && (
                                                    <span className="rounded-none bg-zinc-700 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-white">
                                                        {seasonLabel.toUpperCase()}
                                                    </span>
                                                )}
                                                <span
                                                    className={`rounded-none px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                                                        isActive
                                                            ? "bg-green-900 text-green-300"
                                                            : "bg-zinc-700 text-zinc-400"
                                                    }`}
                                                >
                                                    {group.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="ml-4 shrink-0 text-zinc-500">
                                            {isExpanded ? "▲" : "▼"}
                                        </div>
                                    </button>

                                    {/* Casting shortcut */}
                                    {onStartCasting && isActive && (
                                        <div className="flex justify-end border-t border-zinc-800 px-5 py-2">
                                            <button
                                                type="button"
                                                onClick={() => onStartCasting(group.id)}
                                                className="rounded-none bg-[#cc0000] px-4 py-1.5 text-xs font-bold uppercase text-white hover:bg-[#b30000]"
                                            >
                                                Go to Casting
                                            </button>
                                        </div>
                                    )}

                                    {/* Expanded panel */}
                                    {isExpanded && (
                                        <div className="border-t border-zinc-700">
                                            {/* Tab buttons */}
                                            <div className="flex gap-2 px-5 pt-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveTab("editDetails")
                                                    }
                                                    className={`rounded-none px-4 py-1.5 text-xs font-bold uppercase ${
                                                        activeTab === "editDetails"
                                                            ? "bg-[#cc0000] text-white"
                                                            : "border border-zinc-600 bg-transparent text-zinc-400"
                                                    }`}
                                                >
                                                    Edit Details
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleRosterTabOpen(group.id)
                                                    }
                                                    className={`rounded-none px-4 py-1.5 text-xs font-bold uppercase ${
                                                        activeTab === "roster"
                                                            ? "bg-[#cc0000] text-white"
                                                            : "border border-zinc-600 bg-transparent text-zinc-400"
                                                    }`}
                                                >
                                                    Roster
                                                </button>
                                            </div>

                                            {/* Edit Details tab */}
                                            {activeTab === "editDetails" && (
                                                <div className="space-y-6 px-5 py-5">
                                                    {/* Edit form */}
                                                    <div>
                                                        <h3
                                                            className="mb-4 text-sm font-bold uppercase text-zinc-300"
                                                            style={{
                                                                fontFamily:
                                                                    "var(--font-oswald)",
                                                            }}
                                                        >
                                                            Edit Details
                                                        </h3>
                                                        {renderFormFields(
                                                            editForm,
                                                            handleEditFormChange
                                                        )}
                                                        {saveError && (
                                                            <p className="mt-3 text-sm text-[#cc0000]">
                                                                {saveError}
                                                            </p>
                                                        )}
                                                        <div className="mt-5 flex flex-wrap gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleSaveEdit(
                                                                        group.id
                                                                    )
                                                                }
                                                                disabled={saving}
                                                                className="rounded-none bg-[#cc0000] px-5 py-2 text-sm font-medium text-white hover:bg-[#b30000] disabled:opacity-50"
                                                            >
                                                                {saving
                                                                    ? "Saving..."
                                                                    : "Save Changes"}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleToggleStatus(
                                                                        group
                                                                    )
                                                                }
                                                                className="rounded-none border border-zinc-600 px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
                                                            >
                                                                {isActive
                                                                    ? "Set Inactive"
                                                                    : "Set Active"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Rehearsal Rooms */}
                                                    <div className="border-t border-zinc-800 pt-5">
                                                        <h3
                                                            className="mb-3 text-sm font-bold uppercase text-zinc-300"
                                                            style={{
                                                                fontFamily:
                                                                    "var(--font-oswald)",
                                                            }}
                                                        >
                                                            Rehearsal Rooms
                                                            <span className="ml-2 text-xs font-normal normal-case text-zinc-500">
                                                                school-level · affects
                                                                all show groups
                                                            </span>
                                                        </h3>
                                                        {rooms.length === 0 ? (
                                                            <p className="mb-4 text-sm text-zinc-500">
                                                                No rehearsal rooms added
                                                                yet.
                                                            </p>
                                                        ) : (
                                                            <div className="mb-4 space-y-1">
                                                                {rooms.map((room) => (
                                                                    <div
                                                                        key={room.id}
                                                                        className="flex items-center justify-between rounded-none bg-zinc-900 px-3 py-2"
                                                                    >
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="w-5 text-right text-xs text-zinc-500">
                                                                                {
                                                                                    room.order_index
                                                                                }
                                                                            </span>
                                                                            <span className="text-sm text-white">
                                                                                {
                                                                                    room.name
                                                                                }
                                                                            </span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleDeleteRoom(
                                                                                    room.id,
                                                                                    room.name
                                                                                )
                                                                            }
                                                                            className="text-xs text-zinc-500 hover:text-[#cc0000]"
                                                                        >
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={newRoomName}
                                                                onChange={(e) =>
                                                                    setNewRoomName(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter")
                                                                        handleAddRoom();
                                                                }}
                                                                placeholder="New room name"
                                                                className="flex-1 rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white outline-none placeholder:text-zinc-600"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={handleAddRoom}
                                                                disabled={
                                                                    !newRoomName.trim() ||
                                                                    addingRoom
                                                                }
                                                                className="rounded-none bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 disabled:opacity-50"
                                                            >
                                                                Add Room
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Roster tab */}
                                            {activeTab === "roster" && (
                                                <div className="px-5 py-5">
                                                    {renderRosterTab(group)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
