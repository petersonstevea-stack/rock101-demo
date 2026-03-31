type SelectorStudent = {
  name: string;
  instrument: string;
  band: string;
  curriculum: Record<
    string,
    {
      done: boolean;
      signed: boolean;
      date: string | null;
      highFives: number;
    }
  >;
  notes: {
    instructor: string;
    director: string;
  };
  workflow: {
    instructorSubmitted: boolean;
    classInstructorSubmitted: boolean;
    parentSubmitted: boolean;
  };
};

type StudentSelectorProps = {
  students: SelectorStudent[];
  selected: SelectorStudent;
  onSelect: (student: SelectorStudent) => void;
};

export default function StudentSelector({
  students,
  selected,
  onSelect,
}: StudentSelectorProps) {
  return (
    <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 text-sm uppercase tracking-[0.2em] text-[#cc0000]">
        Select Student
      </div>

      <div className="flex flex-wrap gap-2">
        {students.map((student) => (
          <button
            key={student.name}
            type="button"
            onClick={() => onSelect(student)}
            className={`rounded-none px-4 py-2 ${
              selected.name === student.name
                ? "bg-[#cc0000]"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            {student.name}
          </button>
        ))}
      </div>
    </div>
  );
}