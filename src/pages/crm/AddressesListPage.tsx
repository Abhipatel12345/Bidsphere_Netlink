import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trash2, RefreshCw, MapPin, Edit } from "lucide-react";
import toast from "react-hot-toast";
import { getAddresses, deleteAddress } from "../../api/crm";
import type { Address } from "../../types/crm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DocTypeModal from "../../components/crm/DocTypeModal";

export default function AddressesListPage() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Address | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Address | null>(null);

  const {
    data: addresses = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-addresses", search],
    queryFn: () => getAddresses(search),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAddress(deleteTarget.name);
      toast.success("Address deleted.");
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete address.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Addresses
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Billing, shipping and plant locations stored in ERPNext ({addresses.length} total)
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
            New Address
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search addresses by title or location…"
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-xs text-neutral-400">
          No addresses found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {addresses.map((address) => (
            <div
              key={address.name}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    <h3 className="text-sm font-bold text-neutral-900 truncate">
                      {address.address_title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditTarget(address)}
                      className="text-neutral-300 hover:text-primary-600 p-1"
                      title="Edit Address"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(address)}
                      className="text-neutral-300 hover:text-red-600 p-1"
                      title="Delete Address"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-2.5 space-y-0.5 text-xs text-neutral-600">
                  <p>{address.address_line1}</p>
                  <p>
                    {address.city}, {address.state} {address.pincode}
                  </p>
                  <p className="text-neutral-400 font-medium">{address.country}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2 text-[10px] text-neutral-400">
                <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">
                  {address.address_type || "Billing"}
                </span>
                <span>{address.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ERPNext Address DocType Modal */}
      <DocTypeModal
        doctype="Address"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        title="New Address"
        subtitle="Create an official ERPNext Address record with full DocType schema support"
      />

      {/* Edit Address Modal */}
      <DocTypeModal
        doctype="Address"
        recordName={editTarget?.name}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={editTarget as unknown as Record<string, unknown>}
        title={`Edit Address: ${editTarget?.address_title || editTarget?.name}`}
        subtitle="Update address details in ERPNext backed by live DocType schema"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Address"
        description={`Are you sure you want to delete address "${deleteTarget?.address_title}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
