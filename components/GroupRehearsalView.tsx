import { skillSections } from "@/data/curriculum";
import type { StudentRecord } from "@/types/student";
import ChecklistSection from "@/components/ChecklistSection";
import GroupBehaviorSection from "@/components/GroupBehaviorSection";

type GroupRehearsalViewProps = {
  student: StudentRecord;
  onToggleDone: (item: string) => void;
  onToggleSigned: (item: string) => void;
  onAddFistBump: (item: string) => void;
  canEdit: boolean;
  canSign: boolean;
};

export default function GroupRehearsalView({
  student,
  onToggleDone,
  onToggleSigned,
  onAddFistBump,
  canEdit,
  canSign,
}: GroupRehearsalViewProps) {
  return (
    <div className="mt-8 grid gap-6">
      <ChecklistSection
        title={skillSections.concepts.title}
        items={skillSections.concepts.items}
        curriculum={student.curriculum}
        onToggleDone={onToggleDone}
        onToggleSigned={onToggleSigned}
        canEdit={canEdit}
        canSign={canSign}
      />

      <ChecklistSection
        title={skillSections.practicePerformance.title}
        items={skillSections.practicePerformance.items}
        curriculum={student.curriculum}
        onToggleDone={onToggleDone}
        onToggleSigned={onToggleSigned}
        canEdit={canEdit}
        canSign={canSign}
      />

      <GroupBehaviorSection
        items={skillSections.groupBehavior.items}
        curriculum={student.curriculum}
        onAddFistBump={onAddFistBump}
      />
    </div>
  );
}