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
  const doctypes = ['Lead', 'Opportunity', 'Customer', 'Contact', 'Address', 'Campaign'];
  for (const dt of doctypes) {
    const res = await fetch(`${url}/api/method/frappe.client.get_count?doctype=${dt}`, { headers });
    const count = await res.json();
    console.log(`${dt}: ${count.message} records`);
  }

  const campRes = await fetch(`${url}/api/resource/Campaign?limit_page_length=5`, { headers });
  console.log('Campaign sample:', await campRes.json());
}

main().catch(console.error);
