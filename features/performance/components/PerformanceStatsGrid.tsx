import type { Show } from "./PerformanceDashboardShell";

export default function PerformanceStatsGrid({ shows }: { shows: Show[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* Active Shows */}
      <div className="p-4 rounded-xl border shadow-sm">
        <h2 className="font-semibold">Active Shows</h2>
        <p className="text-2xl mt-2">{shows.length}</p>
      </div>

      {/* Students Enrolled (placeholder for now) */}
      <div className="p-4 rounded-xl border shadow-sm">
        <h2 className="font-semibold">Students Enrolled</h2>
        <p className="text-2xl mt-2">0</p>
      </div>

      {/* Upcoming Performances */}
      <div className="p-4 rounded-xl border shadow-sm">
        <h2 className="font-semibold">Upcoming Performances</h2>
        <p className="text-2xl mt-2">
          {
            shows.filter(
              (show) => new Date(show.date) >= new Date()
            ).length
          }
        </p>
      </div>

    </div>
  );
}