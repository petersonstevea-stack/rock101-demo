"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function PendingApprovalsBadge() {
    const [count, setCount] = useState(0);

    useEffect(() => {
        async function fetchCount() {
            const [profilesResult, historyResult] = await Promise.all([
                supabase
                    .from("student_profiles")
                    .select("id", { count: "exact", head: true })
                    .eq("pending_status", "pending"),
                supabase
                    .from("student_show_history")
                    .select("id", { count: "exact", head: true })
                    .eq("status", "pending"),
            ]);
            const total = (profilesResult.count ?? 0) + (historyResult.count ?? 0);
            setCount(total);
        }
        fetchCount();
    }, []);

    if (count === 0) return null;

    return (
        <span className="bg-[#cc0000] text-white text-xs px-1.5 py-0.5 rounded-none font-bold min-w-[18px] text-center">
            {count}
        </span>
    );
}
