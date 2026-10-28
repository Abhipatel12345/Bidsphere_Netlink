import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X,
  Loader2,
  Save,
  AlertCircle,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getDocTypeMeta,
  createCustomer,
  updateCustomer,
  createContact,
  updateContact,
  createAddress,
  updateAddress,
  createCampaign,
  updateCampaign,
  extractFrappeErrorMessage,
} from "../../api/crm";
import { erpnext } from "../../api/erpnext";
import type { DocField, DocTypeMeta } from "../../types/crm";
import DocTypeFormField from "./DocTypeFormField";

interface DocTypeModalProps {
  doctype: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (recordName: string) => void;
  title?: string;
  subtitle?: string;
  initialData?: Record<string, unknown>;
  recordName?: string;
}

interface FormSection {
  id: string;
  title: string;
  fields: DocField[];
}

export default function DocTypeModal({
  doctype,
  isOpen,
  onClose,
  onSuccess,
  title,
  subtitle,
  initialData = {},
  recordName,
}: DocTypeModalProps) {
  const isEditing = Boolean(recordName);
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch DocType Metadata directly from ERPNext
  const {
    data: docTypeMeta,
    isLoading: isMetaLoading,
    isError: isMetaError,
    error: metaError,
    refetch: refetchMeta,
  } = useQuery<DocTypeMeta>({
    queryKey: ["doctype-meta", doctype],
    queryFn: () => getDocTypeMeta(doctype),
    enabled: isOpen,
    staleTime: 10 * 60_000,
  });

  // 2. Initialize defaults from DocType schema metadata
  useEffect(() => {
    if (isOpen && docTypeMeta?.fields) {
      const defaults: Record<string, unknown> = { ...initialData };
      for (const f of docTypeMeta.fields) {
        if (defaults[f.fieldname] === undefined && f.default !== undefined && f.default !== null && f.default !== "") {
          if (f.fieldtype === "Check") {
            defaults[f.fieldname] = f.default === "1" || f.default === 1 ? 1 : 0;
          } else if (f.default !== "__user" && f.default !== "Today") {
            defaults[f.fieldname] = f.default;
          }
        }
      }

      // Sensible DocType defaults
      if (doctype === "Customer") {
        if (!defaults.customer_type) defaults.customer_type = "Company";
        if (!defaults.customer_group) defaults.customer_group = "Commercial";
        if (!defaults.territory) defaults.territory = "All Territories";
      } else if (doctype === "Address") {
        if (!defaults.country) defaults.country = "United States";
        if (!defaults.address_type) defaults.address_type = "Billing";
      }

      setFormData(defaults);
      setFieldErrors({});
      setSubmitError(null);
    }
  }, [isOpen, docTypeMeta, doctype, initialData]);

  // 3. Dynamically organize fields into structured sections
  const formSections = useMemo<FormSection[]>(() => {
    if (!docTypeMeta?.fields) return [];

    const sections: FormSection[] = [];
    let currentSection: FormSection = {
      id: "main_section",
      title: `${doctype} Details`,
      fields: [],
    };

    for (const f of docTypeMeta.fields) {
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

      // Filter layout/internal/table fields
      if (["Column Break", "HTML", "Table"].includes(f.fieldtype)) continue;
      if (f.hidden === 1) continue;
      if (f.read_only === 1 && ["name", "title", "customer_name"].includes(f.fieldname) && doctype !== "Customer") {
        continue;
      }

      currentSection.fields.push(f);
    }

    if (currentSection.fields.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }, [docTypeMeta, doctype]);

  const handleFieldChange = (fieldname: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldname]: value }));
    if (fieldErrors[fieldname]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldname];
        return next;
      });
    }
    if (submitError) setSubmitError(null);
  };

  // 4. Validate form against DocType rules
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!docTypeMeta?.fields) return false;

    for (const field of docTypeMeta.fields) {
      if (field.reqd === 1 && !["Section Break", "Column Break", "Tab Break", "HTML", "Table"].includes(field.fieldtype)) {
        const val = formData[field.fieldname];
        if (val === undefined || val === null || String(val).trim() === "") {
          errors[field.fieldname] = `${field.label || field.fieldname} is required.`;
        }
      }
    }

    // Specific business validations
    if (doctype === "Contact" && !formData.first_name) {
      errors.first_name = "First Name is required.";
    }
    if (doctype === "Customer" && !formData.customer_name) {
      errors.customer_name = "Customer Name is required.";
    }
    if (doctype === "Campaign" && !formData.campaign_name) {
      errors.campaign_name = "Campaign Name is required.";
    }
    if (doctype === "Address") {
      if (!formData.address_line1) errors.address_line1 = "Address Line 1 is required.";
      if (!formData.city) errors.city = "City is required.";
      if (!formData.country) errors.country = "Country is required.";
    }

    // Email validation
    const email = String(formData.email_id || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email_id = "Please enter a valid email address.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 5. Submit record to ERPNext
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      toast.error("Please fill in all mandatory fields marked with *.");
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanPayload: Record<string, unknown> = {};
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== "") {
          cleanPayload[k] = v;
        }
      });

      let resultName = recordName || "";

      if (isEditing && recordName) {
        if (doctype === "Customer") {
          const doc = await updateCustomer(recordName, cleanPayload);
          resultName = doc.name;
          toast.success(`Customer "${doc.customer_name || doc.name}" updated in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-customers"] });
          void queryClient.invalidateQueries({ queryKey: ["crm-customer", recordName] });
        } else if (doctype === "Contact") {
          const doc = await updateContact(recordName, cleanPayload);
          resultName = doc.name;
          toast.success(`Contact "${doc.first_name} ${doc.last_name || ""}" updated in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
          void queryClient.invalidateQueries({ queryKey: ["crm-contact", recordName] });
        } else if (doctype === "Address") {
          const doc = await updateAddress(recordName, cleanPayload);
          resultName = doc.name;
          toast.success(`Address "${doc.address_title || doc.name}" updated in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-addresses"] });
          void queryClient.invalidateQueries({ queryKey: ["crm-address", recordName] });
        } else if (doctype === "Campaign") {
          const doc = await updateCampaign(recordName, cleanPayload);
          resultName = doc.name;
          toast.success(`Campaign "${doc.campaign_name || doc.name}" updated in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-campaigns"] });
          void queryClient.invalidateQueries({ queryKey: ["crm-campaign", recordName] });
        } else {
          await erpnext.put<unknown>(
            `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(recordName)}`,
            cleanPayload,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _silent: true } as any
          );
          toast.success(`${doctype} "${recordName}" updated in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: [`crm-${doctype.toLowerCase()}s`] });
        }
      } else {
        if (doctype === "Customer") {
          const doc = await createCustomer(cleanPayload);
          resultName = doc.name;
          toast.success(`Customer "${doc.customer_name || doc.name}" created in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-customers"] });
          void queryClient.invalidateQueries({ queryKey: ["crm-customers-quick"] });
        } else if (doctype === "Contact") {
          const doc = await createContact(cleanPayload);
          resultName = doc.name;
          toast.success(`Contact "${doc.first_name} ${doc.last_name || ""}" created in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-contacts"] });
        } else if (doctype === "Address") {
          const doc = await createAddress(cleanPayload);
          resultName = doc.name;
          toast.success(`Address "${doc.address_title || doc.name}" created in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-addresses"] });
        } else if (doctype === "Campaign") {
          const doc = await createCampaign(cleanPayload);
          resultName = doc.name;
          toast.success(`Campaign "${doc.campaign_name || doc.name}" created in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: ["crm-campaigns"] });
        } else {
          // Generic ERPNext DocType creation
          const res = await erpnext.post<unknown>(
            `/api/resource/${encodeURIComponent(doctype)}`,
            { doctype, ...cleanPayload },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { _silent: true } as any
          );
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw: any = res;
          resultName = raw?.data?.name || raw?.name || doctype;
          toast.success(`${doctype} record created in ERPNext!`);
          void queryClient.invalidateQueries({ queryKey: [`crm-${doctype.toLowerCase()}s`] });
        }
      }

      void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-kpis"] });
      onSuccess(resultName);
      onClose();
    } catch (err) {
      const msg = extractFrappeErrorMessage(err);
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-neutral-900">
                {title || (isEditing ? `Edit ${doctype}: ${recordName}` : `New ${doctype}`)}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                <Layers className="h-3 w-3" />
                DocType: {doctype}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              {subtitle ||
                (isEditing
                  ? `Update ${doctype} record in ERPNext backed by live schema`
                  : `Complete ERPNext ${doctype} record creation backed by live schema`)}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isMetaLoading ? (
            <div className="space-y-4 py-8">
              <div className="mx-auto flex w-12 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              </div>
              <p className="text-center text-xs text-neutral-400">
                Fetching {doctype} DocType schema from ERPNext…
              </p>
            </div>
          ) : isMetaError || !docTypeMeta ? (
            <div className="py-8 text-center space-y-3">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-500" />
              <p className="text-xs text-neutral-600">
                {metaError instanceof Error
                  ? metaError.message
                  : `Failed to load schema for ${doctype} from ERPNext.`}
              </p>
              <button
                type="button"
                onClick={() => void refetchMeta()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : (
            <form id={`doctype-form-${doctype}`} onSubmit={handleSubmit} className="space-y-6">
              {/* ERPNext Backend Error Banner */}
              {submitError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">ERPNext Error: </span>
                    <span>{submitError}</span>
                  </div>
                </div>
              )}

              {/* ERPNext Meta Badge */}
              <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50/50 px-3 py-2 text-[11px] text-neutral-500">
                <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                <span>
                  Fields and validations mapped directly from ERPNext ({docTypeMeta.fields.length} schema fields)
                </span>
              </div>

              {/* Dynamic Sections */}
              {formSections.map((section) => (
                <div
                  key={section.id}
                  className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3"
                >
                  <div className="border-b border-neutral-100 pb-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                      {section.title}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {section.fields.map((field) => (
                      <div
                        key={field.fieldname}
                        className={
                          field.fieldtype === "Small Text" ||
                          field.fieldtype === "Text" ||
                          field.fieldtype === "Long Text"
                            ? "sm:col-span-2"
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
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50/80 px-6 py-3.5">
          <p className="text-[11px] text-neutral-400">
            Mandatory fields are marked with <span className="text-red-500 font-semibold">*</span>
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form={`doctype-form-${doctype}`}
              disabled={isSubmitting || isMetaLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  {isEditing ? `Update ${doctype}` : `Save ${doctype}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
