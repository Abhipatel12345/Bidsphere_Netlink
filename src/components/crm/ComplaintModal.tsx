import React, { useState, useEffect } from "react";
import { X, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  createComplaint,
  updateComplaint,
  getIssueTypes,
  getIssuePriorities,
  getSalesOrders,
  getDeliveryNotes,
} from "../../api/crm";
import type { ComplaintDoc, ComplaintPriority, ComplaintStatus } from "../../types/crm";
import DocTypeLinkSelect from "./DocTypeLinkSelect";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (complaint: ComplaintDoc) => void;
  initialCustomer?: string;
  initialData?: Partial<ComplaintDoc>;
  title?: string;
}

export default function ComplaintModal({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer = "",
  initialData,
  title = "Register Customer Complaint",
}: Props) {
  const [customer, setCustomer] = useState(initialCustomer || initialData?.customer || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [priority, setPriority] = useState<ComplaintPriority>(initialData?.priority || "Medium");
  const [issueType, setIssueType] = useState(initialData?.issue_type || "Product Quality Defect");
  const [status, setStatus] = useState<ComplaintStatus>(initialData?.status || "Open");
  const [raisedBy, setRaisedBy] = useState(initialData?.raised_by || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [resolutionDetails, setResolutionDetails] = useState(initialData?.resolution_details || "");
  const [salesOrder, setSalesOrder] = useState(initialData?.custom_sales_order || "");
  const [deliveryNote, setDeliveryNote] = useState(initialData?.custom_delivery_note || "");

  const [categories, setCategories] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [customerOrders, setCustomerOrders] = useState<Array<{ name: string; transaction_date: string }>>([]);
  const [customerDNs, setCustomerDNs] = useState<Array<{ name: string; posting_date: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      void getIssueTypes().then(setCategories);
      void getIssuePriorities().then(setPriorities);
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      setCustomer(initialData.customer || initialCustomer || "");
      setSubject(initialData.subject || "");
      setPriority(initialData.priority || "Medium");
      setIssueType(initialData.issue_type || "Product Quality Defect");
      setStatus(initialData.status || "Open");
      setRaisedBy(initialData.raised_by || "");
      setDescription(initialData.description || "");
      setResolutionDetails(initialData.resolution_details || "");
      setSalesOrder(initialData.custom_sales_order || "");
      setDeliveryNote(initialData.custom_delivery_note || "");
    } else if (initialCustomer) {
      setCustomer(initialCustomer);
    }
  }, [initialData, initialCustomer]);

  useEffect(() => {
    if (customer) {
      void getSalesOrders({ customer }).then((orders) => {
        setCustomerOrders(orders.map((o) => ({ name: o.name, transaction_date: o.transaction_date })));
      });
      void getDeliveryNotes({ customer }).then((dns) => {
        setCustomerDNs(dns.map((d) => ({ name: d.name, posting_date: d.posting_date })));
      });
    } else {
      setCustomerOrders([]);
      setCustomerDNs([]);
    }
  }, [customer]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError("Please provide a complaint subject or title.");
      return;
    }

    if (!customer) {
      setError("Please select the associated customer.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<ComplaintDoc> = {
        subject: subject.trim(),
        customer,
        customer_name: customer,
        priority,
        issue_type: issueType,
        status,
        raised_by: raisedBy.trim() || undefined,
        description: description.trim() || undefined,
        resolution_details: resolutionDetails.trim() || undefined,
        opening_date: initialData?.opening_date || new Date().toISOString().split("T")[0],
      };

      let result: ComplaintDoc;
      if (initialData?.name) {
        result = await updateComplaint(initialData.name, payload);
        toast.success(`Complaint ${initialData.name} updated successfully.`);
      } else {
        result = await createComplaint(payload);
        toast.success(`Complaint registered: ${result.name}`);
      }

      onSuccess(result);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save complaint.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
            <p className="text-xs text-neutral-500">
              Directly connected to ERPNext Issue DocType. Standard complaints lifecycle.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Subject */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Complaint Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Damaged packaging on batch B-104 delivery"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Customer */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Customer <span className="text-red-500">*</span>
              </label>
              <DocTypeLinkSelect
                targetDocType="Customer"
                value={customer}
                onChange={setCustomer}
                placeholder="Search or select customer..."
              />
            </div>

            {/* Category / Issue Type */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Category
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ComplaintStatus)}
                className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="Open">Open (New)</option>
                <option value="Replied">Replied</option>
                <option value="On Hold">On Hold (Pending Details)</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Raised By (Contact Email) */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Raised By (Email / Contact)
              </label>
              <input
                type="email"
                value={raisedBy}
                onChange={(e) => setRaisedBy(e.target.value)}
                placeholder="customer.contact@example.com"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Related Sales Order */}
            {customerOrders.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Related Sales Order (Optional)
                </label>
                <select
                  value={salesOrder}
                  onChange={(e) => setSalesOrder(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">None / Not Applicable</option>
                  {customerOrders.map((o) => (
                    <option key={o.name} value={o.name}>
                      {o.name} ({o.transaction_date})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Related Delivery Note */}
            {customerDNs.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Related Delivery Note (Optional)
                </label>
                <select
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">None / Not Applicable</option>
                  {customerDNs.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.posting_date})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-neutral-700">
                Complaint Investigation Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the complaint in detail, product serials, damage reports, etc..."
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Resolution Details (shown if updating or resolved) */}
            {(status === "Resolved" || status === "Closed" || initialData) && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-neutral-700">
                  Resolution Details & Actions Taken
                </label>
                <textarea
                  rows={2}
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  placeholder="Record corrective actions taken, replacements sent, credit notes issued, customer acknowledgement..."
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {initialData?.name ? "Update Complaint" : "Register Complaint"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
