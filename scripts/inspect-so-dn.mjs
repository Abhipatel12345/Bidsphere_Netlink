import fetch from 'node-fetch';

const ERP_URL = "http://80.225.204.210:8090";
const ERP_KEY = "b80696279c27693";
const ERP_SECRET = "4c83e61c5e427ac";

async function fetchDoc(doctype, name) {
  const res = await fetch(`${ERP_URL}/api/resource/${doctype}/${encodeURIComponent(name)}`, {
    headers: { Authorization: `token ${ERP_KEY}:${ERP_SECRET}` }
  });
  return res.json();
}

async function main() {
  const soListRes = await fetch(`${ERP_URL}/api/resource/Sales%20Order?limit_page_length=5`, {
    headers: { Authorization: `token ${ERP_KEY}:${ERP_SECRET}` }
  });
  const soList = await soListRes.json();
  console.log("SO List:", soList.data?.map(s => s.name));

  const so = await fetchDoc("Sales Order", "SAL-ORD-2026-00003");
  console.log("Sales Order 00003 details:", {
    name: so.data?.name,
    customer: so.data?.customer,
    customer_name: so.data?.customer_name,
    transaction_date: so.data?.transaction_date,
    delivery_date: so.data?.delivery_date,
    status: so.data?.status,
    delivery_status: so.data?.delivery_status,
    per_delivered: so.data?.per_delivered,
    per_billed: so.data?.per_billed,
    grand_total: so.data?.grand_total,
    currency: so.data?.currency,
    items: so.data?.items?.map(i => ({
      item_code: i.item_code,
      item_name: i.item_name,
      qty: i.qty,
      delivered_qty: i.delivered_qty,
      rate: i.rate,
      amount: i.amount,
      warehouse: i.warehouse,
      delivery_date: i.delivery_date
    }))
  });

  const dn = await fetchDoc("Delivery Note", "MAT-DN-2026-00002");
  console.log("Delivery Note 00002 details:", {
    name: dn.data?.name,
    customer: dn.data?.customer,
    posting_date: dn.data?.posting_date,
    posting_time: dn.data?.posting_time,
    status: dn.data?.status,
    grand_total: dn.data?.grand_total,
    transporter_name: dn.data?.transporter_name,
    lr_no: dn.data?.lr_no,
    vehicle_no: dn.data?.vehicle_no,
    items: dn.data?.items?.map(i => ({
      item_code: i.item_code,
      item_name: i.item_name,
      qty: i.qty,
      against_sales_order: i.against_sales_order
    }))
  });
}

main().catch(console.error);
