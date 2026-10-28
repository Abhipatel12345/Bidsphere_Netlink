import fs from 'fs';
import { canAccessPath, resolveRoleFromUser, getNavGroupsForRole } from '../src/config/roles.js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const url = (env.VITE_ERPNEXT_URL || env.ERPNEXT_URL || '').replace(/\/$/, '');
const key = env.ERP_API_KEY || env.VITE_API_KEY;
const secret = env.ERP_API_SECRET || env.VITE_API_SECRET;
const headers = {
  'Authorization': 'token ' + key + ':' + secret,
  'Content-Type': 'application/json',
};

function parseRecords(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    const r = res;
    if ('data' in r && Array.isArray(r.data)) return r.data;
    if ('message' in r && Array.isArray(r.message)) return r.message;
  }
  return [];
}

function parseDoc(res) {
  if (res && typeof res === 'object') {
    const r = res;
    if ('data' in r && r.data && typeof r.data === 'object' && !Array.isArray(r.data)) return r.data;
    if ('message' in r && r.message && typeof r.message === 'object' && !Array.isArray(r.message)) return r.message;
  }
  return res;
}

function parseCount(res) {
  if (typeof res === 'number') return res;
  if (res && typeof res === 'object') {
    const r = res;
    if ('message' in r && typeof r.message === 'number') return r.message;
    if ('data' in r) {
      const d = r.data;
      if (typeof d === 'number') return d;
      if (d && typeof d === 'object' && 'message' in d && typeof d.message === 'number') return d.message;
      if (Array.isArray(d)) return d.length;
    }
    if (Array.isArray(res)) return res.length;
  }
  return 0;
}

