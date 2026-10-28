import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Edit,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Phone,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import { getLead, updateLead, deleteLead } from "../../api/crm";
import type { LeadStatus } from "../../types/crm";
import LeadConversionModal from "../../components/crm/LeadConversionModal";
import CrmNotesAttachments from "../../components/crm/CrmNotesAttachments";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function LeadDetailPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();

  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const {
    data: lead,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["crm-lead", name],
    queryFn: () => getLead(decodeURIComponent(name)),
    enabled: Boolean(name),
  });

  const handleStatusChange = async (newStatus: LeadStatus) => {
    if (!lead) return;
    setIsUpdatingStatus(true);
    try {
      await updateLead(lead.name, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;
    try {
      await deleteLead(lead.name);
      toast.success("Lead deleted.");
      navigate("/crm/leads");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete lead.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="py-12 text-center text-sm text-neutral-500">
        Lead not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/crm/leads"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {lead.lead_name || lead.name}
              </h1>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                {lead.name}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Created on {new Date(lead.creation || Date.now()).toLocaleDateString()} by {lead.owner || "System"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {lead.status !== "Converted" && (
            <button
              type="button"
              onClick={() => setIsConvertOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <TrendingUp className="h-4 w-4" />
              Convert Lead
            </button>
          )}

          <Link
            to={`/crm/leads/${encodeURIComponent(lead.name)}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Link>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Summary Card */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Lead Overview
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <Building2 className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <div className="text-xs text-neutral-500">Company / Organization</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {lead.company_name || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <div className="text-xs text-neutral-500">Email Address</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {lead.email_id || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <div className="text-xs text-neutral-500">Phone / Mobile</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {lead.mobile_no || lead.phone || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Globe className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <div className="text-xs text-neutral-500">Website</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {lead.website ? (
                      <a
                        href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {lead.website}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <div className="text-xs text-neutral-500">Location / Territory</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {[lead.city, lead.state, lead.country, lead.territory].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-neutral-400" />
                <div>
                  <div className="text-xs text-neutral-500">Lead Owner</div>
                  <div className="text-sm font-semibold text-neutral-900">
                    {lead.lead_owner || "Unassigned"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Qualification & Business Details */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
              Business Intelligence & Qualification
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <span className="text-xs text-neutral-500">Lead Type</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">{lead.type || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-neutral-500">Lead Source</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">{lead.utm_source || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-neutral-500">Industry</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">{lead.industry || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-neutral-500">Employees</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">{lead.no_of_employees || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-neutral-500">Annual Revenue</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">
                  {lead.annual_revenue ? `$${lead.annual_revenue.toLocaleString()}` : "—"}
                </p>
              </div>

              <div>
                <span className="text-xs text-neutral-500">Qualification</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">
                  {lead.qualification_status || "Unqualified"}
                </p>
              </div>

              <div>
                <span className="text-xs text-neutral-500">Market Segment</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">{lead.market_segment || "—"}</p>
              </div>

              <div>
                <span className="text-xs text-neutral-500">Request Type</span>
                <p className="mt-0.5 text-sm font-medium text-neutral-900">{lead.request_type || "—"}</p>
              </div>
            </div>
          </div>

          {/* Notes, Comments & Attachments */}
          <CrmNotesAttachments doctype="Lead" docname={lead.name} />
        </div>

        {/* Right Sidebar Status & Next Steps */}
        <div className="space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Status Progression
            </h3>

            <div className="mt-3">
              <select
                value={lead.status}
                disabled={isUpdatingStatus}
                onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                className="w-full rounded-lg border border-neutral-300 bg-white py-2 px-3 text-xs font-semibold text-neutral-800 shadow-sm focus:border-primary-500 focus:outline-none"
              >
                <option value="Lead">Lead</option>
                <option value="Open">Open</option>
                <option value="Replied">Replied</option>
                <option value="Opportunity">Opportunity</option>
                <option value="Quotation">Quotation</option>
                <option value="Interested">Interested</option>
                <option value="Converted">Converted</option>
                <option value="Do Not Contact">Do Not Contact</option>
              </select>
            </div>

            <div className="mt-4 border-t border-neutral-100 pt-3">
              <span className="text-xs text-neutral-400">Current Phase:</span>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-neutral-800">
                <CheckCircle2 className="h-4 w-4 text-primary-600" />
                {lead.status}
              </div>
            </div>
          </div>

          {/* Linked Customer / Opportunity if converted */}
          {lead.customer && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
              <span className="text-xs font-semibold text-emerald-800">Linked Customer Record</span>
              <p className="mt-1 text-xs text-emerald-700">This lead was converted into customer:</p>
              <Link
                to={`/crm/customers/${encodeURIComponent(lead.customer)}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-900 hover:underline"
              >
                {lead.customer} <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Conversion Modal */}
      {isConvertOpen && (
        <LeadConversionModal
          lead={lead}
          isOpen={true}
          onClose={() => setIsConvertOpen(false)}
          onConverted={(type, recordName) => {
            void refetch();
            if (type === "opportunity") {
              navigate(`/crm/opportunities/${encodeURIComponent(recordName)}`);
            } else {
              navigate(`/crm/customers/${encodeURIComponent(recordName)}`);
            }
          }}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={isDeleteOpen}
        title="Delete Lead"
        description={`Are you sure you want to permanently delete lead "${lead.lead_name || lead.name}" from ERPNext?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
