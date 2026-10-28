import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, Calendar, RefreshCw, TrendingUp } from "lucide-react";
import type { IncomingLeadsChartPoint, WonOpportunityChartPoint } from "../../types/crm";

interface Props {
  incomingLeads: IncomingLeadsChartPoint[];
  wonOpportunities: WonOpportunityChartPoint[];
  grouping: "daily" | "weekly" | "monthly";
  onGroupingChange: (g: "daily" | "weekly" | "monthly") => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export default function CrmCharts({
  incomingLeads,
  wonOpportunities,
  grouping,
  onGroupingChange,
  isLoading = false,
  isError = false,
  onRetry,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Main Chart (2 cols) */}
      <div className="flex flex-col rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Incoming Leads Trend
            </h3>
            <p className="text-xs text-neutral-500">
              Actual prospect flow over time from ERPNext
            </p>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-1 text-xs">
            {(["daily", "weekly", "monthly"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onGroupingChange(mode)}
                className={`rounded px-2.5 py-1 font-medium capitalize transition-colors ${
                  grouping === mode
                    ? "bg-white text-primary-700 shadow-sm"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 h-[300px] w-full">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center text-amber-700">
              <AlertCircle className="h-8 w-8 stroke-1 text-amber-500" />
              <p className="mt-2 text-xs font-semibold">Failed to load leads trend from ERPNext</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-1 rounded bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              )}
            </div>
          ) : incomingLeads.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-neutral-400">
              <Calendar className="h-8 w-8 stroke-1 text-neutral-300" />
              <p className="mt-2 text-xs">No lead activity found for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomingLeads} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d4e96" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0d4e96" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#93c5fd" }}
                  formatter={(val) => [`${val} Leads`, "Volume"]}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="#0d4e96"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#leadsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Won Opportunities Chart (1 col) */}
      <div className="flex flex-col rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <div className="border-b border-neutral-100 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-neutral-900">
              Won Deals (Monthly)
            </h3>
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-3.5 w-3.5" /> Converted
            </span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            Conversion revenue by month
          </p>
        </div>

        <div className="mt-6 h-[300px] w-full">
          {isLoading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : isError ? (
            <div className="flex h-full flex-col items-center justify-center text-amber-700">
              <AlertCircle className="h-8 w-8 stroke-1 text-amber-500" />
              <p className="mt-2 text-xs font-semibold">Failed to load won deals from ERPNext</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-3 inline-flex items-center gap-1 rounded bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              )}
            </div>
          ) : wonOpportunities.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-neutral-400">
              <TrendingUp className="h-8 w-8 stroke-1 text-neutral-300" />
              <p className="mt-2 text-xs">No converted deals recorded yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={wonOpportunities} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "none",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#34d399" }}
                  formatter={(val, name) => [
                    name === "value" ? `$${Number(val).toLocaleString()}` : `${val} deals`,
                    name === "value" ? "Total Value" : "Won Deals",
                  ]}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
