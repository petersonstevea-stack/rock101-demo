type WorkflowBannerProps = {
    ready: boolean;
    submitted: boolean;
    studentName: string;
    onSubmit: () => void;
    canSubmit?: boolean;
    missingMessage?: string;
};

export default function WorkflowBanner({
    ready,
    submitted,
    studentName,
    onSubmit,
    canSubmit = true,
    missingMessage,
}: WorkflowBannerProps) {
    if (submitted) {
        return (
            <div className="mb-6 rounded-none border border-zinc-800 bg-zinc-950 p-4 text-white">
                ✅ Weekly report has been submitted to the parent for {studentName}.
            </div>
        );
    }

    if (!ready) {
        if (!missingMessage) {
            return null;
        }

        return (
            <div className="mb-6 rounded-none border border-zinc-800 bg-zinc-950 p-4 text-white">
                <div className="text-sm uppercase tracking-[0.2em] text-zinc-400">
                    Update not ready
                </div>
                <div className="mt-1 text-white">
                    {missingMessage}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6 rounded-none border border-red-500/40 bg-red-950/20 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="text-sm uppercase tracking-[0.2em] text-red-300">
                        Weekly report ready 🚀
                    </div>
                    <div className="mt-1 text-white">
                        Both instructor and Rock 101 Class Instructor feedback have been saved. This
                        weekly report is ready to be sent to the parent.
                    </div>
                </div>

                {canSubmit ? (
                    <button
                        type="button"
                        onClick={onSubmit}
                        className="rounded-none bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-500"
                    >
                        Submit to Parent
                    </button>
                ) : (
                    <div className="rounded-none border border-zinc-700 px-4 py-2 text-sm text-zinc-300">
                        You do not have permission to submit this update.
                    </div>
                )}
            </div>
        </div>
    );
}