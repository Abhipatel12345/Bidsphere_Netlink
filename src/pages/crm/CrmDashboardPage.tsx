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
  AlertTriangle,
  Truck,
  Users,
} from "lucide-react";
import {
  getCrmDashboardKpis,
  getIncomingLeadsChart,
  getWonOpportunitiesChart,
  getPipelineStageDistribution,
  getComplaintsDashboardMetrics,
  getDeliveryDashboardMetrics,
  getCustomerDashboardMetrics,
} from "../../api/crmDashboard";
import { getLeads, getOpportunities, formatOpportunityAmount } from "../../api/crm";
import CrmKpiCards from "../../components/crm/CrmKpiCards";
import CrmCharts from "../../components/crm/CrmCharts";

export default function CrmDashboardPage() {
  const [activeTab, setActiveTab] = useState<"sales" | "complaints" | "deliveries" | "customers">("sales");
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

  // Query Complaints Overview
  const { data: complaintMetrics, refetch: refetchComplaints } = useQuery({
    queryKey: ["crm-complaints-dash-metrics"],
    queryFn: getComplaintsDashboardMetrics,
    staleTime: 60_000,
  });

  // Query Delivery Overview
  const { data: deliveryMetrics, refetch: refetchDelivery } = useQuery({
    queryKey: ["crm-delivery-dash-metrics"],
    queryFn: getDeliveryDashboardMetrics,
    staleTime: 60_000,
  });

  // Query Customer Overview
  const { data: customerMetrics, refetch: refetchCustomers } = useQuery({
    queryKey: ["crm-customer-dash-metrics"],
    queryFn: getCustomerDashboardMetrics,
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
      refetchComplaints(),
      refetchDelivery(),
      refetchCustomers(),
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
            Unified Customer Relationship, Complaints, and Order Fulfillment Intelligence for Massy Distribution
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

      {/* Domain Navigation Tabs */}
      <div className="flex border-b border-neutral-200 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("sales")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
            activeTab === "sales"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Sales & Pipeline ({kpis.openOpportunities} Open)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("complaints")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
            activeTab === "complaints"
              ? "border-amber-600 text-amber-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Complaints Management ({complaintMetrics?.open ?? 0} Open)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("deliveries")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
            activeTab === "deliveries"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Truck className="h-4 w-4" />
          Order-to-Delivery ({deliveryMetrics?.pendingDeliveries ?? 0} Pending)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("customers")}
          className={`flex items-center gap-2 border-b-2 py-3 px-4 transition-colors ${
            activeTab === "customers"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Users className="h-4 w-4" />
          Customer Intelligence ({customerMetrics?.totalCustomers ?? 0})
        </button>
      </div>

      {/* Tab 1: Sales & Pipeline */}
      {activeTab === "sales" && (
        <div className="space-y-6">
          <CrmKpiCards
            kpis={kpis}
            isLoading={isKpisLoading}
            isError={isKpisError}
            onRetry={refetchKpis}
          />

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
                    No leads recorded yet.
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
                    No opportunities created yet.
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
      )}

      {/* Tab 2: Complaints Management Overview */}
      {activeTab === "complaints" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Complaints
              </span>
              <div className="mt-2 text-2xl font-bold text-neutral-900">
                {complaintMetrics?.total ?? 0}
              </div>
              <span className="text-[11px] text-neutral-400">All recorded issues</span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Open (Pending)
              </span>
              <div className="mt-2 text-2xl font-bold text-amber-900">
                {complaintMetrics?.open ?? 0}
              </div>
              <span className="text-[11px] text-amber-700">Immediate action needed</span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                Under Investigation
              </span>
              <div className="mt-2 text-2xl font-bold text-blue-900">
                {complaintMetrics?.inProgress ?? 0}
              </div>
              <span className="text-[11px] text-blue-700">Replied or On Hold</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Resolved
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-900">
                {complaintMetrics?.resolved ?? 0}
              </div>
              <span className="text-[11px] text-emerald-700">Resolution documented</span>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
                Overdue SLA Cases
              </span>
              <div className="mt-2 text-2xl font-bold text-red-900">
                {complaintMetrics?.overdue ?? 0}
              </div>
              <span className="text-[11px] text-red-700">&gt; 7 days open</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Category Breakdown */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-base font-semibold text-neutral-900">
                  Complaints by Category
                </h3>
                <Link
                  to="/crm/complaints"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                >
                  Manage All Tickets &rarr;
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {(complaintMetrics?.byCategory ?? []).length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-400">
                    No complaint categories logged yet.
                  </div>
                ) : (
                  complaintMetrics?.byCategory.map((cat) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-700">{cat.name}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-bold text-neutral-800">
                        {cat.count}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Priority Breakdown & Quick Actions */}
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="text-base font-semibold text-neutral-900">
                  Severity & Priority Breakdown
                </h3>
              </div>
              <div className="mt-4 space-y-3">
                {(complaintMetrics?.byPriority ?? []).map((prio) => (
                  <div key={prio.name} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">{prio.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-bold ${
                        prio.name === "Urgent"
                          ? "bg-red-100 text-red-800"
                          : prio.name === "High"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {prio.count} tickets
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-neutral-100 pt-4">
                <Link
                  to="/crm/complaints"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Open Full Complaints Desk
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Order-to-Delivery Tracking */}
      {activeTab === "deliveries" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Orders
              </span>
              <div className="mt-2 text-2xl font-bold text-neutral-900">
                {deliveryMetrics?.totalOrders ?? 0}
              </div>
              <span className="text-[11px] text-neutral-400">
                ${((deliveryMetrics?.totalOrderValue ?? 0)).toLocaleString()} value
              </span>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">
                Pending Dispatch
              </span>
              <div className="mt-2 text-2xl font-bold text-amber-900">
                {deliveryMetrics?.pendingDeliveries ?? 0}
              </div>
              <span className="text-[11px] text-amber-700">Awaiting shipment</span>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">
                Partial Fulfillment
              </span>
              <div className="mt-2 text-2xl font-bold text-blue-900">
                {deliveryMetrics?.partialDeliveries ?? 0}
              </div>
              <span className="text-[11px] text-blue-700">In transit</span>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Delivered
              </span>
              <div className="mt-2 text-2xl font-bold text-emerald-900">
                {deliveryMetrics?.deliveredOrders ?? 0}
              </div>
              <span className="text-[11px] text-emerald-700">Receipt confirmed</span>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-800">
                Fulfillment Rate
              </span>
              <div className="mt-2 text-2xl font-bold text-red-900">
                {deliveryMetrics?.fulfillmentRate ?? 0}%
              </div>
              <span className="text-[11px] text-red-700">On-time delivery index</span>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm text-center">
            <Truck className="mx-auto h-10 w-10 text-primary-600 mb-2" />
            <h3 className="text-base font-bold text-neutral-900">
              Interactive Order-to-Delivery Tracking Workspace
            </h3>
            <p className="mt-1 text-xs text-neutral-500 max-w-lg mx-auto">
              Follow every customer shipment from sales contract, inventory reservation, carrier dispatch to proof of delivery.
            </p>
            <div className="mt-4">
              <Link
                to="/crm/deliveries"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
              >
                Launch Delivery Tracker
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Customer Intelligence */}
      {activeTab === "customers" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Master Customers
              </span>
              <div className="mt-2 text-2xl font-bold text-neutral-900">
                {customerMetrics?.totalCustomers ?? 0}
              </div>
              <span className="text-[11px] text-neutral-400">In ERP customer registry</span>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                New Customers (Last 30d)
              </span>
              <div className="mt-2 text-2xl font-bold text-neutral-900">
                {customerMetrics?.newCustomersLastMonth ?? 0}
              </div>
              <span className="text-[11px] text-neutral-400">Newly onboarded</span>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Total Pipeline Value
              </span>
              <div className="mt-2 text-2xl font-bold text-primary-700">
                ${((customerMetrics?.totalPipelineValue ?? 0)).toLocaleString()}
              </div>
              <span className="text-[11px] text-neutral-400">Across all opportunities</span>
            </div>
          </div>

          {/* Top Customers by Pipeline */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-base font-semibold text-neutral-900">
                Top Accounts by Sales Pipeline
              </h3>
              <Link
                to="/crm/customers"
                className="text-xs font-semibold text-primary-600 hover:text-primary-800"
              >
                View Customer Directory &rarr;
              </Link>
            </div>

            <div className="mt-4 divide-y divide-neutral-100 text-xs">
              {(customerMetrics?.topCustomersByPipeline ?? []).map((cust) => (
                <div key={cust.name} className="flex items-center justify-between py-3">
                  <div>
                    <Link
                      to={`/crm/customers/${encodeURIComponent(cust.name)}`}
                      className="font-semibold text-neutral-900 hover:text-primary-600"
                    >
                      {cust.customer_name}
                    </Link>
                    <div className="text-[11px] text-neutral-500">ID: {cust.name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-neutral-900">
                      ${cust.value.toLocaleString()}
                    </span>
                    <Link
                      to={`/crm/customers/${encodeURIComponent(cust.name)}`}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
