"use client";
import { useEffect, useMemo, useState } from "react";
import {
    fetchAllCurriculumItems,
    type CurriculumItem,
} from "@/lib/curriculumQueries";
import GraduationRequirementsView from "@/components/GraduationRequirementsView";
import ParentDashboardOverview from "@/components/ParentDashboardOverview";
import { buildParentDashboardData } from "@/lib/parentDashboard";
import LoginScreen from "@/components/LoginScreen";
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
import {
    canEditGroupRehearsal,
    canSubmitParentUpdate,
    type AppUser,
} from "@/lib/access";
import AdminView from "@/components/AdminView";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import ClassSelectorView from "@/components/ClassSelectorView";
import ClassDetailView from "@/components/ClassDetailView";
import ScheduleView from "@/components/ScheduleView";
import ExecutionDashboard from "@/components/ExecutionDashboard";
import LessonSetupView from "@/components/LessonSetupView";
import MyScheduleView from "@/components/MyScheduleView";
import StaffProfileView from "@/components/StaffProfileView";
import ClassRosterView from "@/components/ClassRosterView";

import { supabase } from "@/lib/supabaseClient";
import { getThisWeeksSessions } from "@/lib/classes";
import { getEarnedBadges } from "@/lib/progress";
import {
    clearSavedSession,
    saveSelectedTab,
    getSavedTab,
    clearSavedTab,
    SessionUser,
} from "@/lib/session";
import Link from "next/link";
import AppShell from "@/components/AppShell";
type Tab =
    | "privateLesson"
    | "graduationRequirements"
    | "groupRehearsal"
    | "badges"
    | "parent"
    | "certificate"
    | "classes"
    | "classSetup"
    | "schedule"
    | "performanceDashboard"
    | "bandsDashboard"
    | "pipeline"
    | "executionDashboard"
    | "lessonSetup"
    | "manageLessons"
    | "mySchedule"
    | "myProfile"
    | "admin"
    | "classRoster";

type CurriculumState = {
    done: boolean;
    signed: boolean;
    date: string | null;
    highFives: number;
};

const defaultCurriculumState: CurriculumState = {
    done: false,
    signed: false,
    date: null,
    highFives: 0,
};

type SchoolFilter = "all" | string;
type ManagementLandingView = "classes" | "students";

function mapSchoolNameToId(schoolName?: string | null): string {
    const normalized = (schoolName ?? "")
        .toLowerCase()
        .replace(/_/g, " ");

    if (normalized.includes("del mar")) return "del-mar";
    if (normalized.includes("encinitas")) return "encinitas";
    if (normalized.includes("scripps")) return "scripps-ranch";

    return "del-mar";
}

