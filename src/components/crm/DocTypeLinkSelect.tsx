import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { searchLinkField } from "../../api/crm";

interface DocTypeLinkSelectProps {
  targetDocType: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
}

export default function DocTypeLinkSelect({
  targetDocType,
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  id,
  className,
}: DocTypeLinkSelectProps) {
  const { data: options = [], isLoading } = useQuery({
    queryKey: ["doctype-link-options", targetDocType],
    queryFn: ({ signal }) => searchLinkField(targetDocType, "", signal),
    enabled: Boolean(targetDocType),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const validOptions = targetDocType === "Customer Group"
    ? options.filter((o) => o.value !== "All Customer Groups")
    : options;

  return (
    <div className="relative">
      <select
        id={id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
        required={required}
        className={
          className ||
          "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-900 shadow-sm transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-50 disabled:text-neutral-400"
        }
      >
        <option value="">
          {isLoading
            ? `Loading ${targetDocType || "Link"} options…`
            : validOptions.length === 0 && targetDocType
            ? `No ${targetDocType} records found`
            : placeholder || `Select ${targetDocType || "option"}…`}
        </option>
        {validOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label || opt.value}
          </option>
        ))}
        {/* If the current value is not in the options list (e.g. customized or historical), keep it visible */}
        {value && !validOptions.some((o) => o.value === value) && (
          <option value={value}>{value}</option>
        )}
      </select>
      {isLoading && (
        <div className="pointer-events-none absolute inset-y-0 right-7 flex items-center pr-1">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
        </div>
      )}
    </div>
  );
}
