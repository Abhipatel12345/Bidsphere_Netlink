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

async function seed() {
  const custs = await get('/api/resource/Customer?limit_page_length=15');
  const items = await get('/api/resource/Item?limit_page_length=15');

  console.log(`Found ${custs.data.length} customers and ${items.data.length} items`);

  // Create 8 realistic Massy Complaints (Issues)
  const complaints = [
    {
      subject: 'Batch #B-902 Bumper Coating Discoloration',
      customer: custs.data[0].name,
      customer_name: custs.data[0].name,
      raised_by: 'qa@client.com',
      status: 'Open',
      priority: 'High',
      issue_type: 'Product Quality Defect',
      description: 'Customer reports 15 units of front bumper coating show uneven matte finish and micro-scratches upon delivery unloading.',
      opening_date: '2026-10-25'
    },
    {
      subject: 'Air Filter Shipment Delayed - Port Clearance Pending',
      customer: custs.data[1]?.name || custs.data[0].name,
      customer_name: custs.data[1]?.name || custs.data[0].name,
      raised_by: 'logistics@client.com',
      status: 'On Hold',
      priority: 'Urgent',
      issue_type: 'Delivery Delay',
      description: 'Container shipment for order delayed due to customs inspection backlog at Port of Spain terminal.',
      opening_date: '2026-10-24'
    },
    {
      subject: 'Damaged Pallet during Transit - Brake Disc Units',
      customer: custs.data[2]?.name || custs.data[0].name,
      customer_name: custs.data[2]?.name || custs.data[0].name,
      raised_by: 'warehouse@client.com',
      status: 'Resolved',
      priority: 'Medium',
      issue_type: 'Damaged Goods in Transit',
      description: 'Pallet shrinkwrap torn during transport. 4 brake disc boxes crushed. Replacement dispatched and credit note issued.',
      resolution_details: 'Replacement units dispatched under DN-2026-004. Customer acknowledged undamaged receipt on Oct 27.',
      opening_date: '2026-10-20'
    },
    {
      subject: 'Invoice Discrepancy on Freight Surcharge',
      customer: custs.data[3]?.name || custs.data[0].name,
      customer_name: custs.data[3]?.name || custs.data[0].name,
      raised_by: 'accounts@client.com',
      status: 'Replied',
      priority: 'Low',
      issue_type: 'Billing & Invoicing Discrepancy',
      description: 'Billing reflects 12% freight surcharge instead of contracted 8% negotiated under Master Agreement.',
      opening_date: '2026-10-26'
    },
    {
      subject: 'Wrong Filter Model Delivered (AC001 instead of AC002)',
      customer: custs.data[0].name,
      customer_name: custs.data[0].name,
      raised_by: 'service@client.com',
      status: 'Open',
      priority: 'High',
      issue_type: 'Wrong Item Shipped',
      description: 'Customer workshop received AC001 standard air filters instead of heavy-duty AC002 specification.',
      opening_date: '2026-10-28'
    },
    {
      subject: 'Packaging Seal Broken on Industrial Lubricant Drums',
      customer: custs.data[1]?.name || custs.data[0].name,
      customer_name: custs.data[1]?.name || custs.data[0].name,
      raised_by: 'ops@client.com',
      status: 'Closed',
      priority: 'Medium',
      issue_type: 'Packaging & Labeling Issue',
      description: 'Tamper-evident seals missing on 2 lubricant drums.',
      resolution_details: 'Supplier verified quality batch COA and recertified safety seals on site.',
      opening_date: '2026-10-15'
    }
  ];

  console.log('\n=== Creating Issue (Complaint) Records ===');
  for (const c of complaints) {
    const res = await post('/api/resource/Issue', c);
    if (res.status === 200) {
      console.log(`Complaint "${c.subject}": Created (${res.data?.data?.name})`);
    } else {
      console.log(`Complaint "${c.subject}": Status ${res.status}`, res.data?.message || res.data?._server_messages || res.text);
    }
  }

  // Check Issue count now
  const count = await get('/api/method/frappe.client.get_count?doctype=Issue');
  console.log('\nTotal Issues count now:', count.message);
}

seed().catch(console.error);
