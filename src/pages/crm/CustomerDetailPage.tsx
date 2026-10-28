import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  TrendingUp,
  ExternalLink,
  Edit,
} from "lucide-react";
import toast from "react-hot-toast";
import { getCustomer, deleteCustomer, getCustomerRelatedRecords } from "../../api/crm";
import CrmNotesAttachments from "../../components/crm/CrmNotesAttachments";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DocTypeModal from "../../components/crm/DocTypeModal";

export default function CustomerDetailPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"opportunities" | "contacts" | "addresses">("opportunities");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const {
    data: customer,
    isLoading: isCustLoading,
    refetch: refetchCustomer,
  } = useQuery({
    queryKey: ["crm-customer", name],
    queryFn: () => getCustomer(decodeURIComponent(name)),
    enabled: Boolean(name),
  });

  const {
    data: related = { opportunities: [], contacts: [], addresses: [] },
  } = useQuery({
    queryKey: ["crm-customer-related", name],
    queryFn: () => getCustomerRelatedRecords(decodeURIComponent(name)),
    enabled: Boolean(name),
  });

  const handleDelete = async () => {
    if (!customer) return;
    try {
      await deleteCustomer(customer.name);
      toast.success("Customer deleted.");
      navigate("/crm/customers");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete customer.";
      toast.error(msg);
    }
  };

  if (isCustLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-12 text-center text-sm text-neutral-500">
        Customer not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/crm/customers"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {customer.customer_name || customer.name}
              </h1>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                {customer.name}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {customer.customer_group} • {customer.territory}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Customer
          </button>

          <Link
            to={`/crm/opportunities/new?opportunity_from=Customer&party_name=${encodeURIComponent(customer.name)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            New Opportunity
          </Link>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Customer Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Customer Group
          </span>
          <div className="mt-1 text-sm font-bold text-neutral-900">
            {customer.customer_group || "—"}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Territory
          </span>
          <div className="mt-1 text-sm font-bold text-neutral-900">
            {customer.territory || "—"}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Customer Type
          </span>
          <div className="mt-1 text-sm font-bold text-neutral-900">
            {customer.customer_type || "Company"}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Total Opportunities
          </span>
          <div className="mt-1 text-sm font-bold text-primary-700">
            {related.opportunities.length}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex border-b border-neutral-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("opportunities")}
            className={`border-b-2 py-2.5 px-4 transition-colors ${
              activeTab === "opportunities"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Opportunities ({related.opportunities.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`border-b-2 py-2.5 px-4 transition-colors ${
              activeTab === "contacts"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Contacts ({related.contacts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("addresses")}
            className={`border-b-2 py-2.5 px-4 transition-colors ${
              activeTab === "addresses"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Addresses ({related.addresses.length})
          </button>
        </div>

        <div className="mt-4">
          {activeTab === "opportunities" && (
            <div>
              {related.opportunities.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No opportunities linked to this customer yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 text-xs">
                  {related.opportunities.map((opp) => (
                    <div key={opp.name} className="flex items-center justify-between py-2.5">
                      <div>
                        <Link
                          to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                          className="font-semibold text-neutral-900 hover:text-primary-600"
                        >
                          {opp.title || opp.name}
                        </Link>
                        <div className="text-[11px] text-neutral-500">{opp.sales_stage}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-neutral-900">
                          ${(Number(opp.opportunity_amount) || 0).toLocaleString()}
                        </span>
                        <Link
                          to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                          className="text-neutral-400 hover:text-neutral-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "contacts" && (
            <div>
              {related.contacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No contacts linked to this customer account.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {related.contacts.map((c) => (
                    <div key={c.name} className="rounded-lg border border-neutral-200 p-3 text-xs">
                      <div className="font-semibold text-neutral-900">
                        {c.first_name} {c.last_name || ""}
                      </div>
                      <div className="mt-1 text-neutral-500">{c.email_id || "No email"}</div>
                      <div className="text-neutral-500">{c.mobile_no || c.phone || "No phone"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "addresses" && (
            <div>
              {related.addresses.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No addresses linked to this customer account.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {related.addresses.map((a) => (
                    <div key={a.name} className="rounded-lg border border-neutral-200 p-3 text-xs">
                      <div className="font-semibold text-neutral-900">{a.address_title}</div>
                      <div className="mt-1 text-neutral-500">{a.address_line1}</div>
                      <div className="text-neutral-500">
                        {a.city}, {a.state} {a.pincode}
                      </div>
                      <div className="text-neutral-400">{a.country}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notes & Timeline */}
      <CrmNotesAttachments doctype="Customer" docname={customer.name} />

      <ConfirmDialog
        open={isDeleteOpen}
        title="Delete Customer"
        description={`Are you sure you want to delete customer "${customer.customer_name || customer.name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />

      {/* Edit Customer Modal */}
      <DocTypeModal
        doctype="Customer"
        recordName={customer.name}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          void refetchCustomer();
        }}
        initialData={customer as unknown as Record<string, unknown>}
        title={`Edit Customer: ${customer.customer_name || customer.name}`}
        subtitle="Update customer details in ERPNext backed by live DocType schema"
      />
    </div>
  );
}
