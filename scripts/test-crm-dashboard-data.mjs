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

const url = (env.VITE_ERPNEXT_URL || env.ERPNEXT_URL || '').replace(/\/$/, '');
const key = env.ERP_API_KEY || env.VITE_API_KEY;
const secret = env.ERP_API_SECRET || env.VITE_API_SECRET;
const headers = {
  'Authorization': 'token ' + key + ':' + secret,
  'Content-Type': 'application/json',
};

// Simulation of Bidsphere's unwrap response interceptor
function simulateAxiosUnwrap(payload) {
  if (payload && typeof payload === 'object') {
    if ('message' in payload && payload.message !== undefined) return payload.message;
    if ('data' in payload && payload.data !== undefined) return payload.data;
  }
  return payload;
}

function parseRecords(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    const r = res;
    if ('data' in r && Array.isArray(r.data)) return r.data;
    if ('message' in r && Array.isArray(r.message)) return r.message;
  }
  return [];
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

async function runDashboardTests() {
  console.log('========================================================');
  console.log(' CRM DASHBOARD DATA INTEGRITY TEST SUITE');
  console.log('========================================================\n');

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

  // 1. Test KPI Fetching
  console.log('--- 1. Testing KPI Endpoints and Parsing ---');
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const oneMonthAgo = d.toISOString().split('T')[0];

  const [rawNewLeads, rawNewOpps, rawWonOpps, rawOpenOpps] = await Promise.all([
    fetch(`${url}/api/method/frappe.client.get_count?doctype=Lead&filters=${encodeURIComponent(JSON.stringify([['creation', '>=', oneMonthAgo]]))}`, { headers }).then(r => r.json()),
    fetch(`${url}/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([['creation', '>=', oneMonthAgo]]))}`, { headers }).then(r => r.json()),
    fetch(`${url}/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([['status', '=', 'Converted'], ['modified', '>=', oneMonthAgo]]))}`, { headers }).then(r => r.json()),
    fetch(`${url}/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([['status', '=', 'Open']]))}`, { headers }).then(r => r.json()),
  ]);

  // Test both with simulated unwrapped and raw responses
  const unwrappedLeads = simulateAxiosUnwrap(rawNewLeads);
  const unwrappedOpps = simulateAxiosUnwrap(rawNewOpps);
  const unwrappedWon = simulateAxiosUnwrap(rawWonOpps);
  const unwrappedOpen = simulateAxiosUnwrap(rawOpenOpps);

  const newLeadsCount = parseCount(unwrappedLeads);
  const newOppsCount = parseCount(unwrappedOpps);
  const wonOppsCount = parseCount(unwrappedWon);
  const openOppsCount = parseCount(unwrappedOpen);

  assert(newLeadsCount === 8, `KPI "New Lead (Last 1 Month)" is ${newLeadsCount} (expected 8)`);
  assert(newOppsCount === 6, `KPI "New Opportunity (Last 1 Month)" is ${newOppsCount} (expected 6)`);
  assert(wonOppsCount === 1, `KPI "Won Opportunity (Last 1 Month)" is ${wonOppsCount} (expected 1)`);
  assert(openOppsCount === 5, `KPI "Open Opportunity" is ${openOppsCount} (expected 5)`);

  // 2. Test Incoming Leads Chart Data
  console.log('\n--- 2. Testing Incoming Leads Chart ---');
  const rawLeadsList = await fetch(`${url}/api/resource/Lead?fields=["name","creation"]&order_by=creation asc&limit_page_length=500`, { headers }).then(r => r.json());
  const unwrappedLeadsList = simulateAxiosUnwrap(rawLeadsList);
  const leadRecords = parseRecords(unwrappedLeadsList);

  assert(leadRecords.length === 8, `Parsed ${leadRecords.length} lead creation records from ERPNext`);

  // Daily grouping
  const now = new Date();
  const dailyMap = new Map();
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    dailyMap.set(dt.toISOString().split('T')[0], 0);
  }
  for (const r of leadRecords) {
    if (!r.creation) continue;
    const key = r.creation.split(' ')[0];
    if (dailyMap.has(key)) dailyMap.set(key, dailyMap.get(key) + 1);
  }
  const dailyPoints = Array.from(dailyMap.entries()).map(([date, leads]) => ({ date: date.slice(5), leads }));
  assert(dailyPoints.length === 14, `Daily trend generated 14 continuous date points`);
  const totalDailyLeads = dailyPoints.reduce((sum, p) => sum + p.leads, 0);
  assert(totalDailyLeads === 8, `Daily points sum up to ${totalDailyLeads} leads`);

  // Monthly grouping
  const monthlyMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(dt.toLocaleString('default', { month: 'short', year: '2-digit' }), 0);
  }
  for (const r of leadRecords) {
    if (!r.creation) continue;
    const dt = new Date(r.creation.replace(' ', 'T'));
    const key = dt.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (monthlyMap.has(key)) monthlyMap.set(key, monthlyMap.get(key) + 1);
  }
  const monthlyPoints = Array.from(monthlyMap.entries()).map(([date, leads]) => ({ date, leads }));
  assert(monthlyPoints.length === 6, `Monthly trend generated 6 continuous month points`);
  const totalMonthlyLeads = monthlyPoints.reduce((sum, p) => sum + p.leads, 0);
  assert(totalMonthlyLeads === 8, `Monthly points sum up to ${totalMonthlyLeads} leads`);

  // 3. Test Won Opportunities Chart
  console.log('\n--- 3. Testing Won Opportunities Chart ---');
  const rawWonList = await fetch(`${url}/api/resource/Opportunity?filters=${encodeURIComponent(JSON.stringify([['status', '=', 'Converted']]))}&fields=["name","modified","creation","opportunity_amount"]&limit_page_length=500`, { headers }).then(r => r.json());
  const unwrappedWonList = simulateAxiosUnwrap(rawWonList);
  const wonRecords = parseRecords(unwrappedWonList);

  assert(wonRecords.length === 1, `Found ${wonRecords.length} converted opportunity in ERPNext`);
  const wonValue = Number(wonRecords[0]?.opportunity_amount || 0);
  assert(wonValue === 240000, `Converted opportunity value is $${wonValue} (expected $240,000)`);

  // 4. Test Sales Pipeline Stages Distribution
  console.log('\n--- 4. Testing Sales Pipeline Stage Distribution ---');
  const rawStages = await fetch(`${url}/api/resource/Sales Stage?fields=["name","stage_name"]&limit_page_length=100`, { headers }).then(r => r.json());
  const stages = parseRecords(simulateAxiosUnwrap(rawStages));
  assert(stages.length === 8, `Loaded ${stages.length} real Sales Stages from ERPNext`);

  const rawAllOpps = await fetch(`${url}/api/resource/Opportunity?fields=["name","title","sales_stage","status","opportunity_amount"]&limit_page_length=500`, { headers }).then(r => r.json());
  const allOpps = parseRecords(simulateAxiosUnwrap(rawAllOpps));
  assert(allOpps.length === 6, `Loaded ${allOpps.length} opportunities for pipeline distribution`);

  let totalPipelineAmount = 0;
  for (const stg of stages) {
    const matching = allOpps.filter(o => o.sales_stage === stg.name);
    const amount = matching.reduce((sum, o) => sum + (Number(o.opportunity_amount) || 0), 0);
    totalPipelineAmount += amount;
    if (matching.length > 0) {
      console.log(`   Stage "${stg.name}": ${matching.length} deals, $${amount.toLocaleString()}`);
    }
  }
  assert(totalPipelineAmount === 1045000, `Total Pipeline Amount is $${totalPipelineAmount.toLocaleString()} (expected $1,045,000)`);

  console.log('\n========================================================');
  console.log(` SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  if (failed > 0) process.exit(1);
}

runDashboardTests().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
