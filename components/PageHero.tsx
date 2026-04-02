
"use client";

import type { ReactNode } from "react";

type PageHeroProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  topRight?: ReactNode;
  imageSrc: string;
};

export default function PageHero({
  title,
  subtitle,
  meta,
  topRight,
  imageSrc,
}: PageHeroProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-none border border-zinc-800">
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className="h-48 w-full object-cover"
      />

      <div className="absolute inset-0 bg-black/55" />

      <div className="absolute inset-0 flex flex-col justify-between p-6">
        <div className="flex justify-end">
          {topRight ?? null}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>

          {subtitle ? (
            <p className="mt-1 max-w-2xl text-sm text-white">{subtitle}</p>
          ) : null}

          {meta ? (
            <p className="mt-1 max-w-2xl text-sm text-white">{meta}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
