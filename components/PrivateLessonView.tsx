import { skillSections } from "@/data/curriculum";
import type { StudentRecord } from "@/types/student";
import ChecklistSection from "@/components/ChecklistSection";

type PrivateLessonViewProps = {
  student: StudentRecord;
  onToggleDone: (item: string) => void;
  onToggleSigned: (item: string) => void;
  canEdit: boolean;
  canSign: boolean;
};

export default function PrivateLessonView({
  student,
  onToggleDone,
  onToggleSigned,
  canEdit,
  canSign,
}: PrivateLessonViewProps) {
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <ChecklistSection
        title={skillSections.instrument.title}
        items={skillSections.instrument.items}
        curriculum={student.curriculum}
        onToggleDone={onToggleDone}
        onToggleSigned={onToggleSigned}
        canEdit={canEdit}
        canSign={canSign}
      />

      <ChecklistSection
        title={skillSections.assignments.title}
        items={skillSections.assignments.items}
        curriculum={student.curriculum}
        onToggleDone={onToggleDone}
        onToggleSigned={onToggleSigned}
        canEdit={canEdit}
        canSign={canSign}
      />
    </div>
  );
}