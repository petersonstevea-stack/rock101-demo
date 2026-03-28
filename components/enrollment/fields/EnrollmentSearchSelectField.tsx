"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type EnrollmentSearchSelectOption = {
    value: string;
    label: string;
};

type EnrollmentSearchSelectFieldProps = {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: EnrollmentSearchSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    helperText?: string;
    emptyMessage?: string;
};

export default function EnrollmentSearchSelectField({
    id,
    label,
    value,
    onChange,
    options,
    placeholder = "Search and select",
    disabled = false,
    required = false,
    helperText,
    emptyMessage = "No matches found.",
}: EnrollmentSearchSelectFieldProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption =
        options.find((option) => option.value === value) ?? null;

    useEffect(() => {
        if (selectedOption && !isOpen) {
            setQuery(selectedOption.label);
        }
    }, [selectedOption, isOpen]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!containerRef.current) return;

            if (!containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);

                if (selectedOption) {
                    setQuery(selectedOption.label);
                } else {
                    setQuery("");
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [selectedOption]);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            return options;
        }

        return options.filter((option) =>
            option.label.toLowerCase().includes(normalizedQuery)
        );
    }, [options, query]);

    function handleSelect(option: EnrollmentSearchSelectOption) {
        onChange(option.value);
        setQuery(option.label);
        setIsOpen(false);
    }

    function handleInputFocus() {
        if (!disabled) {
            setIsOpen(true);
        }
    }

    function handleInputChange(nextValue: string) {
        setQuery(nextValue);
        setIsOpen(true);

        if (!nextValue.trim()) {
            onChange("");
        }
    }

    return (
        <div ref={containerRef} className="space-y-2">
            <label
                htmlFor={id}
                className="block text-sm font-medium text-white/90"
            >
                {label}
                {required ? <span className="ml-1 text-red-400">*</span> : null}
            </label>

            <div className="relative">
                <input
                    id={id}
                    type="text"
                    value={query}
                    onFocus={handleInputFocus}
                    onChange={(event) => handleInputChange(event.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-white/30 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    autoComplete="off"
                />

                {isOpen ? (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-zinc-950 shadow-2xl">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-white/60">
                                {emptyMessage}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option)}
                                    className="block w-full border-b border-white/5 px-4 py-3 text-left text-sm text-white transition hover:bg-white/10"
                                >
                                    {option.label}
                                </button>
                            ))
                        )}
                    </div>
                ) : null}
            </div>

            {helperText ? (
                <p className="text-xs text-white/60">{helperText}</p>
            ) : null}
        </div>
    );
}