import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
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
  getOpportunity,
  createOpportunity,
  updateOpportunity,
} from "../../api/crm";
import type { DocField, DocTypeMeta, OpportunityItem } from "../../types/crm";
import DocTypeFormField from "../../components/crm/DocTypeFormField";
import OpportunityItemTable from "../../components/crm/OpportunityItemTable";

interface FormSection {
  id: string;
  title: string;
  fields: DocField[];
}

export default function OpportunityCreateEditPage() {
  const { name } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(name);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Opportunity DocType Metadata directly from ERPNext
  const {
    data: docTypeMeta,
    isLoading: isMetaLoading,
    isError: isMetaError,
    error: metaError,
    refetch: refetchMeta,
  } = useQuery<DocTypeMeta>({
    queryKey: ["doctype-meta", "Opportunity"],
    queryFn: () => getDocTypeMeta("Opportunity"),
    staleTime: 10 * 60_000,
  });

  // 2. Fetch existing opportunity if editing
  const {
    data: existingOpp,
    isLoading: isOppLoading,
  } = useQuery({
    queryKey: ["crm-opportunity-edit", name],
    queryFn: () => getOpportunity(decodeURIComponent(name!)),
    enabled: isEditing,
  });

  // 3. Initialize defaults from DocType schema metadata
  useEffect(() => {
    if (docTypeMeta?.fields && !isEditing) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

      const defaults: Record<string, unknown> = {};
      for (const f of docTypeMeta.fields) {
        if (f.default !== undefined && f.default !== null && f.default !== "") {
          if (f.fieldtype === "Check") {
            defaults[f.fieldname] = f.default === "1" || f.default === 1 ? 1 : 0;
          } else if (f.default === "Today") {
            defaults[f.fieldname] = today;
          } else if (f.default !== "__user") {
            defaults[f.fieldname] = f.default;
          }
        }
      }

      // Sensible standard defaults for Opportunity
      if (!defaults.status) defaults.status = "Open";
      if (!defaults.opportunity_from) defaults.opportunity_from = searchParams.get("opportunity_from") || "Lead";
      if (!defaults.party_name && searchParams.get("party_name")) defaults.party_name = searchParams.get("party_name");
      if (!defaults.company) defaults.company = "Netlink";
      if (!defaults.transaction_date) defaults.transaction_date = today;
      if (!defaults.currency) defaults.currency = "USD";
      if (!defaults.sales_stage) defaults.sales_stage = "Prospecting";
      if (defaults.probability === undefined) defaults.probability = 50;

      setFormData((prev) => ({ ...defaults, ...prev }));
    }
  }, [docTypeMeta, isEditing, searchParams]);

  // Merge existing opportunity when loaded in edit mode
  useEffect(() => {
    if (existingOpp) {
      setFormData(existingOpp as unknown as Record<string, unknown>);
      if (existingOpp.items && Array.isArray(existingOpp.items)) {
        setItems(existingOpp.items);
      }
    }
  }, [existingOpp]);

  // 4. Organize DocType fields into structured sections
  const formSections = useMemo<FormSection[]>(() => {
    if (!docTypeMeta?.fields) return [];

    const sections: FormSection[] = [];
    let currentSection: FormSection = {
      id: "opportunity_basics",
      title: "Opportunity Basics",
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

      // Filter layout/table/hidden fields (table 'items' rendered separately with OpportunityItemTable)
      if (["Column Break", "HTML", "Table"].includes(f.fieldtype)) continue;
      if (f.hidden === 1) continue;
      if (!isEditing && f.read_only === 1 && ["name", "title"].includes(f.fieldname)) continue;

      currentSection.fields.push(f);
    }

    if (currentSection.fields.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }, [docTypeMeta, isEditing]);

  const handleFieldChange = (fieldname: string, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [fieldname]: value };
      // When opportunity_from changes (e.g. from Lead to Customer), clear party_name
      if (fieldname === "opportunity_from" && prev.opportunity_from !== value) {
        next.party_name = "";
      }
      return next;
    });

    if (fieldErrors[fieldname]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldname];
        return next;
      });
    }
    if (submitError) setSubmitError(null);
  };

  const handleItemsChange = (newItems: OpportunityItem[]) => {
    setItems(newItems);
    const total = newItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    if (total > 0 || (formData.opportunity_amount && items.length > 0)) {
      setFormData((prev) => ({ ...prev, opportunity_amount: total }));
    }
  };

  // 5. Form validation
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

    if (!formData.party_name) {
      errors.party_name = `Please select a ${formData.opportunity_from || "Party"}.`;
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 6. Submit directly to ERPNext
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      toast.error("Please complete all mandatory fields marked with an asterisk (*).");
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

      // Format child items for ERPNext Opportunity
      const validItems = items
        .filter((it) => it.item_code?.trim())
        .map((it) => {
          const qty = Number(it.qty) || 1;
          const rate = Number(it.rate) || 0;
          const amount = qty * rate;
          return {
            doctype: "Opportunity Item",
            ...(it.name ? { name: it.name } : {}),
            item_code: it.item_code!.trim(),
            item_name: it.item_name || it.item_code,
            description: it.description || it.item_name || it.item_code,
            uom: it.uom || "Nos",
            qty,
            rate,
            amount,
            base_rate: rate,
            base_amount: amount,
            ...(it.item_group ? { item_group: it.item_group } : {}),
            ...(it.brand ? { brand: it.brand } : {}),
          };
        });

      cleanPayload.items = validItems;
      if (validItems.length > 0) {
        const total = validItems.reduce((sum, it) => sum + it.amount, 0);
        cleanPayload.opportunity_amount = total;
        cleanPayload.total = total;
        cleanPayload.base_total = total;
      }

      if (isEditing && name) {
        await updateOpportunity(decodeURIComponent(name), cleanPayload);
        toast.success("Opportunity updated successfully in ERPNext.");
        void queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
        void queryClient.invalidateQueries({ queryKey: ["crm-pipeline-opps"] });
        navigate(`/crm/opportunities/${encodeURIComponent(name)}`);
      } else {
        const created = await createOpportunity(cleanPayload);
        toast.success(`Opportunity "${created.title || created.name}" created in ERPNext!`);
        void queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
        void queryClient.invalidateQueries({ queryKey: ["crm-pipeline-opps"] });
        void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-kpis"] });
        navigate(`/crm/opportunities/${encodeURIComponent(created.name)}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save Opportunity in ERPNext.";
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isMetaLoading || (isEditing && isOppLoading)) {
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

  if (isMetaError || !docTypeMeta) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
        <h2 className="mt-3 text-lg font-bold text-neutral-900">
          Failed to load Opportunity DocType Metadata
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          {metaError instanceof Error
            ? metaError.message
            : "Could not retrieve the Opportunity DocType schema from ERPNext."}
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
            to={isEditing ? `/crm/opportunities/${encodeURIComponent(name!)}` : "/crm/opportunities"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 shadow-sm hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {isEditing ? `Edit Deal: ${formData.title || name}` : "Create New Opportunity"}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                <Layers className="h-3 w-3" />
                DocType: Opportunity
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Form generated directly from ERPNext Opportunity DocType metadata ({docTypeMeta.fields.length} schema fields)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to={isEditing ? `/crm/opportunities/${encodeURIComponent(name!)}` : "/crm/opportunities"}
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
                {isEditing ? "Save Changes" : "Create Opportunity"}
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
            Connected to <strong>ERPNext CRM</strong> • Dynamic Link to {String(formData.opportunity_from || "Lead")} • Full child items support
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

        {/* Opportunity Items Child Table */}
        <OpportunityItemTable
          items={items}
          onChange={handleItemsChange}
        />

        {/* Bottom Actions */}
        <div className="flex items-center justify-between border-t border-neutral-200 pt-5 pb-8">
          <p className="text-xs text-neutral-400">
            Fields marked with <span className="text-red-500 font-semibold">*</span> are mandatory in ERPNext.
          </p>

          <div className="flex items-center gap-3">
            <Link
              to={isEditing ? `/crm/opportunities/${encodeURIComponent(name!)}` : "/crm/opportunities"}
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
                  {isEditing ? "Save Changes" : "Create Opportunity"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
