import { erpnext } from "./erpnext";
import type { CrmReportColumn, CrmReportResponse } from "../types/crm";

export interface AvailableReportMeta {
  id: string;
  name: string;
  category: "Sales" | "Complaints" | "Deliveries";
  description: string;
  ref_doctype: "Lead" | "Opportunity" | "Communication" | "Customer" | "Issue" | "Sales Order" | "Delivery Note";
  isDirectDocType?: boolean;
}

export const AVAILABLE_CRM_REPORTS: AvailableReportMeta[] = [
  // Sales Reports
  {
    id: "Lead Details",
    name: "Lead Details Report",
    category: "Sales",
    description: "Detailed report of leads, contact info, statuses, sources, and owners.",
    ref_doctype: "Lead",
  },
  {
    id: "Sales Pipeline Analytics",
    name: "Sales Pipeline Analytics",
    category: "Sales",
    description: "Analysis of opportunities across sales stages and closing timelines.",
    ref_doctype: "Opportunity",
  },
  {
    id: "Opportunity Summary by Sales Stage",
    name: "Opportunity Summary by Sales Stage",
    category: "Sales",
    description: "Summary aggregation of deal counts and values grouped by stage.",
    ref_doctype: "Opportunity",
  },
  {
    id: "Campaign Efficiency",
    name: "Campaign Efficiency",
    category: "Sales",
    description: "Effectiveness of marketing campaigns in generating qualified leads.",
    ref_doctype: "Lead",
  },
  {
    id: "Lost Opportunity",
    name: "Lost Opportunity Analysis",
    category: "Sales",
    description: "Insights into closed-lost opportunities, reasons, and competitors.",
    ref_doctype: "Opportunity",
  },

  // Complaints Reports
  {
    id: "Customer Complaints Summary",
    name: "Complaints Master Summary",
    category: "Complaints",
    description: "Complete register of customer complaints, priority, categories, and resolution progress.",
    ref_doctype: "Issue",
    isDirectDocType: true,
  },
  {
    id: "Complaints by Category & Priority",
    name: "Complaints by Category & SLA",
    category: "Complaints",
    description: "Categorization breakdown of open versus resolved customer tickets.",
    ref_doctype: "Issue",
    isDirectDocType: true,
  },

  // Delivery Reports
  {
    id: "Order-to-Delivery Tracking",
    name: "Order-to-Delivery Lifecycle",
    category: "Deliveries",
    description: "Full visibility from Sales Order to Delivery Note, pending vs delivered quantities.",
    ref_doctype: "Sales Order",
    isDirectDocType: true,
  },
  {
    id: "Pending Delivery Backlog",
    name: "Pending & Delayed Deliveries Backlog",
    category: "Deliveries",
    description: "Orders awaiting dispatch or partial shipment fulfillment.",
    ref_doctype: "Delivery Note",
    isDirectDocType: true,
  },
];

export const REPORT_DEFAULT_FILTERS: Record<string, Record<string, unknown>> = {
  "Sales Pipeline Analytics": {
    based_on: "Number",
    range: "Monthly",
    pipeline_by: "Sales Stage",
  },
  "Opportunity Summary by Sales Stage": {
    based_on: "Opportunity Type",
    data_based_on: "Number",
  },
};

/**
 * Computes sensible default date range (From 1st of current month, To today).
 */
export function getDefaultReportDateRange(): { from_date: string; to_date: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return {
    from_date: `${year}-${month}-01`,
    to_date: `${year}-${month}-${day}`,
  };
}

/**
 * Extracts clean user-facing error message from Frappe API response or exception.
 */
export function extractFrappeErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axErr = err as any;
    const data = axErr.response?.data;
    if (data?._server_messages) {
      try {
        const msgs = JSON.parse(data._server_messages);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const first = typeof msgs[0] === "string" ? JSON.parse(msgs[0]) : msgs[0];
          if (first.message) {
            return String(first.message).replace(/<[^>]+>/g, "").trim();
          }
        }
      } catch {
        // fallback
      }
    }
    if (data?.exception) {
      const parts = String(data.exception).split(":");
      if (parts.length > 1) {
        return parts.slice(1).join(":").trim();
      }
      return String(data.exception);
    }
    if (data?.message) {
      return String(data.message);
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while executing the report.";
}

/**
 * Execute an official ERPNext CRM query report with validated filters.
 */
