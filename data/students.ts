import type { SchoolId } from "@/data/schools";
import { getAllCurriculumItems, type Instrument } from "@/data/rock101Curriculum";

export type StudentCurriculumStatus = {
  done: boolean;
  signed: boolean;
  date: string | null;
  fistBumps: number;
};

export type StudentRecord = {
  id: string;
  schoolId: SchoolId;
  name: string;
  firstName: string;
  lastInitial: string;
  parentEmail: string;
  primaryInstructorEmail?: string;
  instrument: Instrument;
  band: string;
  curriculum: Record<string, StudentCurriculumStatus>;
  notes: {
    instructor: string;
    director: string;
  };
  workflow: {
    instructorSubmitted: boolean;
    directorSubmitted: boolean;
    parentSubmitted: boolean;
  };
};

type BaseStudent = Omit<
  StudentRecord,
  "curriculum" | "notes" | "workflow"
>;

const baseStudents: BaseStudent[] = [
  {
    id: "avery-p-del-mar",
    schoolId: "del-mar",
    name: "Avery P",
    firstName: "Avery",
    lastInitial: "P",
    parentEmail: "averyparent@example.com",
    primaryInstructorEmail: "jennifer@gmail.com",
    instrument: "guitar",
    band: "Tuesday 5pm Rock 101",
  },
  {
    id: "zoe-m-del-mar",
    schoolId: "del-mar",
    name: "Zoe M",
    firstName: "Zoe",
    lastInitial: "M",
    parentEmail: "zoeparent@example.com",
    primaryInstructorEmail: "jennifer@gmail.com",
    instrument: "vocals",
    band: "Tuesday 5pm Rock 101",
  },
  {
    id: "milo-r-del-mar",
    schoolId: "del-mar",
    name: "Milo R",
    firstName: "Milo",
    lastInitial: "R",
    parentEmail: "miloparent@example.com",
    primaryInstructorEmail: "jennifer@gmail.com",
    instrument: "drums",
    band: "Tuesday 5pm Rock 101",
  },
  {
    id: "leo-t-encinitas",
    schoolId: "encinitas",
    name: "Leo T",
    firstName: "Leo",
    lastInitial: "T",
    parentEmail: "leoparent@example.com",
    primaryInstructorEmail: "mike@yahoo.com",
    instrument: "bass",
    band: "Wednesday 5pm Rock 101",
  },
  {
    id: "emma-s-scripps-ranch",
    schoolId: "scripps-ranch",
    name: "Emma S",
    firstName: "Emma",
    lastInitial: "S",
    parentEmail: "emmaparent@example.com",
    instrument: "keys",
    band: "Thursday 5pm Rock 101",
  },
];

function createEmptyCurriculum(instrument: Instrument) {
  return Object.fromEntries(
    getAllCurriculumItems(instrument).map((item) => [
      item.id,
      {
        done: false,
        signed: false,
        date: null,
        fistBumps: 0,
      },
    ])
  );
}

export const students: StudentRecord[] = baseStudents.map((student) => ({
  ...student,
  curriculum: createEmptyCurriculum(student.instrument),
  notes: {
    instructor: "",
    director: "",
  },
  workflow: {
    instructorSubmitted: false,
    directorSubmitted: false,
    parentSubmitted: false,
  },
}));

export function getStudentsBySchool(schoolId: SchoolId) {
  return students.filter((student) => student.schoolId === schoolId);
}

export function getStudentsByBand(schoolId: SchoolId, band: string) {
  return students.filter(
    (student) => student.schoolId === schoolId && student.band === band
  );
}

export function getStudentById(studentId: string) {
  return students.find((student) => student.id === studentId);
}