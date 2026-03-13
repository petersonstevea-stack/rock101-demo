type AppHeaderProps = {
  role: "parent" | "instructor" | "director" | "generalManager" | null;
  studentName: string;
  userName: string;
  userEmail: string;
  onLogout: () => void;
};

export default function AppHeader({
  role,
  studentName,
  userName,
  userEmail,
  onLogout,
}: AppHeaderProps) {
  return (
    <header className="mb-8 w-full border-b border-zinc-800 bg-black px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
        <div className="flex min-w-0 items-center gap-4">
          <img
            src="/sor-logo.png"
            alt="School of Rock"
            className="h-12 w-auto max-w-[180px] object-contain shrink-0"
          />

          <div className="min-w-0">
            <div className="truncate text-lg font-bold">
              Progress Tracker
            </div>
            <div className="text-sm tracking-wider text-red-400">
              {role ? `${role.toUpperCase()} VIEW` : ""}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-sm text-zinc-400 md:block">
            <div>
              Signed in as:
              <span className="ml-2 font-semibold text-white">
                {userName}
              </span>
            </div>
            <div className="text-xs text-zinc-500">{userEmail}</div>
          </div>

          <div className="hidden text-sm text-zinc-400 md:block">
            Student:
            <span className="ml-2 font-semibold text-white">
              {studentName}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-white transition hover:bg-zinc-700"
          >
            Switch Login
          </button>
        </div>
      </div>
    </header>
  );
}