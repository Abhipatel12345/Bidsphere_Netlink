import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  TrendingUp,
  ChevronRight,
  Kanban,
  ArrowUpRight,
} from "lucide-react";
import {
  getCrmDashboardKpis,
  getIncomingLeadsChart,
  getWonOpportunitiesChart,
  getPipelineStageDistribution,
} from "../../api/crmDashboard";
import { getLeads, getOpportunities, formatOpportunityAmount } from "../../api/crm";
import CrmKpiCards from "../../components/crm/CrmKpiCards";
import CrmCharts from "../../components/crm/CrmCharts";

export default function CrmDashboardPage() {
  const [grouping, setGrouping] = useState<"daily" | "weekly" | "monthly">("weekly");

  // Query KPIs
  const {
    data: kpis = {
      newLeadsLastMonth: 0,
      newOpportunitiesLastMonth: 0,
      wonOpportunitiesLastMonth: 0,
      openOpportunities: 0,
    },
    isLoading: isKpisLoading,
    isError: isKpisError,
    refetch: refetchKpis,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-kpis"],
    queryFn: getCrmDashboardKpis,
    staleTime: 60_000,
  });

  // Query Incoming Leads Chart
  const {
    data: incomingLeads = [],
    isLoading: isIncomingLoading,
    isError: isIncomingError,
    refetch: refetchIncoming,
  } = useQuery({
    queryKey: ["crm-incoming-leads", grouping],
    queryFn: () => getIncomingLeadsChart(grouping),
    staleTime: 60_000,
  });

  // Query Won Opportunities Chart
  const {
    data: wonOpportunities = [],
    isLoading: isWonLoading,
    isError: isWonError,
    refetch: refetchWon,
  } = useQuery({
    queryKey: ["crm-won-opportunities"],
    queryFn: getWonOpportunitiesChart,
    staleTime: 60_000,
  });

  // Query Pipeline Stages
  const {
    data: pipelineStages = [],
    isLoading: isPipelineLoading,
    refetch: refetchPipeline,
  } = useQuery({
    queryKey: ["crm-pipeline-stages"],
    queryFn: getPipelineStageDistribution,
    staleTime: 60_000,
  });

  // Query Recent Leads (5)
  const { data: recentLeadsData } = useQuery({
    queryKey: ["crm-recent-leads"],
    queryFn: () => getLeads({ limit_page_length: 5 }),
    staleTime: 60_000,
  });

  // Query Recent Opportunities (5)
  const { data: recentOppsData } = useQuery({
    queryKey: ["crm-recent-opportunities"],
    queryFn: () => getOpportunities({ limit_page_length: 5 }),
    staleTime: 60_000,
  });

  const handleRefreshAll = () => {
    void Promise.all([
      refetchKpis(),
      refetchIncoming(),
      refetchWon(),
      refetchPipeline(),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            CRM Command Center
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Real-time pipeline, opportunity conversion, and lead intelligence from ERPNext
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefetching}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <Link
            to="/crm/pipeline"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <Kanban className="h-3.5 w-3.5 text-neutral-500" />
            Pipeline Board
          </Link>

          <Link
            to="/crm/opportunities/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            New Opportunity
          </Link>

          <Link
            to="/crm/leads/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            New Lead
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <CrmKpiCards
        kpis={kpis}
        isLoading={isKpisLoading}
        isError={isKpisError}
        onRetry={refetchKpis}
      />

      {/* Charts Section */}
      <CrmCharts
        incomingLeads={incomingLeads}
        wonOpportunities={wonOpportunities}
        grouping={grouping}
        onGroupingChange={setGrouping}
        isLoading={isIncomingLoading || isWonLoading}
        isError={isIncomingError || isWonError}
        onRetry={() => {
          void refetchIncoming();
          void refetchWon();
        }}
      />

      {/* Sales Pipeline Stage Strip */}
      <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Sales Pipeline Stages
            </h3>
            <p className="text-xs text-neutral-500">
              Distribution of live deals across verified ERPNext stages
            </p>
          </div>
          <Link
            to="/crm/pipeline"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800"
          >
            Open Interactive Board <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
          {isPipelineLoading ? (
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-neutral-100" />
            ))
          ) : (
            pipelineStages.map((stg) => (
              <div
                key={stg.stage}
                className="flex flex-col justify-between rounded-lg border border-neutral-200/70 bg-neutral-50/60 p-3 hover:border-primary-300"
              >
                <div className="truncate text-[11px] font-semibold text-neutral-600" title={stg.stage}>
                  {stg.stage}
                </div>
                <div className="mt-2">
                  <div className="text-lg font-bold text-neutral-900">
                    {stg.count}
                  </div>
                  <div className="text-[10px] font-medium text-neutral-500">
                    {formatOpportunityAmount(stg.totalValue)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Leads & Opportunities 2-column view */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leads */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-base font-semibold text-neutral-900">
              Recent Leads
            </h3>
            <Link
              to="/crm/leads"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800"
            >
              View All ({recentLeadsData?.total ?? 0}) <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-neutral-100">
            {(recentLeadsData?.leads ?? []).length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No leads recorded yet. Click "New Lead" to add one!
              </div>
            ) : (
              recentLeadsData?.leads.map((lead) => (
                <div key={lead.name} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 pr-3">
                    <Link
                      to={`/crm/leads/${encodeURIComponent(lead.name)}`}
                      className="truncate text-xs font-semibold text-neutral-900 hover:text-primary-600"
                    >
                      {lead.lead_name || lead.name}
                    </Link>
                    <div className="mt-0.5 truncate text-[11px] text-neutral-500">
                      {lead.company_name || lead.email_id || "Individual"}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      {lead.status}
                    </span>
                    <Link
                      to={`/crm/leads/${encodeURIComponent(lead.name)}`}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Opportunities */}
        <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-base font-semibold text-neutral-900">
              Recent Opportunities
            </h3>
            <Link
              to="/crm/opportunities"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-800"
            >
              View All ({recentOppsData?.total ?? 0}) <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-3 divide-y divide-neutral-100">
            {(recentOppsData?.opportunities ?? []).length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No opportunities created yet. Click "New Opportunity" to start!
              </div>
            ) : (
              recentOppsData?.opportunities.map((opp) => (
                <div key={opp.name} className="flex items-center justify-between py-2.5">
                  <div className="min-w-0 pr-3">
                    <Link
                      to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                      className="truncate text-xs font-semibold text-neutral-900 hover:text-indigo-600"
                    >
                      {opp.title || opp.name}
                    </Link>
                    <div className="mt-0.5 truncate text-[11px] text-neutral-500">
                      {opp.party_name} • {opp.sales_stage}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-3">
                    <span className="text-xs font-bold text-neutral-900">
                      ${(Number(opp.opportunity_amount) || 0).toLocaleString()}
                    </span>
                    <Link
                      to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
