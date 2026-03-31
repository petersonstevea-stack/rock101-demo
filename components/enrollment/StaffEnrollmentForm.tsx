"use client";

import { useState, useEffect } from "react";
import EnrollmentSelectField from "@/components/enrollment/fields/EnrollmentSelectField";
import EnrollmentTextField from "@/components/enrollment/fields/EnrollmentTextField";
import {
  SCHOOL_TYPE_OPTIONS,
  STAFF_ROLE_OPTIONS,
} from "@/data/reference/enrollmentOptions";
import { supabase } from "@/lib/supabaseClient";
import type { StaffFormValues } from "@/types/enrollment";

type StaffEnrollmentFormProps = {
  values: StaffFormValues;
  onChange: (values: StaffFormValues) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  disabled?: boolean;
};

export default function StaffEnrollmentForm({
  values,
  onChange,
  onSubmit,
  submitLabel = "Save Staff Member",
  disabled = false,
}: StaffEnrollmentFormProps) {
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

  function updateField<K extends keyof StaffFormValues>(
    field: K,
    value: StaffFormValues[K]
  ) {
    onChange({
      ...values,
      [field]: value,
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-none border border-zinc-800 bg-zinc-900 p-6"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Staff Enrollment</h2>
        <p className="text-sm text-white/70">
          Create staff records using controlled values so school, role, and
          permissions stay clean and consistent.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <EnrollmentTextField
          id="staff-name"
          label="Full Name"
          value={values.name}
          onChange={(value) => updateField("name", value)}
          placeholder="Enter full name"
          required
          disabled={disabled}
          autoComplete="name"
        />

        <EnrollmentTextField
          id="staff-email"
          label="Email"
          type="email"
          value={values.email}
          onChange={(value) => updateField("email", value)}
          placeholder="Enter email address"
          required
          disabled={disabled}
          autoComplete="email"
          helperText="This email will be used for login later."
        />

        <EnrollmentSelectField
          id="staff-role"
          label="Role"
          value={values.role}
          onChange={(value) => updateField("role", value as StaffFormValues["role"])}
          options={STAFF_ROLE_OPTIONS}
          placeholder="Select role"
          required
          disabled={disabled}
        />

        <EnrollmentSelectField
          id="staff-school-type"
          label="School Type"
          value={values.schoolType}
          onChange={(value) =>
            updateField("schoolType", value as StaffFormValues["schoolType"])
          }
          options={SCHOOL_TYPE_OPTIONS}
          placeholder="Select school type"
          required
          disabled={disabled}
        />

        <EnrollmentSelectField
          id="staff-school"
          label="Assigned School"
          value={values.school}
          onChange={(value) =>
            updateField("school", value as StaffFormValues["school"])
          }
          options={schoolList.map((s) => ({ value: s.id, label: s.name }))}
          placeholder="Select school"
          required
          disabled={disabled}
        />
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-none bg-[#cc0000] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#b30000] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}