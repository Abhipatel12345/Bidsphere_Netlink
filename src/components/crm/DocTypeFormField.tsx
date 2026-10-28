import type { DocField } from "../../types/crm";
import DocTypeLinkSelect from "./DocTypeLinkSelect";

interface DocTypeFormFieldProps {
  field: DocField;
  value: unknown;
  onChange: (fieldname: string, val: unknown) => void;
  error?: string;
  disabled?: boolean;
  formData?: Record<string, unknown>;
}

export default function DocTypeFormField({
  field,
  value,
  onChange,
  error,
  disabled = false,
  formData,
}: DocTypeFormFieldProps) {
  const isRequired = Boolean(field.reqd);
  const isReadOnly = Boolean(field.read_only);
  const fieldId = `field-${field.fieldname}`;

  const linkTargetDocType =
    field.fieldtype === "Dynamic Link"
      ? String(formData?.[field.options || ""] || "Lead")
      : field.options || "";

  const baseInputClass = `w-full rounded-lg border py-2 px-3 text-xs text-neutral-900 shadow-sm transition-colors focus:outline-none focus:ring-1 ${
    error
      ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-red-500"
      : "border-neutral-300 bg-white focus:border-primary-500 focus:ring-primary-500"
  } disabled:bg-neutral-50 disabled:text-neutral-400`;

  // Render Check / Boolean
  if (field.fieldtype === "Check") {
    return (
      <div className="flex flex-col justify-center h-full pt-4">
        <label
          htmlFor={fieldId}
          className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-medium text-neutral-700"
        >
          <input
            id={fieldId}
            type="checkbox"
            checked={Boolean(value === 1 || value === true || value === "1")}
            onChange={(e) => onChange(field.fieldname, e.target.checked ? 1 : 0)}
            disabled={disabled || isReadOnly}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            {field.label || field.fieldname}
            {isRequired && <span className="ml-1 text-red-500">*</span>}
          </span>
        </label>
        {field.description && (
          <p className="mt-1 ml-6 text-[11px] text-neutral-400">{field.description}</p>
        )}
        {error && <p className="mt-1 ml-6 text-[11px] font-medium text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label
          htmlFor={fieldId}
          className="block text-xs font-medium text-neutral-700"
        >
          {field.label || field.fieldname}
          {isRequired && <span className="ml-0.5 text-red-500">*</span>}
        </label>
        {(field.fieldtype === "Link" || field.fieldtype === "Dynamic Link") && linkTargetDocType && (
          <span className="text-[10px] font-normal text-neutral-400">
            Link → {linkTargetDocType}
          </span>
        )}
      </div>

      {/* Select Dropdown */}
      {field.fieldtype === "Select" ? (
        (() => {
          let opts: string[] = [];
          if (typeof field.options === "string") {
            opts = field.options.split("\n").map((o) => o.trim()).filter(Boolean);
          } else if (Array.isArray(field.options)) {
            opts = field.options;
          }

          return (
            <select
              id={fieldId}
              value={String(value ?? field.default ?? "")}
              onChange={(e) => onChange(field.fieldname, e.target.value)}
              disabled={disabled || isReadOnly}
              required={isRequired}
              className={baseInputClass}
            >
              <option value="">Select {field.label || field.fieldname}…</option>
              {opts.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              {Boolean(value) && !opts.includes(String(value)) && (
                <option value={String(value)}>{String(value)}</option>
              )}
            </select>
          );
        })()
      ) : field.fieldtype === "Link" || field.fieldtype === "Dynamic Link" ? (
        /* Link or Dynamic Link to another DocType */
        <DocTypeLinkSelect
          id={fieldId}
          targetDocType={linkTargetDocType}
          value={String(value || "")}
          onChange={(val) => onChange(field.fieldname, val)}
          disabled={disabled || isReadOnly}
          required={isRequired}
          placeholder={`Select ${field.label || linkTargetDocType}…`}
          className={baseInputClass}
        />
      ) : field.fieldtype === "Currency" ||
        field.fieldtype === "Float" ||
        field.fieldtype === "Int" ? (
        /* Number input */
        <input
          id={fieldId}
          type="number"
          step={field.fieldtype === "Int" ? "1" : "0.01"}
          value={value !== undefined && value !== null ? String(value) : ""}
          onChange={(e) =>
            onChange(
              field.fieldname,
              e.target.value === ""
                ? undefined
                : field.fieldtype === "Int"
                ? parseInt(e.target.value, 10)
                : parseFloat(e.target.value)
            )
          }
          disabled={disabled || isReadOnly}
          required={isRequired}
          placeholder={field.label || field.fieldname}
          className={baseInputClass}
        />
      ) : field.fieldtype === "Date" ? (
        /* Date input */
        <input
          id={fieldId}
          type="date"
          value={String(value || "")}
          onChange={(e) => onChange(field.fieldname, e.target.value)}
          disabled={disabled || isReadOnly}
          required={isRequired}
          className={baseInputClass}
        />
      ) : field.fieldtype === "Datetime" ? (
        /* Datetime input */
        <input
          id={fieldId}
          type="datetime-local"
          value={String(value || "")}
          onChange={(e) => onChange(field.fieldname, e.target.value)}
          disabled={disabled || isReadOnly}
          required={isRequired}
          className={baseInputClass}
        />
      ) : field.fieldtype === "Small Text" ||
        field.fieldtype === "Text" ||
        field.fieldtype === "Long Text" ? (
        /* Textarea */
        <textarea
          id={fieldId}
          rows={3}
          value={String(value || "")}
          onChange={(e) => onChange(field.fieldname, e.target.value)}
          disabled={disabled || isReadOnly}
          required={isRequired}
          placeholder={`Enter ${field.label || field.fieldname}…`}
          className={baseInputClass}
        />
      ) : (
        /* Default: Data, Phone, Attach, etc. */
        <input
          id={fieldId}
          type={
            field.options === "Email"
              ? "email"
              : field.options === "Phone"
              ? "tel"
              : field.fieldname.includes("website")
              ? "url"
              : "text"
          }
          value={String(value || "")}
          onChange={(e) => onChange(field.fieldname, e.target.value)}
          disabled={disabled || isReadOnly}
          required={isRequired}
          placeholder={
            field.options === "Email"
              ? "prospect@company.com"
              : field.options === "Phone"
              ? "+1 (555) 000-0000"
              : field.fieldname.includes("website")
              ? "https://example.com"
              : field.label || field.fieldname
          }
          className={baseInputClass}
        />
      )}

      {field.description && (
        <p className="text-[11px] text-neutral-400">{field.description}</p>
      )}

      {error && <p className="text-[11px] font-medium text-red-600">{error}</p>}
    </div>
  );
}
