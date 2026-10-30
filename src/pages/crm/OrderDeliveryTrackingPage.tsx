import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Truck,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Package,
  Download,
} from "lucide-react";
import { getOrderDeliveryTracking } from "../../api/crm";
import { exportReportToCsv } from "../../api/crmReports";
import ComplaintModal from "../../components/crm/ComplaintModal";
import OrderDeliveryDetailModal, { computeDeliveryMilestones } from "../../components/crm/OrderDeliveryDetailModal";
import type { ComplaintDoc, OrderDeliveryTrackingRecord } from "../../types/crm";

export default function OrderDeliveryTrackingPage() {
  const [searchParams] = useSearchParams();
  const customerParam = searchParams.get("customer") || "";
  const orderParam = searchParams.get("order") || "";

  const [search, setSearch] = useState(customerParam || orderParam || "");
  const [statusFilter, setStatusFilter] = useState("");
  const [isComplaintModalOpen, setIsComplaintModalOpen] = useState(false);
  const [complaintInitialData, setComplaintInitialData] = useState<Partial<ComplaintDoc>>({});
  const [selectedRecord, setSelectedRecord] = useState<OrderDeliveryTrackingRecord | null>(null);

  const {
    data: trackingRecords = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["crm-order-delivery-tracking", search],
    queryFn: () => getOrderDeliveryTracking({ search }),
  });

  // Automatically select order if specified in query string
  useEffect(() => {
    if (orderParam && trackingRecords.length > 0 && !selectedRecord) {
      const match = trackingRecords.find((r) => r.salesOrder.name.toLowerCase() === orderParam.toLowerCase());
      if (match) {
        setSelectedRecord(match);
      }
    }
  }, [orderParam, trackingRecords, selectedRecord]);

  const filteredRecords = trackingRecords.filter((rec) => {
    if (!statusFilter) return true;
    if (statusFilter === "Pending") return rec.overallDeliveryStatus === "Pending";
    if (statusFilter === "Partially Delivered") return rec.overallDeliveryStatus === "Partially Delivered";
    if (statusFilter === "Delivered") return rec.overallDeliveryStatus === "Delivered";
    if (statusFilter === "Delayed") return rec.overallDeliveryStatus === "Delayed";
    return true;
  });

  const totalOrders = trackingRecords.length;
  const pendingOrders = trackingRecords.filter((r) => r.overallDeliveryStatus === "Pending").length;
  const partialOrders = trackingRecords.filter((r) => r.overallDeliveryStatus === "Partially Delivered").length;
  const deliveredOrders = trackingRecords.filter((r) => r.overallDeliveryStatus === "Delivered").length;
  const delayedOrders = trackingRecords.filter((r) => r.overallDeliveryStatus === "Delayed").length;

  const handleExportCsv = () => {
    const rows = filteredRecords.map((r) => ({
      order_id: r.salesOrder.name,
      customer: r.salesOrder.customer_name || r.salesOrder.customer,
      order_date: r.salesOrder.transaction_date,
      expected_delivery: r.expectedDeliveryDate || "—",
      delivery_status: r.overallDeliveryStatus,
      ordered_qty: r.orderedQty,
      delivered_qty: r.deliveredQty,
      pending_qty: r.pendingQty,
      delivery_notes: r.deliveryNotes.map((d) => d.name).join("; ") || "None",
      grand_total: r.salesOrder.grand_total,
    }));

    const columns = [
      { label: "Sales Order", fieldname: "order_id" },
      { label: "Customer", fieldname: "customer" },
      { label: "Order Date", fieldname: "order_date" },
      { label: "Expected Delivery", fieldname: "expected_delivery" },
      { label: "Status", fieldname: "delivery_status" },
      { label: "Ordered Qty", fieldname: "ordered_qty" },
      { label: "Delivered Qty", fieldname: "delivered_qty" },
      { label: "Pending Qty", fieldname: "pending_qty" },
      { label: "Delivery Notes", fieldname: "delivery_notes" },
      { label: "Order Value", fieldname: "grand_total" },
    ];

    exportReportToCsv(columns, rows, "order_delivery_tracking.csv");
  };

  const handleOpenComplaint = (rec: OrderDeliveryTrackingRecord) => {
    setComplaintInitialData({
      customer: rec.salesOrder.customer,
      customer_name: rec.salesOrder.customer_name || rec.salesOrder.customer,
      subject: `Delivery Issue on ${rec.salesOrder.name}`,
      custom_sales_order: rec.salesOrder.name,
      custom_delivery_note: rec.deliveryNotes[0]?.name,
      issue_type: "Delivery Delay",
    });
    setIsComplaintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Order-to-Delivery Tracking
            </h1>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Sales Order &rarr; Delivery Note
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Real-time fulfillment visibility from order placement to dispatch and customer receipt.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export Tracking CSV
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
            <span>Total Sales Orders</span>
            <Package className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900">{totalOrders}</div>
          <span className="text-[11px] text-neutral-400">In ERP sales ledger</span>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Pending Dispatch</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900">{pendingOrders}</div>
          <span className="text-[11px] text-amber-700">Awaiting shipment</span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-800">
            <span>Partial Fulfillment</span>
            <Truck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{partialOrders}</div>
          <span className="text-[11px] text-blue-700">Partially delivered</span>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Completed Delivery</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{deliveredOrders}</div>
          <span className="text-[11px] text-emerald-700">Fully dispatched</span>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-red-800">
            <span>Delayed Deliveries</span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-900">{delayedOrders}</div>
          <span className="text-[11px] text-red-700">Past expected date</span>
        </div>
      </div>

      {/* Delivery Lifecycle Pipeline Visual Banner */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
            Order-to-Delivery Standard Stages & Fulfillment Lifecycle
          </h3>
          <span className="text-[11px] text-neutral-400">
            Click on any Sales Order below to view its live stage and milestone audit trail
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 hover:border-primary-300 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              1
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Sales Order Placed</div>
              <div className="text-[11px] text-neutral-500">Contract confirmed in ERP</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 hover:border-primary-300 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              2
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Inventory Allocation</div>
              <div className="text-[11px] text-neutral-500">Stock reserved & picked</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 hover:border-primary-300 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              3
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Delivery Note Issued</div>
              <div className="text-[11px] text-neutral-500">Goods packaged & loaded</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 hover:border-primary-300 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
              4
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">In Transit / Dispatch</div>
              <div className="text-[11px] text-neutral-500">Carrier fleet transport</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 hover:border-emerald-300 transition-colors">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
              5
            </div>
            <div>
              <div className="text-xs font-bold text-neutral-900">Customer Receipt</div>
              <div className="text-[11px] text-neutral-500">Verified & signed off</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Order ID, Customer, or Delivery Note..."
            className="w-full rounded-lg border border-neutral-200 py-1.5 pl-9 pr-3 text-xs text-neutral-800 focus:border-primary-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 focus:border-primary-500 focus:outline-none"
        >
          <option value="">All Delivery Statuses</option>
          <option value="Pending">Pending Dispatch</option>
          <option value="Partially Delivered">Partially Delivered</option>
          <option value="Delivered">Fully Delivered</option>
          <option value="Delayed">Delayed</option>
        </select>

        {(search || statusFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("");
            }}
            className="text-xs font-semibold text-primary-600 hover:text-primary-800"
          >
            Reset
          </button>
        )}
      </div>

      {/* Tracking Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
        {isLoading ? (
          <div className="space-y-3 p-6">
            <div className="h-6 w-1/3 animate-pulse rounded bg-neutral-200" />
            <div className="h-32 w-full animate-pulse rounded bg-neutral-100" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="mx-auto h-8 w-8 text-neutral-300" />
            <p className="mt-2 text-sm font-semibold text-neutral-700">No delivery tracking records found</p>
            <p className="text-xs text-neutral-400">
              Orders placed in ERPNext will show their delivery status and dispatch progress here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 bg-neutral-50/80 font-semibold uppercase tracking-wider text-neutral-600">
                <tr>
                  <th className="py-3 px-4">Sales Order</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4">Milestone Tracker</th>
                  <th className="py-3 px-4">Line Items Progress</th>
                  <th className="py-3 px-4">Linked Delivery Notes</th>
                  <th className="py-3 px-4">Order Value</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredRecords.map((r) => {
                  const { milestones, currentStepIndex } = computeDeliveryMilestones(r);
                  const currentMilestone = milestones[currentStepIndex - 1];

                  return (
                    <tr
                      key={r.salesOrder.name}
                      className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                      onClick={() => setSelectedRecord(r)}
                    >
                      {/* SALES ORDER ID (CLICKABLE) */}
                      <td
                        className="py-3.5 px-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(r);
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(r)}
                          className="group/btn inline-flex items-center gap-1.5 font-mono font-bold text-primary-600 hover:text-primary-800 hover:underline text-left focus:outline-none"
                          title="Click to view delivery details and milestone tracker"
                        >
                          <span>{r.salesOrder.name}</span>
                          <ExternalLink className="h-3 w-3 opacity-60 group-hover/btn:opacity-100 text-primary-500 transition-opacity" />
                        </button>
                      </td>

                      {/* CUSTOMER */}
                      <td
                        className="py-3.5 px-4 font-semibold text-neutral-900"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          to={`/crm/customers/${encodeURIComponent(r.salesOrder.customer)}`}
                          className="hover:text-primary-600 flex items-center gap-1"
                          title="Open Customer 360"
                        >
                          {r.salesOrder.customer_name || r.salesOrder.customer}
                          <ExternalLink className="h-3 w-3 text-neutral-400" />
                        </Link>
                      </td>

                      {/* ORDER DATE */}
                      <td className="py-3.5 px-4 text-neutral-600">
                        <div>{r.salesOrder.transaction_date}</div>
                        {r.expectedDeliveryDate && (
                          <div className="text-[11px] text-neutral-400">
                            Due: {r.expectedDeliveryDate}
                          </div>
                        )}
                      </td>

                      {/* DELIVERY STATUS */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            r.overallDeliveryStatus === "Delivered"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.overallDeliveryStatus === "Partially Delivered"
                              ? "bg-blue-100 text-blue-800"
                              : r.overallDeliveryStatus === "Delayed"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {r.overallDeliveryStatus}
                        </span>
                      </td>

                      {/* MILESTONE TRACKER */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {/* 5 mini dots representing stages */}
                          <div className="flex items-center gap-1">
                            {milestones.map((m) => (
                              <div
                                key={m.id}
                                className={`h-2 rounded-full transition-all ${
                                  m.step === currentStepIndex
                                    ? "w-4 bg-primary-600 animate-pulse"
                                    : m.status === "completed"
                                    ? "w-2 bg-emerald-500"
                                    : m.status === "delayed"
                                    ? "w-2 bg-red-500"
                                    : "w-2 bg-neutral-200"
                                }`}
                                title={`Step ${m.step}: ${m.title} (${m.status})`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-neutral-800">
                            <span className="text-primary-700 font-bold">Stage {currentStepIndex}/5:</span>
                            <span className="truncate max-w-[120px]">{currentMilestone?.title.split(" ")[0]} {currentMilestone?.title.split(" ")[1] || ""}</span>
                          </div>
                        </div>
                      </td>

                      {/* LINE ITEMS PROGRESS */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-20 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className={`h-full ${
                                r.overallDeliveryStatus === "Delivered"
                                  ? "bg-emerald-500"
                                  : "bg-primary-500"
                              }`}
                              style={{
                                width: `${
                                  r.orderedQty > 0
                                    ? Math.min(100, Math.round((r.deliveredQty / r.orderedQty) * 100))
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="font-semibold text-neutral-900">
                            {r.deliveredQty} / {r.orderedQty}
                          </span>
                        </div>
                        {r.pendingQty > 0 && (
                          <div className="text-[11px] text-amber-600 font-medium mt-0.5">
                            {r.pendingQty} units pending
                          </div>
                        )}
                      </td>

                      {/* LINKED DELIVERY NOTES */}
                      <td className="py-3.5 px-4">
                        {r.deliveryNotes.length === 0 ? (
                          <span className="text-neutral-400">None dispatched yet</span>
                        ) : (
                          <div className="space-y-1">
                            {r.deliveryNotes.map((dn) => (
                              <div
                                key={dn.name}
                                className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-emerald-800"
                              >
                                <span>{dn.name}</span>
                                <span className="text-[10px] text-neutral-500 font-sans">
                                  ({dn.posting_date})
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* ORDER VALUE */}
                      <td className="py-3.5 px-4 font-bold text-neutral-900">
                        ${Number(r.salesOrder.grand_total).toLocaleString()}
                      </td>

                      {/* ACTIONS */}
                      <td
                        className="py-3.5 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedRecord(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-primary-300 bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700 hover:bg-primary-100 transition-colors shadow-xs"
                            title="Open milestone tracker and delivery details"
                          >
                            <Truck className="h-3 w-3 text-primary-600" />
                            Track
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenComplaint(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
                            title="Register complaint about this order or delivery"
                          >
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            Log Issue
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delivery Detail & Milestone Tracker Modal */}
      <OrderDeliveryDetailModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord || undefined}
        onOpenComplaint={(rec) => handleOpenComplaint(rec)}
      />

      {/* Complaint Modal */}
      <ComplaintModal
        isOpen={isComplaintModalOpen}
        onClose={() => setIsComplaintModalOpen(false)}
        onSuccess={() => {
          void refetch();
        }}
        initialData={complaintInitialData}
        initialCustomer={complaintInitialData.customer}
        title="Register Order/Delivery Issue"
      />
    </div>
  );
}
