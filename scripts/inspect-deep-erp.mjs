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
  if (!res.ok) return { error: res.status, text: await res.text() };
  return await res.json();
}

async function check() {
  const dts = [
    'Company', 'Customer', 'Lead', 'Opportunity', 'Quotation', 
    'Sales Order', 'Delivery Note', 'Sales Invoice', 'Issue', 
    'Warranty Claim', 'Item', 'Brand', 'Shipment', 'User', 'Role'
  ];
  console.log('=== Checking DocTypes Counts & Samples ===');
  for (const dt of dts) {
    const c = await get('/api/method/frappe.client.get_count?doctype=' + encodeURIComponent(dt));
    console.log(dt + ' count:', c.message !== undefined ? c.message : c);
  }

  console.log('\n=== Companies ===');
  const companies = await get('/api/resource/Company?fields=["name","company_name","default_currency"]');
  console.log('Companies:', companies.data);

  console.log('\n=== Issue DocType Fields / Records ===');
  const issueMeta = await get('/api/method/frappe.desk.form.load.getdoctype?doctype=Issue');
  if (issueMeta.docs) {
    const fields = issueMeta.docs[0].fields.map(f => ({ fieldname: f.fieldname, label: f.label, fieldtype: f.fieldtype, options: f.options }));
    console.log('Issue DocType exists! Fields count:', fields.length);
    console.log('All fields:', fields.map(f => `${f.fieldname} (${f.fieldtype})${f.options ? ' -> ' + f.options : ''}`));
  } else {
    console.log('Issue meta error:', issueMeta);
  }

  const issueSample = await get('/api/resource/Issue?limit_page_length=10');
  console.log('Issue records sample:', issueSample.data);

  console.log('\n=== Sales Order Sample ===');
  const soSample = await get('/api/resource/Sales Order?limit_page_length=5&fields=["name","customer","transaction_date","grand_total","status","delivery_status","per_delivered"]');
  console.log('Sales Orders:', soSample.data);

  console.log('\n=== Delivery Note Sample ===');
  const dnSample = await get('/api/resource/Delivery Note?limit_page_length=5&fields=["name","customer","posting_date","grand_total","status","per_installed"]');
  console.log('Delivery Notes:', dnSample.data);

  console.log('\n=== Brands ===');
  const brands = await get('/api/resource/Brand?limit_page_length=50');
  console.log('Brands:', brands.data);

  console.log('\n=== Items ===');
  const items = await get('/api/resource/Item?limit_page_length=5&fields=["name","item_name","item_group","brand"]');
  console.log('Items sample:', items.data);
}

check().catch(console.error);
