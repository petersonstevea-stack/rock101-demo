"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { approvedSongs } from "@/data/songLibrary";

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

type Student = { id: string; name: string };
type StaffUser = { email: string; name: string };

function ClassSetupPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const classId = searchParams.get("classId");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [allClasses, setAllClasses] = useState<{ id: string; student_ids: string[] }[]>([]);

  const [className, setClassName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [time, setTime] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [performanceDate, setPerformanceDate] = useState("");

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      const authEmail = authData?.user?.email?.trim().toLowerCase();
      if (!authEmail) {
        router.push("/");
        return;
      }

      const { data: staffRow } = await supabase
        .from("staff")
        .select("school_slug")
        .eq("email", authEmail)
        .limit(1)
        .single();
      const schoolSlug = staffRow?.school_slug ?? "";

      const { data: schoolsData } = await supabase
        .from("schools")
        .select("id, name")
        .eq("is_sandbox", false)
        .order("name");

      const normalizeToSlug = (name: string) =>
        name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      const matchedSchool = (schoolsData ?? []).find(
        (s) => normalizeToSlug(s.name) === schoolSlug
      );
      const resolvedSchoolId = matchedSchool?.id ?? "";
      setSchoolId(resolvedSchoolId);

      const [studentsResult, staffResult, classesResult] = await Promise.all([
        supabase
          .from("students")
          .select("id, first_name, last_initial, school_id")
          .eq("program", "rock101"),
        supabase
          .from("staff")
          .select("email, name")
          .eq("school_slug", schoolSlug),
        supabase
          .from("rock_classes")
          .select("id, student_ids")
          .eq("school_id", resolvedSchoolId),
      ]);

      setStudents(
        (studentsResult.data ?? [])
          .filter((s: any) => s.school_id === resolvedSchoolId)
          .map((s: any) => ({
            id: s.id,
            name: `${s.first_name} ${s.last_initial ?? ""}`.trim(),
          }))
      );

      setStaffUsers(
        (staffResult.data ?? []).map((u: any) => ({
          email: u.email,
          name: u.name,
        }))
      );

      setAllClasses(
        (classesResult.data ?? []).map((c: any) => ({
          id: c.id,
          student_ids: c.student_ids ?? [],
        }))
      );

      if (classId) {
        const { data: classRow } = await supabase
          .from("rock_classes")
          .select("*")
          .eq("id", classId)
          .single();

        if (classRow) {
          setClassName(classRow.name ?? "");
          setDirectorEmail(classRow.director_email ?? "");
          setDayOfWeek(classRow.day_of_week ?? "Monday");
          setTime(classRow.time ?? "");
          setSelectedStudentIds(classRow.student_ids ?? []);
          setSelectedSongs(classRow.songs ?? []);
          setPerformanceDate(classRow.performance_date ?? "");
        }
      }

      setLoading(false);
    }

    init();
  }, [classId]);

  const enrolledElsewhere = useMemo(() => {
    const ids = new Set<string>();
    for (const cls of allClasses) {
      if (cls.id === classId) continue;
      for (const id of cls.student_ids) ids.add(id);
    }
    return ids;
  }, [allClasses, classId]);

  const availableStudents = students.filter(
    (s) => !enrolledElsewhere.has(s.id) || selectedStudentIds.includes(s.id)
  );

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSong(song: string) {
    setSelectedSongs((prev) => {
      if (prev.includes(song)) return prev.filter((s) => s !== song);
      if (prev.length >= 5) {
        alert("You can select up to 5 songs only.");
        return prev;
      }
      return [...prev, song];
    });
  }

  async function handleSave() {
    if (!className.trim()) {
      alert("Please enter a class name.");
      return;
    }
    setSaving(true);

    const selectedStudentRecords = students.filter((s) =>
      selectedStudentIds.includes(s.id)
    );

    const payload = {
      id: classId ?? crypto.randomUUID(),
      name: className.trim(),
      school_id: schoolId,
      director_email: directorEmail.trim().toLowerCase(),
      day_of_week: dayOfWeek,
      time: time.trim(),
      songs: selectedSongs,
      student_ids: selectedStudentRecords.map((s) => s.id),
      student_names: selectedStudentRecords.map((s) => s.name),
      song_progress: {},
      performance_date: performanceDate || null,
    };

    const { error } = await supabase
      .from("rock_classes")
      .upsert(payload, { onConflict: "id" });

    setSaving(false);

    if (error) {
      console.error("Save error:", error);
      alert(`Error saving class: ${error.message}`);
      return;
    }

    router.push("/");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-none bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">
            {classId ? "Edit Class" : "Create Class"}
          </h1>
        </div>

        <div className="space-y-6 rounded-none border border-zinc-800 bg-zinc-900 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Class Name
              </label>
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
                value={directorEmail}
                onChange={(e) => setDirectorEmail(e.target.value)}
                className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white"
              >
                <option value="">Select instructor</option>
                {staffUsers.map((u) => (
                  <option key={u.email} value={u.email}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-zinc-400">
                Day of Week
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-white"
              >
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  )
                )}
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
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
            <label className="mb-2 block text-sm text-zinc-400">
              Select Students
            </label>
            {availableStudents.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No students available for this school.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {availableStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex cursor-pointer items-center gap-3 rounded-none border border-zinc-800 bg-black px-4 py-3"
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
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm text-zinc-400">
                Approved Songs
              </label>
              <span className="text-sm text-zinc-500">
                {selectedSongs.length}/5 selected
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {approvedSongs.map((song) => (
                <label
                  key={song}
                  className="flex cursor-pointer items-center gap-3 rounded-none border border-zinc-800 bg-black px-4 py-3"
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
            onClick={handleSave}
            disabled={saving}
            className="rounded-none bg-[#cc0000] px-5 py-3 font-semibold text-white hover:bg-[#b30000] disabled:opacity-50"
          >
            {saving ? "Saving…" : classId ? "Save Changes" : "Create Class"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClassSetupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          Loading…
        </div>
      }
    >
      <ClassSetupPageInner />
    </Suspense>
  );
}
