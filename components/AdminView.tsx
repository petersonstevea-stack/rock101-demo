"use client";

import { useState } from "react";
import { AppUser } from "@/types/user";

type Student = {
  name: string;
  firstName?: string;
  parentEmail?: string;
  instrument?: string;
  band?: string;
  primaryInstructorEmail?: string;
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
  onUpdateStudentInstructor?: (
    studentName: string,
    instructorEmail: string
  ) => void;
};

export default function AdminView({
  users,
  students,
  canManageUsers,
  onUpdateStudentParentEmail,
  onDeleteStudent,
  onUpdateStudentInstructor,
}: AdminViewProps) {

  const instructors = users.filter(
    (u) => u.role === "instructor"
  );

  const [editingStudentName, setEditingStudentName] = useState<string | null>(
    null
  );
  const [editingParentEmail, setEditingParentEmail] = useState("");

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
      `Delete ${studentName}?`
    );
    if (!confirmed) return;
    onDeleteStudent(studentName);
  }

  return (
    <div className="mt-8 space-y-8">

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Admin Page</h2>
        <p className="mt-2 text-zinc-400">
          Manage parents and instructor assignments.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

        <h3 className="text-xl font-semibold">Student Manager</h3>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-left text-sm">

            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Parent Email</th>
                <th className="px-3 py-3">Primary Instructor</th>
                <th className="px-3 py-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student) => (

                <tr key={student.name} className="border-b border-zinc-800">

                  <td className="px-3 py-3">
                    {student.name}
                  </td>

                  <td className="px-3 py-3">

                    {editingStudentName === student.name ? (

                      <div className="flex gap-2">

                        <input
                          type="email"
                          value={editingParentEmail}
                          onChange={(e) =>
                            setEditingParentEmail(e.target.value)
                          }
                          className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-white"
                        />

                        <button
                          onClick={() =>
                            saveParentEmail(student.name)
                          }
                          className="rounded-md bg-green-600 px-3 py-2 text-white"
                        >
                          Save
                        </button>

                        <button
                          onClick={cancelEditing}
                          className="rounded-md bg-zinc-700 px-3 py-2 text-white"
                        >
                          Cancel
                        </button>

                      </div>

                    ) : (

                      student.parentEmail || "—"

                    )}

                  </td>

                  <td className="px-3 py-3">

                    <select
                      value={student.primaryInstructorEmail || ""}
                      onChange={(e) =>
                        onUpdateStudentInstructor?.(
                          student.name,
                          e.target.value
                        )
                      }
                      className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-white"
                    >

                      <option value="">
                        Unassigned
                      </option>

                      {instructors.map((inst) => (

                        <option
                          key={inst.email}
                          value={inst.email}
                        >
                          {inst.name}
                        </option>

                      ))}

                    </select>

                  </td>

                  <td className="px-3 py-3">

                    <div className="flex gap-2">

                      <button
                        onClick={() =>
                          startEditing(
                            student.name,
                            student.parentEmail
                          )
                        }
                        className="rounded-md bg-zinc-800 px-3 py-2 text-white"
                      >
                        Edit Parent
                      </button>

                      {canManageUsers && (
                        <button
                          onClick={() =>
                            handleDeleteStudent(student.name)
                          }
                          className="rounded-md bg-zinc-950 px-3 py-2 text-white"
                        >
                          Delete
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