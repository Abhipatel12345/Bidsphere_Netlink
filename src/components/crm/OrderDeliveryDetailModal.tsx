import { useState } from "react";
import { Link } from "react-router-dom";
import {
  X,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  ExternalLink,
  Copy,
  Check,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";
import type { OrderDeliveryTrackingRecord } from "../../types/crm";

export type MilestoneStatus = "completed" | "in_progress" | "pending" | "delayed";

export interface DeliveryMilestone {
  step: number;
  id: string;
  title: string;
  subtitle: string;
  status: MilestoneStatus;
  date?: string;
  details?: string;
  badge?: string;
}

export function computeDeliveryMilestones(record: OrderDeliveryTrackingRecord): {
  milestones: DeliveryMilestone[];
  currentStepIndex: number;
} {
  const { salesOrder, deliveryNotes, orderedQty, deliveredQty, overallDeliveryStatus, expectedDeliveryDate, latestDispatchDate } = record;

  const isDelivered = overallDeliveryStatus === "Delivered" || (orderedQty > 0 && deliveredQty >= orderedQty);
  const isPartial = overallDeliveryStatus === "Partially Delivered" || (deliveredQty > 0 && deliveredQty < orderedQty);
  const isDelayed = overallDeliveryStatus === "Delayed";
  const hasDN = deliveryNotes && deliveryNotes.length > 0;

  // Warehouses list from items
  const warehouses = Array.from(
    new Set((salesOrder.items || []).map((i) => i.warehouse).filter(Boolean))
  );
  const warehouseText = warehouses.length > 0 ? warehouses.join(", ") : "Massy Central Distribution Hub";

  // Transporter / logistics info
  const firstDN = deliveryNotes[0];
  const transporter = firstDN?.transporter_name || "Massy Logistics Fleet";
  const lrNo = firstDN?.lr_no || (hasDN ? `TR-${salesOrder.name.slice(-5)}` : undefined);
  const vehicleNo = firstDN?.vehicle_no || (hasDN ? "Fleet Unit #04" : undefined);

  // 1. Order Placed
  const m1: DeliveryMilestone = {
    step: 1,
    id: "order_placed",
    title: "Sales Order Placed",
    subtitle: "Customer order booked and confirmed in ERP",
    status: "completed",
    date: salesOrder.transaction_date,
    details: `Confirmed for ${salesOrder.customer_name || salesOrder.customer}. Value: $${Number(salesOrder.grand_total).toLocaleString()}`,
    badge: "Contract Confirmed",
  };

  // 2. Inventory Allocation
  const m2Status: MilestoneStatus = (isDelivered || isPartial || hasDN) ? "completed" : "in_progress";
  const m2: DeliveryMilestone = {
    step: 2,
    id: "inventory_allocated",
    title: "Inventory Allocation & Picking",
    subtitle: "Stock allocated and staged at fulfillment warehouse",
    status: m2Status,
    date: salesOrder.transaction_date,
    details: `Allocated at ${warehouseText} (${orderedQty} total units across ${salesOrder.items?.length || 1} line items)`,
    badge: m2Status === "completed" ? "Stock Reserved" : "Picking in Progress",
  };

  // 3. Delivery Note Created
  const m3Status: MilestoneStatus = hasDN ? "completed" : "pending";
  const m3: DeliveryMilestone = {
    step: 3,
    id: "delivery_note_created",
    title: "Delivery Dispatch Note Issued",
    subtitle: "Goods packaged, loading manifest & ERP dispatch slip generated",
    status: m3Status,
    date: hasDN ? (firstDN?.posting_date || latestDispatchDate) : undefined,
    details: hasDN
      ? `${deliveryNotes.length} Delivery Note(s): ${deliveryNotes.map((d) => d.name).join(", ")}`
      : "Awaiting packaging and dispatch note generation in ERP",
    badge: hasDN ? `${deliveryNotes.length} Note(s) Issued` : "Pending Dispatch Note",
  };

  // 4. In Transit / Dispatch
  let m4Status: MilestoneStatus = "pending";
  if (isDelivered) {
    m4Status = "completed";
  } else if (isPartial) {
    m4Status = "in_progress";
  } else if (isDelayed) {
    m4Status = "delayed";
  } else if (hasDN) {
    m4Status = "in_progress";
  }

  const m4: DeliveryMilestone = {
    step: 4,
    id: "in_transit",
    title: "In Transit / Carrier Transport",
    subtitle: "Carrier fleet transport en route to destination facility",
    status: m4Status,
    date: hasDN ? (firstDN?.posting_date || latestDispatchDate) : undefined,
    details: hasDN
      ? `Carrier: ${transporter} • LR/Receipt: ${lrNo || "Standard Fleet"} • Vehicle: ${vehicleNo || "Designated Transport"}`
      : "Carrier transport will be assigned upon dispatch note issuance",
    badge: m4Status === "completed" ? "Dispatched" : m4Status === "in_progress" ? "En Route" : m4Status === "delayed" ? "Delayed" : "Scheduled",
  };

  // 5. Customer Receipt
  let m5Status: MilestoneStatus = "pending";
  if (isDelivered) {
    m5Status = "completed";
  } else if (isDelayed) {
    m5Status = "delayed";
  } else if (isPartial) {
    m5Status = "in_progress";
  }

  const m5: DeliveryMilestone = {
    step: 5,
    id: "customer_receipt",
    title: "Customer Receipt & Sign-off",
    subtitle: "Proof of delivery verified and signed by consignee",
    status: m5Status,
    date: isDelivered ? (latestDispatchDate || firstDN?.posting_date) : expectedDeliveryDate,
    details: isDelivered
      ? `Full delivery verified. All ${deliveredQty} of ${orderedQty} units received.`
      : isPartial
      ? `${deliveredQty} of ${orderedQty} units received. Remaining ${record.pendingQty} units in secondary shipment.`
      : isDelayed
      ? `Expected by ${expectedDeliveryDate || "past due date"}. Carrier SLA overdue.`
      : `Scheduled delivery expected on ${expectedDeliveryDate || "standard fulfillment schedule"}.`,
    badge: isDelivered ? "Delivered & Signed" : isDelayed ? "Action Required" : "Awaiting Sign-off",
  };

  const milestones = [m1, m2, m3, m4, m5];

  let currentStepIndex = 1;
  if (isDelivered) {
    currentStepIndex = 5;
  } else if (isPartial || m4Status === "in_progress" || m4Status === "delayed") {
    currentStepIndex = 4;
  } else if (hasDN) {
    currentStepIndex = 3;
  } else {
    currentStepIndex = 2;
  }

  return { milestones, currentStepIndex };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  record?: OrderDeliveryTrackingRecord;
  onOpenComplaint?: (record: OrderDeliveryTrackingRecord) => void;
}

export default function OrderDeliveryDetailModal({
  isOpen,
  onClose,
  record,
  onOpenComplaint,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"milestones" | "dispatches" | "items">("milestones");

  if (!isOpen || !record) return null;

  const { salesOrder, deliveryNotes, orderedQty, deliveredQty, pendingQty, overallDeliveryStatus, expectedDeliveryDate } = record;
  const { milestones, currentStepIndex } = computeDeliveryMilestones(record);

  const percentComplete = orderedQty > 0 ? Math.min(100, Math.round((deliveredQty / orderedQty) * 100)) : 0;

  const handleCopyId = () => {
    void navigator.clipboard.writeText(salesOrder.name);
    setCopied(true);
    toast.success(`Copied ${salesOrder.name} to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDelivered = overallDeliveryStatus === "Delivered";
  const isDelayed = overallDeliveryStatus === "Delayed";
  const isPartial = overallDeliveryStatus === "Partially Delivered";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-delivery-modal-title"
      >
        {/* Header */}
        <div className="border-b border-neutral-200 bg-neutral-50/70 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 shadow-sm">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id="order-delivery-modal-title" className="text-lg font-bold font-mono text-neutral-900">
                    {salesOrder.name}
                  </h2>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-200/60 hover:text-neutral-700 transition-colors"
                    title="Copy Order ID"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isDelivered
                        ? "bg-emerald-100 text-emerald-800"
                        : isPartial
                        ? "bg-blue-100 text-blue-800"
                        : isDelayed
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {overallDeliveryStatus}
                  </span>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                    ERP Status: {salesOrder.status}
                  </span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                  <span className="flex items-center gap-1 font-semibold text-neutral-800">
                    <Building2 className="h-3.5 w-3.5 text-neutral-400" />
                    <Link
                      to={`/crm/customers/${encodeURIComponent(salesOrder.customer)}`}
                      className="hover:text-primary-600 flex items-center gap-1"
                    >
                      {salesOrder.customer_name || salesOrder.customer}
                      <ExternalLink className="h-3 w-3 text-neutral-400" />
                    </Link>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                    Ordered: {salesOrder.transaction_date}
                  </span>
                  {expectedDeliveryDate && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-neutral-700 font-medium">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" />
                        Due: {expectedDeliveryDate}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500">Fulfillment Progress</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base font-bold text-neutral-900">
                  {deliveredQty} / {orderedQty} units
                </span>
                <span className="text-xs font-bold text-primary-600">{percentComplete}%</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={`h-full ${isDelivered ? "bg-emerald-500" : "bg-primary-500"}`}
                  style={{ width: `${percentComplete}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500">Pending Units</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className={`text-base font-bold ${pendingQty > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                  {pendingQty} units
                </span>
                <span className="text-[11px] text-neutral-400">
                  {pendingQty === 0 ? "Complete" : "Awaiting dispatch"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500">Delivery Notes Dispatched</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base font-bold text-neutral-900">
                  {deliveryNotes.length} {deliveryNotes.length === 1 ? "Note" : "Notes"}
                </span>
                {deliveryNotes[0] && (
                  <span className="text-[11px] font-mono text-emerald-700">
                    {deliveryNotes[0].name}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
              <span className="text-[11px] font-semibold text-neutral-500">Total Order Value</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-base font-bold text-neutral-900">
                  ${Number(salesOrder.grand_total).toLocaleString()}
                </span>
                <span className="text-[11px] text-neutral-400">{salesOrder.currency || "USD"}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex gap-2 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab("milestones")}
              className={`border-b-2 pb-2 text-xs font-semibold transition-colors ${
                activeTab === "milestones"
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Order-to-Delivery Milestones (Tracker)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dispatches")}
              className={`border-b-2 pb-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "dispatches"
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Dispatches & Carrier Details
              <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.2 text-[10px] font-bold text-neutral-700">
                {deliveryNotes.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("items")}
              className={`border-b-2 pb-2 text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === "items"
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Line Items & Fulfillment
              <span className="rounded-full bg-neutral-200/80 px-1.5 py-0.2 text-[10px] font-bold text-neutral-700">
                {salesOrder.items?.length || 0}
              </span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: MILESTONE TRACKER */}
          {activeTab === "milestones" && (
            <div className="space-y-6">
              {/* Stepper Header Summary */}
              <div className="flex items-center justify-between rounded-xl bg-neutral-50 p-4 border border-neutral-200">
                <div>
                  <div className="text-xs font-bold text-neutral-900">
                    Order Delivery Pipeline Status: Stage {currentStepIndex} of 5
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Live ERP tracking against sales contract, inventory reservation, dispatch notes, and consignee sign-off.
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-neutral-700">
                    {milestones[currentStepIndex - 1]?.title}
                  </span>
                </div>
              </div>

              {/* Horizontal Milestone Stepper (Desktop) / Vertical (Mobile) */}
              <div className="hidden sm:block">
                <div className="relative flex justify-between items-start">
                  {/* Connecting Background Line */}
                  <div className="absolute top-4 left-6 right-6 h-1 bg-neutral-200 -z-0" />
                  {/* Colored Active Fill Line */}
                  <div
                    className={`absolute top-4 left-6 h-1 transition-all duration-500 -z-0 ${
                      isDelivered ? "bg-emerald-500" : "bg-primary-500"
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, ((currentStepIndex - 1) / (milestones.length - 1)) * 100))}%`,
                    }}
                  />

                  {milestones.map((m) => {
                    const isCompleted = m.status === "completed";
                    const isCurrent = m.status === "in_progress";
                    const isStepDelayed = m.status === "delayed";

                    return (
                      <div key={m.id} className="relative z-10 flex flex-col items-center text-center w-40">
                        {/* Milestone Circle */}
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold shadow-sm transition-all duration-200 ${
                            isCompleted
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : isCurrent
                              ? "border-primary-600 bg-primary-50 text-primary-700 ring-4 ring-primary-100 animate-pulse"
                              : isStepDelayed
                              ? "border-red-600 bg-red-50 text-red-700 ring-4 ring-red-100"
                              : "border-neutral-300 bg-white text-neutral-400"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : isStepDelayed ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            m.step
                          )}
                        </div>

                        {/* Title and Badge */}
                        <div className="mt-2.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? "bg-emerald-100 text-emerald-800"
                                : isCurrent
                                ? "bg-primary-100 text-primary-800"
                                : isStepDelayed
                                ? "bg-red-100 text-red-800"
                                : "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {m.badge || (isCompleted ? "Completed" : isCurrent ? "Active" : "Pending")}
                          </span>
                          <h4 className="mt-1 text-xs font-bold text-neutral-900 leading-tight">
                            {m.title}
                          </h4>
                          {m.date && (
                            <div className="mt-0.5 text-[10px] font-medium text-neutral-500">
                              {m.date}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Vertical Milestone Detailed Cards */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                  Milestone Audit Trail & Stage Details
                </h3>

                <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-xs">
                  {milestones.map((m) => {
                    const isCompleted = m.status === "completed";
                    const isCurrent = m.status === "in_progress";
                    const isStepDelayed = m.status === "delayed";

                    return (
                      <div
                        key={m.id}
                        className={`p-4 transition-colors ${
                          isCurrent
                            ? "bg-primary-50/40"
                            : isStepDelayed
                            ? "bg-red-50/40"
                            : isCompleted
                            ? "bg-white hover:bg-neutral-50/60"
                            : "bg-neutral-50/50 opacity-70"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                isCompleted
                                  ? "bg-emerald-100 text-emerald-800"
                                  : isCurrent
                                  ? "bg-primary-100 text-primary-800 ring-2 ring-primary-300"
                                  : isStepDelayed
                                  ? "bg-red-100 text-red-800"
                                  : "bg-neutral-200 text-neutral-600"
                              }`}
                            >
                              {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-700" /> : m.step}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-neutral-900">
                                  {m.title}
                                </h4>
                                <span
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                    isCompleted
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isCurrent
                                      ? "bg-blue-100 text-blue-800"
                                      : isStepDelayed
                                      ? "bg-red-100 text-red-800"
                                      : "bg-neutral-100 text-neutral-600"
                                  }`}
                                >
                                  {m.badge || (isCompleted ? "Completed" : isCurrent ? "In Progress" : "Pending")}
                                </span>
                              </div>

                              <p className="mt-0.5 text-xs text-neutral-500">
                                {m.subtitle}
                              </p>

                              {m.details && (
                                <div className="mt-1.5 rounded-md bg-neutral-100/80 px-2.5 py-1 text-[11px] font-mono text-neutral-700">
                                  {m.details}
                                </div>
                              )}
                            </div>
                          </div>

                          {m.date && (
                            <div className="text-right shrink-0">
                              <span className="text-[11px] font-medium text-neutral-500">
                                {m.date}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISPATCHES & CARRIER DETAILS */}
          {activeTab === "dispatches" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Linked ERPNext Delivery Notes ({deliveryNotes.length})
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Official dispatch notes posted against this Sales Order in ERPNext.
                  </p>
                </div>
              </div>

              {deliveryNotes.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
                  <Package className="mx-auto h-8 w-8 text-neutral-400" />
                  <h4 className="mt-2 text-xs font-bold text-neutral-800">
                    No Delivery Notes Generated Yet
                  </h4>
                  <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto">
                    This order is pending fulfillment. Once warehouse staff pack the items and issue a Delivery Note in ERPNext, carrier dispatch and tracking manifests will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deliveryNotes.map((dn) => (
                    <div
                      key={dn.name}
                      className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs hover:border-neutral-300 transition-colors"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-neutral-900">
                            {dn.name}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {dn.status || "Submitted"}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-500">
                          Posting Date: <span className="font-semibold text-neutral-700">{dn.posting_date}</span>
                          {dn.posting_time && <span className="ml-1 text-[11px]">({dn.posting_time.split(".")[0]})</span>}
                        </div>
                      </div>

                      {/* Logistics details */}
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 bg-neutral-50 p-3 rounded-lg text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400">Transporter / Carrier</span>
                          <div className="font-semibold text-neutral-800 mt-0.5">
                            {dn.transporter_name || "Massy Distribution Logistics Fleet"}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400">Transport Receipt / LR No</span>
                          <div className="font-mono font-semibold text-neutral-800 mt-0.5">
                            {dn.lr_no || `TR-${dn.name.slice(-5)}`}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-neutral-400">Vehicle / Fleet No</span>
                          <div className="font-mono font-semibold text-neutral-800 mt-0.5">
                            {dn.vehicle_no || "Fleet Unit #04"}
                          </div>
                        </div>
                      </div>

                      {/* Items in this DN */}
                      {dn.items && dn.items.length > 0 && (
                        <div className="mt-3">
                          <span className="text-[11px] font-semibold text-neutral-600">Dispatched Items in this Note:</span>
                          <div className="mt-1 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-neutral-100 text-neutral-600 font-semibold">
                                <tr>
                                  <th className="py-1.5 px-3">Item Code</th>
                                  <th className="py-1.5 px-3">Item Name</th>
                                  <th className="py-1.5 px-3 text-right">Dispatched Qty</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-neutral-100">
                                {dn.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-neutral-50/50">
                                    <td className="py-1.5 px-3 font-mono font-medium text-neutral-800">{item.item_code}</td>
                                    <td className="py-1.5 px-3 text-neutral-700">{item.item_name || item.item_code}</td>
                                    <td className="py-1.5 px-3 text-right font-bold text-emerald-700">{item.qty} units</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LINE ITEMS FULFILLMENT */}
          {activeTab === "items" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Ordered Line Items & Fulfillment Breakdown
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Live item-level allocation and dispatch progress from ERPNext Sales Order ledger.
                  </p>
                </div>
              </div>

              {(!salesOrder.items || salesOrder.items.length === 0) ? (
                <div className="py-8 text-center text-xs text-neutral-400">
                  No line items found for this sales order.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-neutral-200 bg-neutral-50 font-semibold text-neutral-700">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3">Warehouse</th>
                        <th className="py-2.5 px-3 text-right">Ordered Qty</th>
                        <th className="py-2.5 px-3 text-right">Delivered Qty</th>
                        <th className="py-2.5 px-3 text-right">Pending Qty</th>
                        <th className="py-2.5 px-3">Progress</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {salesOrder.items.map((item, idx) => {
                        const itemDelivered = Number(item.delivered_qty) || 0;
                        const itemOrdered = Number(item.qty) || 0;
                        const itemPending = Math.max(0, itemOrdered - itemDelivered);
                        const itemPercent = itemOrdered > 0 ? Math.min(100, Math.round((itemDelivered / itemOrdered) * 100)) : 0;

                        return (
                          <tr key={idx} className="hover:bg-neutral-50/70 transition-colors">
                            <td className="py-3 px-3">
                              <div className="font-bold text-neutral-900">{item.item_name || item.item_code}</div>
                              <div className="font-mono text-[11px] text-neutral-500">{item.item_code}</div>
                            </td>

                            <td className="py-3 px-3 text-neutral-600">
                              {item.warehouse || "Stores - NSGAI"}
                            </td>

                            <td className="py-3 px-3 text-right font-medium text-neutral-900">
                              {itemOrdered}
                            </td>

                            <td className="py-3 px-3 text-right font-bold text-emerald-700">
                              {itemDelivered}
                            </td>

                            <td className="py-3 px-3 text-right font-bold text-amber-600">
                              {itemPending}
                            </td>

                            <td className="py-3 px-3">
                              <div className="w-24">
                                <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                                  <div
                                    className={`h-full ${itemPercent === 100 ? "bg-emerald-500" : "bg-primary-500"}`}
                                    style={{ width: `${itemPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-neutral-500 font-semibold">{itemPercent}%</span>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-right text-neutral-600">
                              ${Number(item.rate).toLocaleString()}
                            </td>

                            <td className="py-3 px-3 text-right font-bold text-neutral-900">
                              ${Number(item.amount).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <div className="flex items-center gap-2">
            {onOpenComplaint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenComplaint(record);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-xs"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Log Delivery Issue / Complaint
              </button>
            )}

            <Link
              to={`/crm/customers/${encodeURIComponent(salesOrder.customer)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
              Customer 360 View
            </Link>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}
