import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trash2, RefreshCw, Megaphone, Calendar, Edit } from "lucide-react";
import toast from "react-hot-toast";
import { getCampaigns, deleteCampaign } from "../../api/crm";
import type { Campaign } from "../../types/crm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DocTypeModal from "../../components/crm/DocTypeModal";

export default function CampaignsListPage() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Campaign | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const {
    data: campaigns = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-campaigns", search],
    queryFn: () => getCampaigns(search),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCampaign(deleteTarget.name);
      toast.success("Campaign deleted.");
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete campaign.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Campaigns
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Marketing initiatives and outbound prospect campaigns in ERPNext ({campaigns.length} total)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns…"
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-xs text-neutral-400">
          No campaigns found. Click "New Campaign" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((camp) => (
            <div
              key={camp.name}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Megaphone className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    <Link
                      to={`/crm/campaigns/${encodeURIComponent(camp.name)}`}
                      className="text-sm font-bold text-neutral-900 hover:text-primary-600 truncate transition-colors"
                      title={camp.campaign_name || camp.name}
                    >
                      {camp.campaign_name || camp.name}
                    </Link>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditTarget(camp)}
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                      title="Edit Campaign"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(camp)}
                      className="rounded p-1 text-neutral-300 hover:bg-red-50 hover:text-red-600"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <Link
                  to={`/crm/campaigns/${encodeURIComponent(camp.name)}`}
                  className="block group"
                >
                  <p className="mt-2 text-xs text-neutral-600 line-clamp-2 group-hover:text-neutral-900 transition-colors">
                    {camp.description || "No description provided."}
                  </p>
                </Link>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-2 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(camp.creation || Date.now()).toLocaleDateString()}
                </span>
                <Link
                  to={`/crm/campaigns/${encodeURIComponent(camp.name)}`}
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  Open Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Campaign Modal */}
      <DocTypeModal
        doctype="Campaign"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        title="New Campaign"
        subtitle="Create an official ERPNext Campaign record with full DocType schema support"
      />

      {/* Edit Campaign Modal */}
      <DocTypeModal
        doctype="Campaign"
        recordName={editTarget?.name}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={editTarget as unknown as Record<string, unknown>}
        title={`Edit Campaign: ${editTarget?.campaign_name || editTarget?.name}`}
        subtitle="Update campaign details in ERPNext backed by live DocType schema"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Campaign"
        description={`Are you sure you want to delete campaign "${deleteTarget?.campaign_name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
