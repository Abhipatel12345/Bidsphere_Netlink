import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import { getLeads, deleteLead, getUTMSources } from "../../api/crm";
import type { Lead, LeadStatus } from "../../types/crm";
import LeadConversionModal from "../../components/crm/LeadConversionModal";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  Lead: "bg-neutral-100 text-neutral-800",
  Open: "bg-blue-50 text-blue-700 border-blue-200",
  Replied: "bg-amber-50 text-amber-700 border-amber-200",
  Opportunity: "bg-purple-50 text-purple-700 border-purple-200",
  Quotation: "bg-indigo-50 text-indigo-700 border-indigo-200",
  "Lost Quotation": "bg-red-50 text-red-700 border-red-200",
  Interested: "bg-teal-50 text-teal-700 border-teal-200",
  Converted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Do Not Contact": "bg-rose-50 text-rose-700 border-rose-200",
};

export default function LeadsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Selected for conversion
  const [convertLead, setConvertLead] = useState<Lead | null>(null);

  // Selected for delete
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const { data: utmSources = [] } = useQuery({
    queryKey: ["crm-utm-sources"],
    queryFn: getUTMSources,
    staleTime: 5 * 60_000,
  });

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-leads", search, statusFilter, sourceFilter, page],
    queryFn: () =>
      getLeads({
        search,
        status: statusFilter || undefined,
        utm_source: sourceFilter || undefined,
        limit_start: page * pageSize,
        limit_page_length: pageSize,
      }),
  });

  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteLead(deleteTarget.name);
      toast.success(`Lead "${deleteTarget.lead_name || deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete lead.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Leads
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Manage incoming prospects and track qualification pipelines in ERPNext ({total} total)
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
            to="/crm/leads/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Lead
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
            placeholder="Search leads by name, company, email…"
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
            <option value="Lead">Lead</option>
            <option value="Open">Open</option>
            <option value="Replied">Replied</option>
            <option value="Opportunity">Opportunity</option>
            <option value="Quotation">Quotation</option>
            <option value="Interested">Interested</option>
            <option value="Converted">Converted</option>
            <option value="Do Not Contact">Do Not Contact</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Sources</option>
            {utmSources.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
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
                <th className="py-3 px-4 font-semibold">Lead Name</th>
                <th className="py-3 px-4 font-semibold">Company / Org</th>
                <th className="py-3 px-4 font-semibold">Contact Info</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Source</th>
                <th className="py-3 px-4 font-semibold">Territory</th>
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
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    No leads found matching current criteria.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.name} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/crm/leads/${encodeURIComponent(lead.name)}`}
                        className="font-semibold text-neutral-900 hover:text-primary-600"
                      >
                        {lead.lead_name || lead.name}
                      </Link>
                      <div className="text-[11px] text-neutral-400">{lead.name}</div>
                    </td>

                    <td className="py-3 px-4 text-neutral-700">
                      {lead.company_name || "—"}
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-neutral-900">{lead.email_id || "—"}</div>
                      <div className="text-[11px] text-neutral-400">{lead.mobile_no || lead.phone || ""}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                          LEAD_STATUS_COLORS[lead.status] || "bg-neutral-100 text-neutral-700"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-neutral-600">
                      {lead.utm_source || "—"}
                    </td>

                    <td className="py-3 px-4 text-neutral-600">
                      {lead.territory || "—"}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.status !== "Converted" && (
                          <button
                            type="button"
                            onClick={() => setConvertLead(lead)}
                            title="Convert to Opportunity or Customer"
                            className="inline-flex items-center gap-1 rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50"
                          >
                            <TrendingUp className="h-3.5 w-3.5 text-primary-600" />
                            Convert
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(lead)}
                          title="Delete Lead"
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

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-xs text-neutral-600">
            <span>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} leads
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

      {/* Convert Modal */}
      {convertLead && (
        <LeadConversionModal
          lead={convertLead}
          isOpen={true}
          onClose={() => setConvertLead(null)}
          onConverted={(type, recordName) => {
            void refetch();
            if (type === "opportunity") {
              navigate(`/crm/opportunities/${encodeURIComponent(recordName)}`);
            } else {
              navigate(`/crm/customers/${encodeURIComponent(recordName)}`);
            }
          }}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Lead"
        description={`Are you sure you want to permanently delete lead "${deleteTarget?.lead_name || deleteTarget?.name}" from ERPNext? This action cannot be undone.`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
