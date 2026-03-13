import { allCurriculumItems } from "@/data/curriculum";

type SeedStudentRecord = {
  name: string;
  firstName: string;
  lastInitial: string;
  parentEmail: string;
  instrument: string;
  band: string;
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      fistBumps: number;
    }
  >;
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

const baseStudents = [
  {
    name: "Avery P",
    firstName: "Avery",
    lastInitial: "P",
    parentEmail: "averyparent@example.com",
    primaryInstructorEmail: "jennifer@gmail.com",
    instrument: "Guitar",
    band: "Tuesday 5pm Rock 101",
  },
  {
    name: "Zoe M",
    firstName: "Zoe",
    lastInitial: "M",
    parentEmail: "zoeparent@example.com",
    primaryInstructorEmail: "jennifer@gmail.com",
    instrument: "Voice",
    band: "Tuesday 5pm Rock 101",
  },
  {
    name: "Milo R",
    firstName: "Milo",
    lastInitial: "R",
    parentEmail: "miloparent@example.com",
    primaryInstructorEmail: "jennifer@gmail.com",
    instrument: "Drums",
    band: "Tuesday 5pm Rock 101",
  },
  {
    name: "Leo T",
    firstName: "Leo",
    lastInitial: "T",
    parentEmail: "leoparent@example.com",
    instrument: "Bass",
    band: "Tuesday 5pm Rock 101",
  },
  {
    name: "Emma S",
    firstName: "Emma",
    lastInitial: "S",
    parentEmail: "emmaparent@example.com",
    instrument: "Keys",
    band: "Tuesday 5pm Rock 101",
  },
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

export const students: SeedStudentRecord[] = baseStudents.map((student) => ({
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