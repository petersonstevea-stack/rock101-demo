"use client";

import { useEffect, useState } from "react";
import EnrollmentPageShell from "@/components/enrollment/EnrollmentPageShell";
import ParentEnrollmentForm from "@/components/enrollment/ParentEnrollmentForm";
import StaffEnrollmentForm from "@/components/enrollment/StaffEnrollmentForm";
import StudentEnrollmentForm from "@/components/enrollment/StudentEnrollmentForm";
import { CLASS_GROUP_OPTIONS } from "@/data/reference/classGroupOptions";
import {
    getInstrumentLabel,
    getProgramLabel,
    getSchoolLabel,
} from "@/data/reference/enrollmentOptions";
import { supabase } from "@/lib/supabaseClient";
import type {
    ParentFormValues,
    SelectOption,
    StaffFormValues,
    StudentEnrollmentFormValues,
} from "@/types/enrollment";

type StaffRow = {
    id: string;
    name: string;
    email: string;
    role: string;
    school_slug: string;
    school_type: string;
    created_at: string;
};

type StudentRow = {
    id: string;
    first_name: string;
    last_initial: string | null;
    instrument: string | null;
    school: string | null;
    class_name: string | null;
    parent_email: string | null;
    created_at: string | null;
    primary_instructor_email: string | null;
    school_id: string | null;
    primary_instructor_user_id: string | null;
    active: boolean;
    program: string | null;
    primary_program_id: string | null;
};

type ParentRow = {
    id: string;
    name: string;
    email: string;
    created_at: string | null;
};

const initialStaffValues: StaffFormValues = {
    name: "",
    email: "",
    role: "",
    school: "",
    schoolType: "",
};

const initialStudentValues: StudentEnrollmentFormValues = {
    firstName: "",
    lastName: "",
    school: "",
    primaryProgramId: "",
    instrument: "",
    instructorId: "",
    parentId: "",
    classAssignmentId: "",
};

const initialParentValues: ParentFormValues = {
    name: "",
    email: "",
};

