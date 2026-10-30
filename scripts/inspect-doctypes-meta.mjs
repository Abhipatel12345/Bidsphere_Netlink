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

async function inspectDocTypes() {
  const targets = ['Quotation', 'Sales Order', 'Delivery Note', 'Issue', 'Brand'];
  for (const dt of targets) {
    const meta = await get('/api/method/frappe.desk.form.load.getdoctype?doctype=' + encodeURIComponent(dt));
    if (meta.docs && meta.docs[0]) {
      const doc = meta.docs[0];
      const reqFields = (doc.fields || []).filter(f => f.reqd).map(f => `${f.fieldname} (${f.fieldtype})${f.options ? ' -> ' + f.options : ''}`);
      console.log(`\n=== DocType: ${dt} ===`);
      console.log('Mandatory fields:', reqFields);
      console.log('Total fields:', doc.fields.length);
      const childTables = (doc.fields || []).filter(f => f.fieldtype === 'Table').map(f => `${f.fieldname} (${f.options})`);
      console.log('Child tables:', childTables);
    } else {
      console.log(`DocType ${dt} not found:`, meta);
    }
  }
}

inspectDocTypes().catch(console.error);
