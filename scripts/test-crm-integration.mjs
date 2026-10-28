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

async function runTests() {
  console.log('====================================================');
  console.log(' BIDSPHERE CRM INTEGRATION TEST SUITE');
  console.log('====================================================\n');

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

  // 1. RBAC Unit Tests
  console.log('--- 1. Testing Role-Based Access Control ---');
  assert(canAccessPath('crm', '/crm/dashboard'), 'CRM Manager can access /crm/dashboard');
  assert(canAccessPath('crm', '/crm/leads'), 'CRM Manager can access /crm/leads');
  assert(canAccessPath('crm', '/crm/pipeline'), 'CRM Manager can access /crm/pipeline');
  assert(canAccessPath('admin', '/crm/dashboard'), 'Administrator can access /crm/dashboard');

  assert(!canAccessPath('procurement', '/crm/dashboard'), 'Procurement Manager denied /crm/dashboard');
  assert(!canAccessPath('finance', '/crm/dashboard'), 'Finance Manager denied /crm/dashboard');
  assert(!canAccessPath('warehouse', '/crm/dashboard'), 'Warehouse Manager denied /crm/dashboard');
  assert(!canAccessPath('legal', '/crm/dashboard'), 'Legal Reviewer denied /crm/dashboard');

  const crmNav = getNavGroupsForRole('crm');
  const crmGroup = crmNav.flatMap(g => g.items).find(i => i.label === 'CRM');
  assert(!!crmGroup, 'CRM navigation item present in sidebar for CRM Manager');
  assert(crmGroup?.children?.length === 10, 'CRM navigation has all 10 sub-modules');

  const procNav = getNavGroupsForRole('procurement');
  const procCrm = procNav.flatMap(g => g.items).find(i => i.label === 'CRM');
  assert(!procCrm, 'CRM navigation hidden from Procurement Manager');

  // 2. Authentication Test
  console.log('\n--- 2. Testing CRM Manager Authentication ---');
  const loginRes = await fetch(url + '/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'crm@netlink.com', pwd: 'Netlink@2026' }),
  });
  assert(loginRes.status === 200, 'crm@netlink.com authenticated with status 200');
  const loginData = await loginRes.json();
  assert(loginData.message === 'Logged In', 'Login response confirmed "Logged In"');

  const userRole = resolveRoleFromUser({
    name: 'crm@netlink.com',
    email: 'crm@netlink.com',
    erpnext_roles: ['Sales Manager', 'Sales User'],
  });
  assert(userRole === 'crm', 'Resolved role from ERPNext user is "crm"');

  // 3. Lead CRUD & ERPNext Live Operations
  console.log('\n--- 3. Testing Lead Operations in ERPNext ---');
  const testLeadPayload = {
    doctype: 'Lead',
    first_name: 'Antigravity',
    last_name: 'TestLead',
    company_name: 'Antigravity Aerospace Systems',
    email_id: 'qa.testlead@antigravity.dev',
    mobile_no: '+1 555-0142',
    status: 'Lead',
    type: 'Client',
    utm_source: 'Advertisement',
    territory: 'United States',
  };

  const createLeadRes = await fetch(url + '/api/resource/Lead', {
    method: 'POST',
    headers,
    body: JSON.stringify(testLeadPayload),
  });
  assert(createLeadRes.status === 200, 'Created Lead in ERPNext');
  const createdLead = (await createLeadRes.json()).data;
  const leadName = createdLead.name;
  console.log(`   Created Lead: ${leadName} (${createdLead.lead_name})`);

  // Read Lead
  const getLeadRes = await fetch(url + `/api/resource/Lead/${encodeURIComponent(leadName)}`, { headers });
  assert(getLeadRes.status === 200, 'Read Lead from ERPNext');

  // Update Lead
  const updateLeadRes = await fetch(url + `/api/resource/Lead/${encodeURIComponent(leadName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ status: 'Interested' }),
  });
  assert(updateLeadRes.status === 200, 'Updated Lead status to Interested in ERPNext');

  // Add Comment/Note
  const commentRes = await fetch(url + '/api/method/frappe.desk.form.utils.add_comment', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reference_doctype: 'Lead',
      reference_name: leadName,
      content: 'Antigravity automated integration test note.',
      comment_email: 'crm@netlink.com',
      comment_by: 'CRM Manager',
    }),
  });
  assert(commentRes.status === 200, 'Added comment note to Lead timeline');

  // 4. Lead to Opportunity Conversion
  console.log('\n--- 4. Testing Lead Conversion Business Logic ---');
  const convertRes = await fetch(url + '/api/method/erpnext.crm.doctype.lead.lead.make_opportunity', {
    method: 'POST',
    headers,
    body: JSON.stringify({ source_name: leadName }),
  });
  assert(convertRes.status === 200, 'Executed ERPNext make_opportunity business logic');
  const mappedOpp = (await convertRes.json()).message;
  assert(mappedOpp?.opportunity_from === 'Lead', 'Mapped Opportunity has opportunity_from = Lead');

  // Save the converted Opportunity
  mappedOpp.opportunity_amount = 75000;
  mappedOpp.sales_stage = 'Prospecting';
  const saveOppRes = await fetch(url + '/api/resource/Opportunity', {
    method: 'POST',
    headers,
    body: JSON.stringify(mappedOpp),
  });
  assert(saveOppRes.status === 200, 'Saved converted Opportunity into ERPNext');
  const createdOpp = (await saveOppRes.json()).data;
  const oppName = createdOpp.name;
  console.log(`   Created Opportunity: ${oppName} ($${createdOpp.opportunity_amount})`);

  // Advance Opportunity Stage
  const updateStageRes = await fetch(url + `/api/resource/Opportunity/${encodeURIComponent(oppName)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ sales_stage: 'Needs Analysis' }),
  });
  assert(updateStageRes.status === 200, 'Updated Opportunity stage to Needs Analysis');

  // 5. CRM Reports Execution
  console.log('\n--- 5. Testing ERPNext CRM Reports ---');
  const reportRes = await fetch(url + '/api/method/frappe.desk.query_report.run', {
    method: 'POST',
    headers,
    body: JSON.stringify({ report_name: 'Lead Details', filters: {} }),
  });
  assert(reportRes.status === 200, 'Executed ERPNext "Lead Details" report');
  const reportData = (await reportRes.json()).message;
  assert((reportData?.columns || []).length > 0, 'Report returned valid columns');

  const pipelineReportRes = await fetch(url + '/api/method/frappe.desk.query_report.run', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      report_name: 'Opportunity Summary by Sales Stage',
      filters: { based_on: 'Opportunity Type', data_based_on: 'Number' },
    }),
  });
  assert(pipelineReportRes.status === 200, 'Executed "Opportunity Summary by Sales Stage" report');

  // 6. Cleanup
  console.log('\n--- 6. Cleaning Up Test Documents ---');
  const delOppRes = await fetch(url + `/api/resource/Opportunity/${encodeURIComponent(oppName)}`, {
    method: 'DELETE',
    headers,
  });
  assert(delOppRes.status === 200 || delOppRes.status === 202, 'Cleaned up test Opportunity');

  const delLeadRes = await fetch(url + `/api/resource/Lead/${encodeURIComponent(leadName)}`, {
    method: 'DELETE',
    headers,
  });
  assert(delLeadRes.status === 200 || delLeadRes.status === 202, 'Cleaned up test Lead');

  console.log('\n====================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
