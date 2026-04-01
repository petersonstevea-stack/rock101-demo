"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
    INSTRUMENT_OPTIONS,
    PROGRAM_OPTIONS,
} from "@/data/reference/enrollmentOptions";

type Student = {
    id?: string;
    name: string;
    active: boolean;
    firstName?: string;
    parentEmail?: string;
    instrument?: string;
    band?: string;
    primaryInstructorEmail?: string;
    school?: string;
    primaryProgramId?: string;
    program?: string;
    primary_program_id?: string;
    lastInitial?: string;
};

type StaffInstructor = {
    id: string;
    name: string;
    email: string;
    role: string;
    school_slug?: string;
    school_type?: string;
};

type ParentRecord = {
    id: string;
    name: string;
    email: string;
    created_at?: string | null;
};

type StudentEditValues = {
    firstName: string;
    lastInitial: string;
    instrument: string;
    school: string;
    primaryProgramId: string;
};

type AdminViewProps = {
    users: unknown[];
    students: Student[];
    canManageUsers: boolean;
    onUpdateStudentParentEmail: (
        studentName: string,
        parentEmail: string
    ) => void;
    onDeleteStudent: (studentId: string | undefined, studentName: string) => void;
    onUpdateStudentInstructor?: (
        studentName: string,
        instructorEmail: string
    ) => void;
    onUpdateStudentRecord?: (
        studentName: string,
        updates: StudentEditValues
    ) => void;
    onToggleStudentActive?: (studentId: string, nextActive: boolean) => void;
};

