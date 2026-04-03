"use client";

import { useState, useEffect, useCallback } from "react";
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

type CastingViewProps = {
    currentUser: SessionUser | null;
    schoolId: string;
    schoolName: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTime(t: string | null): string {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

const DAY_LABELS: Record<string, string> = {
    monday: "Mon", tuesday: "Tue", wednesday: "Wed",
    thursday: "Thu", friday: "Fri", saturday: "Sat", sunday: "Sun",
};

function castingStatusStyle(status: string): { bg: string; label: string } {
    switch (status) {
        case "submitted": return { bg: "bg-amber-700", label: "SUBMITTED" };
        case "approved":  return { bg: "bg-green-700", label: "APPROVED" };
        case "returned":  return { bg: "bg-[#cc0000]", label: "RETURNED" };
        default:          return { bg: "bg-zinc-700", label: "DRAFT" };
    }
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function CastingView({ schoolId, schoolName }: CastingViewProps) {
    // Show group selector
    const [showGroups, setShowGroups] = useState<ShowGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    // Song list
    const [songs, setSongs] = useState<Song[]>([]);
    const [loadingSongs, setLoadingSongs] = useState(false);

    // Rehearsal rooms + slot types (loaded with group selection)
    const [rooms, setRooms] = useState<RehearsalRoom[]>([]);
    const [castSlotTypes, setCastSlotTypes] = useState<CastSlotType[]>([]);

    // Slot editor (one song at a time)
    const [expandedSlotSongId, setExpandedSlotSongId] = useState<string | null>(null);
    const [expandedSlots, setExpandedSlots] = useState<CastSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [addSlotTypeId, setAddSlotTypeId] = useState("");
    const [addSlotLabel, setAddSlotLabel] = useState("");
    const [addSlotMax, setAddSlotMax] = useState(1);

    // Remove confirmation
    const [removingSongId, setRemovingSongId] = useState<string | null>(null);

    // Add songs panel
    const [addSongsOpen, setAddSongsOpen] = useState(false);
    const [themeSongs, setThemeSongs] = useState<ThemeSong[]>([]);
    const [checkedThemeSongIds, setCheckedThemeSongIds] = useState<Set<string>>(new Set());
    const [addingSongs, setAddingSongs] = useState(false);

    // Custom song form (custom shows only)
    const [customTitle, setCustomTitle] = useState("");
    const [customArtist, setCustomArtist] = useState("");
    const [customHasMethodLesson, setCustomHasMethodLesson] = useState(false);

    const selectedGroup = showGroups.find((g) => g.id === selectedGroupId) ?? null;

    // ─── Data loading ───────────────────────────────────────────────────────

    // Load active show groups for this school
    useEffect(() => {
        if (!schoolId) return;
        setLoadingGroups(true);
        supabase
            .from("show_group_instances")
            .select("*, seasons(name)")
            .eq("school_id", schoolId)
            .eq("status", "active")
            .order("name")
            .then(({ data, error }) => {
                if (!error && data) {
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
                            season_name: row.seasons?.name ?? null,
                        }))
                    );
                }
                setLoadingGroups(false);
            });
    }, [schoolId]);

    // Load cast slot types once
    useEffect(() => {
        supabase
            .from("cast_slot_types")
            .select("id, name, slot_category")
            .order("name")
            .then(({ data }) => {
                if (data) setCastSlotTypes(data as CastSlotType[]);
            });
    }, []);

    // Load songs + rooms when group changes
    useEffect(() => {
        if (!selectedGroupId) {
            setSongs([]);
            setRooms([]);
            setExpandedSlotSongId(null);
            setExpandedSlots([]);
            setAddSongsOpen(false);
            setRemovingSongId(null);
            return;
        }
        async function load() {
            setLoadingSongs(true);
            const [songsRes, roomsRes] = await Promise.all([
                supabase
                    .from("show_group_songs")
                    .select("id, show_group_instance_id, title, artist, order_index, casting_status, pair_group, rehearsal_room_id, has_method_lesson, song_key, tuning, notes")
                    .eq("show_group_instance_id", selectedGroupId)
                    .order("order_index", { ascending: true }),
                supabase
                    .from("rehearsal_rooms")
                    .select("id, school_id, name, order_index")
                    .eq("school_id", schoolId)
                    .order("order_index", { ascending: true }),
            ]);
            if (!songsRes.error && songsRes.data) setSongs(songsRes.data as Song[]);
            if (!roomsRes.error && roomsRes.data) setRooms(roomsRes.data as RehearsalRoom[]);
            setLoadingSongs(false);
        }
        load();
    }, [selectedGroupId, schoolId]);

    const loadSlots = useCallback(async (songId: string) => {
        setLoadingSlots(true);
        const { data, error } = await supabase
            .from("show_song_cast_slots")
            .select("id, show_group_song_id, cast_slot_type_id, slot_label, max_students, order_index, cast_slot_types(name)")
            .eq("show_group_song_id", songId)
            .order("order_index", { ascending: true });
        if (!error && data) {
            setExpandedSlots(
                data.map((row: any) => ({
                    id: row.id,
                    show_group_song_id: row.show_group_song_id,
                    cast_slot_type_id: row.cast_slot_type_id,
                    slot_label: row.slot_label,
                    max_students: row.max_students,
                    order_index: row.order_index,
                    type_name: row.cast_slot_types?.name ?? "",
                }))
            );
        }
        setLoadingSlots(false);
    }, []);

    // Load theme songs when add panel opens for a themed show
    useEffect(() => {
        if (!addSongsOpen || !selectedGroup?.show_theme_id) {
            setThemeSongs([]);
            setCheckedThemeSongIds(new Set());
            return;
        }
        supabase
            .from("theme_songs")
            .select("id, show_theme_id, title, artist, has_method_lesson, order_index")
            .eq("show_theme_id", selectedGroup.show_theme_id)
            .order("has_method_lesson", { ascending: false })
            .order("order_index", { ascending: true })
            .then(({ data }) => {
                if (data) setThemeSongs(data as ThemeSong[]);
            });
    }, [addSongsOpen, selectedGroup?.show_theme_id]);

    // ─── Handlers ───────────────────────────────────────────────────────────

    function handleToggleSlots(songId: string) {
        if (expandedSlotSongId === songId) {
            setExpandedSlotSongId(null);
            setExpandedSlots([]);
            setAddSlotTypeId("");
            setAddSlotLabel("");
            setAddSlotMax(1);
        } else {
            setExpandedSlotSongId(songId);
            setExpandedSlots([]);
            setAddSlotTypeId("");
            setAddSlotLabel("");
            setAddSlotMax(1);
            loadSlots(songId);
        }
    }

    async function handleReorder(songId: string, direction: "up" | "down") {
        const sorted = [...songs].sort((a, b) => a.order_index - b.order_index);
        const idx = sorted.findIndex((s) => s.id === songId);
        if (direction === "up" && idx <= 0) return;
        if (direction === "down" && idx >= sorted.length - 1) return;
        const otherIdx = direction === "up" ? idx - 1 : idx + 1;
        const song = sorted[idx];
        const other = sorted[otherIdx];
        const [r1, r2] = await Promise.all([
            supabase.from("show_group_songs").update({ order_index: other.order_index }).eq("id", song.id),
            supabase.from("show_group_songs").update({ order_index: song.order_index }).eq("id", other.id),
        ]);
        if (!r1.error && !r2.error) {
            setSongs((prev) =>
                prev.map((s) => {
                    if (s.id === song.id) return { ...s, order_index: other.order_index };
                    if (s.id === other.id) return { ...s, order_index: song.order_index };
                    return s;
                })
            );
        }
    }

    async function handleRoomChange(songId: string, roomId: string) {
        const val = roomId === "" ? null : roomId;
        const { error } = await supabase
            .from("show_group_songs")
            .update({ rehearsal_room_id: val })
            .eq("id", songId);
        if (!error) {
            setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, rehearsal_room_id: val } : s)));
        }
    }

    async function handlePairGroupChange(songId: string, value: string) {
        const val = value === "" ? null : parseInt(value, 10);
        if (val !== null && (isNaN(val) || val < 1 || val > 20)) return;
        const { error } = await supabase
            .from("show_group_songs")
            .update({ pair_group: val })
            .eq("id", songId);
        if (!error) {
            setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, pair_group: val } : s)));
        }
    }

    async function handleRemoveSong(songId: string) {
        const { error } = await supabase.from("show_group_songs").delete().eq("id", songId);
        if (!error) {
            setSongs((prev) => prev.filter((s) => s.id !== songId));
            if (expandedSlotSongId === songId) {
                setExpandedSlotSongId(null);
                setExpandedSlots([]);
            }
            setRemovingSongId(null);
        }
    }

    async function handleAddSlot() {
        if (!expandedSlotSongId || !addSlotTypeId || !addSlotLabel.trim()) return;
        const nextOrder = expandedSlots.length > 0
            ? Math.max(...expandedSlots.map((s) => s.order_index)) + 1
            : 1;
        const { error } = await supabase.from("show_song_cast_slots").insert({
            show_group_song_id: expandedSlotSongId,
            cast_slot_type_id: addSlotTypeId,
            slot_label: addSlotLabel.trim(),
            max_students: addSlotMax,
            order_index: nextOrder,
        });
        if (!error) {
            setAddSlotTypeId("");
            setAddSlotLabel("");
            setAddSlotMax(1);
            loadSlots(expandedSlotSongId);
        }
    }

    async function handleRemoveSlot(slotId: string) {
        const { error } = await supabase.from("show_song_cast_slots").delete().eq("id", slotId);
        if (!error && expandedSlotSongId) loadSlots(expandedSlotSongId);
    }

    async function handleAddThemeSongs() {
        if (!selectedGroupId || checkedThemeSongIds.size === 0) return;
        setAddingSongs(true);
        const toAdd = themeSongs.filter((t) => checkedThemeSongIds.has(t.id));
        let nextOrder = songs.length > 0
            ? Math.max(...songs.map((s) => s.order_index)) + 1
            : 1;

        for (const theme of toAdd) {
            const { data: newSong, error: songError } = await supabase
                .from("show_group_songs")
                .insert({
                    show_group_instance_id: selectedGroupId,
                    title: theme.title,
                    artist: theme.artist,
                    has_method_lesson: theme.has_method_lesson,
                    order_index: nextOrder,
                    casting_status: "draft",
                })
                .select("id")
                .single();

            if (songError || !newSong) { nextOrder++; continue; }

            // Copy cast slot templates if any exist
            const { data: templates } = await supabase
                .from("theme_song_cast_slots")
                .select("cast_slot_type_id, slot_label, max_students, order_index")
                .eq("theme_song_id", theme.id)
                .order("order_index", { ascending: true });

            if (templates && templates.length > 0) {
                await supabase.from("show_song_cast_slots").insert(
                    templates.map((t: any) => ({
                        show_group_song_id: newSong.id,
                        cast_slot_type_id: t.cast_slot_type_id,
                        slot_label: t.slot_label,
                        max_students: t.max_students,
                        order_index: t.order_index,
                    }))
                );
            }
            nextOrder++;
        }

        // Reload songs
        const { data: refreshed } = await supabase
            .from("show_group_songs")
            .select("id, show_group_instance_id, title, artist, order_index, casting_status, pair_group, rehearsal_room_id, has_method_lesson, song_key, tuning, notes")
            .eq("show_group_instance_id", selectedGroupId)
            .order("order_index", { ascending: true });
        if (refreshed) setSongs(refreshed as Song[]);
        setAddingSongs(false);
        setAddSongsOpen(false);
        setCheckedThemeSongIds(new Set());
    }

    async function handleAddCustomSong() {
        if (!selectedGroupId || !customTitle.trim() || !customArtist.trim()) return;
        const nextOrder = songs.length > 0
            ? Math.max(...songs.map((s) => s.order_index)) + 1
            : 1;
        const { data: newSong, error } = await supabase
            .from("show_group_songs")
            .insert({
                show_group_instance_id: selectedGroupId,
                title: customTitle.trim(),
                artist: customArtist.trim(),
                has_method_lesson: customHasMethodLesson,
                order_index: nextOrder,
                casting_status: "draft",
            })
            .select("id, show_group_instance_id, title, artist, order_index, casting_status, pair_group, rehearsal_room_id, has_method_lesson, song_key, tuning, notes")
            .single();
        if (!error && newSong) {
            setSongs((prev) => [...prev, newSong as Song]);
            setCustomTitle("");
            setCustomArtist("");
            setCustomHasMethodLesson(false);
        }
    }

    // ─── Derived state ──────────────────────────────────────────────────────

    const sortedSongs = [...songs].sort((a, b) => a.order_index - b.order_index);

    const summaryCounts = songs.reduce(
        (acc, s) => { acc[s.casting_status] = (acc[s.casting_status] ?? 0) + 1; return acc; },
        {} as Record<string, number>
    );

    // ─── Render ─────────────────────────────────────────────────────────────

    if (loadingGroups) {
        return <div className="p-6 text-zinc-400 text-sm">Loading show groups...</div>;
    }

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

    return (
        <div className="p-6 space-y-6" style={{ backgroundColor: "#ffffff", minHeight: "100vh" }}>

            {/* Page heading */}
            <div className="bg-[#111111] px-6 py-5">
                <div className="flex items-baseline gap-3">
                    <span
                        className="font-bold text-2xl tracking-wide"
                        style={{ fontFamily: "var(--font-oswald)", color: "#cc0000" }}
                    >
                        CASTING
                    </span>
                    <span
                        className="font-bold italic text-2xl text-white"
                        style={{ fontFamily: "var(--font-oswald)" }}
                    >
                        TOOL
                    </span>
                </div>
                <div className="mt-1 text-sm text-zinc-400">{schoolName}</div>
            </div>

            {/* SECTION 1 — Show Group Selector */}
            <div>
                <div className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
                    Select Show Group
                </div>
                <div className="flex flex-wrap gap-3">
                    {showGroups.map((group) => {
                        const isSelected = selectedGroupId === group.id;
                        const dayLabel = group.day_of_week
                            ? (DAY_LABELS[group.day_of_week.toLowerCase()] ?? group.day_of_week)
                            : null;
                        const timeStr = group.start_time ? formatTime(group.start_time) : null;
                        return (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() => setSelectedGroupId(group.id)}
                                className={`text-left p-4 min-w-[200px] max-w-[280px] transition-colors ${
                                    isSelected
                                        ? "border-2 border-[#cc0000] bg-[#1a1a1a]"
                                        : "border border-zinc-700 bg-[#1a1a1a] hover:border-zinc-500"
                                }`}
                            >
                                <div
                                    className="text-base font-bold text-white leading-tight"
                                    style={{ fontFamily: "var(--font-oswald)" }}
                                >
                                    {group.name}
                                </div>
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

            {/* Song management — only shown when a group is selected */}
            {selectedGroup && (
                <div className="space-y-4">

                    {/* SECTION 4 — Song count summary */}
                    {songs.length > 0 && (
                        <div className="text-sm text-zinc-500">
                            {[
                                `${songs.length} song${songs.length !== 1 ? "s" : ""}`,
                                summaryCounts["approved"]  ? `${summaryCounts["approved"]} approved`  : null,
                                summaryCounts["submitted"] ? `${summaryCounts["submitted"]} submitted` : null,
                                summaryCounts["returned"]  ? `${summaryCounts["returned"]} returned`  : null,
                                summaryCounts["draft"]     ? `${summaryCounts["draft"]} draft`         : null,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </div>
                    )}

                    {/* SECTION 3 — Add Songs button + panel */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setAddSongsOpen((v) => !v)}
                            className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000]"
                        >
                            {addSongsOpen ? "✕ Close" : "+ Add Songs"}
                        </button>

                        {addSongsOpen && (
                            <div className="mt-3 border border-zinc-700 bg-[#111111] p-5">
                                {selectedGroup.show_theme_id ? (
                                    /* Themed show — pick from theme catalog */
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
                                                            (s) =>
                                                                s.title.toLowerCase() === ts.title.toLowerCase() &&
                                                                s.artist.toLowerCase() === ts.artist.toLowerCase()
                                                        );
                                                        return (
                                                            <label
                                                                key={ts.id}
                                                                className={`flex items-center gap-3 px-3 py-2 ${
                                                                    alreadyAdded
                                                                        ? "opacity-40 cursor-not-allowed"
                                                                        : "cursor-pointer hover:bg-zinc-800"
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    disabled={alreadyAdded}
                                                                    checked={checkedThemeSongIds.has(ts.id)}
                                                                    onChange={(e) => {
                                                                        setCheckedThemeSongIds((prev) => {
                                                                            const next = new Set(prev);
                                                                            if (e.target.checked) next.add(ts.id);
                                                                            else next.delete(ts.id);
                                                                            return next;
                                                                        });
                                                                    }}
                                                                />
                                                                <span className="flex-1 text-sm text-white">
                                                                    {ts.title}
                                                                    <span className="ml-2 text-zinc-400">
                                                                        · {ts.artist}
                                                                    </span>
                                                                </span>
                                                                {ts.has_method_lesson && (
                                                                    <span className="bg-green-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-green-200">
                                                                        METHOD APP
                                                                    </span>
                                                                )}
                                                                {alreadyAdded && (
                                                                    <span className="text-xs text-zinc-500">
                                                                        Already Added
                                                                    </span>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-4">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddThemeSongs}
                                                        disabled={checkedThemeSongIds.size === 0 || addingSongs}
                                                        className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {addingSongs
                                                            ? "Adding..."
                                                            : `Add Selected (${checkedThemeSongIds.size})`}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    /* Custom show — manual entry, stays open for multiple adds */
                                    <>
                                        <div className="mb-3 text-sm font-medium text-zinc-300">Add a song manually:</div>
                                        <div className="flex flex-wrap gap-3 items-end">
                                            <div>
                                                <label className="block text-xs text-zinc-500 mb-1">Title *</label>
                                                <input
                                                    type="text"
                                                    value={customTitle}
                                                    onChange={(e) => setCustomTitle(e.target.value)}
                                                    placeholder="Song title"
                                                    className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none focus:border-zinc-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-zinc-500 mb-1">Artist *</label>
                                                <input
                                                    type="text"
                                                    value={customArtist}
                                                    onChange={(e) => setCustomArtist(e.target.value)}
                                                    placeholder="Artist name"
                                                    className="bg-zinc-800 border border-zinc-700 text-white px-3 py-2 text-sm w-48 outline-none focus:border-zinc-500"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 pb-2">
                                                <input
                                                    type="checkbox"
                                                    id="customMethodLesson"
                                                    checked={customHasMethodLesson}
                                                    onChange={(e) => setCustomHasMethodLesson(e.target.checked)}
                                                />
                                                <label
                                                    htmlFor="customMethodLesson"
                                                    className="text-xs text-zinc-400 cursor-pointer"
                                                >
                                                    Has Method App lesson
                                                </label>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleAddCustomSong}
                                                disabled={!customTitle.trim() || !customArtist.trim()}
                                                className="bg-[#cc0000] text-white px-4 py-2 text-sm font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Add Song
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* SECTION 2 — Song List */}
                    {loadingSongs ? (
                        <div className="text-zinc-400 text-sm">Loading songs...</div>
                    ) : songs.length === 0 ? (
                        <div className="bg-[#111111] p-6 text-zinc-500 text-sm">
                            No songs added yet. Use &quot;+ Add Songs&quot; above.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortedSongs.map((song, idx) => {
                                const statusStyle = castingStatusStyle(song.casting_status);
                                const isSlotExpanded = expandedSlotSongId === song.id;
                                const isConfirmingRemove = removingSongId === song.id;

                                return (
                                    <div key={song.id}>
                                        {/* Song tile */}
                                        <div className="bg-[#1a1a1a] border border-zinc-800">
                                            <div className="flex items-start gap-3 p-4">

                                                {/* Reorder buttons + position number */}
                                                <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorder(song.id, "up")}
                                                        disabled={idx === 0}
                                                        className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Move up"
                                                    >
                                                        ▲
                                                    </button>
                                                    <span className="text-xs text-zinc-500 font-mono w-5 text-center">
                                                        {idx + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReorder(song.id, "down")}
                                                        disabled={idx === sortedSongs.length - 1}
                                                        className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 text-xs hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="Move down"
                                                    >
                                                        ▼
                                                    </button>
                                                </div>

                                                {/* Song info + controls */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-bold text-white text-sm">{song.title}</span>
                                                        <span className="text-zinc-400 text-sm">· {song.artist}</span>
                                                        {song.has_method_lesson && (
                                                            <span className="bg-green-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-green-200">
                                                                METHOD APP
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Room + Pair controls */}
                                                    <div className="mt-2 flex flex-wrap items-center gap-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs text-zinc-500">Room:</span>
                                                            <select
                                                                value={song.rehearsal_room_id ?? ""}
                                                                onChange={(e) => handleRoomChange(song.id, e.target.value)}
                                                                className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1 outline-none"
                                                            >
                                                                <option value="">— none —</option>
                                                                {rooms.map((r) => (
                                                                    <option key={r.id} value={r.id}>
                                                                        {r.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="flex items-center gap-1.5">
                                                            <span
                                                                className="text-xs text-zinc-500 cursor-help"
                                                                title="Songs with the same pair number rehearse simultaneously in different rooms"
                                                            >
                                                                Pair:
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                max={20}
                                                                value={song.pair_group ?? ""}
                                                                onChange={(e) =>
                                                                    handlePairGroupChange(song.id, e.target.value)
                                                                }
                                                                placeholder="—"
                                                                className="w-16 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1 text-center outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right side: status badge + action buttons */}
                                                <div className="flex flex-col items-end gap-2 shrink-0">
                                                    <span
                                                        className={`${statusStyle.bg} px-2 py-0.5 text-[10px] uppercase tracking-wide text-white font-bold`}
                                                    >
                                                        {statusStyle.label}
                                                    </span>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleSlots(song.id)}
                                                            className={`px-3 py-1 text-xs font-medium border ${
                                                                isSlotExpanded
                                                                    ? "bg-zinc-700 border-zinc-600 text-white"
                                                                    : "bg-transparent border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-white"
                                                            }`}
                                                        >
                                                            Slots
                                                        </button>
                                                        {isConfirmingRemove ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveSong(song.id)}
                                                                    className="px-3 py-1 text-xs font-medium bg-[#cc0000] text-white hover:bg-[#b30000]"
                                                                >
                                                                    Confirm
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRemovingSongId(null)}
                                                                    className="px-3 py-1 text-xs border border-zinc-600 text-zinc-400 hover:text-white"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setRemovingSongId(song.id)}
                                                                className="px-3 py-1 text-xs border border-[#cc0000] text-[#cc0000] hover:bg-[#cc0000] hover:text-white"
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slot editor — expands below song tile */}
                                        {isSlotExpanded && (
                                            <div className="border-l-2 border-l-[#cc0000] border-b border-r border-zinc-800 bg-[#111111] p-4">
                                                {loadingSlots ? (
                                                    <div className="text-xs text-zinc-500">Loading slots...</div>
                                                ) : (
                                                    <>
                                                        {expandedSlots.length === 0 ? (
                                                            <div className="text-xs text-zinc-500 mb-3">
                                                                No cast slots yet.
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-1 mb-4">
                                                                {expandedSlots.map((slot) => (
                                                                    <div
                                                                        key={slot.id}
                                                                        className="flex items-center gap-3 bg-zinc-900 px-3 py-2"
                                                                    >
                                                                        <span className="text-sm text-white flex-1">
                                                                            {slot.slot_label}
                                                                        </span>
                                                                        {slot.type_name && (
                                                                            <span className="bg-zinc-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                                                                                {slot.type_name}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-xs text-zinc-500">
                                                                            max {slot.max_students}
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleRemoveSlot(slot.id)}
                                                                            className="text-sm text-[#cc0000] hover:text-white ml-1 leading-none"
                                                                            title="Remove slot"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Add Slot form */}
                                                        <div className="border-t border-zinc-800 pt-3">
                                                            <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">
                                                                Add Slot
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 items-end">
                                                                <div>
                                                                    <label className="block text-xs text-zinc-500 mb-1">
                                                                        Cast Type
                                                                    </label>
                                                                    <select
                                                                        value={addSlotTypeId}
                                                                        onChange={(e) => {
                                                                            const typeId = e.target.value;
                                                                            setAddSlotTypeId(typeId);
                                                                            const typeName =
                                                                                castSlotTypes.find(
                                                                                    (t) => t.id === typeId
                                                                                )?.name ?? "";
                                                                            setAddSlotLabel(typeName);
                                                                        }}
                                                                        className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 outline-none"
                                                                    >
                                                                        <option value="">Select type...</option>
                                                                        {castSlotTypes.map((t) => (
                                                                            <option key={t.id} value={t.id}>
                                                                                {t.name}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-zinc-500 mb-1">
                                                                        Label
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={addSlotLabel}
                                                                        onChange={(e) =>
                                                                            setAddSlotLabel(e.target.value)
                                                                        }
                                                                        placeholder="e.g. Guitar 1"
                                                                        className="bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 w-36 outline-none"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="block text-xs text-zinc-500 mb-1">
                                                                        Max
                                                                    </label>
                                                                    <input
                                                                        type="number"
                                                                        min={1}
                                                                        max={20}
                                                                        value={addSlotMax}
                                                                        onChange={(e) =>
                                                                            setAddSlotMax(
                                                                                parseInt(e.target.value, 10) || 1
                                                                            )
                                                                        }
                                                                        className="w-16 bg-zinc-800 border border-zinc-700 text-white text-xs px-2 py-1.5 text-center outline-none"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleAddSlot}
                                                                    disabled={
                                                                        !addSlotTypeId || !addSlotLabel.trim()
                                                                    }
                                                                    className="bg-[#cc0000] text-white px-3 py-1.5 text-xs font-medium hover:bg-[#b30000] disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    Add
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
