"use client";

import { useState } from "react";
import { AppUser } from "@/types/user";
import { getCreatedUsers, saveCreatedUsers } from "@/lib/session";

type Student = {
  name: string;
  firstName?: string;
  parentEmail?: string;
  instrument?: string;
  band?: string;
};

type AdminViewProps = {
  users: AppUser[];
  students: Student[];
  onUpdateStudentParentEmail: (studentName: string, parentEmail: string) => void;
};

export default function AdminView({
  users,
  students,
  onUpdateStudentParentEmail,
}: AdminViewProps) {
  const [editingStudentName, setEditingStudentName] = useState<string | null>(null);
  const [editingParentEmail, setEditingParentEmail] = useState("");

  const parentCount = users.filter((user) => user.role === "parent").length;
  const instructorCount = users.filter(
    (user) => user.role === "instructor"
  ).length;
  const directorCount = users.filter((user) => user.role === "director").length;
  const invitedCount = users.filter((user) => user.status === "invited").length;
  const activeCount = users.filter((user) => user.status === "active").length;

  const linkedStudents = students.filter((student) => student.parentEmail).length;
  const unlinkedStudents = students.length - linkedStudents;

  const parentUsers = users.filter((user) => user.role === "parent");

  const parentLinkRows = students.map((student) => {
    const normalizedParentEmail = student.parentEmail?.trim().toLowerCase();

    if (!normalizedParentEmail) {
      return {
        ...student,
        linkStatus: "Missing Parent Email",
        matchedParent: null,
      };
    }

    const matchedParent =
      parentUsers.find(
        (user) => user.email.trim().toLowerCase() === normalizedParentEmail
      ) ?? null;

    if (!matchedParent) {
      return {
        ...student,
        linkStatus: "Parent Not Invited",
        matchedParent: null,
      };
    }

    return {
      ...student,
      linkStatus:
        matchedParent.status === "active"
          ? "Parent Active"
          : "Parent Invited",
      matchedParent,
    };
  });

  const missingParentEmailCount = parentLinkRows.filter(
    (row) => row.linkStatus === "Missing Parent Email"
  ).length;

  const parentNotInvitedCount = parentLinkRows.filter(
    (row) => row.linkStatus === "Parent Not Invited"
  ).length;

  const parentInvitedCount = parentLinkRows.filter(
    (row) => row.linkStatus === "Parent Invited"
  ).length;

  const parentActiveCount = parentLinkRows.filter(
    (row) => row.linkStatus === "Parent Active"
  ).length;

  function getStatusColor(status: string) {
    if (status === "Missing Parent Email") return "text-yellow-400";
    if (status === "Parent Not Invited") return "text-red-400";
    if (status === "Parent Invited") return "text-blue-400";
    if (status === "Parent Active") return "text-green-400";
    return "text-zinc-400";
  }

  function handleInviteParent(student: Student) {
    const parentEmail = student.parentEmail?.trim().toLowerCase();

    if (!parentEmail) {
      alert("This student does not have a parent email.");
      return;
    }

    const existingUser = users.find(
      (user) => user.email.trim().toLowerCase() === parentEmail
    );

    if (existingUser) {
      alert("A parent account with that email already exists.");
      return;
    }

    const createdUsers = getCreatedUsers();

    const newParentUser: AppUser = {
      email: parentEmail,
      name: `${student.firstName ?? student.name} Parent`,
      role: "parent",
      status: "invited",
      invitedAt: new Date().toLocaleDateString(),
      invitedBy: "Director Admin",
    };

    saveCreatedUsers([...createdUsers, newParentUser]);

    window.location.reload();
  }

  function handleMarkParentActive(parentEmail: string) {
    const normalizedEmail = parentEmail.trim().toLowerCase();

    const updatedCreatedUsers = getCreatedUsers().map((user) => {
      if (user.email.trim().toLowerCase() !== normalizedEmail) {
        return user;
      }

      return {
        ...user,
        status: "active" as const,
      };
    });

    saveCreatedUsers(updatedCreatedUsers);

    window.location.reload();
  }

  function startEditing(studentName: string, currentEmail?: string) {
    setEditingStudentName(studentName);
    setEditingParentEmail(currentEmail ?? "");
  }

  function cancelEditing() {
    setEditingStudentName(null);
    setEditingParentEmail("");
  }

  function saveParentEmail(studentName: string) {
    const normalized = editingParentEmail.trim().toLowerCase();
    onUpdateStudentParentEmail(studentName, normalized);
    setEditingStudentName(null);
    setEditingParentEmail("");
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Admin Page</h2>
        <p className="mt-2 text-zinc-400">
          This is the director control center for managing users, students, and
          the structure of the Rock 101 system.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Total Adult Accounts</div>
          <div className="mt-2 text-3xl font-bold">{users.length}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Students</div>
          <div className="mt-2 text-3xl font-bold">{students.length}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Active Accounts</div>
          <div className="mt-2 text-3xl font-bold">{activeCount}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Invited Accounts</div>
          <div className="mt-2 text-3xl font-bold">{invitedCount}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-semibold">Adult Account Breakdown</h3>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-400">Parents</span>
              <span className="font-semibold text-white">{parentCount}</span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-400">Instructors</span>
              <span className="font-semibold text-white">{instructorCount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Directors</span>
              <span className="font-semibold text-white">{directorCount}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-semibold">Student Linking Status</h3>

          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-400">Students linked to parent email</span>
              <span className="font-semibold text-white">{linkedStudents}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Students missing parent link</span>
              <span className="font-semibold text-white">{unlinkedStudents}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Parent Link Fixer</h3>
        <p className="mt-2 text-zinc-400">
          Use this section to quickly identify students with missing parent
          emails or parent accounts that have not yet been invited.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Missing Parent Email</div>
            <div className="mt-2 text-2xl font-bold text-yellow-400">
              {missingParentEmailCount}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Parent Not Invited</div>
            <div className="mt-2 text-2xl font-bold text-red-400">
              {parentNotInvitedCount}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Parent Invited</div>
            <div className="mt-2 text-2xl font-bold text-blue-400">
              {parentInvitedCount}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm text-zinc-400">Parent Active</div>
            <div className="mt-2 text-2xl font-bold text-green-400">
              {parentActiveCount}
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Parent Email</th>
                <th className="px-3 py-3">Matched Parent Account</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Band</th>
                <th className="px-3 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {parentLinkRows.map((row) => (
                <tr key={row.name} className="border-b border-zinc-800">
                  <td className="px-3 py-3">{row.name}</td>

                  <td className="px-3 py-3">
                    {editingStudentName === row.name ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="email"
                          value={editingParentEmail}
                          onChange={(e) => setEditingParentEmail(e.target.value)}
                          className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-white"
                          placeholder="Enter parent email"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => saveParentEmail(row.name)}
                            className="rounded-md bg-green-600 px-3 py-2 text-white hover:bg-green-500"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-md bg-zinc-700 px-3 py-2 text-white hover:bg-zinc-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      row.parentEmail || "—"
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {row.matchedParent ? row.matchedParent.name : "—"}
                  </td>

                  <td
                    className={`px-3 py-3 font-semibold ${getStatusColor(
                      row.linkStatus
                    )}`}
                  >
                    {row.linkStatus}
                  </td>

                  <td className="px-3 py-3">{row.band || "—"}</td>

                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(row.name, row.parentEmail)}
                        className="rounded-md bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700"
                      >
                        Edit Parent Email
                      </button>

                      {row.linkStatus === "Parent Not Invited" ? (
                        <button
                          type="button"
                          onClick={() => handleInviteParent(row)}
                          className="rounded-md bg-red-600 px-3 py-2 text-white hover:bg-red-500"
                        >
                          Invite Parent
                        </button>
                      ) : row.linkStatus === "Parent Invited" &&
                        row.parentEmail ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!row.parentEmail) return;
                            handleMarkParentActive(row.parentEmail);
                          }}
                         className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-500"
                        >
                         Mark Parent Active
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Quick Actions</h3>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm font-semibold text-white">
              Manage Accounts
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Create and activate parent and instructor accounts.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm font-semibold text-white">
              Review Students
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Check student records, parent emails, bands, and instruments.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm font-semibold text-white">
              Audit Parent Links
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Find students with missing or incorrect parent email assignments.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-black p-4">
            <div className="text-sm font-semibold text-white">
              Expand System Controls
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Later this page can include classes, songs, performances, and
              reporting.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Recent Adult Users</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="px-3 py-3">Name</th>
                <th className="px-3 py-3">Email</th>
                <th className="px-3 py-3">Role</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-b border-zinc-800">
                  <td className="px-3 py-3">{user.name}</td>
                  <td className="px-3 py-3">{user.email}</td>
                  <td className="px-3 py-3 capitalize">{user.role}</td>
                  <td className="px-3 py-3 capitalize">{user.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Student Records</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Parent Email</th>
                <th className="px-3 py-3">Instrument</th>
                <th className="px-3 py-3">Band</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.name} className="border-b border-zinc-800">
                  <td className="px-3 py-3">{student.name}</td>
                  <td className="px-3 py-3">{student.parentEmail || "—"}</td>
                  <td className="px-3 py-3">{student.instrument || "—"}</td>
                  <td className="px-3 py-3">{student.band || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}