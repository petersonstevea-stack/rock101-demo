"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  async function handleSetPassword() {
    if (!password || password !== confirm) {
      setIsSuccess(false);
      setStatus("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setIsSuccess(false);
      setStatus(error.message);
      return;
    }

    setIsSuccess(true);
    setStatus("Password set successfully!");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="w-full max-w-md rounded-xl bg-zinc-900 p-8">
        <h1 className="mb-6 text-2xl font-bold uppercase">Set Your Password</h1>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg bg-zinc-800 px-4 py-2"
        />

        <input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mb-4 w-full rounded-lg bg-zinc-800 px-4 py-2"
        />

        <button
          onClick={handleSetPassword}
          className="w-full rounded-none bg-[#cc0000] py-2 hover:bg-[#b30000]"
        >
          Set Password
        </button>

        {status && (
          <div
            className={`mt-4 text-sm ${
              isSuccess ? "text-green-400" : "text-zinc-300"
            }`}
          >
            {status}
          </div>
        )}

        {isSuccess && (
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="mt-4 w-full rounded-lg bg-zinc-800 py-2 text-white hover:bg-zinc-700"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}