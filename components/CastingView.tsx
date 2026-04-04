"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { supabase } from "@/lib/supabaseClient";
import type { SessionUser } from "@/lib/session";

// ─── Types ─────────────────────────────────────────────────────────────────

type ShowGroup = {
    id: string;
    name: string;
    school_id: string;
    season_id: string | null;
    show_theme_id: string | null;
    theme_type_id: string | null;
    status: string;
    day_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
    class_instructor_id: string | null;
    season_name?: string | null;
};

type Song = {
    id: string;
    show_group_instance_id: string;
    title: string;
    artist: string;
    order_index: number;
    casting_status: string;
    pair_group: number | null;
    rehearsal_room_id: string | null;
    has_method_lesson: boolean;
    song_key: string | null;
    tuning: string | null;
    notes: string | null;
};

type CastSlot = {
    id: string;
    show_group_song_id: string;
    cast_slot_type_id: string;
    slot_label: string;
    max_students: number;
    order_index: number;
    type_name?: string;
};

type CastSlotType = {
    id: string;
    name: string;
    slot_category: string;
};

type RehearsalRoom = {
    id: string;
    school_id: string;
    name: string;
    order_index: number;
};

type ThemeSong = {
    id: string;
    show_theme_id: string;
    title: string;
    artist: string;
    has_method_lesson: boolean;
    order_index: number;
};

type Membership = {
    id: string;
    student_id: string;
    status: string;
};

