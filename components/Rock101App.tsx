"use client";
import { useRouter } from "next/navigation";
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
import {
    canEditGroupRehearsal,
    canSubmitParentUpdate,
    type AppUser,
} from "@/lib/access";
import AdminView from "@/components/AdminView";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import ClassSelectorView from "@/components/ClassSelectorView";
import ClassDetailView from "@/components/ClassDetailView";

import { supabase } from "@/lib/supabaseClient";
import { getSavedClasses, getThisWeeksSessions } from "@/lib/classes";
import { schools, type SchoolId } from "@/data/schools";
import { getEarnedBadges } from "@/lib/progress";
import { saveClasses } from "@/lib/classes";
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
import Link from "next/link";
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

function mapSchoolNameToId(schoolName?: string | null): SchoolId {
    const normalized = (schoolName ?? "")
        .toLowerCase()
        .replace(/_/g, " ");

    if (normalized.includes("del mar")) return "del-mar";
    if (normalized.includes("encinitas")) return "encinitas";
    if (normalized.includes("scripps")) return "scripps-ranch";

    return "del-mar";
}

export default function Rock101App() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
    const [studentViewFilter, setStudentViewFilter] = useState<
        "myStudents" | "allStudents"
    >("myStudents");
    const [tab, setTab] = useState<Tab>("privateLesson");
    const [students, setStudents] = useState<any[]>([]);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedSession, setSelectedSession] = useState<any | null>(null);
    const [selectedStudentName, setSelectedStudentName] = useState("");
    const [selectedSchoolId, setSelectedSchoolId] =
        useState<SchoolFilter>("all");
    const [managementLandingView, setManagementLandingView] =
        useState<ManagementLandingView>("classes");
    const [classesVersion, setClassesVersion] = useState(0);
    const [savedClasses, setSavedClasses] = useState<any[]>([]);
    const [weeklySessions, setWeeklySessions] = useState<any[]>([]);
    const [classSongReadiness, setClassSongReadiness] = useState<Record<string, Record<string, number>>>({});
    const [editingClass, setEditingClass] = useState<any | null>(null);
    useEffect(() => {
        const checkUser = async () => {
            console.log("CHECK USER FUNCTION RUNNING");
            const { data } = await supabase.auth.getUser();
            console.log("FULL AUTH OBJECT:", data);

            if (data?.user) {
                console.log("User is logged in:", data.user.email);
                console.log("AUTH EMAIL:", data.user.email);

                const authEmail = data.user.email?.trim().toLowerCase();
                const authId = data.user.id;

                console.log("AUTH USER ID:", authId);
                console.log("AUTH USER EMAIL RAW:", data.user.email);
                console.log("AUTH USER EMAIL NORMALIZED:", authEmail);

                const { data: staffMatches, error: staffError } = await supabase
                    .from("staff")
                    .select("id, email, name, role, school_slug")
                    .eq("email", authEmail);

                console.log("STAFF LOOKUP ERROR:", staffError);
                console.log("STAFF LOOKUP RESULTS:", staffMatches);
                console.log("STAFF LOOKUP COUNT:", staffMatches?.length ?? 0);

                let dbUser = null;

                if (staffMatches && staffMatches.length === 1) {
                    dbUser = staffMatches[0];
                } else if (staffMatches && staffMatches.length > 1) {
                    console.error("Multiple staff rows found for email:", authEmail, staffMatches);
                } else {
                    console.error("No staff row found for email:", authEmail);
                }

                console.log("DB USER:", dbUser);

                if (dbUser) {
                    const sessionUser: SessionUser = {
                        email: dbUser.email,
                        name: dbUser.name,
                        role: dbUser.role ?? "owner",
                        schoolId: mapSchoolNameToId(dbUser.school_slug),
                    };
                    console.log("SESSION USER CREATED:", sessionUser);
                    setCurrentUser(sessionUser);
                    saveSession(sessionUser);
                } else {
                    console.log("No user logged in");
                }
            } else {
                console.log("No auth user found");
            }
        };

        checkUser();
    }, []);
    useEffect(() => {
        const savedUser = getSavedSession();
        const savedTab = getSavedTab();

        if (savedUser) {
            console.log("FOUND SAVED SESSION (waiting for auth):", savedUser);
        }

        if (role === "director") {
            setTab("groupRehearsal");  // Directors always land on Group Rehearsal
        } else if (savedTab) {
            setTab(savedTab as Tab);  // For others, restore saved tab
        }
    }, []);

    useEffect(() => {
        async function loadStudents() {
            const { data, error } = await supabase
                .from("students")
                .select("*")
                .eq("program", "rock101");

            if (error) {
                console.log("SUPABASE LOAD STUDENTS ERROR RAW:", error);
                console.log("SUPABASE LOAD STUDENTS ERROR JSON:", JSON.stringify(error, null, 2));
                return;
            }

            if (!data) return;

            const formatted = data.map((s: any) => {
                console.log("SUPABASE STUDENT ROW", s);
                const schoolId = mapSchoolNameToId(s.school);

                return {
                    id: s.id,
                    active: s.active ?? true,
                    name: `${s.first_name} ${s.last_initial ?? ""}`.trim(),
                    firstName: s.first_name,
                    lastInitial: s.last_initial ?? "",
                    parentEmail: s.parent_email,
                    instrument: s.instrument ?? "guitar",
                    school: s.school ?? "Del Mar",
                    schoolId,
                    className: s.class_name ?? "Rock 101",
                    band: s.class_name ?? "Rock 101",
                    primaryInstructorEmail: s.primary_instructor_email ?? "",
                    curriculum: s.curriculum ?? {},
                    notes: {
                        instructor: s.notes?.instructor ?? "",
                        director: s.notes?.director ?? "",
                        instructorUpdatedAt: s.notes?.instructorUpdatedAt ?? null,
                        directorUpdatedAt: s.notes?.directorUpdatedAt ?? null,
                    },
                    workflow: {
                        instructorSubmitted: s.workflow?.instructorSubmitted ?? false,
                        directorSubmitted: s.workflow?.directorSubmitted ?? false,
                        graduationInstructorSubmitted:
                            s.workflow?.graduationInstructorSubmitted ?? false,
                        graduationDirectorSubmitted:
                            s.workflow?.graduationDirectorSubmitted ?? false,
                        parentSubmitted: s.workflow?.parentSubmitted ?? false,
                    },
                    songReadiness: {},
                };
            });

            const safeStudents = isOwner
                ? formatted
                : formatted.filter(
                    (student) => student.schoolId === currentUser?.schoolId
                );
            console.log("STUDENT DEBUG", {
                currentUser,
                isOwner,
                rawStudentCount: data?.length ?? 0,
                formattedCount: formatted.length,
                safeStudentsCount: safeStudents.length,
                programs: [...new Set((data ?? []).map((s: any) => s.program))],
            });
            setStudents(safeStudents);
            console.log("FORMATTED STUDENTS:", safeStudents);

            if (currentUser?.role === "parent") {
                const matchedStudent = formatted.find(
                    (student: any) =>
                        student.parentEmail?.toLowerCase() === currentUser.email.toLowerCase()
                );

                setSelectedStudentName(matchedStudent?.name ?? "");
            }
        }

        loadStudents();
    }, [currentUser]);

    useEffect(() => {
        async function loadClasses() {
            const { data, error } = await supabase
                .from("rock_classes")
                .select("*")
                .eq("school_id", selectedSchoolId ?? currentUser?.schoolId ?? "");

            if (error) {
                console.log("SUPABASE LOAD CLASSES ERROR RAW:", error);
                console.log("SUPABASE LOAD CLASSES ERROR JSON:", JSON.stringify(error, null, 2));
                setSavedClasses([]);
                return;
            }

            const supabaseClasses = (data ?? []).map((c: any) => {

                return {
                    id: c.id,
                    name: c.name,
                    schoolId: c.school_id ?? "",
                    directorEmail:
                        c.director_email === "director@delmar.com"
                            ? "director.delmar@rock101.com"
                            : (c.director_email ?? ""),
                    instructorEmail: c.instructor_email ?? "",
                    dayOfWeek: c.day_of_week ?? "Monday",
                    time: c.time ?? "",
                    songs: c.songs ?? [],
                    studentIds: c.student_ids ?? [],
                    studentNames: c.student_names ?? [],
                    songProgress: c.song_progress ?? {},
                    performanceTitle: c.performance_title ?? "",
                    performanceDate: c.performance_date ?? "",
                };
            });
            const safeClasses = isOwner
                ? supabaseClasses
                : supabaseClasses.filter(
                    (c) => c.schoolId === currentUser?.schoolId
                );

            setSavedClasses(safeClasses);
        }

        loadClasses();
    }, [classesVersion, currentUser, selectedSchoolId]);


    useEffect(() => {
        async function loadSessions() {
            if (!currentUser?.schoolId) return;

            const sessions = await getThisWeeksSessions(currentUser.schoolId);
            console.log("WEEKLY SESSIONS:", sessions);
            setWeeklySessions(sessions);
        }

        loadSessions();
    }, [currentUser]);
    const role = currentUser?.role ?? null;
    const isOwner = role === "owner";
    const canManageRock101 =
        role === "director" || role === "generalManager" || role === "owner";
    const isGeneralManager = role === "generalManager";
    const canSeeManagementTabs = canManageRock101;

    const [allUsers, setAllUsers] = useState<any[]>([]);

    const effectiveSchoolFilter: SchoolFilter = useMemo(() => {
        if (isOwner) return selectedSchoolId;

        if (currentUser && "schoolId" in currentUser && currentUser.schoolId) {
            return currentUser.schoolId as SchoolId;
        }

        return "del-mar";
    }, [isOwner, selectedSchoolId, currentUser]);

    const filteredStudentsBySchool = useMemo(() => {
        console.log("SCHOOL FILTER DEBUG", {
            currentUser,
            effectiveSchoolFilter,
            studentCount: students.length,
            studentSchoolIds: students.map((student) => student.schoolId),
        });

        if (effectiveSchoolFilter === "all") return students;

        return students.filter((student) => {
            const matches = student.schoolId === effectiveSchoolFilter;

            console.log("SCHOOL MATCH CHECK", {
                studentName: student.name,
                studentSchoolId: student.schoolId,
                effectiveSchoolFilter,
                matches,
            });

            return matches;
        });
    }, [students, effectiveSchoolFilter]);

    const filteredUsersBySchool = useMemo(() => {
        if (effectiveSchoolFilter === "all") return allUsers;

        return allUsers.filter((user) => {
            if (user.role === "owner") return true;
            return user.schoolId === effectiveSchoolFilter;
        });
    }, [allUsers, effectiveSchoolFilter]);

    console.log("FILTERED USERS", filteredUsersBySchool);

    const filteredClassesBySchool = useMemo(() => {
        if (effectiveSchoolFilter === "all") return savedClasses;

        return savedClasses.filter(
            (rockClass) => rockClass.schoolId === effectiveSchoolFilter
        );
    }, [savedClasses, effectiveSchoolFilter]);

    const selectedClass =
        savedClasses.find((rockClass) => rockClass.id === selectedClassId) ??
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
                    student.parentEmail?.toLowerCase() === currentUser.email.toLowerCase()
            );
        }

        if (currentUser.role === "instructor") {
            console.log("STUDENT VIEW FILTER VALUE:", studentViewFilter);

            if (studentViewFilter === "allStudents") {
                console.log("ALL STUDENTS MODE ACTIVE — BYPASSING INSTRUCTOR FILTER");
                return filteredStudentsBySchool;
            }

            return filteredStudentsBySchool.filter((student) => {
                console.log("RAW STUDENT OBJECT:", student);

                const studentEmail = student.primaryInstructorEmail?.trim().toLowerCase();
                const userEmail = currentUser.email?.trim().toLowerCase();

                console.log("EMAIL COMPARISON", {
                    studentName: student.name,
                    studentEmail,
                    userEmail,
                    match: studentEmail === userEmail,
                });

                const assigned = studentEmail === userEmail;

                console.log("INSTRUCTOR STUDENT CHECK", {
                    studentName: student.name,
                    primaryInstructorEmail: student.primaryInstructorEmail,
                    currentUserEmail: currentUser.email,
                    assigned,
                    schoolId: student.schoolId,
                    effectiveSchoolFilter,
                    currentUserSchoolId: currentUser.schoolId,
                });

                return assigned;
            });
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

        return (
            visibleStudents.find((student) => student.name === selectedStudentName) ??
            visibleStudents[0]
        );
    }, [visibleStudents, selectedStudentName]);

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

    const canSeeStudentTabs =
        !!selectedStudent && (!canManageRock101 || !!selectedStudentName);

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
        async function loadUsers() {
            const { data, error } = await supabase
                .from("staff")
                .select("*");

            if (error) {
                console.error("LOAD USERS ERROR:", error);
                return;
            }

            if (data) {
                console.log("ALL USERS FROM SUPABASE:", data);

                const formattedUsers = data.map((u) => ({
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    schoolId: u.school_id,
                }));

                const safeUsers = isOwner
                    ? formattedUsers
                    : formattedUsers.filter(
                        (user) => user.schoolId === currentUser?.schoolId
                    );

                setAllUsers(safeUsers);
            }
        }

        loadUsers();
    }, []);
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
        const classFeedback = dashboardClass?.directorFeedback ?? null;
        const dashboardSongProgress = dashboardClass
            ? dashboardClass.songs.map((song: string) => {
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
                className: dashboardClass?.name ?? selectedStudent.className ?? "Rock 101",
                schoolName: matchedSchool?.name ?? "School of Rock",
                nextPerformanceDate: dashboardClass?.performanceDate ?? null,
            },
            curriculum: selectedStudent.curriculum,
            privateLessonItems,
            groupRehearsalItems,
            songProgress: dashboardSongProgress,
            classFeedback,
            badges: [],
        });
    }, [selectedStudent, selectedClass, activeClassForSelectedStudent]);

    const workflowReady = selectedStudent
        ? selectedStudent.workflow.instructorSubmitted &&
        selectedStudent.workflow.directorSubmitted &&
        selectedStudent.workflow.graduationDirectorSubmitted &&
        selectedStudent.workflow.graduationInstructorSubmitted &&
        !selectedStudent.workflow.parentSubmitted
        : false;
    const workflowMissingMessage = !selectedStudent
        ? undefined
        : selectedStudent.workflow.parentSubmitted
            ? undefined
            : !selectedStudent.workflow.instructorSubmitted
                ? "Waiting on instructor weekly feedback."
                : !selectedStudent.workflow.directorSubmitted
                    ? "Waiting on director weekly feedback."
                    : !selectedStudent.workflow.graduationDirectorSubmitted
                        ? "Waiting on director graduation signoff."
                        : undefined;
    function handleSetTab(nextTab: Tab) {
        setTab(nextTab);
        saveSelectedTab(nextTab);
    }
    function handleEditClass(classToEdit: any) {
        setEditingClass(classToEdit);
        setTab("classSetup");
        saveSelectedTab("classSetup");
    }
    function handleSelectStudent(studentName: string) {
        setSelectedStudentName(studentName);

        if (role === "director") {
            setTab("groupRehearsal");
            saveSelectedTab("groupRehearsal");
        } else {
            setTab("privateLesson");
            saveSelectedTab("privateLesson");
        }
    }
    async function handleAddStudentToClass(studentId: string) {
        if (!selectedClass) return;

        const student = students.find((s) => s.id === studentId);
        if (!student) return;

        await supabase
            .from("rock_classes")
            .update({
                student_ids: [...selectedClass.studentIds, studentId],
                student_names: [...selectedClass.studentNames, student.name],
            })
            .eq("id", selectedClass.id);

        setClassesVersion((prev) => prev + 1);
    }
    async function handleDeleteClass(classId: string) {
        const confirmDelete = confirm("Are you sure you want to delete this class?");
        if (!confirmDelete) return;

        const { error } = await supabase
            .from("rock_classes")
            .delete()
            .eq("id", classId);

        if (error) {
            console.error("DELETE ERROR:", error);
            alert("Error deleting class");
            return;
        }

        // Clear selected class so UI resets
        setSelectedClassId(null);

        // Force reload of classes from Supabase
        setClassesVersion((prev) => prev + 1);
    }

    function handleRemoveStudentFromClass(studentId: string) {
        if (!selectedClass) return;

        const updatedClasses = filteredClassesBySchool.map((rockClass) => {
            if (rockClass.id !== selectedClass.id) return rockClass;

            const nextStudentIds = rockClass.studentIds.filter(
                (id: string) => id !== studentId
            );

            const nextStudentNames = rockClass.studentNames.filter((name: string) => {
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


    async function handleUpdateClassSongProgress(
        song: string,
        readiness: 1 | 2 | 3 | 4 | 5
    ) {
        if (!selectedClass) return;

        const nextSongProgress = {
            ...(selectedClass.songProgress ?? {}),
            [song]: {
                readiness,
                updatedAt: new Date().toISOString(),
            },
        };

        const { error } = await supabase
            .from("rock_classes")
            .update({
                song_progress: nextSongProgress,
            })
            .eq("id", selectedClass.id);

        if (error) {
            alert(
                `Save failed\nmessage: ${error?.message ?? "none"}\ndetails: ${error?.details ?? "none"
                }\nhint: ${error?.hint ?? "none"}\ncode: ${error?.code ?? "none"}`
            );
            return;
        }

        setSavedClasses((prev) =>
            prev.map((rockClass) =>
                rockClass.id === selectedClass.id
                    ? {
                        ...rockClass,
                        songProgress: nextSongProgress,
                    }
                    : rockClass
            )
        );
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

    async function handleUpdateStudentInstructor(
        studentName: string,
        instructorEmail: string
    ) {
        const targetStudent = students.find(
            (student) => student.name === studentName
        );

        if (!targetStudent) {
            alert("Student not found");
            return;
        }

        const { data, error } = await supabase
            .from("students")
            .update({
                primary_instructor_email: instructorEmail || null,
            })
            .eq("id", targetStudent.id)
            .select("id, first_name, last_initial, primary_instructor_email")
            .single();

        console.log("INSTRUCTOR UPDATE RESULT:", data);

        if (error) {
            console.error("Supabase instructor update failed:", error);
            alert("Instructor update failed");
            return;
        }

        setStudents((prev) =>
            prev.map((student) =>
                student.name === studentName
                    ? {
                        ...student,
                        primaryInstructorEmail: instructorEmail || "",
                    }
                    : student
            )
        );
    }

    async function handleToggleDone(item: string) {
        if (!selectedStudent) return;

        const student = selectedStudent;
        const privateSections = getPrivateLessonSections(student.instrument);
        const allPrivateItems = privateSections.flatMap((section: any) => section.items ?? []);
        const matchedItem = allPrivateItems.find((i: any) => i.id === item);
        const itemArea = matchedItem?.area ?? null;
        console.log("TOGGLE ITEM AREA:", item, itemArea);
        const existing = student.curriculum[item] ?? defaultCurriculumState;

        const nextDone = !existing.done;

        const nextCurriculum = {
            ...student.curriculum,
            [item]: {
                ...existing,
                done: nextDone,
                signed: nextDone ? existing.signed : false,
                date: nextDone ? existing.date : null,
            },
        };
        console.log("TOGGLE DONE DEBUG:", item, existing, nextCurriculum[item]);
        const nextWorkflow = {
            ...student.workflow,

            instructorSubmitted:
                role === "instructor"
                    ? false
                    : student.workflow.instructorSubmitted,

            directorSubmitted:
                canManageRock101
                    ? false
                    : student.workflow.directorSubmitted,

            graduationInstructorSubmitted:
                itemArea === "graduation"
                    ? false
                    : student.workflow.graduationInstructorSubmitted,

            graduationDirectorSubmitted:
                itemArea === "graduation"
                    ? false
                    : student.workflow.graduationDirectorSubmitted,

            parentSubmitted: false,
        };

        const { error } = await supabase
            .from("students")
            .update({
                curriculum: nextCurriculum,
                workflow: nextWorkflow,
            })
            .eq("id", student.id);

        if (error) {
            console.error("Supabase curriculum save failed:", error);
            alert("Save failed");
            return;
        }

        updateSelectedStudent((student) => ({
            ...student,
            curriculum: nextCurriculum,
            workflow: nextWorkflow,
        }));
    }
    async function handleInstructorGraduationSubmit() {
        if (!selectedStudent) return;

        if (
            role !== "instructor" &&
            role !== "generalManager" &&
            role !== "owner"
        ) {
            alert("You do not have permission to submit instructor graduation signoff.");
            return;
        }

        const student = selectedStudent;

        const nextWorkflow = {
            ...student.workflow,
            graduationInstructorSubmitted: true,
        };

        const { error } = await supabase
            .from("students")
            .update({
                workflow: nextWorkflow,
            })
            .eq("id", student.id);

        if (error) {
            console.error("Supabase graduation instructor signoff save failed:", error);
            alert("Graduation instructor signoff save failed");
            return;
        }

        updateSelectedStudent((student) => ({
            ...student,
            workflow: nextWorkflow,
        }));
    }
    async function handleDirectorGraduationSubmit() {
        if (!selectedStudent) return;

        const student = selectedStudent;

        const nextWorkflow = {
            ...student.workflow,
            graduationDirectorSubmitted: true,
        };

        const { error } = await supabase
            .from("students")
            .update({
                workflow: nextWorkflow,
            })
            .eq("id", student.id);

        if (error) {
            console.error("Supabase graduation director signoff save failed:", error);
            alert("Graduation director signoff save failed");
            return;
        }

        updateSelectedStudent((student) => ({
            ...student,
            workflow: nextWorkflow,
        }));
    }
    async function handleToggleSigned(item: string) {
        if (!selectedStudent) return;

        const student = selectedStudent;
        const privateSections = getPrivateLessonSections(student.instrument);
        const allPrivateItems = privateSections.flatMap((section: any) => section.items ?? []);
        const matchedItem = allPrivateItems.find((i: any) => i.id === item);
        const itemArea = matchedItem?.area ?? null;
        const existing = student.curriculum[item] ?? defaultCurriculumState;
        const nextSigned = !existing.signed;

        const nextCurriculum = {
            ...student.curriculum,
            [item]: {
                ...existing,
                done: nextSigned,
                signed: nextSigned,
                date: nextSigned ? new Date().toLocaleDateString() : null,
            },
        };
        console.log("TOGGLE SIGNED DEBUG:", item, existing, nextCurriculum[item]);
        const nextWorkflow = {
            ...student.workflow,

            // WEEKLY WORKFLOW (unchanged behavior)
            instructorSubmitted:
                role === "instructor"
                    ? false
                    : student.workflow.instructorSubmitted,

            directorSubmitted:
                canManageRock101
                    ? false
                    : student.workflow.directorSubmitted,

            // ✅ NEW: GRADUATION WORKFLOW RESET
            graduationInstructorSubmitted:
                itemArea === "graduation"
                    ? false
                    : student.workflow.graduationInstructorSubmitted,

            graduationDirectorSubmitted:
                itemArea === "graduation"
                    ? false
                    : student.workflow.graduationDirectorSubmitted,

            parentSubmitted: false,
        };

        const { error } = await supabase
            .from("students")
            .update({
                curriculum: nextCurriculum,
                workflow: nextWorkflow,
            })
            .eq("id", student.id);

        if (error) {
            console.error("Supabase curriculum sign save failed:", error);
            alert("Save failed");
            return;
        }

        updateSelectedStudent((student) => ({
            ...student,
            curriculum: nextCurriculum,
            workflow: nextWorkflow,
        }));
    }

    async function handleAddFistBump(item: string) {
        if (!selectedStudent) return;

        const student = selectedStudent;
        const existing = student.curriculum[item] ?? defaultCurriculumState;

        const nextCurriculum = {
            ...student.curriculum,
            [item]: {
                ...existing,
                fistBumps: (existing.fistBumps || 0) + 1,
            },
        };

        const nextWorkflow = {
            ...student.workflow,
            directorSubmitted: false,
            parentSubmitted: false,
        };

        const { error } = await supabase
            .from("students")
            .update({
                curriculum: nextCurriculum,
                workflow: nextWorkflow,
            })
            .eq("id", student.id);

        if (error) {
            console.error("Supabase fist bump save failed:", error);
            alert("Save failed");
            return;
        }

        updateSelectedStudent((student) => ({
            ...student,
            curriculum: nextCurriculum,
            workflow: nextWorkflow,
        }));
    }

    async function handleUpdateStudentSongReadiness(
        classId: string,
        song: string,
        readiness: 1 | 2 | 3 | 4 | 5
    ) {
        if (!selectedStudent) return;

        const student = selectedStudent;

        const nextSongReadiness = {
            ...(student.songReadiness ?? {}),
            [classId]: {
                ...(student.songReadiness?.[classId] ?? {}),
                [song]: {
                    readiness,
                    updatedAt: new Date().toISOString(),
                },
            },
        };

        const nextWorkflow = {
            ...student.workflow,
            directorSubmitted: false,
            parentSubmitted: false,
        };

        const { error } = await supabase
            .from("students")
            .update({
                song_readiness: nextSongReadiness,
                workflow: nextWorkflow,
            })
            .eq("id", student.id);

        if (error) {
            console.error("Supabase song readiness save failed:", error);
            alert("Save failed");
            return;
        }

        updateSelectedStudent((student) => ({
            ...student,
            songReadiness: nextSongReadiness,
            workflow: nextWorkflow,
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

    async function handleSaveFeedback(roleType: "instructor" | "director") {
        console.log("handleSaveFeedback called", {
            roleType,
            selectedStudentName,
        });
        if (!selectedStudent) return;
        const student = selectedStudent;

        const timestampKey =
            roleType === "instructor"
                ? "instructorUpdatedAt"
                : "directorUpdatedAt";

        const nextNotes = {
            ...student.notes,
            [timestampKey]: new Date().toLocaleString(),
        };

        const nextWorkflow = {
            ...student.workflow,
            instructorSubmitted:
                roleType === "instructor"
                    ? true
                    : student.workflow.instructorSubmitted,
            directorSubmitted:
                roleType === "director"
                    ? true
                    : student.workflow.directorSubmitted,
        };

        const { error } = await supabase
            .from("students")
            .update({
                notes: nextNotes,
                workflow: nextWorkflow,
            })
            .eq("id", student.id);

        if (error) {
            console.error("Supabase save failed:", error);
            alert("Save failed");
            return;
        }
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
                primaryInstructorEmail: student.primaryInstructorEmail,
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

    async function handleSubmitToParents() {
        if (!selectedStudent) {
            alert("No student selected.");
            return;
        }

        try {
            console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
            console.log("HAS ANON KEY:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-parent-update`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    },
                    body: JSON.stringify({
                        parentEmail: selectedStudent.parentEmail,
                        studentName: selectedStudent.name,
                        lessonNotes: selectedStudent.notes.instructor,
                        rehearsalNotes: selectedStudent.notes.director,
                    }),
                }
            );

            const resultText = await response.text();
            console.log("Parent update response status:", response.status);
            console.log("Parent update response body:", resultText);

            if (!response.ok) {
                alert(`Parent email failed. Status: ${response.status}`);
                return;
            }

            updateSelectedStudent((student) => ({
                ...student,
                workflow: {
                    ...student.workflow,
                    parentSubmitted: true,
                },
            }));

            alert("Parent update sent.");
        } catch (error) {
            console.error("Error sending parent update email:", error);
            alert("Parent email failed. Check browser console.");
        }
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

    async function handleLogout() {
        await supabase.auth.signOut();

        clearSavedSession();
        clearSavedTab();
        setCurrentUser(null);
        setSelectedClassId(null);
        setSelectedStudentName("");
        setStudentViewFilter("myStudents");
        setSelectedSchoolId("all");
        setManagementLandingView("classes");
        setTab("privateLesson");
    }

    if (!currentUser) {
        return (
            <LoginScreen
                onLogin={(user) => {
                    const normalizedUser = {
                        ...user,
                        schoolId: mapSchoolNameToId(user.schoolId),
                    };

                    saveSession(normalizedUser);
                    setCurrentUser(normalizedUser);

                    const defaultTab: Tab =
                        String(user.role).toLowerCase() === "parent"
                            ? "parent"
                            : "privateLesson";

                    setTab(defaultTab);
                    if (!getSavedTab()) {
                        saveSelectedTab(defaultTab);
                    }

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
        students.length > 0 &&
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
                            className="rounded-lg px-4 py-2 transition text-white"
                            style={{
                                backgroundColor:
                                    studentViewFilter === "allStudents"
                                        ? "var(--sor-red)"
                                        : "#27272a"
                            }}
                            onMouseEnter={(e) => {
                                if (studentViewFilter !== "allStudents") {
                                    e.currentTarget.style.backgroundColor = "#3f3f46";
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (studentViewFilter !== "allStudents") {
                                    e.currentTarget.style.backgroundColor = "#27272a";
                                }
                            }}
                        >
                            All Students
                        </button>
                    </div>
                )}

                {role === "instructor" &&
                    studentViewFilter === "myStudents" &&
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
                    (role === "owner" ||
                        role === "generalManager" ||
                        role === "instructor" ||
                        (role === "director" &&
                            currentUser?.email === activeClassForSelectedStudent?.directorEmail)) && (
                        <>

                            <WorkflowBanner
                                ready={workflowReady}
                                submitted={selectedStudent.workflow.parentSubmitted}
                                missingMessage={workflowMissingMessage}
                                studentName={selectedStudent.name}
                                onSubmit={handleSubmitToParents}
                                canSubmit={canSubmitParentUpdate({
                                    id: "temp",
                                    role: role as AppUser["role"],
                                })}
                            />
                        </>
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
                                    weeklySessions={weeklySessions}
                                    users={filteredUsersBySchool}
                                    onSelectClass={(classId, sessionId) => {
                                        console.log("SESSION CLICK DEBUG", { classId, sessionId });

                                        const matchedSession =
                                            weeklySessions.find((session) => session.id === sessionId) ?? null;

                                        setSelectedClassId(classId);
                                        setSelectedSessionId(sessionId ?? null);
                                        setSelectedSession(matchedSession);
                                        console.log("SELECTED SESSION STORED", sessionId ?? null);
                                        console.log("SELECTED SESSION OBJECT", matchedSession);
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
                                        View and open any Rock 101 student profile for this school.
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
                                        className="rounded-lg px-4 py-2 transition text-white"
                                        style={{
                                            backgroundColor:
                                                studentViewFilter === "myStudents"
                                                    ? "var(--sor-red)"
                                                    : "#27272a"
                                        }}
                                        onMouseEnter={(e) => {
                                            if (studentViewFilter !== "myStudents") {
                                                e.currentTarget.style.backgroundColor = "#3f3f46";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (studentViewFilter !== "myStudents") {
                                                e.currentTarget.style.backgroundColor = "#27272a";
                                            }
                                        }}
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
                        selectedSessionId={selectedSessionId}
                        selectedSession={
                            weeklySessions.find((session) => session.id === selectedSessionId) ?? null
                        }
                        students={studentsInSelectedClass}
                        users={filteredUsersBySchool}
                        allStudents={filteredStudentsBySchool}
                        onAddStudentToClass={handleAddStudentToClass}
                        onRemoveStudentFromClass={handleRemoveStudentFromClass}
                        onEditClass={() => {
                            handleEditClass(selectedClass);
                        }}
                        onDeleteClass={() => {
                            handleDeleteClass(selectedClass.id);
                        }}
                        onUpdateSongProgress={(song, readiness) => {
                            handleUpdateClassSongProgress(song, readiness);
                        }}
                        onBackToClasses={() => {
                            setSelectedClassId(null);
                            setSelectedStudentName("");
                        }}
                        onSelectStudent={(studentName) => {
                            setSelectedStudentName(studentName);
                        }}
                        directorFeedback={(selectedClass as any)?.directorFeedback ?? ""}
                        onDirectorFeedbackChange={(value) => {
                            setSavedClasses((prev) =>
                                prev.map((rockClass) =>
                                    rockClass.id === selectedClass.id
                                        ? { ...rockClass, directorFeedback: value }
                                        : rockClass
                                )
                            );
                        }}
                        onSaveDirectorFeedback={() => {
                            alert("Director feedback saved.");
                        }}
                    />
                )}

                {(canSeeManagementTabs || canSeeStudentTabs) && (
                    <div>
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
                                className="rounded-lg px-4 py-2 transition text-white"
                                style={{
                                    backgroundColor:
                                        tab === "privateLesson"
                                            ? "var(--sor-red)"
                                            : "#27272a"
                                }}
                                onMouseEnter={(e) => {
                                    if (tab !== "privateLesson") {
                                        e.currentTarget.style.backgroundColor = "#3f3f46";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (tab !== "privateLesson") {
                                        e.currentTarget.style.backgroundColor = "#27272a";
                                    }
                                }}
                            >
                                Private Lesson
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetTab("graduationRequirements")}
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
                                className="rounded-lg px-4 py-2 transition text-white"
                                style={{
                                    backgroundColor:
                                        tab === "groupRehearsal"
                                            ? "var(--sor-red)"
                                            : "#27272a"
                                }}
                                onMouseEnter={(e) => {
                                    if (tab !== "groupRehearsal") {
                                        e.currentTarget.style.backgroundColor = "#3f3f46";
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (tab !== "groupRehearsal") {
                                        e.currentTarget.style.backgroundColor = "#27272a";
                                    }
                                }}
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
                                Student Dashboard
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
                                onClick={() => handleSetTab("performanceDashboard")}
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
                                role === "owner" ||
                                role === "generalManager" ||
                                (role === "instructor" &&
                                    currentUser?.email === selectedStudent.primaryInstructorEmail)
                            }
                            canSign={
                                role === "instructor" ||
                                role === "director" ||
                                role === "generalManager" ||
                                role === "owner"
                            }
                        />

                        {(role === "owner" ||
                            role === "generalManager" ||
                            (role === "instructor" &&
                                currentUser?.email === selectedStudent.primaryInstructorEmail)) && (
                                <NotesPanel
                                    role="instructor"
                                    value={selectedStudent.notes.instructor}
                                    saved={selectedStudent.workflow.instructorSubmitted}
                                    onChange={(v) => handleNoteChange("instructor", v)}
                                    onSave={() => handleSaveFeedback("instructor")}
                                    canEdit={
                                        role === "owner" ||
                                        role === "generalManager" ||
                                        (role === "instructor" &&
                                            currentUser?.email === selectedStudent.primaryInstructorEmail)
                                    }
                                />
                            )}
                    </>
                )}

                {canSeeStudentTabs &&
                    tab === "graduationRequirements" &&
                    selectedStudent && (
                        <GraduationRequirementsView
                            student={selectedStudent}
                            workflow={{
                                graduationInstructorSubmitted:
                                    selectedStudent.workflow?.graduationInstructorSubmitted ?? false,
                                graduationDirectorSubmitted:
                                    selectedStudent.workflow?.graduationDirectorSubmitted ?? false,
                            }}
                            onToggleDone={handleToggleDone}
                            onToggleSigned={handleToggleSigned}
                            onInstructorGraduationSubmit={handleInstructorGraduationSubmit}
                            onDirectorGraduationSubmit={handleDirectorGraduationSubmit}
                            canInstructorGraduationSubmit={
                                role === "instructor" ||
                                role === "generalManager" ||
                                role === "owner"
                            }
                            canDirectorGraduationSubmit={
                                role === "director" ||
                                role === "generalManager" ||
                                role === "owner"
                            }
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

                {canSeeStudentTabs && tab === "groupRehearsal" && selectedStudent && (
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
                                role === "owner" ||
                                role === "generalManager" ||
                                (role === "director" &&
                                    currentUser?.email === activeClassForSelectedStudent?.directorEmail)
                            }
                            canSign={
                                role === "director" ||
                                role === "generalManager" ||
                                role === "owner"
                            }
                        />

                        {(role === "owner" ||
                            role === "generalManager" ||
                            role === "director") && (
                                <>
                                    <div className="mb-2 text-lg font-semibold text-white">
                                        Director Weekly Feedback
                                    </div>
                                    <div className="mb-2 text-lg font-semibold text-white">
                                        Director Weekly Feedback
                                    </div>
                                    <NotesPanel
                                        role="director"
                                        value={selectedStudent.notes?.director ?? ""}
                                        saved={selectedStudent.workflow?.directorSubmitted ?? false}
                                        onChange={(v) => handleNoteChange("director", v)}
                                        onSave={() => handleSaveFeedback("director")}
                                        canEdit={
                                            role === "owner" ||
                                            role === "generalManager" ||
                                            role === "director"
                                        }
                                    />
                                </>
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
                        mode={editingClass ? "edit" : "create"}
                        classToEdit={editingClass}
                        onClassSaved={() => {

                            setEditingClass(null);
                            setClassesVersion((prev) => prev + 1);
                            setTab("privateLesson");
                            saveSelectedTab("privateLesson");
                        }}
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
                        canManageUsers={role === "owner" || role === "generalManager"}
                        onUpdateStudentParentEmail={async (studentName, parentEmail) => {
                            const targetStudent = students.find(
                                (student) => student.name === studentName
                            );

                            if (!targetStudent) {
                                alert("Student not found");
                                return;
                            }

                            const { error } = await supabase
                                .from("students")
                                .update({ parent_email: parentEmail })
                                .eq("id", targetStudent.id);

                            if (error) {
                                console.error("Supabase parent email update failed:", error);
                                alert("Parent email update failed");
                                return;
                            }

                            setStudents((prev) =>
                                prev.map((student) =>
                                    student.name === studentName
                                        ? { ...student, parentEmail }
                                        : student
                                )
                            );
                        }}
                        onDeleteStudent={async (studentId) => {
                            if (!studentId) {
                                alert("Student ID is missing");
                                return;
                            }
                            const targetStudent = students.find(
                                (student) => student.id === studentId
                            );

                            if (!targetStudent) {
                                alert("Student not found");
                                return;
                            }

                            const confirmed = window.confirm(
                                `Are you sure you want to delete ${targetStudent.name}?`
                            );

                            if (!confirmed) return;

                            const { error } = await supabase
                                .from("students")
                                .delete()
                                .eq("id", studentId);

                            if (error) {
                                console.error("Supabase delete student failed:", error);
                                alert("Delete failed");
                                return;
                            }

                            setStudents((prev) =>
                                prev.filter((student) => student.id !== studentId)
                            );

                        }}
                        onToggleStudentActive={(studentId, nextActive) => {
                            console.log("TOGGLE:", studentId, nextActive);

                            setStudents((prev) => {
                                const updated = prev.map((student) => {
                                    if (String(student.id) === String(studentId)) {
                                        console.log("MATCH FOUND:", student);
                                        return { ...student, active: nextActive };
                                    }
                                    return student;
                                });

                                console.log("UPDATED STUDENTS:", updated);
                                return updated;
                            });
                        }}

                        onUpdateStudentInstructor={(studentName, instructorEmail) => {
                            handleUpdateStudentInstructor(studentName, instructorEmail);
                        }}
                        onUpdateStudentRecord={async (studentName, updates) => {
                            const targetStudent = students.find(
                                (student) => student.name === studentName
                            );

                            if (!targetStudent) {
                                alert("Student not found");
                                return;
                            }

                            const nextName = `${updates.firstName} ${updates.lastInitial}`.trim();

                            const { error } = await supabase
                                .from("students")
                                .update({
                                    first_name: updates.firstName,
                                    last_initial: updates.lastInitial || null,
                                    instrument: updates.instrument,
                                    school: updates.school,
                                    program: updates.primaryProgramId,
                                    primary_program_id: updates.primaryProgramId,
                                })
                                .eq("id", targetStudent.id);

                            if (error) {
                                console.error("Supabase student update failed:", error);
                                alert("Student update failed");
                                return;
                            }

                            setStudents((prev) =>
                                prev.map((student) =>
                                    student.name === studentName
                                        ? {
                                            ...student,
                                            name: `${updates.firstName} ${updates.lastInitial}`.trim(),
                                            firstName: updates.firstName,
                                            lastInitial: updates.lastInitial,
                                            instrument: updates.instrument,
                                            school: updates.school,

                                            // 🔴 CRITICAL FIX
                                            primaryProgramId: updates.primaryProgramId,
                                            program: updates.primaryProgramId,
                                        }
                                        : student
                                )
                            );
                        }}
                    />
                )}
            </div>
        </div>
    );
}