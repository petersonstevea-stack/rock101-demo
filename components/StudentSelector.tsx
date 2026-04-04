import { useState } from "react";

type SelectorStudent = {
  name: string;
  instrument: string;
  band: string;
  program?: string;
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
  const [search, setSearch] = useState("");

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.instrument?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-3 text-sm uppercase tracking-[0.2em] text-[#cc0000]">
        Select Student
      </div>

      <div className="relative mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students..."
          className="w-full rounded-none border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filtered.map((student) => {
          const isR101 = student.program === "rock101" || student.program === "rock_101";
          const isPP = student.program === "performance_program";
          const isSelected = selected.name === student.name;
          const bgColor = isR101 ? "#cc0000" : "#1a1a1a";

          return (
            <button
              key={student.name}
              type="button"
              onClick={() => onSelect(student)}
              className="rounded-none px-4 py-2 text-left text-white transition"
              style={{
                backgroundColor: isSelected ? "#b30000" : bgColor,
                outline: isSelected ? "2px solid #ffffff" : "none",
              }}
            >
              <div className="text-sm font-medium">{student.name}</div>
              {isPP && (
                <div className="text-[10px] text-zinc-400 leading-tight">
                  Performance Program
                </div>
              )}
              {isR101 && student.instrument && (
                <div className="text-[10px] text-zinc-200 leading-tight capitalize">
                  {student.instrument}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
