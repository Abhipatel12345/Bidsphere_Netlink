import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileBarChart,
  RefreshCw,
  Download,
  AlertCircle,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  runCrmReport,
  AVAILABLE_CRM_REPORTS,
  getDefaultReportDateRange,
} from "../../api/crmReports";
import { getStageOrderIndex } from "../../api/crm";
import type { CrmReportResponse } from "../../types/crm";

export default function CrmReportsPage() {
  const defaultDates = getDefaultReportDateRange();
  const [selectedReportId, setSelectedReportId] = useState(AVAILABLE_CRM_REPORTS[0].id);
  const [fromDate, setFromDate] = useState(defaultDates.from_date);
  const [toDate, setToDate] = useState(defaultDates.to_date);

  const [selectedCategory, setSelectedCategory] = useState<"All" | "Sales" | "Complaints" | "Deliveries">("All");

  const filteredReports = useMemo(() => {
    if (selectedCategory === "All") return AVAILABLE_CRM_REPORTS;
    return AVAILABLE_CRM_REPORTS.filter((r) => r.category === selectedCategory);
  }, [selectedCategory]);

  const currentMeta =
    AVAILABLE_CRM_REPORTS.find((r) => r.id === selectedReportId) || AVAILABLE_CRM_REPORTS[0];

  // Validate dates
  const dateError = (() => {
    if (!fromDate && !toDate) return "From Date and To Date are required.";
    if (!fromDate) return "From Date is required.";
    if (!toDate) return "To Date is required.";
    if (fromDate > toDate) return "From Date cannot be later than To Date.";
    return null;
  })();

  const {
    data: reportData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery<CrmReportResponse>({
    queryKey: ["crm-report-run", selectedReportId, fromDate, toDate],
    queryFn: () => {
      if (dateError) {
        throw new Error(dateError);
      }
      return runCrmReport(selectedReportId, {
        from_date: fromDate,
        to_date: toDate,
      });
    },
    enabled: !dateError,
    staleTime: 60_000,
  });

  const columns = reportData?.columns ?? [];
  const rawRows = reportData?.result ?? [];
  const rows = useMemo(() => {
    const stageField = columns.find(
      (c) =>
        c.fieldname === "sales_stage" ||
        c.fieldname === "stage" ||
        c.fieldname.includes("stage") ||
        c.label.toLowerCase().includes("stage")
    )?.fieldname;

    if (!stageField) return rawRows;

    return [...rawRows].sort((a, b) => {
      const stageA = String(a[stageField] || "");
      const stageB = String(b[stageField] || "");
      const idxA = getStageOrderIndex(stageA);
      const idxB = getStageOrderIndex(stageB);
      if (idxA !== idxB) return idxA - idxB;
      return 0;
    });
  }, [rawRows, columns]);

  // Quick Date Presets
  const handlePreset = (type: "this_month" | "last_3_months" | "year_to_date") => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const today = `${year}-${month}-${day}`;

    if (type === "this_month") {
      setFromDate(`${year}-${month}-01`);
      setToDate(today);
    } else if (type === "last_3_months") {
      const d = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, "0");
      setFromDate(`${d.getFullYear()}-${mStr}-01`);
      setToDate(today);
    } else if (type === "year_to_date") {
      setFromDate(`${year}-01-01`);
      setToDate(today);
    }
  };

  const handleRunRefresh = () => {
    if (dateError) {
      toast.error(dateError);
      return;
    }
    void refetch();
  };

  const handleExportCSV = () => {
    if (dateError) {
      toast.error(dateError);
      return;
    }
    if (columns.length === 0 || rows.length === 0) {
      toast.error("No data to export.");
      return;
    }

    const headers = columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
    const csvRows = rows.map((row) =>
      columns
        .map((c) => {
          const val = row[c.fieldname] ?? "";
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const blob = new Blob([`${headers}\n${csvRows.join("\n")}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReportId.toLowerCase().replace(/\s+/g, "_")}_${fromDate}_to_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded as CSV.");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            CRM Reports & Analytics
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Execute official ERPNext script reports with real-time database results
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRunRefresh}
            disabled={isRefetching || Boolean(dateError)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Run / Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={rows.length === 0 || Boolean(dateError)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Selector & Filters Bar */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Select Report
              </label>
              <div className="flex items-center gap-1">
                {(["All", "Sales", "Complaints", "Deliveries"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      const matching = cat === "All" ? AVAILABLE_CRM_REPORTS : AVAILABLE_CRM_REPORTS.filter((r) => r.category === cat);
                      if (matching.length > 0 && !matching.some((m) => m.id === selectedReportId)) {
                        setSelectedReportId(matching[0].id);
                      }
                    }}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
                      selectedCategory === cat
                        ? "bg-primary-600 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white py-2 px-3 text-xs font-semibold text-neutral-800 shadow-sm focus:border-primary-500 focus:outline-none"
            >
              {filteredReports.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  [{rep.category}] {rep.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-neutral-400">
              {currentMeta.description}
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-neutral-600">
                  From Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className={`mt-1 w-full rounded-lg border py-1.5 px-3 text-xs text-neutral-800 focus:bg-white focus:outline-none ${
                    !fromDate || fromDate > toDate
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                />
              </div>

              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-neutral-600">
                  To Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className={`mt-1 w-full rounded-lg border py-1.5 px-3 text-xs text-neutral-800 focus:bg-white focus:outline-none ${
                    !toDate || fromDate > toDate
                      ? "border-amber-300 bg-amber-50/40"
                      : "border-neutral-200 bg-neutral-50"
                  }`}
                />
              </div>

              <div className="flex items-center gap-1.5 pb-0.5">
                <button
                  type="button"
                  onClick={() => handlePreset("this_month")}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("last_3_months")}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  Last 3 Months
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset("year_to_date")}
                  className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
                >
                  YTD
                </button>
              </div>
            </div>

            {/* Inline validation error display */}
            {dateError && (
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{dateError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Data Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-primary-600" />
            <h3 className="text-xs font-bold text-neutral-800">
              {currentMeta.name} — Results ({rows.length} records)
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-500">
            <Calendar className="h-3.5 w-3.5 text-neutral-400" />
            <span>
              {fromDate} → {toDate}
            </span>
            <span>•</span>
            <span>ERPNext • {currentMeta.ref_doctype}</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-neutral-100/95 backdrop-blur-sm shadow-sm">
              <tr className="border-b border-neutral-200 text-neutral-600 font-semibold">
                {columns.map((col, idx) => (
                  <th key={idx} className="py-2.5 px-4 whitespace-nowrap">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={Math.max(columns.length, 1)} className="py-4 px-4">
                      <div className="h-5 w-full animate-pulse rounded bg-neutral-100" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="py-12 px-4 text-center text-xs"
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-amber-500" />
                      <p className="font-semibold text-neutral-800">
                        Unable to generate {currentMeta.name}
                      </p>
                      <p className="text-neutral-500 text-xs">
                        {error instanceof Error
                          ? error.message
                          : "ERPNext reported an issue while executing this report. Please check the selected date range and try again."}
                      </p>
                      <button
                        type="button"
                        onClick={handleRunRefresh}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry Report
                      </button>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(columns.length, 1)}
                    className="py-16 text-center text-xs text-neutral-400"
                  >
                    No records returned by ERPNext for the selected date range ({fromDate} to {toDate}).
                  </td>
                </tr>
              ) : (
                rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-neutral-50/70 transition-colors">
                    {columns.map((col, colIdx) => {
                      const val = row[col.fieldname];
                      return (
                        <td key={colIdx} className="py-2.5 px-4 whitespace-nowrap text-neutral-800">
                          {val !== null && val !== undefined ? String(val) : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
