"use client";

import { getGroupRehearsalSections } from "@/data/rock101Curriculum";
import ChecklistSection from "@/components/ChecklistSection";
import PageHero from "@/components/PageHero";

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
    <div className="mt-8 space-y-6">
      <PageHero
        title="Group Rehearsal"
        subtitle={`Band chemistry, rehearsal habits, and live performance readiness for ${student.name}`}
        imageSrc="/images/rock101-band.jpg"
      />

      <div className="grid gap-6">
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
              onAddFistBump={onAddFistBump}
              canEdit={canEdit}
              canSign={canSign}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
