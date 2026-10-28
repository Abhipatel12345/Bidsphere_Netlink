import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Loader2,
  Save,
  AlertCircle,
  Layers,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { getDocTypeMeta, getLead, createLead, updateLead } from "../../api/crm";
import type { DocField, DocTypeMeta } from "../../types/crm";
import DocTypeFormField from "../../components/crm/DocTypeFormField";

interface FormSection {
  id: string;
  title: string;
  fields: DocField[];
}

export default function LeadCreateEditPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(name);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Lead DocType Metadata dynamically from ERPNext
  const {
    data: docTypeMeta,
    isLoading: isMetaLoading,
    isError: isMetaError,
    error: metaError,
    refetch: refetchMeta,
  } = useQuery<DocTypeMeta>({
    queryKey: ["doctype-meta", "Lead"],
    queryFn: () => getDocTypeMeta("Lead"),
    staleTime: 10 * 60_000,
  });

  // 2. Fetch Existing Lead Document if in edit mode
  const {
    data: existingLead,
    isLoading: isLeadLoading,
  } = useQuery({
    queryKey: ["crm-lead-edit", name],
    queryFn: () => getLead(decodeURIComponent(name!)),
    enabled: isEditing,
  });

  // 3. Initialize default values from DocType schema metadata
  useEffect(() => {
    if (docTypeMeta?.fields && !isEditing) {
      const defaults: Record<string, unknown> = {};
      for (const f of docTypeMeta.fields) {
        if (f.default !== undefined && f.default !== null && f.default !== "") {
          // If default is integer flag e.g. "0"
          if (f.fieldtype === "Check") {
            defaults[f.fieldname] = f.default === "1" || f.default === 1 ? 1 : 0;
          } else if (f.default !== "__user") {
            defaults[f.fieldname] = f.default;
          }
        }
      }
      // Ensure sensible standard defaults if DocType metadata leaves them optional
      if (!defaults.status) defaults.status = "Lead";
      if (!defaults.country) defaults.country = "United States";
      if (!defaults.territory) defaults.territory = "All Territories";

      setFormData((prev) => ({ ...defaults, ...prev }));
    }
  }, [docTypeMeta, isEditing]);

  // Merge existing lead values when loaded in edit mode
  useEffect(() => {
    if (existingLead) {
      setFormData(existingLead as unknown as Record<string, unknown>);
    }
  }, [existingLead]);

  // 4. Dynamically organize DocType fields into structured sections
  const formSections = useMemo<FormSection[]>(() => {
    if (!docTypeMeta?.fields) return [];

    const sections: FormSection[] = [];
    let currentSection: FormSection = {
      id: "basic_information",
      title: "Lead Profile & Identity",
      fields: [],
    };

    for (const f of docTypeMeta.fields) {
      // Break into sections based on ERPNext's Section Break / Tab Break definitions
      if (f.fieldtype === "Section Break" || f.fieldtype === "Tab Break") {
        if (currentSection.fields.length > 0) {
          sections.push(currentSection);
        }
        currentSection = {
          id: f.fieldname || `section_${sections.length}`,
          title: f.label || "Additional Information",
          fields: [],
        };
        continue;
      }

      // Exclude structural / non-data / internal fields from form input
      if (["Column Break", "HTML", "Table"].includes(f.fieldtype)) continue;
      if (f.hidden === 1) continue;

      // In create mode, skip auto-computed read-only title/lead_name fields
      if (!isEditing && f.read_only === 1 && ["lead_name", "title"].includes(f.fieldname)) {
        continue;
      }

      currentSection.fields.push(f);
    }

    if (currentSection.fields.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }, [docTypeMeta, isEditing]);

  // Handle field value updates
  const handleFieldChange = (fieldname: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldname]: value }));
    // Clear field-specific validation error on change
    if (fieldErrors[fieldname]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldname];
        return next;
      });
    }
    if (submitError) setSubmitError(null);
  };

  // 5. Validate form data according to ERPNext DocType rules
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!docTypeMeta?.fields) return false;

    // Check all mandatory fields specified in DocType metadata
    for (const field of docTypeMeta.fields) {
      if (field.reqd === 1 && !["Section Break", "Column Break", "Tab Break", "HTML"].includes(field.fieldtype)) {
        const val = formData[field.fieldname];
        if (val === undefined || val === null || String(val).trim() === "") {
          errors[field.fieldname] = `${field.label || field.fieldname} is required.`;
        }
      }
    }

    // Lead naming rule in ERPNext: requires at least First Name or Organization/Company Name
    const firstName = String(formData.first_name || "").trim();
    const companyName = String(formData.company_name || "").trim();
    if (!firstName && !companyName) {
      errors.first_name = "Please provide at least a First Name or Organization Name.";
      errors.company_name = "Please provide at least a First Name or Organization Name.";
    }

    // Email format validation if provided
    const email = String(formData.email_id || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email_id = "Please enter a valid email address.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 6. Submit directly to ERPNext Lead DocType
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      toast.error("Please complete all mandatory fields marked with an asterisk (*).");
      return;
    }

    setIsSubmitting(true);
    try {
      // Clean payload: omit undefined values
      const cleanPayload: Record<string, unknown> = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== "") {
          cleanPayload[k] = v;
        }
      });

      if (isEditing && name) {
        await updateLead(decodeURIComponent(name), cleanPayload);
        toast.success("Lead updated successfully in ERPNext.");
        void queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
        void queryClient.invalidateQueries({ queryKey: ["crm-lead", name] });
        navigate(`/crm/leads/${encodeURIComponent(name)}`);
      } else {
        const created = await createLead(cleanPayload);
        toast.success(`Lead "${created.lead_name || created.name}" created in ERPNext!`);
        void queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
        void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-kpis"] });
        navigate(`/crm/leads/${encodeURIComponent(created.name)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save Lead in ERPNext.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (isMetaLoading || (isEditing && isLeadLoading)) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-neutral-200" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-72 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-44 w-full animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  // Error State for DocType metadata
  if (isMetaError || !docTypeMeta) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-3 text-lg font-bold text-neutral-900">
          Failed to load Lead DocType Metadata
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {metaError instanceof Error
            ? metaError.message
            : "Could not retrieve the Lead DocType schema from the connected ERPNext instance."}
        </p>
        <button
          type="button"
          onClick={() => void refetchMeta()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to={isEditing ? `/crm/leads/${encodeURIComponent(name!)}` : "/crm/leads"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {isEditing ? `Edit Lead: ${formData.lead_name || name}` : "Create New Lead"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                <Layers className="h-3 w-3" />
                DocType: Lead
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Form generated directly from ERPNext Lead DocType metadata ({docTypeMeta.fields.length} schema fields)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={isEditing ? `/crm/leads/${encodeURIComponent(name!)}` : "/crm/leads"}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving to ERPNext…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? "Save Changes" : "Create Lead"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backend API Error Banner */}
      {submitError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <span className="font-semibold">ERPNext Validation Error: </span>
            <span>{submitError}</span>
          </div>
        </div>
      )}

      {/* DocType Schema Info Notice */}
      <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/70 px-4 py-2.5 text-xs text-neutral-600">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-600" />
          <span>
            Connected to <strong>ERPNext CRM</strong> • Fields, dropdown options, and link relationships match live backend schema
          </span>
        </div>
        <span className="text-[11px] text-neutral-400">
          Module: {docTypeMeta.module || "CRM"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {formSections.map((section) => (
          <div
            key={section.id}
            className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4"
          >
            <div className="border-b border-neutral-100 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                {section.title}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {section.fields.length} ERPNext DocFields configured
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.fields.map((field) => (
                <div
                  key={field.fieldname}
                  className={
                    field.fieldtype === "Small Text" ||
                    field.fieldtype === "Text" ||
                    field.fieldtype === "Long Text"
                      ? "sm:col-span-2 lg:col-span-3"
                      : undefined
                  }
                >
                  <DocTypeFormField
                    field={field}
                    value={formData[field.fieldname]}
                    onChange={handleFieldChange}
                    error={fieldErrors[field.fieldname]}
                    disabled={isSubmitting}
                    formData={formData}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-neutral-200 pt-5 pb-8">
          <p className="text-xs text-neutral-400">
            Fields marked with <span className="text-red-500 font-semibold">*</span> are mandatory in ERPNext.
          </p>

          <div className="flex items-center gap-3">
            <Link
              to={isEditing ? `/crm/leads/${encodeURIComponent(name!)}` : "/crm/leads"}
              className="rounded-lg border border-neutral-300 bg-white px-5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving to ERPNext…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {isEditing ? "Save Changes" : "Create Lead"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
