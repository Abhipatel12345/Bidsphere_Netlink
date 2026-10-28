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
  const lRes = await fetch(`${url}/api/resource/Lead?fields=["name","lead_name","company_name","status","email_id","creation"]&limit_page_length=20`, { headers });
  const leads = await lRes.json();
  console.log('--- LEADS ---');
  console.log(leads.data);

  const oRes = await fetch(`${url}/api/resource/Opportunity?fields=["name","opportunity_from","party_name","status","sales_stage","opportunity_amount","creation"]&limit_page_length=20`, { headers });
  const opps = await oRes.json();
  console.log('\n--- OPPORTUNITIES ---');
  console.log(opps.data);

  const cRes = await fetch(`${url}/api/resource/Customer?fields=["name","customer_name","customer_group","territory"]&limit_page_length=20`, { headers });
  const custs = await cRes.json();
  console.log('\n--- CUSTOMERS ---');
  console.log(custs.data);
}

main().catch(console.error);
