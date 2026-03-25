import { supabase } from "@/lib/supabaseClient";
import { AppUser } from "@/types/user";

const SESSION_KEY = "rock101-session";
const CREATED_USERS_KEY = "rock101-created-users";
const TAB_KEY = "rock101-tab";

export type SessionUser = {
    email: string;
    name: string;
    role: AppUser["role"];
    schoolId: string;
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

export function saveSession(user: SessionUser) {
    if (typeof window === "undefined") return;

    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSavedSession(): SessionUser | null {
    if (typeof window === "undefined") return null;

    const raw = localStorage.getItem(SESSION_KEY);

    if (!raw) return null;

    try {
        return JSON.parse(raw) as SessionUser;
    } catch {
        return null;
    }
}

export function clearSavedSession() {
    if (typeof window === "undefined") return;

    localStorage.removeItem(SESSION_KEY);
}

export function getCreatedUsers(): AppUser[] {
    if (typeof window === "undefined") return [];

    const raw = localStorage.getItem(CREATED_USERS_KEY);

    if (!raw) return [];

    try {
        return JSON.parse(raw) as AppUser[];
    } catch {
        return [];
    }
}

export function saveCreatedUsers(usersToSave: AppUser[]) {
    if (typeof window === "undefined") return;

    localStorage.setItem(CREATED_USERS_KEY, JSON.stringify(usersToSave));
}

export function getAllUsers(): AppUser[] {
    return getCreatedUsers();
}

export function findUserByEmail(email: string): SessionUser | null {
    const normalizedEmail = email.trim().toLowerCase();

    const matchedUser = getAllUsers().find(
        (user) => user.email.toLowerCase() === normalizedEmail
    );

    if (!matchedUser) return null;
    if (matchedUser.status !== "active") return null;

    const legacySchoolId =
        "schoolId" in matchedUser
            ? String(matchedUser.schoolId)
            : "school" in matchedUser
                ? String(matchedUser.school)
                : "";

    return {
        email: matchedUser.email,
        name: matchedUser.name,
        role: matchedUser.role,
        schoolId: legacySchoolId,
    };
}

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
    };
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