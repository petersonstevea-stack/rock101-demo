import { supabase } from "@/lib/supabaseClient";
import { AppUser } from "@/types/user";

const TAB_KEY = "rock101-tab";

export type SessionUser = {
    email: string;
    name: string;
    role: AppUser["role"];
    schoolId: string;
    staffId?: string;
};

type StaffRow = {
    id: string;
    name: string;
    email: string;
    active: boolean | null;
};

type StaffSchoolRoleRow = {
    school_slug: string;
    role: AppUser["role"];
    is_primary: boolean | null;
    active: boolean | null;
};


export async function findStaffUserByEmail(
    email: string
): Promise<SessionUser | null> {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) return null;

    const { data: staffRow, error: staffError } = await supabase
        .from("staff")
        .select("id, name, email, active")
        .ilike("email", normalizedEmail)
        .maybeSingle<StaffRow>();

    if (staffError) {
        console.error("Error loading staff row:", staffError);
        return null;
    }

    if (!staffRow) return null;
    if (staffRow.active === false) return null;

    const { data: roleRows, error: rolesError } = await supabase
        .from("staff_school_roles")
        .select("school_slug, role, is_primary, active")
        .eq("staff_id", staffRow.id)
        .eq("active", true)
        .returns<StaffSchoolRoleRow[]>();

    if (rolesError) {
        console.error("Error loading staff school roles:", rolesError);
        return null;
    }

    if (!roleRows || roleRows.length === 0) return null;

    const primaryRole =
        roleRows.find((row) => row.is_primary) ?? roleRows[0];

    return {
        email: staffRow.email,
        name: staffRow.name,
        role: primaryRole.role,
        schoolId: primaryRole.school_slug,
        staffId: staffRow.id,
    };
}

export function clearSavedSession() {
    // localStorage session removed — Supabase Auth is source of truth
    // kept as a no-op so logout callers don't need updating yet
}

export function saveSelectedTab(tab: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(TAB_KEY, tab);
}

export function getSavedTab() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TAB_KEY);
}

export function clearSavedTab() {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TAB_KEY);
}