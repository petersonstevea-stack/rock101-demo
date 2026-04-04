"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type QueueItem = {
    id: string;
    type: "profile" | "show" | "photo";
    studentName: string;
    studentId: string;
    submittedAt: string;
    pendingChanges?: Record<string, string> | null;
    showName?: string;
    seasonYear?: string;
    pendingPosterUrl?: string | null;
    pendingPhotoUrl?: string | null;
};

type ProfileRow = {
    id: string;
    student_id: string;
    pending_changes: Record<string, string> | null;
    pending_submitted_at: string | null;
    students: { first_name: string; last_initial: string } | null;
};

type ShowRow = {
    id: string;
    student_id: string;
    show_name: string;
    season_year: string;
    pending_poster_url: string | null;
    created_at: string;
    students: { first_name: string; last_initial: string } | null;
};

type PhotoRow = {
    id: string;
    student_id: string;
    pending_photo_url: string;
    pending_photo_submitted_at: string | null;
    students: { first_name: string; last_initial: string } | null;
};

const FIELD_LABELS: Record<string, string> = {
    favorite_bands: "Favorite Bands",
    first_concert: "First Concert",
    fun_fact: "Fun Fact",
    spotify_url: "Spotify URL",
    apple_music_url: "Apple Music URL",
};

export default function ApprovalsView() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState("");
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        loadQueue();
    }, []);

    async function loadQueue() {
        setLoading(true);

        const [profilesResult, historyResult, photosResult] = await Promise.all([
            supabase
                .from("student_profiles")
                .select("id, student_id, pending_changes, pending_submitted_at, students(first_name, last_initial)")
                .eq("pending_status", "pending")
                .returns<ProfileRow[]>(),
            supabase
                .from("student_show_history")
                .select("id, student_id, show_name, season_year, pending_poster_url, created_at, students(first_name, last_initial)")
                .eq("status", "pending")
                .returns<ShowRow[]>(),
            supabase
                .from("student_profiles")
                .select("id, student_id, pending_photo_url, pending_photo_submitted_at, students(first_name, last_initial)")
                .not("pending_photo_url", "is", null)
                .returns<PhotoRow[]>(),
        ]);

        function studentName(row: { students: { first_name: string; last_initial: string } | null }): string {
            return `${row.students?.first_name ?? ""} ${row.students?.last_initial ? row.students.last_initial + "." : ""}`.trim();
        }

        const profileItems: QueueItem[] = (profilesResult.data ?? []).map((row) => ({
            id: row.id,
            type: "profile",
            studentId: row.student_id,
            studentName: studentName(row),
            submittedAt: row.pending_submitted_at ?? "",
            pendingChanges: row.pending_changes,
        }));

        const showItems: QueueItem[] = (historyResult.data ?? []).map((row) => ({
            id: row.id,
            type: "show",
            studentId: row.student_id,
            studentName: studentName(row),
            submittedAt: row.created_at,
            showName: row.show_name,
            seasonYear: row.season_year,
            pendingPosterUrl: row.pending_poster_url,
        }));

        const photoItems: QueueItem[] = (photosResult.data ?? []).map((row) => ({
            id: row.id,
            type: "photo",
            studentId: row.student_id,
            studentName: studentName(row),
            submittedAt: row.pending_photo_submitted_at ?? "",
            pendingPhotoUrl: row.pending_photo_url,
        }));

        const combined = [...profileItems, ...showItems, ...photoItems].sort(
            (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
        );

        setItems(combined);
        setLoading(false);
    }

    function removeItem(id: string) {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }

    async function handleApprove(item: QueueItem) {
        setProcessing(item.id);

        if (item.type === "profile") {
            const changes = item.pendingChanges ?? {};

            const fieldUpdate: {
                favorite_bands?: string | null;
                first_concert?: string | null;
                fun_fact?: string | null;
                spotify_url?: string | null;
                apple_music_url?: string | null;
            } = {};

            if ("favorite_bands" in changes) fieldUpdate.favorite_bands = changes.favorite_bands || null;
            if ("first_concert" in changes) fieldUpdate.first_concert = changes.first_concert || null;
            if ("fun_fact" in changes) fieldUpdate.fun_fact = changes.fun_fact || null;
            if ("spotify_url" in changes) fieldUpdate.spotify_url = changes.spotify_url || null;
            if ("apple_music_url" in changes) fieldUpdate.apple_music_url = changes.apple_music_url || null;

            await supabase
                .from("student_profiles")
                .update({
                    ...fieldUpdate,
                    pending_changes: null,
                    pending_status: "approved",
                    pending_reviewed_at: new Date().toISOString(),
                    is_published: true,
                })
                .eq("id", item.id);
        } else if (item.type === "photo") {
            const { error } = await supabase
                .from("student_profiles")
                .update({
                    photo_url: item.pendingPhotoUrl,
                    pending_photo_url: null,
                    pending_photo_submitted_at: null,
                    pending_reviewed_at: new Date().toISOString(),
                    is_published: true,
                })
                .eq("id", item.id);
            if (error) console.error("photo approve error:", error);
        } else {
            const { error } = await supabase
                .from("student_show_history")
                .update({
                    status: "approved",
                    poster_url: item.pendingPosterUrl,
                    pending_poster_url: null,
                })
                .eq("id", item.id);
            if (error) console.error("show approve error:", error);
        }

        removeItem(item.id);
        setProcessing(null);
    }

    async function handleReject(item: QueueItem) {
        setProcessing(item.id);

        if (item.type === "profile") {
            await supabase
                .from("student_profiles")
                .update({
                    pending_status: "rejected",
                    rejection_note: rejectNote || null,
                    pending_reviewed_at: new Date().toISOString(),
                })
                .eq("id", item.id);
        } else if (item.type === "photo") {
            await supabase
                .from("student_profiles")
                .update({
                    pending_photo_url: null,
                    pending_photo_submitted_at: null,
                    rejection_note: rejectNote || null,
                    pending_reviewed_at: new Date().toISOString(),
                })
                .eq("id", item.id);
        } else {
            await supabase
                .from("student_show_history")
                .update({
                    status: "rejected",
                    rejection_note: rejectNote || null,
                })
                .eq("id", item.id);
        }

        removeItem(item.id);
        setRejectingId(null);
        setRejectNote("");
        setProcessing(null);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-[#cc0000]" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-3xl px-6 pb-12 pt-10">
            {/* Header */}
            <div className="mb-8">
                <h1
                    className="text-3xl font-bold uppercase"
                    style={{ fontFamily: "var(--font-oswald)" }}
                >
                    <span style={{ color: "#cc0000" }}>PENDING</span>{" "}
                    <span className="text-white">APPROVALS</span>
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                    {items.length === 0
                        ? "No pending submissions"
                        : `${items.length} item${items.length !== 1 ? "s" : ""} waiting for review`}
                </p>
            </div>

            {items.length === 0 ? (
                <div className="rounded-none bg-[#111111] p-10 text-center">
                    <p className="text-sm text-zinc-500">All caught up — no pending submissions.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="rounded-none bg-[#111111] p-4 border-l-4 border-l-[#cc0000]"
                        >
                            {/* Top row */}
                            <div className="flex items-start justify-between gap-4">
                                <p className="font-semibold text-white">{item.studentName}</p>
                                <span className="shrink-0 rounded-none bg-[#1a1a1a] px-2 py-0.5 text-xs text-zinc-400">
                                    {item.type === "profile" ? "PROFILE UPDATE" : item.type === "show" ? "SHOW HISTORY" : "PHOTO"}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="mt-3 space-y-2">
                                {item.type === "profile" && item.pendingChanges &&
                                    Object.entries(item.pendingChanges)
                                        .filter(([, v]) => v)
                                        .map(([k, v]) => (
                                            <div key={k}>
                                                <p className="text-xs text-zinc-500">
                                                    {FIELD_LABELS[k] ?? k.replace(/_/g, " ")}
                                                </p>
                                                <p className="mt-0.5 text-sm text-white">{v}</p>
                                            </div>
                                        ))
                                }
                                {item.type === "show" && (
                                    <>
                                        <p className="text-sm text-white">{item.showName}</p>
                                        <p className="text-xs text-zinc-500">{item.seasonYear}</p>
                                        {item.pendingPosterUrl && (
                                            item.pendingPosterUrl.toLowerCase().endsWith(".pdf") ? (
                                                <a
                                                    href={item.pendingPosterUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[#cc0000] text-xs underline mt-2"
                                                >
                                                    📄 View PDF Poster
                                                </a>
                                            ) : (
                                                <img
                                                    src={item.pendingPosterUrl}
                                                    alt="Show poster"
                                                    className="mt-2 max-h-20 object-contain"
                                                />
                                            )
                                        )}
                                    </>
                                )}
                                {item.type === "photo" && item.pendingPhotoUrl && (
                                    <>
                                        <img
                                            src={item.pendingPhotoUrl}
                                            alt="Profile photo"
                                            className="h-16 w-16 rounded-full object-cover"
                                        />
                                        <p className="text-sm text-zinc-400">Profile photo — pending review</p>
                                    </>
                                )}
                            </div>

                            {/* Submitted date */}
                            {item.submittedAt && (
                                <p className="mt-3 text-sm text-zinc-500">
                                    Submitted{" "}
                                    {new Date(item.submittedAt).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                            )}

                            {/* Action row */}
                            {rejectingId === item.id ? (
                                <div className="mt-4 space-y-2">
                                    <textarea
                                        rows={2}
                                        value={rejectNote}
                                        onChange={(e) => setRejectNote(e.target.value)}
                                        placeholder="Reason for rejection (optional)"
                                        className="w-full rounded-none border border-zinc-600 bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder-zinc-600"
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleReject(item)}
                                            disabled={processing === item.id}
                                            className="rounded-none bg-[#1a1a1a] border border-zinc-600 px-4 py-2 text-sm text-white transition hover:bg-zinc-700 disabled:opacity-50"
                                        >
                                            {processing === item.id ? "Rejecting..." : "Confirm Reject"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRejectingId(null);
                                                setRejectNote("");
                                            }}
                                            className="text-sm text-zinc-500 transition hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleApprove(item)}
                                        disabled={processing === item.id}
                                        className="rounded-none bg-[#cc0000] px-4 py-2 text-sm text-white transition hover:bg-[#b30000] disabled:opacity-50"
                                    >
                                        {processing === item.id ? "Approving..." : "Approve"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRejectingId(item.id);
                                            setRejectNote("");
                                        }}
                                        className="rounded-none bg-[#1a1a1a] border border-zinc-600 px-4 py-2 text-sm text-white transition hover:bg-zinc-700"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
