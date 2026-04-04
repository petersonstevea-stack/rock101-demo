"use client";

import { useState, useEffect } from "react";
import { Star, Music, Headphones, User } from "lucide-react";
import MyCastingView from "@/components/MyCastingView";
import PPPrivateLessonView from "@/components/PPPrivateLessonView";
import { supabase } from "@/lib/supabaseClient";

type PerformanceProgramShellProps = {
    studentName: string;
    studentId: string;
    schoolId: string;
    schoolName: string;
    onSignOut: () => void;
    onSwitchStudent?: () => void;
};

type ActiveTab = "casting" | "show" | "lesson" | "profile";

type ShowGroupInfo = {
    id: string;
    name: string;
    staffNames: string[];
    className: string | null;
    showDate: string | null;
    themeType: string | null;
    upcomingSessions: {
        date: string;
        status: string;
    }[];
};

export default function PerformanceProgramShell({
    studentName,
    studentId,
    schoolId,
    schoolName,
    onSignOut,
    onSwitchStudent,
}: PerformanceProgramShellProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>("casting");
    const [showGroup, setShowGroup] = useState<ShowGroupInfo | null>(null);
    const [showGroupLoading, setShowGroupLoading] = useState(false);

    useEffect(() => {
        async function loadShowGroup() {
            setShowGroupLoading(true);

            const { data: membership } = await supabase
                .from("show_group_student_memberships")
                .select(`
                    show_group_instance_id,
                    show_group_instances (
                        id, name, show_date, rock_class_id,
                        rock_classes (
                            name, staff_names,
                            class_sessions (
                                session_date, status
                            )
                        )
                    )
                `)
                .eq("student_id", studentId)
                .eq("status", "active")
                .maybeSingle();

            if (membership?.show_group_instances) {
                const sgi = membership.show_group_instances as any;
                const rc = sgi.rock_classes;

                console.log('staffNames result:', rc?.staff_names, 'rock_class_id:', sgi.rock_class_id);

                let staffNames: string[] = rc?.staff_names ?? [];

                if (sgi.rock_class_id) {
                    const { data: rcRow } = await supabase
                        .from("rock_classes")
                        .select("staff_names")
                        .eq("id", sgi.rock_class_id)
                        .maybeSingle();
                    staffNames = (rcRow?.staff_names ?? []) as string[];
                }

                const today = new Date().toISOString().split("T")[0];
                const sessions = (rc?.class_sessions ?? [])
                    .filter((s: any) => s.session_date >= today)
                    .sort((a: any, b: any) =>
                        a.session_date.localeCompare(b.session_date)
                    )
                    .slice(0, 6)
                    .map((s: any) => ({
                        date: s.session_date,
                        status: s.status ?? "scheduled",
                    }));

                setShowGroup({
                    id: sgi.id,
                    name: sgi.name,
                    staffNames,
                    className: rc?.name ?? null,
                    showDate: sgi.show_date ?? null,
                    themeType: null,
                    upcomingSessions: sessions,
                });
            }

            setShowGroupLoading(false);
        }

        loadShowGroup();
    }, [studentId]);

    const navItems: { tab: ActiveTab; label: string; icon: React.ReactNode }[] = [
        { tab: "casting", label: "My Casting", icon: <Star size={16} /> },
        { tab: "show", label: "My Show", icon: <Music size={16} /> },
        { tab: "lesson", label: "Private Lesson", icon: <Headphones size={16} /> },
        { tab: "profile", label: "Student Profile", icon: <User size={16} /> },
    ];

    return (
        <div className="flex min-h-screen bg-black">
            {/* Sidebar */}
            <div className="flex w-48 shrink-0 flex-col bg-black" style={{ minHeight: "100vh" }}>
                {/* Logo */}
                <div className="px-4 pt-6 pb-4">
                    <img src="/Icons-Red-11.png" alt="Stage Ready" className="w-32 object-contain" />
                </div>

                {/* Student name */}
                <div className="px-4 pb-4">
                    <p className="text-xs text-zinc-500">Student</p>
                    <p className="text-sm font-semibold text-white">{studentName}</p>
                </div>

                {/* Nav */}
                <nav className="flex flex-col">
                    {navItems.map(({ tab, label, icon }) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`flex w-full items-center gap-2 rounded-none px-4 py-3 text-left text-sm transition ${
                                activeTab === tab
                                    ? "bg-[#cc0000] text-white"
                                    : "text-zinc-400 hover:bg-[#1a1a1a] hover:text-white"
                            }`}
                        >
                            {icon}
                            {label}
                        </button>
                    ))}
                </nav>

                {/* Spacer + Switch Student + Sign Out */}
                <div className="flex flex-1 flex-col justify-end pb-4">
                    {onSwitchStudent && (
                        <button
                            type="button"
                            onClick={onSwitchStudent}
                            className="w-full rounded-none px-4 py-3 text-left text-xs text-zinc-400 transition hover:text-white"
                        >
                            ← Switch Student
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onSignOut}
                        className="w-full rounded-none px-4 py-3 text-left text-xs text-zinc-600 transition hover:text-white"
                    >
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 overflow-y-auto bg-black">
                {/* Hero */}
                <div className="px-6 py-12 text-center">
                    <p className="text-xs uppercase tracking-widest text-zinc-500">Stage Ready</p>
                    <h1
                        className="mt-2 text-4xl font-bold uppercase text-white"
                        style={{ fontFamily: "var(--font-oswald)" }}
                    >
                        STAGE READY
                    </h1>
                    <p className="mt-1 text-sm text-zinc-400">Performance Program</p>
                    <p className="mt-3 text-lg font-semibold text-white">{studentName}</p>
                </div>

                {/* Tab content */}
                <div className="pb-12">
                    {activeTab === "casting" && (
                        <MyCastingView
                            currentUser={null}
                            schoolId={schoolId}
                            schoolName={schoolName}
                        />
                    )}

                    {activeTab === "show" && (
                        <div className="px-6">
                            {showGroupLoading ? (
                                <p className="text-sm text-zinc-500">Loading...</p>
                            ) : !showGroup ? (
                                <p className="text-sm text-zinc-500">
                                    You are not currently enrolled in a show group.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {/* Show group name */}
                                    <div className="rounded-none bg-[#111111] p-5">
                                        <p className="text-xs uppercase tracking-widest text-zinc-500">Show Group</p>
                                        <p className="mt-1 text-lg font-semibold text-white">{showGroup.name}</p>
                                    </div>

                                    {/* Instructors */}
                                    {showGroup.staffNames.length > 0 && (
                                        <div className="rounded-none bg-[#111111] p-5">
                                            <p className="text-xs uppercase tracking-widest text-zinc-500">Instructors</p>
                                            <p className="mt-1 text-sm text-white">
                                                {showGroup.staffNames.join(" · ")}
                                            </p>
                                        </div>
                                    )}

                                    {/* Show date */}
                                    {showGroup.showDate && (
                                        <div className="rounded-none bg-[#111111] p-5">
                                            <p className="text-xs uppercase tracking-widest text-zinc-500">Performance Date</p>
                                            <p className="mt-1 text-sm text-white">
                                                {new Date(showGroup.showDate + "T12:00:00").toLocaleDateString("en-US", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    )}

                                    {/* Upcoming rehearsals */}
                                    {showGroup.upcomingSessions.length > 0 && (
                                        <div className="rounded-none bg-[#111111] p-5">
                                            <p className="text-xs uppercase tracking-widest text-zinc-500">
                                                Upcoming Rehearsals
                                            </p>
                                            <div className="mt-3 space-y-2">
                                                {showGroup.upcomingSessions.map((session, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between rounded-none bg-[#1a1a1a] px-4 py-3"
                                                    >
                                                        <p className="text-sm text-white">
                                                            {new Date(session.date).toLocaleDateString("en-US", {
                                                                weekday: "short",
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </p>
                                                        <span className="text-xs text-zinc-500 capitalize">
                                                            {session.status}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "lesson" && (
                        <PPPrivateLessonView
                            studentId={studentId}
                            studentName={studentName}
                            instrument=""
                            schoolId={schoolId}
                            instructorName=""
                        />
                    )}

                    {activeTab === "profile" && (
                        <div className="px-6">
                            <p className="text-sm text-zinc-500">
                                Student profile coming soon.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
