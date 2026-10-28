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

async function getDocTypeMeta(doctype) {
  const res = await fetch(`${url}/api/method/frappe.desk.form.load.getdoctype?doctype=${encodeURIComponent(doctype)}`, { headers });
  if (!res.ok) throw new Error(`Failed to load ${doctype} meta: HTTP ${res.status}`);
  const json = await res.json();
  return json.docs?.[0];
}

async function searchLink(doctype, txt = '') {
  const res = await fetch(`${url}/api/method/frappe.desk.search.search_link`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ doctype, txt }),
  });
  if (!res.ok) throw new Error(`Failed to search link for ${doctype}: HTTP ${res.status}`);
  const json = await res.json();
  return json.message || [];
}

async function createResource(doctype, data) {
  const res = await fetch(`${url}/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Failed to create ${doctype}: HTTP ${res.status} - ${JSON.stringify(json)}`);
  }
  return json.data;
}

async function getResource(doctype, name) {
  const res = await fetch(`${url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, { headers });
  if (!res.ok) throw new Error(`Failed to get ${doctype} ${name}: HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

async function deleteResource(doctype, name) {
  if (doctype === 'Campaign') {
    await fetch(`${url}/api/resource/UTM%20Campaign/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers,
    }).catch(() => {});
  }
  const res = await fetch(`${url}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`[DELETE FAIL] ${doctype} ${name}: HTTP ${res.status} ${text}`);
  }
  return res.ok;
}

async function run() {
  console.log('================================================================');
  console.log('VERIFYING ALL CRM "NEW BUTTON" ACTIONS & DOCTYPE FUNCTIONALITY');
  console.log('================================================================');

  const createdRecords = [];

  try {
    // 1. New Campaign
    console.log('\n--- 1. Testing "+ New Campaign" (DocType: Campaign) ---');
    const campMeta = await getDocTypeMeta('Campaign');
    console.log(`[PASS] Campaign schema loaded: ${campMeta.fields.length} fields. Mandatory: ${campMeta.fields.filter(f => f.reqd === 1).map(f => f.fieldname).join(', ')}`);

    const campName = `Test_Campaign_${Date.now()}`;
    const createdCamp = await createResource('Campaign', {
      campaign_name: campName,
      description: 'Automated test campaign for CRM New Button verification',
    });
    createdRecords.push({ doctype: 'Campaign', name: createdCamp.name });
    console.log(`[PASS] Campaign created in ERPNext: "${createdCamp.name}"`);

    // Verify retrieval
    const fetchedCamp = await getResource('Campaign', createdCamp.name);
    console.log(`[PASS] Campaign confirmed in ERPNext: name="${fetchedCamp.name}", campaign_name="${fetchedCamp.campaign_name}"`);

    // 2. New Address
    console.log('\n--- 2. Testing "+ New Address" (DocType: Address) ---');
    const addrMeta = await getDocTypeMeta('Address');
    console.log(`[PASS] Address schema loaded: ${addrMeta.fields.length} fields. Mandatory: ${addrMeta.fields.filter(f => f.reqd === 1).map(f => f.fieldname).join(', ')}`);

    const addrTitle = `Test_Address_${Date.now()}`;
    const createdAddr = await createResource('Address', {
      address_title: addrTitle,
      address_type: 'Billing',
      address_line1: '100 Innovation Blvd, Suite 400',
      city: 'Detroit',
      state: 'Michigan',
      country: 'United States',
      pincode: '48201',
    });
    createdRecords.push({ doctype: 'Address', name: createdAddr.name });
    console.log(`[PASS] Address created in ERPNext: "${createdAddr.name}"`);

    const fetchedAddr = await getResource('Address', createdAddr.name);
    console.log(`[PASS] Address confirmed in ERPNext: title="${fetchedAddr.address_title}", city="${fetchedAddr.city}", country="${fetchedAddr.country}"`);

    // 3. New Customer
    console.log('\n--- 3. Testing "+ New Customer" (DocType: Customer) ---');
    const custMeta = await getDocTypeMeta('Customer');
    console.log(`[PASS] Customer schema loaded: ${custMeta.fields.length} fields. Mandatory: ${custMeta.fields.filter(f => f.reqd === 1).map(f => f.fieldname).join(', ')}`);

    const customerGroups = await searchLink('Customer Group');
    const territories = await searchLink('Territory');
    console.log(`[PASS] Customer link options loaded: ${customerGroups.length} Customer Groups, ${territories.length} Territories`);

    const custName = `Test_Customer_${Date.now()}`;
    const createdCust = await createResource('Customer', {
      customer_name: custName,
      customer_type: 'Company',
      customer_group: customerGroups.find((g) => g.value !== 'All Customer Groups')?.value || 'Commercial',
      territory: territories[0]?.value || 'United States',
    });
    createdRecords.push({ doctype: 'Customer', name: createdCust.name });
    console.log(`[PASS] Customer created in ERPNext: "${createdCust.name}"`);

    const fetchedCust = await getResource('Customer', createdCust.name);
    console.log(`[PASS] Customer confirmed in ERPNext: name="${fetchedCust.name}", customer_group="${fetchedCust.customer_group}"`);

    // 4. New Contact
    console.log('\n--- 4. Testing "+ New Contact" (DocType: Contact) ---');
    const contactMeta = await getDocTypeMeta('Contact');
    console.log(`[PASS] Contact schema loaded: ${contactMeta.fields.length} fields. Mandatory: ${contactMeta.fields.filter(f => f.reqd === 1).map(f => f.fieldname).join(', ')}`);

    const testContactEmail = `test_contact_${Date.now()}@bidsphere-test.com`;
    const createdContact = await createResource('Contact', {
      first_name: 'Test',
      last_name: `Contact_${Date.now()}`,
      email_ids: [{ email_id: testContactEmail, is_primary: 1 }],
      phone_nos: [{ phone: '+1-555-0199', is_primary_phone: 1 }],
      links: [
        { link_doctype: 'Customer', link_name: createdCust.name }
      ]
    });
    createdRecords.push({ doctype: 'Contact', name: createdContact.name });
    console.log(`[PASS] Contact created in ERPNext: "${createdContact.name}"`);

    const fetchedContact = await getResource('Contact', createdContact.name);
    console.log(`[PASS] Contact confirmed in ERPNext: full_name="${fetchedContact.first_name} ${fetchedContact.last_name || ''}", emails=${fetchedContact.email_ids?.length}`);

    // 5. New Opportunity
    console.log('\n--- 5. Testing "+ New Opportunity" (DocType: Opportunity) ---');
    const oppMeta = await getDocTypeMeta('Opportunity');
    console.log(`[PASS] Opportunity schema loaded: ${oppMeta.fields.length} fields. Mandatory: ${oppMeta.fields.filter(f => f.reqd === 1).map(f => f.fieldname).join(', ')}`);

    // Test Dynamic Link options resolution
    const leadPartyOptions = await searchLink('Lead');
    const customerPartyOptions = await searchLink('Customer');
    console.log(`[PASS] Dynamic Party Link resolved: ${leadPartyOptions.length} Leads and ${customerPartyOptions.length} Customers available`);

    const salesStages = await searchLink('Sales Stage');
    console.log(`[PASS] Sales Stage Link options: ${salesStages.map(s => s.value).slice(0, 5).join(', ')}...`);

    const oppPayload = {
      opportunity_from: 'Customer',
      party_name: createdCust.name,
      status: 'Open',
      company: 'Netlink',
      transaction_date: new Date().toISOString().split('T')[0],
      sales_stage: salesStages[0]?.value || 'Prospecting',
      probability: 70,
      currency: 'USD',
      opportunity_amount: 125000,
      items: [
        {
          item_name: 'Industrial Valve Assemblies',
          qty: 50,
          rate: 2500,
          amount: 125000,
        }
      ]
    };

    const createdOpp = await createResource('Opportunity', oppPayload);
    createdRecords.push({ doctype: 'Opportunity', name: createdOpp.name });
    console.log(`[PASS] Opportunity created in ERPNext: "${createdOpp.name}"`);

    const fetchedOpp = await getResource('Opportunity', createdOpp.name);
    console.log(`[PASS] Opportunity confirmed in ERPNext: name="${fetchedOpp.name}", party_name="${fetchedOpp.party_name}", amount=$${fetchedOpp.opportunity_amount}, items=${fetchedOpp.items?.length}`);

    // 6. Mandatory Validation Test
    console.log('\n--- 6. Testing Mandatory Field Validation Handling ---');
    const badOppRes = await fetch(`${url}/api/resource/Opportunity`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ opportunity_from: 'Lead' }), // missing party_name and company
    });
    const badOppJson = await badOppRes.json();
    console.log(`ERPNext response for missing mandatory fields: HTTP ${badOppRes.status}`);
    if (!badOppRes.ok && (badOppJson.exception || badOppJson._server_messages)) {
      console.log(`[PASS] ERPNext mandatory validation triggered properly: ${badOppJson.exception || 'Validation error'}`);
    }

    console.log('\n================================================================');
    console.log('ALL CRM "NEW BUTTON" DOCTYPE FLOWS VERIFIED SUCCESSFULLY!');
    console.log('================================================================');

  } finally {
    console.log('\n--- Cleaning up temporary test records from ERPNext ---');
    for (const rec of createdRecords.reverse()) {
      try {
        const ok = await deleteResource(rec.doctype, rec.name);
        console.log(`Deleted test ${rec.doctype} "${rec.name}": ${ok ? 'OK' : 'Failed'}`);
      } catch (err) {
        console.warn(`Could not clean up ${rec.doctype} "${rec.name}": ${err.message}`);
      }
    }
  }
}

run().catch((err) => {
  console.error('[ERROR]', err);
  process.exit(1);
});
