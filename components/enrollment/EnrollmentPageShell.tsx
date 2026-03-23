import type { ReactNode } from "react";

type EnrollmentPageShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function EnrollmentPageShell({
  eyebrow = "Stage Ready",
  title,
  description,
  children,
}: EnrollmentPageShellProps) {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="max-w-3xl text-sm text-white/70">{description}</p>
        </header>

        {children}
      </div>
    </main>
  );
}