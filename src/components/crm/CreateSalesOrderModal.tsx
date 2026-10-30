import { useState, useEffect, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  Calendar,
  Building2,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createSalesOrder,
  submitSalesOrder,
  getItems,
  getWarehouses,
  getCustomers,
  getContactsForDoc,
  getAddressesForDoc,
} from "../../api/crm";
import type { Customer, Contact, Address, SalesOrderDoc } from "../../types/crm";

interface ItemRow {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  uom: string;
  warehouse: string;
  rate: number;
  discount_percentage: number;
  amount: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (order: SalesOrderDoc) => void;
  initialCustomer?: string;
  initialCustomerName?: string;
}

export default function CreateSalesOrderModal({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer,
  initialCustomerName,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"draft" | "submit">("draft");

  // Form Fields - Customer Information
  const [customer, setCustomer] = useState(initialCustomer || "");
  const [customerName, setCustomerName] = useState(initialCustomerName || initialCustomer || "");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMobile, setContactMobile] = useState("");

  // Form Fields - Order Information
  const todayStr = new Date().toISOString().split("T")[0];
  const defaultDeliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [deliveryDate, setDeliveryDate] = useState(defaultDeliveryDate);
  const [company, setCompany] = useState("Netlink");
  const [currency, setCurrency] = useState("USD");
  const [sellingPriceList, setSellingPriceList] = useState("Standard Selling");
  const [orderType, setOrderType] = useState("Sales");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");

  // Child table Items
  const [items, setItems] = useState<ItemRow[]>([
    {
      item_code: "",
      item_name: "",
      description: "",
      qty: 1,
      uom: "Nos",
      warehouse: "Stores - NSGAI",
      rate: 0,
      discount_percentage: 0,
      amount: 0,
    },
  ]);

  // Lookup data from ERPNext
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [availableItems, setAvailableItems] = useState<Array<{ name: string; item_name: string; stock_uom?: string; standard_rate?: number; description?: string }>>([]);
  const [availableWarehouses, setAvailableWarehouses] = useState<Array<{ name: string; warehouse_name: string }>>([]);
  const [linkedContacts, setLinkedContacts] = useState<Contact[]>([]);
  const [linkedAddresses, setLinkedAddresses] = useState<Address[]>([]);
  const [isLoadingLookups, setIsLoadingLookups] = useState(false);

  // Load master data on open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingLookups(true);

    Promise.all([
      getItems(),
      getWarehouses("Netlink"),
      getCustomers({ limit_page_length: 100 }),
    ])
      .then(([itemsRes, whRes, custRes]) => {
        if (!isMounted) return;
        setAvailableItems(itemsRes);
        setAvailableWarehouses(whRes);
        setAvailableCustomers(custRes.customers);

        // Prepopulate first item if row is empty
        if (itemsRes.length > 0 && items.length === 1 && !items[0].item_code) {
          const first = itemsRes[0];
          const defaultWh = whRes[0]?.name || "Stores - NSGAI";
          setItems([
            {
              item_code: first.name,
              item_name: first.item_name || first.name,
              description: first.description || first.item_name || "",
              qty: 1,
              uom: first.stock_uom || "Nos",
              warehouse: defaultWh,
              rate: first.standard_rate || 100,
              discount_percentage: 0,
              amount: (first.standard_rate || 100) * 1,
            },
          ]);
        }
      })
      .catch((err) => {
        console.error("Failed to load Sales Order metadata:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingLookups(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Sync customer prop if changed
  useEffect(() => {
    if (initialCustomer) {
      setCustomer(initialCustomer);
      setCustomerName(initialCustomerName || initialCustomer);
    }
  }, [initialCustomer, initialCustomerName]);

  // Load customer linked contacts and addresses whenever customer changes
  useEffect(() => {
    if (!customer) {
      setLinkedContacts([]);
      setLinkedAddresses([]);
      return;
    }

    let isMounted = true;
    Promise.all([
      getContactsForDoc("Customer", customer),
      getAddressesForDoc("Customer", customer),
    ])
      .then(([contacts, addresses]) => {
        if (!isMounted) return;
        setLinkedContacts(contacts);
        setLinkedAddresses(addresses);

        if (contacts.length > 0) {
          const primaryContact = contacts[0];
          setContactPerson(primaryContact.name);
          setContactEmail(primaryContact.email_id || "");
          setContactMobile(primaryContact.mobile_no || primaryContact.phone || "");
        } else {
          setContactPerson("");
          setContactEmail("");
          setContactMobile("");
        }

        if (addresses.length > 0) {
          const billing = addresses.find((a) => a.address_type === "Billing") || addresses[0];
          const shipping = addresses.find((a) => a.address_type === "Shipping") || addresses[0];
          setBillingAddress(billing.name);
          setShippingAddress(shipping.name);
        } else {
          setBillingAddress("");
          setShippingAddress("");
        }
      })
      .catch((err) => {
        console.warn("Could not load contacts/addresses for customer:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [customer]);

  // Update item selection
  const handleItemSelect = (index: number, itemCode: string) => {
    const selectedItem = availableItems.find((i) => i.name === itemCode);
    setItems((prev) => {
      const next = [...prev];
      const rate = selectedItem?.standard_rate || next[index].rate || 100;
      const qty = next[index].qty || 1;
      const discount = next[index].discount_percentage || 0;
      const amount = qty * rate * (1 - discount / 100);

      next[index] = {
        ...next[index],
        item_code: itemCode,
        item_name: selectedItem?.item_name || itemCode,
        description: selectedItem?.description || selectedItem?.item_name || itemCode,
        uom: selectedItem?.stock_uom || next[index].uom || "Nos",
        rate,
        amount,
      };
      return next;
    });
  };

  // Update row field
  const handleRowChange = (index: number, field: keyof ItemRow, val: unknown) => {
    setItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], [field]: val };

      // Recalculate amount if qty, rate, or discount changes
      if (field === "qty" || field === "rate" || field === "discount_percentage") {
        const qty = Number(row.qty) || 0;
        const rate = Number(row.rate) || 0;
        const disc = Number(row.discount_percentage) || 0;
        row.amount = Math.round(qty * rate * (1 - disc / 100) * 100) / 100;
      }

      next[index] = row;
      return next;
    });
  };

  // Add Row
  const handleAddRow = () => {
    const defaultWh = availableWarehouses[0]?.name || "Stores - NSGAI";
    const defaultItem = availableItems[0];
    setItems((prev) => [
      ...prev,
      {
        item_code: defaultItem?.name || "",
        item_name: defaultItem?.item_name || "",
        description: defaultItem?.description || defaultItem?.item_name || "",
        qty: 1,
        uom: defaultItem?.stock_uom || "Nos",
        warehouse: defaultWh,
        rate: defaultItem?.standard_rate || 100,
        discount_percentage: 0,
        amount: defaultItem ? (defaultItem.standard_rate || 100) * 1 : 0,
      },
    ]);
  };

  // Remove Row
  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      toast.error("Sales Order must have at least one line item.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculate Totals
  const netTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
  }, [items]);

  const grandTotal = netTotal;

  // Handle Submit / Save
  const handleSubmit = async (mode: "draft" | "submit") => {
    if (!customer) {
      toast.error("Please select a Customer.");
      return;
    }
    if (!deliveryDate) {
      toast.error("Please specify an Expected Delivery Date.");
      return;
    }
    if (items.length === 0) {
      toast.error("Please add at least one line item.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.item_code) {
        toast.error(`Line item #${i + 1} has no Item Code selected.`);
        return;
      }
      if (Number(it.qty) <= 0) {
        toast.error(`Line item #${i + 1} (${it.item_name || it.item_code}) must have quantity > 0.`);
        return;
      }
    }

    setSubmitMode(mode);
    setIsSubmitting(true);

    try {
      const orderPayload: Record<string, unknown> = {
        doctype: "Sales Order",
        customer,
        customer_name: customerName || customer,
        company,
        currency,
        selling_price_list: sellingPriceList,
        order_type: orderType,
        transaction_date: transactionDate,
        delivery_date: deliveryDate,
        items: items.map((it) => ({
          item_code: it.item_code,
          item_name: it.item_name,
          description: it.description,
          qty: Number(it.qty),
          uom: it.uom,
          warehouse: it.warehouse,
          rate: Number(it.rate),
          discount_percentage: Number(it.discount_percentage) || 0,
          amount: Number(it.amount),
          delivery_date: deliveryDate,
        })),
      };

      if (billingAddress) orderPayload.customer_address = billingAddress;
      if (shippingAddress) orderPayload.shipping_address_name = shippingAddress;
      if (contactPerson) orderPayload.contact_person = contactPerson;
      if (contactEmail) orderPayload.contact_email = contactEmail;
      if (contactMobile) orderPayload.contact_mobile = contactMobile;
      if (paymentTerms) orderPayload.payment_terms_template = paymentTerms;

      // 1. Create Document in ERPNext (starts in Draft)
      const savedDoc = await createSalesOrder(orderPayload);

      // 2. If user clicked "Save & Submit", submit it through Frappe RPC
      let finalDoc = savedDoc;
      if (mode === "submit") {
        try {
          finalDoc = await submitSalesOrder(savedDoc.name);
          toast.success(`Sales Order ${finalDoc.name} successfully created & submitted!`);
        } catch (subErr) {
          const subMsg = subErr instanceof Error ? subErr.message : "Failed to submit.";
          toast.success(`Sales Order ${savedDoc.name} saved as Draft. (Submission notice: ${subMsg})`);
        }
      } else {
        toast.success(`Sales Order ${savedDoc.name} saved as Draft.`);
      }

      onSuccess(finalDoc);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create Sales Order in ERPNext.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[94vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-so-modal-title"
      >
        {/* Header */}
        <div className="border-b border-neutral-200 bg-neutral-50/80 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-xs">
                <ShoppingCart className="h-5 w-5" />
              </div>
              <div>
                <h2 id="create-so-modal-title" className="text-lg font-bold text-neutral-900">
                  New Sales Order
                </h2>
                <p className="text-xs text-neutral-500">
                  Direct ERPNext Sales Order creation connected to inventory & delivery pipeline
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLoadingLookups && (
                <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Syncing items...
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Section 1: Customer Information */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
              <Building2 className="h-4 w-4 text-primary-600" />
              <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
                Customer & Contact Information
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Customer Selector */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Customer <span className="text-red-500">*</span>
                </label>
                {initialCustomer ? (
                  <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-semibold text-neutral-900 shadow-xs flex items-center justify-between">
                    <span>{customerName || customer}</span>
                    <span className="text-[10px] font-mono text-neutral-400">{customer}</span>
                  </div>
                ) : (
                  <select
                    value={customer}
                    onChange={(e) => {
                      const sel = availableCustomers.find((c) => c.name === e.target.value);
                      setCustomer(e.target.value);
                      setCustomerName(sel?.customer_name || e.target.value);
                    }}
                    className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                  >
                    <option value="">Select Customer...</option>
                    {availableCustomers.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.customer_name || c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Billing Address */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Billing Address
                </label>
                <select
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                >
                  <option value="">
                    {linkedAddresses.length === 0 ? "No linked addresses found" : "Select Billing Address..."}
                  </option>
                  {linkedAddresses.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.address_title} ({a.address_type || "Address"}) - {a.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shipping Address */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Shipping Address
                </label>
                <select
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                >
                  <option value="">
                    {linkedAddresses.length === 0 ? "No linked addresses found" : "Select Shipping Address..."}
                  </option>
                  {linkedAddresses.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.address_title} ({a.address_type || "Address"}) - {a.city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Person */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Contact Person
                </label>
                <select
                  value={contactPerson}
                  onChange={(e) => {
                    const c = linkedContacts.find((ct) => ct.name === e.target.value);
                    setContactPerson(e.target.value);
                    if (c) {
                      setContactEmail(c.email_id || "");
                      setContactMobile(c.mobile_no || c.phone || "");
                    }
                  }}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                >
                  <option value="">
                    {linkedContacts.length === 0 ? "No linked contacts" : "Select Contact..."}
                  </option>
                  {linkedContacts.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.first_name} {c.last_name || ""} {c.designation ? `(${c.designation})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Email */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@customer.com"
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                />
              </div>

              {/* Contact Phone / Mobile */}
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Contact Phone / Mobile
                </label>
                <input
                  type="text"
                  value={contactMobile}
                  onChange={(e) => setContactMobile(e.target.value)}
                  placeholder="+1 (555) 0123"
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Order Information */}
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
                Order Terms & Parameters
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Transaction Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Company
                </label>
                <select
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                >
                  <option value="Netlink">Netlink</option>
                  <option value="Bidsphere">Bidsphere</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Order Type
                </label>
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                >
                  <option value="Sales">Sales</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Shopping Cart">Shopping Cart</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Currency & Price List
                </label>
                <div className="flex gap-2">
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-24 rounded-lg border border-neutral-200 bg-white py-2 px-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                  <select
                    value={sellingPriceList}
                    onChange={(e) => setSellingPriceList(e.target.value)}
                    className="flex-1 rounded-lg border border-neutral-200 bg-white py-2 px-2 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                  >
                    <option value="Standard Selling">Standard Selling</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g. Net 30, Due on Receipt"
                  className="w-full rounded-lg border border-neutral-200 bg-white py-2 px-3 text-xs text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Items Child Table */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary-600" />
                <h3 className="font-bold text-neutral-900 uppercase tracking-wider text-[11px]">
                  Order Items & Warehouse Allocation
                </h3>
                <span className="rounded-full bg-primary-100 px-2 py-0.2 text-[10px] font-bold text-primary-800">
                  {items.length} {items.length === 1 ? "Line" : "Lines"}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/80 text-neutral-600 font-semibold">
                    <th className="py-2.5 px-3 min-w-[200px]">Item Code / Name</th>
                    <th className="py-2.5 px-2 w-20 text-right">Qty</th>
                    <th className="py-2.5 px-2 w-20">UOM</th>
                    <th className="py-2.5 px-2 min-w-[150px]">Source Warehouse</th>
                    <th className="py-2.5 px-2 w-24 text-right">Rate ({currency})</th>
                    <th className="py-2.5 px-2 w-20 text-right">Disc %</th>
                    <th className="py-2.5 px-3 w-28 text-right">Amount ({currency})</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/60 transition-colors">
                      {/* Item Selector */}
                      <td className="py-2 px-3">
                        <select
                          value={row.item_code}
                          onChange={(e) => handleItemSelect(idx, e.target.value)}
                          className="w-full rounded-md border border-neutral-200 bg-white py-1.5 px-2 text-xs font-medium text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                        >
                          <option value="">Select Item...</option>
                          {availableItems.map((it) => (
                            <option key={it.name} value={it.name}>
                              {it.name} — {it.item_name}
                            </option>
                          ))}
                        </select>
                        {row.item_name && row.item_name !== row.item_code && (
                          <div className="mt-0.5 text-[11px] text-neutral-500 truncate max-w-[240px]">
                            {row.item_name}
                          </div>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.qty}
                          onChange={(e) => handleRowChange(idx, "qty", Math.max(1, parseFloat(e.target.value) || 0))}
                          className="w-full rounded-md border border-neutral-200 bg-white py-1.5 px-2 text-right text-xs font-semibold text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                        />
                      </td>

                      {/* UOM */}
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={row.uom}
                          onChange={(e) => handleRowChange(idx, "uom", e.target.value)}
                          className="w-full rounded-md border border-neutral-200 bg-white py-1.5 px-2 text-xs text-neutral-700 focus:border-primary-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Warehouse */}
                      <td className="py-2 px-2">
                        <select
                          value={row.warehouse}
                          onChange={(e) => handleRowChange(idx, "warehouse", e.target.value)}
                          className="w-full rounded-md border border-neutral-200 bg-white py-1.5 px-2 text-xs text-neutral-800 focus:border-primary-500 focus:outline-hidden"
                        >
                          {availableWarehouses.map((w) => (
                            <option key={w.name} value={w.name}>
                              {w.warehouse_name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Rate */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={row.rate}
                          onChange={(e) => handleRowChange(idx, "rate", Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full rounded-md border border-neutral-200 bg-white py-1.5 px-2 text-right text-xs font-semibold text-neutral-900 focus:border-primary-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Discount % */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={row.discount_percentage}
                          onChange={(e) => handleRowChange(idx, "discount_percentage", Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                          className="w-full rounded-md border border-neutral-200 bg-white py-1.5 px-2 text-right text-xs text-neutral-700 focus:border-primary-500 focus:outline-hidden"
                        />
                      </td>

                      {/* Amount */}
                      <td className="py-2 px-3 text-right font-bold text-neutral-900">
                        ${row.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Remove Button */}
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={items.length <= 1}
                          className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-400 transition-colors"
                          title="Remove row"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary */}
            <div className="flex flex-col items-end pt-3 border-t border-neutral-200 space-y-1.5 text-xs">
              <div className="flex justify-between w-64 text-neutral-600">
                <span>Net Total:</span>
                <span className="font-semibold text-neutral-900">
                  ${netTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between w-64 text-neutral-600">
                <span>Taxes & Charges:</span>
                <span className="font-medium text-neutral-700">$0.00</span>
              </div>
              <div className="flex justify-between w-64 pt-2 border-t border-neutral-200 text-sm font-bold text-neutral-900">
                <span>Grand Total ({currency}):</span>
                <span className="text-primary-700 font-mono">
                  ${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors shadow-xs"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit("draft")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 transition-colors shadow-xs"
            >
              {isSubmitting && submitMode === "draft" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit("submit")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              {isSubmitting && submitMode === "submit" ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Submitting to ERPNext...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save & Submit Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
