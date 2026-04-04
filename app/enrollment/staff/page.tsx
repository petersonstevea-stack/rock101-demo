"use client";

import { useEffect, useState } from "react";
import EnrollmentPageShell from "@/components/enrollment/EnrollmentPageShell";
import { supabase } from "@/lib/supabaseClient";

const ROLE_OPTIONS = [
    { value: "instructor", label: "Instructor" },
    { value: "music_director", label: "Music Director" },
    { value: "general_manager", label: "General Manager" },
    { value: "owner", label: "Owner" },
];

// Flattened display row — role and school_slug come from staff_school_roles
type StaffDisplayRow = {
    id: string;
    name: string;
    email: string;
    active: boolean;
    ssrRole: string;      // staff_school_roles.role — source of truth for access control
    schoolSlug: string;   // staff_school_roles.school_slug — needed for SSR update
};

export default function StaffEnrollmentPage() {
    const [staffList, setStaffList] = useState<StaffDisplayRow[]>([]);
    const [schoolList, setSchoolList] = useState<{ id: string; name: string }[]>([]);
    const [showInactiveStaff, setShowInactiveStaff] = useState(false);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState<"success" | "error" | "idle">("idle");
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        supabase
            .from("schools")
            .select("id, name")
            .eq("is_sandbox", false)
            .order("name")
            .then(({ data }) => {
                if (data) setSchoolList(data);
            });
    }, []);

    async function loadStaff() {
        const { data, error } = await supabase
            .from("staff")
            .select("id, name, email, active, staff_school_roles(role, school_slug, active)")
            .order("name", { ascending: true });

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            return;
        }

        if (data) {
            // Flatten: one row per staff, using the primary SSR entry for role/school_slug
            const rows: StaffDisplayRow[] = data.map((s) => {
                const ssrEntries = (s.staff_school_roles ?? []) as {
                    role: string;
                    school_slug: string;
                    active: boolean;
                }[];
                const primarySsr = ssrEntries[0];
                return {
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    active: s.active,
                    ssrRole: primarySsr?.role ?? "instructor",
                    schoolSlug: primarySsr?.school_slug ?? "",
                };
            });
            setStaffList(rows);
        }
    }

    useEffect(() => {
        loadStaff();
    }, []);

    async function handleRoleChange(staff: StaffDisplayRow, newRole: string) {
        setUpdatingId(staff.id);
        setStatusType("idle");
        setStatusMessage("");

        // 1. Update staff.role (legacy column, kept in sync)
        const { error: staffError } = await supabase
            .from("staff")
            .update({ role: newRole })
            .eq("id", staff.id);

        if (staffError) {
            setStatusType("error");
            setStatusMessage(`Failed to update role for ${staff.name}: ${staffError.message}`);
            setUpdatingId(null);
            return;
        }

        // 2. Update staff_school_roles.role (source of truth for access control)
        const { error: ssrError } = await supabase
            .from("staff_school_roles")
            .update({ role: newRole })
            .eq("staff_id", staff.id)
            .eq("school_slug", staff.schoolSlug);

        if (ssrError) {
            setStatusType("error");
            setStatusMessage(`Role saved on staff, but staff_school_roles update failed for ${staff.name}: ${ssrError.message}`);
            setUpdatingId(null);
            return;
        }

        setStaffList((prev) =>
            prev.map((s) => (s.id === staff.id ? { ...s, ssrRole: newRole } : s))
        );

        setStatusType("success");
        setStatusMessage(
            `${staff.name} updated to ${ROLE_OPTIONS.find((r) => r.value === newRole)?.label ?? newRole}`
        );
        setUpdatingId(null);
    }

    async function handleToggleActive(staff: StaffDisplayRow) {
        setUpdatingId(staff.id);
        setStatusType("idle");
        setStatusMessage("");

        const { data, error } = await supabase
            .from("staff")
            .update({ active: !staff.active })
            .eq("id", staff.id)
            .select("id, active")
            .single();

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            setUpdatingId(null);
            return;
        }

        setStaffList((prev) =>
            prev.map((s) => (s.id === staff.id ? { ...s, active: data.active } : s))
        );

        setStatusType("success");
        setStatusMessage(`${staff.name} is now ${data.active ? "active" : "inactive"}.`);
        setUpdatingId(null);
    }

    const visibleStaff = staffList.filter((s) => showInactiveStaff || s.active);

    return (
        <EnrollmentPageShell
            title="Manage Staff"
            description="Promote staff to the appropriate role for their school."
        >
            {/* Info banner */}
            <div className="rounded-none border border-zinc-700 bg-[#1a1a1a] px-5 py-4">
                <p className="text-sm text-zinc-300">
                    Staff are added automatically via the nightly Pike13 sync and default to the
                    Instructor role. Use this page to promote staff to Music Director, General
                    Manager, or Owner.
                </p>
            </div>

            {/* Page header */}
            <div className="rounded-none bg-[#111111] p-5">
                <h1
                    className="text-2xl font-bold uppercase leading-none"
                    style={{ fontFamily: "var(--font-oswald)" }}
                >
                    <span style={{ color: "#cc0000" }}>MANAGE</span>{" "}
                    <em className="not-italic text-white">Staff</em>
                </h1>
                <div className="mt-2 h-0.5 w-12 bg-[#cc0000]" />
            </div>

            {/* Status message */}
            {statusMessage && (
                <div
                    className={
                        statusType === "success"
                            ? "rounded-none border border-green-500/20 bg-green-500/10 p-4"
                            : "rounded-none border border-[#cc0000]/20 bg-[#cc0000]/10 p-4"
                    }
                >
                    <p className="text-sm text-white">{statusMessage}</p>
                </div>
            )}

            {/* Staff directory */}
            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Staff Directory</h2>
                    <button
                        type="button"
                        onClick={() => setShowInactiveStaff((prev) => !prev)}
                        className="rounded-none bg-zinc-800 px-3 py-2 text-sm text-white transition hover:bg-zinc-700"
                    >
                        {showInactiveStaff ? "Hide Inactive" : "Show Inactive"}
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    {visibleStaff.length === 0 ? (
                        <p className="text-sm text-white/50">No staff found.</p>
                    ) : (
                        visibleStaff.map((staff) => (
                            <div
                                key={staff.id}
                                className="rounded-none border border-zinc-800 bg-zinc-950 p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-white">{staff.name}</p>
                                        <p className="text-xs text-white/60">{staff.email}</p>
                                        <p className="text-xs text-white/40">
                                            {schoolList.find((s) => s.id === staff.schoolSlug)?.name ?? staff.schoolSlug}
                                        </p>
                                        <p className="mt-1 text-xs">
                                            {staff.active ? (
                                                <span className="text-green-400">Active</span>
                                            ) : (
                                                <span className="text-[#cc0000]">Inactive</span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <select
                                            value={staff.ssrRole}
                                            disabled={updatingId === staff.id}
                                            onChange={(e) => handleRoleChange(staff, e.target.value)}
                                            className="rounded-none border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition hover:border-zinc-500 disabled:opacity-50"
                                        >
                                            {ROLE_OPTIONS.map((opt) => (
                                                <option key={opt.value} value={opt.value} style={{ backgroundColor: "#18181b" }}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleActive(staff)}
                                            disabled={updatingId === staff.id}
                                            className="rounded-none bg-zinc-800 px-3 py-2 text-sm text-white transition hover:bg-zinc-700 disabled:opacity-50"
                                        >
                                            {updatingId === staff.id
                                                ? "Updating..."
                                                : staff.active
                                                ? "Deactivate"
                                                : "Activate"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </EnrollmentPageShell>
    );
}
