import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Filter, RefreshCw, ExternalLink, Trash2, Edit } from "lucide-react";
import toast from "react-hot-toast";
import { getCustomers, deleteCustomer, getCustomerGroups, getTerritories } from "../../api/crm";
import type { Customer } from "../../types/crm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DocTypeModal from "../../components/crm/DocTypeModal";

export default function CustomersListPage() {
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [territoryFilter, setTerritoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  // Create modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const { data: customerGroups = [] } = useQuery({
    queryKey: ["crm-customer-groups"],
    queryFn: getCustomerGroups,
    staleTime: 5 * 60_000,
  });

  const { data: territories = [] } = useQuery({
    queryKey: ["crm-territories"],
    queryFn: getTerritories,
    staleTime: 5 * 60_000,
  });

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-customers", search, groupFilter, territoryFilter, page],
    queryFn: () =>
      getCustomers({
        search,
        customer_group: groupFilter || undefined,
        territory: territoryFilter || undefined,
        limit_start: page * pageSize,
        limit_page_length: pageSize,
      }),
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget.name);
      toast.success(`Customer "${deleteTarget.customer_name || deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete customer.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Customers
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Client directory and accounts synchronized with ERPNext ({total} total)
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

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </button>
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
            placeholder="Search customers by name…"
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-neutral-400" />
          <select
            value={groupFilter}
            onChange={(e) => {
              setGroupFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Customer Groups</option>
            {customerGroups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>

          <select
            value={territoryFilter}
            onChange={(e) => {
              setTerritoryFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-neutral-200 bg-neutral-50/50 py-2 px-3 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
          >
            <option value="">All Territories</option>
            {territories.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
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
                <th className="py-3 px-4 font-semibold">Customer Name</th>
                <th className="py-3 px-4 font-semibold">Group</th>
                <th className="py-3 px-4 font-semibold">Territory</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Contact Email</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-6 w-full animate-pulse rounded bg-neutral-100" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-neutral-400">
                    No customers found. Click "Add Customer" to create an account.
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.name} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/crm/customers/${encodeURIComponent(cust.name)}`}
                        className="font-semibold text-neutral-900 hover:text-primary-600"
                      >
                        {cust.customer_name || cust.name}
                      </Link>
                      <div className="text-[11px] text-neutral-400">{cust.name}</div>
                    </td>

                    <td className="py-3 px-4 text-neutral-700">
                      {cust.customer_group ? (
                        <span className="font-medium text-neutral-800">{cust.customer_group}</span>
                      ) : (
                        <span className="text-neutral-400 italic">Not provided</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-neutral-700">
                      {cust.territory ? (
                        <span className="font-medium text-neutral-800">{cust.territory}</span>
                      ) : (
                        <span className="text-neutral-400 italic">Not provided</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                        {cust.customer_type || "Company"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-neutral-600">
                      {cust.email_id ? (
                        <div>
                          <div className="font-medium text-neutral-800">{cust.email_id}</div>
                          {cust.mobile_no && (
                            <div className="text-[11px] text-neutral-400">{cust.mobile_no}</div>
                          )}
                        </div>
                      ) : cust.mobile_no ? (
                        <div className="text-neutral-700">{cust.mobile_no}</div>
                      ) : (
                        <span className="text-neutral-400 italic">Not provided</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditTarget(cust)}
                          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                          title="Edit Customer"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        <Link
                          to={`/crm/customers/${encodeURIComponent(cust.name)}`}
                          className="rounded p-1 text-neutral-400 hover:text-neutral-700"
                          title="View Details"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(cust)}
                          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete Customer"
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-3 text-xs text-neutral-600">
            <span>
              Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, total)} of {total} customers
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

      {/* Create Customer Modal */}
      <DocTypeModal
        doctype="Customer"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        title="New Customer"
        subtitle="Create an official ERPNext Customer record with full DocType schema support"
      />

      {/* Edit Customer Modal */}
      <DocTypeModal
        doctype="Customer"
        recordName={editTarget?.name}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={editTarget as unknown as Record<string, unknown>}
        title={`Edit Customer: ${editTarget?.customer_name || editTarget?.name}`}
        subtitle="Update customer details in ERPNext backed by live DocType schema"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Customer"
        description={`Are you sure you want to permanently delete customer "${deleteTarget?.customer_name || deleteTarget?.name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
