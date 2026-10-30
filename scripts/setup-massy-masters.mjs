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
const headers = { 
  'Authorization': 'token ' + key + ':' + secret,
  'Content-Type': 'application/json'
};

async function post(path, body) {
  const res = await fetch(url + path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });
  const text = await res.text();
  try {
    return { status: res.status, data: JSON.parse(text) };
  } catch {
    return { status: res.status, text };
  }
}

async function get(path) {
  const res = await fetch(url + path, { headers });
  return await res.json();
}

async function setup() {
  console.log('=== 1. Checking / Creating Brands ===');
  const brands = [
    'Massy Consumer Goods',
    'Massy Motors & Automotive',
    'Massy Industrial Equipment',
    'Massy Energy & Chemicals',
    'Massy Healthcare & Pharma'
  ];
  for (const b of brands) {
    const res = await post('/api/resource/Brand', { brand: b });
    if (res.status === 200 || res.status === 409) {
      console.log(`Brand "${b}":`, res.status === 200 ? 'Created' : 'Already exists');
    } else {
      console.log(`Brand "${b}":`, res.status, res.data?.message || res.data?._server_messages || res.text);
    }
  }

  console.log('\n=== 2. Checking / Creating Issue Types ===');
  const issueTypes = [
    'Product Quality Defect',
    'Delivery Delay',
    'Damaged Goods in Transit',
    'Billing & Invoicing Discrepancy',
    'Packaging & Labeling Issue',
    'Wrong Item Shipped'
  ];
  for (const it of issueTypes) {
    const res = await post('/api/resource/Issue Type', { name: it });
    if (res.status === 200 || res.status === 409) {
      console.log(`Issue Type "${it}":`, res.status === 200 ? 'Created' : 'Already exists');
    } else {
      console.log(`Issue Type "${it}":`, res.status, res.data?.message || res.data?._server_messages || res.text);
    }
  }

  console.log('\n=== 3. Checking / Creating Urgent Issue Priority ===');
  const prioRes = await post('/api/resource/Issue Priority', { name: 'Urgent' });
  console.log('Issue Priority "Urgent":', prioRes.status);
}

setup().catch(console.error);
