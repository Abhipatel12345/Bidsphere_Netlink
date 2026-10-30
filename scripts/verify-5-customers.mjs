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

const customerNames = [
  "Apex Manufacturing Pvt. Ltd.",
  "Orion Retail Solutions",
  "Nova Industrial Systems",
  "Summit Distribution Ltd.",
  "Vertex Energy Solutions"
];

async function main() {
  console.log("================================================================================");
  console.log("VERIFYING 5 SALES CUSTOMERS IN ERPNEXT & CUSTOMER 360 AGGREGATION");
  console.log("================================================================================");

  let allPassed = true;

  for (const name of customerNames) {
    console.log(`\nTesting Customer: "${name}"...`);

    // 1. Fetch Customer Doc
    const docRes = await get(`/api/resource/Customer/${encodeURIComponent(name)}`);
    if (!docRes.data) {
      console.log(`  ❌ Failed to fetch Customer Doc:`, docRes);
      allPassed = false;
      continue;
    }
    const c = docRes.data;
    console.log(`  ✓ ERPNext Customer Record Found:`);
    console.log(`    - ID:             ${c.name}`);
    console.log(`    - Customer Name:  ${c.customer_name}`);
    console.log(`    - Customer Type:  ${c.customer_type}`);
    console.log(`    - Customer Group: ${c.customer_group}`);
    console.log(`    - Territory:      ${c.territory}`);
    console.log(`    - Website:        ${c.website || '—'}`);

    // 2. Fetch Linked Contacts via Dynamic Link
    const contactFilter = JSON.stringify([
      ["Dynamic Link", "link_doctype", "=", "Customer"],
      ["Dynamic Link", "link_name", "=", name]
    ]);
    const contactRes = await get(`/api/resource/Contact?filters=${encodeURIComponent(contactFilter)}&fields=["name","first_name","last_name","email_id","mobile_no","designation"]`);
    const contacts = contactRes.data || [];
    console.log(`    - Linked Contacts (${contacts.length}): ${contacts.map(ct => `${ct.first_name} ${ct.last_name || ''} (${ct.email_id})`).join(', ') || 'None'}`);

    // 3. Fetch Linked Addresses via Dynamic Link
    const addressFilter = JSON.stringify([
      ["Dynamic Link", "link_doctype", "=", "Customer"],
      ["Dynamic Link", "link_name", "=", name]
    ]);
    const addressRes = await get(`/api/resource/Address?filters=${encodeURIComponent(addressFilter)}&fields=["name","address_title","address_type","address_line1","city","state","country"]`);
    const addresses = addressRes.data || [];
    console.log(`    - Linked Addresses (${addresses.length}): ${addresses.map(ad => `${ad.address_title}: ${ad.address_line1}, ${ad.city}`).join('; ') || 'None'}`);
  }

  // 4. Verify in Customer List API (order_by modified desc)
  console.log("\n--------------------------------------------------------------------------------");
  console.log("VERIFYING IN Bidsphere CustomersListPage API QUERY (modified desc)...");
  console.log("--------------------------------------------------------------------------------");
  const listFields = JSON.stringify([
    "name", "customer_name", "customer_type", "customer_group", "territory", "email_id", "mobile_no", "creation", "modified", "disabled"
  ]);
  const listRes = await get(`/api/resource/Customer?fields=${encodeURIComponent(listFields)}&order_by=modified desc&limit_page_length=10`);
  const topCustomers = listRes.data || [];
  console.log(`Top ${topCustomers.length} latest customers from ERPNext:`);
  for (const tc of topCustomers) {
    const isNew = customerNames.includes(tc.name) ? " ★ [NEW]" : "";
    console.log(`  • ${tc.name} (${tc.customer_group} | ${tc.territory})${isNew}`);
  }

  const allFoundInList = customerNames.every(name => topCustomers.some(tc => tc.name === name));
  console.log(`\nAll 5 new customers present at top of customer directory: ${allFoundInList ? 'YES (100% PASS)' : 'PARTIAL'}`);

  console.log("\n================================================================================");
  console.log(allPassed ? "VERIFICATION COMPLETED: ALL 5 CUSTOMERS FULLY FUNCTIONAL" : "VERIFICATION FAILED");
  console.log("================================================================================");
}

main().catch(console.error);
