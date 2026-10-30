/**
 * TypeScript types for ERPNext CRM integration in BidSphere.
 * Matches ERPNext v16 CRM DocTypes and Frappe API specifications.
 */

export type LeadStatus =
  | "Lead"
  | "Open"
  | "Replied"
  | "Opportunity"
  | "Quotation"
  | "Lost Quotation"
  | "Interested"
  | "Converted"
  | "Do Not Contact";

export type OpportunityStatus =
  | "Open"
  | "Quotation"
  | "Converted"
  | "Lost"
  | "Closed";

export interface PaginationParams {
  limit_start?: number;
  limit_page_length?: number;
  order_by?: string;
}

export interface CrmNote {
  name?: string;
  note: string;
  added_by?: string;
  added_on?: string;
}

export interface DynamicLink {
  name?: string;
  link_doctype: string;
  link_name: string;
  link_title?: string;
}

export interface ContactEmail {
  name?: string;
  email_id: string;
  is_primary?: 0 | 1;
}

export interface ContactPhone {
  name?: string;
  phone: string;
  is_primary_phone?: 0 | 1;
  is_primary_mobile_no?: 0 | 1;
}

export interface Lead {
  name: string;
  lead_name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  salutation?: string;
  job_title?: string;
  gender?: string;
  lead_owner?: string;
  status: LeadStatus;
  type?: "Client" | "Channel Partner" | "Consultant" | string;
  request_type?: string;
  email_id?: string;
  website?: string;
  mobile_no?: string;
  whatsapp_no?: string;
  phone?: string;
  phone_ext?: string;
  company_name?: string;
  no_of_employees?: string;
  annual_revenue?: number;
  industry?: string;
  market_segment?: string;
  territory?: string;
  city?: string;
  state?: string;
  country?: string;
  utm_source?: string; // Replaces Lead Source in v16
  utm_medium?: string;
  utm_campaign?: string;
  qualification_status?: "Unqualified" | "In Process" | "Qualified" | string;
  qualified_by?: string;
  qualified_on?: string;
  company?: string;
  image?: string;
  title?: string;
  lead_date?: string;
  notes?: CrmNote[];
  creation?: string;
  modified?: string;
  owner?: string;
  modified_by?: string;
  customer?: string;
}

export interface OpportunityItem {
  name?: string;
  item_code?: string;
  item_name?: string;
  description?: string;
  qty?: number;
  uom?: string;
  rate?: number;
  amount?: number;
  base_rate?: number;
  base_amount?: number;
  item_group?: string;
  brand?: string;
}

export interface Opportunity {
  name: string;
  title?: string;
  opportunity_from: "Lead" | "Customer";
  party_name: string;
  customer_name?: string;
  opportunity_owner?: string;
  sales_stage: string;
  expected_closing?: string;
  probability?: number;
  opportunity_amount?: number;
  currency?: string;
  company?: string;
  status: OpportunityStatus;
  opportunity_type?: string;
  transaction_date?: string;
  items?: OpportunityItem[];
  utm_source?: string;
  utm_campaign?: string;
  contact_person?: string;
  contact_email?: string;
  contact_mobile?: string;
  notes?: CrmNote[];
  creation?: string;
  modified?: string;
  owner?: string;
  modified_by?: string;
}

export interface Customer {
  name: string;
  customer_name: string;
  customer_type?: "Company" | "Individual";
  customer_group?: string;
  territory?: string;
  company?: string;
  email_id?: string;
  mobile_no?: string;
  website?: string;
  creation?: string;
  modified?: string;
  disabled?: 0 | 1;
}

export interface Contact {
  name: string;
  first_name: string;
  last_name?: string;
  company_name?: string;
  email_id?: string;
  mobile_no?: string;
  phone?: string;
  department?: string;
  designation?: string;
  email_ids?: ContactEmail[];
  phone_nos?: ContactPhone[];
  links?: DynamicLink[];
  creation?: string;
  modified?: string;
}

export interface Address {
  name: string;
  address_title: string;
  address_type?: "Billing" | "Shipping" | "Office" | "Personal" | "Plant" | "Postal" | "Shop" | "Subsidiary" | "Warehouse" | "Current" | "Permanent" | "Other";
  address_line1: string;
  address_line2?: string;
  city: string;
  state?: string;
  country: string;
  pincode?: string;
  email_id?: string;
  phone?: string;
  is_primary_address?: 0 | 1;
  is_shipping_address?: 0 | 1;
  links?: DynamicLink[];
  creation?: string;
  modified?: string;
}

export interface Campaign {
  name: string;
  campaign_name: string;
  description?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  modified_by?: string;
  naming_series?: string;
}

export interface SalesStage {
  name: string;
  stage_name: string;
}

export interface OpportunityType {
  name: string;
}