type CastAssignment = {
    id: string;
    show_song_cast_slot_id: string;
    student_id: string;
    status: string;
    is_conflict_override: boolean;
    override_reason: string | null;
    override_approved_by: string | null;
    song_id: string;
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

type OverrideModal = {
    slotId: string;
    studentId: string;
    conflictSongTitle: string;
    existingAssignmentId?: string;
    songId: string;
};

type CastingViewProps = {
    currentUser: SessionUser | null;
    schoolId: string;
    schoolName: string;
    students: StudentRow[];
    initialShowGroupId?: string | null;
};

// ─── Constants ─────────────────────────────────────────────────────────────

const PAIR_COLORS = [
    "#3b82f6", "#a855f7", "#f59e0b",
    "#10b981", "#f97316", "#ec4899",
];

const STANDARD_COLUMNS = [
    "Drums", "Guitar 1", "Guitar 2", "Guitar 3",
    "Bass", "Vocal 1", "Vocal 2", "Vocal 3",
    "Auxiliary 1", "Auxiliary 2",
];

const DAY_LABELS: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed",
    thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

const SONG_SELECT_COLS =
    "id, show_group_instance_id, title, artist, order_index, casting_status, pair_group, rehearsal_room_id, has_method_lesson, song_key, tuning, notes";

// ─── Helpers ───────────────────────────────────────────────────────────────

function getPairIndex(orderIndex: number): number {
    return Math.ceil(orderIndex / 2) - 1; // 0-based
}

function getPairColor(orderIndex: number): string {
    return PAIR_COLORS[getPairIndex(orderIndex) % PAIR_COLORS.length];
}

function formatTime(t: string | null): string {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function castingStatusStyle(status: string): { bg: string; label: string } {
    switch (status) {
        case "submitted": return { bg: "bg-amber-700", label: "SUBMITTED" };
        case "approved":  return { bg: "bg-green-700", label: "APPROVED" };
        case "returned":  return { bg: "bg-[#cc0000]", label: "RETURNED" };
        default:          return { bg: "bg-zinc-700", label: "DRAFT" };
    }
}

function getTypeNameForColumn(col: string): string {
    const lower = col.toLowerCase();
    if (lower.startsWith("drum")) return "drums";
    if (lower.startsWith("guitar")) return "guitar";
    if (lower.startsWith("bass")) return "bass";
    if (lower.startsWith("vocal") || lower.startsWith("bv ") || lower.startsWith("harmony")) return "vocals";
    if (lower.startsWith("key")) return "keys";
    return "auxiliary";
}

function matchesInstrumentForColumn(instrument: string, col: string): boolean {
    const inst = instrument.toLowerCase();
    const colL = col.toLowerCase();
    if (colL.startsWith("drum")) return inst.includes("drum");
    if (colL.startsWith("guitar")) return inst.includes("guitar");
    if (colL.startsWith("bass")) return inst === "bass";
    if (colL.startsWith("vocal") || colL.startsWith("bv") || colL.startsWith("harmony"))
        return inst.includes("vocal") || inst === "singer";
    if (colL.startsWith("key")) return inst.includes("key");
    return false;
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CastingView({ currentUser, schoolId, schoolName, students, initialShowGroupId }: CastingViewProps) {
    const role = currentUser?.role ?? "";
    const canApprove = role === "music_director" || role === "general_manager" || role === "owner";

    // Show groups
    const [showGroups, setShowGroups] = useState<ShowGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(initialShowGroupId ?? null);

    useEffect(() => {
        if (initialShowGroupId) setSelectedGroupId(initialShowGroupId);
    }, [initialShowGroupId]);

    // Song / room / type data
    const [songs, setSongs] = useState<Song[]>([]);
    const [loadingSongs, setLoadingSongs] = useState(false);
    const [rooms, setRooms] = useState<RehearsalRoom[]>([]);
    const [castSlotTypes, setCastSlotTypes] = useState<CastSlotType[]>([]);

    // All slots keyed by song id
    const [allSlots, setAllSlots] = useState<Record<string, CastSlot[]>>({});

    // Extra columns beyond standard (from DB or user-added)
    const [extraColumns, setExtraColumns] = useState<string[]>([]);

    // Add column modal
    const [addColumnOpen, setAddColumnOpen] = useState(false);
    const [addColumnName, setAddColumnName] = useState("");

    // Memberships + assignments
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [castAssignments, setCastAssignments] = useState<CastAssignment[]>([]);

    // Slot editor panel (right drawer)
    const [slotEditorSongId, setSlotEditorSongId] = useState<string | null>(null);
    const [addSlotTypeId, setAddSlotTypeId] = useState("");
    const [addSlotLabel, setAddSlotLabel] = useState("");
    const [addSlotMax, setAddSlotMax] = useState(1);

    // Remove song confirmation
    const [removingSongId, setRemovingSongId] = useState<string | null>(null);

    // Add songs panel
    const [addSongsOpen, setAddSongsOpen] = useState(false);
    const [themeSongs, setThemeSongs] = useState<ThemeSong[]>([]);
    const [checkedThemeSongIds, setCheckedThemeSongIds] = useState<Set<string>>(new Set());
    const [addingSongs, setAddingSongs] = useState(false);
    const [customTitle, setCustomTitle] = useState("");
    const [customArtist, setCustomArtist] = useState("");
    const [customHasMethodLesson, setCustomHasMethodLesson] = useState(false);

    // Conflict override modal
    const [overrideModal, setOverrideModal] = useState<OverrideModal | null>(null);

    // Drag conflict banner
    const [reorderConflictBanner, setReorderConflictBanner] = useState<string | null>(null);

    // Equity panel
    const [equityOpen, setEquityOpen] = useState(false);

    // Submit workflow
    const [submitOpen, setSubmitOpen] = useState(false);
    const [submitCheckedSongIds, setSubmitCheckedSongIds] = useState<Set<string>>(new Set());

    // MD return-with-notes
    const [returningNotesSongId, setReturningNotesSongId] = useState<string | null>(null);
    const [returnNotesText, setReturnNotesText] = useState("");

    const selectedGroup = showGroups.find((g) => g.id === selectedGroupId) ?? null;

    // ─── Data loading ───────────────────────────────────────────────────────

    useEffect(() => {
        if (!schoolId) return;
        setLoadingGroups(true);
        supabase
            .from("show_group_instances")
            .select("*, seasons(season_key, year)")
            .eq("school_id", schoolId)
            .eq("status", "active")
            .order("name")
            .then(({ data }) => {
                if (data) {
                    setShowGroups(
                        data.map((row: any) => ({
                            id: row.id,
                            name: row.name,
                            school_id: row.school_id,
                            season_id: row.season_id,
                            show_theme_id: row.show_theme_id,
                            theme_type_id: row.theme_type_id,
                            status: row.status,
                            day_of_week: row.day_of_week,
                            start_time: row.start_time,
                            end_time: row.end_time,
                            class_instructor_id: row.class_instructor_id,
                            season_name: row.seasons
                                ? row.seasons.season_key.charAt(0).toUpperCase() +
                                  row.seasons.season_key.slice(1) + " " + row.seasons.year
                                : null,
                        }))
                    );
                }
                setLoadingGroups(false);
            });
    }, [schoolId]);

    useEffect(() => {
        supabase
            .from("cast_slot_types")
            .select("id, name, slot_category")
            .order("name")
            .then(({ data }) => {
                if (data) setCastSlotTypes(data as CastSlotType[]);
            });
    }, []);

    const loadAllSlots = useCallback(async (songIds: string[]) => {
        if (songIds.length === 0) {
            setAllSlots({});
            setExtraColumns([]);
            return;
        }
        const { data } = await supabase
            .from("show_song_cast_slots")
            .select("id, show_group_song_id, cast_slot_type_id, slot_label, max_students, order_index, cast_slot_types(name)")
            .in("show_group_song_id", songIds)
            .order("order_index", { ascending: true });
        if (data) {
            const grouped: Record<string, CastSlot[]> = {};
            const allLabels = new Set<string>();
            for (const row of data as any[]) {
                const sid = row.show_group_song_id;
                if (!grouped[sid]) grouped[sid] = [];
                grouped[sid].push({
                    id: row.id,
                    show_group_song_id: row.show_group_song_id,
                    cast_slot_type_id: row.cast_slot_type_id,
                    slot_label: row.slot_label,
                    max_students: row.max_students,
                    order_index: row.order_index,
                    type_name: (row.cast_slot_types as any)?.name ?? "",
                });
                allLabels.add(row.slot_label);
            }
            setAllSlots(grouped);
            setExtraColumns([...allLabels].filter((l) => !STANDARD_COLUMNS.includes(l)));
        }
    }, []);

    const loadCastAssignments = useCallback(async (songIds: string[]) => {
        if (songIds.length === 0) { setCastAssignments([]); return; }
        const { data: slotData } = await supabase
            .from("show_song_cast_slots")
            .select("id, show_group_song_id")
            .in("show_group_song_id", songIds);
        if (!slotData || slotData.length === 0) { setCastAssignments([]); return; }
        const slotToSongMap: Record<string, string> = {};
        for (const s of slotData as any[]) slotToSongMap[s.id] = s.show_group_song_id;
        const slotIds = Object.keys(slotToSongMap);
        const { data: assignments } = await supabase
            .from("show_song_cast_assignments")
            .select("id, show_song_cast_slot_id, student_id, status, is_conflict_override, override_reason, override_approved_by")
            .in("show_song_cast_slot_id", slotIds);
        setCastAssignments(
            (assignments ?? []).map((a: any) => ({
                id: a.id,
                show_song_cast_slot_id: a.show_song_cast_slot_id,
                student_id: a.student_id,
                status: a.status,
                is_conflict_override: a.is_conflict_override ?? false,
                override_reason: a.override_reason ?? null,
                override_approved_by: a.override_approved_by ?? null,
                song_id: slotToSongMap[a.show_song_cast_slot_id] ?? "",
            }))
        );
    }, []);

    useEffect(() => {
        if (!selectedGroupId) {
            setSongs([]); setRooms([]); setMemberships([]);
            setCastAssignments([]); setAllSlots({}); setExtraColumns([]);
            setSlotEditorSongId(null); setAddSongsOpen(false);
            setRemovingSongId(null); setEquityOpen(false);
            setSubmitOpen(false); setReturningNotesSongId(null);
            setReorderConflictBanner(null);
            return;
        }
        async function load() {
            setLoadingSongs(true);
            const [songsRes, roomsRes, membershipsRes] = await Promise.all([
                supabase.from("show_group_songs").select(SONG_SELECT_COLS)
                    .eq("show_group_instance_id", selectedGroupId)
                    .order("order_index", { ascending: true }),
                supabase.from("rehearsal_rooms").select("id, school_id, name, order_index")
                    .eq("school_id", schoolId).order("order_index", { ascending: true }),
                supabase.from("show_group_student_memberships")
                    .select("id, student_id, status")
                    .eq("show_group_instance_id", selectedGroupId)
                    .eq("status", "active"),
            ]);
            const songData = (songsRes.data ?? []) as Song[];
            if (!songsRes.error) setSongs(songData);
            if (!roomsRes.error && roomsRes.data) setRooms(roomsRes.data as RehearsalRoom[]);
            if (!membershipsRes.error && membershipsRes.data)
                setMemberships(membershipsRes.data as Membership[]);
            await Promise.all([
                loadAllSlots(songData.map((s) => s.id)),
                loadCastAssignments(songData.map((s) => s.id)),
            ]);
            setLoadingSongs(false);
        }
        load();
    }, [selectedGroupId, schoolId, loadAllSlots, loadCastAssignments]);

    useEffect(() => {
        if (!addSongsOpen || !selectedGroup?.show_theme_id) {
            setThemeSongs([]); setCheckedThemeSongIds(new Set()); return;
        }
        supabase
            .from("theme_songs")
            .select("id, show_theme_id, title, artist, has_method_lesson, order_index")
            .eq("show_theme_id", selectedGroup.show_theme_id)
            .order("has_method_lesson", { ascending: false })
            .order("order_index", { ascending: true })
            .then(({ data }) => { if (data) setThemeSongs(data as ThemeSong[]); });
    }, [addSongsOpen, selectedGroup?.show_theme_id]);

    // ─── Derived state ──────────────────────────────────────────────────────

    const sortedSongs = useMemo(
        () => [...songs].sort((a, b) => a.order_index - b.order_index),
        [songs]
    );

    // All columns = standard + any extra from DB or user-added
    const columns = useMemo(() => {
        const all = [...STANDARD_COLUMNS];
        for (const col of extraColumns) {
            if (!all.includes(col)) all.push(col);
        }
        return all;
    }, [extraColumns]);

    const enrolledStudents = useMemo(
        () => memberships
            .map((m) => students.find((s) => s.id === m.student_id))
            .filter(Boolean) as StudentRow[],
        [memberships, students]
    );

    // O(1) lookup: slotId → assignment
    const assignmentBySlotMap = useMemo(() => {
        const map: Record<string, CastAssignment> = {};
        for (const a of castAssignments) {
            map[a.show_song_cast_slot_id] = a;
        }
        return map;
    }, [castAssignments]);

    // O(1) lookup: songId → { columnLabel → slot }
    const slotMap = useMemo(() => {
        const map: Record<string, Record<string, CastSlot>> = {};
        for (const [songId, slots] of Object.entries(allSlots)) {
            map[songId] = {};
            for (const slot of slots) {
                map[songId][slot.slot_label] = slot;
            }
        }
        return map;
    }, [allSlots]);

    const equityData = useMemo(
        () => enrolledStudents
            .map((student) => ({
                student,
                count: castAssignments.filter((a) => a.student_id === student.id).length,
            }))
            .sort((a, b) => b.count - a.count),
        [enrolledStudents, castAssignments]
    );

    const equityStats = useMemo(() => {
        if (equityData.length === 0) return { avg: 0, min: 0, max: 0 };
        const counts = equityData.map((d) => d.count);
        return {
            avg: counts.reduce((s, c) => s + c, 0) / counts.length,
            min: Math.min(...counts),
            max: Math.max(...counts),
        };
    }, [equityData]);

    const summaryCounts = useMemo(
        () => songs.reduce((acc, s) => {
            acc[s.casting_status] = (acc[s.casting_status] ?? 0) + 1; return acc;
        }, {} as Record<string, number>),
        [songs]
    );

    // ─── Room helpers (computed from order_index) ───────────────────────────

    function getComputedRoomLabel(song: Song): string {
        const isOdd = song.order_index % 2 !== 0;
        if (rooms.length === 0) return isOdd ? "Room 1" : "Room 2";
        if (rooms.length === 1) return rooms[0].name;
        return isOdd ? rooms[0].name : rooms[1].name;
    }

    // ─── Conflict helpers (computed from order_index pairs) ─────────────────

    function getPairPartner(song: Song): Song | null {
        const isOdd = song.order_index % 2 !== 0;
        const partnerIdx = isOdd ? song.order_index + 1 : song.order_index - 1;
        return sortedSongs.find((s) => s.order_index === partnerIdx) ?? null;
    }

    function getConflictedStudentIds(song: Song): Map<string, string> {
        const result = new Map<string, string>();
        const partner = getPairPartner(song);
        if (!partner) return result;
        const partnerSlots = allSlots[partner.id] ?? [];
        for (const slot of partnerSlots) {
            const assignment = assignmentBySlotMap[slot.id];
            if (assignment && !result.has(assignment.student_id)) {
                result.set(assignment.student_id, partner.title);
            }
        }
        return result;
    }

    function getStudentDisplayName(student: StudentRow): string {
        return `${student.firstName} ${student.lastInitial}.`;
    }

    // ─── Get cast_slot_type_id for a column label ───────────────────────────

    function getCastSlotTypeIdForColumn(col: string): string {
        const typeName = getTypeNameForColumn(col);
        const found = castSlotTypes.find((t) => t.name.toLowerCase() === typeName);
        return found?.id ?? castSlotTypes[0]?.id ?? "";
    }

    // ─── Drag and drop ──────────────────────────────────────────────────────

    async function handleDragEnd(result: any) {
        if (!result.destination) return;
        const srcIdx = result.source.index;
        const dstIdx = result.destination.index;
        if (srcIdx === dstIdx) return;

        const newSongs = Array.from(sortedSongs);
        const [moved] = newSongs.splice(srcIdx, 1);
        newSongs.splice(dstIdx, 0, moved);
        const updated = newSongs.map((s, i) => ({ ...s, order_index: i + 1 }));
        setSongs(updated);

        // Find new pair partner for moved song
        const movedNewOrderIndex = updated[dstIdx].order_index;
        const isOdd = movedNewOrderIndex % 2 !== 0;
        const partnerNewOrderIndex = isOdd ? movedNewOrderIndex + 1 : movedNewOrderIndex - 1;
        const newPartner = updated.find((s) => s.order_index === partnerNewOrderIndex);

        const conflictIds: string[] = [];

        if (newPartner) {
            const movedSlots = allSlots[moved.id] ?? [];
            const partnerSlots = allSlots[newPartner.id] ?? [];

            // Students assigned to moved song
            const movedStudentIds = new Set(
                castAssignments
                    .filter((a) => movedSlots.some((s) => s.id === a.show_song_cast_slot_id))
                    .map((a) => a.student_id)
            );
            // Students assigned to partner song
            const partnerStudentIds = new Set(
                castAssignments
                    .filter((a) => partnerSlots.some((s) => s.id === a.show_song_cast_slot_id))
                    .map((a) => a.student_id)
            );

            // Assignments in partner that conflict with moved song students
            const conflictInPartner = castAssignments.filter(
                (a) => partnerSlots.some((s) => s.id === a.show_song_cast_slot_id) &&
                    movedStudentIds.has(a.student_id)
            );
            // Assignments in moved that conflict with partner song students
            const conflictInMoved = castAssignments.filter(
                (a) => movedSlots.some((s) => s.id === a.show_song_cast_slot_id) &&
                    partnerStudentIds.has(a.student_id)
            );

            const allConflicting = [...conflictInPartner, ...conflictInMoved];
            const uniqueIds = [...new Set(allConflicting.map((a) => a.id))];

            if (uniqueIds.length > 0) {
                conflictIds.push(...uniqueIds);
                setCastAssignments((prev) => prev.filter((a) => !uniqueIds.includes(a.id)));
                setReorderConflictBanner(
                    `⚠ ${uniqueIds.length} slot(s) cleared — student(s) are now in both rooms for this pair. Please reassign.`
                );
                await Promise.all(
                    uniqueIds.map((id) =>
                        supabase.from("show_song_cast_assignments").delete().eq("id", id)
                    )
                );
            }
        }

        // Save new order_index values
        await Promise.all(
            updated.map((s) =>
                supabase.from("show_group_songs").update({ order_index: s.order_index }).eq("id", s.id)
            )
        );
    }

    // ─── Song management ────────────────────────────────────────────────────

    async function handleRemoveSong(songId: string) {
        const { error } = await supabase.from("show_group_songs").delete().eq("id", songId);
        if (!error) {
            const remaining = songs.filter((s) => s.id !== songId);
            setSongs(remaining);
            if (slotEditorSongId === songId) setSlotEditorSongId(null);
            setRemovingSongId(null);
            const ids = remaining.map((s) => s.id);
            await Promise.all([loadAllSlots(ids), loadCastAssignments(ids)]);
        }
    }

    // ─── Slot management ────────────────────────────────────────────────────

    async function handleCreateSlot(songId: string, columnLabel: string) {
        const typeId = getCastSlotTypeIdForColumn(columnLabel);
        if (!typeId) return;
        const songSlots = allSlots[songId] ?? [];
        const nextOrder = songSlots.length > 0
            ? Math.max(...songSlots.map((s) => s.order_index)) + 1 : 1;
        const { data, error } = await supabase.from("show_song_cast_slots")
            .insert({
                show_group_song_id: songId,
                cast_slot_type_id: typeId,
                slot_label: columnLabel,
                max_students: 1,
                order_index: nextOrder,
            })
            .select("id, show_group_song_id, cast_slot_type_id, slot_label, max_students, order_index, cast_slot_types(name)")
            .single();
        if (!error && data) {
            const d = data as any;
            setAllSlots((prev) => ({
                ...prev,
                [songId]: [...(prev[songId] ?? []), {
                    id: d.id,
                    show_group_song_id: d.show_group_song_id,
                    cast_slot_type_id: d.cast_slot_type_id,
                    slot_label: d.slot_label,
                    max_students: d.max_students,
                    order_index: d.order_index,
                    type_name: d.cast_slot_types?.name ?? "",
                }],
            }));
        }
    }

    async function handleAddSlot() {
        if (!slotEditorSongId || !addSlotTypeId || !addSlotLabel.trim()) return;
        const songSlots = allSlots[slotEditorSongId] ?? [];
        const nextOrder = songSlots.length > 0
            ? Math.max(...songSlots.map((s) => s.order_index)) + 1 : 1;
        const { data, error } = await supabase.from("show_song_cast_slots")
            .insert({
                show_group_song_id: slotEditorSongId,
                cast_slot_type_id: addSlotTypeId,
                slot_label: addSlotLabel.trim(),
                max_students: addSlotMax,
                order_index: nextOrder,
            })
            .select("id, show_group_song_id, cast_slot_type_id, slot_label, max_students, order_index, cast_slot_types(name)")
            .single();
        if (!error && data) {
            const d = data as any;
            const newSlot: CastSlot = {
                id: d.id,
                show_group_song_id: d.show_group_song_id,
                cast_slot_type_id: d.cast_slot_type_id,
                slot_label: d.slot_label,
                max_students: d.max_students,
                order_index: d.order_index,
                type_name: d.cast_slot_types?.name ?? "",
            };
            setAllSlots((prev) => ({
                ...prev,
                [slotEditorSongId]: [...(prev[slotEditorSongId] ?? []), newSlot],
            }));
            // If label isn't in columns, add it as extra
            if (!columns.includes(d.slot_label)) {
                setExtraColumns((prev) => [...prev, d.slot_label]);
            }
            setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1);
        }
    }

    async function handleRemoveSlot(slotId: string, songId: string) {
        const { error } = await supabase.from("show_song_cast_slots").delete().eq("id", slotId);
        if (!error) {
            setAllSlots((prev) => ({
                ...prev,
                [songId]: (prev[songId] ?? []).filter((s) => s.id !== slotId),
            }));
            setCastAssignments((prev) => prev.filter((a) => a.show_song_cast_slot_id !== slotId));
        }
    }

    // ─── Grid assignment handler (optimistic UI) ─────────────────────────────

    async function handleGridCellChange(slot: CastSlot, newStudentId: string, song: Song) {
        const existing = assignmentBySlotMap[slot.id];
        if (newStudentId === (existing?.student_id ?? "")) return;

        // Unassign case — delete any assignment for this slot
        if (newStudentId === "") {
            if (existing) {
                const snapshot = existing;
                setCastAssignments((prev) => prev.filter((a) => a.show_song_cast_slot_id !== slot.id));
                const { error } = await supabase.from("show_song_cast_assignments")
                    .delete().eq("show_song_cast_slot_id", slot.id);
                if (error) {
                    console.error("cast assignment delete error:", error);
                    setCastAssignments((prev) => [...prev, snapshot]);
                }
            }
            return;
        }

        const conflictMap = getConflictedStudentIds(song);
        if (conflictMap.has(newStudentId)) {
            setOverrideModal({
                slotId: slot.id,
                studentId: newStudentId,
                conflictSongTitle: conflictMap.get(newStudentId) ?? "",
                existingAssignmentId: existing?.id,
                songId: song.id,
            });
            return;
        }

        // Assign case — delete existing, then insert new (delete-then-insert pattern)
        const tempId = `temp-${Date.now()}-${slot.id}`;
        const optimistic: CastAssignment = {
            id: tempId,
            show_song_cast_slot_id: slot.id,
            student_id: newStudentId,
            status: "assigned",
            is_conflict_override: false,
            override_reason: null,
            override_approved_by: null,
            song_id: song.id,
        };
        setCastAssignments((prev) => [
            ...prev.filter((a) => a.show_song_cast_slot_id !== slot.id),
            optimistic,
        ]);

        // Step 1: delete any existing assignment for this slot
        const { error: delError } = await supabase.from("show_song_cast_assignments")
            .delete().eq("show_song_cast_slot_id", slot.id);
        if (delError) {
            console.error("cast assignment delete error:", delError);
            setCastAssignments((prev) => {
                const withoutTemp = prev.filter((a) => a.id !== tempId);
                return existing ? [...withoutTemp, existing] : withoutTemp;
            });
            return;
        }

        // Step 2: insert new assignment
        const { data, error: insError } = await supabase.from("show_song_cast_assignments")
            .insert({ show_song_cast_slot_id: slot.id, student_id: newStudentId, status: "assigned", is_conflict_override: false })
            .select("id").single();
        if (!insError && data) {
            setCastAssignments((prev) =>
                prev.map((a) => a.id === tempId ? { ...a, id: (data as any).id } : a)
            );
        } else {
            console.error("cast assignment insert error:", insError);
            setCastAssignments((prev) => {
                const withoutTemp = prev.filter((a) => a.id !== tempId);
                return existing ? [...withoutTemp, existing] : withoutTemp;
            });
        }
    }

    async function handleConfirmOverride() {
        if (!overrideModal) return;
        const { existingAssignmentId, slotId, studentId, songId } = overrideModal;

        const snapshot = existingAssignmentId
            ? castAssignments.find((a) => a.id === existingAssignmentId)
            : undefined;

        const tempId = `temp-override-${Date.now()}`;
        const optimistic: CastAssignment = {
            id: tempId,
            show_song_cast_slot_id: slotId,
            student_id: studentId,
            status: "assigned",
            is_conflict_override: true,
            override_reason: null,
            override_approved_by: null,
            song_id: songId,
        };
        setCastAssignments((prev) => [
            ...prev.filter((a) => a.show_song_cast_slot_id !== slotId),
            optimistic,
        ]);

        // Step 1: delete any existing assignment for this slot
        const { error: delError } = await supabase.from("show_song_cast_assignments")
            .delete().eq("show_song_cast_slot_id", slotId);
        if (delError) {
            console.error("cast override delete error:", delError);
            setCastAssignments((prev) => {
                const withoutTemp = prev.filter((a) => a.id !== tempId);
                return snapshot ? [...withoutTemp, snapshot] : withoutTemp;
            });
            setOverrideModal(null);
            return;
        }

        // Step 2: insert new assignment
        const { data, error: insError } = await supabase.from("show_song_cast_assignments")
            .insert({ show_song_cast_slot_id: slotId, student_id: studentId, status: "assigned", is_conflict_override: true })
            .select("id").single();
        if (!insError && data) {
            setCastAssignments((prev) =>
                prev.map((a) => a.id === tempId ? { ...a, id: (data as any).id } : a)
            );
        } else {
            console.error("cast override insert error:", insError);
            setCastAssignments((prev) => {
                const withoutTemp = prev.filter((a) => a.id !== tempId);
                return snapshot ? [...withoutTemp, snapshot] : withoutTemp;
            });
        }
        setOverrideModal(null);
    }

    // ─── Add songs handlers ─────────────────────────────────────────────────

    async function handleAddThemeSongs() {
        if (!selectedGroupId || checkedThemeSongIds.size === 0) return;
        setAddingSongs(true);
        let nextOrder = songs.length > 0 ? Math.max(...songs.map((s) => s.order_index)) + 1 : 1;
        for (const theme of themeSongs.filter((t) => checkedThemeSongIds.has(t.id))) {
            const { data: newSong, error: songError } = await supabase.from("show_group_songs")
                .insert({
                    show_group_instance_id: selectedGroupId,
                    title: theme.title, artist: theme.artist,
                    has_method_lesson: theme.has_method_lesson,
                    order_index: nextOrder, casting_status: "draft",
                }).select("id").single();
            if (songError || !newSong) { nextOrder++; continue; }
            const { data: templates } = await supabase.from("theme_song_cast_slots")
                .select("cast_slot_type_id, slot_label, max_students, order_index")
                .eq("theme_song_id", theme.id).order("order_index", { ascending: true });
            if (templates && templates.length > 0) {
                await supabase.from("show_song_cast_slots").insert(
                    templates.map((t: any) => ({
                        show_group_song_id: (newSong as any).id,
                        cast_slot_type_id: t.cast_slot_type_id,
                        slot_label: t.slot_label,
                        max_students: t.max_students,
                        order_index: t.order_index,
                    }))
                );
            }
            nextOrder++;
        }
        const { data: refreshed } = await supabase.from("show_group_songs")
            .select(SONG_SELECT_COLS).eq("show_group_instance_id", selectedGroupId)
            .order("order_index", { ascending: true });
        if (refreshed) {
            const rs = refreshed as Song[];
            setSongs(rs);
            const ids = rs.map((s) => s.id);
            await Promise.all([loadAllSlots(ids), loadCastAssignments(ids)]);
        }
        setAddingSongs(false); setAddSongsOpen(false); setCheckedThemeSongIds(new Set());
    }

    async function handleAddCustomSong() {
        if (!selectedGroupId || !customTitle.trim() || !customArtist.trim()) return;
        const nextOrder = songs.length > 0 ? Math.max(...songs.map((s) => s.order_index)) + 1 : 1;
        const { data: newSong, error } = await supabase.from("show_group_songs")
            .insert({
                show_group_instance_id: selectedGroupId,
                title: customTitle.trim(), artist: customArtist.trim(),
                has_method_lesson: customHasMethodLesson,
                order_index: nextOrder, casting_status: "draft",
            }).select(SONG_SELECT_COLS).single();
        if (!error && newSong) {
            const updated = [...songs, newSong as Song];
            setSongs(updated);
            const ids = updated.map((s) => s.id);
            await Promise.all([loadAllSlots(ids), loadCastAssignments(ids)]);
            setCustomTitle(""); setCustomArtist(""); setCustomHasMethodLesson(false);
        }
    }

    // ─── Add column handler ──────────────────────────────────────────────────

    function handleAddColumn() {
        const name = addColumnName.trim();
        if (!name || columns.includes(name)) return;
        setExtraColumns((prev) => [...prev, name]);
        setAddColumnName("");
        setAddColumnOpen(false);
    }

    // ─── Submit / approval handlers ─────────────────────────────────────────

    function handleOpenSubmit() {
        setSubmitCheckedSongIds(new Set(songs.filter((s) => s.casting_status === "draft").map((s) => s.id)));
        setSubmitOpen(true);
    }

    async function handleSubmitCasting() {
        const ids = [...submitCheckedSongIds];
        if (ids.length === 0) return;
        for (const id of ids) {
            await supabase.from("show_group_songs").update({ casting_status: "submitted" }).eq("id", id);
        }
        setSongs((prev) => prev.map((s) =>
            submitCheckedSongIds.has(s.id) ? { ...s, casting_status: "submitted" } : s
        ));
        setSubmitOpen(false); setSubmitCheckedSongIds(new Set());
    }

    async function handleApproveSong(songId: string) {
        const { error } = await supabase.from("show_group_songs")
            .update({ casting_status: "approved" }).eq("id", songId);
        if (!error) setSongs((prev) => prev.map((s) =>
            s.id === songId ? { ...s, casting_status: "approved" } : s
        ));
    }

    async function handleReturnSong(songId: string) {
        const { error } = await supabase.from("show_group_songs")
            .update({ casting_status: "returned", notes: returnNotesText.trim() || null })
            .eq("id", songId);
        if (!error) {
            setSongs((prev) => prev.map((s) =>
                s.id === songId
                    ? { ...s, casting_status: "returned", notes: returnNotesText.trim() || null }
                    : s
            ));
            setReturningNotesSongId(null); setReturnNotesText("");
        }
    }

    // ─── Early returns ───────────────────────────────────────────────────────

    if (loadingGroups) return <div className="p-6 text-zinc-400 text-sm">Loading show groups...</div>;

    if (showGroups.length === 0) {
        return (
            <div className="p-6">
                <div className="bg-[#111111] p-6">
                    <div className="text-zinc-400 text-sm">No active show groups found for {schoolName}.</div>
                    <div className="mt-2 text-xs text-zinc-500">Create show groups in the Show Groups tab first.</div>
                </div>
            </div>
        );
    }

    const slotEditorSong = slotEditorSongId ? songs.find((s) => s.id === slotEditorSongId) ?? null : null;
    const slotEditorSlots = slotEditorSongId ? (allSlots[slotEditorSongId] ?? []) : [];

    // ─── Main render ─────────────────────────────────────────────────────────

    return (
        <div style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>

            {/* Conflict override modal */}
            {overrideModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70" onClick={() => setOverrideModal(null)} />
                    <div className="relative bg-[#1a1a1a] border border-zinc-700 p-6 max-w-sm mx-4 w-full">
                        <div className="text-base font-bold text-white mb-3">Conflict Override</div>
                        <p className="text-sm text-zinc-300">
                            This student is assigned to{" "}
                            <span className="text-white font-medium">&ldquo;{overrideModal.conflictSongTitle}&rdquo;</span>{" "}
                            in the other room during this rehearsal slot. This conflict requires Music Director approval.
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button type="button" onClick={() => setOverrideModal(null)}
                                className="px-4 py-2 text-sm border border-zinc-600 text-zinc-400 hover:text-white">
                                Cancel
                            </button>
                            <button type="button" onClick={handleConfirmOverride}
                                className="px-4 py-2 text-sm bg-orange-800 text-white hover:bg-orange-700">
                                Request Override
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add column modal */}
            {addColumnOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/70" onClick={() => { setAddColumnOpen(false); setAddColumnName(""); }} />
                    <div className="relative bg-[#1a1a1a] border border-zinc-700 p-6 max-w-xs mx-4 w-full">
                        <div className="text-sm font-bold text-white mb-3">Add Column</div>
                        <input
                            type="text"
                            value={addColumnName}
                            onChange={(e) => setAddColumnName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleAddColumn(); if (e.key === "Escape") { setAddColumnOpen(false); setAddColumnName(""); } }}
                            placeholder="e.g. Guitar 4, Harmonica"
                            autoFocus
                            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 outline-none mb-4"
                        />
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setAddColumnOpen(false); setAddColumnName(""); }}
                                className="px-3 py-1.5 text-sm border border-zinc-600 text-zinc-400 hover:text-white">
                                Cancel
                            </button>
                            <button type="button" onClick={handleAddColumn}
                                disabled={!addColumnName.trim() || columns.includes(addColumnName.trim())}
                                className="px-3 py-1.5 text-sm bg-[#cc0000] text-white hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slot editor panel — right drawer */}
            {slotEditorSongId && slotEditorSong && (
                <div className="fixed inset-0 z-40">
                    <div className="absolute inset-0 bg-black/50"
                        onClick={() => { setSlotEditorSongId(null); setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1); }} />
                    <div className="absolute right-0 top-0 h-full w-[360px] bg-[#111111] border-l border-zinc-800 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
                            <div>
                                <div className="text-sm font-bold text-white">{slotEditorSong.title}</div>
                                <div className="text-xs text-zinc-400">{slotEditorSong.artist}</div>
                            </div>
                            <button type="button"
                                onClick={() => { setSlotEditorSongId(null); setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1); }}
                                className="text-zinc-400 hover:text-white text-2xl leading-none w-8 text-center">×</button>
                        </div>

                        {/* Slots list */}
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Cast Slots</div>
                            {slotEditorSlots.length === 0 ? (
                                <div className="text-xs text-zinc-500">No cast slots yet.</div>
                            ) : (
                                <div className="space-y-1.5 mb-4">
                                    {slotEditorSlots.map((slot) => {
                                        const assignCount = castAssignments.filter(
                                            (a) => a.show_song_cast_slot_id === slot.id
                                        ).length;
                                        return (
                                            <div key={slot.id} className="bg-zinc-900 px-3 py-2 flex items-center gap-2">
                                                <span className="flex-1 text-sm text-white">{slot.slot_label}</span>
                                                {slot.type_name && (
                                                    <span className="bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400">
                                                        {slot.type_name}
                                                    </span>
                                                )}
                                                <span className="text-xs text-zinc-500">max {slot.max_students}</span>
                                                {assignCount > 0 && (
                                                    <span className="text-xs text-zinc-400">{assignCount} cast</span>
                                                )}
                                                <button type="button"
                                                    onClick={() => handleRemoveSlot(slot.id, slotEditorSongId)}
                                                    className="text-[#cc0000] hover:text-white text-xl leading-none ml-1 w-5 text-center">×</button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Add slot form */}
                            <div className="border-t border-zinc-800 pt-4">
                                <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Add Slot</div>
                                <div className="space-y-2">
                                    <select value={addSlotTypeId}
                                        onChange={(e) => {
                                            const typeId = e.target.value;
                                            setAddSlotTypeId(typeId);
                                            setAddSlotLabel(castSlotTypes.find((t) => t.id === typeId)?.name ?? "");
                                        }}
                                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none">
                                        <option value="">Select type...</option>
                                        {castSlotTypes.map((t) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <input type="text" value={addSlotLabel}
                                        onChange={(e) => setAddSlotLabel(e.target.value)}
                                        placeholder="Label (e.g. Guitar 4)"
                                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none" />
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs text-zinc-500">Max students:</label>
                                        <input type="number" min={1} max={20} value={addSlotMax}
                                            onChange={(e) => setAddSlotMax(parseInt(e.target.value, 10) || 1)}
                                            className="w-16 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 text-center outline-none" />
                                    </div>
                                    <button type="button" onClick={handleAddSlot}
                                        disabled={!addSlotTypeId || !addSlotLabel.trim()}
                                        className="w-full bg-[#cc0000] text-white py-2 text-xs font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                        Add Slot
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Remove song */}
                        <div className="px-5 py-4 border-t border-zinc-800 shrink-0">
                            {removingSongId === slotEditorSongId ? (
                                <div className="flex gap-2 items-center">
                                    <span className="text-xs text-zinc-400 flex-1">Remove this song and all assignments?</span>
                                    <button type="button" onClick={() => handleRemoveSong(slotEditorSongId)}
                                        className="text-xs bg-[#cc0000] text-white px-3 py-1 hover:bg-[#b30000]">Yes</button>
                                    <button type="button" onClick={() => setRemovingSongId(null)}
                                        className="text-xs border border-zinc-600 text-zinc-400 px-3 py-1 hover:text-white">No</button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => setRemovingSongId(slotEditorSongId)}
                                    className="text-xs text-[#cc0000] hover:text-white">
                                    Remove song from setlist
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-6 space-y-6">

                {/* Page heading */}
                <div className="bg-[#111111] px-6 py-5">
                    <div className="flex items-baseline gap-3">
                        <span className="font-bold text-2xl tracking-wide"
                            style={{ fontFamily: "var(--font-oswald)", color: "#cc0000" }}>CASTING</span>
                        <span className="font-bold italic text-2xl text-white"
                            style={{ fontFamily: "var(--font-oswald)" }}>TOOL</span>
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">{schoolName}</div>
                </div>

                {/* SECTION 1 — Show Group Selector */}
                <div>
                    <div className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">Select Show Group</div>
                    <div className="flex flex-wrap gap-3">
                        {showGroups.map((group) => {
                            const isSelected = selectedGroupId === group.id;
                            const dayLabel = group.day_of_week
                                ? (DAY_LABELS[group.day_of_week.toLowerCase()] ?? group.day_of_week) : null;
                            const timeStr = group.start_time ? formatTime(group.start_time) : null;
                            return (
                                <button key={group.id} type="button"
                                    onClick={() => setSelectedGroupId(group.id)}
                                    className={`text-left p-4 min-w-[200px] max-w-[280px] transition-colors ${
                                        isSelected
                                            ? "border-2 border-[#cc0000] bg-[#1a1a1a]"
                                            : "border border-zinc-700 bg-[#1a1a1a] hover:border-zinc-500"
                                    }`}>
                                    <div className="text-base font-bold text-white leading-tight"
                                        style={{ fontFamily: "var(--font-oswald)" }}>{group.name}</div>
                                    {group.season_name && (
                                        <div className="mt-1">
                                            <span className="bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                                {group.season_name}
                                            </span>
                                        </div>
                                    )}
                                    {(dayLabel || timeStr) && (
                                        <div className="mt-2 text-xs text-zinc-400">
                                            {[dayLabel, timeStr].filter(Boolean).join(" · ")}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selectedGroup && (
                    <div className="space-y-5">

                        {/* SECTION 2 — Add Songs */}
                        <div>
                            <button type="button" onClick={() => setAddSongsOpen((v) => !v)}
                                className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000]">
                                {addSongsOpen ? "✕ Close" : "+ Add Songs"}
                            </button>

                            {addSongsOpen && (
                                <div className="mt-3 border border-zinc-700 bg-[#111111] p-5">
                                    {selectedGroup.show_theme_id ? (
                                        <>
                                            <div className="mb-3 text-sm font-medium text-zinc-300">
                                                Select songs to add from this show&apos;s theme:
                                            </div>
                                            {themeSongs.length === 0 ? (
                                                <div className="text-sm text-zinc-500">Loading theme songs...</div>
                                            ) : (
                                                <>
                                                    <div className="space-y-0.5 max-h-80 overflow-y-auto">
                                                        {themeSongs.map((ts) => {
                                                            const alreadyAdded = songs.some(
                                                                (s) => s.title.toLowerCase() === ts.title.toLowerCase() &&
                                                                    s.artist.toLowerCase() === ts.artist.toLowerCase()
                                                            );
                                                            return (
                                                                <label key={ts.id}
                                                                    className={`flex items-center gap-3 px-3 py-2 ${
                                                                        alreadyAdded
                                                                            ? "opacity-40 cursor-not-allowed"
                                                                            : "cursor-pointer hover:bg-zinc-800"
                                                                    }`}>
                                                                    <input type="checkbox" disabled={alreadyAdded}
                                                                        checked={checkedThemeSongIds.has(ts.id)}
                                                                        onChange={(e) => {
                                                                            setCheckedThemeSongIds((prev) => {
                                                                                const next = new Set(prev);
                                                                                if (e.target.checked) next.add(ts.id);
                                                                                else next.delete(ts.id);
                                                                                return next;
                                                                            });
                                                                        }} />
                                                                    <span className="flex-1 text-sm text-white">
                                                                        {ts.title}
                                                                        <span className="ml-2 text-zinc-400">· {ts.artist}</span>
                                                                    </span>
                                                                    {ts.has_method_lesson && (
                                                                        <span className="bg-green-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-green-200">
                                                                            METHOD APP
                                                                        </span>
                                                                    )}
                                                                    {alreadyAdded && (
                                                                        <span className="text-xs text-zinc-500">Added</span>
                                                                    )}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                    <div className="mt-4">
                                                        <button type="button" onClick={handleAddThemeSongs}
                                                            disabled={checkedThemeSongIds.size === 0 || addingSongs}
                                                            className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                                            {addingSongs ? "Adding..." : `Add Selected (${checkedThemeSongIds.size})`}
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="mb-3 text-sm font-medium text-zinc-300">Add a song manually:</div>
                                            <div className="flex flex-wrap gap-3 items-end">
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">Title *</label>
                                                    <input type="text" value={customTitle}
                                                        onChange={(e) => setCustomTitle(e.target.value)}
                                                        placeholder="Song title"
                                                        className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-zinc-500 mb-1">Artist *</label>
                                                    <input type="text" value={customArtist}
                                                        onChange={(e) => setCustomArtist(e.target.value)}
                                                        placeholder="Artist name"
                                                        className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none" />
                                                </div>
                                                <div className="flex items-center gap-2 pb-2">
                                                    <input type="checkbox" id="customMethodLesson"
                                                        checked={customHasMethodLesson}
                                                        onChange={(e) => setCustomHasMethodLesson(e.target.checked)} />
                                                    <label htmlFor="customMethodLesson"
                                                        className="text-xs text-zinc-400 cursor-pointer">
                                                        Has Method App lesson
                                                    </label>
                                                </div>
                                                <button type="button" onClick={handleAddCustomSong}
                                                    disabled={!customTitle.trim() || !customArtist.trim()}
                                                    className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                                    Add Song
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* SECTION 3 — THE CASTING GRID */}
                        {loadingSongs ? (
                            <div className="text-zinc-400 text-sm">Loading songs...</div>
                        ) : songs.length === 0 ? (
                            <div className="bg-[#111111] p-6 text-zinc-500 text-sm">
                                No songs added yet. Use &quot;+ Add Songs&quot; above.
                            </div>
                        ) : (
                            <>
                                {/* Drag conflict banner */}
                                {reorderConflictBanner && (
                                    <div
                                        className="flex items-center justify-between px-4 py-3 text-sm text-white"
                                        style={{ backgroundColor: "#78350f" }}>
                                        <span>{reorderConflictBanner}</span>
                                        <button type="button" onClick={() => setReorderConflictBanner(null)}
                                            className="ml-4 text-orange-200 hover:text-white text-lg leading-none">×</button>
                                    </div>
                                )}

                                <div style={{ overflowX: "auto" }}>
                                    <DragDropContext onDragEnd={handleDragEnd}>
                                        <table style={{ borderCollapse: "collapse", tableLayout: "auto" }}>
                                            <thead>
                                                <tr>
                                                    {/* Room header */}
                                                    <th style={{
                                                        position: "sticky", left: 0, zIndex: 31,
                                                        backgroundColor: "#0a0a0a",
                                                        width: 90, minWidth: 90,
                                                        padding: "8px 10px",
                                                        textAlign: "left",
                                                        borderRight: "1px solid #27272a",
                                                        borderBottom: "1px solid #27272a",
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                        <span style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-oswald)" }}>Room</span>
                                                    </th>
                                                    {/* Song header */}
                                                    <th style={{
                                                        position: "sticky", left: 90, zIndex: 30,
                                                        backgroundColor: "#0a0a0a",
                                                        width: 200, minWidth: 200,
                                                        padding: "8px 10px",
                                                        textAlign: "left",
                                                        borderRight: "1px solid #27272a",
                                                        borderBottom: "1px solid #27272a",
                                                        whiteSpace: "nowrap",
                                                    }}>
                                                        <span style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-oswald)" }}>Song</span>
                                                    </th>
                                                    {/* Slot column headers */}
                                                    {columns.map((col) => (
                                                        <th key={col} style={{
                                                            minWidth: 140,
                                                            padding: "8px 8px",
                                                            textAlign: "left",
                                                            borderRight: "1px solid #1c1c1e",
                                                            borderBottom: "1px solid #27272a",
                                                            backgroundColor: "#0a0a0a",
                                                            whiteSpace: "nowrap",
                                                        }}>
                                                            <span style={{ color: "#71717a", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-oswald)" }}>
                                                                {col}
                                                            </span>
                                                        </th>
                                                    ))}
                                                    {/* Add column button */}
                                                    <th style={{
                                                        width: 80, minWidth: 80,
                                                        padding: "6px 8px",
                                                        borderBottom: "1px solid #27272a",
                                                        backgroundColor: "#0a0a0a",
                                                        textAlign: "center",
                                                    }}>
                                                        <button type="button"
                                                            onClick={() => setAddColumnOpen(true)}
                                                            title="Add column"
                                                            style={{
                                                                color: "#52525b",
                                                                fontSize: 16,
                                                                background: "none",
                                                                border: "1px solid #3f3f46",
                                                                cursor: "pointer",
                                                                padding: "1px 7px",
                                                                lineHeight: "1.4",
                                                                borderRadius: 0,
                                                            }}>
                                                            +
                                                        </button>
                                                    </th>
                                                    {/* Actions header */}
                                                    <th style={{
                                                        width: 44, minWidth: 44,
                                                        padding: "8px 4px",
                                                        borderBottom: "1px solid #27272a",
                                                        backgroundColor: "#0a0a0a",
                                                    }} />
                                                </tr>
                                            </thead>

                                            <Droppable droppableId="songs-table" type="TABLE_ROW">
                                                {(droppableProvided) => (
                                                    <tbody
                                                        ref={droppableProvided.innerRef}
                                                        {...droppableProvided.droppableProps}
                                                    >
                                                        {sortedSongs.map((song, index) => {
                                                            const pairColor = getPairColor(song.order_index);
                                                            const statusStyle = castingStatusStyle(song.casting_status);
                                                            const roomLabel = getComputedRoomLabel(song);
                                                            const songSlotMap = slotMap[song.id] ?? {};
                                                            const rowBg = index % 2 === 1 ? "#161616" : "#1a1a1a";
                                                            const conflictMap = getConflictedStudentIds(song);

                                                            return (
                                                                <Draggable key={song.id} draggableId={song.id} index={index} isDragDisabled={song.casting_status === "approved"}>
                                                                    {(dragProvided, snapshot) => (
                                                                        <tr
                                                                            ref={dragProvided.innerRef}
                                                                            {...dragProvided.draggableProps}
                                                                            style={{
                                                                                ...dragProvided.draggableProps.style,
                                                                                backgroundColor: snapshot.isDragging ? "#2a2a2a" : rowBg,
                                                                            }}
                                                                        >
                                                                            {/* Room cell (sticky) */}
                                                                            <td style={{
                                                                                position: "sticky", left: 0, zIndex: 20,
                                                                                backgroundColor: snapshot.isDragging ? "#2a2a2a" : rowBg,
                                                                                width: 90, minWidth: 90,
                                                                                padding: "6px 10px",
                                                                                borderRight: "1px solid #27272a",
                                                                                borderBottom: "1px solid #1c1c1e",
                                                                                verticalAlign: "middle",
                                                                                borderLeft: `4px solid ${pairColor}`,
                                                                            }}>
                                                                                <span style={{ color: "#a1a1aa", fontSize: 11, whiteSpace: "nowrap" }}>
                                                                                    {roomLabel}
                                                                                </span>
                                                                            </td>

                                                                            {/* Song cell (sticky) */}
                                                                            <td style={{
                                                                                position: "sticky", left: 90, zIndex: 19,
                                                                                backgroundColor: snapshot.isDragging ? "#2a2a2a" : rowBg,
                                                                                width: 200, minWidth: 200,
                                                                                padding: "6px 10px",
                                                                                borderRight: "1px solid #27272a",
                                                                                borderBottom: "1px solid #1c1c1e",
                                                                                verticalAlign: "middle",
                                                                                borderLeft: song.casting_status === "approved" ? "4px solid #166534" : `4px solid ${pairColor}`,
                                                                            }}>
                                                                                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                                                                    <span
                                                                                        {...dragProvided.dragHandleProps}
                                                                                        style={{ color: song.casting_status === "approved" ? "#3f3f46" : "#52525b", cursor: song.casting_status === "approved" ? "default" : "grab", fontSize: 13, lineHeight: "1.6", flexShrink: 0, userSelect: "none" }}>
                                                                                        ⠿
                                                                                    </span>
                                                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", lineHeight: 1.3 }}>
                                                                                            {index + 1}. {song.title}
                                                                                        </div>
                                                                                        <div style={{ fontSize: 11, color: "#71717a", marginTop: 1 }}>
                                                                                            {song.artist}
                                                                                        </div>
                                                                                        <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
                                                                                            {song.has_method_lesson && (
                                                                                                <span style={{ backgroundColor: "#166534", color: "#bbf7d0", fontSize: 9, padding: "1px 4px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                                                                                    METHOD APP
                                                                                                </span>
                                                                                            )}
                                                                                            <span className={statusStyle.bg} style={{ color: "#fff", fontSize: 9, padding: "1px 4px", textTransform: "uppercase" }}>
                                                                                                {statusStyle.label}{song.casting_status === "approved" ? " 🔒" : ""}
                                                                                            </span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </td>

                                                                            {/* Slot cells */}
                                                                            {columns.map((col) => {
                                                                                const slot = songSlotMap[col];
                                                                                if (!slot) {
                                                                                    const isApproved = song.casting_status === "approved";
                                                                                    return (
                                                                                        <td key={col}
                                                                                            onClick={() => { if (!isApproved) handleCreateSlot(song.id, col); }}
                                                                                            style={{
                                                                                                minWidth: 140,
                                                                                                backgroundColor: "#0d0d0d",
                                                                                                borderRight: "1px solid #1c1c1e",
                                                                                                borderBottom: "1px solid #1c1c1e",
                                                                                                cursor: isApproved ? "default" : "pointer",
                                                                                            }}
                                                                                            title={isApproved ? undefined : `Click to add ${col} slot for this song`}
                                                                                            onMouseEnter={(e) => { if (!isApproved) (e.currentTarget as HTMLTableCellElement).style.backgroundColor = "#151515"; }}
                                                                                            onMouseLeave={(e) => { if (!isApproved) (e.currentTarget as HTMLTableCellElement).style.backgroundColor = "#0d0d0d"; }}
                                                                                        />
                                                                                    );
                                                                                }

                                                                                const assignment = assignmentBySlotMap[slot.id];
                                                                                const isConflictCell = assignment?.is_conflict_override ?? false;

                                                                                // Group students by instrument match
                                                                                const matching = enrolledStudents.filter((s) => matchesInstrumentForColumn(s.instrument, col));
                                                                                const others = enrolledStudents.filter((s) => !matchesInstrumentForColumn(s.instrument, col));

                                                                                const isApproved = song.casting_status === "approved";
                                                                                const assignedStudent = assignment?.student_id
                                                                                    ? enrolledStudents.find((s) => s.id === assignment.student_id)
                                                                                    : null;

                                                                                if (isApproved) {
                                                                                    return (
                                                                                        <td key={col} style={{
                                                                                            minWidth: 140,
                                                                                            padding: "4px 8px",
                                                                                            borderRight: "1px solid #1c1c1e",
                                                                                            borderBottom: "1px solid #1c1c1e",
                                                                                            verticalAlign: "middle",
                                                                                        }}>
                                                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                                                                                                <span style={{ color: "#a1a1aa", fontSize: 12 }}>
                                                                                                    {assignedStudent ? getStudentDisplayName(assignedStudent) : "—"}
                                                                                                </span>
                                                                                                <span style={{ color: "#52525b", fontSize: 10, flexShrink: 0 }}>🔒</span>
                                                                                            </div>
                                                                                        </td>
                                                                                    );
                                                                                }

                                                                                return (
                                                                                    <td key={col} style={{
                                                                                        minWidth: 140,
                                                                                        padding: "4px 4px",
                                                                                        borderRight: "1px solid #1c1c1e",
                                                                                        borderBottom: "1px solid #1c1c1e",
                                                                                        verticalAlign: "middle",
                                                                                        ...(isConflictCell ? { outline: "1px solid #f97316", outlineOffset: "-1px" } : {}),
                                                                                    }}>
                                                                                        <select
                                                                                            value={assignment?.student_id ?? ""}
                                                                                            onChange={(e) => handleGridCellChange(slot, e.target.value, song)}
                                                                                            style={{
                                                                                                width: "100%",
                                                                                                backgroundColor: "#0f0f0f",
                                                                                                color: "#fff",
                                                                                                fontSize: 12,
                                                                                                border: "1px solid #3f3f46",
                                                                                                borderRadius: 0,
                                                                                                padding: "3px 4px",
                                                                                                outline: "none",
                                                                                                minWidth: 0,
                                                                                                cursor: "pointer",
                                                                                            }}>
                                                                                            <option value="">—</option>
                                                                                            {matching.map((s) => {
                                                                                                const isConflict = conflictMap.has(s.id);
                                                                                                return (
                                                                                                    <option key={s.id} value={s.id}>
                                                                                                        {isConflict ? "⚠ " : ""}{getStudentDisplayName(s)} ({s.instrument})
                                                                                                    </option>
                                                                                                );
                                                                                            })}
                                                                                            {matching.length > 0 && others.length > 0 && (
                                                                                                <option disabled>──────────</option>
                                                                                            )}
                                                                                            {others.map((s) => {
                                                                                                const isConflict = conflictMap.has(s.id);
                                                                                                return (
                                                                                                    <option key={s.id} value={s.id}>
                                                                                                        {isConflict ? "⚠ " : ""}{getStudentDisplayName(s)} ({s.instrument})
                                                                                                    </option>
                                                                                                );
                                                                                            })}
                                                                                        </select>
                                                                                    </td>
                                                                                );
                                                                            })}

                                                                            {/* Add column placeholder cell */}
                                                                            <td style={{
                                                                                width: 80, minWidth: 80,
                                                                                borderBottom: "1px solid #1c1c1e",
                                                                                backgroundColor: "#0a0a0a",
                                                                            }} />

                                                                            {/* Actions cell */}
                                                                            <td style={{
                                                                                width: 44,
                                                                                padding: "4px 4px",
                                                                                borderBottom: "1px solid #1c1c1e",
                                                                                textAlign: "center",
                                                                                verticalAlign: "middle",
                                                                            }}>
                                                                                <button type="button"
                                                                                    onClick={() => {
                                                                                        setSlotEditorSongId(song.id);
                                                                                        setAddSlotTypeId(""); setAddSlotLabel(""); setAddSlotMax(1);
                                                                                    }}
                                                                                    title="Edit slots"
                                                                                    style={{ color: "#71717a", fontSize: 13, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}>
                                                                                    ✎
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </Draggable>
                                                            );
                                                        })}
                                                        {droppableProvided.placeholder}
                                                    </tbody>
                                                )}
                                            </Droppable>
                                        </table>
                                    </DragDropContext>
                                </div>
                            </>
                        )}

                        {/* SECTION 4 — CASTING EQUITY PANEL */}
                        {enrolledStudents.length > 0 && (
                            <div className="bg-[#111111] border border-zinc-800">
                                <button type="button"
                                    onClick={() => setEquityOpen((v) => !v)}
                                    className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-zinc-300 hover:text-white">
                                    <span>{equityOpen ? "Hide Casting Equity" : "Show Casting Equity"}</span>
                                    <span className="text-zinc-500">{equityOpen ? "▲" : "▼"}</span>
                                </button>
                                {equityOpen && (
                                    <div className="border-t border-zinc-800 px-5 pb-5 pt-3">
                                        <div className="text-xs text-zinc-500 mb-3">
                                            Avg: {equityStats.avg.toFixed(1)} · Min: {equityStats.min} · Max: {equityStats.max}
                                        </div>
                                        <div className="space-y-2">
                                            {equityData.map(({ student, count }) => {
                                                const belowWarning = count > 0 && count < equityStats.avg - 2;
                                                const indicator = count === 0 ? "🔴" : belowWarning ? "🟡" : "🟢";
                                                const barPct = equityStats.max > 0
                                                    ? Math.round((count / equityStats.max) * 100) : 0;
                                                return (
                                                    <div key={student.id} className="flex items-center gap-3">
                                                        <span className="text-sm text-white w-32 shrink-0 truncate">
                                                            {getStudentDisplayName(student)}
                                                        </span>
                                                        <span className="bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-400 shrink-0">
                                                            {student.instrument}
                                                        </span>
                                                        <div className="flex-1 bg-zinc-800 h-2">
                                                            <div className="h-2 bg-[#cc0000]" style={{ width: `${barPct}%` }} />
                                                        </div>
                                                        <span className="text-xs text-zinc-400 w-6 text-right shrink-0">{count}</span>
                                                        <span className="shrink-0">{indicator}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECTION 5 — SUBMISSION WORKFLOW */}
                        <div className="bg-[#111111] border border-zinc-800 p-5">
                            <div className="text-sm font-medium text-zinc-300 mb-3">Submission Status</div>
                            <div className="flex flex-wrap gap-3 mb-4">
                                {["draft", "submitted", "approved", "returned"].map((status) => {
                                    const count = summaryCounts[status] ?? 0;
                                    if (count === 0) return null;
                                    const style = castingStatusStyle(status);
                                    return (
                                        <span key={status} className={`${style.bg} px-3 py-1 text-xs text-white font-medium`}>
                                            {style.label}: {count}
                                        </span>
                                    );
                                })}
                                {songs.length === 0 && <span className="text-xs text-zinc-500">No songs yet.</span>}
                            </div>

                            {(summaryCounts["draft"] ?? 0) > 0 && (
                                <div>
                                    {!submitOpen ? (
                                        <button type="button" onClick={handleOpenSubmit}
                                            className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000]">
                                            Submit Casting for Approval
                                        </button>
                                    ) : (
                                        <div className="border border-zinc-700 p-4">
                                            <div className="text-sm text-zinc-300 mb-3">Select songs to submit:</div>
                                            <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
                                                {songs.filter((s) => s.casting_status === "draft").map((song) => (
                                                    <label key={song.id}
                                                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-zinc-800 cursor-pointer">
                                                        <input type="checkbox"
                                                            checked={submitCheckedSongIds.has(song.id)}
                                                            onChange={(e) => {
                                                                setSubmitCheckedSongIds((prev) => {
                                                                    const next = new Set(prev);
                                                                    if (e.target.checked) next.add(song.id);
                                                                    else next.delete(song.id);
                                                                    return next;
                                                                });
                                                            }} />
                                                        <span className="text-sm text-white">{song.title}</span>
                                                        <span className="text-xs text-zinc-400">· {song.artist}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={handleSubmitCasting}
                                                    disabled={submitCheckedSongIds.size === 0}
                                                    className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed">
                                                    Submit Selected ({submitCheckedSongIds.size})
                                                </button>
                                                <button type="button" onClick={() => setSubmitOpen(false)}
                                                    className="px-4 py-2 text-sm border border-zinc-600 text-zinc-400 hover:text-white">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {canApprove && (summaryCounts["submitted"] ?? 0) > 0 && (
                                <div className="mt-5 border-t border-zinc-800 pt-5">
                                    <div className="text-sm font-medium text-zinc-300 mb-3">Casting for Review</div>
                                    <div className="space-y-3">
                                        {songs.filter((s) => s.casting_status === "submitted").map((song) => (
                                            <div key={song.id} className="bg-zinc-900 p-3">
                                                <div className="flex items-center justify-between flex-wrap gap-2">
                                                    <div>
                                                        <span className="text-sm font-medium text-white">{song.title}</span>
                                                        <span className="ml-2 text-xs text-zinc-400">· {song.artist}</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {returningNotesSongId !== song.id ? (
                                                            <>
                                                                <button type="button" onClick={() => handleApproveSong(song.id)}
                                                                    className="bg-green-700 text-white px-3 py-1 text-xs font-medium hover:bg-green-600">
                                                                    Approve
                                                                </button>
                                                                <button type="button"
                                                                    onClick={() => { setReturningNotesSongId(song.id); setReturnNotesText(""); }}
                                                                    className="border border-zinc-600 text-zinc-400 px-3 py-1 text-xs hover:text-white">
                                                                    Return
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="flex gap-2 items-center flex-wrap">
                                                                <input type="text" value={returnNotesText}
                                                                    onChange={(e) => setReturnNotesText(e.target.value)}
                                                                    placeholder="Return notes..."
                                                                    className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1 w-48 outline-none" />
                                                                <button type="button" onClick={() => handleReturnSong(song.id)}
                                                                    className="bg-[#cc0000] text-white px-3 py-1 text-xs font-medium hover:bg-[#b30000]">
                                                                    Send
                                                                </button>
                                                                <button type="button"
                                                                    onClick={() => { setReturningNotesSongId(null); setReturnNotesText(""); }}
                                                                    className="text-xs text-zinc-500 hover:text-white px-1">✕</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                {song.notes && (
                                                    <div className="mt-2 text-xs text-zinc-400 border-l border-zinc-700 pl-2">
                                                        {song.notes}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
