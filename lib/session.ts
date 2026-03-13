import { users } from "@/data/users";
import { AppUser } from "@/types/user";

const SESSION_KEY = "rock101-session";
const CREATED_USERS_KEY = "rock101-created-users";

export type SessionUser = Pick<AppUser, "email" | "name" | "role">;

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
  const createdUsers = getCreatedUsers();
  return [...users, ...createdUsers];
}

export function findUserByEmail(email: string): SessionUser | null {
  const normalizedEmail = email.trim().toLowerCase();

  const matchedUser = getAllUsers().find(
    (user) => user.email.toLowerCase() === normalizedEmail
  );

  if (!matchedUser) return null;
  if (matchedUser.status !== "active") return null;

  return {
    email: matchedUser.email,
    name: matchedUser.name,
    role: matchedUser.role,
  };
}
const TAB_KEY = "rock101-tab";

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