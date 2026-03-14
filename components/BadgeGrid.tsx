import PageHero from "@/components/PageHero";

type Badge = {
  name: string;
  description: string;
  emoji: string;
  subtitle: string;
  accent: string;
};

type BadgeGridProps = {
  earnedBadges: Set<string>;
};

const badges: Badge[] = [
  {
    name: "First Practice Week",
    description: "Weekly lesson assignment completed and signed off.",
    emoji: "🎸",
    subtitle: "First reps. First wins.",
    accent: "from-red-900/80 via-black to-orange-950",
  },
  {
    name: "Rhythm Ready",
    description: "Core rhythm skills demonstrated and signed off.",
    emoji: "🥁",
    subtitle: "Locked to the groove.",
    accent: "from-red-950/80 via-black to-zinc-900",
  },
  {
    name: "Great Bandmate",
    description: "Earned after 10 fist bumps for great rehearsal behavior.",
    emoji: "🤜",
    subtitle: "Good vibes. Tight band.",
    accent: "from-red-900/80 via-black to-red-950",
  },
  {
    name: "Stage Ready",
    description: "Practice and performance habits consistently signed off.",
    emoji: "⚡",
    subtitle: "Confidence under the lights.",
    accent: "from-red-800/80 via-black to-red-950",
  },
  {
    name: "Rock 101 Graduate",
    description: "100% course completion and ready for Performance Program.",
    emoji: "👑",
    subtitle: "Ready for the next stage.",
    accent: "from-red-700/80 via-black to-red-950",
  },
];

export default function BadgeGrid({ earnedBadges }: BadgeGridProps) {
  return (
    <div className="mt-8 space-y-6">
      <PageHero
        title="Badges & Milestones"
        subtitle="Celebrate progress, consistency, and the skills your student has earned so far."
        imageSrc="/images/rock101-band.jpg"
      />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/82 p-6 backdrop-blur-sm">
        <div className="mb-4 text-sm uppercase tracking-[0.2em] text-red-300">
          Badges
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge) => {
            const earned = earnedBadges.has(badge.name);

            return (
              <div
                key={badge.name}
                className={`overflow-hidden rounded-2xl border p-6 ${
                  earned
                    ? `bg-gradient-to-br ${badge.accent} border-red-500/50 shadow-[0_0_30px_rgba(255,0,0,0.14)]`
                    : "border-zinc-800 bg-zinc-900/75 opacity-60 grayscale"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-3xl ${
                      earned
                        ? "border-red-500/40 bg-red-600/10"
                        : "border-zinc-700 bg-zinc-800/90"
                    }`}
                  >
                    {badge.emoji}
                  </div>

                  <div
                    className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                      earned
                        ? "border-red-500/40 text-red-300"
                        : "border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {earned ? "Earned" : "Locked"}
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-full border text-5xl ${
                      earned
                        ? "border-red-500/40 bg-black/30 shadow-[0_0_24px_rgba(255,0,0,0.16)]"
                        : "border-zinc-700 bg-zinc-800/90"
                    }`}
                  >
                    {badge.emoji}
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className="text-xl font-black text-white">
                    {badge.name}
                  </div>
                  <div
                    className={`mt-1 text-xs uppercase tracking-[0.25em] ${
                      earned ? "text-red-300" : "text-zinc-400"
                    }`}
                  >
                    {badge.subtitle}
                  </div>
                  <div className="mt-3 text-sm leading-6 text-white/90">
                    {badge.description}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[0.25em] text-white/80">
                    School of Rock
                  </div>
                  <div className="text-xs text-zinc-300">Rock 101</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
