"use client";

import { useState } from "react";
import { Star, Music, Headphones, User } from "lucide-react";
import MyCastingView from "@/components/MyCastingView";
import PPPrivateLessonView from "@/components/PPPrivateLessonView";

type PerformanceProgramShellProps = {
    studentName: string;
    studentId: string;
    schoolId: string;
    schoolName: string;
    onSignOut: () => void;
    onSwitchStudent?: () => void;
};

type ActiveTab = "casting" | "show" | "lesson" | "profile";

export default function PerformanceProgramShell({
    studentName,
    studentId,
    schoolId,
    schoolName,
    onSignOut,
    onSwitchStudent,
}: PerformanceProgramShellProps) {
    const [activeTab, setActiveTab] = useState<ActiveTab>("casting");

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
                            <p className="text-sm text-zinc-500">
                                Your show group details will appear here.
                            </p>
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
