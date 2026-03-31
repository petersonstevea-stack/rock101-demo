"use client";

import { useState, useEffect } from "react";
import { SessionUser } from "@/lib/session";
import { supabase } from "@/lib/supabaseClient";
import BrandedBackground from "@/components/BrandedBackground";

type LoginScreenProps = {
    onLogin: (user: SessionUser) => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [pendingUser, setPendingUser] = useState<SessionUser | null>(null);
    const [schoolChoices, setSchoolChoices] = useState<string[]>([]);
    const [isResetMode, setIsResetMode] = useState(false);
    const [schoolList, setSchoolList] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        supabase
            .from("schools")
            .select("id, name")
            .eq("is_sandbox", false)
            .order("name")
            .then(({ data }) => {
                if (data) setSchoolList(data);
            });
    }, []);

    async function handleForgotPassword() {
        setIsResetMode(true);

        if (!email.trim()) {
            setError("Enter your email above first");
            return;
        }

        setError("");

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: "https://rock101-demo.vercel.app/set-password",
        });

        if (error) {
            setError(error.message);
            return;
        }

        setError("Password reset email sent");
    }

    async function handleLogin() {
        if (!email || !password) {
            setError("Please enter email and password");
            return;
        }

        setError("");
        const normalizedEmail = email.trim().toLowerCase();

        const { data, error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
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
            .ilike("email", normalizedEmail)
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

        const { data: dbUser, error: dbUserError } = await supabase
            .from("users")
            .select("email, name, role, school_id")
            .eq("auth_id", data.user.id)
            .maybeSingle();

        if (dbUserError) {
            setError("Failed to load user record");
            return;
        }

        const fallbackName =
            data.user.user_metadata?.name?.toString().trim() || normalizedEmail;
        const fallbackRole =
            data.user.user_metadata?.role?.toString().trim() || "instructor";
        const fallbackSchool =
            data.user.user_metadata?.school_slug?.toString().trim() || "del-mar";

        const resolvedEmail = dbUser?.email ?? normalizedEmail;
        const resolvedName = dbUser?.name ?? fallbackName;
        const resolvedRole = dbUser?.role ?? fallbackRole;
        const resolvedSchoolId =
            resolvedSchoolChoices[0] ?? dbUser?.school_id ?? fallbackSchool;

        if (resolvedSchoolChoices.length > 1) {
            setPendingUser({
                email: resolvedEmail,
                name: resolvedName,
                role: resolvedRole,
                schoolId: resolvedSchoolChoices[0],
            });
            setSchoolChoices(resolvedSchoolChoices);
            return;
        }

        const sessionUser: SessionUser = {
            email: resolvedEmail,
            name: resolvedName,
            role: resolvedRole,
            schoolId: resolvedSchoolId,
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
                                    schoolList.find((school) => school.id === schoolId)?.name ??
                                    schoolId;

                                return (
                                    <button
                                        key={schoolId}
                                        type="button"
                                        className="w-full rounded-none py-4 text-white transition"
                                        style={{ backgroundColor: "var(--sor-red)" }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.backgroundColor = "#b30000")
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

                            {!isResetMode && (
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-4 w-full rounded-lg bg-white p-4 text-black"
                                />
                            )}

                            <button
                                className="mt-4 w-full rounded-none py-4 text-white transition"
                                style={{ backgroundColor: "var(--sor-red)" }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor = "#b30000")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor = "var(--sor-red)")
                                }
                                onClick={isResetMode ? handleForgotPassword : handleLogin}
                            >
                                {isResetMode ? "Send Reset Email" : "Continue"}
                            </button>

                            <p className="mt-3 text-center text-sm text-white/60">
                                {isResetMode ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsResetMode(false);
                                            setError("");
                                        }}
                                        className="underline hover:text-white"
                                    >
                                        Back to login
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setIsResetMode(true)}
                                        className="underline hover:text-white"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </p>
                        </>
                    )}

                    {error && (
                        <p className="mt-4 text-center text-[#cc0000]">{error}</p>
                    )}
                </div>
            </div>
        </BrandedBackground>
    );
}