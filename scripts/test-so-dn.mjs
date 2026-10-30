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

async function run() {
  const priceLists = await get('/api/resource/Price List?fields=["name","currency","selling","buying"]');
  console.log('Price Lists:', priceLists.data);

  const custs = await get('/api/resource/Customer?limit_page_length=5');
  const items = await get('/api/resource/Item?limit_page_length=5');

  const customer = custs.data[0].name;
  const item1 = items.data[0].name;
  const item2 = items.data[1].name;

  console.log(`Using Customer: ${customer}, Item1: ${item1}, Item2: ${item2}`);

  // Create Sales Order in Draft
  const soPayload = {
    company: 'Netlink',
    customer: customer,
    transaction_date: '2026-10-20',
    delivery_date: '2026-11-05',
    order_type: 'Sales',
    selling_price_list: 'Standard Selling',
    items: [
      {
        item_code: item1,
        qty: 50,
        rate: 120,
        delivery_date: '2026-11-05'
      },
      {
        item_code: item2,
        qty: 30,
        rate: 250,
        delivery_date: '2026-11-05'
      }
    ]
  };

  const soRes = await post('/api/resource/Sales Order', soPayload);
  console.log('Sales Order create response status:', soRes.status);
  if (soRes.status === 200) {
    console.log('Created SO:', soRes.data?.data?.name);
    const soName = soRes.data?.data?.name;
    // Let's see if we can submit it: docstatus = 1
    const submitRes = await post(`/api/resource/Sales Order/${soName}`, { docstatus: 1 });
    console.log('Submit SO status:', submitRes.status, submitRes.data?.data?.docstatus);

    // Now test making delivery note
    const dnPayload = {
      company: 'Netlink',
      customer: customer,
      posting_date: '2026-10-22',
      posting_time: '14:30:00',
      selling_price_list: 'Standard Selling',
      items: [
        {
          item_code: item1,
          qty: 25, // Partial delivery: 25 of 50
          rate: 120,
          against_sales_order: soName
        }
      ]
    };
    const dnRes = await post('/api/resource/Delivery Note', dnPayload);
    console.log('Delivery Note create status:', dnRes.status, dnRes.data?.data?.name);
  } else {
    console.log('Error creating SO:', soRes.data?.message || soRes.data?._server_messages || soRes.text);
  }
}

run().catch(console.error);
