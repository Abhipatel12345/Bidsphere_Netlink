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
  return await res.json();
}

async function get(path) {
  const res = await fetch(url + path, { headers });
  return await res.json();
}

async function submitDoc(doctype, name) {
  const docRes = await get(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`);
  const doc = docRes.data;
  doc.docstatus = 1;
  const res = await post('/api/method/frappe.client.submit', { doc: JSON.stringify(doc) });
  return res.message;
}

async function seedOrdersAndDeliveries() {
  const custs = await get('/api/resource/Customer?limit_page_length=10');
  const items = await get('/api/resource/Item?limit_page_length=10');

  console.log('Seeding Sales Orders & Deliveries across customers...');

  // Scenario 1: Order with Partial Delivery
  const cust1 = custs.data[1].name;
  const so1Res = await post('/api/resource/Sales Order', {
    company: 'Netlink',
    customer: cust1,
    transaction_date: '2026-10-18',
    delivery_date: '2026-11-02',
    order_type: 'Sales',
    selling_price_list: 'Standard Selling',
    items: [
      { item_code: items.data[2].name, qty: 100, rate: 85, delivery_date: '2026-11-02' },
      { item_code: items.data[3].name, qty: 60, rate: 140, delivery_date: '2026-11-02' }
    ]
  });
  const so1Name = so1Res.data?.name;
  console.log('Created SO 1:', so1Name);
  if (so1Name) {
    await submitDoc('Sales Order', so1Name);
    // Partial Delivery: Map DN and reduce qty
    const mapped = await post('/api/method/erpnext.selling.doctype.sales_order.sales_order.make_delivery_note', { source_name: so1Name });
    if (mapped.message) {
      const dnDoc = mapped.message;
      dnDoc.items[0].qty = 50; // 50 of 100
      dnDoc.items[1].qty = 30; // 30 of 60
      const saveDn = await post('/api/resource/Delivery Note', dnDoc);
      if (saveDn.data?.name) {
        await submitDoc('Delivery Note', saveDn.data.name);
        console.log(`Created Partial DN ${saveDn.data.name} for ${so1Name}`);
      }
    }
  }

  // Scenario 2: Order Placed / Pending Delivery (Not Delivered yet)
  const cust2 = custs.data[2].name;
  const so2Res = await post('/api/resource/Sales Order', {
    company: 'Netlink',
    customer: cust2,
    transaction_date: '2026-10-27',
    delivery_date: '2026-11-10',
    order_type: 'Sales',
    selling_price_list: 'Standard Selling',
    items: [
      { item_code: items.data[0].name, qty: 20, rate: 120, delivery_date: '2026-11-10' },
      { item_code: items.data[4].name, qty: 15, rate: 310, delivery_date: '2026-11-10' }
    ]
  });
  const so2Name = so2Res.data?.name;
  console.log('Created SO 2 (Pending Delivery):', so2Name);
  if (so2Name) {
    await submitDoc('Sales Order', so2Name);
  }

  // Scenario 3: Order Completed (Fully Delivered)
  const cust3 = custs.data[3].name;
  const so3Res = await post('/api/resource/Sales Order', {
    company: 'Netlink',
    customer: cust3,
    transaction_date: '2026-10-15',
    delivery_date: '2026-10-28',
    order_type: 'Sales',
    selling_price_list: 'Standard Selling',
    items: [
      { item_code: items.data[1].name, qty: 40, rate: 250, delivery_date: '2026-10-28' }
    ]
  });
  const so3Name = so3Res.data?.name;
  console.log('Created SO 3 (Fully Delivered):', so3Name);
  if (so3Name) {
    await submitDoc('Sales Order', so3Name);
    const mapped = await post('/api/method/erpnext.selling.doctype.sales_order.sales_order.make_delivery_note', { source_name: so3Name });
    if (mapped.message) {
      const saveDn = await post('/api/resource/Delivery Note', mapped.message);
      if (saveDn.data?.name) {
        await submitDoc('Delivery Note', saveDn.data.name);
        console.log(`Created Full DN ${saveDn.data.name} for ${so3Name}`);
      }
    }
  }

  console.log('Sales Orders and Delivery Notes seeded successfully!');
}

seedOrdersAndDeliveries().catch(console.error);
