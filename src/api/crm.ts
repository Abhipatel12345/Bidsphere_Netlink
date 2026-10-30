import { erpnext } from "./erpnext";
import type {
  Address,
  Campaign,
  Contact,
  Customer,
  CustomerGroup,
  DocTypeMeta,
  Lead,
  LinkOption,
  Opportunity,
  OpportunityStatus,
  OpportunityType,
  SalesPerson,
  SalesStage,
  Territory,
  UTMSource,
  BrandDoc,
  ComplaintDoc,
  ComplaintFilterParams,
  ComplaintStatus,
  DeliveryNoteDoc,
  OrderDeliveryTrackingRecord,
  SalesOrderDoc,
} from "../types/crm";

export interface PaginationParams {
  limit_start?: number;
  limit_page_length?: number;
  order_by?: string;
}

export interface LeadFilterParams extends PaginationParams {
  search?: string;
  status?: string;
  utm_source?: string;
  lead_owner?: string;
  territory?: string;
}

export interface OpportunityFilterParams extends PaginationParams {
  search?: string;
  status?: string;
  sales_stage?: string;
  opportunity_from?: string;
  opportunity_owner?: string;
}

export interface CustomerFilterParams extends PaginationParams {
  search?: string;
  customer_group?: string;
  territory?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Robust Parsing Helpers (supports unwrapped and raw Axios responses)
// ─────────────────────────────────────────────────────────────────────────────

export function parseRecords<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    if ("data" in r && Array.isArray(r.data)) return r.data as T[];
    if ("message" in r && Array.isArray(r.message)) return r.message as T[];
  }
  return [];
}

export function parseDoc<T>(res: unknown): T {
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    if ("data" in r && r.data && typeof r.data === "object" && !Array.isArray(r.data)) {
      return r.data as T;
    }
    if ("message" in r && r.message && typeof r.message === "object" && !Array.isArray(r.message)) {
      return r.message as T;
    }
  }
  return res as T;
}

export function parseCount(res: unknown): number {
  if (typeof res === "number") return res;
  if (res && typeof res === "object") {
    const r = res as Record<string, unknown>;
    if ("message" in r && typeof r.message === "number") {
      return r.message;
    }
    if ("data" in r) {
      const d = r.data;
      if (typeof d === "number") return d;
      if (d && typeof d === "object" && "message" in (d as Record<string, unknown>)) {
        const m = (d as Record<string, unknown>).message;
        if (typeof m === "number") return m;
      }
      if (Array.isArray(d)) return d.length;
    }
    if (Array.isArray(res)) return res.length;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Sales Stages Pipeline Specification
// ─────────────────────────────────────────────────────────────────────────────

export const CANONICAL_SALES_STAGES = [
  "Prospecting",
  "Qualification",
  "Needs Analysis",
  "Value Proposition",
  "Identifying Decision Makers",
  "Perception Analysis",
  "Demo / Solution Validation",
  "Proposal / Price Quote",
  "Negotiation / Review",
] as const;

export type CanonicalSalesStage = (typeof CANONICAL_SALES_STAGES)[number];

export function normalizeStageName(name: string): string {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/\s*\/\s*/g, "/");
}

export function getStageOrderIndex(stageName: string): number {
  if (!stageName) return 999;
  const norm = normalizeStageName(stageName);
  const idx = CANONICAL_SALES_STAGES.findIndex(
    (s) => normalizeStageName(s) === norm
  );
  return idx !== -1 ? idx : 999;
}

export function sortSalesStages<
  T extends { name?: string; stage_name?: string; value?: string; label?: string }
>(stages: T[]): T[] {
  return [...stages].sort((a, b) => {
    const nameA = a.stage_name || a.name || a.value || a.label || "";
    const nameB = b.stage_name || b.name || b.value || b.label || "";
    const idxA = getStageOrderIndex(nameA);
    const idxB = getStageOrderIndex(nameB);
    if (idxA !== idxB) return idxA - idxB;
    return nameA.localeCompare(nameB);
  });
}

export function formatOpportunityAmount(
  amount: number | string | undefined,
  currency = "USD"
): string {
  const num = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${currency || "$"}${num.toLocaleString()}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Leads API
// ─────────────────────────────────────────────────────────────────────────────

export async function getLeads(params: LeadFilterParams = {}): Promise<{ leads: Lead[]; total: number }> {
  const filters: [string, string, string, unknown][] = [];

  if (params.status) {
    filters.push(["Lead", "status", "=", params.status]);
  }
  if (params.utm_source) {
    filters.push(["Lead", "utm_source", "=", params.utm_source]);
  }
  if (params.lead_owner) {
    filters.push(["Lead", "lead_owner", "=", params.lead_owner]);
  }
  if (params.territory) {
    filters.push(["Lead", "territory", "=", params.territory]);
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    filters.push(["Lead", "lead_name", "like", q]);
  }

  const queryParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "lead_name",
      "first_name",
      "last_name",
      "company_name",
      "email_id",
      "mobile_no",
      "phone",
      "status",
      "type",
      "utm_source",
      "lead_owner",
      "territory",
      "annual_revenue",
      "industry",
      "lead_date",
      "creation",
      "modified",
      "customer",
    ]),
    order_by: params.order_by ?? "modified desc",
    limit_start: String(params.limit_start ?? 0),
    limit_page_length: String(params.limit_page_length ?? 50),
  });

  if (filters.length > 0) {
    queryParams.set("filters", JSON.stringify(filters));
  }

  const [listRes, countRes] = await Promise.all([
    erpnext.get<unknown>(`/api/resource/Lead?${queryParams.toString()}`),
    erpnext
      .get<unknown>(
        `/api/method/frappe.client.get_count?doctype=Lead${
          filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
        }`
      )
      .catch(() => null),
  ]);

  const leads = parseRecords<Lead>(listRes);
  const total = countRes !== null ? parseCount(countRes) : leads.length;

  return { leads, total };
}

/**
 * Extracts clean user-facing error message from Frappe API response or exception.
 */
