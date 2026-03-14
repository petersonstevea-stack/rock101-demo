import { getGroupRehearsalSections } from "@/data/rock101Curriculum";
import ChecklistSection from "@/components/ChecklistSection";
import GroupBehaviorSection from "@/components/GroupBehaviorSection";

type RehearsalStudent = {
  name: string;
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

type GroupRehearsalViewProps = {
  student: RehearsalStudent;
  onToggleDone: (item: string) => void;
  onToggleSigned: (item: string) => void;
  onAddFistBump: (item: string) => void;
  canEdit: boolean;
  canSign: boolean;
};

const weeklyBehaviorItems = [
  { id: "learnedSongs", label: "Learned Songs" },
  { id: "practicedSongs", label: "Practiced Songs" },
  { id: "noNoodling", label: "No Noodling" },
  { id: "listenedToDirector", label: "Listened to Director" },
  { id: "respectedBandmates", label: "Respected Bandmates" },
];

export default function GroupRehearsalView({
  student,
  onToggleDone,
  onToggleSigned,
  onAddFistBump,
  canEdit,
  canSign,
}: GroupRehearsalViewProps) {
  const sections = getGroupRehearsalSections(student.instrument);

  return (
    <div className="mt-8 grid gap-6">
      {sections.map((section) => (
        <ChecklistSection
          key={section.id}
          title={section.title}
          items={section.items}
          curriculum={student.curriculum}
          onToggleDone={onToggleDone}
          onToggleSigned={onToggleSigned}
          canEdit={canEdit}
          canSign={canSign}
        />
      ))}

      <GroupBehaviorSection
        items={weeklyBehaviorItems}
        curriculum={student.curriculum}
        onAddFistBump={onAddFistBump}
      />
    </div>
  );
}