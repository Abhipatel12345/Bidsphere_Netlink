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
const headers = { 'Authorization': 'token ' + key + ':' + secret };

async function get(path) {
  const res = await fetch(url + path, { headers });
  if (!res.ok) {
    return { error: res.status, text: await res.text() };
  }
  return await res.json();
}

async function discover() {
  console.log('=== CRM Workspace ===');
  const ws = await get('/api/resource/Workspace/CRM');
  if (ws.data) {
    console.log('Workspace Title:', ws.data.title);
    console.log('Workspace Content:', ws.data.content);
    console.log('Workspace Links:');
    for (const l of (ws.data.links || [])) {
      console.log(`  [${l.type}] ${l.label} -> ${l.link_to} (${l.link_type})`);
    }
  } else {
    console.log('CRM Workspace fetch:', ws);
  }

  console.log('\n=== CRM Roles in System ===');
  const roles = await get('/api/resource/Role?limit_page_length=200');
  const crmRoles = (roles.data || []).filter(r => /crm|sales|lead|customer/i.test(r.name));
  console.log('CRM related roles:', crmRoles.map(r => r.name));

  console.log('\n=== DocType Counts ===');
  const doctypes = [
    'Lead', 'Opportunity', 'Customer', 'Contact', 'Address', 
    'Campaign', 'Sales Stage', 'Opportunity Type', 'Lead Source', 
    'Customer Group', 'Territory', 'Sales Person', 'CRM Settings',
    'Communication', 'Activity Log', 'ToDo', 'File'
  ];
  for (const dt of doctypes) {
    const countRes = await get('/api/method/frappe.client.get_count?doctype=' + dt);
    console.log(dt + ' count:', countRes.message !== undefined ? countRes.message : countRes);
  }

  console.log('\n=== CRM Reports ===');
  const reports = await get('/api/resource/Report?filters=' + encodeURIComponent(JSON.stringify([["module","=","CRM"]])) + '&fields=' + encodeURIComponent(JSON.stringify(["name","report_type","ref_doctype"])));
  console.log('CRM reports:', reports.data);

  console.log('\n=== Master Data Records ===');
  const ss = await get('/api/resource/Sales Stage?fields=["name","stage_name"]');
  console.log('Sales Stages:', ss.data);
  const ot = await get('/api/resource/Opportunity Type?fields=["name"]');
  console.log('Opportunity Types:', ot.data);
  const cg = await get('/api/resource/Customer Group?fields=["name"]');
  console.log('Customer Groups:', cg.data);
  const ter = await get('/api/resource/Territory?fields=["name"]');
  console.log('Territories:', ter.data);
  const utm = await get('/api/resource/UTM Source?fields=["name"]');
  console.log('UTM Sources (Lead Sources):', utm.data);
  console.log('\n=== Dashboard Charts ===');
  const charts = await get('/api/resource/Dashboard Chart?filters=' + encodeURIComponent(JSON.stringify([["module","=","CRM"]])));
  console.log('CRM Charts:', charts.data);
  for (const c of (charts.data || [])) {
    const detail = await get('/api/resource/Dashboard Chart/' + encodeURIComponent(c.name));
    console.log('Chart detail:', detail.data?.name, {
      chart_name: detail.data?.chart_name,
      chart_type: detail.data?.chart_type,
      document_type: detail.data?.document_type,
      based_on: detail.data?.based_on,
      filters_json: detail.data?.filters_json,
      time_interval: detail.data?.time_interval,
      timespan: detail.data?.timespan
    });
  }
}

discover().catch(console.error);
