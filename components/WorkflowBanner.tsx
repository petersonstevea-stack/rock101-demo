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
            <div className="mb-6 rounded-none bg-[#111111] p-4 text-white">
                ✅ Weekly report has been submitted to the parent for {studentName}.
            </div>
        );
    }

    if (!ready) {
        if (!missingMessage) {
            return null;
        }

        return (
            <div className="mb-6 rounded-none bg-[#cc0000] p-4 text-white">
                <div className="text-sm uppercase tracking-[0.2em] text-white/70">
                    Update not ready
                </div>
                <div className="mt-1 text-white">
                    {missingMessage}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6 rounded-none bg-[#cc0000] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="text-sm uppercase tracking-[0.2em] text-white/70">
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
                        className="rounded-none bg-white px-4 py-2 font-medium text-[#cc0000] hover:bg-zinc-100"
                    >
                        Submit to Parent
                    </button>
                ) : (
                    <div className="rounded-none bg-white/10 px-4 py-2 text-sm text-white/80">
                        You do not have permission to submit this update.
                    </div>
                )}
            </div>
        </div>
    );
}
