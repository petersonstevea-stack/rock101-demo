"use client";

import { useEffect, useMemo, useState } from "react";

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
import ClassSetupView from "@/components/ClassSetupView";
import DirectorAccountsView from "@/components/DirectorAccountsView";
import AdminView from "@/components/AdminView";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import ClassSelectorView from "@/components/ClassSelectorView";
import ClassDetailView from "@/components/ClassDetailView";

import { students as initialStudents } from "@/data/students";
import { getEarnedBadges } from "@/lib/progress";
import { getSavedClasses } from "@/lib/classes";
import {
  saveSession,
  getSavedSession,
  clearSavedSession,
  getAllUsers,
  saveSelectedTab,
  getSavedTab,
  clearSavedTab,
  SessionUser,
} from "@/lib/session";

type Tab =
  | "privateLesson"
  | "groupRehearsal"
  | "badges"
  | "parent"
  | "certificate"
  | "classSetup"
  | "performanceDashboard"
  | "bandsDashboard"
  | "pipeline"
  | "accounts"
  | "admin";

export default function Rock101App() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [instructorStudentFilter, setInstructorStudentFilter] = useState<
    "myStudents" | "allStudents"
  >("myStudents");
  const [tab, setTab] = useState<Tab>("privateLesson");
  const [students, setStudents] = useState(initialStudents);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState(
    initialStudents[0]?.name ?? ""
  );

  useEffect(() => {
    const savedUser = getSavedSession();
    const savedTab = getSavedTab();

    if (savedUser) {
      setCurrentUser(savedUser);
    }

    if (savedTab) {
      setTab(savedTab as Tab);
    }
  }, []);

  const role = currentUser?.role ?? null;
  const canManageRock101 =
    role === "director" || role === "generalManager";
  const isGeneralManager = role === "generalManager";

  const savedClasses = getSavedClasses();

  const selectedClass =
    savedClasses.find((rockClass) => rockClass.id === selectedClassId) ?? null;

  const studentsInSelectedClass = selectedClass
    ? students.filter((student) =>
        selectedClass.studentNames.includes(student.name)
      )
    : [];

  const visibleStudents = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === "parent") {
      return students.filter(
        (student) =>
          student.parentEmail?.toLowerCase() === currentUser.email.toLowerCase()
      );
    }

    if (currentUser.role === "instructor") {
      return students;
    }

    if (canManageRock101) {
      if (selectedClass) {
        return studentsInSelectedClass;
      }

      return [];
    }

    return students;
  }, [currentUser, students, canManageRock101, selectedClass, studentsInSelectedClass]);

  const selectedStudent = useMemo(() => {
    return (
      visibleStudents.find((student) => student.name === selectedStudentName) ??
      visibleStudents[0]
    );
  }, [visibleStudents, selectedStudentName]);

  useEffect(() => {
    if (
      currentUser?.role === "instructor" &&
      !selectedStudent &&
      visibleStudents.length > 0
    ) {
      setSelectedStudentName(visibleStudents[0].name);
    }
  }, [currentUser, selectedStudent, visibleStudents]);

  const earnedBadges = selectedStudent ? getEarnedBadges(selectedStudent) : [];

  const workflowReady = selectedStudent
    ? selectedStudent.workflow.instructorSubmitted &&
      selectedStudent.workflow.directorSubmitted &&
      !selectedStudent.workflow.parentSubmitted
    : false;

  function handleSetTab(nextTab: Tab) {
    setTab(nextTab);
    saveSelectedTab(nextTab);
  }

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
            canManageRock101 ? false : student.workflow.directorSubmitted,
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
            canManageRock101 ? false : student.workflow.directorSubmitted,
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

  function handleLogout() {
    clearSavedSession();
    clearSavedTab();
    setCurrentUser(null);
    setSelectedClassId(null);
    setSelectedStudentName(initialStudents[0]?.name ?? "");
    setInstructorStudentFilter("myStudents");
    setTab("privateLesson");
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          saveSession(user);
          setCurrentUser(user);
        }}
      />
    );
  }

  if (
    (role === "parent" || role === "instructor") &&
    visibleStudents.length === 0
  ) {
    return (
      <div className="min-h-screen bg-black text-white">
        <AppHeader
          role={role}
          studentName="No student assigned"
          userName={currentUser.name}
          userEmail={currentUser.email}
          onLogout={handleLogout}
        />

        <div className="p-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-xl font-bold">No student found</h2>
            {role === "instructor" ? (
              <p className="mt-3 text-zinc-300">
                No students are currently visible in this instructor view.
              </p>
            ) : (
              <>
                <p className="mt-3 text-zinc-300">
                  No student is currently linked to this email address:
                </p>
                <p className="mt-2 font-semibold text-white">
                  {currentUser.email}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <AppHeader
        role={role}
        studentName={
          selectedStudent?.name ??
          (selectedClass ? selectedClass.name : "No student selected")
        }
        userName={currentUser.name}
        userEmail={currentUser.email}
        onLogout={handleLogout}
      />

      <div className="p-6">
        {role === "instructor" && (
          <div className="mb-4 flex gap-3">
            <button
              type="button"
              onClick={() => setInstructorStudentFilter("myStudents")}
              className={`rounded-lg px-4 py-2 ${
                instructorStudentFilter === "myStudents"
                  ? "bg-red-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              My Students
            </button>

            <button
              type="button"
              onClick={() => setInstructorStudentFilter("allStudents")}
              className={`rounded-lg px-4 py-2 ${
                instructorStudentFilter === "allStudents"
                  ? "bg-red-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              All Students
            </button>
          </div>
        )}

        {role === "instructor" &&
          instructorStudentFilter === "myStudents" &&
          visibleStudents.length === 0 && (
            <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
              No students are currently assigned to you. Switch to All Students
              to view everyone.
            </div>
          )}

        {role === "instructor" && selectedStudent && (
          <StudentSelector
            students={visibleStudents}
            selected={selectedStudent}
            onSelect={(student) => handleSelectStudent(student.name)}
          />
        )}

        {selectedStudent &&
          (role === "instructor" || canManageRock101) && (
            <WorkflowBanner
              ready={workflowReady}
              submitted={selectedStudent.workflow.parentSubmitted}
              studentName={selectedStudent.name}
              onSubmit={handleSubmitToParents}
            />
          )}

        {canManageRock101 && !selectedClass && (
          <ClassSelectorView
            classes={savedClasses}
            users={getAllUsers()}
            onSelectClass={(classId) => {
              setSelectedClassId(classId);
              setSelectedStudentName("");
            }}
          />
        )}

        {canManageRock101 && selectedClass && !selectedStudentName && (
          <ClassDetailView
            rockClass={selectedClass}
            students={studentsInSelectedClass}
            users={getAllUsers()}
            onBackToClasses={() => {
              setSelectedClassId(null);
              setSelectedStudentName("");
            }}
            onSelectStudent={(studentName) => {
              setSelectedStudentName(studentName);
            }}
          />
        )}

        {(!canManageRock101 || (selectedClass && selectedStudentName)) &&
          selectedStudent && (
            <>
              {canManageRock101 && selectedClass && selectedStudentName && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentName("")}
                    className="rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                  >
                    Back to Class Roster
                  </button>
                </div>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleSetTab("privateLesson")}
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
                  onClick={() => handleSetTab("groupRehearsal")}
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
                  onClick={() => handleSetTab("badges")}
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
                  onClick={() => handleSetTab("parent")}
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
                  onClick={() => handleSetTab("certificate")}
                  className={`rounded-lg px-4 py-2 ${
                    tab === "certificate"
                      ? "bg-red-600"
                      : "bg-zinc-800 hover:bg-zinc-700"
                  }`}
                >
                  Certificate
                </button>

                {canManageRock101 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSetTab("classSetup")}
                      className={`rounded-lg px-4 py-2 ${
                        tab === "classSetup"
                          ? "bg-red-600"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      Class Setup
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetTab("performanceDashboard")}
                      className={`rounded-lg px-4 py-2 ${
                        tab === "performanceDashboard"
                          ? "bg-red-600"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      Shows Overview
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetTab("bandsDashboard")}
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
                      onClick={() => handleSetTab("pipeline")}
                      className={`rounded-lg px-4 py-2 ${
                        tab === "pipeline"
                          ? "bg-red-600"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      Pipeline
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetTab("accounts")}
                      className={`rounded-lg px-4 py-2 ${
                        tab === "accounts"
                          ? "bg-red-600"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      Accounts
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSetTab("admin")}
                      className={`rounded-lg px-4 py-2 ${
                        tab === "admin"
                          ? "bg-red-600"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      Admin
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
                    canEdit={canManageRock101}
                    canSign={canManageRock101}
                  />

                  {canManageRock101 && (
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

              {tab === "classSetup" && canManageRock101 && (
                <ClassSetupView students={students} users={getAllUsers()} />
              )}

              {tab === "performanceDashboard" && canManageRock101 && (
                <PerformanceDashboard
                  classes={savedClasses}
                  users={getAllUsers()}
                />
              )}

              {tab === "bandsDashboard" && canManageRock101 && (
                <BandsDashboard students={students} />
              )}

              {tab === "pipeline" && canManageRock101 && (
                <PipelineView students={students} />
              )}

              {tab === "accounts" && canManageRock101 && (
                <DirectorAccountsView currentUserEmail={currentUser.email} />
              )}

              {tab === "admin" && canManageRock101 && (
                <AdminView
                  users={getAllUsers()}
                  students={students}
                  canManageUsers={isGeneralManager}
                  onUpdateStudentParentEmail={(studentName, parentEmail) => {
                    setStudents((prev) =>
                      prev.map((student) =>
                        student.name === studentName
                          ? {
                              ...student,
                              parentEmail,
                            }
                          : student
                      )
                    );
                  }}
                  onDeleteStudent={(studentName) => {
                    setStudents((prev) =>
                      prev.filter((student) => student.name !== studentName)
                    );
                  }}
                />
              )}
            </>
          )}
      </div>
    </div>
  );
}