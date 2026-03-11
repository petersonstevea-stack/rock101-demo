import type { StudentRecord } from "@/types/student";

type StudentSelectorProps = {
  students: StudentRecord[];
  selected: StudentRecord;
  onSelect: (student: StudentRecord) => void;
};

export default function StudentSelector({
  students,
  selected,
  onSelect,
}: StudentSelectorProps) {
  return (
    <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 text-sm uppercase tracking-[0.2em] text-red-300">
        Select Student
      </div>

      <div className="flex flex-wrap gap-2">
        {students.map((student) => (
          <button
            key={student.name}
            onClick={() => onSelect(student)}
            className={`rounded-lg px-4 py-2 ${
              selected.name === student.name
                ? "bg-red-600"
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