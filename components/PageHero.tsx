"use client";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  imageSrc: string;
};

export default function PageHero({
  title,
  subtitle,
  imageSrc,
}: PageHeroProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-2xl border border-zinc-800">
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="h-48 w-full object-cover"
      />

      <div className="absolute inset-0 bg-black/55" />

      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <h2 className="text-2xl font-bold text-white">{title}</h2>

        {subtitle ? (
          <p className="mt-2 max-w-2xl text-sm text-zinc-200">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
