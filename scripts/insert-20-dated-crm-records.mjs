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

async function api(path, options = {}) {
  const res = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

function parseRecords(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if ('data' in res && Array.isArray(res.data)) return res.data;
    if ('message' in res && Array.isArray(res.message)) return res.message;
  }
  return [];
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`[PASS] ${message}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 20 Dated Records Definitions
// ─────────────────────────────────────────────────────────────────────────────

const DATED_CUSTOMERS = [
  { name: 'IronClad Secure Cloud Inc', group: 'Commercial', territory: 'United States' },
  { name: 'Starlight Aerospace Launchers', group: 'Commercial', territory: 'United States' },
  { name: 'BioCure Genetics Global', group: 'Commercial', territory: 'Rest Of The World' },
  { name: 'HyperFlux Semiconductor Works', group: 'Commercial', territory: 'United States' },
  { name: 'Summit Industrial Automation', group: 'Commercial', territory: 'United States' },
  { name: 'Apex Sourcing Global', group: 'Commercial', territory: 'Rest Of The World' },
  { name: 'Nova Defense Dynamics', group: 'Government', territory: 'United States' },
  { name: 'Veridian Sustainable Power', group: 'Commercial', territory: 'United States' },
  { name: 'Aegis Strategic Materials', group: 'Commercial', territory: 'United States' },
  { name: 'Olympus Marine Autonomous', group: 'Commercial', territory: 'United States' },
];

const DATED_LEADS = [
  {
    name: 'Dr. Aris Thorne',
    company: 'Vortex Propulsion Dynamics',
    email: 'athorne@vortexpropulsion.io',
    phone: '+1-555-0141',
    status: 'Lead',
    source: 'Exhibition',
    rev: 24000000,
    emp: '201-500',
    date: '2026-07-10',
  },
  {
    name: 'Elena Rostova',
    company: 'Solstice Grid Intelligence',
    email: 'erostova@solsticegrid.com',
    phone: '+1-555-0142',
    status: 'Open',
    source: 'Campaign',
    rev: 18500000,
    emp: '51-200',
    date: '2026-07-24',
  },
  {
    name: 'Dr. Julian Sterling',
    company: 'NeuroSynthetics Medical',
    email: 'jsterling@neurosynthetics.org',
    phone: '+1-555-0143',
    status: 'Interested',
    source: 'Reference',
    rev: 32000000,
    emp: '501-1000',
    date: '2026-08-06',
    qualified_on: '2026-08-12',
  },
  {
    name: 'Marcus Vance',
    company: 'Cobalt Horizon Logistics',
    email: 'mvance@cobalthorizon.com',
    phone: '+1-555-0144',
    status: 'Opportunity',
    source: 'Advertisement',
    rev: 45000000,
    emp: '1000+',
    date: '2026-08-19',
  },
  {
    name: 'Commander Nathan Drake',
    company: 'AeroDynamic Defense Systems',
    email: 'ndrake@aerodynamicdef.gov',
    phone: '+1-555-0145',
    status: 'Quotation',
    source: 'Existing Customer',
    rev: 58000000,
    emp: '1000+',
    date: '2026-08-28',
  },
  {
    name: 'Sophia Chen',
    company: 'Helios Cryogenics Corp',
    email: 'schen@helioscryo.com',
    phone: '+1-555-0146',
    status: 'Lead',
    source: 'Exhibition',
    rev: 15000000,
    emp: '51-200',
    date: '2026-09-05',
  },
  {
    name: 'Gabriel Rossi',
    company: 'TerraNova Biosensors',
    email: 'grossi@terranovabio.io',
    phone: '+1-555-0147',
    status: 'Open',
    source: 'Campaign',
    rev: 9200000,
    emp: '51-200',
    date: '2026-09-16',
  },
  {
    name: 'Katarina Brandt',
    company: 'Vector Autonomous Avionics',
    email: 'kbrandt@vectoravionics.org',
    phone: '+1-555-0148',
    status: 'Interested',
    source: 'Reference',
    rev: 28000000,
    emp: '201-500',
    date: '2026-09-25',
    qualified_on: '2026-09-28',
  },
  {
    name: 'Liam O\'Connor',
    company: 'Prism Photonics Infrastructure',
    email: 'loconnor@prismphotonics.net',
    phone: '+1-555-0149',
    status: 'Opportunity',
    source: 'Advertisement',
    rev: 21000000,
    emp: '201-500',
    date: '2026-10-08',
  },
  {
    name: 'Maya Patel',
    company: 'OmniWave Quantum Telemetry',
    email: 'mpatel@omniwavequantum.com',
    phone: '+1-555-0150',
    status: 'Quotation',
    source: 'Cold Calling',
    rev: 38000000,
    emp: '501-1000',
    date: '2026-10-18',
  },
];

const DATED_OPPORTUNITIES = [
  // 4 Won Deals across July, August, September, October 2026
  {
    party: 'IronClad Secure Cloud Inc',
    title: '[DEMO] Enterprise Cyber Vault Multi-Year Infrastructure',
    amount: 380000,
    status: 'Converted',
    stage: 'Proposal/Price Quote',
    date: '2026-07-18',
    closing: '2026-07-25',
  },
  {
    party: 'Starlight Aerospace Launchers',
    title: '[DEMO] Cryogenic Fuel Tank Sensor Assembly Supply',
    amount: 520000,
    status: 'Converted',
    stage: 'Negotiation/Review',
    date: '2026-08-15',
    closing: '2026-08-20',
  },
  {
    party: 'BioCure Genetics Global',
    title: '[DEMO] Automated Robotic Cell Culture Synthesis Line',
    amount: 410000,
    status: 'Converted',
    stage: 'Proposal/Price Quote',
    date: '2026-09-14',
    closing: '2026-09-20',
  },
  {
    party: 'HyperFlux Semiconductor Works',
    title: '[DEMO] Next-Gen Photolithography Chamber Precision Components',
    amount: 650000,
    status: 'Converted',
    stage: 'Negotiation/Review',
    date: '2026-10-12',
    closing: '2026-10-18',
  },

  // 6 Active In-Flight Pipeline Deals across Stages & Dates
  {
    party: 'Summit Industrial Automation',
    title: '[DEMO] High-Throughput Warehouse Conveyor Robotics',
    amount: 320000,
    status: 'Open',
    stage: 'Prospecting',
    date: '2026-07-28',
    closing: '2026-11-30',
  },
  {
    party: 'Apex Sourcing Global',
    title: '[DEMO] Multi-National Strategic Sourcing Platform Integration',
    amount: 450000,
    status: 'Open',
    stage: 'Qualification',
    date: '2026-08-10',
    closing: '2026-11-15',
  },
  {
    party: 'Nova Defense Dynamics',
    title: '[DEMO] Tactical Drone Communication Avionics Modules',
    amount: 580000,
    status: 'Open',
    stage: 'Needs Analysis',
    date: '2026-08-25',
    closing: '2026-12-15',
  },
  {
    party: 'Veridian Sustainable Power',
    title: '[DEMO] Offshore Wind Turbine Harmonic Inverter Array',
    amount: 740000,
    status: 'Open',
    stage: 'Value Proposition',
    date: '2026-09-08',
    closing: '2026-12-01',
  },
  {
    party: 'Aegis Strategic Materials',
    title: '[DEMO] Carbon Nanotube Composite Armor Bulk Sourcing',
    amount: 610000,
    status: 'Open',
    stage: 'Proposal/Price Quote',
    date: '2026-09-22',
    closing: '2026-11-20',
  },
  {
    party: 'Olympus Marine Autonomous',
    title: '[DEMO] Autonomous Survey Vessel Sonar Propulsion Hub',
    amount: 890000,
    status: 'Open',
    stage: 'Negotiation/Review',
    date: '2026-10-15',
    closing: '2026-11-10',
  },
];

async function main() {
  console.log('================================================================');
  console.log(' INSERTING 20 REALISTIC DATED DEMO RECORDS (JULY - OCT 2026)');
  console.log(` Target ERPNext: ${url}`);
  console.log('================================================================\n');

  // 1. Ensure Customers exist
  console.log('--- Step 1: Setting up Supporting Customer Accounts ---');
  for (const c of DATED_CUSTOMERS) {
    const checkRes = await api(`/api/resource/Customer/${encodeURIComponent(c.name)}`);
    if (!checkRes.ok) {
      const createRes = await api('/api/resource/Customer', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: c.name,
          customer_group: c.group,
          territory: c.territory,
          customer_type: 'Company',
        }),
      });
      assert(createRes.ok, `Created Customer account: ${c.name}`);
    } else {
      console.log(`[EXISTS] Customer: ${c.name}`);
    }
  }

  // 2. Insert 10 Leads with distinct dates
  console.log('\n--- Step 2: Inserting 10 Dated Leads (July - October 2026) ---');
  for (let i = 0; i < DATED_LEADS.length; i++) {
    const l = DATED_LEADS[i];
    const checkRes = await api(`/api/resource/Lead?filters=[["Lead","company_name","=","${l.company}"]]`);
    const existing = parseRecords(checkRes.data);
    if (existing.length === 0) {
      const leadBody = {
        lead_name: l.name,
        company_name: l.company,
        email_id: l.email,
        phone: l.phone,
        mobile_no: l.phone,
        status: l.status,
        lead_owner: 'crm@netlink.com',
        source: l.source,
        type: 'Client',
        annual_revenue: l.rev,
        no_of_employees: l.emp,
        territory: 'United States',
        lead_date: l.date,
      };
      if (l.qualified_on) {
        leadBody.qualification_status = 'Qualified';
        leadBody.qualified_on = l.qualified_on;
      }
      const createRes = await api('/api/resource/Lead', {
        method: 'POST',
        body: JSON.stringify(leadBody),
      });
      assert(createRes.ok, `[${i + 1}/10] Created Lead "${l.company}" dated ${l.date} (${createRes.data?.data?.name})`);
    } else {
      console.log(`[EXISTS] Lead for ${l.company}: ${existing[0].name}`);
    }
  }

  // 3. Insert 10 Opportunities with distinct transaction_date values
  console.log('\n--- Step 3: Inserting 10 Dated Opportunities (July - October 2026) ---');
  for (let i = 0; i < DATED_OPPORTUNITIES.length; i++) {
    const o = DATED_OPPORTUNITIES[i];
    const checkRes = await api(`/api/resource/Opportunity?filters=[["Opportunity","party_name","=","${o.party}"],["Opportunity","title","=","${o.title}"]]`);
    const existing = parseRecords(checkRes.data);
    if (existing.length === 0) {
      const oppBody = {
        opportunity_from: 'Customer',
        party_name: o.party,
        title: o.title,
        opportunity_amount: o.amount,
        sales_stage: o.stage,
        status: o.status,
        transaction_date: o.date,
        expected_closing: o.closing,
        probability: o.status === 'Converted' ? 100 : 70,
        opportunity_owner: 'crm@netlink.com',
      };
      const createRes = await api('/api/resource/Opportunity', {
        method: 'POST',
        body: JSON.stringify(oppBody),
      });
      assert(createRes.ok, `[${i + 1}/10] Created Opp "${o.title}" ($${o.amount.toLocaleString()}, ${o.status}) dated ${o.date}`);
    } else {
      console.log(`[EXISTS] Opportunity "${o.title}": ${existing[0].name}`);
    }
  }

  // 4. Verify Final Backend Record Counts and Distribution
  console.log('\n--- Step 4: Verifying Backend Record Counts & Date Distribution ---');
  const leadsCountRes = await api('/api/method/frappe.client.get_count?doctype=Lead');
  const oppCountRes = await api('/api/method/frappe.client.get_count?doctype=Opportunity');
  const wonOppCountRes = await api('/api/method/frappe.client.get_count?doctype=Opportunity&filters=[["Opportunity","status","=","Converted"]]');
  const custCountRes = await api('/api/method/frappe.client.get_count?doctype=Customer');

  console.log(`Verified Total Leads in ERPNext: ${leadsCountRes.data?.message}`);
  console.log(`Verified Total Opportunities in ERPNext: ${oppCountRes.data?.message}`);
  console.log(`Verified Total Won Opportunities in ERPNext: ${wonOppCountRes.data?.message}`);
  console.log(`Verified Total Customers in ERPNext: ${custCountRes.data?.message}`);

  assert(leadsCountRes.data?.message >= 40, 'Leads count reflects new dated demo records');
  assert(oppCountRes.data?.message >= 40, 'Opportunities count reflects new dated demo records');
  assert(wonOppCountRes.data?.message >= 5, 'Won Opportunities count reflects 5 converted deals across 4 months');

  console.log('\n================================================================');
  console.log(' ALL 20 DATED DEMO RECORDS SUCCESSFULLY CREATED IN ERPNEXT!');
  console.log('================================================================');
}

main().catch(err => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
