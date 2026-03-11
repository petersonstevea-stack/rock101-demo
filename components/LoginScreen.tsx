type LoginScreenProps = {
  onSelectRole: (role: "student" | "instructor" | "director") => void;
};

export default function LoginScreen({ onSelectRole }: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-8 px-6 py-10">
 <img
  src="/sor-logo.png"
  alt="School of Rock"
  style={{ height: 300, width: "auto", maxWidth: 400, }}
/>

      <div className="text-center">
        <h1 className="text-3xl md:text-5xl font-bold">
          Rock 101 Progress Tracker
        </h1>

        <p className="mt-4 text-zinc-300 text-base md:text-lg">
          Select your login type to enter the demo app.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mt-2">
        <button
          type="button"
          onClick={() => onSelectRole("student")}
          className="cursor-pointer rounded-xl bg-red-600 px-8 py-4 text-lg md:text-xl font-semibold text-white shadow-lg transition hover:bg-red-500 active:scale-95"
        >
          Student / Parent
        </button>

        <button
          type="button"
          onClick={() => onSelectRole("instructor")}
          className="cursor-pointer rounded-xl bg-red-600 px-8 py-4 text-lg md:text-xl font-semibold text-white shadow-lg transition hover:bg-red-500 active:scale-95"
        >
          Instructor
        </button>

        <button
          type="button"
          onClick={() => onSelectRole("director")}
          className="cursor-pointer rounded-xl bg-red-600 px-8 py-4 text-lg md:text-xl font-semibold text-white shadow-lg transition hover:bg-red-500 active:scale-95"
        >
          Rock 101 Director
        </button>
      </div>
    </div>
  );
}