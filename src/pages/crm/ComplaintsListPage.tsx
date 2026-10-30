import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { getComplaints, getComplaintMetrics, getIssueTypes } from "../../api/crm";
import { exportReportToCsv } from "../../api/crmReports";
import ComplaintModal from "../../components/crm/ComplaintModal";
import type { ComplaintDoc } from "../../types/crm";

export default function ComplaintsListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDoc | undefined>();

  const {
    data: complaintsData = { complaints: [], total: 0 },
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "crm-complaints-list",
      search,
      statusFilter,
      priorityFilter,
      categoryFilter,
    ],
    queryFn: () =>
      getComplaints({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        issue_type: categoryFilter || undefined,
        limit_page_length: 100,
      }),
  });

  const { data: metrics } = useQuery({
    queryKey: ["crm-complaints-metrics"],
    queryFn: getComplaintMetrics,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["crm-issue-types"],
    queryFn: getIssueTypes,
  });

  const complaints = complaintsData.complaints;

  const handleExportCsv = () => {
    const columns = [
      { label: "Complaint ID", fieldname: "name" },
      { label: "Customer", fieldname: "customer" },
      { label: "Subject", fieldname: "subject" },
      { label: "Category", fieldname: "issue_type" },
      { label: "Priority", fieldname: "priority" },
      { label: "Status", fieldname: "status" },
      { label: "Date Opened", fieldname: "opening_date" },
      { label: "Resolution Details", fieldname: "resolution_details" },
    ];
    exportReportToCsv(columns, complaints as unknown as Record<string, unknown>[], "customer_complaints.csv");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Customer Complaints Management
            </h1>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              Live ERPNext Issues
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Centralized post-sales tracking, issue investigation, and resolution workflow for Massy Distribution.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedComplaint(undefined);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            Register Complaint
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
            <span>Total Logged</span>
            <AlertTriangle className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900">
            {metrics?.total ?? complaintsData.total}
          </div>
          <span className="text-[11px] text-neutral-400">All registered cases</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Open (New)</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">
            {metrics?.open ?? complaints.filter((c) => c.status === "Open").length}
          </div>
          <span className="text-[11px] text-amber-700">Awaiting investigation</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
            <span>In Progress</span>
            <ArrowUpDown className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">
            {metrics?.inProgress ?? complaints.filter((c) => c.status === "Replied" || c.status === "On Hold").length}
          </div>
          <span className="text-[11px] text-blue-700">Under review / On hold</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">
            {metrics?.resolved ?? complaints.filter((c) => c.status === "Resolved").length}
          </div>
          <span className="text-[11px] text-emerald-700">Corrective action taken</span>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-red-800">
            <span>Closed Cases</span>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-900">
            {metrics?.closed ?? complaints.filter((c) => c.status === "Closed").length}
          </div>
          <span className="text-[11px] text-red-700">Customer acknowledged</span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search complaint ID, subject, customer..."
            className="w-full rounded-lg border border-neutral-200 py-1.5 pl-9 pr-3 text-xs text-neutral-800 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Replied">Replied</option>
            <option value="On Hold">On Hold</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(search || statusFilter || priorityFilter || categoryFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setPriorityFilter("");
                setCategoryFilter("");
              }}
              className="text-xs font-semibold text-primary-600 hover:text-primary-800"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Complaints Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="space-y-3 p-6">
            <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-32 w-full animate-pulse rounded bg-neutral-100" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-red-50/50">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500" />
            <p className="mt-2 text-sm font-bold text-red-900">Failed to Load Complaints Data</p>
            <p className="mt-1 text-xs text-red-700 max-w-md mx-auto">
              {error instanceof Error ? error.message : "Unable to retrieve issues from ERPNext."}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-sm"
            >
              Retry Connection
            </button>
          </div>
        ) : complaints.length === 0 ? (
          <div className="py-16 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm font-semibold text-neutral-700">No customer complaints found</p>
            <p className="text-xs text-neutral-400">
              {search || statusFilter || priorityFilter || categoryFilter
                ? "Try adjusting your search filters."
                : "No complaints have been registered yet in ERPNext."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 font-semibold uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Opened Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {complaints.map((c) => (
                  <tr key={c.name} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900">
                      {c.name}
                    </td>

                    <td className="py-3 px-4 font-semibold text-neutral-900">
                      {c.customer ? (
                        <Link
                          to={`/crm/customers/${encodeURIComponent(c.customer)}`}
                          className="hover:text-primary-600 flex items-center gap-1"
                        >
                          {c.customer_name || c.customer}
                          <ExternalLink className="h-3 w-3 text-neutral-400" />
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="max-w-[280px] font-medium text-neutral-900">
                        {c.subject}
                      </div>
                      {c.description && (
                        <div className="max-w-[280px] truncate text-[11px] text-neutral-500">
                          {c.description}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-neutral-700">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-800">
                        {c.issue_type || "General"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.priority === "Urgent"
                            ? "bg-red-100 text-red-800"
                            : c.priority === "High"
                            ? "bg-amber-100 text-amber-800"
                            : c.priority === "Medium"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {c.priority || "Medium"}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          c.status === "Open"
                            ? "bg-amber-100 text-amber-800"
                            : c.status === "Resolved"
                            ? "bg-emerald-100 text-emerald-800"
                            : c.status === "Closed"
                            ? "bg-neutral-100 text-neutral-700"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-neutral-500 whitespace-nowrap">
                      {c.opening_date || c.creation?.split(" ")[0] || "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setIsModalOpen(true);
                        }}
                        className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Complaint Modal */}
      <ComplaintModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={selectedComplaint}
        title={selectedComplaint ? `Manage Complaint: ${selectedComplaint.name}` : "Register Customer Complaint"}
      />
    </div>
  );
}
