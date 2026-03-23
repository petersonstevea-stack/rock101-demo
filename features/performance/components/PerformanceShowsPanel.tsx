"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { Show } from "./PerformanceDashboardShell";

type Props = {
    shows: Show[];
    setShows: React.Dispatch<React.SetStateAction<Show[]>>;
};

export default function PerformanceShowsPanel({ shows, setShows }: Props) {
    const [showName, setShowName] = useState("");
    const [showDate, setShowDate] = useState("");
    const [showForm, setShowForm] = useState(false);

    const [editingShowId, setEditingShowId] = useState<string | null>(null);
    const [editShowName, setEditShowName] = useState("");
    const [editShowDate, setEditShowDate] = useState("");

    const handleDelete = async (id: string) => {
        const { error } = await supabase
            .from("shows")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting show:", error);
            return;
        }

        setShows((prev) => prev.filter((s) => s.id !== id));
    };

    const handleSaveShow = async () => {
        if (!showName || !showDate) return;

        const { data, error } = await supabase
            .from("shows")
            .insert([
                {
                    name: showName,
                    show_date: showDate,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error("Error saving show:", error);
            return;
        }

        setShows((prev) => {
            const next = [
                ...prev,
                { id: data.id, name: data.name, date: data.show_date },
            ];
            return next.sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
        });

        setShowName("");
        setShowDate("");
        setShowForm(false);
    };

    const handleStartEdit = (show: Show) => {
        setEditingShowId(show.id);
        setEditShowName(show.name);
        setEditShowDate(show.date);
    };

    return (
        <div className="p-4 rounded-xl border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Shows</h2>
                <button
                    onClick={() => setShowForm((prev) => !prev)}
                    className="text-sm px-3 py-1 rounded-md border hover:bg-gray-100"
                >
                    + New Show
                </button>
            </div>

            {showForm && (
                <div className="p-4 border rounded-md space-y-3">
                    <input
                        type="text"
                        placeholder="Show Name"
                        value={showName}
                        onChange={(e) => setShowName(e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                    />

                    <input
                        type="date"
                        value={showDate}
                        onChange={(e) => setShowDate(e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                    />

                    <button
                        onClick={handleSaveShow}
                        className="px-4 py-2 rounded-md border hover:bg-gray-100"
                    >
                        Save Show
                    </button>
                </div>
            )}

            {shows.length === 0 ? (
                <p className="text-gray-500">No shows created yet.</p>
            ) : (
                <div className="space-y-2">
                    {shows.map((show) => (
                        <div
                            key={show.id}
                            className="flex justify-between items-center p-3 border rounded-lg"
                        >
                            <div className="flex-1">
                                {editingShowId === show.id ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editShowName}
                                            onChange={(e) => setEditShowName(e.target.value)}
                                            className="w-full border rounded-md px-3 py-2"
                                        />
                                        <input
                                            type="date"
                                            value={editShowDate}
                                            onChange={(e) => setEditShowDate(e.target.value)}
                                            className="w-full border rounded-md px-3 py-2"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div>{show.name}</div>
                                        <div className="text-sm text-gray-400">{show.date}</div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center gap-2 ml-4">
                                {editingShowId === show.id ? (
                                    <button
                                        onClick={() => {
                                            setEditingShowId(null);
                                            setEditShowName("");
                                            setEditShowDate("");
                                        }}
                                        className="text-gray-400 hover:text-gray-200 text-sm transition font-medium px-2 py-1 rounded hover:bg-gray-500/10"
                                    >
                                        Cancel
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleStartEdit(show)}
                                        className="text-blue-400 hover:text-blue-600 text-sm transition font-medium px-2 py-1 rounded hover:bg-blue-500/10"
                                    >
                                        Edit
                                    </button>
                                )}
                                {editingShowId === show.id && (
                                    <button
                                        onClick={() => { }}
                                        className="text-green-400 hover:text-green-600 text-sm transition font-medium px-2 py-1 rounded hover:bg-green-500/10"
                                    >
                                        Save
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (confirm("Delete this show?")) {
                                            handleDelete(show.id);
                                        }
                                    }}
                                    className="text-red-400 hover:text-red-600 text-sm transition font-medium px-2 py-1 rounded hover:bg-red-500/10"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}