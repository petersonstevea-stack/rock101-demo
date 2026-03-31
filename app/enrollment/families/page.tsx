"use client";

import { useEffect, useState } from "react";
import EnrollmentPageShell from "@/components/enrollment/EnrollmentPageShell";
import EnrollmentTextField from "@/components/enrollment/fields/EnrollmentTextField";
import EnrollmentSelectField from "@/components/enrollment/fields/EnrollmentSelectField";
import { supabase } from "@/lib/supabaseClient";
import {
    INSTRUMENT_OPTIONS,
    PROGRAM_OPTIONS,
} from "@/data/reference/enrollmentOptions";

type StaffRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    school_slug: string;
};

type StudentDraft = {
    firstName: string;
    lastName: string;
    school: string;
    program: string;
    instrument: string;
    instructorId: string;
};

type StudentRow = {
    id: string;
    first_name: string;
    last_initial: string | null;
    school: string | null;
};

function createEmptyStudent(): StudentDraft {
    return {
        firstName: "",
        lastName: "",
        school: "",
        program: "",
        instrument: "",
        instructorId: "",
    };
}

export default function FamiliesEnrollmentPage() {
    const [parentName, setParentName] = useState("");
    const [parentEmail, setParentEmail] = useState("");

    const [students, setStudents] = useState<StudentDraft>(createEmptyStudent() as any);
    const [studentList, setStudentList] = useState<StudentDraft[]>([
        createEmptyStudent(),
    ]);

    const [staffList, setStaffList] = useState<StaffRow[]>([]);
    const [recentStudents, setRecentStudents] = useState<StudentRow[]>([]);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState<"success" | "error" | "idle">(
        "idle"
    );
    const [isSaving, setIsSaving] = useState(false);
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

    useEffect(() => {
        async function loadInitialData() {
            const { data: staffData } = await supabase.from("staff").select("*");

            if (staffData) {
                setStaffList(staffData as StaffRow[]);
            }

            const { data: recentStudentData } = await supabase
                .from("students")
                .select("id, first_name, last_initial, school")
                .order("created_at", { ascending: false })
                .limit(5);

            if (recentStudentData) {
                setRecentStudents(recentStudentData as StudentRow[]);
            }
        }

        loadInitialData();
    }, []);

    function updateStudent(
        index: number,
        field: keyof StudentDraft,
        value: string
    ) {
        setStudentList((current) =>
            current.map((student, studentIndex) => {
                if (studentIndex !== index) {
                    return student;
                }

                if (field === "school") {
                    return {
                        ...student,
                        school: value,
                        instructorId: "",
                    };
                }

                return {
                    ...student,
                    [field]: value,
                };
            })
        );
    }

    function addAnotherStudent() {
        setStudentList((current) => [...current, createEmptyStudent()]);
    }

    function removeStudent(index: number) {
        setStudentList((current) => {
            if (current.length === 1) {
                return current;
            }

            return current.filter((_, studentIndex) => studentIndex !== index);
        });
    }

    async function handleSaveFamily() {
        if (!parentName.trim() || !parentEmail.trim()) {
            setStatusType("error");
            setStatusMessage("Please complete the parent name and parent email.");
            return;
        }

        for (const student of studentList) {
            if (
                !student.firstName.trim() ||
                !student.lastName.trim() ||
                !student.school ||
                !student.program ||
                !student.instrument ||
                !student.instructorId
            ) {
                setStatusType("error");
                setStatusMessage(
                    "Please complete all required fields for every student before saving."
                );
                return;
            }
        }

        setIsSaving(true);
        setStatusType("idle");
        setStatusMessage("");

        try {
            const normalizedParentEmail = parentEmail.trim().toLowerCase();

            const { data: existingParent, error: existingParentError } = await supabase
                .from("parents")
                .select("*")
                .eq("email", normalizedParentEmail)
                .maybeSingle();

            if (existingParentError) {
                throw existingParentError;
            }

            if (!existingParent) {
                const { error: parentInsertError } = await supabase.from("parents").insert({
                    name: parentName.trim(),
                    email: normalizedParentEmail,
                });

                if (parentInsertError) {
                    throw parentInsertError;
                }
            }

            const insertedStudents: StudentRow[] = [];

            for (const student of studentList) {
                const selectedInstructor =
                    staffList.find((staff) => staff.id === student.instructorId) ?? null;

                if (!selectedInstructor) {
                    throw new Error("Selected instructor not found.");
                }

                const { data: duplicateStudent, error: duplicateError } = await supabase
                    .from("students")
                    .select("id")
                    .eq("first_name", student.firstName.trim())
                    .eq("last_initial", student.lastName.trim().charAt(0))
                    .eq("school", student.school)
                    .eq("primary_program_id", student.program)
                    .limit(1);

                if (duplicateError) {
                    throw duplicateError;
                }

                if (duplicateStudent && duplicateStudent.length > 0) {
                    throw new Error(
                        `A student already exists for ${student.firstName.trim()} ${student.lastName
                            .trim()
                            .charAt(0)} in this school and program.`
                    );
                }

                const { data: insertedStudent, error: studentInsertError } = await supabase
                    .from("students")
                    .insert({
                        first_name: student.firstName.trim(),
                        last_initial: student.lastName.trim().charAt(0),
                        instrument: student.instrument,
                        school: student.school,
                        program: student.program,
                        primary_program_id: student.program,
                        parent_email: normalizedParentEmail,
                        primary_instructor_email: selectedInstructor.email,
                        active: true,
                    })
                    .select()
                    .single();

                if (studentInsertError) {
                    throw studentInsertError;
                }

                if (insertedStudent) {
                    insertedStudents.push(insertedStudent as StudentRow);
                }
            }

            setStatusType("success");
            setStatusMessage(
                `Family successfully enrolled with ${insertedStudents.length} student${insertedStudents.length === 1 ? "" : "s"
                }.`
            );

            if (insertedStudents.length > 0) {
                setRecentStudents((current) => [...insertedStudents, ...current].slice(0, 5));
            }

            setParentName("");
            setParentEmail("");
            setStudentList([createEmptyStudent()]);
        } catch (err: any) {
            console.error("Family save error:", err);

            const message =
                err?.message ||
                err?.error_description ||
                err?.details ||
                JSON.stringify(err) ||
                "Something went wrong";

            setStatusType("error");
            setStatusMessage(message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <EnrollmentPageShell
            title="Family Enrollment"
            description="Create a parent and enroll students in a single workflow."
        >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
                <h2 className="text-lg font-semibold text-white">
                    Parent + Student Enrollment
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                    <EnrollmentTextField
                        id="parent-name"
                        label="Parent Name"
                        value={parentName}
                        onChange={setParentName}
                        required
                    />

                    <EnrollmentTextField
                        id="parent-email"
                        label="Parent Email"
                        value={parentEmail}
                        onChange={setParentEmail}
                        type="email"
                        required
                    />
                </div>

                <div className="space-y-6">
                    {studentList.map((student, index) => {
                        const instructorOptions = staffList
                            .filter(
                                (staff) =>
                                    (staff.role === "instructor" || staff.role === "director") &&
                                    (!student.school || staff.school_slug === student.school)
                            )
                            .map((staff) => ({
                                value: staff.id,
                                label: staff.name,
                            }));

                        return (
                            <div
                                key={index}
                                className="rounded-xl border border-white/10 bg-black/30 p-4 space-y-4"
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="text-base font-semibold text-white">
                                        Student {index + 1}
                                    </h3>

                                    {studentList.length > 1 ? (
                                        <button
                                            type="button"
                                            onClick={() => removeStudent(index)}
                                            className="rounded-none border border-[#cc0000]/30 bg-[#cc0000]/10 px-3 py-1 text-sm text-white transition hover:bg-[#cc0000]/20"
                                        >
                                            Remove
                                        </button>
                                    ) : null}
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <EnrollmentTextField
                                        id={`student-first-name-${index}`}
                                        label="Student First Name"
                                        value={student.firstName}
                                        onChange={(value) => updateStudent(index, "firstName", value)}
                                        required
                                    />

                                    <EnrollmentTextField
                                        id={`student-last-name-${index}`}
                                        label="Student Last Name"
                                        value={student.lastName}
                                        onChange={(value) => updateStudent(index, "lastName", value)}
                                        required
                                    />

                                    <EnrollmentSelectField
                                        id={`student-school-${index}`}
                                        label="School"
                                        value={student.school}
                                        onChange={(value) => updateStudent(index, "school", value)}
                                        options={schoolList.map((s) => ({ value: s.id, label: s.name }))}
                                        required
                                    />

                                    <EnrollmentSelectField
                                        id={`student-program-${index}`}
                                        label="Program"
                                        value={student.program}
                                        onChange={(value) => updateStudent(index, "program", value)}
                                        options={PROGRAM_OPTIONS}
                                        required
                                    />

                                    <EnrollmentSelectField
                                        id={`student-instrument-${index}`}
                                        label="Instrument"
                                        value={student.instrument}
                                        onChange={(value) => updateStudent(index, "instrument", value)}
                                        options={INSTRUMENT_OPTIONS}
                                        required
                                    />

                                    <EnrollmentSelectField
                                        id={`student-instructor-${index}`}
                                        label="Instructor"
                                        value={student.instructorId}
                                        onChange={(value) =>
                                            updateStudent(index, "instructorId", value)
                                        }
                                        options={instructorOptions}
                                        required
                                        helperText="This list is filtered by the selected school."
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={addAnotherStudent}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white transition hover:bg-white/10"
                    >
                        + Add Another Student
                    </button>

                    <button
                        type="button"
                        onClick={handleSaveFamily}
                        disabled={isSaving}
                        className="rounded-xl bg-white px-4 py-2 text-black disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Save Family"}
                    </button>
                </div>

                {statusMessage && (
                    <div
                        className={
                            statusType === "success"
                                ? "text-sm text-green-300"
                                : "text-sm text-[#cc0000]"
                        }
                    >
                        {statusMessage}
                    </div>
                )}

                {recentStudents.length > 0 && (
                    <div className="mt-6 space-y-2">
                        <h3 className="text-sm font-semibold text-white/70">
                            Recently Added Students
                        </h3>

                        {recentStudents.map((student) => (
                            <div
                                key={student.id}
                                className="rounded-lg border border-white/10 p-3 text-sm text-white/80"
                            >
                                {student.first_name} {student.last_initial ?? ""} — {student.school}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </EnrollmentPageShell>
    );
}