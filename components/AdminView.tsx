"use client";

import Link from "next/link";

type AdminViewProps = {
    users: unknown[];
    canManageUsers: boolean;
};

export default function AdminView({ canManageUsers }: AdminViewProps) {
    return (
        <div className="min-h-screen bg-white">
            <div className="space-y-4 px-6 pb-6 pt-6">
                {/* Page header */}
                <div className="rounded-none bg-[#111111] p-5">
                    <h1
                        className="text-2xl font-bold uppercase leading-none"
                        style={{ fontFamily: "var(--font-oswald)" }}
                    >
                        <span style={{ color: "#cc0000" }}>ADMIN</span>{" "}
                        <em className="not-italic text-white">— Stage Ready</em>
                    </h1>
                    <div className="mt-2 h-0.5 w-12 bg-[#cc0000]" />
                    <p className="mt-2 text-sm text-zinc-400">
                        Manage staff access, roles, and permissions for this school.
                    </p>
                </div>

                {/* Pike13 info banner */}
                <div className="rounded-none border border-zinc-700 bg-[#1a1a1a] px-5 py-4">
                    <p className="text-sm text-zinc-300">
                        Student and family data is managed automatically via the nightly Pike13 sync.
                        To update student or family information, make changes directly in Pike13.
                    </p>
                </div>

                {/* Manage Staff */}
                {canManageUsers && (
                    <Link
                        href="/enrollment/staff"
                        className="block rounded-none border border-zinc-700 bg-[#111111] p-5 transition hover:border-[#cc0000] hover:bg-[#1a1a1a]"
                    >
                        <h3
                            className="text-base font-bold uppercase text-white"
                            style={{ fontFamily: "var(--font-oswald)" }}
                        >
                            Manage Staff
                        </h3>
                        <p className="mt-1 text-sm text-zinc-400">
                            Add and manage instructors, music directors, general managers, and owners.
                        </p>
                    </Link>
                )}
            </div>
        </div>
    );
}
