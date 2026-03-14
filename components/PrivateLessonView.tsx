import { getPrivateLessonSections } from "@/data/rock101Curriculum";
import ChecklistSection from "@/components/ChecklistSection";
import RequiredLessonsChecklist from "@/components/RequiredLessonsChecklist";

type LessonStudent = {
  id?: string;
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

type PrivateLessonViewProps = {
  student: LessonStudent;
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
  const sections = getPrivateLessonSections(student.instrument);

  const graduationSections = sections.filter(
    (section) => section.area === "graduation"
  );

  const requiredLessonSection = sections.find(
    (section) => section.area === "requiredLessons"
  );

  const studentProgressId =
    student.id ?? `${student.name}-${student.instrument}-${student.band}`;

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      {graduationSections.map((section) => (
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

      {requiredLessonSection ? (
        <RequiredLessonsChecklist
          studentId={studentProgressId}
          instrument={student.instrument as
            | "guitar"
            | "bass"
            | "drums"
            | "keys"
            | "vocals"}
          title={requiredLessonSection.title}
        />
      ) : null}
    </div>
  );
}