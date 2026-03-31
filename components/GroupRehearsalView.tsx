"use client";

import { useState, useEffect } from "react";
import { fetchRehearsalBehaviors, type CurriculumItem } from "@/lib/curriculumQueries";
import ChecklistSection from "@/components/ChecklistSection";
import PageHero from "@/components/PageHero";
import {
    SONG_READINESS_LEVELS,
    type SongReadinessEntry,
    type SongReadinessValue,
} from "@/types/songReadiness";

type RehearsalStudent = {
    name: string;
    instrument: string;
    band: string;
    curriculum: Record<
        string,
        {
            done: boolean;
            signed: boolean;
            date: string | null;
            highFives: number;
        }
    >;
    songReadiness?: Record<string, Record<string, SongReadinessEntry>>;
    notes: {
        instructor: string;
        director: string;
    };
    workflow: {
        instructorSubmitted: boolean;
        classInstructorSubmitted: boolean;
        parentSubmitted: boolean;
    };
};

type GroupRehearsalViewProps = {
    student: RehearsalStudent;
    classId: string | null;
    classSongs: string[];
    onToggleDone: (item: string) => void;
    onToggleSigned: (item: string) => void;
    onAddFistBump: (item: string) => void;
    onUpdateSongReadiness: (
        classId: string,
        song: string,
        readiness: SongReadinessValue
    ) => void;
    canEdit: boolean;
    canSign: boolean;
};

function splitRehearsalTitle(title: string) {
    if (title.includes(" ")) {
        const words = title.split(" ");
        return {
            firstPart: words.slice(0, 1).join(" "),
            secondPart: words.slice(1).join(" "),
        };
    }

    return {
        firstPart: title,
        secondPart: "",
    };
}

function getSongReadinessLabel(readiness?: number) {
    if (!readiness || readiness < 1 || readiness > SONG_READINESS_LEVELS.length) {
        return SONG_READINESS_LEVELS[0];
    }

    return SONG_READINESS_LEVELS[readiness - 1];
}

export default function GroupRehearsalView({
    student,
    classId,
    classSongs,
    onToggleDone,
    onToggleSigned,
    onAddFistBump,
    onUpdateSongReadiness,
    canEdit,
    canSign,
}: GroupRehearsalViewProps) {
    const [rehearsalItems, setRehearsalItems] = useState<CurriculumItem[]>([]);

    useEffect(() => {
        fetchRehearsalBehaviors().then(setRehearsalItems);
    }, []);

    const activeSongReadiness = classId
        ? (student.songReadiness?.[classId] ?? {})
        : {};

    const songHeader = splitRehearsalTitle("Song Readiness");
    const rehearsalHeader = splitRehearsalTitle("Rehearsal Readiness");

    return (
        <div className="min-h-screen bg-white">
        <div className="p-6 space-y-6">
            <PageHero
                title="Group Rehearsal"
                subtitle={`Band chemistry, rehearsal habits, and live performance readiness for ${student.name}`}
                imageSrc="/images/rock101-band.jpg"
            />

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-5">
                    <div className="bg-[#111111] rounded-none p-5">
                        <div>
                            <h2 className="sor-display text-4xl md:text-5xl leading-none">
                                <span style={{ color: "#cc0000" }}>{songHeader.firstPart}</span>
                                {songHeader.secondPart && (
                                    <span className="ml-2 text-white italic">
                                        {songHeader.secondPart}
                                    </span>
                                )}
                            </h2>
                            <div className="sor-divider" />
                        </div>
                    </div>

                    <div className="rounded-none border border-zinc-800 bg-zinc-900 p-4">
                        {classId && classSongs.length > 0 ? (
                            <div className="space-y-3">
                                {classSongs.map((song) => {
                                    const readiness = activeSongReadiness[song]?.readiness ?? 1;

                                    return (
                                        <div
                                            key={song}
                                            className="rounded-none border border-zinc-800 bg-zinc-950 p-3"
                                        >
                                            <div className="flex flex-col gap-2">
                                                <div>
                                                    <div className="font-semibold text-white">{song}</div>
                                                    <div className="text-sm text-zinc-400">
                                                        Student readiness: {getSongReadinessLabel(readiness)}
                                                    </div>
                                                </div>

                                                <div className="w-full">
                                                    <input
                                                        type="range"
                                                        min={1}
                                                        max={5}
                                                        step={1}
                                                        value={readiness}
                                                        onChange={(e) =>
                                                            onUpdateSongReadiness(
                                                                classId,
                                                                song,
                                                                Number(e.target.value) as SongReadinessValue
                                                            )
                                                        }
                                                        className="w-full"
                                                        style={{ accentColor: "#cc0000", borderRadius: 0 }}
                                                        disabled={!canEdit}
                                                    />
                                                    <div className="mt-1 flex justify-between text-[11px] uppercase tracking-[0.12em] text-zinc-500">
                                                        <span>Just Starting</span>
                                                        <span>Show Ready</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-none border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
                                No songs assigned to this class yet.
                            </div>
                        )}
                    </div>
                </div>

                {rehearsalItems.length > 0 && (
                    <div className="space-y-5">
                        <div className="bg-[#111111] rounded-none p-5">
                            <div>
                                <h2 className="sor-display text-4xl md:text-5xl leading-none">
                                    <span style={{ color: "#cc0000" }}>
                                        {rehearsalHeader.firstPart}
                                    </span>
                                    {rehearsalHeader.secondPart && (
                                        <span className="ml-2 text-white italic">
                                            {rehearsalHeader.secondPart}
                                        </span>
                                    )}
                                </h2>
                                <div className="sor-divider" />
                            </div>
                        </div>

                        <div className="rounded-none border border-zinc-800 bg-zinc-900 p-1">
                            <ChecklistSection
                                title="Rehearsal Readiness"
                                items={rehearsalItems}
                                curriculum={student.curriculum}
                                onToggleDone={onToggleDone}
                                onToggleSigned={onToggleSigned}
                                onAddFistBump={onAddFistBump}
                                canEdit={canEdit}
                                canSign={canSign}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
        </div>
    );
}