export default function EnrollmentPage() {
    const [staffValues, setStaffValues] =
        useState<StaffFormValues>(initialStaffValues);
    const [studentValues, setStudentValues] =
        useState<StudentEnrollmentFormValues>(initialStudentValues);
    const [parentValues, setParentValues] =
        useState<ParentFormValues>(initialParentValues);

    const [submittedValues, setSubmittedValues] =
        useState<StaffFormValues | null>(null);
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState<"success" | "error" | "idle">(
        "idle"
    );
    const [isSaving, setIsSaving] = useState(false);
    const [staffList, setStaffList] = useState<StaffRow[]>([]);
    const [studentList, setStudentList] = useState<StudentRow[]>([]);
    const [parentList, setParentList] = useState<ParentRow[]>([]);

    async function loadStaff() {
        const { data, error } = await supabase
            .from("staff")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setStaffList(data as StaffRow[]);
        }
    }

    async function loadStudents() {
        const { data, error } = await supabase
            .from("students")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setStudentList(data as StudentRow[]);
        }
    }

    async function loadParents() {
        const { data, error } = await supabase
            .from("parents")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setParentList(data as ParentRow[]);
        }
    }

    useEffect(() => {
        loadStaff();
        loadStudents();
        loadParents();
    }, []);

    async function handleStaffSubmit() {
        if (
            !staffValues.name.trim() ||
            !staffValues.email.trim() ||
            !staffValues.role ||
            !staffValues.school ||
            !staffValues.schoolType
        ) {
            setStatusType("error");
            setStatusMessage("Please complete all required staff fields before saving.");
            return;
        }

        setIsSaving(true);
        setStatusType("idle");
        setStatusMessage("");

        const payload = {
            name: staffValues.name.trim(),
            email: staffValues.email.trim().toLowerCase(),
            role: staffValues.role,
            school_slug: staffValues.school,
            school_type: staffValues.schoolType,
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

        setSubmittedValues(staffValues);
        setStatusType("success");
        setStatusMessage(`Staff member saved: ${data.name}`);
        setStaffValues(initialStaffValues);
        await loadStaff();
        setIsSaving(false);
    }

    async function handleStudentSubmit() {
        if (
            !studentValues.firstName.trim() ||
            !studentValues.lastName.trim() ||
            !studentValues.school ||
            !studentValues.primaryProgramId ||
            !studentValues.instrument ||
            !studentValues.parentId ||
            !studentValues.instructorId
        ) {
            setStatusType("error");
            setStatusMessage("Please complete all required student fields before saving.");
            return;
        }

        const instructor =
            staffList.find((s) => s.id === studentValues.instructorId) ?? null;

        if (!instructor) {
            setStatusType("error");
            setStatusMessage("Selected instructor not found.");
            return;
        }

        const selectedParent =
            parentList.find((parent) => parent.id === studentValues.parentId) ?? null;

        if (!selectedParent) {
            setStatusType("error");
            setStatusMessage("Selected parent not found.");
            return;
        }

        const normalizedFirstName = studentValues.firstName.trim();
        const normalizedLastInitial = studentValues.lastName.trim().charAt(0);

        const { data: existingStudents, error: duplicateCheckError } = await supabase
            .from("students")
            .select("id, first_name, last_initial, school, primary_program_id")
            .eq("first_name", normalizedFirstName)
            .eq("last_initial", normalizedLastInitial)
            .eq("school", studentValues.school)
            .eq("primary_program_id", studentValues.primaryProgramId)
            .limit(1);

        if (duplicateCheckError) {
            setStatusType("error");
            setStatusMessage(duplicateCheckError.message);
            return;
        }

        if (existingStudents && existingStudents.length > 0) {
            setStatusType("error");
            setStatusMessage(
                "A student with this first name, last initial, school, and program already exists."
            );
            return;
        }

        setIsSaving(true);
        setStatusType("idle");
        setStatusMessage("");

        const selectedClassGroup = CLASS_GROUP_OPTIONS.find(
            (option) => option.value === studentValues.classAssignmentId
        );

        const payload = {
            first_name: normalizedFirstName,
            last_initial: normalizedLastInitial,
            instrument: studentValues.instrument,
            school: studentValues.school,
            class_name: selectedClassGroup?.label ?? null,
            parent_email: selectedParent.email,
            primary_instructor_email: instructor.email,
            program: studentValues.primaryProgramId,
            primary_program_id: studentValues.primaryProgramId,
            active: true,
        };

        const { data, error } = await supabase
            .from("students")
            .insert([payload])
            .select()
            .single();

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            setIsSaving(false);
            return;
        }

        setStatusType("success");
        setStatusMessage(
            `Student enrolled: ${data.first_name} ${data.last_initial ?? ""}`.trim()
        );

        setStudentValues(initialStudentValues);
        await loadStudents();
        setIsSaving(false);
    }

    async function handleParentSubmit() {
        if (!parentValues.name.trim() || !parentValues.email.trim()) {
            setStatusType("error");
            setStatusMessage("Please complete all required parent fields before saving.");
            return;
        }

        setIsSaving(true);
        setStatusType("idle");
        setStatusMessage("");

        const payload = {
            name: parentValues.name.trim(),
            email: parentValues.email.trim().toLowerCase(),
        };

        const { data, error } = await supabase
            .from("parents")
            .insert([payload])
            .select()
            .single();

        if (error) {
            setStatusType("error");
            setStatusMessage(error.message);
            setIsSaving(false);
            return;
        }

        setStatusType("success");
        setStatusMessage(`Parent saved: ${data.name}`);

        setParentValues(initialParentValues);
        await loadParents();
        setIsSaving(false);
    }

    const instructorOptions: SelectOption[] = staffList
        .filter(
            (staff) =>
                (staff.role === "instructor" || staff.role === "director") &&
                (!studentValues.school || staff.school_slug === studentValues.school)
        )
        .map((staff) => ({
            value: staff.id,
            label: staff.name,
        }));

    const parentOptions: SelectOption[] = parentList.map((parent) => ({
        value: parent.id,
        label: `${parent.name} (${parent.email})`,
    }));

    const classGroupOptions: SelectOption[] = CLASS_GROUP_OPTIONS
        .filter(
            (option) =>
                !studentValues.school || option.school === studentValues.school
        )
        .map((option) => ({
            value: option.value,
            label: option.label,
        }));

    const selectedInstructor =
        staffList.find((staff) => staff.id === studentValues.instructorId) ?? null;

    return (
        <EnrollmentPageShell
            title="Enrollment"
            description="This internal workspace is where Stage Ready will manage staff, parents, and student enrollment. For pilot testing, we are starting with controlled forms first. In the production permission model, school access will be granted by higher-level admin assignment, not self-selected by end users."
        >
            <section className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
                    Access model note
                </h2>
                <p className="mt-2 text-sm text-amber-100/90">
                    Future production behavior: users should only be able to enroll people
                    into schools they have already been granted access to. School
                    selection is temporarily visible here for form development, but it
                    will later be filtered and permission-locked by admin assignment.
                </p>
            </section>

            {statusMessage ? (
                <section
                    className={
                        statusType === "success"
                            ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4"
                            : "rounded-2xl border border-red-400/20 bg-red-400/10 p-4"
                    }
                >
                    <p
                        className={
                            statusType === "success"
                                ? "text-sm font-medium text-emerald-200"
                                : "text-sm font-medium text-red-200"
                        }
                    >
                        {statusMessage}
                    </p>
                </section>
            ) : null}

            <StaffEnrollmentForm
                values={staffValues}
                onChange={setStaffValues}
                onSubmit={handleStaffSubmit}
                submitLabel={isSaving ? "Saving..." : "Save Staff Member"}
                disabled={isSaving}
            />

            <StudentEnrollmentForm
                values={studentValues}
                onChange={(nextValues) => {
                    const schoolChanged = nextValues.school !== studentValues.school;

                    if (!schoolChanged) {
                        setStudentValues(nextValues);
                        return;
                    }

                    setStudentValues({
                        ...nextValues,
                        instructorId: "",
                        classAssignmentId: "",
                    });
                }}
                onSubmit={handleStudentSubmit}
                instructorOptions={instructorOptions}
                parentOptions={parentOptions}
                classGroupOptions={classGroupOptions}
                submitLabel={isSaving ? "Saving..." : "Save Student"}
                disabled={isSaving}
            />

            <ParentEnrollmentForm
                values={parentValues}
                onChange={setParentValues}
                onSubmit={handleParentSubmit}
                submitLabel={isSaving ? "Saving..." : "Save Parent"}
                disabled={isSaving}
            />

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Debug Preview</h2>
                <p className="mt-1 text-sm text-white/60">
                    This temporary panel helps us confirm form state and saved values while
                    we build the enrollment system.
                </p>

                <pre className="mt-4 overflow-x-auto rounded-xl bg-black/40 p-4 text-xs text-white/80">
                    {JSON.stringify(
                        {
                            currentStaffValues: staffValues,
                            currentStudentValues: studentValues,
                            currentParentValues: parentValues,
                            selectedInstructor: selectedInstructor
                                ? {
                                    id: selectedInstructor.id,
                                    name: selectedInstructor.name,
                                    role: selectedInstructor.role,
                                    school_slug: selectedInstructor.school_slug,
                                }
                                : null,
                            submittedStaffValues: submittedValues,
                        },
                        null,
                        2
                    )}
                </pre>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Staff Directory</h2>
                <p className="mt-1 text-sm text-white/60">
                    This shows all staff currently saved in the system.
                </p>

                <div className="mt-4 space-y-3">
                    {staffList.length === 0 ? (
                        <p className="text-sm text-white/50">No staff added yet.</p>
                    ) : (
                        staffList.map((staff) => (
                            <div
                                key={staff.id}
                                className="rounded-xl border border-white/10 bg-black/40 p-4"
                            >
                                <p className="text-sm font-semibold text-white">{staff.name}</p>
                                <p className="text-xs text-white/60">{staff.email}</p>
                                <p className="mt-1 text-xs text-white/50">
                                    {staff.role} • {getSchoolLabel(staff.school_slug as any)} • {staff.school_type}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Student Directory</h2>
                <p className="mt-1 text-sm text-white/60">
                    This shows all students currently enrolled in the system.
                </p>

                <div className="mt-4 space-y-3">
                    {studentList.length === 0 ? (
                        <p className="text-sm text-white/50">No students added yet.</p>
                    ) : (
                        studentList.map((student) => (
                            <div
                                key={student.id}
                                className="rounded-xl border border-white/10 bg-black/40 p-4"
                            >
                                <p className="text-sm font-semibold text-white">
                                    {student.first_name} {student.last_initial ?? ""}
                                </p>
                                <p className="text-xs text-white/60">
                                    {student.instrument
                                        ? getInstrumentLabel(student.instrument as any)
                                        : "No instrument"}
                                    {" • "}
                                    {student.school
                                        ? getSchoolLabel(student.school as any)
                                        : "No school"}
                                </p>
                                <p className="mt-1 text-xs text-white/50">
                                    {student.primary_program_id
                                        ? getProgramLabel(student.primary_program_id as any)
                                        : student.program ?? "No program"}
                                    {" • "}
                                    {student.class_name ?? "No class assigned"}
                                </p>
                                <p className="mt-1 text-xs text-white/40">
                                    Parent:{" "}
                                    {student.parent_email
                                        ? parentList.find((parent) => parent.email === student.parent_email)?.name ??
                                        "No parent linked"
                                        : "No parent linked"}
                                </p>
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-lg font-semibold text-white">Parent Directory</h2>
                <p className="mt-1 text-sm text-white/60">
                    This shows all parents currently saved in the system.
                </p>

                <div className="mt-4 space-y-3">
                    {parentList.length === 0 ? (
                        <p className="text-sm text-white/50">No parents added yet.</p>
                    ) : (
                        parentList.map((parent) => (
                            <div
                                key={parent.id}
                                className="rounded-xl border border-white/10 bg-black/40 p-4"
                            >
                                <p className="text-sm font-semibold text-white">{parent.name}</p>
                                <p className="text-xs text-white/60">{parent.email}</p>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </EnrollmentPageShell>
    );
}