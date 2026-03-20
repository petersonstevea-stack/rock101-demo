"use client";

import { useState } from "react";
import { findUserByEmail, SessionUser } from "@/lib/session";
import BrandedBackground from "@/components/BrandedBackground";
import { supabase } from "@/lib/supabaseClient";

type LoginScreenProps = {
    onLogin: (user: SessionUser) => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");

    async function handleLogin() {
        setError("");

        // Temporary real-auth test path for the Supabase user we created.
        // This does NOT replace the app's current demo/session login yet.
        if (email.toLowerCase() === "owner@rock101.com") {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password: "test1234",
            });

            console.log("LOGIN RESULT:", { data, error });

            if (error) {
                setError(error.message);
                return;
            }

            // For now, do not call onLogin here yet because the app still expects
            // a SessionUser from the demo/session system.
            setError(
                "Supabase login succeeded. Check the browser console. App routing is not wired to auth yet."
            );
            return;
        }

        // Existing demo login flow stays intact.
        const matchedUser = findUserByEmail(email);

        if (!matchedUser) {
            setError("Email not found");
            return;
        }

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
        <BrandedBackground
            imageSrc="/images/rock101-band.jpg"
            mode="full"
            opacity={0.62}
            grayscale={false}
            blur={0}
            overlayClassName="bg-black/45"
            position="center"
        >
            <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-10 text-white">
                <img
                    src="/sor-logo.png"
                    alt="School of Rock"
                    className="mx-auto h-auto w-118 object-contain"
                />
                <h1 className="text-center text-3xl font-bold uppercase md:text-5xl">
                    STAGE READY
                </h1>

                <div className="w-full max-w-sm rounded-lg bg-zinc-800 px-6 py-8 shadow-lg">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-6 w-full rounded-lg bg-white p-4 text-black"
                    />

                    <button
                        className="mt-4 w-full rounded-lg py-4 text-white transition"
                        style={{ backgroundColor: "var(--sor-red)" }}
                        onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#a82e33")
                        }
                        onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor = "var(--sor-red)")
                        }
                        onClick={handleLogin}
                    >
                        Continue
                    </button>

                    {error && (
                        <p className="mt-4 text-center text-red-400">{error}</p>
                    )}
                </div>

                <div className="w-full max-w-md rounded-2xl border border-zinc-700/80 bg-black/70 p-6 backdrop-blur-md">
                    <div className="text-center">
                        <h3 className="mb-4 text-sm font-semibold text-zinc-400">
                            Demo Logins
                        </h3>

                        <div className="grid gap-3 md:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => handleDemoLogin("steve@rock101.com")}
                                className="rounded-lg border px-4 py-3 text-left transition md:col-span-2"
                                style={{
                                    borderColor: "rgba(190, 55, 60, 0.3)",
                                    backgroundColor: "rgba(190, 55, 60, 0.12)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "rgba(190, 55, 60, 0.22)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "rgba(190, 55, 60, 0.12)";
                                }}
                            >
                                <div
                                    className="text-sm font-semibold"
                                    style={{ color: "var(--sor-red)" }}
                                >
                                    Owner
                                </div>
                                <div className="text-xs text-zinc-400">
                                    steve@rock101.com
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDemoLogin("gm.delmar@rock101.com")}
                                className="rounded-lg border px-4 py-3 text-left transition"
                                style={{
                                    borderColor: "rgba(190, 55, 60, 0.2)",
                                    backgroundColor: "rgba(190, 55, 60, 0.06)",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "rgba(190, 55, 60, 0.14)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                        "rgba(190, 55, 60, 0.06)";
                                }}
                            >
                                <div
                                    className="text-sm font-semibold"
                                    style={{ color: "var(--sor-red)" }}
                                >
                                    General Manager
                                </div>
                                <div className="text-xs text-zinc-400">
                                    gm.delmar@rock101.com
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    handleDemoLogin("director.delmar@rock101.com")
                                }
                                className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700"
                            >
                                <div className="text-sm font-semibold">
                                    Rock 101 Director
                                </div>
                                <div className="text-xs text-zinc-400">
                                    director.delmar@rock101.com
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDemoLogin("jennifer@gmail.com")}
                                className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700"
                            >
                                <div className="text-sm font-semibold">Instructor</div>
                                <div className="text-xs text-zinc-400">
                                    jennifer@gmail.com
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleDemoLogin("mike@yahoo.com")}
                                className="rounded-lg bg-zinc-800 px-4 py-3 text-left transition hover:bg-zinc-700"
                            >
                                <div className="text-sm font-semibold">Instructor</div>
                                <div className="text-xs text-zinc-400">
                                    mike@yahoo.com
                                </div>
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
        </BrandedBackground>
    );
}