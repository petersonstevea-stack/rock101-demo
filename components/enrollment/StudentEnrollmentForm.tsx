"use client";

import EnrollmentSearchSelectField from "@/components/enrollment/fields/EnrollmentSearchSelectField";
import EnrollmentSelectField from "@/components/enrollment/fields/EnrollmentSelectField";
import EnrollmentTextField from "@/components/enrollment/fields/EnrollmentTextField";
import {
  INSTRUMENT_OPTIONS,
  PROGRAM_OPTIONS,
  SCHOOL_OPTIONS,
} from "@/data/reference/enrollmentOptions";
import type { SelectOption, StudentEnrollmentFormValues } from "@/types/enrollment";

type StudentEnrollmentFormProps = {
  values: StudentEnrollmentFormValues;
  onChange: (values: StudentEnrollmentFormValues) => void;
  instructorOptions: SelectOption[];
  parentOptions: SelectOption[];
  classGroupOptions: SelectOption[];
  onSubmit?: () => void;
  submitLabel?: string;
  disabled?: boolean;
};

export default function StudentEnrollmentForm({
  values,
  onChange,
  instructorOptions,
  parentOptions,
  classGroupOptions,
  onSubmit,
  submitLabel = "Save Student",
  disabled = false,
}: StudentEnrollmentFormProps) {
  function updateField<K extends keyof StudentEnrollmentFormValues>(
    field: K,
    value: StudentEnrollmentFormValues[K]
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
        <h2 className="text-xl font-semibold text-white">Student Enrollment</h2>
        <p className="text-sm text-white/70">
          Create student records using controlled values so programs,
          instruments, school assignments, instructor relationships, and family
          links stay clean and scalable.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <EnrollmentTextField
          id="student-first-name"
          label="First Name"
          value={values.firstName}
          onChange={(value) => updateField("firstName", value)}
          placeholder="Enter first name"
          required
          disabled={disabled}
          autoComplete="given-name"
        />

        <EnrollmentTextField
          id="student-last-name"
          label="Last Name"
          value={values.lastName}
          onChange={(value) => updateField("lastName", value)}
          placeholder="Enter last name"
          required
          disabled={disabled}
          autoComplete="family-name"
        />

        <EnrollmentSelectField
          id="student-school"
          label="School"
          value={values.school}
          onChange={(value) =>
            updateField("school", value as StudentEnrollmentFormValues["school"])
          }
          options={SCHOOL_OPTIONS}
          placeholder="Select school"
          required
          disabled={disabled}
        />

        <EnrollmentSelectField
          id="student-program"
          label="Program"
          value={values.primaryProgramId}
          onChange={(value) =>
            updateField(
              "primaryProgramId",
              value as StudentEnrollmentFormValues["primaryProgramId"]
            )
          }
          options={PROGRAM_OPTIONS}
          placeholder="Select program"
          required
          disabled={disabled}
        />

        <EnrollmentSelectField
          id="student-instrument"
          label="Instrument"
          value={values.instrument}
          onChange={(value) =>
            updateField(
              "instrument",
              value as StudentEnrollmentFormValues["instrument"]
            )
          }
          options={INSTRUMENT_OPTIONS}
          placeholder="Select instrument"
          required
          disabled={disabled}
        />

        <EnrollmentSearchSelectField
          id="student-parent"
          label="Parent"
          value={values.parentId}
          onChange={(value) => updateField("parentId", value)}
          options={parentOptions}
          placeholder="Search parent by name or email"
          required
          disabled={disabled}
          helperText="Search existing parent records by name or email."
          emptyMessage="No matching parents found."
        />

        <EnrollmentSelectField
          id="student-instructor"
          label="Instructor"
          value={values.instructorId}
          onChange={(value) => updateField("instructorId", value)}
          options={instructorOptions}
          placeholder="Select instructor"
          required
          disabled={disabled}
          helperText="This list is filtered by the selected school."
        />

        <EnrollmentSelectField
          id="student-class-assignment"
          label="Class / Group Assignment"
          value={values.classAssignmentId}
          onChange={(value) => updateField("classAssignmentId", value)}
          options={classGroupOptions}
          placeholder="Select class or group"
          disabled={disabled}
          helperText="This list is filtered by the selected school."
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