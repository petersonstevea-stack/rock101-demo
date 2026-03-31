type EnrollmentSelectOption = {
  value: string;
  label: string;
};

type EnrollmentSelectFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: EnrollmentSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
};

export default function EnrollmentSelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  required = false,
  helperText,
}: EnrollmentSelectFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-white/90"
      >
        {label}
        {required ? <span className="ml-1 text-[#cc0000]">*</span> : null}
      </label>

      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className="w-full rounded-none border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none transition focus:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="" disabled>
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-black"
          >
            {option.label}
          </option>
        ))}
      </select>

      {helperText ? (
        <p className="text-xs text-white/60">{helperText}</p>
      ) : null}
    </div>
  );
}