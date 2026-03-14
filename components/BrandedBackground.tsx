"use client";

import { ReactNode } from "react";

type BrandedBackgroundProps = {
  children: ReactNode;
  imageSrc: string;
  opacity?: number;
  grayscale?: boolean;
  blur?: number;
  overlayClassName?: string;
  mode?: "full" | "watermark";
  position?: string;
};

export default function BrandedBackground({
  children,
  imageSrc,
  opacity = 0.08,
  grayscale = true,
  blur = 0,
  overlayClassName = "bg-black/70",
  mode = "watermark",
  position = "center",
}: BrandedBackgroundProps) {
  const filterParts = [
    grayscale ? "grayscale(100%)" : "grayscale(0%)",
    blur ? `blur(${blur}px)` : "",
    mode === "watermark"
      ? "brightness(85%) contrast(110%)"
      : "brightness(75%) contrast(105%)",
  ]
    .filter(Boolean)
    .join(" ");

  const objectPosition =
    position === "top"
      ? "center top"
      : position === "bottom"
        ? "center bottom"
        : position;

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <img
        src={imageSrc}
        alt=""
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover ${
          mode === "full" ? "scale-105" : ""
        }`}
        style={{
          objectPosition,
          opacity,
          filter: filterParts,
        }}
      />

      <div
        className={`pointer-events-none absolute inset-0 ${overlayClassName}`}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
}