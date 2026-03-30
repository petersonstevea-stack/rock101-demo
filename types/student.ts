export type CurriculumItem = {
  done: boolean;
  signed: boolean;
  date: string | null;
  highFives: number;
};

export type StudentNotes = {
  instructor: string;
  director: string;
};

export type WorkflowState = {
  instructorSubmitted: boolean;
  classInstructorSubmitted: boolean;
  parentSubmitted: boolean;
};

export type StudentRecord = {
  name: string;
  firstName: string;
  lastInitial: string;
  parentEmail: string;
  instrument: string;
  band: string;
  curriculum: Record<string, CurriculumItem>;
  notes: StudentNotes;
  workflow: WorkflowState;
};