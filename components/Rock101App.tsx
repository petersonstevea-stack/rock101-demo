"use client";

import { useEffect, useMemo, useState } from "react";
import {
    getPrivateLessonSections,
    getGroupRehearsalSections,
} from "@/data/rock101Curriculum";
import GraduationRequirementsView from "@/components/GraduationRequirementsView";
import ParentDashboardOverview from "@/components/ParentDashboardOverview";
import { buildParentDashboardData } from "@/lib/parentDashboard";
import LoginScreen from "@/components/LoginScreen";
import AppHeader from "@/components/AppHeader";
import StudentSelector from "@/components/StudentSelector";
import PrivateLessonView from "@/components/PrivateLessonView";
import GroupRehearsalView from "@/components/GroupRehearsalView";
import BadgeGrid from "@/components/BadgeGrid";
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
import { getSavedClasses, saveClasses } from "@/lib/classes";
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
    | "graduationRequirements"
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
type ManagementLandingView = "classes" | "students";

export default function Rock101App() {
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
    const [studentViewFilter, setStudentViewFilter] = useState<
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
    const [managementLandingView, setManagementLandingView] =
        useState<ManagementLandingView>("classes");
    const [classesVersion, setClassesVersion] = useState(0);

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
    const savedClasses = useMemo(() => getSavedClasses(), [classesVersion]);

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
        filteredClassesBySchool.find((rockClass) => rockClass.id === selectedClassId) ??
        null;

    const studentsInSelectedClass = selectedClass
        ? filteredStudentsBySchool.filter((student) =>
            selectedClass.studentNames.includes(student.name)
        )
        : [];

    const directedStudentNames = useMemo(() => {
        if (!currentUser || role !== "director") return new Set<string>();

        return new Set(
            filteredClassesBySchool
                .filter(
                    (rockClass) =>
                        rockClass.directorEmail?.toLowerCase() ===
                        currentUser.email.toLowerCase()
                )
                .flatMap((rockClass) => rockClass.studentNames)
        );
    }, [currentUser, role, filteredClassesBySchool]);

    const visibleStudents = useMemo(() => {
        if (!currentUser) return [];

        if (currentUser.role === "parent") {
            return filteredStudentsBySchool.filter(
                (student) =>
                    student.parentEmail?.toLowerCase() ===
                    currentUser.email.toLowerCase()
            );
        }

        if (currentUser.role === "instructor") {
            if (studentViewFilter === "allStudents") {
                return filteredStudentsBySchool;
            }

            return filteredStudentsBySchool.filter(
                (student) =>
                    student.primaryInstructorEmail?.toLowerCase() ===
                    currentUser.email.toLowerCase()
            );
        }

        if (canManageRock101) {
            if (selectedClass) {
                return studentsInSelectedClass;
            }

            if (managementLandingView === "students") {
                if (role === "director" && studentViewFilter === "myStudents") {
                    return filteredStudentsBySchool.filter((student) => {
                        const assignedAsInstructor =
                            student.primaryInstructorEmail?.toLowerCase() ===
                            currentUser.email.toLowerCase();

                        const assignedAsDirector = directedStudentNames.has(student.name);

                        return assignedAsInstructor || assignedAsDirector;
                    });
                }

                return filteredStudentsBySchool;
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
        managementLandingView,
        studentViewFilter,
        role,
        directedStudentNames,
    ]);

    const selectedStudent = useMemo(() => {
        if (visibleStudents.length === 0) return null;

        if (canManageRock101 && !selectedStudentName) {
            return null;
        }

        return (
            visibleStudents.find((student) => student.name === selectedStudentName) ??
            visibleStudents[0]
        );
    }, [visibleStudents, selectedStudentName, canManageRock101]);
    const activeClassForSelectedStudent = useMemo(() => {
        if (selectedClass) return selectedClass;
        if (!selectedStudent) return null;

        return (
            filteredClassesBySchool.find(
                (rockClass) =>
                    rockClass.studentNames.includes(selectedStudent.name) ||
                    rockClass.name === selectedStudent.band
            ) ?? null
        );
        const activeClassForSelectedStudent = useMemo(() => {
            if (selectedClass) return selectedClass;
            if (!selectedStudent) return null;

            return (
                filteredClassesBySchool.find(
                    (rockClass) =>
                        rockClass.studentNames.includes(selectedStudent.name) ||
                        rockClass.name === selectedStudent.band
                ) ?? null
            );
        }, [selectedClass, selectedStudent, filteredClassesBySchool]);
    }, [selectedClass, selectedStudent, filteredClassesBySchool]);
    const canSeeStudentTabs =
        !!selectedStudent &&
        (!canManageRock101 || !!selectedStudentName);

    useEffect(() => {
        if (visibleStudents.length === 0) return;

        if (canManageRock101) {
            if (
                selectedStudentName &&
                !visibleStudents.some((student) => student.name === selectedStudentName)
            ) {
                setSelectedStudentName("");
            }
            return;
        }

        const hasSelectedStudent = visibleStudents.some(
            (student) => student.name === selectedStudentName
        );

        if (!selectedStudentName || !hasSelectedStudent) {
            setSelectedStudentName(visibleStudents[0].name);
        }
    }, [visibleStudents, selectedStudentName, canManageRock101]);

    useEffect(() => {
        setSelectedClassId(null);
        setSelectedStudentName("");
        setManagementLandingView("classes");
    }, [effectiveSchoolFilter]);

    const earnedBadges: Set<string> = selectedStudent
        ? getEarnedBadges(selectedStudent)
        : new Set<string>();

    const parentDashboardData = useMemo(() => {
        if (!selectedStudent) return null;

        const matchedSchool = schools.find(
            (school) => school.id === selectedStudent.schoolId
        );

        const privateLessonItems = getPrivateLessonSections(
            selectedStudent.instrument
        ).flatMap((section) => section.items);

        const groupRehearsalItems = getGroupRehearsalSections(
            selectedStudent.instrument
        ).flatMap((section) => section.items);

        const dashboardClass =
            activeClassForSelectedStudent ?? selectedClass ?? null;

        const dashboardSongProgress = dashboardClass
            ? dashboardClass.songs.map((song) => {
                const readiness =
                    selectedStudent.songReadiness?.[dashboardClass.id]?.[song]
                        ?.readiness ?? 1;

                const labelMap = {
                    1: "Just Starting",
                    2: "Getting There",
                    3: "Mostly There",
                    4: "Performance Ready",
                    5: "Show Ready",
                } as const;

                return {
                    song,
                    readiness,
                    label: labelMap[readiness as 1 | 2 | 3 | 4 | 5],
                };
            })
            : [];

        return buildParentDashboardData({
            student: {
                id: selectedStudent.name,
                name: selectedStudent.name,
                instrument: selectedStudent.instrument,
                className: dashboardClass?.name ?? "Rock 101",
                schoolName: matchedSchool?.name ?? "School of Rock",
                nextPerformanceDate: null,
            },
            curriculum: selectedStudent.curriculum,
            privateLessonItems,
            groupRehearsalItems,
            songProgress: dashboardSongProgress,
            badges: [],
        });
    }, [selectedStudent, selectedClass]);

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

    function handleAddStudentToClass(studentId: string) {
        if (!selectedClass) return;

        const student = students.find((s) => s.id === studentId);
        if (!student) return;

        const updatedClasses = filteredClassesBySchool.map((rockClass) => {
            if (rockClass.id !== selectedClass.id) return rockClass;

            const alreadyInClass = rockClass.studentIds.includes(studentId);
            if (alreadyInClass) return rockClass;

            return {
                ...rockClass,
                studentIds: [...rockClass.studentIds, studentId],
                studentNames: [...rockClass.studentNames, student.name],
            };
        });

        saveClasses(updatedClasses);
        setClassesVersion((prev) => prev + 1);
        setSelectedClassId(selectedClass.id);
    }

    function handleRemoveStudentFromClass(studentId: string) {
        if (!selectedClass) return;

        const updatedClasses = filteredClassesBySchool.map((rockClass) => {
            if (rockClass.id !== selectedClass.id) return rockClass;

            const nextStudentIds = rockClass.studentIds.filter(
                (id) => id !== studentId
            );

            const nextStudentNames = rockClass.studentNames.filter((name) => {
                const matchingStudent = students.find(
                    (student) => student.name === name
                );
                return matchingStudent?.id !== studentId;
            });

            return {
                ...rockClass,
                studentIds: nextStudentIds,
                studentNames: nextStudentNames,
            };
        });

        saveClasses(updatedClasses);
        setClassesVersion((prev) => prev + 1);
        setSelectedClassId(selectedClass.id);
    }
    function handleUpdateClassSongProgress(
        song: string,
        readiness: 1 | 2 | 3 | 4 | 5
    ) {
        if (!selectedClass) return;

        const updatedClasses = filteredClassesBySchool.map((rockClass) => {
            if (rockClass.id !== selectedClass.id) return rockClass;

            return {
                ...rockClass,
                songProgress: {
                    ...(rockClass.songProgress ?? {}),
                    [song]: {
                        readiness,
                        updatedAt: new Date().toISOString(),
                    },
                },
            };
        });

        saveClasses(updatedClasses);
        setClassesVersion((prev) => prev + 1);
        setSelectedClassId(selectedClass.id);
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

    function handleUpdateStudentInstructor(
        studentName: string,
        instructorEmail: string
    ) {
        setStudents((prev) =>
            prev.map((student) =>
                student.name === studentName
                    ? { ...student, primaryInstructorEmail: instructorEmail }
                    : student
            )
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
                        canManageRock101
                            ? false
                            : student.workflow.directorSubmitted,
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
                        canManageRock101
                            ? false
                            : student.workflow.directorSubmitted,
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
    function handleUpdateStudentSongReadiness(
        classId: string,
        song: string,
        readiness: 1 | 2 | 3 | 4 | 5
    ) {
        updateSelectedStudent((student) => ({
            ...student,
            songReadiness: {
                ...(student.songReadiness ?? {}),
                [classId]: {
                    ...(student.songReadiness?.[classId] ?? {}),
                    [song]: {
                        readiness,
                        updatedAt: new Date().toISOString(),
                    },
                },
            },
            workflow: {
                ...student.workflow,
                directorSubmitted: false,
                parentSubmitted: false,
            },
        }));
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
        updateSelectedStudent((student) => {
            const timestampKey =
                roleType === "instructor"
                    ? "instructorUpdatedAt"
                    : "directorUpdatedAt";

            const nextNotes = {
                ...student.notes,
                [timestampKey]: new Date().toLocaleString(),
            } as typeof student.notes & {
                instructorUpdatedAt?: string | null;
                directorUpdatedAt?: string | null;
            };

            return {
                ...student,
                notes: nextNotes,
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
            };
        });
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

    function handleShowManagementStudents() {
        setManagementLandingView("students");
        setSelectedClassId(null);
        setSelectedStudentName("");
    }

    function handleShowManagementClasses() {
        setManagementLandingView("classes");
        setSelectedClassId(null);
        setSelectedStudentName("");
    }

    function handleLogout() {
        clearSavedSession();
        clearSavedTab();
        setCurrentUser(null);
        setSelectedClassId(null);
        setSelectedStudentName(initialStudents[0]?.name ?? "");
        setStudentViewFilter("myStudents");
        setSelectedSchoolId("all");
        setManagementLandingView("classes");
        setTab("privateLesson");
    }

    if (!currentUser) {
        return (
            <LoginScreen
                onLogin={(user) => {
                    saveSession(user);
                    setCurrentUser(user);

                    const defaultTab: Tab =
                        String(user.role).toLowerCase() === "parent"
                            ? "parent"
                            : "privateLesson";

                    setTab(defaultTab);
                    saveSelectedTab(defaultTab);

                    setSelectedClassId(null);
                    setManagementLandingView("classes");

                    if (String(user.role).toLowerCase() === "parent") {
                        const linkedStudents = students.filter(
                            (student) =>
                                student.parentEmail?.toLowerCase() ===
                                user.email.toLowerCase()
                        );

                        setSelectedStudentName(linkedStudents[0]?.name ?? "");
                    } else {
                        setSelectedStudentName("");
                    }
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
                                No students are currently visible in this instructor
                                view.
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
                    visibleStudents[0]?.name ??
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
                            onClick={() => setStudentViewFilter("myStudents")}
                            className={`rounded-lg px-4 py-2 ${studentViewFilter === "myStudents"
                                ? "bg-red-600"
                                : "bg-zinc-800 hover:bg-zinc-700"
                                }`}
                        >
                            My Students
                        </button>

                        <button
                            type="button"
                            onClick={() => setStudentViewFilter("allStudents")}
                            className={`rounded-lg px-4 py-2 ${studentViewFilter === "allStudents"
                                ? "bg-red-600"
                                : "bg-zinc-800 hover:bg-zinc-700"
                                }`}
                        >
                            All Students
                        </button>
                    </div>
                )}

                {role === "instructor" &&
                    studentViewFilter === "myStudents" &&
                    visibleStudents.length === 0 && (
                        <div className="mb-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
                            No students are currently assigned to you. Switch to All
                            Students to view everyone.
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

                {canManageRock101 && !selectedClass && !selectedStudentName && (
                    <div className="mb-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleShowManagementClasses}
                            className={`rounded-lg px-4 py-2 ${managementLandingView === "classes"
                                ? "bg-red-600"
                                : "bg-zinc-800 hover:bg-zinc-700"
                                }`}
                        >
                            Classes
                        </button>

                        <button
                            type="button"
                            onClick={handleShowManagementStudents}
                            className={`rounded-lg px-4 py-2 ${managementLandingView === "students"
                                ? "bg-red-600"
                                : "bg-zinc-800 hover:bg-zinc-700"
                                }`}
                        >
                            View Students
                        </button>
                    </div>
                )}

                {canManageRock101 &&
                    managementLandingView === "classes" &&
                    !selectedClass &&
                    !selectedStudentName && (
                        <>
                            {filteredClassesBySchool.length === 0 ? (
                                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                                    <h2 className="text-2xl font-bold text-white">
                                        No Rock 101 classes created yet
                                    </h2>
                                    <p className="mt-3 text-zinc-300">
                                        Create your first class to start assigning
                                        students and building out rehearsal groups.
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

                {canManageRock101 &&
                    managementLandingView === "students" &&
                    !selectedClass &&
                    !selectedStudentName && (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">
                                        School Students
                                    </h2>
                                    <p className="mt-2 text-zinc-300">
                                        View and open any Rock 101 student profile for
                                        this school.
                                    </p>
                                </div>
                                <div className="text-sm text-zinc-400">
                                    {filteredStudentsBySchool.length} student
                                    {filteredStudentsBySchool.length === 1 ? "" : "s"}
                                </div>
                            </div>

                            {role === "director" && (
                                <div className="mt-6 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStudentViewFilter("myStudents")}
                                        className={`rounded-lg px-4 py-2 ${studentViewFilter === "myStudents"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        My Students
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setStudentViewFilter("allStudents")}
                                        className={`rounded-lg px-4 py-2 ${studentViewFilter === "allStudents"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        All Students
                                    </button>
                                </div>
                            )}

                            {filteredStudentsBySchool.length ? (
                                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {visibleStudents.map((student) => (
                                        <button
                                            key={student.name}
                                            type="button"
                                            onClick={() => handleSelectStudent(student.name)}
                                            className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                                        >
                                            <div className="font-semibold text-white">
                                                {student.name}
                                            </div>
                                            <div className="mt-1 text-sm text-zinc-400">
                                                {student.instrument}
                                            </div>
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                                {schools.find(
                                                    (school) => school.id === student.schoolId
                                                )?.name ?? "School of Rock"}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-300">
                                    No students found for this school.
                                </div>
                            )}
                        </div>
                    )}

                {canManageRock101 && selectedClass && !selectedStudentName && (
                    <ClassDetailView
                        rockClass={selectedClass}
                        students={studentsInSelectedClass}
                        users={filteredUsersBySchool}
                        allStudents={filteredStudentsBySchool}
                        onAddStudentToClass={handleAddStudentToClass}
                        onRemoveStudentFromClass={handleRemoveStudentFromClass}
                        onUpdateSongProgress={handleUpdateClassSongProgress}
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

                        {canManageRock101 &&
                            managementLandingView === "students" &&
                            !selectedClass &&
                            selectedStudentName && (
                                <div className="mb-4">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedStudentName("")}
                                        className="rounded-lg bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                                    >
                                        Back to Student List
                                    </button>
                                </div>
                            )}

                        <div className="mt-8 flex flex-wrap gap-3">
                            {canSeeStudentTabs && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("privateLesson")}
                                        className={`rounded-lg px-4 py-2 ${tab === "privateLesson"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Private Lesson
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSetTab("graduationRequirements")
                                        }
                                        className={`rounded-lg px-4 py-2 ${tab === "graduationRequirements"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Graduation Requirements
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("groupRehearsal")}
                                        className={`rounded-lg px-4 py-2 ${tab === "groupRehearsal"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Group Rehearsal
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("badges")}
                                        className={`rounded-lg px-4 py-2 ${tab === "badges"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Badges
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("parent")}
                                        className={`rounded-lg px-4 py-2 ${tab === "parent"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Parent
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("certificate")}
                                        className={`rounded-lg px-4 py-2 ${tab === "certificate"
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
                                        className={`rounded-lg px-4 py-2 ${tab === "classSetup"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Class Setup
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSetTab("performanceDashboard")
                                        }
                                        className={`rounded-lg px-4 py-2 ${tab === "performanceDashboard"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Shows Overview
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("bandsDashboard")}
                                        className={`rounded-lg px-4 py-2 ${tab === "bandsDashboard"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Bands Dashboard
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("pipeline")}
                                        className={`rounded-lg px-4 py-2 ${tab === "pipeline"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Pipeline
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("accounts")}
                                        className={`rounded-lg px-4 py-2 ${tab === "accounts"
                                            ? "bg-red-600"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        Accounts
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleSetTab("admin")}
                                        className={`rounded-lg px-4 py-2 ${tab === "admin"
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
                                    canEdit={
                                        role === "instructor" ||
                                        role === "director" ||
                                        role === "generalManager" ||
                                        role === "owner"
                                    }
                                    canSign={
                                        role === "instructor" ||
                                        role === "director" ||
                                        role === "generalManager" ||
                                        role === "owner"
                                    }
                                />

                                {(role === "instructor" ||
                                    role === "director" ||
                                    role === "generalManager" ||
                                    role === "owner") && (
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
                            tab === "graduationRequirements" &&
                            selectedStudent && (
                                <GraduationRequirementsView
                                    student={selectedStudent}
                                    onToggleDone={handleToggleDone}
                                    onToggleSigned={handleToggleSigned}
                                    canEdit={
                                        role === "instructor" ||
                                        role === "director" ||
                                        role === "generalManager" ||
                                        role === "owner"
                                    }
                                    canSign={
                                        role === "instructor" ||
                                        role === "director" ||
                                        role === "generalManager" ||
                                        role === "owner"
                                    }
                                />
                            )}

                        {canSeeStudentTabs &&
                            tab === "groupRehearsal" &&
                            selectedStudent && (
                                <>
                                    <GroupRehearsalView
                                        student={selectedStudent}
                                        classId={activeClassForSelectedStudent?.id ?? null}
                                        classSongs={activeClassForSelectedStudent?.songs ?? []}
                                        onToggleDone={handleToggleDone}
                                        onToggleSigned={handleToggleSigned}
                                        onAddFistBump={handleAddFistBump}
                                        onUpdateSongReadiness={handleUpdateStudentSongReadiness}
                                        canEdit={
                                            role === "director" ||
                                            role === "generalManager" ||
                                            role === "owner"
                                        }
                                        canSign={
                                            role === "director" ||
                                            role === "generalManager" ||
                                            role === "owner"
                                        }
                                    />

                                    {(role === "director" ||
                                        role === "generalManager" ||
                                        role === "owner") && (
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
                            <div className="space-y-8">
                                {parentDashboardData && (
                                    <ParentDashboardOverview
                                        data={parentDashboardData}
                                        lessonNotes={selectedStudent.notes.instructor}
                                        rehearsalNotes={selectedStudent.notes.director}
                                        lessonLastUpdated={
                                            (
                                                selectedStudent.notes as typeof selectedStudent.notes & {
                                                    instructorUpdatedAt?: string | null;
                                                    directorUpdatedAt?: string | null;
                                                }
                                            ).instructorUpdatedAt ?? null
                                        }
                                        rehearsalLastUpdated={
                                            (
                                                selectedStudent.notes as typeof selectedStudent.notes & {
                                                    instructorUpdatedAt?: string | null;
                                                    directorUpdatedAt?: string | null;
                                                }
                                            ).directorUpdatedAt ?? null
                                        }
                                        onNavigate={(nextTab) => handleSetTab(nextTab)}
                                    />
                                )}
                            </div>
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
                                onUpdateStudentInstructor={handleUpdateStudentInstructor}
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