export async function runCrmReport(
  report_name: string,
  filters: Record<string, unknown> = {}
): Promise<CrmReportResponse> {
  const mergedFilters = {
    ...(REPORT_DEFAULT_FILTERS[report_name] ?? {}),
    ...filters,
  };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await erpnext.post<unknown>(
      "/api/method/frappe.desk.query_report.run",
      {
        report_name,
        filters: mergedFilters,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = res;
    const msg =
      raw && typeof raw === "object" && "columns" in raw
        ? raw
        : raw?.message ?? raw?.data?.message ?? {};

    const rawColumns = (msg?.columns as unknown[]) ?? [];
    const rawResult = (msg?.result as Record<string, unknown>[]) ?? [];

    // Normalize columns (Frappe sometimes returns strings "Label:FieldType:Width" or objects)
    const columns: CrmReportColumn[] = (rawColumns as Array<string | CrmReportColumn>).map((col) => {
      if (typeof col === "string") {
        const parts = col.split(":");
        return {
          label: parts[0] || "Field",
          fieldname: (parts[0] || "field").toLowerCase().replace(/\s+/g, "_"),
          fieldtype: parts[1] || "Data",
          width: parts[2] ? parseInt(parts[2], 10) : 120,
        };
      }
      return col as CrmReportColumn;
    });

    return {
      columns,
      result: rawResult,
    };
  } catch (err) {
    // If standard query_report fails or is direct, fallback to direct DocType report generator
    const meta = AVAILABLE_CRM_REPORTS.find((r) => r.id === report_name);
    if (meta?.isDirectDocType) {
      return runDirectDocReport(report_name, filters);
    }
    const errorMsg = extractFrappeErrorMessage(err);
    throw new Error(errorMsg);
  }
}

/**
 * Direct DocType Report Generator for Complaints and Delivery Tracking.
 */
export async function runDirectDocReport(
  report_name: string,
  filters: Record<string, unknown> = {}
): Promise<CrmReportResponse> {
  if (report_name === "Customer Complaints Summary" || report_name === "Complaints by Category & Priority") {
    const queryParams = new URLSearchParams({
      fields: JSON.stringify([
        "name",
        "subject",
        "customer",
        "customer_name",
        "status",
        "priority",
        "issue_type",
        "opening_date",
        "resolution_details",
        "raised_by",
        "modified",
      ]),
      order_by: "opening_date desc",
      limit_page_length: "200",
    });

    const filterList: [string, string, string, unknown][] = [];
    if (filters.status) filterList.push(["Issue", "status", "=", filters.status]);
    if (filters.customer) filterList.push(["Issue", "customer", "=", filters.customer]);
    if (filterList.length > 0) queryParams.set("filters", JSON.stringify(filterList));

    const res = await erpnext.get<unknown>(`/api/resource/Issue?${queryParams.toString()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records: any[] = Array.isArray(res) ? res : (res as any)?.data || [];

    const columns: CrmReportColumn[] = [
      { label: "Complaint ID", fieldname: "name", fieldtype: "Link", width: 140 },
      { label: "Customer", fieldname: "customer", fieldtype: "Link", width: 180 },
      { label: "Subject", fieldname: "subject", fieldtype: "Data", width: 260 },
      { label: "Category", fieldname: "issue_type", fieldtype: "Data", width: 160 },
      { label: "Priority", fieldname: "priority", fieldtype: "Data", width: 100 },
      { label: "Status", fieldname: "status", fieldtype: "Data", width: 110 },
      { label: "Date Opened", fieldname: "opening_date", fieldtype: "Date", width: 120 },
      { label: "Raised By", fieldname: "raised_by", fieldtype: "Data", width: 150 },
    ];

    return { columns, result: records };
  }

  if (report_name === "Order-to-Delivery Tracking" || report_name === "Pending Delivery Backlog") {
    const queryParams = new URLSearchParams({
      fields: JSON.stringify([
        "name",
        "customer",
        "customer_name",
        "transaction_date",
        "delivery_date",
        "status",
        "delivery_status",
        "per_delivered",
        "grand_total",
        "currency",
      ]),
      order_by: "transaction_date desc",
      limit_page_length: "200",
    });

    const filterList: [string, string, string, unknown][] = [];
    if (filters.customer) filterList.push(["Sales Order", "customer", "=", filters.customer]);
    if (report_name === "Pending Delivery Backlog") {
      filterList.push(["Sales Order", "per_delivered", "<", 100]);
    }
    if (filterList.length > 0) queryParams.set("filters", JSON.stringify(filterList));

    const res = await erpnext.get<unknown>(`/api/resource/Sales%20Order?${queryParams.toString()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records: any[] = Array.isArray(res) ? res : (res as any)?.data || [];

    const columns: CrmReportColumn[] = [
      { label: "Order ID", fieldname: "name", fieldtype: "Link", width: 150 },
      { label: "Customer", fieldname: "customer", fieldtype: "Link", width: 180 },
      { label: "Order Date", fieldname: "transaction_date", fieldtype: "Date", width: 110 },
      { label: "Expected Delivery", fieldname: "delivery_date", fieldtype: "Date", width: 130 },
      { label: "Delivery Status", fieldname: "delivery_status", fieldtype: "Data", width: 140 },
      { label: "% Delivered", fieldname: "per_delivered", fieldtype: "Percent", width: 110 },
      { label: "Grand Total", fieldname: "grand_total", fieldtype: "Currency", width: 120 },
      { label: "Order Status", fieldname: "status", fieldtype: "Data", width: 110 },
    ];

    return { columns, result: records };
  }

  return { columns: [], result: [] };
}

/**
 * Standard CSV Export Utility for CRM Reports.
 */
export function exportReportToCsv(
  columns: CrmReportColumn[],
  result: Record<string, unknown>[],
  filename = "crm_report.csv"
): void {
  if (!result || result.length === 0) return;

  const headers = columns.map((c) => `"${(c.label || c.fieldname).replace(/"/g, '""')}"`).join(",");
  const rows = result.map((row) =>
    columns
      .map((c) => {
        const val = row[c.fieldname];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
