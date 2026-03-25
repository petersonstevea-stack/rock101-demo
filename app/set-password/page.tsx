"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");

  async function handleSetPassword() {
    if (!password || password !== confirm) {
      setStatus("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Password set successfully! You can now log in.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 p-8">
        <h1 className="text-2xl font-bold mb-6">Set Your Password</h1>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 rounded-lg bg-zinc-800 px-4 py-2"
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full mb-4 rounded-lg bg-zinc-800 px-4 py-2"
        />

        <button
          onClick={handleSetPassword}
          className="w-full rounded-lg bg-red-600 py-2 hover:bg-red-500"
        >
          Set Password
        </button>

        {status && (
          <div className="mt-4 text-sm text-zinc-300">{status}</div>
        )}
      </div>
    </div>
  );
}