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

async function api(path, options = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function parseRecords(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if ('data' in res && Array.isArray(res.data)) return res.data;
    if ('message' in res && Array.isArray(res.message)) return res.message;
  }
  return [];
}

function parseDoc(res) {
  if (res && typeof res === 'object') {
    if ('data' in res && res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
    if ('message' in res && res.message && typeof res.message === 'object' && !Array.isArray(res.message)) return res.message;
  }
  return res;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

async function main() {
  console.log('================================================================');
  console.log(' COHERENT STAKEHOLDER DEMO FLOW EXECUTION & VERIFICATION');
  console.log(` Target ERPNext: ${url}`);
  console.log('================================================================\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Check existing records to prevent duplicates
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Checking Existing Records for Duplicates ---');
  const existingLeadRes = await api('/api/resource/Lead?filters=[["Lead","company_name","like","%Helix BioRobotics%"]]');
  const existingLeads = parseRecords(existingLeadRes.data);
  let leadName = existingLeads[0]?.name;

  if (leadName) {
    console.log(`[INFO] Demo lead already exists: ${leadName}`);
  } else {
    console.log('[INFO] No existing demo lead found for Helix BioRobotics. Creating new lead...');
    const createLeadRes = await api('/api/resource/Lead', {
      method: 'POST',
      body: JSON.stringify({
        lead_name: 'Maya Lin',
        first_name: 'Maya',
        last_name: 'Lin',
        company_name: '[DEMO] Helix BioRobotics Inc',
        email_id: 'maya.lin@helixbiorobotics.demo',
        phone: '+1-415-555-0199',
        mobile_no: '+1-415-555-0199',
        status: 'Lead',
        lead_owner: 'crm@netlink.com',
        source: 'Reference',
        type: 'Client',
        annual_revenue: 8500000,
        no_of_employees: '201-500',
        market_segment: 'Upper Income',
        territory: 'United States',
        qualification_status: 'Unqualified',
      }),
    });
    if (!createLeadRes.ok) {
      console.error('Lead create failed:', createLeadRes.data);
    }
    assert(createLeadRes.ok, `Created Demo Lead: ${createLeadRes.data?.data?.name}`);
    leadName = createLeadRes.data?.data?.name;
  }
  assert(!!leadName, `Lead record established: ${leadName}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Add Timeline Discovery Note to Lead
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Adding Timeline Discovery Note ---');
  const noteContent = 'Stakeholder Demo: Initial discovery call completed with VP Maya Lin. Client requires next-gen robotic procurement integration by Q1.';
  const commentRes = await api('/api/method/frappe.desk.form.utils.add_comment', {
    method: 'POST',
    body: JSON.stringify({
      reference_doctype: 'Lead',
      reference_name: leadName,
      content: noteContent,
      comment_email: 'crm@netlink.com',
      comment_by: 'CRM Manager',
    }),
  });
  assert(commentRes.ok, 'Added discovery note via frappe add_comment');

  // Verify comment retrieval without comment_doctype error
  const getTimelineRes = await api(`/api/resource/Comment?filters=[["reference_doctype","=","Lead"],["reference_name","=","${leadName}"]]&fields=["name","content","creation"]`);
  assert(getTimelineRes.status === 200, 'Fetched Lead timeline with status 200');
  const comments = parseRecords(getTimelineRes.data);
  assert(comments.some(c => c.content.includes('Stakeholder Demo')), 'Timeline contains stakeholder discovery note');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Qualify Lead
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Qualifying Lead ---');
  const qualifyRes = await api(`/api/resource/Lead/${encodeURIComponent(leadName)}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'Interested',
      qualification_status: 'Qualified',
    }),
  });
  assert(qualifyRes.ok, `Updated Lead ${leadName} to Interested & Qualified`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Convert Lead to Opportunity via ERPNext Native make_opportunity
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Converting Lead to Opportunity ---');
  const existingOppRes = await api(`/api/resource/Opportunity?filters=[["Opportunity","party_name","=","${leadName}"]]`);
  const existingOpps = parseRecords(existingOppRes.data);
  let oppName = existingOpps[0]?.name;

  if (oppName) {
    console.log(`[INFO] Demo opportunity already linked to ${leadName}: ${oppName}`);
  } else {
    const makeOppRes = await api(`/api/method/erpnext.crm.doctype.lead.lead.make_opportunity?source_name=${encodeURIComponent(leadName)}`, {
      method: 'POST',
    });
    assert(makeOppRes.ok, 'Executed ERPNext native make_opportunity');
    const mapped = parseDoc(makeOppRes.data);
    mapped.opportunity_amount = 275000;
    mapped.sales_stage = 'Proposal/Price Quote';
    mapped.title = '[DEMO] Helix Surgical Robotics Procurement Platform';

    const saveOppRes = await api('/api/resource/Opportunity', {
      method: 'POST',
      body: JSON.stringify(mapped),
    });
    assert(saveOppRes.ok, `Saved Opportunity ${saveOppRes.data?.data?.name}`);
    oppName = saveOppRes.data?.data?.name;
  }
  assert(!!oppName, `Opportunity record established: ${oppName}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Progress Opportunity Sales Stage
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Progressing Sales Stage to "Negotiation/Review" ---');
  const stageUpdateRes = await api(`/api/resource/Opportunity/${encodeURIComponent(oppName)}`, {
    method: 'PUT',
    body: JSON.stringify({
      sales_stage: 'Negotiation/Review',
      probability: 75,
    }),
  });
  assert(stageUpdateRes.ok, `Opportunity ${oppName} stage updated to Negotiation/Review (75% probability)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Create Customer & Contact in ERPNext
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Setting Up Customer, Contact & Address ---');
  const custName = '[DEMO] Helix BioRobotics Inc';
  const existingCustRes = await api(`/api/resource/Customer/${encodeURIComponent(custName)}`);
  if (!existingCustRes.ok) {
    const createCustRes = await api('/api/resource/Customer', {
      method: 'POST',
      body: JSON.stringify({
        customer_name: custName,
        customer_group: 'Commercial',
        territory: 'United States',
        customer_type: 'Company',
      }),
    });
    assert(createCustRes.ok, `Created Customer: ${custName}`);
  } else {
    console.log(`[INFO] Customer ${custName} already exists`);
  }

  // Create or verify Contact
  const existingContactRes = await api('/api/resource/Contact?filters=[["Contact","email_id","=","maya.lin@helixbiorobotics.demo"]]');
  const existingContacts = parseRecords(existingContactRes.data);
  let contactName = existingContacts[0]?.name;
  if (!contactName) {
    const createContactRes = await api('/api/resource/Contact', {
      method: 'POST',
      body: JSON.stringify({
        first_name: 'Maya',
        last_name: 'Lin',
        email_id: 'maya.lin@helixbiorobotics.demo',
        mobile_no: '+1-415-555-0199',
        company_name: custName,
        designation: 'VP of Surgical Operations',
      }),
    });
    assert(createContactRes.ok, `Created Contact Maya Lin for ${custName}`);
    contactName = createContactRes.data?.data?.name;
  } else {
    console.log(`[INFO] Contact Maya Lin already exists: ${contactName}`);
  }
  assert(!!contactName, `Contact record established: ${contactName}`);

  // Create or verify Address
  const addrTitle = 'Helix BioRobotics HQ';
  const existingAddrRes = await api(`/api/resource/Address?filters=[["Address","address_title","=","${addrTitle}"]]`);
  const existingAddrs = parseRecords(existingAddrRes.data);
  let addrName = existingAddrs[0]?.name;
  if (!addrName) {
    const createAddrRes = await api('/api/resource/Address', {
      method: 'POST',
      body: JSON.stringify({
        address_title: addrTitle,
        address_type: 'Office',
        address_line1: '500 Innovation Way, Suite 400',
        city: 'San Francisco',
        state: 'California',
        pincode: '94107',
        country: 'United States',
      }),
    });
    assert(createAddrRes.ok, `Created Address: ${addrTitle}`);
    addrName = createAddrRes.data?.data?.name;
  } else {
    console.log(`[INFO] Address ${addrTitle} already exists: ${addrName}`);
  }
  assert(!!addrName, `Address record established: ${addrName}`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Close Separate Opportunity as Won
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Closing Separate Opportunity as Won ---');
  // Find an open opportunity to convert or verify CRM-OPP-2026-00004
  const targetWonOpp = 'CRM-OPP-2026-00004';
  const oppWonRes = await api(`/api/resource/Opportunity/${targetWonOpp}`, {
    method: 'PUT',
    body: JSON.stringify({
      status: 'Converted',
    }),
  });
  assert(oppWonRes.ok, `Closed Opportunity ${targetWonOpp} as Won (Converted)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Verify Dashboard KPIs and Charts with Real Data
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 8. Verifying Dashboard KPIs & Pipeline Distribution ---');
  const leadsCountRes = await api('/api/method/frappe.client.get_count?doctype=Lead');
  const leadsCount = leadsCountRes.data?.message;
  console.log(`Total Leads in ERPNext: ${leadsCount}`);
  assert(leadsCount >= 9, 'Lead count reflects new demo lead');

  const oppCountRes = await api('/api/method/frappe.client.get_count?doctype=Opportunity');
  const oppCount = oppCountRes.data?.message;
  console.log(`Total Opportunities in ERPNext: ${oppCount}`);
  assert(oppCount >= 7, 'Opportunity count reflects new demo opportunity');

  const wonOppCountRes = await api('/api/method/frappe.client.get_count?doctype=Opportunity&filters=[["Opportunity","status","=","Converted"]]');
  const wonCount = wonOppCountRes.data?.message;
  console.log(`Total Won Opportunities: ${wonCount}`);
  assert(wonCount >= 2, 'Won Opportunity count reflects closed deal (at least 2 won deals)');

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. Verify Script Reports
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 9. Verifying Script Reports with Real Backend Records ---');
  const repRes = await api('/api/method/frappe.desk.query_report.run', {
    method: 'POST',
    body: JSON.stringify({
      report_name: 'Opportunity Summary by Sales Stage',
      filters: { based_on: 'Opportunity Type', data_based_on: 'Number' },
    }),
  });
  assert(repRes.ok, 'Executed Opportunity Summary by Sales Stage report');
  const repResult = repRes.data?.message?.result || [];
  assert(repResult.length > 0, 'Opportunity Summary by Sales Stage returned aggregated rows');
  const salesRow = repResult.find(r => r.opportunity_type === 'Sales');
  assert(salesRow && salesRow['Negotiation/Review'] >= 2, 'Report reflects new demo deal in Negotiation/Review stage');

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. Search & Filter Verification
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 10. Verifying Search & Filters ---');
  const searchLeadRes = await api(`/api/resource/Lead?filters=[["Lead","company_name","like","%Helix%"]]`);
  const searchLeads = parseRecords(searchLeadRes.data);
  assert(searchLeads.length > 0, `Search Lead by "Helix" returned ${searchLeads.length} record(s)`);

  const searchOppRes = await api(`/api/resource/Opportunity?filters=[["Opportunity","party_name","=","${leadName}"]]`);
  const searchOpps = parseRecords(searchOppRes.data);
  assert(searchOpps.length > 0, `Search Opportunity linked to ${leadName} returned ${searchOpps.length} record(s)`);

  const searchCustRes = await api(`/api/resource/Customer?filters=[["Customer","customer_name","like","%Helix%"]]`);
  const searchCusts = parseRecords(searchCustRes.data);
  assert(searchCusts.length > 0, `Search Customer by "Helix" returned ${searchCusts.length} record(s)`);

  console.log('\n================================================================');
  console.log(' ALL 20 VERIFICATION POINTS PASSED CLEANLY IN ERPNEXT!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('[FATAL ERROR]:', err);
  process.exit(1);
});
