"use client";

import { useState } from "react";
import { SessionUser, saveSession } from "@/lib/session";
import { supabase } from "@/lib/supabaseClient";
import BrandedBackground from "@/components/BrandedBackground";
import { schools } from "@/data/schools";
type LoginScreenProps = {
    onLogin: (user: SessionUser) => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [pendingUser, setPendingUser] = useState<SessionUser | null>(null);
    const [schoolChoices, setSchoolChoices] = useState<string[]>([]);

    async function handleLogin() {
        setError("");

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            return;
        }

        if (!data.user) {
            setError("Login failed");
            return;
        }

        const { data: staffRow, error: staffError } = await supabase
            .from("staff")
            .select("id")
            .ilike("email", email.trim().toLowerCase())
            .maybeSingle();

        if (staffError) {
            setError("Failed to load staff record");
            return;
        }

        let resolvedSchoolChoices: string[] = [];

        if (staffRow) {
            const { data: roleRows, error: rolesError } = await supabase
                .from("staff_school_roles")
                .select("school_slug")
                .eq("staff_id", staffRow.id)
                .eq("active", true);

            if (rolesError) {
                setError("Failed to load school assignments");
                return;
            }

            resolvedSchoolChoices = Array.from(
                new Set((roleRows ?? []).map((row) => row.school_slug))
            );
        }

        const { data: dbUser } = await supabase
            .from("users")
            .select("email, name, role, school_id")
            .eq("auth_id", data.user.id)
            .maybeSingle();

        if (!dbUser) {
            setError("User not found in database");
            return;
        }

        if (resolvedSchoolChoices.length > 1) {
            setPendingUser({
                email: dbUser.email,
                name: dbUser.name,
                role: dbUser.role ?? "owner",
                schoolId: resolvedSchoolChoices[0],
            });
            setSchoolChoices(resolvedSchoolChoices);
            return;
        }

        const sessionUser: SessionUser = {
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role ?? "owner",
            schoolId:
                resolvedSchoolChoices[0] ??
                dbUser.school_id ??
                "del-mar",
        };

        onLogin(sessionUser);
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
                    {pendingUser && schoolChoices.length > 0 ? (
                        <div className="space-y-3">
                            <p className="text-center text-sm text-zinc-300">
                                Choose your school
                            </p>

                            {schoolChoices.map((schoolId) => {
                                const schoolName =
                                    schools.find((school) => school.id === schoolId)?.name ??
                                    schoolId;

                                return (
                                    <button
                                        key={schoolId}
                                        type="button"
                                        className="w-full rounded-lg py-4 text-white transition"
                                        style={{ backgroundColor: "var(--sor-red)" }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.backgroundColor = "#a82e33")
                                        }
                                        onMouseLeave={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            "var(--sor-red)")
                                        }
                                        onClick={() => {
                                            const resolvedUser: SessionUser = {
                                                ...pendingUser,
                                                schoolId,
                                            };

                                            saveSession(resolvedUser); // 👈 ADD THIS LINE
                                            onLogin(resolvedUser);
                                        }}
                                    >
                                        {schoolName}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-6 w-full rounded-lg bg-white p-4 text-black"
                            />
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-4 w-full rounded-lg bg-white p-4 text-black"
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
                        </>
                    )}

                    {error && (
                        <p className="mt-4 text-center text-red-400">{error}</p>
                    )}
                </div>
            </div>
        </BrandedBackground>
    );
}