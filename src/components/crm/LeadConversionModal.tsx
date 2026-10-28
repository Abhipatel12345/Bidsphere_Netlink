import { useState } from "react";
import { Loader2, ArrowRight, Building2, TrendingUp, X } from "lucide-react";
import toast from "react-hot-toast";
import { makeCustomerFromLead, makeOpportunityFromLead } from "../../api/crm";
import type { Lead } from "../../types/crm";

interface Props {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConverted: (type: "customer" | "opportunity", recordName: string) => void;
}

export default function LeadConversionModal({
  lead,
  isOpen,
  onClose,
  onConverted,
}: Props) {
  const [conversionType, setConversionType] = useState<"customer" | "opportunity">("opportunity");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConvert = async () => {
    setIsSubmitting(true);
    try {
      if (conversionType === "customer") {
        const customer = await makeCustomerFromLead(lead.name);
        toast.success(`Customer "${customer.customer_name || customer.name}" created successfully in ERPNext!`);
        onConverted("customer", customer.name);
      } else {
        const opp = await makeOpportunityFromLead(lead.name);
        toast.success(`Opportunity "${opp.name}" created successfully in ERPNext!`);
        onConverted("opportunity", opp.name);
      }
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Conversion failed.";
      toast.error(`Conversion failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-lg font-bold text-neutral-900">Convert Lead</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <p className="text-sm text-neutral-600">
            Convert <strong className="text-neutral-900">{lead.lead_name || lead.name}</strong> into an official ERPNext document using ERPNext validation and relationship logic.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setConversionType("opportunity")}
              className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                conversionType === "opportunity"
                  ? "border-primary-600 bg-primary-50/50 text-primary-900 ring-2 ring-primary-500/20"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <TrendingUp
                className={`h-6 w-6 ${
                  conversionType === "opportunity" ? "text-primary-600" : "text-neutral-400"
                }`}
              />
              <span className="mt-2 text-sm font-semibold">Opportunity</span>
              <span className="mt-0.5 text-[11px] text-neutral-500">Pipeline deal</span>
            </button>

            <button
              type="button"
              onClick={() => setConversionType("customer")}
              className={`flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all ${
                conversionType === "customer"
                  ? "border-primary-600 bg-primary-50/50 text-primary-900 ring-2 ring-primary-500/20"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <Building2
                className={`h-6 w-6 ${
                  conversionType === "customer" ? "text-primary-600" : "text-neutral-400"
                }`}
              />
              <span className="mt-2 text-sm font-semibold">Customer</span>
              <span className="mt-0.5 text-[11px] text-neutral-500">Direct account</span>
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Converting…
              </>
            ) : (
              <>
                Execute Conversion
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
