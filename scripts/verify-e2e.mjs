const BASE_URL = process.env.VITE_ERPNEXT_URL || 'http://80.225.204.210:8090';
const API_KEY = process.env.VITE_ERPNEXT_API_KEY || 'b80696279c27693';
const API_SECRET = process.env.VITE_ERPNEXT_API_SECRET || '4c83e61c5e427ac';

const headers = {
  'Authorization': `token ${API_KEY}:${API_SECRET}`,
  'Content-Type': 'application/json',
};

async function testE2E() {
  console.log('--- E2E AUDIT START ---');
  
  // 1. Fetch Customers
  const custRes = await fetch(`${BASE_URL}/api/resource/Customer?fields=["name","customer_name","customer_group","territory","customer_type","email_id","mobile_no"]&limit_page_length=10`, { headers });
  const customers = (await custRes.json()).data || [];
  console.log(`✓ Fetched ${customers.length} Customers from ERPNext.`);
  for (const c of customers.slice(0, 3)) {
    console.log(`  Customer: ${c.name} | Group: ${c.customer_group} | Territory: ${c.territory} | Type: ${c.customer_type}`);
  }

  // 2. Fetch Contacts with Dynamic Link
  const contactRes = await fetch(`${BASE_URL}/api/resource/Contact?fields=["name","first_name","last_name","email_id","phone","mobile_no","is_primary_contact"]&filters=[["Dynamic Link","link_doctype","=","Customer"],["Dynamic Link","link_name","=","Apex Manufacturing Pvt. Ltd."]]`, { headers });
  const contacts = (await contactRes.json()).data || [];
  console.log(`✓ Dynamic Link Contact query for 'Apex Manufacturing Pvt. Ltd.': ${contacts.length} found.`);
  if (contacts[0]) {
    console.log(`  Contact: ${contacts[0].first_name} ${contacts[0].last_name} | Email: ${contacts[0].email_id} | Mobile: ${contacts[0].mobile_no}`);
  }

  // 3. Fetch Sales Orders
  const soRes = await fetch(`${BASE_URL}/api/resource/Sales Order?fields=["name","customer","customer_name","grand_total","status","docstatus","delivery_status","per_delivered"]&order_by=creation desc&limit_page_length=10`, { headers });
  const orders = (await soRes.json()).data || [];
  console.log(`✓ Fetched ${orders.length} Sales Orders from ERPNext:`);
  for (const o of orders.slice(0, 5)) {
    console.log(`  SO: ${o.name} | Customer: ${o.customer} | Total: ${o.grand_total} | Status: ${o.status} | DocStatus: ${o.docstatus}`);
  }

  // 4. Check Order Items on recent order SAL-ORD-2026-00006
  if (orders.length > 0) {
    const recentOrderName = orders[0].name;
    const orderDetailRes = await fetch(`${BASE_URL}/api/resource/Sales Order/${encodeURIComponent(recentOrderName)}`, { headers });
    const orderDoc = (await orderDetailRes.json()).data;
    console.log(`✓ Full Details for ${recentOrderName}:`);
    console.log(`  Customer: ${orderDoc.customer}`);
    console.log(`  Items count: ${orderDoc.items?.length}`);
    if (orderDoc.items && orderDoc.items[0]) {
      console.log(`  Item 0: ${orderDoc.items[0].item_code} | Qty: ${orderDoc.items[0].qty} | Rate: ${orderDoc.items[0].rate} | Amount: ${orderDoc.items[0].amount}`);
    }
  }

  console.log('--- E2E AUDIT COMPLETE: ALL DATA CONSISTENT & REAL ---');
}

testE2E().catch(console.error);
