import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Calendar,
  Edit,
  ExternalLink,
  Layers,
  Megaphone,
  RefreshCw,
  Trash2,
  User,
  Users,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getCampaign,
  deleteCampaign,
  getCampaignRelated,
} from "../../api/crm";
import DocTypeModal from "../../components/crm/DocTypeModal";
import CrmNotesAttachments from "../../components/crm/CrmNotesAttachments";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function CampaignDetailPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const decodedName = decodeURIComponent(name);

  // 1. Fetch Campaign Document from ERPNext
  const {
    data: campaign,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-campaign", decodedName],
    queryFn: () => getCampaign(decodedName),
    enabled: Boolean(name),
  });

  // 2. Fetch Related Leads and Opportunities for this Campaign
  const { data: related = { leads: [], opportunities: [] } } = useQuery({
    queryKey: ["crm-campaign-related", decodedName],
    queryFn: () => getCampaignRelated(decodedName),
    enabled: Boolean(name),
  });

  const handleDelete = async () => {
    if (!campaign) return;
    try {
      await deleteCampaign(campaign.name);
      toast.success(`Campaign "${campaign.campaign_name || campaign.name}" deleted.`);
      navigate("/crm/campaigns");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete campaign.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-neutral-200 pb-4">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-neutral-200" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-neutral-200" />
            <div className="h-3 w-72 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="py-12 text-center text-sm text-neutral-500">
        Campaign record not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/crm/campaigns"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary-600" />
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {campaign.campaign_name || campaign.name}
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                <Layers className="h-3 w-3" />
                DocType: Campaign
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              ERPNext ID: {campaign.name} • Created on{" "}
              {new Date(campaign.creation || Date.now()).toLocaleDateString()} by{" "}
              {campaign.owner || "System"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Campaign
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Campaign Name
          </span>
          <div className="mt-1 text-sm font-bold text-neutral-900 truncate">
            {campaign.campaign_name || campaign.name}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Created Date
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-neutral-900">
            <Calendar className="h-4 w-4 text-neutral-400" />
            {new Date(campaign.creation || Date.now()).toLocaleDateString()}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Leads Generated
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-primary-700">
            <Users className="h-4 w-4 text-primary-600" />
            {related.leads.length}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Opportunities
          </span>
          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold text-indigo-700">
            <TrendingUp className="h-4 w-4 text-indigo-600" />
            {related.opportunities.length}
          </div>
        </div>
      </div>

      {/* Details & Overview Card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900">Campaign Overview & Description</h2>
          <span className="text-xs text-neutral-400">
            Last modified: {new Date(campaign.modified || Date.now()).toLocaleString()}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Description
            </label>
            <p className="mt-1 text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-3.5 rounded-lg border border-neutral-100 whitespace-pre-wrap">
              {campaign.description || "No description provided for this campaign in ERPNext."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Campaign Creator / Owner
              </label>
              <div className="mt-1 flex items-center gap-2 text-xs text-neutral-700">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                <span>{campaign.owner || "System"}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                Naming Series
              </label>
              <div className="mt-1 text-xs text-neutral-700">
                {campaign.naming_series || "Standard"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Leads Section */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
        <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-500" />
            <h3 className="text-sm font-bold text-neutral-900">
              Linked Leads ({related.leads.length})
            </h3>
          </div>
          <Link
            to={`/crm/leads/new`}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            + Add Lead
          </Link>
        </div>

        {related.leads.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">
            No prospects or leads have been linked with this campaign yet.
          </p>
        ) : (
          <div className="divide-y divide-neutral-100 text-xs">
            {related.leads.map((lead) => (
              <div key={lead.name} className="flex items-center justify-between py-2.5">
                <div>
                  <Link
                    to={`/crm/leads/${encodeURIComponent(lead.name)}`}
                    className="font-semibold text-neutral-900 hover:text-primary-600"
                  >
                    {lead.lead_name || lead.name}
                  </Link>
                  <div className="text-[11px] text-neutral-500">
                    {lead.company_name} • {lead.email_id || lead.mobile_no || "No direct contact"}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                    {lead.status}
                  </span>
                  <Link
                    to={`/crm/leads/${encodeURIComponent(lead.name)}`}
                    className="text-neutral-400 hover:text-neutral-700"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes & Activity Timeline */}
      <CrmNotesAttachments doctype="Campaign" docname={campaign.name} />

      {/* Edit Campaign Modal */}
      <DocTypeModal
        doctype="Campaign"
        recordName={campaign.name}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={campaign as unknown as Record<string, unknown>}
        title={`Edit Campaign: ${campaign.campaign_name || campaign.name}`}
        subtitle="Update campaign details in ERPNext backed by live DocType schema"
      />

      <ConfirmDialog
        open={isDeleteOpen}
        title="Delete Campaign"
        description={`Are you sure you want to delete campaign "${campaign.campaign_name || campaign.name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
