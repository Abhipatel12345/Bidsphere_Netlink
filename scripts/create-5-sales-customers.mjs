import fs from 'fs';

// Read .env
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

const customersToCreate = [
  {
    customer_name: "Apex Manufacturing Pvt. Ltd.",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "United States",
    website: "https://www.apexmanufacturing.com",
    contact: {
      first_name: "Rajesh",
      last_name: "Sharma",
      email_id: "rajesh.sharma@apexmanufacturing.com",
      mobile_no: "+1 415-555-0142",
      phone: "+1 415-555-0142",
      designation: "VP of Operations"
    },
    address: {
      address_title: "Apex Manufacturing HQ",
      address_type: "Billing",
      address_line1: "1200 Industrial Parkway, Suite 400",
      city: "Chicago",
      state: "Illinois",
      pincode: "60607",
      country: "United States"
    }
  },
  {
    customer_name: "Orion Retail Solutions",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "United States",
    website: "https://www.orionretail.com",
    contact: {
      first_name: "Claire",
      last_name: "Vance",
      email_id: "claire.vance@orionretail.com",
      mobile_no: "+1 212-555-0189",
      phone: "+1 212-555-0189",
      designation: "Procurement Director"
    },
    address: {
      address_title: "Orion Retail Corporate Center",
      address_type: "Billing",
      address_line1: "750 5th Avenue, Floor 18",
      city: "New York",
      state: "New York",
      pincode: "10019",
      country: "United States"
    }
  },
  {
    customer_name: "Nova Industrial Systems",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "United States",
    website: "https://www.novaindustrial.com",
    contact: {
      first_name: "Marcus",
      last_name: "Sterling",
      email_id: "marcus.sterling@novaindustrial.com",
      mobile_no: "+1 313-555-0164",
      phone: "+1 313-555-0164",
      designation: "Supply Chain Manager"
    },
    address: {
      address_title: "Nova Industrial Plant #2",
      address_type: "Billing",
      address_line1: "4500 Automation Drive",
      city: "Detroit",
      state: "Michigan",
      pincode: "48202",
      country: "United States"
    }
  },
  {
    customer_name: "Summit Distribution Ltd.",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "Rest Of The World",
    website: "https://www.summitdistribution.co",
    contact: {
      first_name: "Alistair",
      last_name: "Campbell",
      email_id: "alistair.campbell@summitdistribution.co",
      mobile_no: "+44 20 7946 0912",
      phone: "+44 20 7946 0912",
      designation: "Commercial Logistics Head"
    },
    address: {
      address_title: "Summit Distribution Hub",
      address_type: "Billing",
      address_line1: "22 Logistics Way, Park Royal",
      city: "London",
      state: "Greater London",
      pincode: "NW10 7HQ",
      country: "United Kingdom"
    }
  },
  {
    customer_name: "Vertex Energy Solutions",
    customer_type: "Company",
    customer_group: "Commercial",
    territory: "United States",
    website: "https://www.vertexenergy.io",
    contact: {
      first_name: "Elena",
      last_name: "Rostova",
      email_id: "elena.rostova@vertexenergy.io",
      mobile_no: "+1 713-555-0198",
      phone: "+1 713-555-0198",
      designation: "Director of Facilities & Energy"
    },
    address: {
      address_title: "Vertex Energy Tech Campus",
      address_type: "Billing",
      address_line1: "3300 Energy Corridor Boulevard",
      city: "Houston",
      state: "Texas",
      pincode: "77079",
      country: "United States"
    }
  }
];

async function main() {
  console.log("================================================================================");
  console.log("CREATING 5 REALISTIC DEMO SALES CUSTOMERS IN ERPNEXT");
  console.log("================================================================================");

  // 1. Fetch existing customers to check for duplicates
  const existingRes = await get('/api/resource/Customer?limit_page_length=500&fields=["name","customer_name"]');
  const existingCustomers = existingRes.data || [];
  const existingNames = new Set(existingCustomers.map(c => (c.customer_name || c.name).toLowerCase().trim()));
  const existingIds = new Set(existingCustomers.map(c => c.name.toLowerCase().trim()));

  console.log(`Found ${existingCustomers.length} existing customers in ERPNext.\n`);

  const createdSummary = [];

  for (const c of customersToCreate) {
    const isNameTaken = existingNames.has(c.customer_name.toLowerCase().trim()) || existingIds.has(c.customer_name.toLowerCase().trim());
    if (isNameTaken) {
      console.log(`[SKIP] Customer already exists: "${c.customer_name}"`);
      // Find existing
      const existing = existingCustomers.find(ec => (ec.customer_name || ec.name).toLowerCase().trim() === c.customer_name.toLowerCase().trim());
      createdSummary.push({
        id: existing?.name || c.customer_name,
        name: c.customer_name,
        status: "Already Existed"
      });
      continue;
    }

    console.log(`[CREATING] ${c.customer_name}...`);

    // Create Customer record
    const custPayload = {
      doctype: "Customer",
      customer_name: c.customer_name,
      customer_type: c.customer_type,
      customer_group: c.customer_group,
      territory: c.territory,
      website: c.website
    };

    const custRes = await post('/api/resource/Customer', custPayload);
    if (!custRes.data?.name) {
      console.error(`  [ERROR] Failed to create ${c.customer_name}:`, custRes);
      continue;
    }

    const customerId = custRes.data.name;
    console.log(`  ✓ Created Customer: ID="${customerId}", Type="${c.customer_type}", Group="${c.customer_group}", Territory="${c.territory}"`);

    // Create linked Contact if specified
    if (c.contact) {
      try {
        const contactPayload = {
          doctype: "Contact",
          first_name: c.contact.first_name,
          last_name: c.contact.last_name,
          email_id: c.contact.email_id,
          mobile_no: c.contact.mobile_no,
          phone: c.contact.phone,
          designation: c.contact.designation,
          company_name: c.customer_name,
          links: [
            {
              link_doctype: "Customer",
              link_name: customerId
            }
          ]
        };
        const contactRes = await post('/api/resource/Contact', contactPayload);
        if (contactRes.data?.name) {
          console.log(`  ✓ Linked Primary Contact: ${c.contact.first_name} ${c.contact.last_name} (${contactRes.data.name})`);
        }
      } catch (err) {
        console.warn(`  [WARN] Contact creation failed for ${c.customer_name}:`, err.message);
      }
    }

    // Create linked Address if specified
    if (c.address) {
      try {
        const addressPayload = {
          doctype: "Address",
          address_title: c.address.address_title,
          address_type: c.address.address_type,
          address_line1: c.address.address_line1,
          city: c.address.city,
          state: c.address.state,
          pincode: c.address.pincode,
          country: c.address.country,
          links: [
            {
              link_doctype: "Customer",
              link_name: customerId
            }
          ]
        };
        const addressRes = await post('/api/resource/Address', addressPayload);
        if (addressRes.data?.name) {
          console.log(`  ✓ Linked Primary Address: ${c.address.address_line1}, ${c.address.city} (${addressRes.data.name})`);
        }
      } catch (err) {
        console.warn(`  [WARN] Address creation failed for ${c.customer_name}:`, err.message);
      }
    }

    createdSummary.push({
      id: customerId,
      name: c.customer_name,
      type: c.customer_type,
      group: c.customer_group,
      territory: c.territory,
      status: "Created Successfully"
    });
  }

  console.log("\n================================================================================");
  console.log("CREATION SUMMARY");
  console.log("================================================================================");
  console.table(createdSummary);
}

main().catch(console.error);
