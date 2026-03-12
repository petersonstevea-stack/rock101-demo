export type CurriculumItem = {
  done: boolean;
  signed: boolean;
  date: string | null;
  fistBumps: number;
};

export type StudentNotes = {
  instructor: string;
  director: string;
};

export type WorkflowState = {
  instructorSubmitted: boolean;
  directorSubmitted: boolean;
  parentSubmitted: boolean;
};

export type StudentRecord = {
  name: string;
  instrument: string;
  band: string;
  curriculum: Record<string, CurriculumItem>;
  notes: StudentNotes;
  workflow: WorkflowState;
};