"use client";

import { useEffect, useMemo, useState } from "react";

function generateTimeOptions(): string[] {
    const options: string[] = [];
    for (let hour = 8; hour <= 22; hour++) {
        for (let min = 0; min < 60; min += 15) {
            if (hour === 22 && min > 0) break;
            const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
            const ampm = hour >= 12 ? "PM" : "AM";
            const minStr = min === 0 ? "00" : String(min);
            options.push(`${h12}:${minStr} ${ampm}`);
        }
    }
    return options;
}

const TIME_OPTIONS = generateTimeOptions();
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

import { RockClass } from "@/types/class";
import { approvedSongs } from "@/data/songLibrary";
import { AppUser } from "@/types/user";
import { supabase } from "@/lib/supabaseClient";

type Student = {
    id: string;
    name: string;
    schoolId: string;
};

type ClassSetupViewProps = {
    students: Student[];
    users?: AppUser[];
    mode?: "create" | "edit";
    classToEdit?: RockClass | null;
    onClassSaved?: () => void;
    defaultSchoolId?: string;
};

export default function ClassSetupView({
    students,
    users = [],
    mode = "create",
    classToEdit = null,
    onClassSaved,
    defaultSchoolId,
}: ClassSetupViewProps) {

    const [classes, setClasses] = useState<RockClass[]>([]);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [classInstructorEmail, setClassInstructorEmail] = useState("");
    const [schoolList, setSchoolList] = useState<{ id: string; name: string }[]>([]);
    const [schoolId, setSchoolId] = useState<string>(defaultSchoolId ?? "");
    const [className, setClassName] = useState("");
    const [dayOfWeek, setDayOfWeek] = useState("Monday");
    const [time, setTime] = useState("");
    const [firstSessionDate, setFirstSessionDate] = useState("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
    const [performanceTitle, setPerformanceTitle] = useState("");
    const [performanceDate, setPerformanceDate] = useState("");
    const [saveMessage, setSaveMessage] = useState("");
    const [saving, setSaving] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");

    useEffect(() => {
        if (mode !== "edit" || !classToEdit) {
            resetForm();
            return;
        }

        setEditingClassId(classToEdit.id);
        setClassInstructorEmail(classToEdit.classInstructorEmail ?? "");
        setSchoolId(classToEdit.schoolId);
        setClassName(classToEdit.name);
        setDayOfWeek(classToEdit.dayOfWeek);
        setTime(classToEdit.time ?? "");
        setFirstSessionDate("");
        setSelectedStudentIds(classToEdit.studentIds ?? []);
        setSelectedSongs(classToEdit.songs ?? []);
        setPerformanceTitle(classToEdit.performanceTitle ?? "");
        setPerformanceDate(classToEdit.performanceDate ?? "");
        setSaveMessage("");
    }, [mode, classToEdit?.id]);

    useEffect(() => {
        supabase
            .from("schools")
            .select("id, name")
            .eq("is_sandbox", false)
            .order("name")
            .then(({ data }) => {
                if (data) {
                    setSchoolList(data);
                    if (defaultSchoolId) {
                        const normalize = (name: string) =>
                            name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                        const match = data.find(
                            (s) => s.id === defaultSchoolId || normalize(s.name) === defaultSchoolId
                        );
                        setSchoolId(match?.id ?? defaultSchoolId);
                    } else if (!schoolId) {
                        setSchoolId(data[0]?.id ?? "");
                    }
                }
            });
    }, []);

    useEffect(() => {
        if (defaultSchoolId) {
            setSchoolId(defaultSchoolId);
        }
    }, [defaultSchoolId]);

    useEffect(() => {
        async function loadClasses() {
            if (!schoolId) return;

            console.log("[ClassSetupView] loadClasses schoolId:", schoolId);

            const { data, error } = await supabase
                .from("rock_classes")
                .select("*")
                .eq("school_id", schoolId);

            if (error) {
                console.error("Error loading classes:", error);
                return;
            }

            const loaded: RockClass[] = (data ?? []).map((c: any) => ({
                id: c.id,
                schoolId: c.school_id ?? "",
                name: c.name ?? "Unnamed Class",
                dayOfWeek: c.day_of_week ?? "Monday",
                time: c.time ?? "",
                classInstructorEmail: c.class_instructor_email ?? "",
                instructorEmail: c.instructor_email ?? "",
                studentIds: c.student_ids ?? [],
                studentNames: c.student_names ?? [],
                songs: c.songs ?? [],
                songProgress: c.song_progress ?? {},
                performanceTitle: c.performance_title ?? "",
                performanceDate: c.performance_date ?? "",
            }));

            setClasses(loaded);
        }

        loadClasses();
    }, [schoolId]);

    const schoolUsers = useMemo(() => {
        return users.filter((user) => {
            return user.schoolId === schoolId;
        });
    }, [users, schoolId]);

    const classInstructorUsers = useMemo(() => {
        return schoolUsers;
    }, [schoolUsers]);

    const schoolStudents = useMemo(() => {
        return students.filter((student) => student.schoolId === schoolId);
    }, [students, schoolId]);

    const enrolledElsewhere = useMemo(() => {
        const ids = new Set<string>();
        classes.forEach((cls) => {
            if (cls.id === editingClassId) return;
            cls.studentIds?.forEach((id) => ids.add(id));
        });
        return ids;
    }, [classes, editingClassId]);

    const availableStudents = schoolStudents.filter(
        (s) => !enrolledElsewhere.has(s.id)
    );

    const filteredClasses = classes
        .filter((c) => c.schoolId === schoolId)
        .filter(
            (rockClass, index, arr) =>
                arr.findIndex((c) => c.id === rockClass.id) === index
        );

    const firstSessionPreview = useMemo(() => {
        if (!firstSessionDate) return null;
        const d = new Date(firstSessionDate + "T00:00:00");
        const dayName = DAY_NAMES[d.getDay()];
        const formatted = d.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
        });
        const timePart = time ? ` at ${time}` : "";
        return `${dayName}s${timePart} — generating 104 sessions from ${formatted}`;
    }, [firstSessionDate, time]);

    function resetForm() {
        setEditingClassId(null);
        setClassInstructorEmail("");
        setSchoolId(defaultSchoolId ?? schoolList[0]?.id ?? "");
        setClassName("");
        setDayOfWeek("Monday");
        setTime("");
        setFirstSessionDate("");
        setSelectedStudentIds([]);
        setSelectedSongs([]);
        setPerformanceTitle("");
        setPerformanceDate("");
        setSaveMessage("");
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

        if (mode === "create" && !firstSessionDate) {
            alert("Please select a First Session Date.");
            return;
        }

        setSaving(true);
        setSaveMessage("");

        // Derive day_of_week from firstSessionDate if provided
        const derivedDayOfWeek = firstSessionDate
            ? DAY_NAMES[new Date(firstSessionDate + "T00:00:00").getDay()]
            : dayOfWeek;

        const selectedStudentRecords = students.filter((student) =>
            selectedStudentIds.includes(student.id)
        );

        const classId = mode === "edit" && classToEdit
            ? classToEdit.id
            : crypto.randomUUID();

        const supabaseClassData = {
            id: classId,
            name: className.trim(),
            school: schoolId,
            school_id: schoolId,
            class_instructor_email: classInstructorEmail.trim().toLowerCase(),
            day_of_week: derivedDayOfWeek,
            time: time.trim(),
            songs: selectedSongs,
            student_ids: selectedStudentRecords.map((s) => s.id),
            student_names: selectedStudentRecords.map((s) => s.name),
            song_progress: {},
            performance_title: performanceTitle.trim(),
            performance_date: performanceDate || null,
        };

        const { error } = await supabase
            .from("rock_classes")
            .upsert(supabaseClassData, { onConflict: "id" });

        if (error) {
            console.error("SUPABASE SAVE ERROR:", error);
            alert(`Error saving class: ${error.message}`);
            setSaving(false);
            return;
        }

        // Generate 104 weekly sessions if firstSessionDate is set
        let sessionMessage = "";
        if (firstSessionDate) {
            const sessionDates: string[] = [];
            for (let i = 0; i < 104; i++) {
                const d = new Date(firstSessionDate + "T00:00:00");
                d.setDate(d.getDate() + i * 7);
                sessionDates.push(d.toISOString().slice(0, 10));
            }

            const batchSize = 20;
            for (let i = 0; i < sessionDates.length; i += batchSize) {
                const batch = sessionDates.slice(i, i + batchSize);
                const { error: batchError } = await supabase.from("class_sessions").upsert(
                    batch.map((date) => ({
                        class_id: classId,
                        session_date: date,
                        status: "scheduled",
                    })),
                    { onConflict: "class_id,session_date" }
                );
                if (batchError) {
                    console.error("Session batch error:", batchError);
                    setSaving(false);
                    setSaveMessage("Class saved but session generation failed: " + batchError.message);
                    return;
                }
            }

            const formattedStart = new Date(firstSessionDate + "T00:00:00").toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric", year: "numeric" }
            );
            sessionMessage = ` · 104 sessions generated from ${formattedStart}`;
        }

        setSaving(false);
        setSaveMessage(`Class saved${sessionMessage}`);

        resetForm();

        if (onClassSaved) {
            onClassSaved();
            return;
        }

        const localClassData: RockClass = {
            id: classId,
            schoolId,
            name: className.trim(),
            dayOfWeek: derivedDayOfWeek,
            time: time.trim(),
            classInstructorEmail: classInstructorEmail.trim().toLowerCase(),
            instructorEmail: "",
            studentIds: selectedStudentRecords.map((student) => student.id),
            studentNames: selectedStudentRecords.map((student) => student.name),
            songs: selectedSongs,
            songProgress: {},
            performanceTitle: performanceTitle.trim(),
            performanceDate,
        };

        let updatedClasses: RockClass[];

        if (editingClassId) {
            updatedClasses = classes.map((rockClass) =>
                rockClass.id === editingClassId ? localClassData : rockClass
            );
        } else {
            updatedClasses = [...classes, localClassData];
        }

        setClasses(updatedClasses);
    }

    function handleEditClass(rockClass: RockClass) {
        setEditingClassId(rockClass.id);
        setClassInstructorEmail(rockClass.classInstructorEmail ?? "");
        setSchoolId(rockClass.schoolId);
        setClassName(rockClass.name);
        setDayOfWeek(rockClass.dayOfWeek);
        setTime(rockClass.time ?? "");
        setFirstSessionDate("");
        setSelectedStudentIds(rockClass.studentIds ?? []);
        setSelectedSongs(rockClass.songs ?? []);
        setPerformanceTitle(rockClass.performanceTitle ?? "");
        setPerformanceDate(rockClass.performanceDate ?? "");
        setSaveMessage("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function handleDeleteClass(classId: string) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this class?"
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("rock_classes")
            .delete()
            .eq("id", classId);

        if (error) {
            console.error("SUPABASE DELETE CLASS ERROR:", error);
            alert(`Error deleting class: ${error.message}`);
            return;
        }

        const updatedClasses = classes.filter((rockClass) => rockClass.id !== classId);
        setClasses(updatedClasses);

        if (editingClassId === classId) {
            resetForm();
        }

        alert("Class deleted.");
    }

    return (
        <div className="mt-8 space-y-8">
            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold">Class Builder</h2>
                <p className="mt-2 text-zinc-400">
                    Create and manage Rock 101 classes with school, schedule, roster,
                    approved songs, and performance information.
                </p>
            </div>

            <div className="space-y-6 rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-semibold">
                        {editingClassId ? "Edit Class" : "Create New Class"}
                    </h3>

                    {editingClassId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="rounded-none bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
                        >
                            Cancel Edit
                        </button>
                    )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">Class Name</label>
                        <input
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white"
                            placeholder="Tuesday 5pm Rock 101"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                            Class Instructor
                        </label>

                        <select
                            value={classInstructorEmail}
                            onChange={(e) => setClassInstructorEmail(e.target.value)}
                            className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white"
                        >
                            <option value="">Select instructor</option>

                            {classInstructorUsers.map((user) => (
                                <option key={user.email} value={user.email}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">Time</label>
                        <select
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white"
                        >
                            <option value="">Select time</option>
                            {TIME_OPTIONS.map((t) => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                            First Session Date
                        </label>
                        <input
                            type="date"
                            value={firstSessionDate}
                            onChange={(e) => setFirstSessionDate(e.target.value)}
                            className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white"
                        />
                        {firstSessionPreview && (
                            <p className="mt-2 text-sm text-zinc-400">{firstSessionPreview}</p>
                        )}
                    </div>

                    <div>
                        <label className="mb-2 block text-sm text-zinc-400">
                            Performance Date
                        </label>
                        <input
                            type="date"
                            value={performanceDate}
                            onChange={(e) => setPerformanceDate(e.target.value)}
                            className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white"
                        />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm text-zinc-400">Select Students</label>
                    <div className="relative mb-3">
                        <input
                            type="text"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            placeholder="Search students..."
                            className="w-full rounded-none border border-zinc-700 bg-black px-4 py-2 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                        />
                        {studentSearch && (
                            <button
                                type="button"
                                onClick={() => setStudentSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                        {availableStudents.filter((student) => {
                            if (!studentSearch.trim()) return true;
                            const q = studentSearch.toLowerCase();
                            return student.name.toLowerCase().includes(q);
                        }).map((student) => (
                            <label
                                key={student.id}
                                className="flex items-center gap-3 rounded-none border border-zinc-800 bg-black px-4 py-3"
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
                                className="flex items-center gap-3 rounded-none border border-zinc-800 bg-black px-4 py-3"
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

                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={handleCreateOrUpdateClass}
                        disabled={saving}
                        className="rounded-none bg-[#cc0000] px-5 py-3 font-semibold text-white hover:bg-[#b30000] disabled:opacity-50"
                    >
                        {saving ? "Saving…" : editingClassId ? "Save Changes" : "Create Class"}
                    </button>

                    {saveMessage && (
                        <span className="text-sm text-zinc-300">{saveMessage}</span>
                    )}
                </div>
            </div>

            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="text-xl font-semibold">Saved Classes</h3>

                {filteredClasses.length === 0 ? (
                    <p className="mt-4 text-zinc-400">No classes created yet.</p>
                ) : (
                    <div className="mt-4 space-y-4">
                        {filteredClasses.map((rockClass) => {
                            const instructorName =
                                users.find((user) => user.email === rockClass.instructorEmail)
                                    ?.name ?? rockClass.instructorEmail;

                            const schoolName =
                                schoolList.find((school) => school.id === rockClass.schoolId)?.name ??
                                rockClass.schoolId;

                            return (
                                <div
                                    key={rockClass.id}
                                    onClick={() => handleEditClass(rockClass)}
                                    className="cursor-pointer rounded-none border border-zinc-800 bg-black p-4 transition hover:border-[#cc0000]"
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
                                                className="rounded-none bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
                                            >
                                                Edit
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
