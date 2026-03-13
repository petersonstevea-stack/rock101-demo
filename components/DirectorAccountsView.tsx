"use client";

import { useEffect, useState } from "react";
import { AppUser, UserRole } from "@/types/user";
import { getAllUsers, getCreatedUsers, saveCreatedUsers } from "@/lib/session";

type DirectorAccountsViewProps = {
  currentUserEmail: string;
};

export default function DirectorAccountsView({
  currentUserEmail,
}: DirectorAccountsViewProps) {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("parent");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAllUsers(getAllUsers());
  }, []);

  function refreshUsers() {
    setAllUsers(getAllUsers());
  }

  function handleInvite() {
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail) {
      setMessage("Please enter both name and email.");
      return;
    }

    if (role === "director") {
      setMessage("Directors cannot be created from this screen.");
      return;
    }

    const existingUser = getAllUsers().find(
      (user) => user.email.toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      setMessage("A user with that email already exists.");
      return;
    }

    const createdUsers = getCreatedUsers();

    const newUser: AppUser = {
      email: normalizedEmail,
      name: trimmedName,
      role,
      status: "invited",
      invitedAt: new Date().toLocaleDateString(),
      invitedBy: currentUserEmail,
    };

    saveCreatedUsers([...createdUsers, newUser]);

    setName("");
    setEmail("");
    setRole("parent");
    setMessage(`Invite created for ${newUser.name}.`);
    refreshUsers();
  }

  function handleActivate(emailToActivate: string) {
    const createdUsers = getCreatedUsers().map((user) => {
      if (user.email !== emailToActivate) return user;

      return {
        ...user,
        status: "active" as const,
      };
    });

    saveCreatedUsers(createdUsers);
    setMessage(`Activated ${emailToActivate}.`);
    refreshUsers();
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Director Account Invites</h2>
        <p className="mt-2 text-zinc-400">
          This is the prototype version of the future invite-by-email system.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Invite New User</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-zinc-400">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter full name"
              className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white outline-none focus:border-red-500"
            >
              <option value="parent">Parent</option>
              <option value="instructor">Instructor</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInvite}
          className="mt-6 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500"
        >
          Create Invite
        </button>

        {message && <p className="mt-4 text-sm text-zinc-300">{message}</p>}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Adult Users</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Invited By</th>
                <th className="px-3 py-3">Invited At</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.email} className="border-b border-zinc-800">
                  <td className="px-3 py-3">{user.name}</td>
                  <td className="px-3 py-3">{user.email}</td>
                  <td className="px-3 py-3 capitalize">{user.role}</td>
                  <td className="px-3 py-3 capitalize">{user.status}</td>
                  <td className="px-3 py-3">{user.invitedBy ?? "—"}</td>
                  <td className="px-3 py-3">{user.invitedAt ?? "—"}</td>
                  <td className="px-3 py-3">
                    {user.status === "invited" ? (
                      <button
                        type="button"
                        onClick={() => handleActivate(user.email)}
                        className="rounded-md bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700"
                      >
                        Mark Active
                      </button>
                    ) : (
                      <span className="text-zinc-500">Ready</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}