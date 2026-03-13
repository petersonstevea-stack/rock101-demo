"use client";

import { RockClass } from "@/types/class";
import { AppUser } from "@/types/user";

type PerformanceDashboardProps = {
  classes: RockClass[];
  users: AppUser[];
};

export default function PerformanceDashboard({
  classes,
  users,
}: PerformanceDashboardProps) {
  const instructorMap = Object.fromEntries(
    users
      .filter((user) => user.role === "instructor")
      .map((user) => [user.email, user.name])
  );

  const classStatuses = classes.map((rockClass) => {
    const missingInstructor = !rockClass.instructorEmail;
    const missingSongs = rockClass.songs.length === 0;
    const missingPerformance =
      !rockClass.performanceTitle || !rockClass.performanceDate;

    let status = "Ready";
    let statusColor = "text-green-400";

    if (missingInstructor || missingSongs || missingPerformance) {
      const missingParts = [];

      if (missingInstructor) missingParts.push("Instructor");
      if (missingSongs) missingParts.push("Songs");
      if (missingPerformance) missingParts.push("Performance");

      status = `Missing ${missingParts.join(" + ")}`;
      statusColor = "text-yellow-400";
    }

    return {
      ...rockClass,
      status,
      statusColor,
      instructorName:
        instructorMap[rockClass.instructorEmail] ||
        rockClass.instructorEmail ||
        "Not assigned",
    };
  });

  const readyClasses = classStatuses.filter(
    (rockClass) => rockClass.status === "Ready"
  ).length;

  const needsSetupClasses = classStatuses.length - readyClasses;

  const upcomingPerformances = classStatuses.filter(
    (rockClass) => rockClass.performanceTitle || rockClass.performanceDate
  ).length;

  const classesMissingPerformance = classStatuses.filter(
    (rockClass) =>
      !rockClass.performanceTitle || !rockClass.performanceDate
  );

  const classesMissingSongs = classStatuses.filter(
    (rockClass) => rockClass.songs.length === 0
  );

  const classesMissingInstructor = classStatuses.filter(
    (rockClass) => !rockClass.instructorEmail
  );

  return (
    <div className="mt-8 space-y-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-2xl font-bold">Shows Overview</h2>
        <p className="mt-2 text-zinc-400">
          Director view of class readiness, assigned songs, instructors, and
          upcoming performances.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Total Classes</div>
          <div className="mt-2 text-3xl font-bold">{classStatuses.length}</div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Ready Classes</div>
          <div className="mt-2 text-3xl font-bold text-green-400">
            {readyClasses}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Classes Needing Setup</div>
          <div className="mt-2 text-3xl font-bold text-yellow-400">
            {needsSetupClasses}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <div className="text-sm text-zinc-400">Upcoming Performances</div>
          <div className="mt-2 text-3xl font-bold">{upcomingPerformances}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-semibold">Missing Performance</h3>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            {classesMissingPerformance.length === 0 ? (
              <p className="text-zinc-500">All classes have performance info.</p>
            ) : (
              classesMissingPerformance.map((rockClass) => (
                <div key={rockClass.id} className="rounded-lg bg-black p-3">
                  {rockClass.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-semibold">Missing Songs</h3>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            {classesMissingSongs.length === 0 ? (
              <p className="text-zinc-500">All classes have songs assigned.</p>
            ) : (
              classesMissingSongs.map((rockClass) => (
                <div key={rockClass.id} className="rounded-lg bg-black p-3">
                  {rockClass.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <h3 className="text-xl font-semibold">Missing Instructor</h3>
          <div className="mt-4 space-y-2 text-sm text-zinc-300">
            {classesMissingInstructor.length === 0 ? (
              <p className="text-zinc-500">
                All classes have an instructor assigned.
              </p>
            ) : (
              classesMissingInstructor.map((rockClass) => (
                <div key={rockClass.id} className="rounded-lg bg-black p-3">
                  {rockClass.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {classStatuses.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-zinc-400">
            No classes have been created yet. Create a class in Class Setup first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {classStatuses.map((rockClass) => (
            <div
              key={rockClass.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">{rockClass.name}</h3>
                  <p className="mt-2 text-sm text-zinc-400">
                    {rockClass.dayOfWeek} · {rockClass.time || "Time not set"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    Instructor: {rockClass.instructorName}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-sm text-zinc-400">Status</div>
                  <div className={`mt-1 text-lg font-bold ${rockClass.statusColor}`}>
                    {rockClass.status}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="text-sm font-semibold text-white">
                    Performance
                  </div>
                  <div className="mt-2 text-sm text-zinc-300">
                    Title: {rockClass.performanceTitle || "Not set"}
                  </div>
                  <div className="mt-1 text-sm text-zinc-300">
                    Date: {rockClass.performanceDate || "Not set"}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="text-sm font-semibold text-white">Songs</div>
                  <div className="mt-2 text-sm text-zinc-300">
                    {rockClass.songs.length > 0
                      ? rockClass.songs.join(", ")
                      : "No songs assigned"}
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-black p-4">
                  <div className="text-sm font-semibold text-white">Students</div>
                  <div className="mt-2 text-sm text-zinc-300">
                    {rockClass.studentNames.length} student
                    {rockClass.studentNames.length === 1 ? "" : "s"}
                  </div>
                  <div className="mt-2 text-sm text-zinc-300">
                    {rockClass.studentNames.length > 0
                      ? rockClass.studentNames.join(", ")
                      : "No students assigned"}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}