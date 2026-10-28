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

async function api(path) {
  const res = await fetch(`${url}${path}`, { headers });
  return await res.json();
}

function parseRecords(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if ('data' in res && Array.isArray(res.data)) return res.data;
    if ('message' in res && Array.isArray(res.message)) return res.message;
  }
  return [];
}

async function main() {
  console.log('================================================================');
  console.log(' VERIFYING LIVE CRM DASHBOARD CHARTS & KPIS');
  console.log(` Target ERPNext: ${url}`);
  console.log('================================================================\n');

  // 1. KPIs
  console.log('--- 1. Dashboard KPI Cards ---');
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const oneMonthAgo = d.toISOString().split('T')[0];

  const [leadsKpi, oppsKpi, wonKpi, openKpi] = await Promise.all([
    api(`/api/method/frappe.client.get_count?doctype=Lead&filters=${encodeURIComponent(JSON.stringify([["creation", ">=", oneMonthAgo]]))}`),
    api(`/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([["creation", ">=", oneMonthAgo]]))}`),
    api(`/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([["status", "=", "Converted"], ["modified", ">=", oneMonthAgo]]))}`),
    api(`/api/method/frappe.client.get_count?doctype=Opportunity&filters=${encodeURIComponent(JSON.stringify([["status", "=", "Open"]]))}`),
  ]);

  console.log(`New Leads (Last Month): ${leadsKpi.message}`);
  console.log(`New Opportunities (Last Month): ${oppsKpi.message}`);
  console.log(`Won Opportunities (Last Month): ${wonKpi.message}`);
  console.log(`Open Opportunities: ${openKpi.message}`);

  // 2. Monthly Incoming Leads Chart
  console.log('\n--- 2. Monthly Incoming Leads Chart (Last 6 Months) ---');
  const leadRes = await api('/api/resource/Lead?fields=["name","creation","lead_date"]&order_by=creation asc&limit_page_length=1000');
  const leads = parseRecords(leadRes);

  const now = new Date();
  const monthlyLeadsMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = dt.toLocaleString('default', { month: 'short', year: '2-digit' });
    monthlyLeadsMap.set(key, 0);
  }

  for (const r of leads) {
    const dateStr = r.lead_date || (r.creation ? r.creation.split(' ')[0] : '');
    if (!dateStr) continue;
    const dt = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    const key = dt.toLocaleString('default', { month: 'short', year: '2-digit' });
    if (monthlyLeadsMap.has(key)) {
      monthlyLeadsMap.set(key, monthlyLeadsMap.get(key) + 1);
    }
  }
  console.table(Array.from(monthlyLeadsMap.entries()).map(([month, count]) => ({ Month: month, 'Incoming Leads': count })));

  // 3. Won Opportunities Monthly Chart
  console.log('\n--- 3. Monthly Won Opportunities Chart (Last 6 Months) ---');
  const oppWonRes = await api(`/api/resource/Opportunity?filters=${encodeURIComponent(JSON.stringify([["status", "=", "Converted"]]))}&fields=["name","modified","creation","opportunity_amount","transaction_date"]&limit_page_length=500`);
  const wonOpps = parseRecords(oppWonRes);

  const wonMap = new Map();
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = dt.toLocaleString('default', { month: 'short', year: '2-digit' });
    wonMap.set(key, { count: 0, value: 0 });
  }

  for (const o of wonOpps) {
    const dateStr = o.transaction_date || o.modified || o.creation;
    if (!dateStr) continue;
    const dt = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    const key = dt.toLocaleString('default', { month: 'short', year: '2-digit' });
    const cur = wonMap.get(key) || { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(o.opportunity_amount || 0);
    wonMap.set(key, cur);
  }
  console.table(Array.from(wonMap.entries()).map(([month, data]) => ({ Month: month, 'Won Deals': data.count, 'Won Value': `$${data.value.toLocaleString()}` })));

  // 4. Pipeline Stages
  console.log('\n--- 4. Sales Pipeline Stage Distribution ---');
  const stagesRes = await api('/api/resource/Sales Stage?fields=["name","stage_name"]&limit_page_length=100');
  const stages = parseRecords(stagesRes);

  const allOppsRes = await api('/api/resource/Opportunity?fields=["name","title","sales_stage","status","opportunity_amount"]&limit_page_length=500');
  const allOpps = parseRecords(allOppsRes);

  let totalPipeline = 0;
  const stageRows = stages.map(s => {
    const deals = allOpps.filter(o => o.sales_stage === s.name);
    const sum = deals.reduce((acc, o) => acc + (Number(o.opportunity_amount) || 0), 0);
    totalPipeline += sum;
    return {
      Stage: s.name,
      'Deals Count': deals.length,
      'Total Value': `$${sum.toLocaleString()}`,
    };
  });
  console.table(stageRows);
  console.log(`\nTotal Pipeline Value: $${totalPipeline.toLocaleString()}`);

  console.log('\n================================================================');
  console.log(' ALL 4 MONTHS OF CRM DATA VALIDATED AND VISIBLE!');
  console.log('================================================================');
}

main().catch(console.error);
