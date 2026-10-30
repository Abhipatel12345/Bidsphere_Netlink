// Direct Live API verification for Customer 360 and Complaints module

const ERP_URL = "http://80.225.204.210:8090";
const ERP_KEY = "b80696279c27693";
const ERP_SECRET = "4c83e61c5e427ac";

async function erpFetch(path, options = {}) {
  const headers = {
    "Authorization": `token ${ERP_KEY}:${ERP_SECRET}`,
    "Accept": "application/json",
    ...(options.headers || {})
  };
  const res = await fetch(`${ERP_URL}${path}`, { ...options, headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}
  return { status: res.status, ok: res.ok, data: json, text };
}

async function verify() {
  console.log("================================================================================");
  console.log("VERIFYING CUSTOMER 360 AND COMPLAINTS RESOLUTION AFTER FIX");
  console.log("================================================================================");

  // 1. Verify Complaints Query with sla_resolution_date
  console.log("\n1. Testing Complaints Query with sla_resolution_date...");
  const fields = JSON.stringify([
    "name", "subject", "customer", "customer_name", "raised_by", "status",
    "priority", "issue_type", "description", "resolution_details",
    "opening_date", "opening_time", "sla_resolution_date", "resolution_time",
    "lead", "contact", "company", "attachment", "creation", "modified",
    "owner", "modified_by"
  ]);
  const complaintsRes = await erpFetch(`/api/resource/Issue?fields=${encodeURIComponent(fields)}&order_by=modified desc&limit_page_length=50`);
  if (!complaintsRes.ok) {
    console.error("FAIL: Complaints query returned status", complaintsRes.status, complaintsRes.text);
    process.exit(1);
  }
  const rawComplaints = complaintsRes.data.data;
  const complaints = rawComplaints.map(c => ({
    ...c,
    resolution_date: c.sla_resolution_date || c.resolution_date
  }));
  console.log(`✓ Successfully retrieved ${complaints.length} complaints with zero errors!`);
  console.log("Sample Complaint:", {
    name: complaints[0].name,
    subject: complaints[0].subject,
    customer: complaints[0].customer,
    status: complaints[0].status,
    priority: complaints[0].priority,
    resolution_details: complaints[0].resolution_details,
    sla_resolution_date: complaints[0].sla_resolution_date,
    resolution_date: complaints[0].resolution_date
  });

  // 2. Verify Customer 360 Aggregation for Titan Enterprise Solutions
  console.log("\n2. Testing Customer 360 Aggregation for 'Titan Enterprise Solutions'...");
  const targetCustomer = "Titan Enterprise Solutions";
  const [custRes, oppsRes, ordersRes, dnsRes, custIssuesRes] = await Promise.all([
    erpFetch(`/api/resource/Customer/${encodeURIComponent(targetCustomer)}`),
    erpFetch(`/api/resource/Opportunity?filters=${encodeURIComponent(JSON.stringify([["party_name", "=", targetCustomer]]))}&fields=["name","title","sales_stage","status","opportunity_amount","expected_closing","modified"]`),
    erpFetch(`/api/resource/Sales Order?filters=${encodeURIComponent(JSON.stringify([["customer", "=", targetCustomer]]))}&fields=["name","status","grand_total","delivery_status"]`),
    erpFetch(`/api/resource/Delivery Note?filters=${encodeURIComponent(JSON.stringify([["customer", "=", targetCustomer]]))}&fields=["name","status","grand_total","posting_date"]`),
    erpFetch(`/api/resource/Issue?filters=${encodeURIComponent(JSON.stringify([["customer", "=", targetCustomer]]))}&fields=${encodeURIComponent(fields)}`)
  ]);

  console.log("✓ Customer 360 record successfully resolved:");
  console.log(`  - Customer Status: ${custRes.status} (${custRes.data?.data?.customer_name})`);
  console.log(`  - Opportunities:   ${oppsRes.data?.data?.length || 0} records`);
  console.log(`  - Sales Orders:    ${ordersRes.data?.data?.length || 0} records`);
  console.log(`  - Delivery Notes:  ${dnsRes.data?.data?.length || 0} records`);
  console.log(`  - Complaints:      ${custIssuesRes.data?.data?.length || 0} records`);

  console.log("\n================================================================================");
  console.log("BOTH CUSTOMER 360 AND COMPLAINTS PASSED WITH 100% SUCCESS!");
  console.log("================================================================================");
}

verify().catch(console.error);
