"use client";

import { useEffect, useMemo, useState } from "react";
import BrandedBackground from "@/components/BrandedBackground";
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
import { schools, type SchoolId } from "@/data/schools";
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

type CurriculumState = {
  done: boolean;
  signed: boolean;
  date: string | null;
  fistBumps: number;
};

const defaultCurriculumState: CurriculumState = {
  done: false,
  signed: false,
  date: null,
  fistBumps: 0,
};

type SchoolFilter = "all" | SchoolId;

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
  const [selectedSchoolId, setSelectedSchoolId] =
    useState<SchoolFilter>("all");

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
  const isOwner = role === "owner";
  const canManageRock101 =
    role === "director" || role === "generalManager" || role === "owner";
  const isGeneralManager = role === "generalManager";
  const canSeeManagementTabs = canManageRock101;

  const allUsers = useMemo(() => getAllUsers(), []);
  const savedClasses = getSavedClasses();

  const effectiveSchoolFilter: SchoolFilter = useMemo(() => {
    if (isOwner) return selectedSchoolId;

    if (currentUser && "schoolId" in currentUser && currentUser.schoolId) {
      return currentUser.schoolId as SchoolId;
    }

    return "all";
  }, [isOwner, selectedSchoolId, currentUser]);

  const filteredStudentsBySchool = useMemo(() => {
    if (effectiveSchoolFilter === "all") return students;

    return students.filter(
      (student) => student.schoolId === effectiveSchoolFilter
    );
  }, [students, effectiveSchoolFilter]);

  const filteredUsersBySchool = useMemo(() => {
    if (effectiveSchoolFilter === "all") return allUsers;

    return allUsers.filter((user) => {
      if (user.role === "owner") return true;
      return user.schoolId === effectiveSchoolFilter;
    });
  }, [allUsers, effectiveSchoolFilter]);

  const filteredClassesBySchool = useMemo(() => {
    if (effectiveSchoolFilter === "all") return savedClasses;

    return savedClasses.filter(
      (rockClass) => rockClass.schoolId === effectiveSchoolFilter
    );
  }, [savedClasses, effectiveSchoolFilter]);

  const selectedClass =
    filteredClassesBySchool.find(
      (rockClass) => rockClass.id === selectedClassId
    ) ?? null;

  const studentsInSelectedClass = selectedClass
    ? filteredStudentsBySchool.filter((student) =>
        selectedClass.studentNames.includes(student.name)
      )
    : [];

  const visibleStudents = useMemo(() => {
    if (!currentUser) return [];

    if (currentUser.role === "parent") {
      return filteredStudentsBySchool.filter(
        (student) =>
          student.parentEmail?.toLowerCase() === currentUser.email.toLowerCase()
      );
    }

    if (currentUser.role === "instructor") {
      const schoolScopedStudents = filteredStudentsBySchool;

      if (instructorStudentFilter === "allStudents") {
        return schoolScopedStudents;
      }

      return schoolScopedStudents.filter(
        (student) =>
          student.primaryInstructorEmail?.toLowerCase() ===
          currentUser.email.toLowerCase()
      );
    }

    if (canManageRock101) {
      if (selectedClass) {
        return studentsInSelectedClass;
      }

      return [];
    }

    return filteredStudentsBySchool;
  }, [
    currentUser,
    filteredStudentsBySchool,
    canManageRock101,
    selectedClass,
    studentsInSelectedClass,
    instructorStudentFilter,
  ]);

  const selectedStudent = useMemo(() => {
    return (
      visibleStudents.find((student) => student.name === selectedStudentName) ??
      visibleStudents[0]
    );
  }, [visibleStudents, selectedStudentName]);

  const canSeeStudentTabs =
    !!selectedStudent &&
    (!canManageRock101 || (!!selectedClass && !!selectedStudentName));

  useEffect(() => {
    if (
      currentUser?.role === "instructor" &&
      !selectedStudent &&
      visibleStudents.length > 0
    ) {
      setSelectedStudentName(visibleStudents[0].name);
    }
  }, [currentUser, selectedStudent, visibleStudents]);

  useEffect(() => {
    setSelectedClassId(null);
    setSelectedStudentName("");
  }, [effectiveSchoolFilter]);

  const earnedBadges: Set<string> = selectedStudent
    ? getEarnedBadges(selectedStudent)
    : new Set<string>();

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
      const existing = student.curriculum[item] ?? defaultCurriculumState;

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
      const existing = student.curriculum[item] ?? defaultCurriculumState;
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
      const existing = student.curriculum[item] ?? defaultCurriculumState;

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
    setSelectedSchoolId("all");
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
      <BrandedBackground
        imageSrc="/images/rock101-drums.jpg"
        mode="watermark"
        opacity={0.3}
        grayscale={false}
        blur={0}
        overlayClassName="bg-black/55"
        position="center"
      >
        <AppHeader
          role={role}
          studentName="No student assigned"
          userName={currentUser.name}
          userEmail={currentUser.email}
          onLogout={handleLogout}
        />

        <div className="p-6">
          {isOwner && (
            <div className="mb-4 max-w-sm">
              <label className="mb-2 block text-sm text-zinc-400">
                School Filter
              </label>
              <select
                value={selectedSchoolId}
                onChange={(e) =>
                  setSelectedSchoolId(e.target.value as SchoolFilter)
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white"
              >
                <option value="all">All Schools</option>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
      </BrandedBackground>
    );
  }

  return (
    <BrandedBackground
      imageSrc="/images/rock101-drums.jpg"
      mode="watermark"
      opacity={0.3}
      grayscale={false}
      blur={0}
      overlayClassName="bg-black/55"
      position="center"
    >
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
        {isOwner && (
          <div className="mb-6 max-w-sm">
            <label className="mb-2 block text-sm text-zinc-400">
              School Filter
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) =>
                setSelectedSchoolId(e.target.value as SchoolFilter)
              }
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white"
            >
              <option value="all">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
          <>
            {filteredClassesBySchool.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                <h2 className="text-2xl font-bold text-white">
                  No Rock 101 classes created yet
                </h2>
                <p className="mt-3 text-zinc-300">
                  Create your first class to start assigning students and
                  building out rehearsal groups.
                </p>
                <button
                  type="button"
                  onClick={() => handleSetTab("classSetup")}
                  className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-500"
                >
                  Create First Class
                </button>
              </div>
            ) : (
              <ClassSelectorView
                classes={filteredClassesBySchool}
                users={filteredUsersBySchool}
                onSelectClass={(classId) => {
                  setSelectedClassId(classId);
                  setSelectedStudentName("");
                }}
              />
            )}
          </>
        )}

        {canManageRock101 && selectedClass && !selectedStudentName && (
          <ClassDetailView
            rockClass={selectedClass}
            students={studentsInSelectedClass}
            users={filteredUsersBySchool}
            onBackToClasses={() => {
              setSelectedClassId(null);
              setSelectedStudentName("");
            }}
            onSelectStudent={(studentName) => {
              setSelectedStudentName(studentName);
            }}
          />
        )}

        {(canSeeManagementTabs || canSeeStudentTabs) && (
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
              {canSeeStudentTabs && (
                <>
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
                </>
              )}

              {canSeeManagementTabs && (
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

            {canSeeStudentTabs && tab === "privateLesson" && selectedStudent && (
              <>
                <PrivateLessonView
                  student={selectedStudent}
                  onToggleDone={handleToggleDone}
                  onToggleSigned={handleToggleSigned}
                  canEdit={role === "instructor" || canManageRock101}
                  canSign={role === "instructor" || canManageRock101}
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

            {canSeeStudentTabs &&
              tab === "groupRehearsal" &&
              selectedStudent && (
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

            {canSeeStudentTabs && tab === "badges" && selectedStudent && (
              <BadgeGrid earnedBadges={earnedBadges} />
            )}

            {canSeeStudentTabs && tab === "parent" && selectedStudent && (
              <ParentWeeklyReview student={selectedStudent} />
            )}

            {canSeeStudentTabs && tab === "certificate" && selectedStudent && (
              <CertificateView student={selectedStudent} />
            )}

            {tab === "classSetup" && canManageRock101 && (
              <ClassSetupView
                students={filteredStudentsBySchool}
                users={filteredUsersBySchool}
              />
            )}

            {tab === "performanceDashboard" && canManageRock101 && (
              <PerformanceDashboard
                classes={filteredClassesBySchool}
                users={filteredUsersBySchool}
              />
            )}

            {tab === "bandsDashboard" && canManageRock101 && (
              <BandsDashboard students={filteredStudentsBySchool} />
            )}

            {tab === "pipeline" && canManageRock101 && (
              <PipelineView students={filteredStudentsBySchool} />
            )}

            {tab === "accounts" && canManageRock101 && (
              <DirectorAccountsView currentUserEmail={currentUser.email} />
            )}

            {tab === "admin" && canManageRock101 && (
              <AdminView
                users={filteredUsersBySchool}
                students={filteredStudentsBySchool}
                canManageUsers={isGeneralManager || isOwner}
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
    </BrandedBackground>
  );
}