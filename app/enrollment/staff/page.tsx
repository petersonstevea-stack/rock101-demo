"use client";

import { useEffect, useState } from "react";
import EnrollmentPageShell from "@/components/enrollment/EnrollmentPageShell";
import StaffEnrollmentForm from "@/components/enrollment/StaffEnrollmentForm";
import { supabase } from "@/lib/supabaseClient";
import type { StaffFormValues } from "@/types/enrollment";

type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  school_slug: string;
  school_type: string;
  created_at: string;
};

const initialValues: StaffFormValues = {
  name: "",
  email: "",
  role: "",
  school: "",
  schoolType: "",
};

export default function StaffEnrollmentPage() {
  const [values, setValues] = useState<StaffFormValues>(initialValues);
  const [staffList, setStaffList] = useState<StaffRow[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "idle">(
    "idle"
  );
  const [isSaving, setIsSaving] = useState(false);

  async function loadStaff() {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setStaffList(data as StaffRow[]);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  async function handleSubmit() {
    if (
      !values.name.trim() ||
      !values.email.trim() ||
      !values.role ||
      !values.school ||
      !values.schoolType
    ) {
      setStatusType("error");
      setStatusMessage("Please complete all required fields.");
      return;
    }

    setIsSaving(true);
    setStatusType("idle");
    setStatusMessage("");

    const payload = {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      role: values.role,
      school_slug: values.school,
      school_type: values.schoolType,
    };

    const { data, error } = await supabase
      .from("staff")
      .insert([payload])
      .select()
      .single();

    if (error) {
      setStatusType("error");
      setStatusMessage(error.message);
      setIsSaving(false);
      return;
    }

    setStatusType("success");
    setStatusMessage(`Staff member saved: ${data.name}`);

    setValues(initialValues);
    await loadStaff();
    setIsSaving(false);
  }

  return (
    <EnrollmentPageShell
      title="Staff Management"
      description="Add and manage staff members across your schools."
    >
      {statusMessage && (
        <div
          className={
            statusType === "success"
              ? "rounded-xl border border-green-500/20 bg-green-500/10 p-4"
              : "rounded-xl border border-red-500/20 bg-red-500/10 p-4"
          }
        >
          <p className="text-sm">{statusMessage}</p>
        </div>
      )}

      <StaffEnrollmentForm
        values={values}
        onChange={setValues}
        onSubmit={handleSubmit}
        submitLabel={isSaving ? "Saving..." : "Save Staff"}
        disabled={isSaving}
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Staff Directory</h2>

        <div className="mt-4 space-y-3">
          {staffList.length === 0 ? (
            <p className="text-sm text-white/50">No staff yet.</p>
          ) : (
            staffList.map((staff) => (
              <div
                key={staff.id}
                className="rounded-xl border border-white/10 bg-black/40 p-4"
              >
                <p className="font-semibold">{staff.name}</p>
                <p className="text-xs text-white/60">{staff.email}</p>
                <p className="text-xs text-white/40">
                  {staff.role} • {staff.school_slug}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </EnrollmentPageShell>
  );
}