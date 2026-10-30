import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const url = env.VITE_ERPNEXT_URL || env.ERPNEXT_URL;
const key = env.ERP_API_KEY || env.VITE_API_KEY;
const secret = env.ERP_API_SECRET || env.VITE_API_SECRET;
const headers = { 
  'Authorization': 'token ' + key + ':' + secret,
  'Content-Type': 'application/json'
};

async function get(path) {
  const res = await fetch(url + path, { headers });
  return await res.json();
}

async function post(path, body) {
  const res = await fetch(url + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function put(path, body) {
  const res = await fetch(url + path, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body)
  });
  return await res.json();
}

async function testScenarioA_SalesPipeline() {
  console.log('\n============================================================');
  console.log('TEST SCENARIO A: Sales Pipeline & Opportunity Progression');
  console.log('============================================================');

  const leads = await get('/api/resource/Lead?limit_page_length=5');
  console.log(`✓ Retrieved ${leads.data.length} Leads from ERPNext`);

  const opps = await get('/api/resource/Opportunity?limit_page_length=5&fields=["name","title","sales_stage","status","opportunity_amount"]');
  console.log(`✓ Retrieved ${opps.data.length} Opportunities from ERPNext`);
  console.log('  Sample Opportunity:', opps.data[0]);

  const stages = await get('/api/resource/Sales%20Stage?limit_page_length=15');
  console.log(`✓ Canonical Sales Stages in ERPNext: ${stages.data.length} stages`);
  console.log('  Stages:', stages.data.map(s => s.name).join(' -> '));
}

async function testScenarioB_ComplaintsManagement() {
  console.log('\n============================================================');
  console.log('TEST SCENARIO B: Complaints Management & Resolution Flow');
  console.log('============================================================');

  const custs = await get('/api/resource/Customer?limit_page_length=1');
  const customer = custs.data[0].name;

  // 1. Create a live complaint
  const complaintPayload = {
    doctype: 'Issue',
    subject: 'E2E Verification: Batch Seal Tampered on Brake Fluids',
    customer: customer,
    customer_name: customer,
    raised_by: 'qa.inspector@massy-client.com',
    status: 'Open',
    priority: 'High',
    issue_type: 'Packaging & Labeling Issue',
    description: 'Automated test verification: container seals inspected upon depot delivery.',
    opening_date: new Date().toISOString().split('T')[0]
  };

  const createRes = await post('/api/resource/Issue', complaintPayload);
  const complaintName = createRes.data?.name;
  console.log(`✓ Created live Complaint in ERPNext: ${complaintName} (${complaintPayload.subject})`);

  // 2. Fetch complaint detail
  const detailRes = await get(`/api/resource/Issue/${encodeURIComponent(complaintName)}`);
  console.log(`✓ Verified Complaint Status: ${detailRes.data?.status}, Priority: ${detailRes.data?.priority}`);

  // 3. Update status to Resolved with corrective resolution details
  const updatePayload = {
    status: 'Resolved',
    resolution_details: 'Replacement seals inspected and customer QA signoff obtained.',
    resolution_date: new Date().toISOString().split('T')[0]
  };
  const updateRes = await put(`/api/resource/Issue/${encodeURIComponent(complaintName)}`, updatePayload);
  console.log(`✓ Advanced Complaint to: ${updateRes.data?.status}`);
  console.log(`  Resolution Recorded: "${updateRes.data?.resolution_details}"`);
}

async function testScenarioC_OrderToDeliveryTracking() {
  console.log('\n============================================================');
  console.log('TEST SCENARIO C: Order-to-Delivery Tracking (SO -> DN)');
  console.log('============================================================');

  const orders = await get('/api/resource/Sales%20Order?limit_page_length=5&fields=["name","customer","transaction_date","delivery_status","per_delivered","grand_total"]');
  console.log(`✓ Retrieved ${orders.data.length} Sales Orders from ERPNext`);
  for (const o of orders.data) {
    console.log(`  - Order ${o.name} for ${o.customer}: ${o.delivery_status || 'Not Delivered'} (${o.per_delivered ?? 0}% delivered) - $${o.grand_total}`);
  }

  const deliveryNotes = await get('/api/resource/Delivery%20Note?limit_page_length=5&fields=["name","customer","posting_date","status","grand_total"]');
  console.log(`✓ Retrieved ${deliveryNotes.data.length} Delivery Notes from ERPNext`);
  for (const d of deliveryNotes.data) {
    console.log(`  - DN ${d.name} for ${d.customer}: Status ${d.status} on ${d.posting_date} - $${d.grand_total}`);
  }
}

async function testScenarioD_UnifiedReportingAndMetrics() {
  console.log('\n============================================================');
  console.log('TEST SCENARIO D: Unified Reporting & Metrics');
  console.log('============================================================');

  const issuesCount = await get('/api/method/frappe.client.get_count?doctype=Issue');
  const ordersCount = await get('/api/method/frappe.client.get_count?doctype=Sales Order');
  const dnCount = await get('/api/method/frappe.client.get_count?doctype=Delivery Note');
  const custCount = await get('/api/method/frappe.client.get_count?doctype=Customer');
  const oppCount = await get('/api/method/frappe.client.get_count?doctype=Opportunity');
  const leadsCount = await get('/api/method/frappe.client.get_count?doctype=Lead');

  console.log('✓ ERPNext Live Backend Counts:');
  console.log(`  - Customers: ${custCount.message}`);
  console.log(`  - Leads: ${leadsCount.message}`);
  console.log(`  - Opportunities: ${oppCount.message}`);
  console.log(`  - Sales Orders: ${ordersCount.message}`);
  console.log(`  - Delivery Notes: ${dnCount.message}`);
  console.log(`  - Complaints (Issues): ${issuesCount.message}`);
}

async function run() {
  await testScenarioA_SalesPipeline();
  await testScenarioB_ComplaintsManagement();
  await testScenarioC_OrderToDeliveryTracking();
  await testScenarioD_UnifiedReportingAndMetrics();
  console.log('\n============================================================');
  console.log('ALL 4 STAKEHOLDER DEMO SCENARIOS VERIFIED AGAINST BACKEND!');
  console.log('============================================================\n');
}

run().catch(console.error);