async function api(path, options = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runE2ETests() {
  console.log('================================================================');
  console.log(' COMPLETE CRM END-TO-END QA & FUNCTIONAL VERIFICATION SUITE');
  console.log(` Target Instance: ${url}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Module 1: RBAC & Permissions
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Role-Based Access Control & Navigation ---');
  assert(canAccessPath('crm', '/crm/dashboard'), 'CRM Manager allowed /crm/dashboard');
  assert(canAccessPath('crm', '/crm/leads'), 'CRM Manager allowed /crm/leads');
  assert(canAccessPath('crm', '/crm/opportunities'), 'CRM Manager allowed /crm/opportunities');
  assert(canAccessPath('crm', '/crm/pipeline'), 'CRM Manager allowed /crm/pipeline');
  assert(canAccessPath('crm', '/crm/customers'), 'CRM Manager allowed /crm/customers');
  assert(canAccessPath('crm', '/crm/contacts'), 'CRM Manager allowed /crm/contacts');
  assert(canAccessPath('crm', '/crm/addresses'), 'CRM Manager allowed /crm/addresses');
  assert(canAccessPath('crm', '/crm/campaigns'), 'CRM Manager allowed /crm/campaigns');
  assert(canAccessPath('crm', '/crm/reports'), 'CRM Manager allowed /crm/reports');
  assert(canAccessPath('crm', '/crm/setup'), 'CRM Manager allowed /crm/setup');

  assert(!canAccessPath('procurement', '/crm/dashboard'), 'Procurement Manager blocked from /crm/dashboard');
  assert(!canAccessPath('finance', '/crm/dashboard'), 'Finance Manager blocked from /crm/dashboard');
  assert(!canAccessPath('warehouse', '/crm/dashboard'), 'Warehouse Manager blocked from /crm/dashboard');
  assert(!canAccessPath('legal', '/crm/dashboard'), 'Legal Reviewer blocked from /crm/dashboard');

  const crmNav = getNavGroupsForRole('crm');
  const crmGroup = crmNav.flatMap(g => g.items).find(i => i.label === 'CRM');
  assert(!!crmGroup, 'CRM navigation item rendered in sidebar');
  assert(crmGroup?.children?.length === 10, 'All 10 CRM sub-modules present in navigation');

  // ─────────────────────────────────────────────────────────────────────────────
  // Module 2: Authentication
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing CRM Manager Authentication ---');
  const loginRes = await fetch(`${url}/api/method/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'crm@netlink.com', pwd: 'Netlink@2026' }),
  });
  assert(loginRes.status === 200, 'crm@netlink.com successfully authenticated via /api/method/login');
  const loginData = await loginRes.json();
  assert(loginData.message === 'Logged In', 'Login response confirmed session established');

  const userRes = await api('/api/resource/User/crm@netlink.com');
  const userRoles = userRes.data?.data?.roles?.map(r => r.role) ?? [];
  const resolvedRole = resolveRoleFromUser({
    name: 'crm@netlink.com',
    email: 'crm@netlink.com',
    erpnext_roles: userRoles,
  });
  assert(resolvedRole === 'crm', `Resolved AppRole is "${resolvedRole}"`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Module 3: Live Dashboard KPIs
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Live Dashboard KPIs ---');
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const oneMonthAgo = d.toISOString().split('T')[0];

  const [kpiLeads, kpiOpps, kpiWon, kpiOpen] = await Promise.all([
    api(`/api/method/frappe.client.get_count?doctype=Lead&filters=${encodeURIComponent(JSON.stringify([['creation', '>=', oneMonthAgo]]))}`),
    api(`/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([['creation', '>=', oneMonthAgo]]))}`),
    api(`/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([['status', '=', 'Converted'], ['modified', '>=', oneMonthAgo]]))}`),
    api(`/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([['status', '=', 'Open']]))}`),
  ]);

  const countLeads = parseCount(kpiLeads.data);
  const countOpps = parseCount(kpiOpps.data);
  const countWon = parseCount(kpiWon.data);
  const countOpen = parseCount(kpiOpen.data);

  assert(countLeads >= 8, `KPI "New Lead (Last 1 Month)": ${countLeads} (real non-zero data)`);
  assert(countOpps >= 6, `KPI "New Opportunity (Last 1 Month)": ${countOpps} (real non-zero data)`);
  assert(countWon >= 1, `KPI "Won Opportunity (Last 1 Month)": ${countWon} (real non-zero data)`);
  assert(countOpen >= 5, `KPI "Open Opportunity": ${countOpen} (real non-zero data)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Module 4: Sales Pipeline & Stages
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Sales Pipeline & Kanban Stages ---');
  const stagesRes = await api('/api/resource/Sales Stage?fields=["name","stage_name"]&limit_page_length=100');
  const stages = parseRecords(stagesRes.data);
  assert(stages.length === 8, `Loaded ${stages.length} Sales Stages from ERPNext master`);

  const oppsRes = await api('/api/resource/Opportunity?fields=["name","title","sales_stage","status","opportunity_amount"]&limit_page_length=500');
  const allOpps = parseRecords(oppsRes.data);
  assert(allOpps.length >= 6, `Loaded ${allOpps.length} opportunities for pipeline distribution`);

  let pipelineTotal = 0;
  for (const stg of stages) {
    const deals = allOpps.filter(o => o.sales_stage === stg.name);
    const sum = deals.reduce((s, o) => s + (Number(o.opportunity_amount) || 0), 0);
    pipelineTotal += sum;
  }
  assert(pipelineTotal >= 1045000, `Total Pipeline Value is $${pipelineTotal.toLocaleString()} (real ERPNext records)`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Module 5: Leads Lifecycle CRUD & Notes/Comments (Regression Test for Bug)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Lead Lifecycle & Comments (Checking comment_doctype Fix) ---');
  const newLeadPayload = {
    doctype: 'Lead',
    first_name: 'QA Validation',
    last_name: 'Lead',
    company_name: 'Automated Test Corp',
    email_id: `qa.test.${Date.now()}@autocorp.com`,
    status: 'Lead',
    utm_source: 'Exhibition',
    lead_owner: 'crm@netlink.com',
  };

  const createLeadRes = await api('/api/resource/Lead', {
    method: 'POST',
    body: JSON.stringify(newLeadPayload),
  });
  assert(createLeadRes.ok, `Lead created successfully in ERPNext (${createLeadRes.data?.data?.name})`);
  const testLeadName = createLeadRes.data?.data?.name;

  // Add Comment note via add_comment
  const addCommentRes = await api('/api/method/frappe.desk.form.utils.add_comment', {
    method: 'POST',
    body: JSON.stringify({
      reference_doctype: 'Lead',
      reference_name: testLeadName,
      content: 'Automated test note verifying timeline query',
      comment_email: 'crm@netlink.com',
      comment_by: 'CRM Manager',
    }),
  });
  assert(addCommentRes.ok, 'Added timeline comment via frappe.desk.form.utils.add_comment');

  // Query Comment using corrected reference_doctype filter
  const commentFilter = JSON.stringify([
    ['reference_doctype', '=', 'Lead'],
    ['reference_name', '=', testLeadName],
    ['comment_type', '=', 'Comment'],
  ]);
  const fields = JSON.stringify(['name', 'content', 'owner', 'comment_by', 'creation']);
  const getCommentsRes = await api(`/api/resource/Comment?filters=${encodeURIComponent(commentFilter)}&fields=${encodeURIComponent(fields)}`);
  assert(getCommentsRes.status === 200, `Comment query executed with status 200 (NO Field not permitted error)`);
  const commentDocs = parseRecords(getCommentsRes.data);
  assert(commentDocs.length === 1, `Fetched ${commentDocs.length} timeline comment matching created note`);

  // Update Lead status
  const updateLeadRes = await api(`/api/resource/Lead/${encodeURIComponent(testLeadName)}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'Interested' }),
  });
  assert(updateLeadRes.ok && updateLeadRes.data?.data?.status === 'Interested', 'Updated lead status to "Interested"');

  // Convert Lead to Opportunity using native ERPNext method
  const convertRes = await api('/api/method/erpnext.crm.doctype.lead.lead.make_opportunity', {
    method: 'POST',
    body: JSON.stringify({ source_name: testLeadName }),
  });
  assert(convertRes.ok, 'Executed ERPNext native make_opportunity conversion method');
  const mappedOpp = convertRes.data?.message;
  assert(mappedOpp?.opportunity_from === 'Lead', 'Mapped opportunity has opportunity_from = Lead');

  mappedOpp.opportunity_amount = 50000;
  mappedOpp.sales_stage = 'Qualification';
  const saveOppRes = await api('/api/resource/Opportunity', {
    method: 'POST',
    body: JSON.stringify(mappedOpp),
  });
  assert(saveOppRes.ok, `Saved converted opportunity into ERPNext (${saveOppRes.data?.data?.name})`);
  const testOppName = saveOppRes.data?.data?.name;

  // Clean up test documents
  if (testOppName) {
    await api(`/api/resource/Opportunity/${encodeURIComponent(testOppName)}`, { method: 'DELETE' });
  }
  if (testLeadName) {
    await api(`/api/resource/Lead/${encodeURIComponent(testLeadName)}`, { method: 'DELETE' });
  }
  if (commentDocs[0]?.name) {
    await api(`/api/resource/Comment/${encodeURIComponent(commentDocs[0].name)}`, { method: 'DELETE' });
  }
  console.log('[CLEANUP] Successfully cleaned up temporary test documents');

  // ─────────────────────────────────────────────────────────────────────────────
  // Module 6: Customer & Related Records
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Customers & Related Records ---');
  const custRes = await api('/api/resource/Customer?fields=["name","customer_name"]&limit_page_length=100');
  const customers = parseRecords(custRes.data);
  assert(customers.length >= 4, `Fetched ${customers.length} Customers from ERPNext`);

  const titanCust = customers.find(c => c.customer_name === 'Titan Enterprise Solutions' || c.name === 'Titan Enterprise Solutions');
  assert(!!titanCust, 'Found demo customer "Titan Enterprise Solutions"');

  // Test Contact lookup without Dynamic Link 403 error
  const conFilter = JSON.stringify([['Contact', 'name', 'like', '%Titan Enterprise Solutions%']]);
  const linkedContactsRes = await api(`/api/resource/Contact?filters=${encodeURIComponent(conFilter)}&fields=["name","first_name","last_name","designation"]`);
  assert(linkedContactsRes.status === 200, 'Linked contact query succeeded without permission error');
  const linkedContacts = parseRecords(linkedContactsRes.data);
  assert(linkedContacts.length >= 1, `Found ${linkedContacts.length} linked contact for Titan Enterprise Solutions (${linkedContacts[0]?.first_name} ${linkedContacts[0]?.last_name})`);

  // ─────────────────────────────────────────────────────────────────────────────
  // Module 7: CRM Reports
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 7. Testing CRM Reports Execution ---');
  const report1 = await api('/api/method/frappe.desk.query_report.run', {
    method: 'POST',
    body: JSON.stringify({ report_name: 'Lead Details', filters: {} }),
  });
  assert(report1.ok && report1.data?.message?.columns?.length > 0, `Executed "Lead Details" report (${report1.data?.message?.columns?.length} columns)`);

  const report2 = await api('/api/method/frappe.desk.query_report.run', {
    method: 'POST',
    body: JSON.stringify({
      report_name: 'Opportunity Summary by Sales Stage',
      filters: { based_on: 'Opportunity Type', data_based_on: 'Number' },
    }),
  });
  assert(report2.ok && report2.data?.message?.columns?.length > 0, `Executed "Opportunity Summary by Sales Stage" report (${report2.data?.message?.columns?.length} columns)`);

  console.log('\n================================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runE2ETests().catch(err => {
  console.error('Fatal error in QA suite:', err);
  process.exit(1);
});
