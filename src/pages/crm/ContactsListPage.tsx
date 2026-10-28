import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Trash2, RefreshCw, Mail, Phone, Building, Edit } from "lucide-react";
import toast from "react-hot-toast";
import { getContacts, deleteContact } from "../../api/crm";
import type { Contact } from "../../types/crm";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DocTypeModal from "../../components/crm/DocTypeModal";

export default function ContactsListPage() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Contact | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const {
    data: contacts = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-contacts", search],
    queryFn: () => getContacts(search),
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteContact(deleteTarget.name);
      toast.success("Contact deleted.");
      setDeleteTarget(null);
      void refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete contact.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Contacts
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Address book and individual contact profiles in ERPNext ({contacts.length} total)
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
            New Contact
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts by name…"
          className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      {/* Grid of Contact Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white py-12 text-center text-xs text-neutral-400">
          No contacts found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((contact) => (
            <div
              key={contact.name}
              className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-primary-300 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">
                      {contact.first_name} {contact.last_name || ""}
                    </h3>
                    <p className="text-[11px] text-neutral-400">{contact.designation || "Contact"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditTarget(contact)}
                      className="text-neutral-300 hover:text-primary-600 p-1"
                      title="Edit Contact"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(contact)}
                      className="text-neutral-300 hover:text-red-600 p-1"
                      title="Delete Contact"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-neutral-600">
                  {contact.company_name && (
                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{contact.company_name}</span>
                    </div>
                  )}
                  {contact.email_id && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{contact.email_id}</span>
                    </div>
                  )}
                  {(contact.mobile_no || contact.phone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{contact.mobile_no || contact.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-neutral-100 pt-2 text-[10px] text-neutral-400">
                ERPNext ID: {contact.name}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ERPNext Contact DocType Modal */}
      <DocTypeModal
        doctype="Contact"
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        title="New Contact"
        subtitle="Create an official ERPNext Contact record with full DocType schema support"
      />

      {/* Edit Contact Modal */}
      <DocTypeModal
        doctype="Contact"
        recordName={editTarget?.name}
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={editTarget as unknown as Record<string, unknown>}
        title={`Edit Contact: ${editTarget?.first_name} ${editTarget?.last_name || ""}`}
        subtitle="Update contact details in ERPNext backed by live DocType schema"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Contact"
        description={`Are you sure you want to delete contact "${deleteTarget?.first_name} ${deleteTarget?.last_name || ""}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
