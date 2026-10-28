import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Search,
  ArrowRight,
  Calendar,
  CheckCircle2,
  XCircle,
  Filter,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getOpportunities,
  getSalesStages,
  updateOpportunityStage,
  updateOpportunity,
  normalizeStageName,
  formatOpportunityAmount,
} from "../../api/crm";
import type { OpportunityStatus } from "../../types/crm";

export default function SalesPipelinePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Open");
  const [movingOppId, setMovingOppId] = useState<string | null>(null);

  const { data: stages = [] } = useQuery({
    queryKey: ["crm-pipeline-stages-list"],
    queryFn: getSalesStages,
    staleTime: 5 * 60_000,
  });

  const {
    data,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-pipeline-opps", search, statusFilter],
    queryFn: () =>
      getOpportunities({
        search,
        status: (statusFilter === "ALL" ? undefined : statusFilter) as OpportunityStatus | undefined,
        limit_page_length: 300,
      }),
    staleTime: 30_000,
  });

  const opportunities = data?.opportunities ?? [];

  // Summary Metrics
  const totalPipelineValue = opportunities.reduce(
    (sum, o) => sum + (Number(o.opportunity_amount) || 0),
    0
  );
  const weightedValue = opportunities.reduce(
    (sum, o) => sum + ((Number(o.opportunity_amount) || 0) * (o.probability ?? 50)) / 100,
    0
  );

  const handleStageMove = async (oppName: string, nextStage: string) => {
    setMovingOppId(oppName);
    try {
      await updateOpportunityStage(oppName, nextStage);
      toast.success(`Deal moved to "${nextStage}" in ERPNext!`);
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-stage-distribution"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-kpis"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to move stage.";
      toast.error(msg);
    } finally {
      setMovingOppId(null);
    }
  };

  const handleStatusChange = async (oppName: string, newStatus: OpportunityStatus) => {
    setMovingOppId(oppName);
    try {
      await updateOpportunity(oppName, { status: newStatus });
      toast.success(
        newStatus === "Converted"
          ? `Deal marked as Won (Converted) in ERPNext!`
          : `Deal marked as ${newStatus} in ERPNext!`
      );
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-stage-distribution"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-kpis"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    } finally {
      setMovingOppId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Sales Pipeline
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Interactive visual pipeline across canonical ERPNext stages ({opportunities.length} {statusFilter === "ALL" ? "total" : statusFilter.toLowerCase()} deals)
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

          <Link
            to="/crm/opportunities/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Opportunity
          </Link>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Total Pipeline Value
          </span>
          <div className="mt-2 text-2xl font-bold text-neutral-900">
            {formatOpportunityAmount(totalPipelineValue)}
          </div>
          <span className="text-[11px] text-neutral-400">Sum of unweighted deal values</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Weighted Forecast Value
          </span>
          <div className="mt-2 text-2xl font-bold text-indigo-600">
            {formatOpportunityAmount(weightedValue)}
          </div>
          <span className="text-[11px] text-neutral-400">Factoring probability confidence</span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {statusFilter === "ALL" ? "All Deals" : `${statusFilter} Deals`} Count
          </span>
          <div className="mt-2 text-2xl font-bold text-neutral-900">
            {opportunities.length}
          </div>
          <span className="text-[11px] text-neutral-400">
            {statusFilter === "Open" ? "Active opportunities in flight" : "Filtered opportunities"}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter pipeline by deal title or party name…"
            className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 text-xs shadow-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("Open")}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                statusFilter === "Open"
                  ? "bg-primary-50 text-primary-700 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Open Deals
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Converted")}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                statusFilter === "Converted"
                  ? "bg-emerald-50 text-emerald-700 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Won Deals
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("Lost")}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                statusFilter === "Lost"
                  ? "bg-red-50 text-red-700 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Lost Deals
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`rounded-md px-3 py-1 font-medium transition-colors ${
                statusFilter === "ALL"
                  ? "bg-neutral-100 text-neutral-900 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              All Deals
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-6">
        {stages.map((stage, stageIdx) => {
          const normStage = normalizeStageName(stage.stage_name || stage.name);
          const stageOpps = opportunities.filter(
            (o) => normalizeStageName(o.sales_stage) === normStage
          );
          const stageTotal = stageOpps.reduce(
            (sum, o) => sum + (Number(o.opportunity_amount) || 0),
            0
          );
          const nextStage = stages[stageIdx + 1]?.name;
          const isFinalStage = stageIdx === stages.length - 1;

          return (
            <div
              key={stage.name}
              className="flex w-72 flex-shrink-0 flex-col rounded-xl border border-neutral-200/90 bg-neutral-50/80 shadow-sm"
            >
              {/* Column Header */}
              <div className="border-b border-neutral-200 bg-white p-3.5 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600">
                      {stageIdx + 1}
                    </span>
                    <h3 className="truncate text-xs font-bold text-neutral-900" title={stage.stage_name || stage.name}>
                      {stage.stage_name || stage.name}
                    </h3>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                    {stageOpps.length}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-primary-700">
                  {formatOpportunityAmount(stageTotal, stageOpps[0]?.currency || "USD")}
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 p-3 min-h-[350px]">
                {stageOpps.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 text-center text-[11px] text-neutral-400">
                    No deals in this stage
                  </div>
                ) : (
                  stageOpps.map((opp) => (
                    <div
                      key={opp.name}
                      className="group flex flex-col justify-between rounded-lg border border-neutral-200 bg-white p-3.5 shadow-sm transition-all hover:border-primary-400 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                            className="text-xs font-bold text-neutral-900 group-hover:text-primary-600 line-clamp-2"
                          >
                            {opp.title || opp.name}
                          </Link>
                          {opp.status === "Converted" && (
                            <span className="shrink-0 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                              Won
                            </span>
                          )}
                          {opp.status === "Lost" && (
                            <span className="shrink-0 rounded bg-red-50 border border-red-200 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                              Lost
                            </span>
                          )}
                        </div>
                        <div className="mt-1 truncate text-[11px] font-medium text-neutral-500">
                          {opp.party_name}
                        </div>
                      </div>

                      <div className="mt-3 border-t border-neutral-100 pt-2">
                        <div className="flex items-center justify-between text-xs font-bold text-neutral-900">
                          <span>{formatOpportunityAmount(opp.opportunity_amount, opp.currency)}</span>
                          <span className="text-[10px] font-semibold text-indigo-600">
                            {opp.probability ?? 50}% prob
                          </span>
                        </div>

                        {opp.expected_closing && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                            <Calendar className="h-3 w-3" />
                            {opp.expected_closing}
                          </div>
                        )}

                        {/* Move stage control */}
                        {nextStage && opp.status === "Open" && (
                          <div className="mt-2.5 pt-2 border-t border-neutral-50 flex justify-end">
                            <button
                              type="button"
                              disabled={movingOppId === opp.name}
                              onClick={() => handleStageMove(opp.name, nextStage)}
                              className="inline-flex items-center gap-1 rounded bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                            >
                              Move to next <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}

                        {/* Final outcome actions after Negotiation / Review */}
                        {isFinalStage && opp.status === "Open" && (
                          <div className="mt-2.5 pt-2 border-t border-neutral-50 flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={movingOppId === opp.name}
                              onClick={() => handleStatusChange(opp.name, "Converted")}
                              className="inline-flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                              title="Mark deal as Won (Converted in ERPNext)"
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              Won
                            </button>
                            <button
                              type="button"
                              disabled={movingOppId === opp.name}
                              onClick={() => handleStatusChange(opp.name, "Lost")}
                              className="inline-flex items-center gap-1 rounded bg-red-50 border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100 transition-colors"
                              title="Mark deal as Lost in ERPNext"
                            >
                              <XCircle className="h-3 w-3 text-red-600" />
                              Lost
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
