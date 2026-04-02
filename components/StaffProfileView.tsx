"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { INSTRUMENT_OPTIONS } from "@/data/reference/enrollmentOptions";

const WALLPAPER_PRESETS: { value: string; label: string; url: string }[] = [
    { value: "band", label: "Band", url: "/images/rock101-band.jpg" },
    { value: "stage", label: "Stage", url: "/images/rock101-band.jpg" },
    { value: "drums", label: "Drums", url: "/images/rock101-band.jpg" },
    { value: "guitar", label: "Guitar", url: "/images/rock101-band.jpg" },
];

const DEFAULT_WALLPAPER = "/images/rock101-band.jpg";

type StaffProfile = {
    id: string;
    name: string;
    email: string;
    role: string | null;
    bio: string | null;
    teaching_philosophy: string | null;
    instruments: string[] | null;
    fav_song_to_teach: string | null;
    fav_artist: string | null;
    first_concert: string | null;
    currently_obsessed: string | null;
    fun_fact: string | null;
    profile_photo_url: string | null;
    profile_wallpaper_url: string | null;
    profile_wallpaper_preset: string | null;
    profile_show_wallpaper: boolean;
    profile_show_photo: boolean;
    profile_show_personal: boolean;
    profile_visible: boolean;
};

type StaffProfileViewProps = {
    staffId: string;
    currentUserStaffId: string;
    currentUserRole: string;
    schoolId: string;
};

function roleLabel(role: string | null): string {
    switch (role) {
        case "owner": return "Owner";
        case "general_manager": return "General Manager";
        case "music_director": return "Music Director";
        case "instructor": return "Instructor";
        default: return role ?? "Staff";
    }
}

