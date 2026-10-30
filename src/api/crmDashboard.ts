import { erpnext } from "./erpnext";
import type {
  CrmDashboardKpi,
  IncomingLeadsChartPoint,
  WonOpportunityChartPoint,
  PipelineStageSummary,
  Opportunity,
  SalesStage,
} from "../types/crm";
import { getSalesStages, parseRecords, parseCount, normalizeStageName } from "./crm";

function getOneMonthAgoDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().split("T")[0];
}

/**
 * Fetch real CRM KPI counts from ERPNext Number Cards and client queries.
 * Does not silently swallow errors with zero.
 */
export async function getCrmDashboardKpis(): Promise<CrmDashboardKpi> {
  const oneMonthAgo = getOneMonthAgoDate();

  const [newLeadsRes, newOppsRes, wonOppsRes, openOppsRes] = await Promise.all([
    // New Lead (Last 1 Month)
    erpnext.get<unknown>(
      `/api/method/frappe.client.get_count?doctype=Lead&filters=${encodeURIComponent(
        JSON.stringify([["creation", ">=", oneMonthAgo]])
      )}`
    ),

    // New Opportunity (Last 1 Month)
    erpnext.get<unknown>(
      `/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(
        JSON.stringify([["creation", ">=", oneMonthAgo]])
      )}`
    ),

    // Won Opportunity (Last 1 Month)
    erpnext.get<unknown>(
      `/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(
        JSON.stringify([
          ["status", "=", "Converted"],
          ["modified", ">=", oneMonthAgo],
        ])
      )}`
    ),

    // Open Opportunity
    erpnext.get<unknown>(
      `/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(
        JSON.stringify([["status", "=", "Open"]])
      )}`
    ),
  ]);

  return {
    newLeadsLastMonth: parseCount(newLeadsRes),
    newOpportunitiesLastMonth: parseCount(newOppsRes),
    wonOpportunitiesLastMonth: parseCount(wonOppsRes),
    openOpportunities: parseCount(openOppsRes),
  };
}

/**
 * Aggregates Incoming Leads from actual ERPNext records based on lead_date or creation date.
 * Builds a continuous timeline window (Daily: 14 days, Weekly: 8 weeks, Monthly: 6 months)
 * populated with real counts from ERPNext.
 */
