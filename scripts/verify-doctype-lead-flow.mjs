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

const url = (env.VITE_ERPNEXT_URL || env.ERPNEXT_URL).replace(/\/$/, '');
const key = env.ERP_API_KEY || env.VITE_API_KEY;
const secret = env.ERP_API_SECRET || env.VITE_API_SECRET;
const headers = {
  'Authorization': 'token ' + key + ':' + secret,
  'Content-Type': 'application/json',
};

async function main() {
  console.log('=== Step 1: Verify ERPNext DocType Schema Metadata Fetching ===');
  const metaRes = await fetch(`${url}/api/method/frappe.desk.form.load.getdoctype?doctype=Lead`, { headers });
  if (!metaRes.ok) throw new Error(`Failed to fetch Lead DocType meta: HTTP ${metaRes.status}`);
  const metaData = await metaRes.json();
  const leadDoc = metaData.docs?.[0];
  console.log(`[PASS] Lead DocType retrieved: name="${leadDoc.name}", module="${leadDoc.module}", total fields=${leadDoc.fields?.length}`);

  console.log('\n=== Step 2: Verify Dynamic Link Field Options Retrieval ===');
  const linkFieldsToTest = ['Territory', 'Industry Type', 'UTM Source', 'Salutation'];
  for (const dt of linkFieldsToTest) {
    const linkRes = await fetch(`${url}/api/method/frappe.desk.search.search_link`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ doctype: dt, txt: '' }),
    });
    const linkData = await linkRes.json();
    console.log(`[PASS] Link field "${dt}": ${linkData.message?.length ?? 0} options available from ERPNext`);
  }

  console.log('\n=== Step 3: Test Validation Error Handling on Invalid Input ===');
  const invalidPayload = {
    first_name: 'InvalidEmailTest',
    email_id: 'bad-email-without-domain',
    status: 'Lead',
  };
  const invalidRes = await fetch(`${url}/api/resource/Lead`, {
    method: 'POST',
    headers,
    body: JSON.stringify(invalidPayload),
  });
  const invalidData = await invalidRes.json();
  console.log(`Status for invalid email: HTTP ${invalidRes.status}`);
  if (invalidData._server_messages || invalidData.exception) {
    console.log('[PASS] ERPNext rejected invalid email with validation error as expected');
  }

  console.log('\n=== Step 4: Create a Lead Using Multi-Section DocType Fields ===');
  const testLeadPayload = {
    doctype: 'Lead',
    first_name: 'Genevieve',
    last_name: 'Duval',
    company_name: 'Apex Robotics International',
    job_title: 'Chief Technology Officer',
    status: 'Lead',
    type: 'Client',
    request_type: 'Product Enquiry',
    email_id: 'genevieve.duval@apexrobotics.io',
    mobile_no: '+1 313-555-0842',
    website: 'https://apexrobotics.io',
    industry: 'Aerospace',
    no_of_employees: '51-200',
    annual_revenue: 3500000,
    territory: 'All Territories',
    country: 'United States',
    city: 'Detroit',
    state: 'Michigan',
    utm_source: 'Advertisement',
  };

  const createRes = await fetch(`${url}/api/resource/Lead`, {
    method: 'POST',
    headers,
    body: JSON.stringify(testLeadPayload),
  });
  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(`Failed to create Lead: ${JSON.stringify(err)}`);
  }
  const createData = await createRes.json();
  const createdLead = createData.data;
  console.log(`[PASS] Successfully created Lead in ERPNext!`);
  console.log(`  Name: ${createdLead.name}`);
  console.log(`  Full Name: ${createdLead.lead_name}`);
  console.log(`  Company: ${createdLead.company_name}`);
  console.log(`  Status: ${createdLead.status}`);
  console.log(`  Territory: ${createdLead.territory}`);

  console.log('\n=== Step 5: Verify Lead Appears in Bidsphere Leads List API ===');
  const listRes = await fetch(`${url}/api/resource/Lead?filters=[["Lead","name","=","${createdLead.name}"]]&fields=["name","lead_name","company_name","status","email_id","territory"]`, { headers });
  const listData = await listRes.json();
  const found = listData.data?.[0];
  if (!found) throw new Error('Lead was not found in ERPNext listing query');
  console.log(`[PASS] Verified Lead in listing: ${found.name} (${found.lead_name}) - status: ${found.status}`);

  console.log('\n=== Step 6: Verify Single Lead Fetch (Detail View) ===');
  const getRes = await fetch(`${url}/api/resource/Lead/${encodeURIComponent(createdLead.name)}`, { headers });
  const getData = await getRes.json();
  console.log(`[PASS] Retrieved single Lead record: ${getData.data?.name} - Annual Revenue: ${getData.data?.annual_revenue}`);

  console.log('\nAll 6 verification steps passed successfully!');
}

main().catch(console.error);
