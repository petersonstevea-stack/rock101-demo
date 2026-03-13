"use client";

import { useState } from "react";
import { findUserByEmail, SessionUser } from "@/lib/session";

type LoginScreenProps = {
  onLogin: (user: SessionUser) => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  function handleLogin() {
    const matchedUser = findUserByEmail(email);

    if (!matchedUser) {
      setError("Email not found");
      return;
    }

    setError("");
    onLogin(matchedUser);
  }

  function handleDemoLogin(demoEmail: string) {
    setEmail(demoEmail);
    setError("");

    const matchedUser = findUserByEmail(demoEmail);

    if (!matchedUser) {
      setError("Email not found");
      return;
    }

    onLogin(matchedUser);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-black px-6 py-10 text-white">
      <img
        src="/sor-logo.png"
        alt="School of Rock"
        style={{ height: 300, width: "auto", maxWidth: 400 }}
      />

      <div className="text-center">
        <h1 className="text-3xl font-bold md:text-5xl">
          Rock 101 Progress Tracker
        </h1>

        <p className="mt-4 text-base text-zinc-300 md:text-lg">
          Enter your email to enter the demo app.
        </p>
      </div>

      <div className="w-full max-w-md">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none focus:border-red-500"
        />

        <button
          type="button"
          onClick={handleLogin}
          className="mt-4 w-full cursor-pointer rounded-xl bg-red-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-red-500 active:scale-95"
        >
          Continue
        </button>

        {error && <p className="mt-4 text-center text-red-400">{error}</p>}

        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-zinc-400">
            Demo Logins
          </h3>

          <div className="grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() => handleDemoLogin("gm@rock101.com")}
              className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700"
            >
              <div className="text-sm font-semibold">General Manager</div>
              <div className="text-xs text-zinc-400">gm@rock101.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin("steve@rock101.com")}
              className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700"
            >
              <div className="text-sm font-semibold">Rock 101 Director</div>
              <div className="text-xs text-zinc-400">steve@rock101.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin("jennifer@gmail.com")}
              className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700"
            >
              <div className="text-sm font-semibold">Instructor</div>
              <div className="text-xs text-zinc-400">jennifer@gmail.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin("mike@yahoo.com")}
              className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700"
            >
              <div className="text-sm font-semibold">Instructor</div>
              <div className="text-xs text-zinc-400">mike@yahoo.com</div>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin("zoeparent@example.com")}
              className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700 md:col-span-2"
            >
              <div className="text-sm font-semibold">Parent</div>
              <div className="text-xs text-zinc-400">
                zoeparent@example.com
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}