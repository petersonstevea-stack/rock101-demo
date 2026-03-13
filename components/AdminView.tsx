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
  canManageUsers: boolean;
  onUpdateStudentParentEmail: (
    studentName: string,
    parentEmail: string
  ) => void;
  onDeleteStudent: (studentName: string) => void;
};

export default function AdminView({
  users,
  students,
  canManageUsers,
  onUpdateStudentParentEmail,
  onDeleteStudent,
}: AdminViewProps) {
  const [editingStudentName, setEditingStudentName] = useState<string | null>(
    null
  );
  const [editingParentEmail, setEditingParentEmail] = useState("");

  const parentUsers = users.filter((user) => user.role === "parent");

  function handleInviteParent(student: Student) {
    const parentEmail = student.parentEmail?.trim().toLowerCase();
    if (!parentEmail) return;

    const existingUser = users.find(
      (user) => user.email.trim().toLowerCase() === parentEmail
    );

    if (existingUser) return;

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
    cancelEditing();
  }

  function handleDeleteStudent(studentName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${studentName}?`
    );

    if (!confirmed) return;

    onDeleteStudent(studentName);

    if (editingStudentName === studentName) {
      cancelEditing();
    }
  }

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
        matchedParent.status === "active" ? "Parent Active" : "Parent Invited",
      matchedParent,
    };
  });

  function getStatusColor(status: string) {
    if (status === "Missing Parent Email") return "text-yellow-400";
    if (status === "Parent Not Invited") return "text-red-400";
    if (status === "Parent Invited") return "text-blue-400";
    if (status === "Parent Active") return "text-green-400";
    return "text-zinc-400";
  }

  return (
    <div className="mt-8 space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Admin Page</h2>
        <p className="mt-2 text-zinc-400">
          Manage parent invitations and student-parent links.
        </p>

        <p className="mt-3 text-sm text-zinc-500">
          {canManageUsers
            ? "You have full admin permissions."
            : "You have limited admin permissions."}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h3 className="text-xl font-semibold">Parent Link Fixer</h3>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Parent Email</th>
                <th className="px-3 py-3">Status</th>
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

                  <td
                    className={`px-3 py-3 font-semibold ${getStatusColor(
                      row.linkStatus
                    )}`}
                  >
                    {row.linkStatus}
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditing(row.name, row.parentEmail)}
                        className="rounded-md bg-zinc-800 px-3 py-2 text-white hover:bg-zinc-700"
                      >
                        Edit
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
                          onClick={() =>
                            handleMarkParentActive(row.parentEmail!)
                          }
                          className="rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-500"
                        >
                          Mark Parent Active
                        </button>
                      ) : null}

                      {canManageUsers && (
                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(row.name)}
                          className="rounded-md bg-zinc-950 px-3 py-2 text-white hover:bg-zinc-800"
                        >
                          Delete Student
                        </button>
                      )}
                    </div>
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