export default function StaffProfileView({
    staffId,
    currentUserStaffId,
    currentUserRole,
    schoolId: _schoolId,
}: StaffProfileViewProps) {
    const [profile, setProfile] = useState<StaffProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Edit form state
    const [editBio, setEditBio] = useState("");
    const [editPhilosophy, setEditPhilosophy] = useState("");
    const [editInstruments, setEditInstruments] = useState<string[]>([]);
    const [editFavSong, setEditFavSong] = useState("");
    const [editFavArtist, setEditFavArtist] = useState("");
    const [editFirstConcert, setEditFirstConcert] = useState("");
    const [editObsessed, setEditObsessed] = useState("");
    const [editFunFact, setEditFunFact] = useState("");
    const [editWallpaperPreset, setEditWallpaperPreset] = useState("band");
    const [editPhotoUrl, setEditPhotoUrl] = useState("");

    const isOwnProfile = staffId === currentUserStaffId;
    const isManagement = currentUserRole === "owner" || currentUserRole === "general_manager";

    useEffect(() => {
        if (!staffId) return;
        async function load() {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from("staff")
                .select(
                    "id, name, email, role, bio, teaching_philosophy, instruments, " +
                    "fav_song_to_teach, fav_artist, first_concert, currently_obsessed, fun_fact, " +
                    "profile_photo_url, profile_wallpaper_url, profile_wallpaper_preset, " +
                    "profile_show_wallpaper, profile_show_photo, profile_show_personal, profile_visible"
                )
                .eq("id", staffId)
                .maybeSingle();

            if (error) {
                setError(error.message);
                setLoading(false);
                return;
            }

            const p = data as StaffProfile | null;
            setProfile(p);
            if (p) {
                setEditBio(p.bio ?? "");
                setEditPhilosophy(p.teaching_philosophy ?? "");
                setEditInstruments(p.instruments ?? []);
                setEditFavSong(p.fav_song_to_teach ?? "");
                setEditFavArtist(p.fav_artist ?? "");
                setEditFirstConcert(p.first_concert ?? "");
                setEditObsessed(p.currently_obsessed ?? "");
                setEditFunFact(p.fun_fact ?? "");
                setEditWallpaperPreset(p.profile_wallpaper_preset ?? "band");
                setEditPhotoUrl(p.profile_photo_url ?? "");
            }
            setLoading(false);
        }
        load();
    }, [staffId]);

    async function handleSaveProfile() {
        if (!profile) return;
        setSaving(true);
        const presetUrl = WALLPAPER_PRESETS.find((w) => w.value === editWallpaperPreset)?.url ?? DEFAULT_WALLPAPER;
        const { error } = await supabase
            .from("staff")
            .update({
                bio: editBio.trim() || null,
                teaching_philosophy: editPhilosophy.trim() || null,
                instruments: editInstruments,
                fav_song_to_teach: editFavSong.trim() || null,
                fav_artist: editFavArtist.trim() || null,
                first_concert: editFirstConcert.trim() || null,
                currently_obsessed: editObsessed.trim() || null,
                fun_fact: editFunFact.trim() || null,
                profile_wallpaper_preset: editWallpaperPreset,
                profile_wallpaper_url: presetUrl,
                profile_photo_url: editPhotoUrl.trim() || null,
            })
            .eq("id", profile.id);

        setSaving(false);
        if (error) {
            alert("Save failed: " + error.message);
            return;
        }
        setProfile((prev) =>
            prev
                ? {
                    ...prev,
                    bio: editBio.trim() || null,
                    teaching_philosophy: editPhilosophy.trim() || null,
                    instruments: editInstruments,
                    fav_song_to_teach: editFavSong.trim() || null,
                    fav_artist: editFavArtist.trim() || null,
                    first_concert: editFirstConcert.trim() || null,
                    currently_obsessed: editObsessed.trim() || null,
                    fun_fact: editFunFact.trim() || null,
                    profile_wallpaper_preset: editWallpaperPreset,
                    profile_wallpaper_url: presetUrl,
                    profile_photo_url: editPhotoUrl.trim() || null,
                }
                : prev
        );
        setEditing(false);
    }

    async function handleToggle(field: keyof Pick<StaffProfile, "profile_visible" | "profile_show_photo" | "profile_show_personal" | "profile_show_wallpaper">, value: boolean) {
        if (!profile) return;
        const { error } = await supabase
            .from("staff")
            .update({ [field]: value })
            .eq("id", profile.id);
        if (error) {
            alert("Update failed: " + error.message);
            return;
        }
        setProfile((prev) => prev ? { ...prev, [field]: value } : prev);
    }

    function toggleInstrument(val: string) {
        setEditInstruments((prev) =>
            prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
        );
    }

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-zinc-400 text-sm">Loading profile...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="text-sm" style={{ color: "#cc0000" }}>Error: {error}</div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="p-6">
                <div className="text-zinc-400 text-sm">Profile not found.</div>
            </div>
        );
    }

    const wallpaperUrl =
        profile.profile_show_wallpaper && profile.profile_wallpaper_url
            ? profile.profile_wallpaper_url
            : DEFAULT_WALLPAPER;

    const instruments = profile.instruments ?? [];

    return (
        <div className="space-y-6 overflow-x-hidden">

            {/* SECTION 1 — HERO BANNER */}
            <div
                className="relative w-full"
                style={{ minHeight: 220 }}
            >
                <img
                    src={wallpaperUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: "grayscale(20%)" }}
                />
                <div className="absolute inset-0 bg-black/60" />
                <div className="relative z-10 flex items-end gap-5 px-6 py-8" style={{ minHeight: 220 }}>
                    {profile.profile_show_photo && profile.profile_photo_url && (
                        <img
                            src={profile.profile_photo_url}
                            alt={profile.name}
                            className="shrink-0 rounded-full object-cover border-2 border-white"
                            style={{ width: 80, height: 80 }}
                        />
                    )}
                    <div>
                        <h1 className="sor-display text-4xl md:text-5xl leading-none text-white font-bold uppercase">
                            {profile.name}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-none bg-white px-2 py-0.5 text-xs font-semibold text-black uppercase tracking-wider">
                                {roleLabel(profile.role)}
                            </span>
                            {instruments.map((inst) => (
                                <span
                                    key={inst}
                                    className="rounded-none px-2 py-0.5 text-xs font-semibold text-white uppercase tracking-wider"
                                    style={{ backgroundColor: "#cc0000" }}
                                >
                                    {inst}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">

                {/* SECTION 2 — ABOUT */}
                <div className="bg-[#111111] rounded-none p-5">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <h2 className="sor-display text-3xl md:text-4xl leading-none">
                            <span style={{ color: "#cc0000" }}>ABOUT</span>
                            <span className="ml-2 text-white italic normal-case">{profile.name.split(" ")[0]}</span>
                        </h2>
                        {isOwnProfile && !editing && (
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="rounded-none bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
                            >
                                Edit Profile
                            </button>
                        )}
                    </div>
                    <div className="sor-divider" />

                    {editing ? (
                        /* EDIT FORM */
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">Teaching Philosophy</label>
                                <textarea
                                    value={editPhilosophy}
                                    onChange={(e) => setEditPhilosophy(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none"
                                    placeholder="Your teaching philosophy..."
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">Bio / About Me</label>
                                <textarea
                                    value={editBio}
                                    onChange={(e) => setEditBio(e.target.value)}
                                    rows={4}
                                    className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none"
                                    placeholder="Tell students and parents about yourself..."
                                />
                            </div>
                            <div>
                                <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-2">Instruments</label>
                                <div className="flex flex-wrap gap-3">
                                    {INSTRUMENT_OPTIONS.map((opt) => (
                                        <label key={opt.value} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editInstruments.includes(opt.value)}
                                                onChange={() => toggleInstrument(opt.value)}
                                            />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">🎵 Favorite song to teach</label>
                                    <input type="text" value={editFavSong} onChange={(e) => setEditFavSong(e.target.value)} className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">🎤 Favorite artist</label>
                                    <input type="text" value={editFavArtist} onChange={(e) => setEditFavArtist(e.target.value)} className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">🎸 First concert</label>
                                    <input type="text" value={editFirstConcert} onChange={(e) => setEditFirstConcert(e.target.value)} className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">📻 Currently obsessed with</label>
                                    <input type="text" value={editObsessed} onChange={(e) => setEditObsessed(e.target.value)} className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">💡 Fun fact</label>
                                    <input type="text" value={editFunFact} onChange={(e) => setEditFunFact(e.target.value)} className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">Wallpaper</label>
                                    <select
                                        value={editWallpaperPreset}
                                        onChange={(e) => setEditWallpaperPreset(e.target.value)}
                                        className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none"
                                    >
                                        {WALLPAPER_PRESETS.map((w) => (
                                            <option key={w.value} value={w.value}>{w.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-zinc-400 text-xs uppercase tracking-wider mb-1">Photo URL</label>
                                    <input type="text" value={editPhotoUrl} onChange={(e) => setEditPhotoUrl(e.target.value)} placeholder="https://..." className="w-full rounded-none bg-zinc-800 px-3 py-2 text-sm text-white border border-zinc-700 focus:border-[#cc0000] outline-none" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleSaveProfile}
                                    disabled={saving}
                                    className="rounded-none bg-[#cc0000] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#b30000] disabled:opacity-50"
                                >
                                    {saving ? "Saving..." : "Save Profile"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditing(false)}
                                    className="rounded-none bg-zinc-700 px-5 py-2.5 text-sm text-white hover:bg-zinc-600"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* READ MODE */
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left — philosophy + bio */}
                            <div className="space-y-4">
                                {profile.teaching_philosophy && (
                                    <div>
                                        <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">Teaching Philosophy</div>
                                        <p className="text-zinc-300 text-sm italic leading-relaxed border-l-2 border-l-[#cc0000] pl-3">
                                            {profile.teaching_philosophy}
                                        </p>
                                    </div>
                                )}
                                {profile.bio && (
                                    <div>
                                        <div className="text-zinc-500 text-xs uppercase tracking-wider mb-1">About</div>
                                        <p className="text-zinc-300 text-sm leading-relaxed">{profile.bio}</p>
                                    </div>
                                )}
                                {!profile.teaching_philosophy && !profile.bio && (
                                    <p className="text-zinc-500 text-sm italic">No bio added yet.</p>
                                )}
                            </div>

                            {/* Right — personal cards */}
                            {profile.profile_show_personal && (
                                <div className="space-y-2">
                                    {[
                                        { emoji: "🎵", label: "Favorite song to teach", value: profile.fav_song_to_teach },
                                        { emoji: "🎤", label: "Favorite artist", value: profile.fav_artist },
                                        { emoji: "🎸", label: "First concert", value: profile.first_concert },
                                        { emoji: "📻", label: "Currently obsessed with", value: profile.currently_obsessed },
                                        { emoji: "💡", label: "Fun fact", value: profile.fun_fact },
                                    ]
                                        .filter((item) => item.value)
                                        .map((item) => (
                                            <div
                                                key={item.label}
                                                className="bg-[#1a1a1a] rounded-none px-4 py-3"
                                                style={{ borderLeft: "3px solid #cc0000" }}
                                            >
                                                <div className="text-zinc-500 text-xs mb-0.5">
                                                    {item.emoji} {item.label}
                                                </div>
                                                <div className="text-white text-sm">{item.value}</div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* SECTION 3 — MANAGEMENT CONTROLS */}
                {isManagement && (
                    <div className="bg-[#111111] rounded-none p-5">
                        <h2 className="sor-display text-3xl md:text-4xl leading-none">
                            <span style={{ color: "#cc0000" }}>PROFILE</span>
                            <span className="ml-2 text-white italic normal-case">Controls</span>
                        </h2>
                        <div className="sor-divider" />
                        <div className="mt-4 space-y-3">
                            {(
                                [
                                    { field: "profile_visible" as const, label: "Profile visible to parents" },
                                    { field: "profile_show_photo" as const, label: "Show photo" },
                                    { field: "profile_show_personal" as const, label: "Show personal details" },
                                    { field: "profile_show_wallpaper" as const, label: "Show wallpaper" },
                                ] as const
                            ).map(({ field, label }) => (
                                <div key={field} className="flex items-center justify-between bg-[#1a1a1a] px-4 py-3">
                                    <span className="text-white text-sm">{label}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleToggle(field, !profile[field])}
                                        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
                                            profile[field] ? "bg-[#cc0000]" : "bg-zinc-600"
                                        }`}
                                        role="switch"
                                        aria-checked={profile[field]}
                                    >
                                        <span
                                            className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5"
                                            style={{ transform: profile[field] ? "translateX(22px)" : "translateX(2px)" }}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