export interface CustomerGroup {
  name: string;
}

export interface Territory {
  name: string;
}

export interface UTMSource {
  name: string;
}

export interface SalesPerson {
  name: string;
  sales_person_name?: string;
}

export interface CrmDashboardKpi {
  newLeadsLastMonth: number;
  newOpportunitiesLastMonth: number;
  wonOpportunitiesLastMonth: number;
  openOpportunities: number;
}

export interface IncomingLeadsChartPoint {
  date: string;
  leads: number;
}

export interface WonOpportunityChartPoint {
  month: string;
  count: number;
  value: number;
}

export interface PipelineStageSummary {
  stage: string;
  count: number;
  totalValue: number;
  opportunities: Opportunity[];
}

export interface CrmReportColumn {
  label: string;
  fieldname: string;
  fieldtype?: string;
  width?: number;
  options?: string;
}

export interface CrmReportResponse {
  columns: CrmReportColumn[];
  result: Record<string, unknown>[];
  message?: unknown;
}

export interface DocField {
  fieldname: string;
  label?: string;
  fieldtype: string;
  options?: string;
  reqd?: 0 | 1;
  read_only?: 0 | 1;
  hidden?: 0 | 1;
  default?: string | number | null;
  description?: string;
  depends_on?: string;
  mandatory_depends_on?: string;
  read_only_depends_on?: string;
  idx?: number;
}

export interface DocTypeMeta {
  name: string;
  module?: string;
  fields: DocField[];
  title_field?: string;
  autoname?: string;
  is_submittable?: 0 | 1;
  [key: string]: unknown;
}

export interface LinkOption {
  value: string;
  label: string;
  description?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer Complaints (ERPNext Issue DocType)
// ─────────────────────────────────────────────────────────────────────────────

export type ComplaintStatus =
  | "Open"
  | "Replied"
  | "On Hold"
  | "Resolved"
  | "Closed";

export type ComplaintPriority = "Low" | "Medium" | "High" | "Urgent";

export interface ComplaintDoc {
  name: string;
  subject: string;
  customer?: string;
  customer_name?: string;
  raised_by?: string;
  status: ComplaintStatus;
  priority?: ComplaintPriority;
  issue_type?: string;
  description?: string;
  resolution_details?: string;
  opening_date?: string;
  opening_time?: string;
  sla_resolution_date?: string;
  resolution_date?: string;
  resolution_time?: number;
  user_resolution_time?: number;
  lead?: string;
  contact?: string;
  company?: string;
  attachment?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  modified_by?: string;
  custom_sales_order?: string;
  custom_delivery_note?: string;
  custom_brand?: string;
  custom_assigned_to?: string;
}

export interface ComplaintFilterParams extends PaginationParams {
  search?: string;
  status?: string;
  priority?: string;
  issue_type?: string;
  customer?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales Orders & Delivery Notes
// ─────────────────────────────────────────────────────────────────────────────

export interface SalesOrderItem {
  name?: string;
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  stock_uom?: string;
  uom?: string;
  rate: number;
  amount: number;
  delivered_qty?: number;
  delivery_date?: string;
  warehouse?: string;
}

export interface SalesOrderDoc {
  name: string;
  customer: string;
  customer_name?: string;
  transaction_date: string;
  delivery_date?: string;
  status: string;
  delivery_status?: "Not Delivered" | "Partially Delivered" | "Fully Delivered" | string;
  per_delivered?: number;
  per_billed?: number;
  grand_total: number;
  currency: string;
  company: string;
  order_type?: string;
  items: SalesOrderItem[];
  creation?: string;
  modified?: string;
}

export interface DeliveryNoteItem {
  name?: string;
  item_code: string;
  item_name?: string;
  description?: string;
  qty: number;
  uom?: string;
  rate: number;
  amount: number;
  against_sales_order?: string;
  so_detail?: string;
}

export interface DeliveryNoteDoc {
  name: string;
  customer: string;
  customer_name?: string;
  posting_date: string;
  posting_time?: string;
  status: string;
  grand_total: number;
  currency: string;
  company: string;
  items: DeliveryNoteItem[];
  creation?: string;
  modified?: string;
  lr_no?: string;
  vehicle_no?: string;
  transporter_name?: string;
}

export interface OrderDeliveryTrackingRecord {
  salesOrder: SalesOrderDoc;
  deliveryNotes: DeliveryNoteDoc[];
  orderedQty: number;
  deliveredQty: number;
  pendingQty: number;
  overallDeliveryStatus: "Pending" | "Partially Delivered" | "Delivered" | "Delayed";
  latestDispatchDate?: string;
  expectedDeliveryDate?: string;
}

export interface BrandDoc {
  name: string;
  brand: string;
  description?: string;
  image?: string;
}