export default function AdminView({
    users: _users,
    students,
    canManageUsers,
    onUpdateStudentParentEmail,
    onDeleteStudent,
    onUpdateStudentInstructor,
    onUpdateStudentRecord,
    onToggleStudentActive,
}: AdminViewProps) {
    const [instructors, setInstructors] = useState<StaffInstructor[]>([]);
    const [parents, setParents] = useState<ParentRecord[]>([]);
    const [editingStudentName, setEditingStudentName] = useState<string | null>(
        null
    );
    const [editingParentName, setEditingParentName] = useState("");
    const [editingStudentRecordName, setEditingStudentRecordName] = useState<
        string | null
    >(null);
    const [editingStudentValues, setEditingStudentValues] =
        useState<StudentEditValues>({
            firstName: "",
            lastInitial: "",
            instrument: "",
            school: "",
            primaryProgramId: "",
        });
    const [statusMessage, setStatusMessage] = useState("");
    const [studentSearch, setStudentSearch] = useState("");
    const [statusType, setStatusType] = useState<"success" | "error" | "idle">(
        "idle"
    );
    const [isSavingParent, setIsSavingParent] = useState(false);
    const [showInactiveStudents, setShowInactiveStudents] = useState(false);
    const [schoolList, setSchoolList] = useState<{ id: string; name: string }[]>([]);
    const inactiveStudentCount = students.filter((student) => !student.active).length;

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

    useEffect(() => {
        async function loadAdminData() {
            const { data: staffData, error: staffError } = await supabase
                .from("staff")
                .select("id, name, email, role, school_slug, school_type")
                .in("role", ["instructor", "music_director"])
                .order("name", { ascending: true });

            if (staffError) {
                console.error("Failed to load instructors from staff table:", staffError);
            } else {
                setInstructors((staffData ?? []) as StaffInstructor[]);
            }

            const { data: parentData, error: parentError } = await supabase
                .from("parents")
                .select("id, name, email, created_at")
                .order("name", { ascending: true });

            if (parentError) {
                console.error("Failed to load parents from parents table:", parentError);
            } else {
                setParents((parentData ?? []) as ParentRecord[]);
            }
        }

        loadAdminData();
    }, []);

    function getParentRecord(parentEmail?: string) {
        if (!parentEmail) return null;
        return parents.find((parent) => parent.email === parentEmail) ?? null;
    }

    function startEditingParent(studentName: string, currentParentEmail?: string) {
        const parent = getParentRecord(currentParentEmail);
        setEditingStudentName(studentName);
        setEditingParentName(parent?.name ?? "");
        setEditingStudentRecordName(null);
        setStatusMessage("");
        setStatusType("idle");
    }

    function startEditingStudent(student: Student) {
        setEditingStudentRecordName(student.name);
        setEditingStudentName(null);
        setEditingStudentValues({
            firstName: student.firstName ?? student.name.split(" ")[0] ?? "",
            lastInitial: student.lastInitial ?? "",
            instrument: student.instrument ?? "",
            school: student.school ?? "",
            primaryProgramId:
                student.primaryProgramId ||
                student.program ||
                student.primary_program_id ||
                "",
        });
        setStatusMessage("");
        setStatusType("idle");
    }

    function cancelEditingParent() {
        setEditingStudentName(null);
        setEditingParentName("");
    }

    function cancelEditingStudent() {
        setEditingStudentRecordName(null);
        setEditingStudentValues({
            firstName: "",
            lastInitial: "",
            instrument: "",
            school: "",
            primaryProgramId: "",
        });
    }
    async function handleToggleStudentActive(student: Student) {
        const { error } = await supabase
            .from("students")
            .update({ active: !student.active })
            .eq("id", student.id);

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            return;
        }
        if (onToggleStudentActive && student.id) {
            onToggleStudentActive(student.id, !student.active);
        }
        setStatusType(student.active ? "error" : "success");
        setStatusMessage(
            `${student.name} is now ${student.active ? "inactive" : "active"}.`
        );
    }
    async function saveParentName(student: Student) {
        if (!student.parentEmail) {
            setStatusType("error");
            setStatusMessage("This student does not have a linked parent email.");
            return;
        }

        const normalizedName = editingParentName.trim();

        if (!normalizedName) {
            setStatusType("error");
            setStatusMessage("Parent name cannot be empty.");
            return;
        }

        setIsSavingParent(true);
        setStatusMessage("");
        setStatusType("idle");

        const { error } = await supabase
            .from("parents")
            .update({ name: normalizedName })
            .eq("email", student.parentEmail);

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            setIsSavingParent(false);
            return;
        }

        setParents((current) =>
            current.map((parent) =>
                parent.email === student.parentEmail
                    ? { ...parent, name: normalizedName }
                    : parent
            )
        );

        setStatusType("success");
        setStatusMessage(`Parent updated: ${normalizedName}`);
        setIsSavingParent(false);
        cancelEditingParent();
    }

    function saveStudentRecord(studentName: string) {
        if (!editingStudentValues.firstName.trim()) {
            setStatusType("error");
            setStatusMessage("Student first name cannot be empty.");
            return;
        }

        if (!editingStudentValues.school) {
            setStatusType("error");
            setStatusMessage("Please select a school.");
            return;
        }

        if (!editingStudentValues.primaryProgramId) {
            setStatusType("error");
            setStatusMessage("Please select a program.");
            return;
        }

        if (!editingStudentValues.instrument) {
            setStatusType("error");
            setStatusMessage("Please select an instrument.");
            return;
        }

        onUpdateStudentRecord?.(studentName, {
            firstName: editingStudentValues.firstName.trim(),
            lastInitial: editingStudentValues.lastInitial.trim().charAt(0),
            instrument: editingStudentValues.instrument,
            school: editingStudentValues.school,
            primaryProgramId: editingStudentValues.primaryProgramId,
        });

        cancelEditingStudent();
    }

    function handleDeleteStudent(
        studentId: string | undefined,
        studentName: string
    ) {
        const confirmed = window.confirm(`Delete ${studentName}?`);
        if (!confirmed) return;
        onDeleteStudent(studentId, studentName);
    }

    return (
        <div className="mt-8 space-y-8">
            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Admin Page</h2>
                <p className="mt-2 text-zinc-400">
                    Manage enrollment, parents, students, and instructor assignments.
                </p>

                {statusMessage ? (
                    <div
                        className={
                            statusType === "success"
                                ? "mt-4 rounded-none border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200"
                                : "mt-4 rounded-none border border-[#cc0000]/20 bg-[#cc0000]/10 p-3 text-sm text-white"
                        }
                    >
                        {statusMessage}
                    </div>
                ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Link
                    href="/enrollment/staff"
                    className="rounded-none border border-zinc-800 bg-zinc-900 p-6 transition hover:border-[#cc0000] hover:bg-zinc-800"
                >
                    <h3 className="text-lg font-semibold text-white">Manage Staff</h3>
                    <p className="mt-2 text-sm text-white/60">
                        Add and manage instructors, directors, GMs, and owners.
                    </p>
                </Link>

                <Link
                    href="/enrollment/families"
                    className="rounded-none border border-zinc-800 bg-zinc-900 p-6 transition hover:border-[#cc0000] hover:bg-zinc-800"
                >
                    <h3 className="text-lg font-semibold text-white">Manage Families</h3>
                    <p className="mt-2 text-sm text-white/60">
                        Create parents and enroll one or more students in one workflow.
                    </p>
                </Link>
            </div>

            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="text-xl font-semibold">Student Manager</h3>
                <input
                    type="text"
                    placeholder="Search students..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="mb-4 w-full rounded-none bg-zinc-800 px-4 py-2 text-white placeholder-white/40"
                />

                <div className="mt-2 text-sm">
                    <button
                        type="button"
                        onClick={() => setShowInactiveStudents((prev) => !prev)}
                        className="text-white/60 underline hover:text-white"
                    >
                        {showInactiveStudents
                            ? "Hide inactive students"
                            : `View inactive students (${inactiveStudentCount})`}
                    </button>
                </div>
                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400">
                                <th className="px-3 py-3">Student</th>
                                <th className="px-3 py-3">Parent Name</th>
                                <th className="px-3 py-3">Parent Email</th>
                                <th className="px-3 py-3">Primary Instructor</th>
                                <th className="px-3 py-3">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {students
                                .filter((student) => {
                                    if (!showInactiveStudents && !student.active) return false;

                                    const search = studentSearch.toLowerCase();

                                    const name =
                                        `${student.firstName} ${student.lastInitial ?? ""}`.toLowerCase();

                                    return name.includes(search);
                                })
                                .map((student) => {
                                    const parent = getParentRecord(student.parentEmail);

                                    return (
                                        <tr key={student.name} className="border-b border-zinc-800">
                                            <td className="px-3 py-3">
                                                {editingStudentRecordName === student.name ? (
                                                    <div className="grid gap-3">
                                                        <input
                                                            type="text"
                                                            value={editingStudentValues.firstName}
                                                            onChange={(e) =>
                                                                setEditingStudentValues((current) => ({
                                                                    ...current,
                                                                    firstName: e.target.value,
                                                                }))
                                                            }
                                                            placeholder="First name"
                                                            className="rounded-none border border-zinc-700 bg-black px-3 py-2 text-white"
                                                        />

                                                        <input
                                                            type="text"
                                                            value={editingStudentValues.lastInitial}
                                                            onChange={(e) =>
                                                                setEditingStudentValues((current) => ({
                                                                    ...current,
                                                                    lastInitial: e.target.value,
                                                                }))
                                                            }
                                                            placeholder="Last initial"
                                                            className="rounded-none border border-zinc-700 bg-black px-3 py-2 text-white"
                                                        />

                                                        <select
                                                            value={editingStudentValues.instrument}
                                                            onChange={(e) =>
                                                                setEditingStudentValues((current) => ({
                                                                    ...current,
                                                                    instrument: e.target.value,
                                                                }))
                                                            }
                                                            className="rounded-none border border-zinc-700 bg-black px-3 py-2 text-white"
                                                        >
                                                            <option value="">Select instrument</option>
                                                            {INSTRUMENT_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        <select
                                                            value={editingStudentValues.school}
                                                            onChange={(e) =>
                                                                setEditingStudentValues((current) => ({
                                                                    ...current,
                                                                    school: e.target.value,
                                                                }))
                                                            }
                                                            className="rounded-none border border-zinc-700 bg-black px-3 py-2 text-white"
                                                        >
                                                            <option value="">Select school</option>
                                                            {schoolList.map((s) => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.name}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        <select
                                                            value={editingStudentValues.primaryProgramId}
                                                            onChange={(e) =>
                                                                setEditingStudentValues((current) => ({
                                                                    ...current,
                                                                    primaryProgramId: e.target.value,
                                                                }))
                                                            }
                                                            className="rounded-none border border-zinc-700 bg-black px-3 py-2 text-white"
                                                        >
                                                            <option value="">Select program</option>
                                                            {PROGRAM_OPTIONS.map((option) => (
                                                                <option key={option.value} value={option.value}>
                                                                    {option.label}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => saveStudentRecord(student.name)}
                                                                className="rounded-none bg-[#cc0000] px-3 py-2 text-white"
                                                            >
                                                                Save Student
                                                            </button>

                                                            <button
                                                                onClick={cancelEditingStudent}
                                                                className="rounded-none bg-zinc-700 px-3 py-2 text-white"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    student.name
                                                )}
                                            </td>

                                            <td className="px-3 py-3">
                                                {editingStudentName === student.name ? (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={editingParentName}
                                                            onChange={(e) => setEditingParentName(e.target.value)}
                                                            className="rounded-none border border-zinc-700 bg-black px-3 py-2 text-white"
                                                        />

                                                        <button
                                                            onClick={() => saveParentName(student)}
                                                            disabled={isSavingParent}
                                                            className="rounded-none bg-[#cc0000] px-3 py-2 text-white disabled:opacity-50"
                                                        >
                                                            {isSavingParent ? "Saving..." : "Save"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleStudentActive(student)}
                                                            className="rounded-none bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800"
                                                        >
                                                            {student.active ? "Deactivate" : "Activate"}
                                                        </button>

                                                        <button
                                                            onClick={cancelEditingParent}
                                                            className="rounded-none bg-zinc-700 px-3 py-2 text-white"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    parent?.name || "—"
                                                )}
                                            </td>

                                            <td className="px-3 py-3">{student.parentEmail || "—"}</td>

                                            <td className="px-3 py-3">
                                                <select
                                                    value={student.primaryInstructorEmail || ""}
                                                    onChange={(e) => {
                                                        onUpdateStudentInstructor?.(student.name, e.target.value);
                                                    }}
                                                    className="rounded-none border border-zinc-700 bg-black px-3 py-2 text-white"
                                                >
                                                    <option value="">Unassigned</option>

                                                    {instructors.map((inst) => (
                                                        <option key={inst.email} value={inst.email}>
                                                            {inst.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            <td className="px-3 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() =>
                                                            startEditingParent(student.name, student.parentEmail)
                                                        }
                                                        className="rounded-none bg-zinc-800 px-3 py-2 text-white"
                                                    >
                                                        Edit Parent
                                                    </button>

                                                    <button
                                                        onClick={() => startEditingStudent(student)}
                                                        className="rounded-none bg-zinc-800 px-3 py-2 text-white"
                                                    >
                                                        Edit Student
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleStudentActive(student)}
                                                        className="rounded-none bg-zinc-900 px-3 py-2 text-sm text-white transition hover:bg-zinc-800"
                                                    >
                                                        {student.active ? "Deactivate" : "Activate"}
                                                    </button>

                                                    {!student.active && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteStudent(student.id, student.name)}
                                                            className="rounded-none bg-zinc-700 px-3 py-2 text-sm text-white transition hover:bg-zinc-600"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}