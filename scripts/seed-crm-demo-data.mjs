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

const url = (env.VITE_ERPNEXT_URL || env.ERPNEXT_URL || '').replace(/\/$/, '');
const key = env.ERP_API_KEY || env.VITE_API_KEY;
const secret = env.ERP_API_SECRET || env.VITE_API_SECRET;
const headers = {
  'Authorization': 'token ' + key + ':' + secret,
  'Content-Type': 'application/json',
};

async function api(path, options = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function createIfMissing(doctype, nameField, payload) {
  const nameVal = payload[nameField];
  // Check if already exists
  const check = await api(`/api/resource/${encodeURIComponent(doctype)}?filters=${encodeURIComponent(JSON.stringify([[doctype, nameField, '=', nameVal]]))}`);
  if (check.ok && check.data?.data?.length > 0) {
    console.log(`[EXISTS] ${doctype}: "${nameVal}" -> ${check.data.data[0].name}`);
    return check.data.data[0].name;
  }

  const res = await api(`/api/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.ok && res.data?.data?.name) {
    console.log(`[CREATED] ${doctype}: "${nameVal}" -> ${res.data.data.name}`);
    return res.data.data.name;
  } else {
    console.warn(`[WARN] Failed to create ${doctype} "${nameVal}":`, res.data?._server_messages || res.data || res.status);
    return null;
  }
}

async function main() {
  console.log('========================================================');
  console.log(' SEEDING DEMO DATA INTO ERPNEXT CRM MODULE');
  console.log(` Target: ${url}`);
  console.log('========================================================\n');

  let seededCount = 0;

  // 1. Seed Campaigns
  console.log('--- 1. Seeding Marketing Campaigns ---');
  const campaigns = [
    {
      campaign_name: 'Q4 Enterprise Cloud Summit 2026',
      description: 'Global virtual enterprise tech summit connecting CIOs and IT procurement leaders.',
    },
    {
      campaign_name: 'Global Sourcing & Procurement Expo 2026',
      description: 'Annual flagship procurement, supply chain and CRM partner event.',
    },
  ];

  for (const c of campaigns) {
    const id = await createIfMissing('Campaign', 'campaign_name', c);
    if (id) seededCount++;
  }

  // 2. Seed Customers
  console.log('\n--- 2. Seeding Customers ---');
  const customers = [
    {
      customer_name: 'Titan Enterprise Solutions',
      customer_type: 'Company',
      customer_group: 'Commercial',
      territory: 'United States',
    },
    {
      customer_name: 'Veritas Federal Services',
      customer_type: 'Company',
      customer_group: 'Government',
      territory: 'United States',
    },
    {
      customer_name: 'Acuity Global Healthcare',
      customer_type: 'Company',
      customer_group: 'Commercial',
      territory: 'Rest Of The World',
    },
    {
      customer_name: 'GreenEarth Conservation Initiative',
      customer_type: 'Company',
      customer_group: 'Non Profit',
      territory: 'All Territories',
    },
  ];

  const createdCustomers = {};
  for (const cust of customers) {
    const id = await createIfMissing('Customer', 'customer_name', cust);
    if (id) {
      createdCustomers[cust.customer_name] = id;
      seededCount++;
    }
  }

  // 3. Seed Leads
  console.log('\n--- 3. Seeding Leads ---');
  const leads = [
    {
      lead_name: 'Sophia Martinez',
      company_name: 'Apex Logistics Corp',
      email_id: 'smartinez@apexlogistics.com',
      mobile_no: '+1-555-0101',
      city: 'Chicago',
      state: 'Illinois',
      country: 'United States',
      status: 'Lead',
      utm_source: 'Exhibition',
      annual_revenue: 450000,
      lead_owner: 'crm@netlink.com',
    },
    {
      lead_name: 'Liam Gallagher',
      company_name: 'Nexus Dynamics Inc',
      email_id: 'lgallagher@nexusdyn.com',
      mobile_no: '+1-555-0102',
      city: 'Austin',
      state: 'Texas',
      country: 'United States',
      status: 'Open',
      utm_source: 'Advertisement',
      annual_revenue: 1200000,
      lead_owner: 'crm@netlink.com',
    },
    {
      lead_name: 'Dr. Elena Vance',
      company_name: 'BioGenix Laboratories',
      email_id: 'elena.vance@biogenixlab.com',
      mobile_no: '+1-555-0103',
      city: 'Boston',
      state: 'Massachusetts',
      country: 'United States',
      status: 'Interested',
      utm_source: 'Reference',
      annual_revenue: 2800000,
      lead_owner: 'crm@netlink.com',
    },
    {
      lead_name: 'Marcus Sterling',
      company_name: 'Quantum Fleet Solutions',
      email_id: 'msterling@quantumfleet.io',
      mobile_no: '+1-555-0104',
      city: 'Seattle',
      state: 'Washington',
      country: 'United States',
      status: 'Interested',
      utm_source: 'Campaign',
      annual_revenue: 850000,
      lead_owner: 'crm@netlink.com',
    },
    {
      lead_name: 'Chloe Bennett',
      company_name: 'Solaris Energy Systems',
      email_id: 'cbennett@solarisenergy.com',
      mobile_no: '+1-555-0105',
      city: 'Denver',
      state: 'Colorado',
      country: 'United States',
      status: 'Replied',
      utm_source: 'Cold Calling',
      annual_revenue: 3400000,
      lead_owner: 'crm@netlink.com',
    },
    {
      lead_name: 'David Zhao',
      company_name: 'Vanguard Aerospace Technologies',
      email_id: 'dzhao@vanguardaero.com',
      mobile_no: '+1-555-0106',
      city: 'Los Angeles',
      state: 'California',
      country: 'United States',
      status: 'Opportunity',
      utm_source: 'Supplier Reference',
      annual_revenue: 9500000,
      lead_owner: 'crm@netlink.com',
    },
    {
      lead_name: 'Rachel Green',
      company_name: 'Horizon Retail Holdings',
      email_id: 'rgreen@horizonretail.com',
      mobile_no: '+1-555-0107',
      city: 'New York',
      state: 'New York',
      country: 'United States',
      status: 'Quotation',
      utm_source: 'Walk In',
      annual_revenue: 1750000,
      lead_owner: 'crm@netlink.com',
    },
    {
      lead_name: 'Ethan Hunt',
      company_name: 'AeroPulse Avionics',
      email_id: 'ehunt@aeropulse.org',
      mobile_no: '+1-555-0108',
      city: 'San Francisco',
      state: 'California',
      country: 'United States',
      status: 'Converted',
      utm_source: 'Exhibition',
      annual_revenue: 5200000,
      lead_owner: 'crm@netlink.com',
    },
  ];

  const createdLeads = {};
  for (const l of leads) {
    const id = await createIfMissing('Lead', 'email_id', l);
    if (id) {
      createdLeads[l.company_name] = id;
      seededCount++;
    }
  }

  // 4. Seed Opportunities
  console.log('\n--- 4. Seeding Opportunities ---');
  const opportunities = [
    {
      title: 'Titan Cloud Infrastructure Modernization',
      opportunity_from: 'Customer',
      party_name: createdCustomers['Titan Enterprise Solutions'] || 'Titan Enterprise Solutions',
      opportunity_type: 'Sales',
      sales_stage: 'Negotiation/Review',
      status: 'Open',
      opportunity_amount: 185000,
      probability: 85,
      expected_closing: '2026-11-30',
      opportunity_owner: 'crm@netlink.com',
      utm_source: 'Reference',
    },
    {
      title: 'Veritas Fleet Procurement FY27',
      opportunity_from: 'Customer',
      party_name: createdCustomers['Veritas Federal Services'] || 'Veritas Federal Services',
      opportunity_type: 'Sales',
      sales_stage: 'Proposal/Price Quote',
      status: 'Open',
      opportunity_amount: 320000,
      probability: 75,
      expected_closing: '2026-12-15',
      opportunity_owner: 'crm@netlink.com',
      utm_source: 'Campaign',
    },
    {
      title: 'BioGenix Automated Supply Chain Integration',
      opportunity_from: 'Lead',
      party_name: createdLeads['BioGenix Laboratories'] || 'CRM-LEAD-2026-00001',
      opportunity_type: 'Sales',
      sales_stage: 'Needs Analysis',
      status: 'Open',
      opportunity_amount: 95000,
      probability: 60,
      expected_closing: '2026-11-20',
      opportunity_owner: 'crm@netlink.com',
      utm_source: 'Reference',
    },
    {
      title: 'Quantum Fleet Telematics Rollout',
      opportunity_from: 'Lead',
      party_name: createdLeads['Quantum Fleet Solutions'] || 'CRM-LEAD-2026-00001',
      opportunity_type: 'Sales',
      sales_stage: 'Value Proposition',
      status: 'Open',
      opportunity_amount: 140000,
      probability: 50,
      expected_closing: '2026-12-30',
      opportunity_owner: 'crm@netlink.com',
      utm_source: 'Campaign',
    },
    {
      title: 'Solaris Microgrid Optimization Contract',
      opportunity_from: 'Lead',
      party_name: createdLeads['Solaris Energy Systems'] || 'CRM-LEAD-2026-00001',
      opportunity_type: 'Sales',
      sales_stage: 'Qualification',
      status: 'Open',
      opportunity_amount: 65000,
      probability: 40,
      expected_closing: '2027-01-15',
      opportunity_owner: 'crm@netlink.com',
      utm_source: 'Cold Calling',
    },
    {
      title: 'Acuity Global Diagnostics Partnership',
      opportunity_from: 'Customer',
      party_name: createdCustomers['Acuity Global Healthcare'] || 'Acuity Global Healthcare',
      opportunity_type: 'Sales',
      sales_stage: 'Negotiation/Review',
      status: 'Converted',
      opportunity_amount: 240000,
      probability: 100,
      expected_closing: '2026-10-31',
      opportunity_owner: 'crm@netlink.com',
      utm_source: 'Exhibition',
    },
  ];

  for (const opp of opportunities) {
    const id = await createIfMissing('Opportunity', 'title', opp);
    if (id) seededCount++;
  }

  // 5. Seed Contacts
  console.log('\n--- 5. Seeding Contacts ---');
  const contacts = [
    {
      first_name: 'Sarah',
      last_name: 'Jenkins',
      email_id: 'sjenkins@titanent.com',
      phone: '+1-555-0201',
      mobile_no: '+1-555-0201',
      designation: 'VP of Technology',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['Titan Enterprise Solutions'] || 'Titan Enterprise Solutions',
        },
      ],
    },
    {
      first_name: 'Robert',
      last_name: 'Hayes',
      email_id: 'rhayes@veritasfed.gov',
      phone: '+1-555-0202',
      mobile_no: '+1-555-0202',
      designation: 'Director of Operations',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['Veritas Federal Services'] || 'Veritas Federal Services',
        },
      ],
    },
    {
      first_name: 'Monica',
      last_name: 'Patel',
      email_id: 'mpatel@acuitygh.com',
      phone: '+1-555-0203',
      mobile_no: '+1-555-0203',
      designation: 'Chief Medical Officer',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['Acuity Global Healthcare'] || 'Acuity Global Healthcare',
        },
      ],
    },
    {
      first_name: 'Lucas',
      last_name: 'Tremblay',
      email_id: 'lucas.t@greenearth.org',
      phone: '+1-555-0204',
      mobile_no: '+1-555-0204',
      designation: 'Managing Director',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['GreenEarth Conservation Initiative'] || 'GreenEarth Conservation Initiative',
        },
      ],
    },
  ];

  for (const con of contacts) {
    const id = await createIfMissing('Contact', 'email_id', con);
    if (id) seededCount++;
  }

  // 6. Seed Addresses
  console.log('\n--- 6. Seeding Addresses ---');
  const addresses = [
    {
      address_title: 'Titan HQ - Manhattan',
      address_type: 'Billing',
      address_line1: '750 3rd Avenue, Suite 2200',
      city: 'New York',
      state: 'New York',
      country: 'United States',
      pincode: '10017',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['Titan Enterprise Solutions'] || 'Titan Enterprise Solutions',
        },
      ],
    },
    {
      address_title: 'Veritas DC Operations Center',
      address_type: 'Billing',
      address_line1: '1200 Pennsylvania Ave NW',
      city: 'Washington',
      state: 'District of Columbia',
      country: 'United States',
      pincode: '20004',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['Veritas Federal Services'] || 'Veritas Federal Services',
        },
      ],
    },
    {
      address_title: 'Acuity London Office',
      address_type: 'Office',
      address_line1: '10 Finsbury Square',
      city: 'London',
      state: 'Greater London',
      country: 'United Kingdom',
      pincode: 'EC2A 1AF',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['Acuity Global Healthcare'] || 'Acuity Global Healthcare',
        },
      ],
    },
    {
      address_title: 'GreenEarth Portland Hub',
      address_type: 'Shipping',
      address_line1: '412 NW Couch St',
      city: 'Portland',
      state: 'Oregon',
      country: 'United States',
      pincode: '97209',
      links: [
        {
          link_doctype: 'Customer',
          link_name: createdCustomers['GreenEarth Conservation Initiative'] || 'GreenEarth Conservation Initiative',
        },
      ],
    },
  ];

  for (const addr of addresses) {
    const id = await createIfMissing('Address', 'address_title', addr);
    if (id) seededCount++;
  }

  console.log('\n========================================================');
  console.log(` SEEDING COMPLETE! Successfully processed ${seededCount} demo items.`);
  console.log('========================================================');
}

main().catch(err => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
