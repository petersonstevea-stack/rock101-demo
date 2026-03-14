"use client";

import { getPrivateLessonSections } from "@/data/rock101Curriculum";
import ChecklistSection from "@/components/ChecklistSection";
import PageHero from "@/components/PageHero";

type LessonStudent = {
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

  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title="Private Lesson"
        subtitle={`Focused skill-building for ${student.name} • ${student.instrument}`}
        imageSrc="/images/rock101-drums.jpg"
      />

      <div className="grid gap-6 xl:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/82 p-1 backdrop-blur-sm"
          >
            <ChecklistSection
              title={section.title}
              items={section.items}
              curriculum={student.curriculum}
              onToggleDone={onToggleDone}
              onToggleSigned={onToggleSigned}
              canEdit={canEdit}
              canSign={canSign}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
