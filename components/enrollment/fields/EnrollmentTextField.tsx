type EnrollmentTextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
  autoComplete?: string;
};

export default function EnrollmentTextField({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
  disabled = false,
  required = false,
  helperText,
  autoComplete,
}: EnrollmentTextFieldProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-white/90"
      >
        {label}
        {required ? <span className="ml-1 text-red-400">*</span> : null}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      />

      {helperText ? (
        <p className="text-xs text-white/60">{helperText}</p>
      ) : null}
    </div>
  );
}