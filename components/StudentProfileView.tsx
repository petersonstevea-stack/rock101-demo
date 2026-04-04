"use client";

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type StudentProfileViewProps = {
    studentId: string;
    studentName: string;
    schoolId: string;
    isOwnProfile?: boolean;
};

type StudentProfile = {
    id: string;
    student_id: string;
    photo_url: string | null;
    favorite_bands: string | null;
    first_concert: string | null;
    spotify_url: string | null;
    apple_music_url: string | null;
    fun_fact: string | null;
    wallpaper_url: string | null;
    wallpaper_preset: string | null;
    pending_changes: Record<string, unknown> | null;
    pending_status: string | null;
    is_published: boolean;
};

type ShowHistoryEntry = {
    id: string;
    show_name: string;
    season_year: string;
    status: string;
};

type StudentMeta = {
    is_house_band: boolean;
    is_allstar: boolean;
    instrument: string | null;
};

function ProfileField({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-none bg-[#111111] p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500">{label}</p>
            <p className="mt-1 text-sm text-white">{value}</p>
        </div>
    );
}

export default function StudentProfileView({
    studentId,
    studentName,
    schoolId,
    isOwnProfile,
}: StudentProfileViewProps) {
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [showHistory, setShowHistory] = useState<ShowHistoryEntry[]>([]);
    const [studentMeta, setStudentMeta] = useState<StudentMeta | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [addingShow, setAddingShow] = useState(false);
    const [newShowName, setNewShowName] = useState("");
    const [newSeasonYear, setNewSeasonYear] = useState("");
    const [saving, setSaving] = useState(false);
    const [pendingMsg, setPendingMsg] = useState("");

    const [editFavBands, setEditFavBands] = useState("");
    const [editFirstConcert, setEditFirstConcert] = useState("");
    const [editSpotify, setEditSpotify] = useState("");
    const [editApple, setEditApple] = useState("");
    const [editFunFact, setEditFunFact] = useState("");

    useEffect(() => {
        async function loadData() {
            setLoading(true);

            const { data: meta } = await supabase
                .from("students")
                .select("is_house_band, is_allstar, instrument")
                .eq("id", studentId)
                .maybeSingle();
            setStudentMeta(meta);

            const { data: prof } = await supabase
                .from("student_profiles")
                .select("*")
                .eq("student_id", studentId)
                .maybeSingle();

            if (prof) {
                setProfile(prof);
                setEditFavBands(prof.favorite_bands ?? "");
                setEditFirstConcert(prof.first_concert ?? "");
                setEditSpotify(prof.spotify_url ?? "");
                setEditApple(prof.apple_music_url ?? "");
                setEditFunFact(prof.fun_fact ?? "");
            }

            const { data: history } = await supabase
                .from("student_show_history")
                .select("id, show_name, season_year, status")
                .eq("student_id", studentId)
                .in("status", ["approved", "pending"])
                .order("season_year", { ascending: false });
            setShowHistory(history ?? []);

            setLoading(false);
        }

        loadData();
    }, [studentId]);

    async function handleSaveProfile() {
        setSaving(true);
        const changes = {
            favorite_bands: editFavBands || null,
            first_concert: editFirstConcert || null,
            spotify_url: editSpotify || null,
            apple_music_url: editApple || null,
            fun_fact: editFunFact || null,
        };

        if (!profile) {
            await supabase.from("student_profiles").insert({
                student_id: studentId,
                pending_changes: changes,
                pending_status: "pending",
                pending_submitted_at: new Date().toISOString(),
                is_published: false,
            });
        } else {
            await supabase
                .from("student_profiles")
                .update({
                    pending_changes: changes,
                    pending_status: "pending",
                    pending_submitted_at: new Date().toISOString(),
                })
                .eq("student_id", studentId);
        }

        setPendingMsg("Your profile has been submitted for review.");
        setEditMode(false);

        // Reload profile to show pending state
        const { data: updated } = await supabase
            .from("student_profiles")
            .select("*")
            .eq("student_id", studentId)
            .maybeSingle();
        if (updated) setProfile(updated);

        setSaving(false);
    }

    async function handleAddShow() {
        if (!newShowName.trim() || !newSeasonYear.trim()) return;
        await supabase.from("student_show_history").insert({
            student_id: studentId,
            show_name: newShowName.trim(),
            season_year: newSeasonYear.trim(),
            status: "pending",
            submitted_at: new Date().toISOString(),
        });
        setNewShowName("");
        setNewSeasonYear("");
        setAddingShow(false);
        setPendingMsg("Show submitted for staff approval.");
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-[#cc0000]" />
            </div>
        );
    }

    const hasPublishedContent =
        profile?.favorite_bands ||
        profile?.first_concert ||
        profile?.fun_fact ||
        profile?.spotify_url ||
        profile?.apple_music_url;

    return (
        <div className="w-full bg-black pb-12">
            {/* Avatar section */}
            <div className="flex flex-col items-center pt-10">
                <div className="relative">
                    <div
                        className={`relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-zinc-800 ${
                            studentMeta?.is_house_band
                                ? "ring-4 ring-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]"
                                : studentMeta?.is_allstar
                                ? "ring-4 ring-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                                : "ring-2 ring-zinc-700"
                        }`}
                    >
                        {profile?.photo_url ? (
                            <img
                                src={profile.photo_url}
                                alt={studentName}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <User size={36} className="text-zinc-500" />
                        )}
                    </div>

                    {/* Season badge */}
                    <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#cc0000] text-xs font-bold text-white">
                        {showHistory.length}
                    </div>
                </div>

                <p className="mt-4 text-lg font-semibold text-white">{studentName}</p>

                {studentMeta?.instrument && (
                    <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">
                        {studentMeta.instrument}
                    </p>
                )}

                {/* Badges */}
                <div className="mt-3 flex gap-2">
                    {studentMeta?.is_house_band && (
                        <span className="rounded-none bg-blue-900 px-3 py-1 text-xs font-semibold text-blue-300">
                            House Band
                        </span>
                    )}
                    {studentMeta?.is_allstar && (
                        <span className="rounded-none bg-yellow-900 px-3 py-1 text-xs font-semibold text-yellow-300">
                            All-Star
                        </span>
                    )}
                </div>
            </div>

            {/* Pending message banner */}
            {pendingMsg && (
                <div className="mx-6 mt-6 rounded-none bg-zinc-800 px-4 py-3 text-center text-sm text-zinc-300">
                    {pendingMsg}
                </div>
            )}

            {/* Show history section */}
            <div className="mt-8 px-6">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Show History</p>

                {showHistory.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-500">No completed shows yet.</p>
                ) : (
                    <div className="mt-3 space-y-2">
                        {showHistory.map((entry) => (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between rounded-none bg-[#111111] px-4 py-3"
                            >
                                <p className="text-sm text-white">{entry.show_name}</p>
                                <div className="flex items-center gap-2">
                                    {entry.status === "pending" && (
                                        <span className="rounded-none bg-zinc-700 px-2 py-0.5 text-xs text-zinc-400">
                                            Pending review
                                        </span>
                                    )}
                                    <span className="text-xs text-zinc-500">{entry.season_year}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {isOwnProfile && (
                    <>
                        {!addingShow ? (
                            <button
                                type="button"
                                onClick={() => setAddingShow(true)}
                                className="mt-3 text-xs text-zinc-600 transition hover:text-white"
                            >
                                + Add a completed show
                            </button>
                        ) : (
                            <div className="mt-4 space-y-2">
                                <input
                                    type="text"
                                    placeholder="Show name"
                                    value={newShowName}
                                    onChange={(e) => setNewShowName(e.target.value)}
                                    className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                                />
                                <input
                                    type="text"
                                    placeholder="Season / Year (e.g. Spring 2025)"
                                    value={newSeasonYear}
                                    onChange={(e) => setNewSeasonYear(e.target.value)}
                                    className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleAddShow}
                                        className="rounded-none bg-[#cc0000] px-4 py-1.5 text-xs text-white transition hover:bg-[#b30000]"
                                    >
                                        Submit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAddingShow(false)}
                                        className="rounded-none bg-zinc-800 px-4 py-1.5 text-xs text-zinc-400"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-xs text-zinc-600">
                                    Show submissions are reviewed by staff before appearing on your profile.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Profile content */}
            <div className="mt-10 space-y-3 px-6">
                {!editMode ? (
                    <>
                        {profile?.favorite_bands && (
                            <ProfileField label="Favorite Bands" value={profile.favorite_bands} />
                        )}
                        {profile?.first_concert && (
                            <ProfileField label="First Concert" value={profile.first_concert} />
                        )}
                        {profile?.fun_fact && (
                            <ProfileField label="Fun Fact" value={profile.fun_fact} />
                        )}
                        {profile?.spotify_url && (
                            <a
                                href={profile.spotify_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center rounded-none bg-[#111111] py-4 text-sm text-white transition hover:bg-[#1a1a1a]"
                            >
                                🎵 Open Spotify Playlist
                            </a>
                        )}
                        {profile?.apple_music_url && (
                            <a
                                href={profile.apple_music_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center rounded-none bg-[#111111] py-4 text-sm text-white transition hover:bg-[#1a1a1a]"
                            >
                                🎵 Open Apple Music Playlist
                            </a>
                        )}

                        {!hasPublishedContent && isOwnProfile && (
                            <p className="text-center text-sm text-zinc-500">
                                Your profile is empty. Click Edit Profile to add your info.
                            </p>
                        )}

                        {isOwnProfile && (
                            <button
                                type="button"
                                onClick={() => setEditMode(true)}
                                className="mt-6 rounded-none bg-zinc-800 px-4 py-2 text-sm text-white transition hover:bg-zinc-700"
                            >
                                Edit Profile
                            </button>
                        )}
                    </>
                ) : (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">
                                Favorite Bands
                            </label>
                            <input
                                type="text"
                                value={editFavBands}
                                onChange={(e) => setEditFavBands(e.target.value)}
                                className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">
                                First Concert
                            </label>
                            <input
                                type="text"
                                value={editFirstConcert}
                                onChange={(e) => setEditFirstConcert(e.target.value)}
                                className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">
                                Fun Fact
                            </label>
                            <textarea
                                rows={3}
                                value={editFunFact}
                                onChange={(e) => setEditFunFact(e.target.value)}
                                className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">
                                Spotify URL
                            </label>
                            <input
                                type="text"
                                value={editSpotify}
                                onChange={(e) => setEditSpotify(e.target.value)}
                                placeholder="https://open.spotify.com/..."
                                className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600"
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs uppercase tracking-widest text-zinc-500">
                                Apple Music URL
                            </label>
                            <input
                                type="text"
                                value={editApple}
                                onChange={(e) => setEditApple(e.target.value)}
                                className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                            />
                        </div>

                        <div className="flex items-center pt-2">
                            <button
                                type="button"
                                onClick={handleSaveProfile}
                                disabled={saving}
                                className="rounded-none bg-[#cc0000] px-4 py-2 text-sm text-white transition hover:bg-[#b30000] disabled:opacity-50"
                            >
                                {saving ? "Submitting..." : "Submit for Review"}
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditMode(false)}
                                className="ml-3 rounded-none bg-zinc-800 px-4 py-2 text-sm text-zinc-400"
                            >
                                Cancel
                            </button>
                        </div>

                        <p className="text-xs text-zinc-600">
                            Profile changes are reviewed by staff before appearing publicly.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
