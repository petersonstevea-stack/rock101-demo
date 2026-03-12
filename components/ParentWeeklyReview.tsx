import { skillSections } from "@/data/curriculum";
import {
  getOverallProgress,
  getSectionProgress,
  getTotalFistBumps,
} from "@/lib/progress";

type ParentStudent = {
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

type ParentWeeklyReviewProps = {
  student: ParentStudent;
};

function buildRockSummary(student: ParentStudent) {
  const progress = getOverallProgress(student);

  const completedCount = Object.values(student.curriculum).filter(
    (item) => item.done || item.signed
  ).length;

  const signedCount = Object.values(student.curriculum).filter(
    (item) => item.signed
  ).length;

  const instructorNote =
    student.notes.instructor?.trim() || "No instructor notes yet.";
  const directorNote =
    student.notes.director?.trim() || "No director notes yet.";

  if (progress < 20) {
    return `${student.name} is just getting rolling in Rock 101 and is currently at ${progress}% completion. That is completely normal at this stage. Right now the focus is on getting comfortable, building confidence, and learning how to play with the band from day one. So far ${student.name.toLowerCase()} has completed ${completedCount} total skills, with ${signedCount} officially signed off. In lessons and rehearsal, the goal is to keep showing up, stacking reps, and starting to build the foundation that will make everything click later on. Instructor note: ${instructorNote} Director note: ${directorNote}`;
  }

  if (progress < 60) {
    return `${student.name} is starting to find a real groove in Rock 101 and is currently at ${progress}% completion. You can see the reps beginning to add up in timing, consistency, and overall comfort playing with the band. So far ${student.name.toLowerCase()} has completed ${completedCount} total skills, with ${signedCount} officially signed off. The next step is taking those early wins and turning them into habits that feel natural in both lessons and rehearsal. Instructor note: ${instructorNote} Director note: ${directorNote}`;
  }

  if (progress < 90) {
    return `${student.name} is really starting to lock things in and is now at ${progress}% completion in Rock 101. At this point students usually begin to sound more confident with the band, recover from mistakes faster, and play their parts with more consistency. ${student.name} has completed ${completedCount} total skills, with ${signedCount} officially signed off. The mission now is to keep tightening everything up so those developing chops feel reliable on stage. Instructor note: ${instructorNote} Director note: ${directorNote}`;
  }

  return `${student.name} is in the home stretch at ${progress}% completion and is getting seriously close to the Performance Program. The confidence, awareness, and band skills are all starting to come together. ${student.name} has completed ${completedCount} total skills, with ${signedCount} officially signed off. A few more strong reps and we’ll be looking at a student who is ready to step up and own the stage. Instructor note: ${instructorNote} Director note: ${directorNote}`;
}

export default function ParentWeeklyReview({
  student,
}: ParentWeeklyReviewProps) {
  const overallProgress = getOverallProgress(student);
  const totalFistBumps = getTotalFistBumps(student);
  const summary = buildRockSummary(student);

  const sectionRows = Object.entries(skillSections).map(([key, section]) => ({
    key,
    title: section.title,
    progress: getSectionProgress(student, key as keyof typeof skillSections),
  }));

  return (
    <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
      <div className="mb-4 text-sm uppercase tracking-[0.2em] text-red-300">
        Parent Weekly Review
      </div>

      <div className="grid gap-6">
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 p-4">
          <div>
            <div className="text-sm text-zinc-400">Overall Progress</div>
            <div className="mt-1 text-2xl font-bold">{overallProgress}%</div>
          </div>

          <div className="text-sm text-red-300">
            Next Show: May 18 • Rock 101 Showcase
          </div>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-4">
          <div className="mb-3 text-sm uppercase tracking-[0.2em] text-red-300">
            Weekly Progress Email Preview
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.95fr,1.05fr]">
            <div className="grid gap-4">
              <div className="rounded-xl border border-zinc-800 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>Overall Progress</span>
                  <span>{overallProgress}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-red-600"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 p-4">
                <div className="mb-3 font-semibold">Curriculum Progress</div>

                <div className="grid gap-3">
                  {sectionRows.map((row) => (
                    <div key={row.key} className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{row.title}</span>
                        <span>{row.progress}%</span>
                      </div>

                      <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full bg-red-600"
                          style={{ width: `${row.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-xl border border-zinc-800 p-4 text-sm leading-7 text-white/95">
                {summary}
              </div>

              <div className="rounded-xl border border-zinc-800 p-4">
                <div className="mb-2 font-semibold">Instructor Notes</div>
                <div className="text-sm leading-6">
                  {student.notes.instructor || "No instructor notes yet."}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 p-4">
                <div className="mb-2 font-semibold">Rock 101 Director Notes</div>
                <div className="text-sm leading-6">
                  {student.notes.director || "No director notes yet."}
                </div>
                <div className="mt-3 text-sm text-red-300">
                  Weekly shout-outs: {totalFistBumps}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}