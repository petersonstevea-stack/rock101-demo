"use client";

import { useMemo, useState } from "react";

import LoginScreen from "@/components/LoginScreen";
import AppHeader from "@/components/AppHeader";
import StudentSelector from "@/components/StudentSelector";
import PrivateLessonView from "@/components/PrivateLessonView";
import GroupRehearsalView from "@/components/GroupRehearsalView";
import BadgeGrid from "@/components/BadgeGrid";
import ParentWeeklyReview from "@/components/ParentWeeklyReview";
import NotesPanel from "@/components/NotesPanel";
import WorkflowBanner from "@/components/WorkflowBanner";
import BandsDashboard from "@/components/BandsDashboard";
import PipelineView from "@/components/PipelineView";
import CertificateView from "@/components/CertificateView";

import { students as initialStudents } from "@/data/students";
import { getEarnedBadges } from "@/lib/progress";

type Role = "student" | "instructor" | "director" | null;

type Tab =
  | "privateLesson"
  | "groupRehearsal"
  | "badges"
  | "parent"
  | "certificate"
  | "bandsDashboard"
  | "pipeline";

export default function Rock101App() {
  const [role, setRole] = useState<Role>(null);
  const [tab, setTab] = useState<Tab>("privateLesson");
  const [students, setStudents] = useState(initialStudents);
  const [selectedStudentName, setSelectedStudentName] = useState(
    initialStudents[0].name
  );

  const selectedStudent = useMemo(() => {
    return (
      students.find((student) => student.name === selectedStudentName) ??
      students[0]
    );
  }, [students, selectedStudentName]);

  const earnedBadges = useMemo(() => {
    return getEarnedBadges(selectedStudent);
  }, [selectedStudent]);

  const workflowReady =
    selectedStudent.workflow.instructorSubmitted &&
    selectedStudent.workflow.directorSubmitted &&
    !selectedStudent.workflow.parentSubmitted;

  function handleSelectStudent(studentName: string) {
    setSelectedStudentName(studentName);
  }

  function updateSelectedStudent(
    updater: (student: (typeof students)[number]) => (typeof students)[number]
  ) {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.name !== selectedStudentName) return student;
        return updater(student);
      })
    );
  }

  function handleToggleDone(item: string) {
    updateSelectedStudent((student) => {
      const existing = student.curriculum[item];

      return {
        ...student,
        curriculum: {
          ...student.curriculum,
          [item]: {
            ...existing,
            done: !existing.done,
          },
        },
        workflow: {
          ...student.workflow,
          instructorSubmitted:
            role === "instructor"
              ? false
              : student.workflow.instructorSubmitted,
          directorSubmitted:
            role === "director" ? false : student.workflow.directorSubmitted,
          parentSubmitted: false,
        },
      };
    });
  }

  function handleToggleSigned(item: string) {
    updateSelectedStudent((student) => {
      const existing = student.curriculum[item];
      const nextSigned = !existing.signed;

      return {
        ...student,
        curriculum: {
          ...student.curriculum,
          [item]: {
            ...existing,
            done: nextSigned ? true : existing.done,
            signed: nextSigned,
            date: nextSigned ? new Date().toLocaleDateString() : null,
          },
        },
        workflow: {
          ...student.workflow,
          instructorSubmitted:
            role === "instructor"
              ? false
              : student.workflow.instructorSubmitted,
          directorSubmitted:
            role === "director" ? false : student.workflow.directorSubmitted,
          parentSubmitted: false,
        },
      };
    });
  }

  function handleAddFistBump(item: string) {
    updateSelectedStudent((student) => {
      const existing = student.curriculum[item];

      return {
        ...student,
        curriculum: {
          ...student.curriculum,
          [item]: {
            ...existing,
            fistBumps: (existing.fistBumps || 0) + 1,
          },
        },
        workflow: {
          ...student.workflow,
          directorSubmitted: false,
          parentSubmitted: false,
        },
      };
    });
  }

  function handleNoteChange(
    roleType: "instructor" | "director",
    value: string
  ) {
    updateSelectedStudent((student) => ({
      ...student,
      notes: {
        ...student.notes,
        [roleType]: value,
      },
      workflow: {
        ...student.workflow,
        instructorSubmitted:
          roleType === "instructor"
            ? false
            : student.workflow.instructorSubmitted,
        directorSubmitted:
          roleType === "director"
            ? false
            : student.workflow.directorSubmitted,
        parentSubmitted: false,
      },
    }));
  }

  function handleSaveFeedback(roleType: "instructor" | "director") {
    updateSelectedStudent((student) => ({
      ...student,
      workflow: {
        ...student.workflow,
        instructorSubmitted:
          roleType === "instructor"
            ? true
            : student.workflow.instructorSubmitted,
        directorSubmitted:
          roleType === "director"
            ? true
            : student.workflow.directorSubmitted,
      },
    }));
  }

  function handleSubmitToParents() {
    updateSelectedStudent((student) => ({
      ...student,
      workflow: {
        ...student.workflow,
        parentSubmitted: true,
      },
    }));
  }

  if (!role) {
    return <LoginScreen onSelectRole={setRole} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader
        role={role}
        studentName={selectedStudent.name}
        onLogout={() => setRole(null)}
      />

      <div className="p-6">
        {(role === "instructor" || role === "director") && (
          <StudentSelector
            students={students}
            selected={selectedStudent}
            onSelect={(student) => handleSelectStudent(student.name)}
          />
        )}

        {(role === "instructor" || role === "director") && (
          <WorkflowBanner
            ready={workflowReady}
            submitted={selectedStudent.workflow.parentSubmitted}
            studentName={selectedStudent.name}
            onSubmit={handleSubmitToParents}
          />
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTab("privateLesson")}
            className={`rounded-lg px-4 py-2 ${
              tab === "privateLesson"
                ? "bg-red-600"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            Private Lesson
          </button>

          <button
            type="button"
            onClick={() => setTab("groupRehearsal")}
            className={`rounded-lg px-4 py-2 ${
              tab === "groupRehearsal"
                ? "bg-red-600"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            Group Rehearsal
          </button>

          <button
            type="button"
            onClick={() => setTab("badges")}
            className={`rounded-lg px-4 py-2 ${
              tab === "badges"
                ? "bg-red-600"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            Badges
          </button>

          <button
            type="button"
            onClick={() => setTab("parent")}
            className={`rounded-lg px-4 py-2 ${
              tab === "parent"
                ? "bg-red-600"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            Parent
          </button>

          <button
            type="button"
            onClick={() => setTab("certificate")}
            className={`rounded-lg px-4 py-2 ${
              tab === "certificate"
                ? "bg-red-600"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            Certificate
          </button>

          {role === "director" && (
            <>
              <button
                type="button"
                onClick={() => setTab("bandsDashboard")}
                className={`rounded-lg px-4 py-2 ${
                  tab === "bandsDashboard"
                    ? "bg-red-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                Bands Dashboard
              </button>

              <button
                type="button"
                onClick={() => setTab("pipeline")}
                className={`rounded-lg px-4 py-2 ${
                  tab === "pipeline"
                    ? "bg-red-600"
                    : "bg-zinc-800 hover:bg-zinc-700"
                }`}
              >
                Pipeline
              </button>
            </>
          )}
        </div>

        {tab === "privateLesson" && (
          <>
            <PrivateLessonView
              student={selectedStudent}
              onToggleDone={handleToggleDone}
              onToggleSigned={handleToggleSigned}
              canEdit={role === "instructor"}
              canSign={role === "instructor"}
            />

            {role === "instructor" && (
              <NotesPanel
                role="instructor"
                value={selectedStudent.notes.instructor}
                saved={selectedStudent.workflow.instructorSubmitted}
                onChange={(v) => handleNoteChange("instructor", v)}
                onSave={() => handleSaveFeedback("instructor")}
              />
            )}
          </>
        )}

        {tab === "groupRehearsal" && (
          <>
            <GroupRehearsalView
              student={selectedStudent}
              onToggleDone={handleToggleDone}
              onToggleSigned={handleToggleSigned}
              onAddFistBump={handleAddFistBump}
              canEdit={role === "director"}
              canSign={role === "director"}
            />

            {role === "director" && (
              <NotesPanel
                role="director"
                value={selectedStudent.notes.director}
                saved={selectedStudent.workflow.directorSubmitted}
                onChange={(v) => handleNoteChange("director", v)}
                onSave={() => handleSaveFeedback("director")}
              />
            )}
          </>
        )}

        {tab === "badges" && <BadgeGrid earnedBadges={earnedBadges} />}

        {tab === "parent" && (
          <ParentWeeklyReview student={selectedStudent} />
        )}

        {tab === "certificate" && (
          <CertificateView student={selectedStudent} />
        )}

        {tab === "bandsDashboard" && role === "director" && (
          <BandsDashboard students={students} />
        )}

        {tab === "pipeline" && role === "director" && (
          <PipelineView students={students} />
        )}
      </div>
    </div>
  );
}