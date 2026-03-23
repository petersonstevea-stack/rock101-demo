"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

import PerformanceShowsPanel from "./PerformanceShowsPanel";
import PerformanceStatsGrid from "./PerformanceStatsGrid";
import PerformancePageHeader from "./PerformancePageHeader";

export type Show = {
    id: string;
    name: string;
    date: string;
};

export default function PerformanceDashboardShell() {
    const [shows, setShows] = useState<Show[]>([]);

    useEffect(() => {
        const fetchShows = async () => {
            const { data, error } = await supabase
                .from("shows")
                .select("*")
                .order("show_date", { ascending: true });

            if (error) {
                console.error("Error loading shows:", error);
            } else {
                setShows(
                    (data || []).map((s) => ({
                        id: s.id,
                        name: s.name,
                        date: s.show_date,
                    }))
                );
            }
        };

        fetchShows();
    }, []);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <PerformancePageHeader />

            {/* Stats Grid */}
            <PerformanceStatsGrid shows={shows} />

            {/* Shows Section */}
            <PerformanceShowsPanel shows={shows} setShows={setShows} />
        </div>
    );
}