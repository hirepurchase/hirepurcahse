"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  /** Shown under the label — phone, membership id, serial, whatever disambiguates two people with the same name. */
  sublabel?: string;
  disabled?: boolean;
}

interface Props {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Adds a "none" entry, for optional assignments. */
  allowClear?: boolean;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Hand typing back to the caller instead of filtering locally — for lists too long to send whole. */
  onSearchChange?: (term: string) => void;
  loading?: boolean;
  /** Shown under the list when the server capped the results. */
  footerNote?: string;
}

/**
 * A select you can type into.
 *
 * Plain dropdowns are fine over five options and unusable over five hundred:
 * picking an agent or a customer meant scrolling a list with no way to search
 * it. Filtering is local by default; pass `onSearchChange` where the list is
 * too long to send to the browser at all.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  emptyText = "No matches",
  allowClear = false,
  clearLabel = "None",
  disabled = false,
  className,
  onSearchChange,
  loading = false,
  footerNote,
}: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    // The caller is searching server-side, so the list it gave us is already
    // the answer — filtering it again would hide rows it deliberately sent.
    if (onSearchChange) return options;
    const t = term.trim().toLowerCase();
    if (!t) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(t) ||
        (o.sublabel ?? "").toLowerCase().includes(t)
    );
  }, [options, term, onSearchChange]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setHighlight(0);
      // Focus after paint, or the dropdown steals it back.
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setTerm("");
      onSearchChange?.("");
    }
    // onSearchChange is intentionally excluded: callers commonly pass an inline
    // arrow, which would re-run this on every render and clear the box mid-type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const rows = allowClear
    ? [{ value: "", label: clearLabel } as SearchableOption, ...filtered]
    : filtered;

  const commit = (option: SearchableOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[highlight]) commit(rows[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm",
          "focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500",
          disabled && "cursor-not-allowed bg-gray-50 text-gray-400"
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selected && "text-gray-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {allowClear && selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={term}
              onChange={(e) => {
                setTerm(e.target.value);
                onSearchChange?.(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full border-0 p-0 text-sm outline-none placeholder:text-gray-400"
            />
          </div>

          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <p className="px-3 py-6 text-center text-xs text-gray-400">Searching…</p>
            ) : rows.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-gray-400">{emptyText}</p>
            ) : (
              rows.map((option, index) => (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  disabled={option.disabled}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => commit(option)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-sm",
                    index === highlight && "bg-gray-50",
                    option.disabled && "cursor-not-allowed opacity-40"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-gray-900">{option.label}</span>
                    {option.sublabel && (
                      <span className="block truncate text-xs text-gray-500">{option.sublabel}</span>
                    )}
                  </span>
                  {option.value === value && (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600" />
                  )}
                </button>
              ))
            )}
          </div>

          {footerNote && (
            <p className="border-t border-gray-100 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {footerNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
