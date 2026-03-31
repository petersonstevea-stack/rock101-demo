"use client";

import { useEffect, useState } from "react";
import EnrollmentPageShell from "@/components/enrollment/EnrollmentPageShell";
import EnrollmentSelectField from "@/components/enrollment/fields/EnrollmentSelectField";
import EnrollmentSearchSelectField from "@/components/enrollment/fields/EnrollmentSearchSelectField";
import EnrollmentTextField from "@/components/enrollment/fields/EnrollmentTextField";
import {
    STAFF_ROLE_OPTIONS,
} from "@/data/reference/enrollmentOptions";
import { supabase } from "@/lib/supabaseClient";

type StaffFormValues = {
    name: string;
    email: string;
    role: string;
    school: string;
};

type StaffRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    school_slug: string;
    school_type: string | null;
    created_at: string | null;
    active: boolean;
};

const initialValues: StaffFormValues = {
    name: "",
    email: "",
    role: "",
    school: "",
};

export default function StaffEnrollmentPage() {
    const [values, setValues] = useState<StaffFormValues>(initialValues);
    const [staffList, setStaffList] = useState<StaffRow[]>([]);
    const [statusMessage, setStatusMessage] = useState("");
    const [schoolOptions, setSchoolOptions] = useState<
        { value: string; label: string }[]
    >([]);
    const [statusType, setStatusType] = useState<"success" | "error" | "idle">(
        "idle"
    );
    const [isSaving, setIsSaving] = useState(false);
    const [showInactiveStaff, setShowInactiveStaff] = useState(false);
    const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
    const [editingValues, setEditingValues] =
        useState<StaffFormValues>(initialValues);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isTogglingStaffId, setIsTogglingStaffId] = useState<string | null>(
        null
    );
    const [schoolList, setSchoolList] = useState<{ id: string; name: string }[]>([]);

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
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            return;
        }

        if (data) {
            setStaffList(data as StaffRow[]);
        }
    }

    async function loadSchools() {
        const { data, error } = await supabase
            .from("schools")
            .select("id, name")
            .eq("active", true)
            .order("name", { ascending: true });

        if (error) {
            console.error("Failed to load schools:", error);
            return;
        }

        if (data) {
            setSchoolOptions(
                data.map((s) => ({
                    value: s.id,
                    label: s.name,
                }))
            );
        }
    }

    useEffect(() => {
        loadStaff();
        loadSchools();
    }, []);

    async function handleSubmit() {
        if (
            !values.name.trim() ||
            !values.email.trim() ||
            !values.role ||
            !values.school
        ) {
            setStatusType("error");
            setStatusMessage("Please complete all required fields.");
            return;
        }

        setIsSaving(true);
        setStatusType("idle");
        setStatusMessage("");

        const payload = {
            name: values.name.trim(),
            email: values.email.trim().toLowerCase(),
            role: values.role,
            school_slug: values.school,
            school_type: null,
        };

        const { data, error } = await supabase
            .from("staff")
            .insert([payload])
            .select()
            .single();

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            setIsSaving(false);
            return;
        }

        const { error: ssrError } = await supabase
            .from("staff_school_roles")
            .insert({
                staff_id: data.id,
                school_slug: values.school,
                role: values.role,
                is_primary: true,
                active: true,
            });

        if (ssrError) {
            console.error("staff_school_roles insert failed (non-blocking):", ssrError);
        }

        const { error: userError } = await supabase
            .from("users")
            .upsert(
                {
                    name: data.name,
                    email: data.email,
                    role: data.role,
                    school_id: data.school_slug,
                },
                { onConflict: "email" }
            );

        const inviteResponse = await fetch(
            "https://qkshyyydmewegfdplhfv.supabase.co/functions/v1/invite-staff",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: data.email,
                    name: data.name,
                    role: data.role,
                    school_slug: data.school_slug,
                }),
            }
        );

        const inviteResult = await inviteResponse.json();

        if (!inviteResponse.ok) {
            setStatusType("error");
            setStatusMessage(
                `Staff saved, but invite failed: ${inviteResult.error ?? "Unknown invite error"}`
            );
            setIsSaving(false);
            return;
        }

        if (userError) {
            setStatusType("success");
            setStatusMessage(
                `Staff member saved and invite sent: ${data.name} (users sync pending)`
            );
        } else {
            setStatusType("success");
            setStatusMessage(`Staff member saved and invite sent: ${data.name}`);
        }

        setValues(initialValues);
        await loadStaff();
        setIsSaving(false);
    }

    function startEditingStaff(staff: StaffRow) {
        setEditingStaffId(staff.id);
        setEditingValues({
            name: staff.name,
            email: staff.email,
            role: staff.role,
            school: staff.school_slug,
        });
        setStatusType("idle");
        setStatusMessage("");
    }

    function cancelEditingStaff() {
        setEditingStaffId(null);
        setEditingValues(initialValues);
    }

    async function handleUpdateStaff() {
        if (!editingStaffId) {
            setStatusType("error");
            setStatusMessage("No staff member selected for editing.");
            return;
        }

        if (
            !editingValues.name.trim() ||
            !editingValues.email.trim() ||
            !editingValues.role ||
            !editingValues.school
        ) {
            setStatusType("error");
            setStatusMessage("Please complete all required edit fields.");
            return;
        }

        setIsUpdating(true);
        setStatusType("idle");
        setStatusMessage("");

        const { data, error } = await supabase
            .from("staff")
            .update({
                name: editingValues.name.trim(),
                email: editingValues.email.trim().toLowerCase(),
                role: editingValues.role,
                school_slug: editingValues.school,
                school_type: null,
            })
            .eq("id", editingStaffId)
            .select("id, name, email, role, school_slug, school_type");

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            setIsUpdating(false);
            return;
        }

        if (!data || data.length === 0) {
            setStatusType("error");
            setStatusMessage(`No staff row matched id ${editingStaffId}`);
            setIsUpdating(false);
            return;
        }

        setStaffList((prev) =>
            prev.map((staff) =>
                staff.id === editingStaffId
                    ? {
                        ...staff,
                        name: data[0].name,
                        email: data[0].email,
                        role: data[0].role,
                        school_slug: data[0].school_slug,
                        school_type: data[0].school_type,
                    }
                    : staff
            )
        );

        setStatusType("success");
        setStatusMessage(`Staff member updated: ${data[0].name}`);

        const inviteResponse = await fetch(
            "https://qkshyyydmewegfdplhfv.supabase.co/functions/v1/invite-staff",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: data[0].email,
                    name: data[0].name,
                    role: data[0].role,
                    school_slug: data[0].school_slug,
                }),
            }
        );

        const inviteResult = await inviteResponse.json();

        if (!inviteResponse.ok) {
            setStatusType("error");
            setStatusMessage(
                `Staff saved, but invite failed: ${inviteResult.error ?? "Unknown invite error"}`
            );
            setIsUpdating(false);
            return;
        }

        setIsUpdating(false);
        cancelEditingStaff();
    }

    async function handleDeleteStaff(staff: StaffRow) {
        const confirmed = confirm(
            `Are you sure you want to permanently delete ${staff.name}?`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("staff")
            .delete()
            .eq("id", staff.id);

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            return;
        }

        setStaffList((prev) =>
            prev.filter((current) => current.id !== staff.id)
        );

        setStatusType("success");
        setStatusMessage(`${staff.name} deleted`);
    }

    async function handleToggleStaffActive(staff: StaffRow) {
        setIsTogglingStaffId(staff.id);
        setStatusType("idle");
        setStatusMessage("");

        const { data, error } = await supabase
            .from("staff")
            .update({ active: !staff.active })
            .eq("id", staff.id)
            .select("id, active");

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            setIsTogglingStaffId(null);
            return;
        }

        if (!data || data.length === 0) {
            setStatusType("error");
            setStatusMessage(`No staff row matched id ${staff.id}`);
            setIsTogglingStaffId(null);
            return;
        }

        setStaffList((prev) =>
            prev.map((currentStaff) =>
                currentStaff.id === staff.id
                    ? { ...currentStaff, active: data[0].active }
                    : currentStaff
            )
        );

        setStatusType("success");
        setStatusMessage(
            `${staff.name} is now ${data[0].active ? "active" : "inactive"}.`
        );
        setIsTogglingStaffId(null);
    }

    async function handleResendInvite(staff: StaffRow) {
        setStatusType("success");
        setStatusMessage(`Sending invite to ${staff.name}...`);

        try {
            const inviteResponse = await fetch(
                "https://qkshyyydmewegfdplhfv.supabase.co/functions/v1/invite-staff",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: staff.email,
                        name: staff.name,
                        role: staff.role,
                        school_slug: staff.school_slug,
                    }),
                }
            );

            const inviteResult = await inviteResponse.json();

            if (!inviteResponse.ok) {
                setStatusType("error");
                setStatusMessage(
                    `Invite failed for ${staff.name}: ${inviteResult.error ?? "Unknown invite error"}`
                );
                return;
            }

            setStatusType("success");
            setStatusMessage(`Invite sent to ${staff.name}`);
        } catch (error) {
            console.error("Invite request crashed:", error);
            setStatusType("error");
            setStatusMessage(`Invite request crashed for ${staff.name}`);
        }
    }

    return (
        <EnrollmentPageShell
            title="Staff Management"
            description="Add and manage staff members across your schools."
        >
            {statusMessage && (
                <div
                    className={
                        statusType === "success"
                            ? "rounded-none border border-green-500/20 bg-green-500/10 p-4"
                            : "rounded-none border border-[#cc0000]/20 bg-[#cc0000]/10 p-4"
                    }
                >
                    <p className="text-sm">{statusMessage}</p>
                </div>
            )}

            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-white">Staff Enrollment</h2>
                    <p className="text-sm text-white/70">
                        Create staff records using controlled values so school, role, and
                        permissions stay clean and consistent.
                    </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <EnrollmentTextField
                        id="staff-name"
                        label="Full Name"
                        value={values.name}
                        onChange={(value) =>
                            setValues((current) => ({ ...current, name: value }))
                        }
                        placeholder="Enter full name"
                        required
                        disabled={isSaving}
                    />

                    <EnrollmentTextField
                        id="staff-email"
                        label="Email"
                        value={values.email}
                        onChange={(value) =>
                            setValues((current) => ({ ...current, email: value }))
                        }
                        placeholder="Enter email address"
                        required
                        disabled={isSaving}
                        type="email"
                        helperText="This email will be used for login later."
                    />

                    <EnrollmentSelectField
                        id="staff-role"
                        label="Role"
                        value={values.role}
                        onChange={(value) =>
                            setValues((current) => ({ ...current, role: value }))
                        }
                        options={STAFF_ROLE_OPTIONS}
                        placeholder="Select role"
                        required
                        disabled={isSaving}
                    />

                    <EnrollmentSearchSelectField
                        id="staff-school"
                        label="Assigned School"
                        value={values.school}
                        onChange={(value) =>
                            setValues((current) => ({ ...current, school: value }))
                        }
                        options={schoolOptions}
                        placeholder="Search school..."
                        required
                        disabled={isSaving}
                    />
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="rounded-none bg-[#cc0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#b30000] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Staff"}
                    </button>
                </div>
            </div>

            {editingStaffId && (
                <div className="rounded-none border border-amber-500/20 bg-amber-500/10 p-6">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold text-white">Edit Staff</h2>
                        <p className="mt-1 text-sm text-white/70">
                            Update name, email, role, and assigned school.
                        </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <EnrollmentTextField
                            id="edit-staff-name"
                            label="Full Name"
                            value={editingValues.name}
                            onChange={(value) =>
                                setEditingValues((current) => ({ ...current, name: value }))
                            }
                            placeholder="Enter full name"
                            required
                            disabled={isUpdating}
                        />

                        <EnrollmentTextField
                            id="edit-staff-email"
                            label="Email"
                            value={editingValues.email}
                            onChange={(value) =>
                                setEditingValues((current) => ({ ...current, email: value }))
                            }
                            placeholder="Enter email address"
                            required
                            disabled={isUpdating}
                            type="email"
                        />

                        <EnrollmentSelectField
                            id="edit-staff-role"
                            label="Role"
                            value={editingValues.role}
                            onChange={(value) =>
                                setEditingValues((current) => ({ ...current, role: value }))
                            }
                            options={STAFF_ROLE_OPTIONS}
                            placeholder="Select role"
                            required
                            disabled={isUpdating}
                        />

                        <EnrollmentSearchSelectField
                            id="edit-staff-school"
                            label="Assigned School"
                            value={editingValues.school}
                            onChange={(value) =>
                                setEditingValues((current) => ({ ...current, school: value }))
                            }
                            options={schoolOptions}
                            placeholder="Search school..."
                            required
                            disabled={isUpdating}
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={cancelEditingStaff}
                            className="rounded-none border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
                        >
                            Cancel Edit
                        </button>

                        <button
                            type="button"
                            onClick={handleUpdateStaff}
                            disabled={isUpdating}
                            className="rounded-none bg-[#cc0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#b30000] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isUpdating ? "Saving..." : "Save Staff Changes"}
                        </button>
                    </div>
                </div>
            )}

            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-lg font-semibold text-white">Staff Directory</h2>
                <button
                    type="button"
                    onClick={() => setShowInactiveStaff((prev) => !prev)}
                    className="mt-2 rounded-none bg-zinc-800 px-3 py-2 text-sm text-white transition hover:bg-zinc-700"
                >
                    {showInactiveStaff ? "Hide Inactive Staff" : "Show Inactive Staff"}
                </button>

                <div className="mt-4 space-y-3">
                    {staffList.length === 0 ? (
                        <p className="text-sm text-white/50">No staff yet.</p>
                    ) : (
                        staffList
                            .filter((staff) => showInactiveStaff || staff.active)
                            .map((staff) => (
                                <div
                                    key={staff.id}
                                    className="rounded-none border border-zinc-800 bg-zinc-950 p-4"
                                >
                                    <p className="font-semibold text-white">{staff.name}</p>
                                    <p className="text-xs text-white/60">{staff.email}</p>
                                    <p className="text-xs text-white/40">
                                        {staff.role} • {schoolList.find((s) => s.id === staff.school_slug)?.name ?? staff.school_slug}
                                    </p>

                                    <p className="mt-2 text-xs">
                                        {staff.active ? (
                                            <span className="text-green-400">Active</span>
                                        ) : (
                                            <span className="text-[#cc0000]">Inactive</span>
                                        )}
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => startEditingStaff(staff)}
                                            className="rounded-none bg-zinc-800 px-3 py-2 text-sm text-white transition hover:bg-zinc-700"
                                        >
                                            Edit Staff
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleResendInvite(staff)}
                                            className="rounded-none bg-[#cc0000] px-3 py-2 text-sm text-white transition hover:bg-[#b30000]"
                                        >
                                            Send Invite
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleStaffActive(staff)}
                                            disabled={isTogglingStaffId === staff.id}
                                            className="rounded-none bg-zinc-950 px-3 py-2 text-sm text-white transition hover:bg-zinc-800 disabled:opacity-50"
                                        >
                                            {isTogglingStaffId === staff.id
                                                ? "Updating..."
                                                : staff.active
                                                    ? "Deactivate"
                                                    : "Activate"}
                                        </button>

                                        {!staff.active && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteStaff(staff)}
                                                className="rounded-none bg-zinc-700 px-3 py-2 text-sm text-white transition hover:bg-zinc-600"
                                            >
                                                Delete Staff
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>
        </EnrollmentPageShell>
    );
}