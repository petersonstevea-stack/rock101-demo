"use client";

import EnrollmentTextField from "@/components/enrollment/fields/EnrollmentTextField";
import type { ParentFormValues } from "@/types/enrollment";

type ParentEnrollmentFormProps = {
  values: ParentFormValues;
  onChange: (values: ParentFormValues) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  disabled?: boolean;
};

export default function ParentEnrollmentForm({
  values,
  onChange,
  onSubmit,
  submitLabel = "Save Parent",
  disabled = false,
}: ParentEnrollmentFormProps) {
  function updateField<K extends keyof ParentFormValues>(
    field: K,
    value: ParentFormValues[K]
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
      className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Parent Enrollment</h2>
        <p className="text-sm text-white/70">
          Create parent records using clean, controlled contact information so
          student-family relationships can be linked safely as the enrollment
          system grows.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <EnrollmentTextField
          id="parent-name"
          label="Full Name"
          value={values.name}
          onChange={(value) => updateField("name", value)}
          placeholder="Enter parent full name"
          required
          disabled={disabled}
          autoComplete="name"
        />

        <EnrollmentTextField
          id="parent-email"
          label="Email"
          type="email"
          value={values.email}
          onChange={(value) => updateField("email", value)}
          placeholder="Enter parent email address"
          required
          disabled={disabled}
          autoComplete="email"
          helperText="This will become the parent login email in the production auth flow."
        />
      </div>

      <div className="flex items-center justify-end">
        <button
          type="submit"
          disabled={disabled}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}