export async function getIncomingLeadsChart(
  grouping: "daily" | "weekly" | "monthly" = "weekly"
): Promise<IncomingLeadsChartPoint[]> {
  const res = await erpnext.get<unknown>(
    `/api/resource/Lead?fields=["name","creation","lead_date"]&order_by=creation asc&limit_page_length=1000`
  );
  const records = parseRecords<{ name: string; creation: string; lead_date?: string }>(res);

  const now = new Date();

  const getLeadDate = (r: { creation?: string; lead_date?: string }): string => {
    if (r.lead_date) return r.lead_date;
    if (r.creation) return r.creation.split(" ")[0];
    return "";
  };

  if (grouping === "daily") {
    // Continuous 14-day window up to today
    const pointsMap = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      pointsMap.set(key, 0);
    }

    for (const r of records) {
      const key = getLeadDate(r);
      if (key && pointsMap.has(key)) {
        pointsMap.set(key, (pointsMap.get(key) ?? 0) + 1);
      }
    }

    return Array.from(pointsMap.entries()).map(([date, leads]) => ({
      date: date.slice(5), // MM-DD for clean axis display
      leads,
    }));
  }

  if (grouping === "monthly") {
    // Last 6 months window
    const pointsMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      pointsMap.set(key, 0);
    }

    for (const r of records) {
      const dateStr = getLeadDate(r);
      if (!dateStr) continue;
      const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (pointsMap.has(key)) {
        pointsMap.set(key, (pointsMap.get(key) ?? 0) + 1);
      }
    }

    return Array.from(pointsMap.entries()).map(([date, leads]) => ({
      date,
      leads,
    }));
  }

  // Weekly: 8 continuous week intervals
  const weekBuckets: Array<{ label: string; start: number; end: number; leads: number }> = [];
  const currentWeekStart = new Date(now);
  const day = currentWeekStart.getDay();
  currentWeekStart.setDate(currentWeekStart.getDate() - (day === 0 ? 6 : day - 1));
  currentWeekStart.setHours(0, 0, 0, 0);

  for (let i = 7; i >= 0; i--) {
    const wStart = new Date(currentWeekStart);
    wStart.setDate(wStart.getDate() - i * 7);
    const wEnd = new Date(wStart);
    wEnd.setDate(wEnd.getDate() + 7);

    const mName = wStart.toLocaleString("default", { month: "short" });
    const label = `${mName} ${wStart.getDate()}`;

    weekBuckets.push({
      label,
      start: wStart.getTime(),
      end: wEnd.getTime(),
      leads: 0,
    });
  }

  for (const r of records) {
    const dateStr = getLeadDate(r);
    if (!dateStr) continue;
    const t = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`).getTime();
    for (const b of weekBuckets) {
      if (t >= b.start && t < b.end) {
        b.leads += 1;
        break;
      }
    }
  }

  return weekBuckets.map((b) => ({ date: b.label, leads: b.leads }));
}

/**
 * Fetch Won Opportunities trend over the last 6 months with real amounts.
 * Uses official ERPNext transaction_date or modified/creation date.
 */
export async function getWonOpportunitiesChart(): Promise<WonOpportunityChartPoint[]> {
  const res = await erpnext.get<unknown>(
    `/api/resource/Opportunity?filters=${encodeURIComponent(
      JSON.stringify([["status", "=", "Converted"]])
    )}&fields=["name","modified","creation","opportunity_amount","transaction_date"]&order_by=modified asc&limit_page_length=500`
  );
  const records = parseRecords<{
    name: string;
    modified?: string;
    creation?: string;
    opportunity_amount?: number;
    transaction_date?: string;
  }>(res);

  const pointsMap = new Map<string, { count: number; value: number }>();
  const now = new Date();

  // Seed last 6 months
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    pointsMap.set(key, { count: 0, value: 0 });
  }

  for (const item of records) {
    const dateStr = item.transaction_date || item.modified || item.creation;
    if (!dateStr) continue;
    const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    const current = pointsMap.get(key) ?? { count: 0, value: 0 };
    current.count += 1;
    current.value += Number(item.opportunity_amount || 0);
    pointsMap.set(key, current);
  }

  return Array.from(pointsMap.entries()).map(([month, data]) => ({
    month,
    count: data.count,
    value: data.value,
  }));
}

/**
 * Pipeline Stage Distribution with real ERPNext stages and active opportunities.
 */
export async function getPipelineStageDistribution(): Promise<PipelineStageSummary[]> {
  const [stages, oppsRes] = await Promise.all([
    getSalesStages(),
    erpnext.get<unknown>(
      '/api/resource/Opportunity?fields=["name","title","party_name","sales_stage","status","opportunity_amount","currency","expected_closing","probability","modified","transaction_date"]&limit_page_length=500'
    ),
  ]);

  const allOpps = parseRecords<Opportunity>(oppsRes);

  const summary: PipelineStageSummary[] = stages.map((s: SalesStage) => {
    const normS = normalizeStageName(s.stage_name || s.name);
    const stageOpps = allOpps.filter(
      (o) => normalizeStageName(o.sales_stage) === normS
    );
    const totalValue = stageOpps.reduce((sum, o) => sum + (Number(o.opportunity_amount) || 0), 0);
    return {
      stage: s.stage_name || s.name,
      count: stageOpps.length,
      totalValue,
      opportunities: stageOpps,
    };
  });

  return summary;
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified CRM Command Center Metrics
// ─────────────────────────────────────────────────────────────────────────────

export interface ComplaintsOverviewMetrics {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  overdue: number;
  byCategory: { name: string; count: number }[];
  byPriority: { name: string; count: number }[];
}

export interface DeliveryOverviewMetrics {
  totalOrders: number;
  pendingDeliveries: number;
  partialDeliveries: number;
  deliveredOrders: number;
  delayedDeliveries: number;
  totalOrderValue: number;
  fulfillmentRate: number;
}

export interface CustomerOverviewMetrics {
  totalCustomers: number;
  newCustomersLastMonth: number;
  totalPipelineValue: number;
  topCustomersByPipeline: { name: string; customer_name: string; value: number }[];
}

export async function getComplaintsDashboardMetrics(): Promise<ComplaintsOverviewMetrics> {
  const res = await erpnext.get<unknown>(
    '/api/resource/Issue?fields=["name","status","priority","issue_type","opening_date","creation"]&limit_page_length=500'
  );
  const records = parseRecords<{
    name: string;
    status: string;
    priority?: string;
    issue_type?: string;
    opening_date?: string;
    creation?: string;
  }>(res);

  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  let closed = 0;
  let overdue = 0;
  const catMap: Record<string, number> = {};
  const prioMap: Record<string, number> = {};

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const c of records) {
    if (c.status === "Open") {
      open++;
      // Check overdue if open > 7 days
      const createdDate = c.opening_date ? new Date(c.opening_date) : c.creation ? new Date(c.creation) : null;
      if (createdDate && createdDate < sevenDaysAgo) overdue++;
    } else if (c.status === "Replied" || c.status === "On Hold") {
      inProgress++;
    } else if (c.status === "Resolved") {
      resolved++;
    } else if (c.status === "Closed") {
      closed++;
    }

    const cat = c.issue_type || "Uncategorized";
    catMap[cat] = (catMap[cat] || 0) + 1;

    const prio = c.priority || "Medium";
    prioMap[prio] = (prioMap[prio] || 0) + 1;
  }

  const byCategory = Object.entries(catMap).map(([name, count]) => ({ name, count }));
  const byPriority = Object.entries(prioMap).map(([name, count]) => ({ name, count }));

  return {
    total: records.length,
    open,
    inProgress,
    resolved,
    closed,
    overdue,
    byCategory,
    byPriority,
  };
}

export async function getDeliveryDashboardMetrics(): Promise<DeliveryOverviewMetrics> {
  const soRes = await erpnext.get<unknown>(
    '/api/resource/Sales%20Order?fields=["name","status","delivery_status","per_delivered","grand_total","delivery_date"]&limit_page_length=500'
  );

  const orders = parseRecords<{
    name: string;
    status: string;
    delivery_status?: string;
    per_delivered?: number;
    grand_total?: number;
    delivery_date?: string;
  }>(soRes);

  let pending = 0;
  let partial = 0;
  let delivered = 0;
  let delayed = 0;
  let totalOrderValue = 0;
  const now = new Date();

  for (const o of orders) {
    totalOrderValue += Number(o.grand_total) || 0;
    const per = Number(o.per_delivered) || 0;

    if (o.delivery_status === "Fully Delivered" || per >= 100) {
      delivered++;
    } else if (per > 0 || o.delivery_status === "Partially Delivered") {
      partial++;
    } else {
      pending++;
    }

    if (per < 100 && o.delivery_date && new Date(o.delivery_date) < now) {
      delayed++;
    }
  }

  const fulfillmentRate = orders.length > 0 ? Math.round((delivered / orders.length) * 100) : 0;

  return {
    totalOrders: orders.length,
    pendingDeliveries: pending,
    partialDeliveries: partial,
    deliveredOrders: delivered,
    delayedDeliveries: delayed,
    totalOrderValue,
    fulfillmentRate,
  };
}

export async function getCustomerDashboardMetrics(): Promise<CustomerOverviewMetrics> {
  const oneMonthAgo = getOneMonthAgoDate();

  const [custRes, newCustRes, oppsRes] = await Promise.all([
    erpnext.get<unknown>(
      '/api/resource/Customer?fields=["name","customer_name","customer_group","territory"]&limit_page_length=500'
    ),
    erpnext.get<unknown>(
      `/api/method/frappe.client.get_count?doctype=Customer&filters=${encodeURIComponent(
        JSON.stringify([["creation", ">=", oneMonthAgo]])
      )}`
    ).catch(() => 0),
    erpnext.get<unknown>(
      '/api/resource/Opportunity?fields=["name","party_name","opportunity_amount"]&limit_page_length=500'
    ),
  ]);

  const customers = parseRecords<{ name: string; customer_name?: string }>(custRes);
  const opps = parseRecords<{ name: string; party_name?: string; opportunity_amount?: number }>(oppsRes);

  const custPipelineMap: Record<string, { customer_name: string; value: number }> = {};
  let totalPipelineValue = 0;

  for (const o of opps) {
    const amt = Number(o.opportunity_amount) || 0;
    totalPipelineValue += amt;
    if (o.party_name) {
      if (!custPipelineMap[o.party_name]) {
        custPipelineMap[o.party_name] = { customer_name: o.party_name, value: 0 };
      }
      custPipelineMap[o.party_name].value += amt;
    }
  }

  const topCustomersByPipeline = Object.entries(custPipelineMap)
    .map(([name, data]) => ({ name, customer_name: data.customer_name, value: data.value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return {
    totalCustomers: customers.length,
    newCustomersLastMonth: parseCount(newCustRes),
    totalPipelineValue,
    topCustomersByPipeline,
  };
}
