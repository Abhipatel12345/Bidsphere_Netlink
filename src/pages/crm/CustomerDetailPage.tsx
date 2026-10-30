import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  TrendingUp,
  ExternalLink,
  Edit,
  Truck,
  AlertTriangle,
  Users,
  MapPin,
  Plus,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  deleteCustomer,
  getCustomer360,
} from "../../api/crm";
import CrmNotesAttachments from "../../components/crm/CrmNotesAttachments";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DocTypeModal from "../../components/crm/DocTypeModal";
import ComplaintModal from "../../components/crm/ComplaintModal";
import OrderDeliveryDetailModal from "../../components/crm/OrderDeliveryDetailModal";
import type { ComplaintDoc, OrderDeliveryTrackingRecord, SalesOrderDoc } from "../../types/crm";

export default function CustomerDetailPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "opportunities" | "orders" | "deliveries" | "complaints" | "contacts" | "addresses"
  >("opportunities");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<ComplaintDoc | undefined>();
  const [selectedTrackingRecord, setSelectedTrackingRecord] = useState<OrderDeliveryTrackingRecord | null>(null);

  const customerName = decodeURIComponent(name);

  const {
    data: c360,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["crm-customer-360", customerName],
    queryFn: () => getCustomer360(customerName),
    enabled: Boolean(customerName),
  });

  const customer = c360?.customer;
  const opportunities = c360?.opportunities ?? [];
  const salesOrders = c360?.salesOrders ?? [];
  const deliveryNotes = c360?.deliveryNotes ?? [];
  const complaints = c360?.complaints ?? [];
  const contacts = c360?.contacts ?? [];
  const addresses = c360?.addresses ?? [];

  const totalPipeline = opportunities.reduce(
    (sum, o) => sum + (Number(o.opportunity_amount) || 0),
    0
  );
  const totalOrdersValue = salesOrders.reduce(
    (sum, o) => sum + (Number(o.grand_total) || 0),
    0
  );

  const handleOpenOrderTracking = (so: SalesOrderDoc) => {
    const linkedDNs = deliveryNotes.filter((dn) =>
      dn.items?.some((item) => item.against_sales_order === so.name)
    );
    let orderedQty = 0;
    let deliveredQty = 0;
    for (const item of so.items || []) {
      orderedQty += Number(item.qty) || 0;
      deliveredQty += Number(item.delivered_qty) || 0;
    }
    if (deliveredQty === 0 && linkedDNs.length > 0) {
      for (const dn of linkedDNs) {
        for (const item of dn.items || []) {
          if (item.against_sales_order === so.name) {
            deliveredQty += Number(item.qty) || 0;
          }
        }
      }
    }
    const pendingQty = Math.max(0, orderedQty - deliveredQty);
    let overallStatus: "Pending" | "Partially Delivered" | "Delivered" | "Delayed" = "Pending";
    if (so.delivery_status === "Fully Delivered" || (orderedQty > 0 && deliveredQty >= orderedQty)) {
      overallStatus = "Delivered";
    } else if (deliveredQty > 0) {
      overallStatus = "Partially Delivered";
    } else if (so.delivery_date && new Date(so.delivery_date) < new Date()) {
      overallStatus = "Delayed";
    }

    setSelectedTrackingRecord({
      salesOrder: so,
      deliveryNotes: linkedDNs,
      orderedQty,
      deliveredQty,
      pendingQty,
      overallDeliveryStatus: overallStatus,
      latestDispatchDate: linkedDNs[0]?.posting_date,
      expectedDeliveryDate: so.delivery_date,
    });
  };

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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-96 w-full animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-red-900">Failed to Load Customer Record</h2>
        <p className="mt-1 text-xs text-red-700 max-w-md mx-auto">
          {error instanceof Error ? error.message : "Unable to retrieve customer data from ERPNext."}
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 shadow-sm"
          >
            Retry Connection
          </button>
          <Link
            to="/crm/customers"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm"
          >
            Back to Directory
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 mb-3">
          <Users className="h-6 w-6" />
        </div>
        <h2 className="text-base font-semibold text-neutral-900">Customer Not Found</h2>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          The requested customer "{customerName}" does not exist in the ERPNext database.
        </p>
        <Link
          to="/crm/customers"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 shadow-sm"
        >
          Return to Customer Directory
        </Link>
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
              <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
                Customer 360°
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              ERP ID: <span className="font-mono">{customer.name}</span> • {customer.customer_group} • {customer.territory}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedComplaint(undefined);
              setIsComplaintModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-100"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
            Register Complaint
          </button>

          <Link
            to={`/crm/opportunities/new?opportunity_from=Customer&party_name=${encodeURIComponent(customer.name)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            New Opportunity
          </Link>

          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100"
            title="Delete Customer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Customer 360 Quick Stats Ribbon */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Pipeline Value
          </span>
          <div className="mt-1 text-base font-bold text-neutral-900">
            ${totalPipeline.toLocaleString()}
          </div>
          <span className="text-[11px] text-neutral-500">
            {opportunities.length} opportunities
          </span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Total Sales Orders
          </span>
          <div className="mt-1 text-base font-bold text-neutral-900">
            ${totalOrdersValue.toLocaleString()}
          </div>
          <span className="text-[11px] text-neutral-500">
            {salesOrders.length} orders placed
          </span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Deliveries
          </span>
          <div className="mt-1 text-base font-bold text-neutral-900">
            {deliveryNotes.length} Dispatched
          </div>
          <span className="text-[11px] text-neutral-500">
            Delivery Notes in ERP
          </span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Complaints (Issues)
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-base font-bold text-amber-600">
              {complaints.length}
            </span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              {complaints.filter((c) => c.status === "Open").length} open
            </span>
          </div>
          <span className="text-[11px] text-neutral-500">
            Logged in Helpdesk
          </span>
        </div>

        <div className="col-span-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:col-span-4 lg:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Account Info
          </span>
          <div className="mt-1 truncate text-xs font-medium text-neutral-700">
            Group: {customer.customer_group || "—"}
          </div>
          <div className="truncate text-xs font-medium text-neutral-700">
            Territory: {customer.territory || "—"}
          </div>
        </div>
      </div>

      {/* 360 Tabs Navigation */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap border-b border-neutral-200 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("opportunities")}
            className={`border-b-2 py-2.5 px-4 transition-colors ${
              activeTab === "opportunities"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Opportunities ({opportunities.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`border-b-2 py-2.5 px-4 transition-colors ${
              activeTab === "orders"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Sales Orders ({salesOrders.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("deliveries")}
            className={`border-b-2 py-2.5 px-4 transition-colors ${
              activeTab === "deliveries"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Delivery History ({deliveryNotes.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("complaints")}
            className={`border-b-2 py-2.5 px-4 transition-colors ${
              activeTab === "complaints"
                ? "border-primary-600 text-primary-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Complaints ({complaints.length})
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
            Contacts ({contacts.length})
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
            Addresses ({addresses.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-5">
          {/* Opportunities Tab */}
          {activeTab === "opportunities" && (
            <div>
              {opportunities.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No opportunities linked to this customer yet.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 text-xs">
                  {opportunities.map((opp) => (
                    <div key={opp.name} className="flex items-center justify-between py-3">
                      <div>
                        <Link
                          to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                          className="font-semibold text-neutral-900 hover:text-primary-600"
                        >
                          {opp.title || opp.name}
                        </Link>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-500">
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-700">
                            {opp.sales_stage}
                          </span>
                          <span>Status: {opp.status}</span>
                          {opp.expected_closing && <span>Close: {opp.expected_closing}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-neutral-900">
                          ${(Number(opp.opportunity_amount) || 0).toLocaleString()}
                        </span>
                        <Link
                          to={`/crm/opportunities/${encodeURIComponent(opp.name)}`}
                          className="text-neutral-400 hover:text-neutral-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sales Orders Tab */}
          {activeTab === "orders" && (
            <div>
              {salesOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No sales orders found for this customer in ERPNext.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-700">
                      <tr>
                        <th className="py-2.5 px-3">Order Number</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Delivery Status</th>
                        <th className="py-2.5 px-3">Fulfilled %</th>
                        <th className="py-2.5 px-3">Grand Total</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {salesOrders.map((so) => (
                        <tr key={so.name} className="hover:bg-neutral-50">
                          <td className="py-3 px-3 font-semibold text-neutral-900">
                            <button
                              type="button"
                              onClick={() => handleOpenOrderTracking(so)}
                              className="group inline-flex items-center gap-1.5 font-mono font-bold text-primary-600 hover:text-primary-800 hover:underline text-left focus:outline-none"
                              title="Click to view delivery details and milestone tracking"
                            >
                              <span>{so.name}</span>
                              <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100 text-primary-500 transition-opacity" />
                            </button>
                          </td>
                          <td className="py-3 px-3 text-neutral-500">
                            {so.transaction_date}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                so.delivery_status === "Fully Delivered"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : so.delivery_status === "Partially Delivered"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {so.delivery_status || "Not Delivered"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-medium text-neutral-700">
                            {so.per_delivered ?? 0}%
                          </td>
                          <td className="py-3 px-3 font-bold text-neutral-900">
                            ${Number(so.grand_total).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenOrderTracking(so)}
                                className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-800"
                                title="Open Milestone Tracker"
                              >
                                <Truck className="h-3 w-3" />
                                Track
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Delivery History Tab */}
          {activeTab === "deliveries" && (
            <div>
              {deliveryNotes.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No delivery dispatch notes logged for this customer.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-700">
                      <tr>
                        <th className="py-2.5 px-3">Delivery Note</th>
                        <th className="py-2.5 px-3">Dispatch Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Total Value</th>
                        <th className="py-2.5 px-3">Carrier / Tracking</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {deliveryNotes.map((dn) => (
                        <tr key={dn.name} className="hover:bg-neutral-50">
                          <td className="py-3 px-3 font-semibold text-neutral-900">
                            {dn.name}
                          </td>
                          <td className="py-3 px-3 text-neutral-500">
                            {dn.posting_date}
                          </td>
                          <td className="py-3 px-3">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                              {dn.status || "Submitted"}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-neutral-900">
                            ${Number(dn.grand_total).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-neutral-500">
                            {dn.transporter_name || dn.lr_no ? `${dn.transporter_name || ""} ${dn.lr_no || ""}` : "Standard Fleet"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Complaints Tab */}
          {activeTab === "complaints" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-neutral-500">
                  Issues logged for {customer.customer_name || customer.name}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedComplaint(undefined);
                    setIsComplaintModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
                >
                  <Plus className="h-3 w-3" />
                  New Complaint
                </button>
              </div>

              {complaints.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No complaints filed for this customer.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 text-xs">
                  {complaints.map((c) => (
                    <div key={c.name} className="flex items-center justify-between py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-neutral-900">
                            {c.subject}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              c.status === "Open"
                                ? "bg-amber-100 text-amber-800"
                                : c.status === "Resolved"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            {c.status}
                          </span>
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                            {c.priority}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-neutral-500">
                          {c.issue_type} • Opened: {c.opening_date || "—"} • ID: {c.name}
                        </div>
                        {c.resolution_details && (
                          <div className="mt-1 rounded bg-emerald-50 p-1.5 text-[11px] text-emerald-800">
                            <span className="font-semibold">Resolution: </span>
                            {c.resolution_details}
                            {(c.sla_resolution_date || c.resolution_date) && (
                              <span className="ml-2 text-[10px] text-emerald-600 font-medium">
                                • Resolved on {String(c.sla_resolution_date || c.resolution_date).split(" ")[0]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setIsComplaintModalOpen(true);
                          }}
                          className="rounded border border-neutral-300 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contacts Tab */}
          {activeTab === "contacts" && (
            <div>
              {contacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No contacts linked to this customer account.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {contacts.map((c) => (
                    <div key={c.name} className="rounded-lg border border-neutral-200 p-3 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-neutral-900">
                        <Users className="h-3.5 w-3.5 text-neutral-400" />
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

          {/* Addresses Tab */}
          {activeTab === "addresses" && (
            <div>
              {addresses.length === 0 ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No addresses linked to this customer account.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {addresses.map((a) => (
                    <div key={a.name} className="rounded-lg border border-neutral-200 p-3 text-xs">
                      <div className="flex items-center gap-2 font-semibold text-neutral-900">
                        <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                        {a.address_title}
                      </div>
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

      {/* Modals */}
      <ConfirmDialog
        open={isDeleteOpen}
        title="Delete Customer"
        description={`Are you sure you want to delete customer "${customer.customer_name || customer.name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />

      <DocTypeModal
        doctype="Customer"
        recordName={customer.name}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={customer as unknown as Record<string, unknown>}
        title={`Edit Customer: ${customer.customer_name || customer.name}`}
        subtitle="Update customer master details directly in ERPNext"
      />

      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        initialCustomer={customer.name}
        initialData={selectedComplaint}
        title={selectedComplaint ? `Manage Complaint: ${selectedComplaint.name}` : `Register Complaint for ${customer.customer_name || customer.name}`}
      />

      <OrderDeliveryDetailModal
        isOpen={!!selectedTrackingRecord}
        onClose={() => setSelectedTrackingRecord(null)}
        record={selectedTrackingRecord || undefined}
        onOpenComplaint={(rec) => {
          setSelectedComplaint({
            customer: rec.salesOrder.customer,
            customer_name: rec.salesOrder.customer_name || rec.salesOrder.customer,
            subject: `Delivery Issue on ${rec.salesOrder.name}`,
            custom_sales_order: rec.salesOrder.name,
            custom_delivery_note: rec.deliveryNotes[0]?.name,
            issue_type: "Delivery Delay",
          } as ComplaintDoc);
          setIsComplaintModalOpen(true);
        }}
      />
    </div>
  );
}
