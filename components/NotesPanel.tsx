type NotesPanelProps = {
  role: "instructor" | "director";
  value: string;
  saved: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  canEdit?: boolean;
  authorName?: string;
  studentName?: string;
  context?: "lesson" | "rehearsal" | "general";
};

export default function NotesPanel({
  role,
  value,
  saved,
  onChange,
  onSave,
  canEdit = true,
  authorName,
  studentName,
  context = "general",
}: NotesPanelProps) {
  const contextLabel =
    context === "lesson"
      ? "lesson"
      : context === "rehearsal"
        ? "rehearsal"
        : "";

  const fallbackTitle =
    role === "instructor"
      ? contextLabel
        ? `Instructor ${contextLabel} notes`
        : "Instructor Notes"
      : contextLabel
        ? `Class Instructor ${contextLabel} notes`
        : "Rock 101 Class Instructor Notes";

  const title =
    authorName && studentName
      ? `${authorName}'s ${contextLabel ? contextLabel + " " : ""}notes for ${studentName}`
      : fallbackTitle;

  const placeholder =
    role === "instructor"
      ? "Enter instructor observations, lesson feedback, or reminders..."
      : "Enter rehearsal behavior, maturity, and band readiness notes...";

  return (
    <div className="mt-8 rounded-none border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-3 text-lg font-bold">{title}</div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={!canEdit}
        className="h-32 w-full rounded-none border border-zinc-800 bg-zinc-900 p-3 text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={!value.trim() || !canEdit}
          className="rounded-none bg-[#cc0000] px-4 py-2 font-medium text-white hover:bg-[#b30000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {role === "instructor"
            ? "Save Instructor Feedback"
            : "Save Class Instructor Feedback"}
        </button>

        {saved && (
          <div className="rounded-none bg-zinc-800 px-3 py-2 text-sm text-white">
            {role === "instructor"
              ? "Instructor feedback saved"
              : "Class Instructor feedback saved"}
          </div>
        )}

        {!value.trim() && canEdit && (
          <div className="text-sm text-[#cc0000]">
            {role === "instructor"
              ? "Instructor notes are required before saving weekly feedback."
              : "Rock 101 Class Instructor notes are required before saving weekly feedback."}
          </div>
        )}

        {!canEdit && (
          <div className="text-sm text-zinc-400">
            You do not have permission to edit these notes.
          </div>
        )}
      </div>
    </div>
  );
}