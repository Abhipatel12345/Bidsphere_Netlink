import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  RefreshCw,
  Kanban,
} from "lucide-react";
import toast from "react-hot-toast";
import { getOpportunities, deleteOpportunity, getSalesStages, formatOpportunityAmount } from "../../api/crm";
import type { Opportunity, OpportunityStatus } from "../../types/crm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const STATUS_BADGES: Record<OpportunityStatus, string> = {
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  Quotation: "bg-purple-50 text-purple-700 border-purple-200",
  Converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Lost: "bg-red-50 text-red-700 border-red-200",
  Closed: "bg-neutral-100 text-neutral-700 border-neutral-200",
};

export default function OpportunitiesListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);

  const { data: salesStages = [] } = useQuery({
    queryKey: ["crm-sales-stages"],
    queryFn: getSalesStages,
    staleTime: 5 * 60_000,
  });

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-opportunities", search, statusFilter, stageFilter, page],
    queryFn: () =>
      getOpportunities({
        search,
        status: statusFilter || undefined,
        sales_stage: stageFilter || undefined,
        limit_start: page * pageSize,
        limit_page_length: pageSize,
      }),
  });

  const opportunities = data?.opportunities ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteOpportunity(deleteTarget.name);
      toast.success(`Opportunity "${deleteTarget.title || deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete opportunity.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Opportunities
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Track deals, forecasted amounts, and pipeline conversions in ERPNext ({total} total)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/crm/pipeline"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <Kanban className="h-3.5 w-3.5 text-neutral-500" />
            Board View
          </Link>

          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <Link
            to="/crm/opportunities/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Opportunity
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by party, title or account…"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Quotation">Quotation</option>
            <option value="Converted">Converted (Won)</option>
            <option value="Lost">Lost</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Stages</option>
            {salesStages.map((s) => (
              <option key={s.name} value={s.name}>
                {s.stage_name || s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-neutral-500">
                <th className="py-3 px-4 font-semibold">Deal Title / ID</th>
                <th className="py-3 px-4 font-semibold">Party Name</th>
                <th className="py-3 px-4 font-semibold">Sales Stage</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Expected Closing</th>
                <th className="py-3 px-4 font-semibold text-right">Deal Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4">
                      <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
                    </td>
                  </tr>
                ))
              ) : opportunities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No opportunities found. Click "New Opportunity" to create your first deal.
                  </td>
                </tr>
              ) : (
                opportunities.map((opp) => (
                  <tr key={opp.name} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                        className="font-semibold text-neutral-900 hover:text-primary-600"
                      >
                        {opp.title || opp.name}
                      </Link>
                      <div className="text-[11px] text-neutral-400">{opp.name}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-medium text-neutral-800">{opp.party_name}</span>
                      <span className="ml-1 text-[10px] text-neutral-400">({opp.opportunity_from})</span>
                    </td>

                    <td className="py-3 px-4">
                      <span className="inline-flex rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-800">
                        {opp.sales_stage || "—"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGES[opp.status] || "bg-neutral-100 text-neutral-700"
                          }`}
                      >
                        {opp.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-neutral-600">
                      {opp.expected_closing || "—"}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-neutral-900">
                      {formatOpportunityAmount(opp.opportunity_amount, opp.currency)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                          className="rounded p-1 text-neutral-400 hover:text-neutral-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(opp)}
                          title="Delete"
                          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-xs text-neutral-600">
            <span>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} deals
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded border border-neutral-200 px-2.5 py-1 font-medium hover:bg-neutral-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="px-2 font-semibold">
                {page + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-neutral-200 px-2.5 py-1 font-medium hover:bg-neutral-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Opportunity"
        description={`Are you sure you want to permanently delete opportunity "${deleteTarget?.title || deleteTarget?.name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