export default function Rock101App() {
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
    const [studentSearch, setStudentSearch] = useState("");
    const [curriculumItems, setCurriculumItems] = useState<CurriculumItem[]>([]);
    const [schoolList, setSchoolList] = useState<{ id: string; name: string }[]>([]);
    const [parentEmailStatus, setParentEmailStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
        const checkUser = async () => {
            const { data } = await supabase.auth.getUser();

            if (data?.user) {
                const authEmail = data.user.email?.trim().toLowerCase();

                const { data: staffMatches } = await supabase
                    .from("staff")
                    .select("id, email, name, role, school_slug")
                    .eq("email", authEmail);

                let dbUser = null;

                if (staffMatches && staffMatches.length === 1) {
                    dbUser = staffMatches[0];
                } else if (staffMatches && staffMatches.length > 1) {
                    console.error("Multiple staff rows found for email:", authEmail, staffMatches);
                } else {
                    console.error("No staff row found for email:", authEmail);
                }

                if (dbUser) {
                    const sessionUser: SessionUser = {
                        email: dbUser.email,
                        name: dbUser.name,
                        role: dbUser.role ?? "owner",
                        schoolId: mapSchoolNameToId(dbUser.school_slug),
                        staffId: dbUser.id,
                    };
                    setCurrentUser(sessionUser);
                }
            }
        };

        checkUser();
    }, []);
    useEffect(() => {
        const savedTab = getSavedTab();

        if (role === "music_director") {
            setTab("groupRehearsal");  // Music Directors always land on Group Rehearsal
        } else if (role === "instructor" && !savedTab) {
            setTab("mySchedule");  // Instructors default to My Schedule
        } else if (savedTab) {
            setTab(savedTab as Tab);  // For others, restore saved tab
        }
    }, []);

    useEffect(() => {
        async function loadStudents() {
            if (!currentUser) return; 
            const { data, error } = await supabase
                .from("students")
                .select("*")
                .eq("program", "rock101");

            if (error) {
                console.error("SUPABASE LOAD STUDENTS ERROR:", error);
                return;
            }

            if (!data) return;
            const formatted = data.map((s: any) => {
                const schoolId = s.school_id ?? mapSchoolNameToId(s.school);

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
                    primaryInstructorUserId: s.primary_instructor_user_id ?? null,
                    curriculum: s.curriculum ?? {},
                    notes: {
                        instructor: s.notes?.instructor ?? "",
                        class_instructor: s.notes?.class_instructor ?? "",
                        instructorUpdatedAt: s.notes?.instructorUpdatedAt ?? null,
                        classInstructorUpdatedAt: s.notes?.classInstructorUpdatedAt ?? null,
                        instructorUpdatedBy: s.notes?.instructorUpdatedBy ?? null,
                        classInstructorUpdatedBy: s.notes?.classInstructorUpdatedBy ?? null,
                    },
                    workflow: {
                        instructorSubmitted: s.workflow?.instructorSubmitted ?? false,
                        classInstructorSubmitted: s.workflow?.classInstructorSubmitted ?? false,
                        graduationInstructorSubmitted:
                            s.workflow?.graduationInstructorSubmitted ?? false,
                        graduationDirectorSubmitted:
                            s.workflow?.graduationDirectorSubmitted ?? false,
                        parentSubmitted: s.workflow?.parentSubmitted ?? false,
                    },
                    songReadiness: s.song_readiness ?? {},
                };
            });
            const safeStudents = isOwner
                ? formatted
                : formatted.filter(
                    (student) => student.schoolId === currentUser?.schoolId
                );
            setStudents(safeStudents);

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
            const ownerRole = currentUser?.role === "owner";
            const schoolIdFilter =
                ownerRole && selectedSchoolId !== "all"
                    ? selectedSchoolId
                    : (currentUser?.schoolId ?? "");
            const { data, error } = await supabase
                .from("rock_classes")
                .select("*")
                .eq("school_id", schoolIdFilter);

            if (error) {
                console.error("SUPABASE LOAD CLASSES ERROR:", error);
                setSavedClasses([]);
                return;
            }

            const supabaseClasses = (data ?? []).map((c: any) => {

                return {
                    id: c.id,
                    name: c.name,
                    schoolId: c.school_id ?? "",
                    classInstructorEmail: c.class_instructor_email ?? "",
                    classInstructorId: c.class_instructor_id ?? null,
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
            setSavedClasses(supabaseClasses);
        }

        loadClasses();
    }, [classesVersion, currentUser, selectedSchoolId]);


    useEffect(() => {
        async function loadSessions() {
            if (!currentUser?.schoolId) return;

            const sessions = await getThisWeeksSessions(currentUser.schoolId);
            setWeeklySessions(sessions);
        }

        loadSessions();
    }, [currentUser]);
    const role = currentUser?.role ?? null;
    const isOwner = role === "owner";
    const canManageRock101 =
        role === "music_director" || role === "general_manager" || role === "owner";
    const isGeneralManager = role === "general_manager";
    const canSeeManagementTabs = canManageRock101;
    const canSeeClassRoster =
        role === "owner" || role === "general_manager" || role === "instructor";

    const [allUsers, setAllUsers] = useState<any[]>([]);

    const effectiveSchoolFilter: SchoolFilter = useMemo(() => {
        if (isOwner) return selectedSchoolId;

        if (currentUser && "schoolId" in currentUser && currentUser.schoolId) {
            return currentUser.schoolId;
        }

        return "del-mar";
    }, [isOwner, selectedSchoolId, currentUser]);

    const filteredStudentsBySchool = useMemo(() => {
        if (effectiveSchoolFilter === "all") return students;

        const result = students.filter((student) => {
            return student.schoolId === effectiveSchoolFilter;
        });
        return result;
    }, [students, effectiveSchoolFilter]);

    const filteredUsersBySchool = useMemo(() => {
        if (effectiveSchoolFilter === "all") return allUsers;

        return allUsers.filter((user) => {
            if (user.role === "owner") return true;
            return user.schoolId === effectiveSchoolFilter;
        });
    }, [allUsers, effectiveSchoolFilter]);


    const filteredClassesBySchool = useMemo(() => {
        // All staff at the school see all classes. Filter by school only.
        if (effectiveSchoolFilter === "all") return savedClasses;
        return savedClasses.filter((rockClass) => rockClass.schoolId === effectiveSchoolFilter);
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
        if (!currentUser || role !== "music_director") return new Set<string>();

        return new Set(
            filteredClassesBySchool
                .filter(
                    (rockClass) =>
                        rockClass.classInstructorEmail?.toLowerCase() ===
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
            if (studentViewFilter === "allStudents") {
                return filteredStudentsBySchool;
            }

            const myStudents = filteredStudentsBySchool.filter((student) => {
                const studentEmail = student.primaryInstructorEmail?.trim().toLowerCase();
                const userEmail = currentUser.email?.trim().toLowerCase();
                return studentEmail === userEmail;
            });
            return myStudents;
        }

        if (canManageRock101) {
            if (selectedClass) {
                return studentsInSelectedClass;
            }

            if (managementLandingView === "students") {
                if (role === "music_director" && studentViewFilter === "myStudents") {
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

    useEffect(() => {
        if (!selectedStudent?.instrument) return;
        fetchAllCurriculumItems(selectedStudent.instrument).then(setCurriculumItems);
    }, [selectedStudent?.instrument]);

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

    const canSeeStudentTabs: boolean =
        role === "parent" || role === "instructor" || canManageRock101;

    // Can edit/sign group rehearsal: owner/GM always; others only if their staffId
    // matches the class's class_instructor_id OR the session's instructor_override_user_id.
    const canEditGroupClass =
        role === "owner" ||
        role === "general_manager" ||
        (!!currentUser?.staffId && (
            activeClassForSelectedStudent?.classInstructorId === currentUser.staffId ||
            selectedSession?.instructor_override_user_id === currentUser.staffId
        ));

    const canSeeStudentContent: boolean =
        canSeeStudentTabs &&
        (role === "parent" || !!selectedStudentName);

    const currentSchoolName = selectedStudent
        ? schoolList.find((s) => s.id === selectedStudent.schoolId)?.name ?? "School of Rock"
        : effectiveSchoolFilter !== "all"
            ? schoolList.find((s) => s.id === effectiveSchoolFilter)?.name ?? "School of Rock"
            : "All Schools";

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

        const studentTabs: Tab[] = ["privateLesson", "groupRehearsal", "graduationRequirements", "parent", "certificate", "badges"];
        if ((!selectedStudentName || !hasSelectedStudent) && studentTabs.includes(tab)) {
            setSelectedStudentName(visibleStudents[0].name);
        }
    }, [visibleStudents, selectedStudentName, canManageRock101, tab]);
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
                const formattedUsers = data.map((u) => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    schoolId: u.school_slug,
                }));

                setAllUsers(formattedUsers);
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
        ? getEarnedBadges(selectedStudent, curriculumItems)
        : new Set<string>();

    const parentDashboardData = useMemo(() => {
        if (!selectedStudent) return null;

        const matchedSchool = schoolList.find(
            (school) => school.id === selectedStudent.schoolId
        );

        const privateLessonItems = curriculumItems.filter(
            (item) => item.location === "privateLesson"
        );

        const groupRehearsalItems = curriculumItems.filter(
            (item) => item.location === "groupRehearsal"
        );

        const dashboardClass =
            activeClassForSelectedStudent ?? selectedClass ?? null;
        const classFeedback = dashboardClass?.classInstructorNotes ?? null;
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
            lessonAuthorName: selectedStudent.notes?.instructorUpdatedBy ?? null,
            rehearsalAuthorName: selectedStudent.notes?.classInstructorUpdatedBy ?? null,
            classFeedback,
            badges: [],
        });
    }, [selectedStudent, selectedClass, activeClassForSelectedStudent, curriculumItems]);

    const studentNavItems = useMemo(() => {
        // Dynamic nav per Shell Architecture — Rock 101 is the only program currently
        return [
            { tab: "parent", label: "Dashboard" },
            { tab: "privateLesson", label: "Private Lesson" },
            { tab: "graduationRequirements", label: "Grad Requirements" },
            { tab: "groupRehearsal", label: "Group Rehearsal" },
            { tab: "certificate", label: "Certificate" },
        ];
    }, []);

    const exceptionsCount = useMemo(() => {
        const base = filteredStudentsBySchool.filter((s) => {
            if (s.workflow.parentSubmitted) return false;
            return !s.workflow.instructorSubmitted || !s.workflow.classInstructorSubmitted;
        });
        if (role === "instructor") {
            return base.filter((s) => s.primaryInstructorEmail === currentUser?.email).length;
        }
        return base.length;
    }, [filteredStudentsBySchool, role, currentUser?.email]);

    const workflowReady = selectedStudent
        ? selectedStudent.workflow.instructorSubmitted &&
        selectedStudent.workflow.classInstructorSubmitted &&
        !selectedStudent.workflow.parentSubmitted
        : false;
    const workflowMissingMessage = !selectedStudent
        ? undefined
        : selectedStudent.workflow.parentSubmitted
            ? undefined
            : !selectedStudent.workflow.instructorSubmitted
                ? "Waiting on instructor weekly feedback."
                : !selectedStudent.workflow.classInstructorSubmitted
                    ? "Waiting on class instructor weekly feedback."
                    : undefined;
    function handleSetTab(nextTab: Tab) {
        setTab(nextTab);
        saveSelectedTab(nextTab);
    }
    function handleEditClass(classToEdit: any) {
        setEditingClass(classToEdit);
        handleSetTab("classSetup");
    }
    function handleSelectStudent(studentName: string) {
        setSelectedStudentName(studentName);

        if (role === "music_director") {
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

    async function handleRemoveStudentFromClass(studentId: string) {
        if (!selectedClass) return;

        const nextStudentIds = selectedClass.studentIds.filter(
            (id: string) => id !== studentId
        );

        const nextStudentNames = selectedClass.studentNames.filter((name: string) => {
            const matchingStudent = students.find(
                (student) => student.name === name
            );
            return matchingStudent?.id !== studentId;
        });

        const { error } = await supabase
            .from("rock_classes")
            .update({
                student_ids: nextStudentIds,
                student_names: nextStudentNames,
            })
            .eq("id", selectedClass.id);

        if (error) {
            console.error("SUPABASE REMOVE STUDENT ERROR:", error);
            alert(`Error removing student: ${error.message}`);
            return;
        }

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

        if (!targetStudent.id) {
            alert(`Instructor update failed: missing student id for ${studentName}`);
            return;
        }

        const { data, error } = await supabase
            .from("students")
            .update({
                primary_instructor_email: instructorEmail || null,
            })
            .eq("id", targetStudent.id)
            .select("id, primary_instructor_email");

        if (error) {
            console.error("Supabase instructor update failed:", error);
            alert(`Instructor update failed: ${error.message}`);
            return;
        }

        if (!data || data.length === 0) {
            alert(`Instructor update failed: no student row matched id ${targetStudent.id}`);
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
        const matchedItem = curriculumItems.find((i) => i.id === item);
        const itemArea = matchedItem?.area ?? null;
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
        const nextWorkflow = {
            ...student.workflow,

            instructorSubmitted:
                role === "instructor"
                    ? false
                    : student.workflow.instructorSubmitted,

            classInstructorSubmitted:
                canManageRock101
                    ? false
                    : student.workflow.classInstructorSubmitted,

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
        const matchedItem = curriculumItems.find((i) => i.id === item);
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
        const nextWorkflow = {
            ...student.workflow,

            // WEEKLY WORKFLOW (unchanged behavior)
            instructorSubmitted:
                role === "instructor"
                    ? false
                    : student.workflow.instructorSubmitted,

            classInstructorSubmitted:
                canManageRock101
                    ? false
                    : student.workflow.classInstructorSubmitted,

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
                highFives: (existing.highFives || 0) + 1,
            },
        };

        const nextWorkflow = {
            ...student.workflow,
            classInstructorSubmitted: false,
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
            classInstructorSubmitted: false,
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
        roleType: "instructor" | "class_instructor",
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
                classInstructorSubmitted:
                    roleType === "class_instructor"
                        ? false
                        : student.workflow.classInstructorSubmitted,
                parentSubmitted: false,
            },
        }));
    }

    async function handleSaveFeedback(roleType: "instructor" | "class_instructor") {
        if (!selectedStudent) return;

        const student = selectedStudent;

        const timestampKey =
            roleType === "instructor"
                ? "instructorUpdatedAt"
                : "classInstructorUpdatedAt";

        const updatedByKey =
            roleType === "instructor"
                ? "instructorUpdatedBy"
                : "classInstructorUpdatedBy";

        const now = new Date().toLocaleString();
        const author = currentUser?.name ?? currentUser?.email ?? "Unknown";

        const nextNotes = {
            ...student.notes,
            [timestampKey]: now,
            [updatedByKey]: author,
        };

        const nextWorkflow = {
            ...student.workflow,
            instructorSubmitted:
                roleType === "instructor"
                    ? true
                    : student.workflow.instructorSubmitted,
            classInstructorSubmitted:
                roleType === "class_instructor"
                    ? true
                    : student.workflow.classInstructorSubmitted,
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

        updateSelectedStudent((student) => ({
            ...student,
            primaryInstructorEmail: student.primaryInstructorEmail,
            notes: {
                ...student.notes,
                [timestampKey]: now,
                [updatedByKey]: author,
            },
            workflow: {
                ...student.workflow,
                instructorSubmitted:
                    roleType === "instructor"
                        ? true
                        : student.workflow.instructorSubmitted,
                classInstructorSubmitted:
                    roleType === "class_instructor"
                        ? true
                        : student.workflow.classInstructorSubmitted,
            },
        }));

        if (roleType === "instructor") {
            const matchedSession = weeklySessions.find(
                (s) => s.rock_classes?.id === activeClassForSelectedStudent?.id
            );
            if (matchedSession) {
                const { error: signoffError } = await supabase
                    .from("session_student_signoffs")
                    .upsert(
                        {
                            session_id: matchedSession.id,
                            student_id: student.id,
                            instructor_submitted: true,
                            instructor_submitted_at: new Date().toISOString(),
                            instructor_submitted_by: currentUser?.staffId,
                        },
                        { onConflict: "session_id,student_id", ignoreDuplicates: false }
                    );
                if (signoffError) {
                    console.warn("session_student_signoffs upsert failed:", signoffError);
                }
            } else {
                console.warn(
                    "handleSaveFeedback: no matching session found for class",
                    activeClassForSelectedStudent?.id
                );
            }
        }
    }

    async function handleSubmitToParents() {
        if (!selectedStudent) return;

        setParentEmailStatus(null);

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-parent-update`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    },
                    body: JSON.stringify({
                        studentId: selectedStudent.id,
                    }),
                }
            );

            if (!response.ok) {
                setParentEmailStatus({ type: "error", message: `Failed to send parent email (status ${response.status}).` });
                return;
            }

            const { error: workflowError } = await supabase
                .from("students")
                .update({
                    workflow: {
                        ...selectedStudent.workflow,
                        parentSubmitted: true,
                    },
                })
                .eq("id", selectedStudent.id);

            if (workflowError) {
                console.error("Failed to persist parentSubmitted:", workflowError);
            }

            updateSelectedStudent((student) => ({
                ...student,
                workflow: {
                    ...student.workflow,
                    parentSubmitted: true,
                },
            }));
        } catch (error) {
            console.error("Error sending parent update email:", error);
            setParentEmailStatus({ type: "error", message: "Failed to send parent email. Check browser console." });
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

                    setCurrentUser(normalizedUser);

                    const userRole = String(user.role).toLowerCase();
                    const defaultTab: Tab =
                        userRole === "parent"
                            ? "parent"
                            : userRole === "instructor"
                                ? "classes"
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
            <AppShell
                schoolName={currentSchoolName}
                userName={currentUser?.name ?? ""}
                currentTab={tab}
                onTabChange={(newTab) => handleSetTab(newTab as Tab)}
                onSignOut={handleLogout}
                canSeeStudentTabs={canSeeStudentTabs}
                canSeeManagementTabs={canSeeManagementTabs}
                role={role ?? ""}
                isOwner={isOwner}
                schoolList={schoolList}
                onSchoolChange={(id) => setSelectedSchoolId(id)}
                studentNavItems={studentNavItems}
                exceptionsCount={exceptionsCount}
                canSeeClassRoster={canSeeClassRoster}
            >
                <div className="p-6">
                    <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
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
            </AppShell>
        );
    }

    return (
        <AppShell
            schoolName={currentSchoolName}
            userName={currentUser?.name ?? ""}
            studentName={selectedStudentName || undefined}
            instrument={selectedStudentName ? selectedStudent?.instrument ?? undefined : undefined}
            programName="Rock 101"
            currentTab={tab}
            onTabChange={(newTab) => setTab(newTab as Tab)}
            onSignOut={handleLogout}
            canSeeStudentTabs={canSeeStudentTabs}
            canSeeManagementTabs={canSeeManagementTabs}
            role={role ?? ""}
            isOwner={isOwner}
            schoolList={schoolList}
            onSchoolChange={(id) => setSelectedSchoolId(id)}
            studentNavItems={studentNavItems}
            exceptionsCount={exceptionsCount}
            canSeeClassRoster={canSeeClassRoster}
        >
            <div className="p-6">
                {role === "instructor" && (
                    <div className="mb-4 flex gap-3">
                        <button
                            type="button"
                            onClick={() => setStudentViewFilter("myStudents")}
                            className={`rounded-none px-4 py-2 ${studentViewFilter === "myStudents"
                                ? "bg-[#cc0000]"
                                : "bg-zinc-800 hover:bg-zinc-700"
                                }`}
                        >
                            My Students
                        </button>

                        <button
                            type="button"
                            onClick={() => setStudentViewFilter("allStudents")}
                            className="rounded-none px-4 py-2 transition text-white"
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
                        <div className="mb-4 rounded-none border border-zinc-800 bg-zinc-900 p-4 text-zinc-300">
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
                    !!selectedStudentName &&
                    (tab === "parent" || tab === "privateLesson" || tab === "groupRehearsal" || tab === "graduationRequirements" || tab === "certificate") &&
                    (role === "owner" ||
                        role === "general_manager" ||
                        role === "instructor" ||
                        (role === "music_director" &&
                            currentUser?.email === activeClassForSelectedStudent?.classInstructorEmail)) && (
                        <div className="px-6 pt-6">
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
                            {parentEmailStatus && (
                                <div className={`mb-4 rounded-none p-3 text-sm ${parentEmailStatus.type === "error" ? "bg-[#cc0000]/20 text-white" : "bg-zinc-800 text-zinc-300"}`}>
                                    {parentEmailStatus.message}
                                </div>
                            )}
                        </div>
                    )}

                {canManageRock101 && !selectedClass && !selectedStudentName && (
                    <div className="mb-6 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={handleShowManagementClasses}
                            className={`rounded-none px-4 py-2 text-white ${managementLandingView === "classes"
                                ? "bg-[#cc0000]"
                                : "bg-zinc-800 hover:bg-zinc-700"
                                }`}
                        >
                            Classes
                        </button>

                        <button
                            type="button"
                            onClick={handleShowManagementStudents}
                            className={`rounded-none px-4 py-2 text-white ${managementLandingView === "students"
                                ? "bg-[#cc0000]"
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
                                <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
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
                                        className="mt-5 rounded-none bg-[#cc0000] px-4 py-2 text-white hover:bg-[#b30000]"
                                    >
                                        Create First Class
                                    </button>
                                </div>
                            ) : (
                                <ClassSelectorView
                                    classes={filteredClassesBySchool}
                                    weeklySessions={weeklySessions}
                                    users={filteredUsersBySchool}
                                    currentUserStaffId={currentUser?.staffId}
                                    onSelectClass={(classId, sessionId) => {

                                        const matchedSession =
                                            weeklySessions.find((session) => session.id === sessionId) ?? null;

                                        setSelectedClassId(classId);
                                        setSelectedSessionId(sessionId ?? null);
                                        setSelectedSession(matchedSession);
                                        setSelectedStudentName("");
                                    }}
                                />
                            )}
                        </>
                    )}

                {role === "instructor" &&
                    tab === "classes" &&
                    !selectedClass && (
                        filteredClassesBySchool.length === 0 ? (
                            <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
                                <h2 className="text-2xl font-bold text-white">No classes found</h2>
                                <p className="mt-3 text-zinc-300">
                                    No Rock 101 classes have been set up for this school yet.
                                </p>
                            </div>
                        ) : (
                            <ClassSelectorView
                                classes={filteredClassesBySchool}
                                weeklySessions={weeklySessions}
                                users={filteredUsersBySchool}
                                currentUserStaffId={currentUser?.staffId}
                                onSelectClass={(classId, sessionId) => {
                                    const matchedSession =
                                        weeklySessions.find((session) => session.id === sessionId) ?? null;
                                    setSelectedClassId(classId);
                                    setSelectedSessionId(sessionId ?? null);
                                    setSelectedSession(matchedSession);
                                    setSelectedStudentName("");
                                }}
                            />
                        )
                    )}

                {canManageRock101 &&
                    managementLandingView === "students" &&
                    !selectedClass &&
                    !selectedStudentName && (
                        <div className="rounded-none border border-zinc-800 bg-zinc-900 p-6">
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

                            <div className="mt-4 relative">
                                <input
                                    type="text"
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    placeholder="Search students..."
                                    className="w-full rounded-none border border-zinc-700 bg-zinc-950 px-4 py-2 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
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

                            {role === "music_director" && (
                                <div className="mt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setStudentViewFilter("myStudents")}
                                        className="rounded-none px-4 py-2 transition text-white"
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
                                        className={`rounded-none px-4 py-2 ${studentViewFilter === "allStudents"
                                            ? "bg-[#cc0000]"
                                            : "bg-zinc-800 hover:bg-zinc-700"
                                            }`}
                                    >
                                        All Students
                                    </button>
                                </div>
                            )}

                            {filteredStudentsBySchool.length ? (
                                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {visibleStudents.filter((student) => {
                                        if (!studentSearch.trim()) return true;
                                        const q = studentSearch.toLowerCase();
                                        return (
                                            student.name?.toLowerCase().includes(q) ||
                                            student.instrument?.toLowerCase().includes(q)
                                        );
                                    }).map((student) => (
                                        <button
                                            key={student.name}
                                            type="button"
                                            onClick={() => handleSelectStudent(student.name)}
                                            className="rounded-none border border-zinc-800 bg-zinc-950 p-4 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
                                        >
                                            <div className="font-semibold text-white">
                                                {student.name}
                                            </div>
                                            <div className="mt-1 text-sm text-zinc-400">
                                                {student.instrument}
                                            </div>
                                            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-zinc-500">
                                                {schoolList.find(
                                                    (school) => school.id === student.schoolId
                                                )?.name ?? "School of Rock"}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-6 rounded-none border border-zinc-800 bg-zinc-950 p-4 text-zinc-300">
                                    No students found for this school.
                                </div>
                            )}
                        </div>
                    )}

                {(canManageRock101 || role === "instructor") && selectedClass && !selectedStudentName && (
                    <ClassDetailView
                        rockClass={selectedClass}
                        selectedSessionId={selectedSessionId}
                        selectedSession={
                            weeklySessions.find((session) => session.id === selectedSessionId) ?? null
                        }
                        students={studentsInSelectedClass}
                        users={filteredUsersBySchool}
                        allStudents={filteredStudentsBySchool}
                        currentUserRole={role ?? ""}
                        currentUserStaffId={currentUser?.staffId}
                        schoolSlug={currentUser?.schoolId ?? ""}
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
                        classInstructorNotes={
                            weeklySessions.find((session) => session.id === selectedSessionId)?.class_instructor_notes ?? ""
                        }
                        onDirectorFeedbackChange={(value) => {
                            setWeeklySessions((prev) =>
                                prev.map((session) =>
                                    session.id === selectedSessionId
                                        ? { ...session, class_instructor_notes: value }
                                        : session
                                )
                            );
                        }}
                        onSaveDirectorFeedback={async () => {
                            if (!selectedSessionId) return false;

                            const feedbackToSave =
                                weeklySessions.find((session) => session.id === selectedSessionId)?.class_instructor_notes ?? "";

                            const { error } = await supabase
                                .from("class_sessions")
                                .update({ class_instructor_notes: feedbackToSave })
                                .eq("id", selectedSessionId);

                            if (error) {
                                console.error("SAVE CLASS INSTRUCTOR NOTES ERROR:", error);
                                return false;
                            }

                            return true;
                        }}
                    />
                )}

                {(canSeeManagementTabs || canSeeStudentTabs) && (
                    <div>
                        {(canManageRock101 || role === "instructor") && selectedClass && selectedStudentName && (
                            <div className="mb-4">
                                <button
                                    type="button"
                                    onClick={() => setSelectedStudentName("")}
                                    className="rounded-none bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
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
                        <div className="px-6 pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedStudentName("")}
                                className="rounded-none bg-zinc-800 px-4 py-2 text-white hover:bg-zinc-700"
                            >
                                Back to Student List
                            </button>
                        </div>
                    )}

                {/* OLD TAB BAR — kept for reference until AppShell nav is verified */}
                {false && <div className="mt-8 flex flex-wrap gap-3">
                    {canSeeStudentTabs && (
                        <>
                            <button
                                type="button"
                                onClick={() => handleSetTab("privateLesson")}
                                className="rounded-none px-4 py-2 transition text-white"
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
                                className={`rounded-none px-4 py-2 ${tab === "graduationRequirements"
                                    ? "bg-[#cc0000]"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                                    }`}
                            >
                                Graduation Requirements
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSetTab("groupRehearsal")}
                                className="rounded-none px-4 py-2 transition text-white"
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
                                className={`rounded-none px-4 py-2 ${tab === "badges"
                                    ? "bg-[#cc0000]"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                                    }`}
                            >
                                Badges
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSetTab("parent")}
                                className={`rounded-none px-4 py-2 ${tab === "parent"
                                    ? "bg-[#cc0000]"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                                    }`}
                            >
                                Student Dashboard
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSetTab("certificate")}
                                className={`rounded-none px-4 py-2 ${tab === "certificate"
                                    ? "bg-[#cc0000]"
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
                                className={`rounded-none px-4 py-2 ${tab === "classSetup" ? "bg-[#cc0000]" : "bg-zinc-800 hover:bg-zinc-700"}`}
                            >
                                Class Setup
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSetTab("performanceDashboard")}
                                className={`rounded-none px-4 py-2 ${tab === "performanceDashboard"
                                    ? "bg-[#cc0000]"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                                    }`}
                            >
                                Shows Overview
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSetTab("bandsDashboard")}
                                className={`rounded-none px-4 py-2 ${tab === "bandsDashboard"
                                    ? "bg-[#cc0000]"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                                    }`}
                            >
                                Bands Dashboard
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSetTab("pipeline")}
                                className={`rounded-none px-4 py-2 ${tab === "pipeline"
                                    ? "bg-[#cc0000]"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                                    }`}
                            >
                                Pipeline
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSetTab("admin")}
                                className={`rounded-none px-4 py-2 ${tab === "admin"
                                    ? "bg-[#cc0000]"
                                    : "bg-zinc-800 hover:bg-zinc-700"
                                    }`}
                            >
                                Admin
                            </button>
                        </>
                    )}
                </div>}

                {canSeeStudentContent && tab === "privateLesson" && selectedStudent && (
                    <>
                        <PrivateLessonView
                            student={selectedStudent}
                            onToggleDone={handleToggleDone}
                            onToggleSigned={handleToggleSigned}
                            canEdit={
                                role === "owner" ||
                                role === "general_manager" ||
                                (role === "instructor" &&
                                    currentUser?.email === selectedStudent.primaryInstructorEmail)
                            }
                            canSign={
                                role === "instructor" ||
                                role === "music_director" ||
                                role === "general_manager" ||
                                role === "owner"
                            }
                            enrolledClassName={activeClassForSelectedStudent?.name ?? undefined}
                            classInstructorName={
                                (() => {
                                    const email = activeClassForSelectedStudent?.classInstructorEmail;
                                    if (!email) return undefined;
                                    return filteredUsersBySchool.find(
                                        (u) => u.email?.toLowerCase() === email.toLowerCase()
                                    )?.name ?? email;
                                })()
                            }
                        />

                        {(role === "owner" ||
                            role === "general_manager" ||
                            (role === "instructor" &&
                                currentUser?.email === selectedStudent.primaryInstructorEmail)) && (
                                <NotesPanel
                                    role="instructor"
                                    authorName={currentUser?.name}
                                    studentName={selectedStudent.name}
                                    context="lesson"
                                    value={selectedStudent.notes.instructor}
                                    saved={selectedStudent.workflow.instructorSubmitted}
                                    onChange={(v) => handleNoteChange("instructor", v)}
                                    onSave={() => handleSaveFeedback("instructor")}
                                    canEdit={
                                        role === "owner" ||
                                        role === "general_manager" ||
                                        (role === "instructor" &&
                                            currentUser?.email === selectedStudent.primaryInstructorEmail)
                                    }
                                />
                            )}
                    </>
                )}

                {canSeeStudentContent &&
                    tab === "graduationRequirements" &&
                    selectedStudent && (
                        <GraduationRequirementsView
                            student={selectedStudent}
                            workflow={{
                                graduationSubmitted:
                                    selectedStudent.workflow?.graduationDirectorSubmitted ?? false,
                            }}
                            onToggleDone={handleToggleDone}
                            onToggleSigned={handleToggleSigned}
                            onGraduationSubmit={handleDirectorGraduationSubmit}
                            canGraduationSubmit={
                                role === "owner" ||
                                role === "general_manager" ||
                                role === "music_director"
                            }
                            canEdit={
                                role === "owner" ||
                                role === "general_manager" ||
                                role === "music_director"
                            }
                            canSign={
                                role === "owner" ||
                                role === "general_manager" ||
                                role === "music_director"
                            }
                        />
                    )}

                {canSeeStudentContent && tab === "groupRehearsal" && selectedStudent && (
                    <>
                        <GroupRehearsalView
                            student={selectedStudent}
                            classId={activeClassForSelectedStudent?.id ?? null}
                            classSongs={activeClassForSelectedStudent?.songs ?? []}
                            onToggleDone={handleToggleDone}
                            onToggleSigned={handleToggleSigned}
                            onAddFistBump={handleAddFistBump}
                            onUpdateSongReadiness={handleUpdateStudentSongReadiness}
                            canEdit={canEditGroupClass}
                            canSign={canEditGroupClass}
                        />

                        {canEditGroupClass && (
                                <>
                                    <div className="mb-2 text-lg font-semibold text-white">
                                        Class Instructor Weekly Feedback
                                    </div>
                                    <NotesPanel
                                        role="class_instructor"
                                        authorName={currentUser?.name}
                                        studentName={selectedStudent.name}
                                        context="rehearsal"
                                        value={selectedStudent.notes.class_instructor}
                                        saved={selectedStudent.workflow.classInstructorSubmitted}
                                        onChange={(v) => handleNoteChange("class_instructor", v)}
                                        onSave={() => handleSaveFeedback("class_instructor")}
                                        canEdit={canEditGroupClass}
                                    />
                                </>
                            )}
                    </>
                )}
                {canSeeStudentContent && tab === "badges" && selectedStudent && (
                    <BadgeGrid earnedBadges={earnedBadges} />
                )}

                {canSeeStudentContent && tab === "parent" && selectedStudent && (
                    <div className="space-y-8">
                        {parentDashboardData && (
                            <ParentDashboardOverview
                                data={parentDashboardData}
                                lessonNotes={selectedStudent.notes.instructor}
                                rehearsalNotes={selectedStudent.notes.class_instructor}
                                lessonLastUpdated={
                                    (
                                        selectedStudent.notes as typeof selectedStudent.notes & {
                                            instructorUpdatedAt?: string | null;
                                            classInstructorUpdatedAt?: string | null;
                                        }
                                    ).instructorUpdatedAt ?? null
                                }
                                rehearsalLastUpdated={
                                    (
                                        selectedStudent.notes as typeof selectedStudent.notes & {
                                            instructorUpdatedAt?: string | null;
                                            classInstructorUpdatedAt?: string | null;
                                        }
                                    ).classInstructorUpdatedAt ?? null
                                }
                                onNavigate={(nextTab) => handleSetTab(nextTab)}
                            />
                        )}
                    </div>
                )}

                {canSeeStudentContent && tab === "certificate" && selectedStudent && (
                    <CertificateView student={selectedStudent} />
                )}

                {tab === "classSetup" && canManageRock101 && (
                    <ClassSetupView
                        students={filteredStudentsBySchool}
                        users={filteredUsersBySchool}
                        mode={editingClass ? "edit" : "create"}
                        classToEdit={editingClass}
                        defaultSchoolId={currentUser?.schoolId}
                        onClassSaved={() => {
                            setEditingClass(null);
                            setClassesVersion((prev) => prev + 1);
                            handleSetTab("privateLesson");
                        }}
                    />
                )}

                {tab === "schedule" && (canManageRock101 || role === "instructor") && (
                    <ScheduleView schoolSlug={currentUser?.schoolId ?? ""} />
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


                {tab === "mySchedule" && (role === "instructor" || canSeeManagementTabs) && (
                    <MyScheduleView
                        staffId={currentUser?.staffId ?? ""}
                        schoolId={effectiveSchoolFilter === "all" ? (schoolList[0]?.id ?? "") : effectiveSchoolFilter}
                        onSelectStudent={(name) => { handleSelectStudent(name); }}
                        onNavigateToLesson={() => handleSetTab("privateLesson")}
                        onSelectClass={(classId, sessionId) => {
                            const matchedSession = weeklySessions.find((s) => s.id === sessionId) ?? null;
                            setSelectedClassId(classId);
                            setSelectedSessionId(sessionId);
                            setSelectedSession(matchedSession);
                            setSelectedStudentName("");
                            handleSetTab("classes");
                        }}
                    />
                )}

                {tab === "lessonSetup" && canSeeManagementTabs && (
                    <LessonSetupView
                        schoolId={effectiveSchoolFilter === "all" ? (schoolList[0]?.id ?? "") : effectiveSchoolFilter}
                        users={filteredUsersBySchool}
                        mode="create"
                        onNavigateToManage={() => handleSetTab("manageLessons")}
                    />
                )}

                {tab === "manageLessons" && canSeeManagementTabs && (
                    <LessonSetupView
                        schoolId={effectiveSchoolFilter === "all" ? (schoolList[0]?.id ?? "") : effectiveSchoolFilter}
                        users={filteredUsersBySchool}
                        mode="manage"
                    />
                )}

                {tab === "executionDashboard" && canSeeManagementTabs && (
                    <ExecutionDashboard
                        schoolId={effectiveSchoolFilter === "all" ? (schoolList[0]?.id ?? "") : effectiveSchoolFilter}
                        currentUserEmail={currentUser?.email ?? ""}
                    />
                )}

                {tab === "myProfile" && currentUser?.staffId && (
                    <StaffProfileView
                        staffId={currentUser.staffId}
                        currentUserStaffId={currentUser.staffId ?? ""}
                        currentUserRole={role ?? ""}
                        schoolId={effectiveSchoolFilter === "all"
                            ? (schoolList[0]?.id ?? "")
                            : effectiveSchoolFilter}
                    />
                )}

                {tab === "classRoster" && canSeeClassRoster && (
                    <ClassRosterView
                        schoolId={effectiveSchoolFilter === "all" ? (schoolList[0]?.id ?? "") : effectiveSchoolFilter}
                        currentUserStaffId={currentUser?.staffId ?? ""}
                        currentUserRole={role ?? ""}
                        users={filteredUsersBySchool}
                    />
                )}

                {tab === "admin" && canManageRock101 && (
                    <AdminView
                        users={filteredUsersBySchool}
                        students={filteredStudentsBySchool}
                        canManageUsers={role === "owner" || role === "general_manager"}
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
                            setStudents((prev) =>
                                prev.map((student) => {
                                    if (String(student.id) === String(studentId)) {
                                        return { ...student, active: nextActive };
                                    }
                                    return student;
                                })
                            );
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
        </AppShell>
    );
}