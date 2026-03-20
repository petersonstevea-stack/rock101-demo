"use client";

import { useEffect, useMemo, useState } from "react";
import { RockClass } from "@/types/class";
import { getSavedClasses, saveClasses } from "@/lib/classes";
import { approvedSongs } from "@/data/songLibrary";
import { AppUser } from "@/types/user";
import { schools, type SchoolId } from "@/data/schools";
import { supabase } from "@/lib/supabaseClient";
type Student = {
    id: string;
    name: string;
    schoolId: SchoolId;
};

type ClassSetupViewProps = {
    students: Student[];
    users?: AppUser[];
};

export default function ClassSetupView({
    students,
    users = [],
}: ClassSetupViewProps) {
    const [classes, setClasses] = useState<RockClass[]>([]);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [directorEmail, setDirectorEmail] = useState("");
    const [schoolId, setSchoolId] = useState<SchoolId>("del-mar");
    const [className, setClassName] = useState("");
    const [dayOfWeek, setDayOfWeek] = useState("Monday");
    const [time, setTime] = useState("");
    const [instructorEmail, setInstructorEmail] = useState("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
    const [performanceTitle, setPerformanceTitle] = useState("");
    const [performanceDate, setPerformanceDate] = useState("");

    useEffect(() => {
        setClasses(getSavedClasses());
    }, []);

    const schoolUsers = useMemo(() => {
        return users.filter((user) => user.schoolId === schoolId);
    }, [users, schoolId]);

    const directorUsers = useMemo(() => {
        return schoolUsers.filter((user) => user.role === "director");
    }, [schoolUsers]);

    const instructorUsers = useMemo(() => {
        return schoolUsers.filter((user) => user.role === "instructor");
    }, [schoolUsers]);

    const schoolStudents = useMemo(() => {
        return students.filter((student) => student.schoolId === schoolId);
    }, [students, schoolId]);

    function resetForm() {
        setEditingClassId(null);
        setDirectorEmail("");
        setSchoolId("del-mar");
        setClassName("");
        setDayOfWeek("Monday");
        setTime("");
        setInstructorEmail("");
        setSelectedStudentIds([]);
        setSelectedSongs([]);
        setPerformanceTitle("");
        setPerformanceDate("");
    }

    function toggleStudent(studentId: string) {
        setSelectedStudentIds((prev) =>
            prev.includes(studentId)
                ? prev.filter((id) => id !== studentId)
                : [...prev, studentId]
        );
    }

    function toggleSong(songTitle: string) {
        setSelectedSongs((prev) => {
            if (prev.includes(songTitle)) {
                return prev.filter((song) => song !== songTitle);
            }

            if (prev.length >= 5) {
                alert("You can select up to 5 songs only.");
                return prev;
            }

            return [...prev, songTitle];
        });
    }

    async function handleCreateOrUpdateClass() {
    if (!className.trim()) {
        alert("Please enter a class name.");
        return;
    }

    const selectedStudentRecords = students.filter((student) =>
        selectedStudentIds.includes(student.id)
    );

    const classData = {
        id: editingClassId ?? crypto.randomUUID(),
        name: className.trim(),
        school_id: schoolId,
        director_email: directorEmail.trim().toLowerCase(),
        instructor_email: instructorEmail.trim().toLowerCase(),
        day_of_week: dayOfWeek,
        time: time.trim(),
        songs: selectedSongs,
        student_ids: selectedStudentRecords.map((s) => s.id),
        student_names: selectedStudentRecords.map((s) => s.name),
        song_progress: {},
        performance_title: performanceTitle.trim(),
        performance_date: performanceDate,
    };

    const { error } = await supabase
        .from("rock_classes")
        .upsert(classData);

    if (error) {
        console.error("SUPABASE SAVE ERROR:", error);
        alert(`Error saving class: ${error.message}`);
        return;
    }

    // Optional: keep local copy in sync (safe)
    const updatedClasses = getSavedClasses();
    saveClasses(updatedClasses);

    alert("Class saved!");

    resetForm();
}

    function handleEditClass(rockClass: RockClass) {
        setEditingClassId(rockClass.id);
        setDirectorEmail(rockClass.directorEmail ?? "");
        setSchoolId(rockClass.schoolId);
        setClassName(rockClass.name);
        setDayOfWeek(rockClass.dayOfWeek);
        setTime(rockClass.time);
        setInstructorEmail(rockClass.instructorEmail ?? "");
        setSelectedStudentIds(rockClass.studentIds ?? []);
        setSelectedSongs(rockClass.songs ?? []);
        setPerformanceTitle(rockClass.performanceTitle ?? "");
        setPerformanceDate(rockClass.performanceDate ?? "");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function handleDeleteClass(classId: string) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this class?"
        );

        if (!confirmed) return;

        const updatedClasses = classes.filter((rockClass) => rockClass.id !== classId);
        setClasses(updatedClasses);
        saveClasses(updatedClasses);

        if (editingClassId === classId) {
            resetForm();
        }
    }

    return (
        <div className="mt-8 space-y-8">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Class Builder</h2>
                <p className="mt-2 text-zinc-400">
                    Create and manage Rock 101 classes with school, schedule, roster,
                    approved songs, and performance information.
                </p>
            </div>

            <div className="space-y-6 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">
                        {editingClassId ? "Edit Class" : "Create New Class"}
                    </h3>

                    {editingClassId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">School</label>
                        <select
                            value={schoolId}
                            onChange={(e) => {
                                const nextSchoolId = e.target.value as SchoolId;
                                setSchoolId(nextSchoolId);
                                setDirectorEmail("");
                                setInstructorEmail("");
                                setSelectedStudentIds([]);
                            }}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                        >
                            {schools.map((school) => (
                                <option key={school.id} value={school.id}>
                                    {school.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">Class Name</label>
                        <input
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                            placeholder="Tuesday 5pm Rock 101"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                            Class Director
                        </label>

                        <select
                            value={directorEmail}
                            onChange={(e) => setDirectorEmail(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                        >
                            <option value="">Select director</option>

                            {directorUsers.map((user) => (
                                <option key={user.email} value={user.email}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>


                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">Day of Week</label>
                        <select
                            value={dayOfWeek}
                            onChange={(e) => setDayOfWeek(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                        >
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">Time</label>
                        <input
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                            placeholder="5:00 PM"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                            Performance Title
                        </label>
                        <input
                            value={performanceTitle}
                            onChange={(e) => setPerformanceTitle(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                            placeholder="Spring Showcase"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                            Performance Date
                        </label>
                        <input
                            type="date"
                            value={performanceDate}
                            onChange={(e) => setPerformanceDate(e.target.value)}
                            className="w-full rounded-lg border border-zinc-700 bg-black px-4 py-3 text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm text-zinc-400">Select Students</label>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {schoolStudents.map((student) => (
                            <label
                                key={student.id}
                                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black px-4 py-3"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedStudentIds.includes(student.id)}
                                    onChange={() => toggleStudent(student.id)}
                                />
                                <span>{student.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm text-zinc-400">Approved Songs</label>
                        <span className="text-sm text-zinc-500">
                            {selectedSongs.length}/5 selected
                        </span>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {approvedSongs.map((song) => (
                            <label
                                key={song}
                                className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-black px-4 py-3"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedSongs.includes(song)}
                                    onChange={() => toggleSong(song)}
                                />
                                <span>{song}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleCreateOrUpdateClass}
                    className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-500"
                >
                    {editingClassId ? "Save Changes" : "Create Class"}
                </button>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="text-xl font-semibold">Saved Classes</h3>

                {classes.length === 0 ? (
                    <p className="mt-4 text-zinc-400">No classes created yet.</p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {classes.map((rockClass) => {
                            const instructorName =
                                users.find((user) => user.email === rockClass.instructorEmail)
                                    ?.name ?? rockClass.instructorEmail;

                            const schoolName =
                                schools.find((school) => school.id === rockClass.schoolId)?.name ??
                                rockClass.schoolId;

                            return (
                                <div
                                    key={rockClass.id}
                                    onClick={() => handleEditClass(rockClass)}
                                    className="cursor-pointer rounded-lg border border-zinc-800 bg-black p-4 transition hover:border-red-500"
                                >
                                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                        <div>
                                            <div className="text-lg font-bold">{rockClass.name}</div>
                                            <div className="mt-2 text-sm text-zinc-400">
                                                School: {schoolName}
                                            </div>
                                            <div className="mt-2 text-sm text-zinc-400">
                                                {rockClass.dayOfWeek} · {rockClass.time || "Time not set"}
                                            </div>
                                            <div className="mt-2 text-sm text-zinc-400">
                                                Instructor: {instructorName || "Not assigned"}
                                            </div>
                                            <div className="mt-2 text-sm text-zinc-400">
                                                Performance: {rockClass.performanceTitle || "Not set"}
                                                {rockClass.performanceDate
                                                    ? ` · ${rockClass.performanceDate}`
                                                    : ""}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditClass(rockClass);
                                                }}
                                                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
                                            >
                                                Edit
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteClass(rockClass.id);
                                                }}
                                                className="rounded-lg bg-red-700 px-4 py-2 text-sm text-white hover:bg-red-600"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-white">Students</div>
                                        <div className="mt-2 text-sm text-zinc-300">
                                            {rockClass.studentNames.length > 0
                                                ? rockClass.studentNames.join(", ")
                                                : "No students assigned"}
                                        </div>
                                    </div>

                                    <div className="mt-4">
                                        <div className="text-sm font-semibold text-white">Songs</div>
                                        <div className="mt-2 text-sm text-zinc-300">
                                            {rockClass.songs.length > 0
                                                ? rockClass.songs.join(", ")
                                                : "No songs assigned"}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}