export function extractFrappeErrorMessage(err: unknown): string {
  if (err && typeof err === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const axErr = err as any;
    const data = axErr.response?.data;
    if (data?._server_messages) {
      try {
        const msgs = JSON.parse(data._server_messages);
        if (Array.isArray(msgs) && msgs.length > 0) {
          const first = typeof msgs[0] === "string" ? JSON.parse(msgs[0]) : msgs[0];
          if (first.message) {
            return String(first.message).replace(/<[^>]+>/g, "").trim();
          }
        }
      } catch {
        // fallback
      }
    }
    if (data?.exception) {
      const parts = String(data.exception).split(":");
      if (parts.length > 1) {
        return parts.slice(1).join(":").trim();
      }
      return String(data.exception);
    }
    if (data?.message) {
      return String(data.message);
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "An unexpected error occurred while communicating with ERPNext.";
}

/**
 * Fetch official Frappe DocType schema metadata directly from ERPNext.
 */
export async function getDocTypeMeta(doctype: string): Promise<DocTypeMeta> {
  try {
    const res = await erpnext.get<unknown>(
      `/api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(doctype)}`
    );
    const data = res as unknown as Record<string, unknown>;
    const docs = (data?.docs as DocTypeMeta[]) ?? (data?.data as Record<string, unknown>)?.docs;
    if (Array.isArray(docs) && docs.length > 0) {
      return docs[0];
    }
  } catch {
    // fallback to resource endpoint
  }

  const res = await erpnext.get<unknown>(`/api/resource/DocType/${encodeURIComponent(doctype)}`);
  return parseDoc<DocTypeMeta>(res);
}

export async function searchLinkField(
  doctype: string,
  txt = "",
  signal?: AbortSignal
): Promise<LinkOption[]> {
  if (!doctype) return [];

  // Special case: ERPNext Opportunity opportunity_from has target DocType, which should be Lead or Customer in CRM
  if (doctype === "DocType") {
    return [
      { value: "Lead", label: "Lead" },
      { value: "Customer", label: "Customer" },
    ];
  }

  try {
    const res = await erpnext.post<unknown>(
      "/api/method/frappe.desk.search.search_link",
      {
        doctype,
        txt,
        page_length: 100,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true, signal } as any
    );

    // Axios interceptor in erpnext.ts automatically unpacks response.data.message
    // So `res` is directly the Array of items when search_link succeeds!
    let list: Array<{ value: string; label?: string; description?: string }> = [];
    if (Array.isArray(res)) {
      list = res;
    } else if (res && typeof res === "object") {
      const raw = res as unknown as Record<string, unknown>;
      if (Array.isArray(raw.message)) {
        list = raw.message as Array<{ value: string; label?: string; description?: string }>;
      } else if (Array.isArray(raw.data)) {
        list = raw.data as Array<{ value: string; label?: string; description?: string }>;
      } else if (
        raw.data &&
        typeof raw.data === "object" &&
        Array.isArray((raw.data as Record<string, unknown>).message)
      ) {
        list = (raw.data as Record<string, unknown>).message as Array<{
          value: string;
          label?: string;
          description?: string;
        }>;
      }
    }

    if (Array.isArray(list) && list.length > 0) {
      const mapped = list.map((item) => ({
        value: item.value,
        label:
          item.label && item.label !== item.value
            ? `${item.label} (${item.value})`
            : item.label || item.value,
        description: item.description,
      }));
      return doctype === "Sales Stage" ? sortSalesStages(mapped) : mapped;
    }
  } catch {
    // fallback to resource endpoint below
  }

  try {
    const listRes = await erpnext.get<unknown>(
      `/api/resource/${encodeURIComponent(doctype)}?fields=["name"]&limit_page_length=100`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    const records = parseRecords<{ name: string }>(listRes);
    const mapped = records.map((r) => ({ value: r.name, label: r.name }));
    return doctype === "Sales Stage" ? sortSalesStages(mapped) : mapped;
  } catch {
    return [];
  }
}

export async function getLead(name: string): Promise<Lead> {
  const res = await erpnext.get<unknown>(`/api/resource/Lead/${encodeURIComponent(name)}`);
  return parseDoc<Lead>(res);
}

export async function createLead(data: Partial<Lead> | Record<string, unknown>): Promise<Lead> {
  const payload = {
    doctype: "Lead",
    ...data,
  };
  try {
    const res = await erpnext.post<unknown>(
      "/api/resource/Lead",
      payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Lead>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateLead(
  name: string,
  data: Partial<Lead> | Record<string, unknown>
): Promise<Lead> {
  try {
    const res = await erpnext.put<unknown>(
      `/api/resource/Lead/${encodeURIComponent(name)}`,
      data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Lead>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function deleteLead(name: string): Promise<void> {
  await erpnext.delete(`/api/resource/Lead/${encodeURIComponent(name)}`);
}

/**
 * Converts a Lead to Customer using ERPNext's official business logic method.
 */
export async function makeCustomerFromLead(leadName: string): Promise<Customer> {
  const res = await erpnext.post<unknown>(
    "/api/method/erpnext.crm.doctype.lead.lead.make_customer",
    { source_name: leadName }
  );
  const customerDoc = parseDoc<Customer>(res);
  if (!customerDoc) throw new Error("ERPNext could not map Customer from Lead.");

  const saveRes = await erpnext.post<unknown>("/api/resource/Customer", customerDoc);
  return parseDoc<Customer>(saveRes);
}

/**
 * Converts a Lead to Opportunity using ERPNext's official business logic method.
 */
export async function makeOpportunityFromLead(leadName: string): Promise<Opportunity> {
  const res = await erpnext.post<unknown>(
    "/api/method/erpnext.crm.doctype.lead.lead.make_opportunity",
    { source_name: leadName }
  );
  const oppDoc = parseDoc<Opportunity>(res);
  if (!oppDoc) throw new Error("ERPNext could not map Opportunity from Lead.");

  const saveRes = await erpnext.post<unknown>("/api/resource/Opportunity", oppDoc);
  return parseDoc<Opportunity>(saveRes);
}

// ─────────────────────────────────────────────────────────────────────────────
// Opportunities API
// ─────────────────────────────────────────────────────────────────────────────

export async function getOpportunities(
  params: OpportunityFilterParams = {}
): Promise<{ opportunities: Opportunity[]; total: number }> {
  const filters: [string, string, string, unknown][] = [];

  if (params.status) {
    filters.push(["Opportunity", "status", "=", params.status]);
  }
  if (params.sales_stage) {
    filters.push(["Opportunity", "sales_stage", "=", params.sales_stage]);
  }
  if (params.opportunity_from) {
    filters.push(["Opportunity", "opportunity_from", "=", params.opportunity_from]);
  }
  if (params.opportunity_owner) {
    filters.push(["Opportunity", "opportunity_owner", "=", params.opportunity_owner]);
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    filters.push(["Opportunity", "title", "like", q]);
  }

  const queryParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "title",
      "opportunity_from",
      "party_name",
      "status",
      "opportunity_type",
      "sales_stage",
      "expected_closing",
      "probability",
      "opportunity_amount",
      "currency",
      "opportunity_owner",
      "utm_source",
      "transaction_date",
      "creation",
      "modified",
    ]),
    order_by: params.order_by ?? "modified desc",
    limit_start: String(params.limit_start ?? 0),
    limit_page_length: String(params.limit_page_length ?? 50),
  });

  if (filters.length > 0) {
    queryParams.set("filters", JSON.stringify(filters));
  }

  const [listRes, countRes] = await Promise.all([
    erpnext.get<unknown>(`/api/resource/Opportunity?${queryParams.toString()}`),
    erpnext
      .get<unknown>(
        `/api/method/frappe.client.get_count?doctype=Opportunity${
          filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
        }`
      )
      .catch(() => null),
  ]);

  const opportunities = parseRecords<Opportunity>(listRes);
  const total = countRes !== null ? parseCount(countRes) : opportunities.length;

  return { opportunities, total };
}

export async function getOpportunity(name: string): Promise<Opportunity> {
  const res = await erpnext.get<unknown>(
    `/api/resource/Opportunity/${encodeURIComponent(name)}`
  );
  return parseDoc<Opportunity>(res);
}

export async function createOpportunity(
  data: Partial<Opportunity> | Record<string, unknown>
): Promise<Opportunity> {
  const payload = {
    doctype: "Opportunity",
    status: "Open",
    company: "Netlink",
    ...data,
  };
  try {
    const res = await erpnext.post<unknown>(
      "/api/resource/Opportunity",
      payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Opportunity>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateOpportunity(
  name: string,
  data: Partial<Opportunity> | Record<string, unknown>
): Promise<Opportunity> {
  try {
    const res = await erpnext.put<unknown>(
      `/api/resource/Opportunity/${encodeURIComponent(name)}`,
      data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Opportunity>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateOpportunityStage(name: string, sales_stage: string): Promise<Opportunity> {
  return updateOpportunity(name, { sales_stage });
}

export async function updateOpportunityStatus(
  name: string,
  status: OpportunityStatus
): Promise<Opportunity> {
  return updateOpportunity(name, { status });
}

export async function deleteOpportunity(name: string): Promise<void> {
  await erpnext.delete(`/api/resource/Opportunity/${encodeURIComponent(name)}`);
}

/**
 * Converts an Opportunity to a Quotation using official ERPNext method.
 */
export async function makeQuotationFromOpportunity(oppName: string): Promise<Record<string, unknown>> {
  const res = await erpnext.post<unknown>(
    "/api/method/erpnext.crm.doctype.opportunity.opportunity.make_quotation",
    { source_name: oppName }
  );
  const quotationDoc = parseDoc<Record<string, unknown>>(res);
  if (!quotationDoc) throw new Error("ERPNext could not map Quotation from Opportunity.");

  const saveRes = await erpnext.post<unknown>(
    "/api/resource/Quotation",
    quotationDoc
  );
  return parseDoc<Record<string, unknown>>(saveRes);
}

// ─────────────────────────────────────────────────────────────────────────────
// Opportunity Items / ERPNext Item Search
// ─────────────────────────────────────────────────────────────────────────────

export interface ErpItemSearchResult {
  value: string;
  label: string;
  description: string;
}

export interface ErpItemDetails {
  item_code: string;
  item_name: string;
  description: string;
  uom: string;
  rate: number;
  item_group?: string;
  brand?: string;
}

export async function searchOpportunityItems(query: string = ""): Promise<ErpItemSearchResult[]> {
  const items = await searchLinkField("Item", query);
  return items.map((it) => ({
    value: it.value,
    label: it.label || it.value,
    description: it.description || "",
  }));
}

export async function getItemDetails(itemCode: string): Promise<ErpItemDetails> {
  const trimmed = itemCode.trim();
  if (!trimmed) {
    return {
      item_code: "",
      item_name: "",
      description: "",
      uom: "Nos",
      rate: 0,
    };
  }

  try {
    const res = await erpnext.get<unknown>(
      `/api/resource/Item/${encodeURIComponent(trimmed)}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    const doc = parseDoc<Record<string, unknown>>(res);

    let rate = Number(doc.standard_rate) || 0;
    // If standard_rate is 0, check Item Price for selling/buying rate
    if (rate === 0) {
      try {
        const priceFilter = JSON.stringify([["item_code", "=", trimmed]]);
        const priceRes = await erpnext.get<unknown>(
          `/api/resource/Item Price?filters=${encodeURIComponent(priceFilter)}&fields=["price_list_rate"]&limit_page_length=1`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          { _silent: true } as any
        );
        const prices = parseRecords<{ price_list_rate?: number }>(priceRes);
        if (prices.length > 0 && Number(prices[0].price_list_rate) > 0) {
          rate = Number(prices[0].price_list_rate);
        }
      } catch {
        // ignore price lookup errors
      }
    }

    const cleanDesc = doc.description
      ? String(doc.description).replace(/<[^>]+>/g, "").trim()
      : String(doc.item_name || trimmed);

    return {
      item_code: String(doc.item_code || doc.name || trimmed),
      item_name: String(doc.item_name || trimmed),
      description: cleanDesc,
      uom: String(doc.stock_uom || "Nos"),
      rate,
      item_group: doc.item_group ? String(doc.item_group) : undefined,
      brand: doc.brand ? String(doc.brand) : undefined,
    };
  } catch {
    return {
      item_code: trimmed,
      item_name: trimmed,
      description: trimmed,
      uom: "Nos",
      rate: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Customers API
// ─────────────────────────────────────────────────────────────────────────────

export async function getCustomers(
  params: CustomerFilterParams = {}
): Promise<{ customers: Customer[]; total: number }> {
  const filters: [string, string, string, unknown][] = [];

  if (params.customer_group) {
    filters.push(["Customer", "customer_group", "=", params.customer_group]);
  }
  if (params.territory) {
    filters.push(["Customer", "territory", "=", params.territory]);
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    filters.push(["Customer", "customer_name", "like", q]);
  }

  const queryParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "customer_name",
      "customer_type",
      "customer_group",
      "territory",
      "email_id",
      "mobile_no",
      "creation",
      "modified",
      "disabled",
    ]),
    order_by: params.order_by ?? "modified desc",
    limit_start: String(params.limit_start ?? 0),
    limit_page_length: String(params.limit_page_length ?? 50),
  });

  if (filters.length > 0) {
    queryParams.set("filters", JSON.stringify(filters));
  }

  const [listRes, countRes] = await Promise.all([
    erpnext.get<unknown>(`/api/resource/Customer?${queryParams.toString()}`),
    erpnext
      .get<unknown>(
        `/api/method/frappe.client.get_count?doctype=Customer${
          filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
        }`
      )
      .catch(() => null),
  ]);

  const customers = parseRecords<Customer>(listRes);
  const total = countRes !== null ? parseCount(countRes) : customers.length;

  return { customers, total };
}

export async function getCustomer(name: string): Promise<Customer> {
  const res = await erpnext.get<unknown>(
    `/api/resource/Customer/${encodeURIComponent(name)}`
  );
  return parseDoc<Customer>(res);
}

export async function createCustomer(
  data: Partial<Customer> | Record<string, unknown>
): Promise<Customer> {
  const payload = {
    doctype: "Customer",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "All Territories",
    ...data,
  };
  try {
    const res = await erpnext.post<unknown>(
      "/api/resource/Customer",
      payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Customer>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateCustomer(
  name: string,
  data: Partial<Customer> | Record<string, unknown>
): Promise<Customer> {
  try {
    const res = await erpnext.put<unknown>(
      `/api/resource/Customer/${encodeURIComponent(name)}`,
      data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Customer>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function deleteCustomer(name: string): Promise<void> {
  await erpnext.delete(`/api/resource/Customer/${encodeURIComponent(name)}`);
}

export async function getCustomerRelatedRecords(customerName: string): Promise<{
  opportunities: Opportunity[];
  contacts: Contact[];
  addresses: Address[];
}> {
  const [opps, contacts, addresses] = await Promise.all([
    erpnext
      .get<unknown>(
        `/api/resource/Opportunity?filters=${encodeURIComponent(
          JSON.stringify([["party_name", "=", customerName]])
        )}&fields=["name","title","sales_stage","status","opportunity_amount","expected_closing","modified"]`
      )
      .then((r) => parseRecords<Opportunity>(r))
      .catch(() => []),
    getContactsForDoc("Customer", customerName).catch(() => []),
    getAddressesForDoc("Customer", customerName).catch(() => []),
  ]);

  return { opportunities: opps, contacts, addresses };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contacts & Addresses API
// ─────────────────────────────────────────────────────────────────────────────

export async function getContacts(search?: string): Promise<Contact[]> {
  const filters: [string, string, string, unknown][] = [];
  if (search?.trim()) {
    filters.push(["Contact", "first_name", "like", `%${search.trim()}%`]);
  }
  const query = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "first_name",
      "last_name",
      "email_id",
      "mobile_no",
      "phone",
      "department",
      "designation",
      "company_name",
      "modified",
    ]),
    order_by: "modified desc",
    limit_page_length: "100",
  });
  if (filters.length > 0) query.set("filters", JSON.stringify(filters));

  const res = await erpnext.get<unknown>(`/api/resource/Contact?${query.toString()}`);
  return parseRecords<Contact>(res);
}

export async function getContact(name: string): Promise<Contact> {
  const res = await erpnext.get<unknown>(`/api/resource/Contact/${encodeURIComponent(name)}`);
  return parseDoc<Contact>(res);
}

export async function createContact(
  data: Partial<Contact> | Record<string, unknown>
): Promise<Contact> {
  const payload: Record<string, unknown> = {
    doctype: "Contact",
    ...data,
  };

  // Sync primary email and phone to child tables if provided
  if (data.email_id && (!payload.email_ids || (Array.isArray(payload.email_ids) && payload.email_ids.length === 0))) {
    payload.email_ids = [{ email_id: String(data.email_id), is_primary: 1 }];
  }
  if ((data.mobile_no || data.phone) && (!payload.phone_nos || (Array.isArray(payload.phone_nos) && payload.phone_nos.length === 0))) {
    payload.phone_nos = [
      {
        phone: String(data.mobile_no || data.phone),
        is_primary_mobile_no: data.mobile_no ? 1 : 0,
        is_primary_phone: data.phone ? 1 : 0,
      },
    ];
  }

  try {
    const res = await erpnext.post<unknown>(
      "/api/resource/Contact",
      payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Contact>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateContact(
  name: string,
  data: Partial<Contact> | Record<string, unknown>
): Promise<Contact> {
  try {
    const res = await erpnext.put<unknown>(
      `/api/resource/Contact/${encodeURIComponent(name)}`,
      data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Contact>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function deleteContact(name: string): Promise<void> {
  await erpnext.delete(`/api/resource/Contact/${encodeURIComponent(name)}`);
}

export async function getContactsForDoc(_link_doctype: string, link_name: string): Promise<Contact[]> {
  try {
    const filter = JSON.stringify([
      ["Contact", "name", "like", `%${link_name}%`],
    ]);
    const res = await erpnext.get<unknown>(
      `/api/resource/Contact?filters=${encodeURIComponent(filter)}&fields=["name","first_name","last_name","email_id","mobile_no","phone","designation","company_name"]&limit_page_length=50`,
      { _silent: true } as unknown as import("axios").AxiosRequestConfig
    );
    return parseRecords<Contact>(res);
  } catch {
    return [];
  }
}

export async function getAddresses(search?: string): Promise<Address[]> {
  const filters: [string, string, string, unknown][] = [];
  if (search?.trim()) {
    filters.push(["Address", "address_title", "like", `%${search.trim()}%`]);
  }
  const query = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "address_title",
      "address_type",
      "address_line1",
      "city",
      "state",
      "country",
      "pincode",
      "phone",
      "email_id",
      "modified",
    ]),
    order_by: "modified desc",
    limit_page_length: "100",
  });
  if (filters.length > 0) query.set("filters", JSON.stringify(filters));

  const res = await erpnext.get<unknown>(`/api/resource/Address?${query.toString()}`);
  return parseRecords<Address>(res);
}

export async function getAddress(name: string): Promise<Address> {
  const res = await erpnext.get<unknown>(`/api/resource/Address/${encodeURIComponent(name)}`);
  return parseDoc<Address>(res);
}

export async function createAddress(
  data: Partial<Address> | Record<string, unknown>
): Promise<Address> {
  const payload = {
    doctype: "Address",
    country: "United States",
    ...data,
  };
  try {
    const res = await erpnext.post<unknown>(
      "/api/resource/Address",
      payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Address>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateAddress(
  name: string,
  data: Partial<Address> | Record<string, unknown>
): Promise<Address> {
  try {
    const res = await erpnext.put<unknown>(
      `/api/resource/Address/${encodeURIComponent(name)}`,
      data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Address>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function deleteAddress(name: string): Promise<void> {
  await erpnext.delete(`/api/resource/Address/${encodeURIComponent(name)}`);
}

export async function getAddressesForDoc(_link_doctype: string, link_name: string): Promise<Address[]> {
  try {
    const firstWord = link_name.split(" ")[0] || link_name;
    const filter = JSON.stringify([
      ["Address", "address_title", "like", `%${firstWord}%`],
    ]);
    const res = await erpnext.get<unknown>(
      `/api/resource/Address?filters=${encodeURIComponent(filter)}&fields=["name","address_title","address_type","address_line1","city","state","country","pincode"]&limit_page_length=50`,
      { _silent: true } as unknown as import("axios").AxiosRequestConfig
    );
    return parseRecords<Address>(res);
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Campaigns API
// ─────────────────────────────────────────────────────────────────────────────

export async function getCampaigns(search?: string): Promise<Campaign[]> {
  const filters: [string, string, string, unknown][] = [];
  if (search?.trim()) {
    filters.push(["Campaign", "campaign_name", "like", `%${search.trim()}%`]);
  }
  const query = new URLSearchParams({
    fields: JSON.stringify(["name", "campaign_name", "description", "modified", "creation"]),
    order_by: "modified desc",
    limit_page_length: "100",
  });
  if (filters.length > 0) query.set("filters", JSON.stringify(filters));

  const res = await erpnext.get<unknown>(`/api/resource/Campaign?${query.toString()}`);
  return parseRecords<Campaign>(res);
}

export async function getCampaign(name: string): Promise<Campaign> {
  const res = await erpnext.get<unknown>(
    `/api/resource/Campaign/${encodeURIComponent(name)}`
  );
  return parseDoc<Campaign>(res);
}

export async function getCampaignRelated(campaignName: string): Promise<{
  leads: Lead[];
  opportunities: Opportunity[];
}> {
  const [leads, opps] = await Promise.all([
    erpnext
      .get<unknown>(
        `/api/resource/Lead?filters=${encodeURIComponent(
          JSON.stringify([["utm_campaign", "=", campaignName]])
        )}&fields=["name","lead_name","company_name","status","email_id","mobile_no","creation"]&limit_page_length=50`
      )
      .then((r) => parseRecords<Lead>(r))
      .catch(() => []),
    erpnext
      .get<unknown>(
        `/api/resource/Opportunity?filters=${encodeURIComponent(
          JSON.stringify([["utm_campaign", "=", campaignName]])
        )}&fields=["name","title","party_name","status","opportunity_amount","sales_stage","modified"]&limit_page_length=50`
      )
      .then((r) => parseRecords<Opportunity>(r))
      .catch(() => []),
  ]);
  return { leads, opportunities: opps };
}

export async function createCampaign(
  data: Partial<Campaign> | Record<string, unknown>
): Promise<Campaign> {
  const payload = {
    doctype: "Campaign",
    ...data,
  };
  try {
    const res = await erpnext.post<unknown>(
      "/api/resource/Campaign",
      payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Campaign>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateCampaign(
  name: string,
  data: Partial<Campaign> | Record<string, unknown>
): Promise<Campaign> {
  try {
    const res = await erpnext.put<unknown>(
      `/api/resource/Campaign/${encodeURIComponent(name)}`,
      data,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    return parseDoc<Campaign>(res);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function deleteCampaign(name: string): Promise<void> {
  try {
    try {
      await erpnext.delete(`/api/resource/UTM Campaign/${encodeURIComponent(name)}`, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        _silent: true,
      } as any);
    } catch {
      // UTM Campaign may not exist or might have already been removed
    }
    await erpnext.delete(`/api/resource/Campaign/${encodeURIComponent(name)}`);
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Masters & Setup API
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesStages(): Promise<SalesStage[]> {
  const res = await erpnext.get<unknown>(
    '/api/resource/Sales Stage?fields=["name","stage_name"]&limit_page_length=100'
  );
  const records = parseRecords<SalesStage>(res);
  return sortSalesStages(records);
}

export async function createSalesStage(stage_name: string): Promise<SalesStage> {
  const res = await erpnext.post<unknown>("/api/resource/Sales Stage", {
    doctype: "Sales Stage",
    stage_name,
  });
  return parseDoc<SalesStage>(res);
}

export async function getOpportunityTypes(): Promise<OpportunityType[]> {
  const res = await erpnext.get<unknown>(
    '/api/resource/Opportunity Type?fields=["name"]&limit_page_length=100'
  );
  return parseRecords<OpportunityType>(res);
}

export async function createOpportunityType(name: string): Promise<OpportunityType> {
  const res = await erpnext.post<unknown>("/api/resource/Opportunity Type", {
    doctype: "Opportunity Type",
    name,
  });
  return parseDoc<OpportunityType>(res);
}

/**
 * UTM Source is used for Lead Source in ERPNext v16.
 */
export async function getUTMSources(): Promise<UTMSource[]> {
  const res = await erpnext.get<unknown>(
    '/api/resource/UTM Source?fields=["name"]&limit_page_length=100'
  );
  return parseRecords<UTMSource>(res);
}

export async function createUTMSource(name: string): Promise<UTMSource> {
  const res = await erpnext.post<unknown>("/api/resource/UTM Source", {
    doctype: "UTM Source",
    name,
  });
  return parseDoc<UTMSource>(res);
}

export async function getCustomerGroups(): Promise<CustomerGroup[]> {
  const res = await erpnext.get<unknown>(
    '/api/resource/Customer Group?fields=["name"]&limit_page_length=100'
  );
  return parseRecords<CustomerGroup>(res);
}

export async function getTerritories(): Promise<Territory[]> {
  const res = await erpnext.get<unknown>(
    '/api/resource/Territory?fields=["name"]&limit_page_length=100'
  );
  return parseRecords<Territory>(res);
}

export async function getSalesPersons(): Promise<SalesPerson[]> {
  const res = await erpnext.get<unknown>(
    '/api/resource/Sales Person?fields=["name","sales_person_name"]&limit_page_length=100'
  );
  return parseRecords<SalesPerson>(res);
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline, Notes, Comments, Attachments
// ─────────────────────────────────────────────────────────────────────────────

export interface CrmTimelineItem {
  id: string;
  type: "comment" | "communication" | "activity";
  subject?: string;
  content: string;
  sender?: string;
  date: string;
}

export async function getCrmTimeline(doctype: string, docname: string): Promise<CrmTimelineItem[]> {
  const items: CrmTimelineItem[] = [];

  // Fetch comments
  try {
    const commentFilter = JSON.stringify([
      ["reference_doctype", "=", doctype],
      ["reference_name", "=", docname],
      ["comment_type", "=", "Comment"],
    ]);
    const commentRes = await erpnext.get<unknown>(
      `/api/resource/Comment?filters=${encodeURIComponent(commentFilter)}&fields=["name","content","owner","creation","comment_by"]&order_by=creation desc`,
      { _silent: true } as unknown as import("axios").AxiosRequestConfig
    );
    for (const c of parseRecords<{ name: string; content: string; owner: string; creation: string; comment_by?: string }>(commentRes)) {
      items.push({
        id: c.name,
        type: "comment",
        content: c.content,
        sender: c.comment_by || c.owner,
        date: c.creation,
      });
    }
  } catch {
    // optional
  }

  // Fetch communications
  try {
    const commFilter = JSON.stringify([
      ["reference_doctype", "=", doctype],
      ["reference_name", "=", docname],
    ]);
    const commRes = await erpnext.get<unknown>(
      `/api/resource/Communication?filters=${encodeURIComponent(commFilter)}&fields=["name","subject","content","sender","creation"]&order_by=creation desc`,
      { _silent: true } as unknown as import("axios").AxiosRequestConfig
    );
    for (const c of parseRecords<{ name: string; subject: string; content: string; sender: string; creation: string }>(commRes)) {
      items.push({
        id: c.name,
        type: "communication",
        subject: c.subject,
        content: c.content,
        sender: c.sender,
        date: c.creation,
      });
    }
  } catch {
    // optional
  }

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addCrmComment(doctype: string, docname: string, content: string): Promise<void> {
  await erpnext.post("/api/method/frappe.desk.form.utils.add_comment", {
    reference_doctype: doctype,
    reference_name: docname,
    content,
    comment_email: "crm@netlink.com",
    comment_by: "CRM Manager",
  });
}

export interface CrmAttachment {
  name: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  creation: string;
  owner?: string;
  stage?: string;
  displayName?: string;
}

export async function getCrmAttachments(doctype: string, docname: string): Promise<CrmAttachment[]> {
  const filter = JSON.stringify([
    ["attached_to_doctype", "=", doctype],
    ["attached_to_name", "=", docname],
  ]);
  const res = await erpnext.get<unknown>(
    `/api/resource/File?filters=${encodeURIComponent(filter)}&fields=["name","file_name","file_url","file_size","file_type","creation","owner"]&order_by=creation desc`,
    { _silent: true } as unknown as import("axios").AxiosRequestConfig
  );
  const records = parseRecords<CrmAttachment>(res);
  return records.map((r) => {
    const match = r.file_name.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      return {
        ...r,
        stage: match[1],
        displayName: match[2],
      };
    }
    return {
      ...r,
      displayName: r.file_name,
    };
  });
}

export async function uploadCrmFile(
  file: File,
  doctype: string,
  docname: string,
  stage?: string
): Promise<CrmAttachment> {
  const formData = new FormData();
  const fileName = stage ? `[${stage}] ${file.name}` : file.name;
  formData.append("file", file, fileName);
  formData.append("doctype", doctype);
  formData.append("docname", docname);
  formData.append("is_private", "0");

  const res = await erpnext.post<unknown>(
    "/api/method/upload_file",
    formData,
    {
      timeout: 60_000,
    }
  );

  const raw = res as unknown as { message?: CrmAttachment; data?: { message?: CrmAttachment } };
  const uploaded = (raw?.message || raw?.data?.message || res) as CrmAttachment;
  return {
    ...uploaded,
    stage,
    displayName: file.name,
  };
}

export async function deleteCrmFile(name: string): Promise<void> {
  await erpnext.delete(`/api/resource/File/${encodeURIComponent(name)}`);
}

export interface StageTransitionPayload {
  opportunityName: string;
  fromStage: string;
  toStage: string;
  note: string;
  uploadedFiles?: CrmAttachment[];
  user?: string;
}

export interface StageTransitionHistoryItem {
  id: string;
  fromStage: string;
  toStage: string;
  note: string;
  user: string;
  timestamp: string;
  files: Array<{ name: string; file_name: string; file_url: string }>;
}

export async function advanceOpportunityStage(payload: StageTransitionPayload): Promise<Opportunity> {
  const { opportunityName, fromStage, toStage, note, uploadedFiles = [], user = "CRM Manager" } = payload;
  const cleanNote = note?.trim();
  if (!cleanNote) {
    throw new Error("A transition note is mandatory before advancing the sales stage.");
  }

  // 1. Fetch current Opportunity to verify state and enforce server-side idempotency
  const currentOpp = await getOpportunity(opportunityName);

  // Idempotency check: If Opportunity is already at toStage, check if this transition comment exists
  if (currentOpp.sales_stage === toStage) {
    const existingHistory = await getStageTransitionHistory(opportunityName);
    const alreadyRecorded = existingHistory.some(
      (h) => h.fromStage === fromStage && h.toStage === toStage
    );
    if (alreadyRecorded) {
      // Transition was already processed and recorded; return existing record without creating duplicate writes
      return currentOpp;
    }
  }

  // Sequence safety check: Ensure the deal is at fromStage (or already at toStage), normalized
  const normCurrent = normalizeStageName(currentOpp.sales_stage);
  const normFrom = normalizeStageName(fromStage);
  const normTo = normalizeStageName(toStage);

  if (normCurrent !== normFrom && normCurrent !== normTo) {
    throw new Error(
      `Cannot advance from "${fromStage}" to "${toStage}". Current stage in ERPNext is "${currentOpp.sales_stage}".`
    );
  }

  // 2. Format attached files list in HTML
  const filesListHtml =
    uploadedFiles.length > 0
      ? `<div style="margin-top: 6px; font-size: 11px;"><strong>Attached Stage Documents:</strong><ul style="margin: 2px 0 0 16px; padding: 0;">` +
        uploadedFiles
          .map((f) => `<li><a href="${f.file_url}" target="_blank" rel="noopener noreferrer">${f.displayName || f.file_name}</a></li>`)
          .join("") +
        `</ul></div>`
      : "";

  const noteContentHtml = `<div><strong>[Stage Transition: ${fromStage} → ${toStage}]</strong></div><div style="margin-top:4px;">${cleanNote}</div>${filesListHtml}`;

  // 3. Update Opportunity sales_stage in ERPNext (Single source of truth for current stage)
  const updatedOpp = await updateOpportunity(opportunityName, {
    sales_stage: toStage,
  });

  // 4. Record exactly ONE persistent history comment in ERPNext Comment DocType (Single source of truth for audit trail)
  try {
    await erpnext.post("/api/method/frappe.desk.form.utils.add_comment", {
      reference_doctype: "Opportunity",
      reference_name: opportunityName,
      content: noteContentHtml,
      comment_email: "crm.manager@netlink.com",
      comment_by: user,
    });
  } catch (commentErr) {
    console.error("Failed to post stage transition comment to ERPNext:", commentErr);
  }

  return updatedOpp;
}

export async function getStageTransitionHistory(opportunityName: string): Promise<StageTransitionHistoryItem[]> {
  const history: StageTransitionHistoryItem[] = [];
  const seenKeys = new Set<string>();

  try {
    // 1. Fetch comments from ERPNext Comment DocType (Single Source of Truth)
    const commentFilter = JSON.stringify([
      ["reference_doctype", "=", "Opportunity"],
      ["reference_name", "=", opportunityName],
    ]);
    const commentRes = await erpnext.get<unknown>(
      `/api/resource/Comment?filters=${encodeURIComponent(commentFilter)}&fields=["name","content","owner","creation","comment_by"]&order_by=creation desc&limit_page_length=100`,
      { _silent: true } as unknown as import("axios").AxiosRequestConfig
    );
    const comments = parseRecords<{ name: string; content: string; owner: string; creation: string; comment_by?: string }>(commentRes);

    for (const c of comments) {
      const match = c.content.match(/\[Stage Transition(?:\]|:)\s*([A-Za-z0-9\s/]+)\s*→\s*([A-Za-z0-9\s/]+)\]?/i);
      if (match) {
        let cleanText = c.content.replace(/<[^>]+>/g, " ").replace(/\[Stage Transition[^\]]*\]/gi, "").trim();
        if (cleanText.includes("Attached Stage Documents:")) {
          cleanText = cleanText.split("Attached Stage Documents:")[0].trim();
        }

        const fromStage = match[1].trim();
        const toStage = match[2].trim();
        const dedupKey = `${fromStage}__${toStage}__${cleanText.substring(0, 50)}`;

        if (!seenKeys.has(dedupKey)) {
          seenKeys.add(dedupKey);
          history.push({
            id: c.name,
            fromStage,
            toStage,
            note: cleanText,
            user: c.comment_by || c.owner || "CRM Manager",
            timestamp: c.creation,
            files: [],
          });
        }
      }
    }
  } catch {
    // continue
  }

  // 2. Backward compatibility fallback: check Opportunity notes child table ONLY for transitions not in Comment
  try {
    const opp = await getOpportunity(opportunityName);
    for (const n of opp.notes || []) {
      const match = n.note?.match(/\[Stage Transition(?:\]|:)\s*([A-Za-z0-9\s/]+)\s*→\s*([A-Za-z0-9\s/]+)\]?/i);
      if (match) {
        let cleanText = (n.note || "").replace(/<[^>]+>/g, " ").replace(/\[Stage Transition[^\]]*\]/gi, "").trim();
        if (cleanText.includes("Attached Stage Documents:")) {
          cleanText = cleanText.split("Attached Stage Documents:")[0].trim();
        }
        const fromStage = match[1].trim();
        const toStage = match[2].trim();
        const dedupKey = `${fromStage}__${toStage}__${cleanText.substring(0, 50)}`;

        if (!seenKeys.has(dedupKey)) {
          seenKeys.add(dedupKey);
          history.push({
            id: n.name || String(Math.random()),
            fromStage,
            toStage,
            note: cleanText,
            user: n.added_by || "CRM Manager",
            timestamp: n.added_on || "",
            files: [],
          });
        }
      }
    }
  } catch {
    // continue
  }

  return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Complaints (Issue DocType) API
// ─────────────────────────────────────────────────────────────────────────────

export async function getComplaints(
  params: ComplaintFilterParams = {}
): Promise<{ complaints: ComplaintDoc[]; total: number }> {
  const filters: [string, string, string, unknown][] = [];

  if (params.status) {
    filters.push(["Issue", "status", "=", params.status]);
  }
  if (params.priority) {
    filters.push(["Issue", "priority", "=", params.priority]);
  }
  if (params.issue_type) {
    filters.push(["Issue", "issue_type", "=", params.issue_type]);
  }
  if (params.customer) {
    filters.push(["Issue", "customer", "=", params.customer]);
  }
  if (params.search?.trim()) {
    const q = `%${params.search.trim()}%`;
    filters.push(["Issue", "subject", "like", q]);
  }

  const queryParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "subject",
      "customer",
      "customer_name",
      "raised_by",
      "status",
      "priority",
      "issue_type",
      "description",
      "resolution_details",
      "opening_date",
      "opening_time",
      "sla_resolution_date",
      "resolution_time",
      "lead",
      "contact",
      "company",
      "attachment",
      "creation",
      "modified",
      "owner",
      "modified_by",
    ]),
    order_by: params.order_by ?? "modified desc",
    limit_start: String(params.limit_start ?? 0),
    limit_page_length: String(params.limit_page_length ?? 50),
  });

  if (filters.length > 0) {
    queryParams.set("filters", JSON.stringify(filters));
  }

  const [listRes, countRes] = await Promise.all([
    erpnext.get<unknown>(`/api/resource/Issue?${queryParams.toString()}`),
    erpnext
      .get<unknown>(
        `/api/method/frappe.client.get_count?doctype=Issue${
          filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : ""
        }`
      )
      .catch(() => null),
  ]);

  const rawComplaints = parseRecords<ComplaintDoc & { sla_resolution_date?: string }>(listRes);
  const complaints: ComplaintDoc[] = rawComplaints.map((c) => ({
    ...c,
    resolution_date: c.sla_resolution_date || c.resolution_date,
  }));
  const total = countRes !== null ? parseCount(countRes) : complaints.length;

  return { complaints, total };
}

export async function getComplaint(name: string): Promise<ComplaintDoc> {
  const res = await erpnext.get<unknown>(`/api/resource/Issue/${encodeURIComponent(name)}`);
  const doc = parseDoc<ComplaintDoc & { sla_resolution_date?: string }>(res);
  if (doc) {
    doc.resolution_date = doc.sla_resolution_date || doc.resolution_date;
  }
  return doc;
}

export async function createComplaint(
  data: Partial<ComplaintDoc> | Record<string, unknown>
): Promise<ComplaintDoc> {
  const cleanData: Record<string, unknown> = { ...data };
  if ("resolution_date" in cleanData) {
    if (!cleanData.sla_resolution_date) {
      cleanData.sla_resolution_date = cleanData.resolution_date;
    }
    delete cleanData.resolution_date;
  }
  const payload = {
    doctype: "Issue",
    status: "Open",
    priority: "Medium",
    company: "Netlink",
    ...cleanData,
  };
  try {
    const res = await erpnext.post<unknown>(
      "/api/resource/Issue",
      payload,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    const doc = parseDoc<ComplaintDoc & { sla_resolution_date?: string }>(res);
    if (doc) {
      doc.resolution_date = doc.sla_resolution_date || doc.resolution_date;
    }
    return doc;
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateComplaint(
  name: string,
  data: Partial<ComplaintDoc> | Record<string, unknown>
): Promise<ComplaintDoc> {
  const cleanData: Record<string, unknown> = { ...data };
  if ("resolution_date" in cleanData) {
    if (!cleanData.sla_resolution_date) {
      cleanData.sla_resolution_date = cleanData.resolution_date;
    }
    delete cleanData.resolution_date;
  }
  try {
    const res = await erpnext.put<unknown>(
      `/api/resource/Issue/${encodeURIComponent(name)}`,
      cleanData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { _silent: true } as any
    );
    const doc = parseDoc<ComplaintDoc & { sla_resolution_date?: string }>(res);
    if (doc) {
      doc.resolution_date = doc.sla_resolution_date || doc.resolution_date;
    }
    return doc;
  } catch (err) {
    const msg = extractFrappeErrorMessage(err);
    throw new Error(msg);
  }
}

export async function updateComplaintStatus(
  name: string,
  status: ComplaintStatus,
  resolution_details?: string
): Promise<ComplaintDoc> {
  const updateData: Partial<ComplaintDoc> = { status };
  if (resolution_details !== undefined) {
    updateData.resolution_details = resolution_details;
  }
  if (status === "Resolved" || status === "Closed") {
    const nowIso = new Date().toISOString().replace("T", " ").substring(0, 19);
    updateData.sla_resolution_date = nowIso;
    updateData.resolution_date = nowIso;
  }
  return updateComplaint(name, updateData);
}

export async function deleteComplaint(name: string): Promise<void> {
  await erpnext.delete(`/api/resource/Issue/${encodeURIComponent(name)}`);
}

export async function getIssueTypes(): Promise<string[]> {
  try {
    const res = await erpnext.get<unknown>(
      '/api/resource/Issue%20Type?fields=["name"]&limit_page_length=100'
    );
    const records = parseRecords<{ name: string }>(res);
    return records.map((r) => r.name);
  } catch {
    return [
      "Product Quality Defect",
      "Delivery Delay",
      "Damaged Goods in Transit",
      "Billing & Invoicing Discrepancy",
      "Packaging & Labeling Issue",
      "Wrong Item Shipped",
    ];
  }
}

export async function getIssuePriorities(): Promise<string[]> {
  try {
    const res = await erpnext.get<unknown>(
      '/api/resource/Issue%20Priority?fields=["name"]&limit_page_length=100'
    );
    const records = parseRecords<{ name: string }>(res);
    return records.map((r) => r.name);
  } catch {
    return ["Low", "Medium", "High", "Urgent"];
  }
}

export async function getComplaintMetrics(): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const { complaints, total } = await getComplaints({ limit_page_length: 500 });
  let open = 0;
  let inProgress = 0;
  let resolved = 0;
  let closed = 0;
  const byCategory: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const c of complaints) {
    if (c.status === "Open") open++;
    else if (c.status === "Replied" || c.status === "On Hold") inProgress++;
    else if (c.status === "Resolved") resolved++;
    else if (c.status === "Closed") closed++;

    const cat = c.issue_type || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + 1;

    const prio = c.priority || "Medium";
    byPriority[prio] = (byPriority[prio] || 0) + 1;
  }

  return { total, open, inProgress, resolved, closed, byCategory, byPriority };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales Orders & Delivery Notes API
// ─────────────────────────────────────────────────────────────────────────────

export async function getSalesOrders(params: {
  customer?: string;
  status?: string;
  limit_page_length?: number;
} = {}): Promise<SalesOrderDoc[]> {
  const filters: [string, string, string, unknown][] = [];
  if (params.customer) {
    filters.push(["Sales Order", "customer", "=", params.customer]);
  }
  if (params.status) {
    filters.push(["Sales Order", "status", "=", params.status]);
  }

  const queryParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "customer",
      "customer_name",
      "transaction_date",
      "delivery_date",
      "status",
      "delivery_status",
      "per_delivered",
      "per_billed",
      "grand_total",
      "currency",
      "company",
      "order_type",
      "creation",
      "modified",
    ]),
    order_by: "transaction_date desc",
    limit_page_length: String(params.limit_page_length ?? 100),
  });

  if (filters.length > 0) {
    queryParams.set("filters", JSON.stringify(filters));
  }

  const res = await erpnext.get<unknown>(`/api/resource/Sales%20Order?${queryParams.toString()}`);
  return parseRecords<SalesOrderDoc>(res);
}

export async function getSalesOrder(name: string): Promise<SalesOrderDoc> {
  const res = await erpnext.get<unknown>(`/api/resource/Sales%20Order/${encodeURIComponent(name)}`);
  return parseDoc<SalesOrderDoc>(res);
}

export async function getDeliveryNotes(params: {
  customer?: string;
  status?: string;
  limit_page_length?: number;
} = {}): Promise<DeliveryNoteDoc[]> {
  const filters: [string, string, string, unknown][] = [];
  if (params.customer) {
    filters.push(["Delivery Note", "customer", "=", params.customer]);
  }
  if (params.status) {
    filters.push(["Delivery Note", "status", "=", params.status]);
  }

  const queryParams = new URLSearchParams({
    fields: JSON.stringify([
      "name",
      "customer",
      "customer_name",
      "posting_date",
      "posting_time",
      "status",
      "grand_total",
      "currency",
      "company",
      "lr_no",
      "vehicle_no",
      "transporter_name",
      "creation",
      "modified",
    ]),
    order_by: "posting_date desc",
    limit_page_length: String(params.limit_page_length ?? 100),
  });

  if (filters.length > 0) {
    queryParams.set("filters", JSON.stringify(filters));
  }

  const res = await erpnext.get<unknown>(`/api/resource/Delivery%20Note?${queryParams.toString()}`);
  return parseRecords<DeliveryNoteDoc>(res);
}

export async function getDeliveryNote(name: string): Promise<DeliveryNoteDoc> {
  const res = await erpnext.get<unknown>(`/api/resource/Delivery%20Note/${encodeURIComponent(name)}`);
  return parseDoc<DeliveryNoteDoc>(res);
}

export async function getOrderDeliveryTracking(params: {
  customer?: string;
  search?: string;
} = {}): Promise<OrderDeliveryTrackingRecord[]> {
  const [salesOrders, deliveryNotes] = await Promise.all([
    getSalesOrders({ customer: params.customer, limit_page_length: 100 }),
    getDeliveryNotes({ customer: params.customer, limit_page_length: 100 }),
  ]);

  // Fetch full details with line items for all orders
  const detailedOrders = await Promise.all(
    salesOrders.map((so) => getSalesOrder(so.name).catch(() => so))
  );

  const detailedDNs = await Promise.all(
    deliveryNotes.map((dn) => getDeliveryNote(dn.name).catch(() => dn))
  );

  const results: OrderDeliveryTrackingRecord[] = detailedOrders.map((so) => {
    // Find all delivery notes linked to this sales order
    const linkedDNs = detailedDNs.filter((dn) =>
      dn.items?.some((item) => item.against_sales_order === so.name)
    );

    let orderedQty = 0;
    let deliveredQty = 0;

    for (const item of so.items || []) {
      orderedQty += Number(item.qty) || 0;
      deliveredQty += Number(item.delivered_qty) || 0;
    }

    // Fallback if line-item delivered_qty not populated: calculate from linked DNs
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

    const latestDispatchDate = linkedDNs[0]?.posting_date;

    return {
      salesOrder: so,
      deliveryNotes: linkedDNs,
      orderedQty,
      deliveredQty,
      pendingQty,
      overallDeliveryStatus: overallStatus,
      latestDispatchDate,
      expectedDeliveryDate: so.delivery_date,
    };
  });

  if (params.search?.trim()) {
    const q = params.search.trim().toLowerCase();
    return results.filter(
      (r) =>
        r.salesOrder.name.toLowerCase().includes(q) ||
        r.salesOrder.customer.toLowerCase().includes(q) ||
        (r.salesOrder.customer_name && r.salesOrder.customer_name.toLowerCase().includes(q)) ||
        r.deliveryNotes.some((dn) => dn.name.toLowerCase().includes(q))
    );
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer 360 Unified Record
// ─────────────────────────────────────────────────────────────────────────────

export async function getCustomer360(customerName: string): Promise<{
  customer: Customer;
  opportunities: Opportunity[];
  salesOrders: SalesOrderDoc[];
  deliveryNotes: DeliveryNoteDoc[];
  complaints: ComplaintDoc[];
  contacts: Contact[];
  addresses: Address[];
}> {
  // 1. Fetch primary customer record first (must succeed)
  const customer = await getCustomer(customerName);

  // 2. Fetch all related sub-resources in parallel with graceful fallbacks
  // so an issue or permission restriction on an optional sub-resource never crashes the customer view
  const [related, salesOrders, deliveryNotes, complaintsRes] = await Promise.all([
    getCustomerRelatedRecords(customerName).catch((err) => {
      console.warn(`[Customer360] Could not load related opps/contacts for ${customerName}:`, err);
      return { opportunities: [], contacts: [], addresses: [] };
    }),
    getSalesOrders({ customer: customerName }).catch((err) => {
      console.warn(`[Customer360] Could not load sales orders for ${customerName}:`, err);
      return [];
    }),
    getDeliveryNotes({ customer: customerName }).catch((err) => {
      console.warn(`[Customer360] Could not load delivery notes for ${customerName}:`, err);
      return [];
    }),
    getComplaints({ customer: customerName }).catch((err) => {
      console.warn(`[Customer360] Could not load complaints for ${customerName}:`, err);
      return { complaints: [], total: 0 };
    }),
  ]);

  return {
    customer,
    opportunities: related.opportunities || [],
    salesOrders: salesOrders || [],
    deliveryNotes: deliveryNotes || [],
    complaints: complaintsRes.complaints || [],
    contacts: related.contacts || [],
    addresses: related.addresses || [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Brands API
// ─────────────────────────────────────────────────────────────────────────────

export async function getBrands(): Promise<BrandDoc[]> {
  try {
    const res = await erpnext.get<unknown>(
      '/api/resource/Brand?fields=["name","brand","description","image"]&limit_page_length=100'
    );
    return parseRecords<BrandDoc>(res);
  } catch {
    return [];
  }
}
