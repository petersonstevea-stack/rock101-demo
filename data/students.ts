import type { StudentRecord } from "@/types/student";
import { allCurriculumItems } from "@/data/curriculum";

const baseStudents = [
  { name: "Avery", instrument: "Guitar", band: "Tuesday 5pm Rock 101" },
  { name: "Zoe", instrument: "Voice", band: "Tuesday 5pm Rock 101" },
  { name: "Milo", instrument: "Drums", band: "Tuesday 5pm Rock 101" },
  { name: "Leo", instrument: "Bass", band: "Tuesday 5pm Rock 101" },
  { name: "Emma", instrument: "Keys", band: "Tuesday 5pm Rock 101" },
];

function createEmptyCurriculum() {
  return Object.fromEntries(
    allCurriculumItems.map((item) => [
      item,
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
  curriculum: createEmptyCurriculum(),
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