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

const REPORT_DEFAULT_FILTERS = {
  "Sales Pipeline Analytics": {
    based_on: "Number",
    range: "Monthly",
    pipeline_by: "Sales Stage",
  },
  "Opportunity Summary by Sales Stage": {
    based_on: "Opportunity Type",
    data_based_on: "Number",
  },
};

const reportsToTest = [
  "Sales Pipeline Analytics",
  "Lead Details",
  "Opportunity Summary by Sales Stage",
  "Campaign Efficiency",
  "Lead Owner Efficiency",
  "Lost Opportunity",
  "First Response Time for Opportunity",
  "Prospects Engaged But Not Converted",
];

async function runReport(reportName, filters) {
  const mergedFilters = {
    ...(REPORT_DEFAULT_FILTERS[reportName] || {}),
    ...filters,
  };
  const res = await fetch(`${url}/api/method/frappe.desk.query_report.run`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      report_name: reportName,
      filters: mergedFilters,
    }),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('=== 1. Test Without from_date on Sales Pipeline Analytics ===');
  const resNoFromDate = await runReport('Sales Pipeline Analytics', {});
  console.log('Status without from_date:', resNoFromDate.status);
  console.log('Exception/Error:', resNoFromDate.data.exception || resNoFromDate.data._server_messages || resNoFromDate.data);

  console.log('\n=== 2. Test All Reports WITH Valid from_date & to_date ===');
  const validFilters = {
    from_date: '2026-10-01',
    to_date: '2026-10-28',
  };

  for (const rep of reportsToTest) {
    try {
      const res = await runReport(rep, validFilters);
      if (res.ok && res.data.message) {
        const cols = res.data.message.columns || [];
        const rows = res.data.message.result || [];
        console.log(`[PASS] ${rep}: HTTP ${res.status} | ${cols.length} columns | ${rows.length} rows`);
      } else {
        console.log(`[WARN/FAIL] ${rep}: HTTP ${res.status}`);
        if (res.data.exception) console.log('   exception:', res.data.exception);
        if (res.data._server_messages) console.log('   server_messages:', res.data._server_messages);
        if (res.data.message) console.log('   message:', JSON.stringify(res.data.message).slice(0, 150));
      }
    } catch (e) {
      console.log(`[ERROR] ${rep}:`, e.message);
    }
  }
}

main().catch(console.error);
