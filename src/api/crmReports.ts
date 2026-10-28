import { erpnext } from "./erpnext";
import type { CrmReportColumn, CrmReportResponse } from "../types/crm";

export interface AvailableReportMeta {
  id: string;
  name: string;
  description: string;
  ref_doctype: "Lead" | "Opportunity" | "Communication" | "Customer";
}

export const AVAILABLE_CRM_REPORTS: AvailableReportMeta[] = [
  {
    id: "Lead Details",
    name: "Lead Details",
    description: "Detailed report of leads, contact info, statuses, sources, and owners.",
    ref_doctype: "Lead",
  },
  {
    id: "Sales Pipeline Analytics",
    name: "Sales Pipeline Analytics",
    description: "Analysis of opportunities across sales stages and closing timelines.",
    ref_doctype: "Opportunity",
  },
  {
    id: "Opportunity Summary by Sales Stage",
    name: "Opportunity Summary by Sales Stage",
    description: "Summary aggregation of deal counts and values grouped by stage.",
    ref_doctype: "Opportunity",
  },
  {
    id: "Campaign Efficiency",
    name: "Campaign Efficiency",
    description: "Effectiveness of marketing campaigns in generating qualified leads.",
    ref_doctype: "Lead",
  },
  {
    id: "Lead Owner Efficiency",
    name: "Lead Owner Efficiency",
    description: "Lead assignment and conversion turnaround per sales representative.",
    ref_doctype: "Lead",
  },
  {
    id: "Lost Opportunity",
    name: "Lost Opportunity Analysis",
    description: "Insights into closed-lost opportunities, reasons, and competitors.",
    ref_doctype: "Opportunity",
  },
  {
    id: "First Response Time for Opportunity",
    name: "First Response Time",
    description: "Duration between opportunity creation and initial customer touchpoint.",
    ref_doctype: "Opportunity",
  },
  {
    id: "Prospects Engaged But Not Converted",
    name: "Engaged Prospects Pending Conversion",
    description: "High-potential prospects with active communications awaiting next steps.",
    ref_doctype: "Lead",
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
    const errorMsg = extractFrappeErrorMessage(err);
    throw new Error(errorMsg);
  }
}
