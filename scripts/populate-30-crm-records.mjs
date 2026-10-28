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

async function getCount(doctype) {
  const res = await api(`/api/method/frappe.client.get_count?doctype=${doctype}`);
  return res.data?.message || 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Data Definitions for 30+ in each DocType
// ─────────────────────────────────────────────────────────────────────────────

const NEW_CUSTOMERS = [
  { name: 'Aetherial Cloud Systems Inc', group: 'Commercial', territory: 'United States' },
  { name: 'Aurora Defense & Maritime Corp', group: 'Government', territory: 'United States' },
  { name: 'Borealis Clean Energy Holdings', group: 'Commercial', territory: 'United States' },
  { name: 'Catalyst BioPharma Laboratories', group: 'Commercial', territory: 'United States' },
  { name: 'Cerulean Space Exploration Ltd', group: 'Commercial', territory: 'Rest Of The World' },
  { name: 'Cognitive Cyber Solutions', group: 'Commercial', territory: 'United States' },
  { name: 'Delta Precision Robotics Inc', group: 'Commercial', territory: 'United States' },
  { name: 'Echelon Federal Logistical Group', group: 'Government', territory: 'United States' },
  { name: 'Equinox Renewable Power Inc', group: 'Commercial', territory: 'United States' },
  { name: 'Fortress Global Cyber Defense', group: 'Commercial', territory: 'United States' },
  { name: 'Galactic Aerospace Technologies', group: 'Commercial', territory: 'United States' },
  { name: 'Genomic Dynamics Diagnostics', group: 'Commercial', territory: 'United States' },
  { name: 'Hyperion Industrial Automation', group: 'Commercial', territory: 'Rest Of The World' },
  { name: 'Insignia Rail & Transit Systems', group: 'Government', territory: 'United States' },
  { name: 'Krypton Quantum Microcircuits', group: 'Commercial', territory: 'United States' },
  { name: 'Luminary Medical Devices Co', group: 'Commercial', territory: 'United States' },
  { name: 'Magellan Global Maritime Lines', group: 'Commercial', territory: 'Rest Of The World' },
  { name: 'Novus Heavy Engineering Works', group: 'Commercial', territory: 'United States' },
  { name: 'OmniSecure National Systems', group: 'Government', territory: 'United States' },
  { name: 'Pinnacle Agritech Innovations', group: 'Non Profit', territory: 'All Territories' },
  { name: 'Quasar Satellite Communications', group: 'Commercial', territory: 'United States' },
  { name: 'Radiant Solar Grid Solutions', group: 'Commercial', territory: 'United States' },
  { name: 'Sentinel Autonomous Vehicles', group: 'Commercial', territory: 'United States' },
  { name: 'TerraFirma Environmental Labs', group: 'Non Profit', territory: 'All Territories' },
  { name: 'Ultrasonic Imaging Systems', group: 'Commercial', territory: 'United States' },
  { name: 'Zephyr High-Speed Aerospace', group: 'Commercial', territory: 'United States' },
];

const NEW_LEADS = [
  { name: 'Alexander Vance', company: 'Apex BioComputing', email: 'avance@apexbiocomputing.com', status: 'Lead', rev: 4500000, emp: '51-200', source: 'Advertisement' },
  { name: 'Beatrice Morales', company: 'Borealis Battery Tech', email: 'bmorales@borealisbatt.com', status: 'Open', rev: 12000000, emp: '201-500', source: 'Exhibition' },
  { name: 'Cassian Reed', company: 'Cobalt SCM Logistics', email: 'creed@cobaltscm.com', status: 'Interested', rev: 6800000, emp: '51-200', source: 'Reference' },
  { name: 'Daphne Sterling', company: 'Dynamic Avionics Corp', email: 'dsterling@dynamicavionics.com', status: 'Opportunity', rev: 9200000, emp: '201-500', source: 'Campaign' },
  { name: 'Edward Chen', company: 'Echo Quantum Systems', email: 'echen@echoquantum.io', status: 'Quotation', rev: 18000000, emp: '501-1000', source: 'Cold Calling' },
  { name: 'Fiona Gallagher', company: 'Fortress Defense Dynamics', email: 'fgallagher@fortressdefense.gov', status: 'Lead', rev: 25000000, emp: '1000+', source: 'Existing Customer' },
  { name: 'Gabriel Santos', company: 'Genesis Molecular Therapeutics', email: 'gsantos@genesismol.com', status: 'Open', rev: 7500000, emp: '51-200', source: 'Exhibition' },
  { name: 'Helena Rostov', company: 'Hyperion Turbine Engineering', email: 'hrostov@hyperionturbines.com', status: 'Interested', rev: 14000000, emp: '201-500', source: 'Reference' },
  { name: 'Ian Wright', company: 'Infinitum Superconductors', email: 'iwright@infinitumsc.org', status: 'Lead', rev: 5200000, emp: '11-50', source: 'Advertisement' },
  { name: 'Julian Mercer', company: 'Jupiter Satellite Networks', email: 'jmercer@jupitersat.net', status: 'Opportunity', rev: 21000000, emp: '501-1000', source: 'Campaign' },
  { name: 'Katarina Novak', company: 'Kinetix Autonomous Robotics', email: 'knovak@kinetixauto.io', status: 'Open', rev: 8900000, emp: '51-200', source: 'Exhibition' },
  { name: 'Lucas Bennett', company: 'Lithium Horizon Energy', email: 'lbennett@lithiumhorizon.com', status: 'Interested', rev: 16500000, emp: '201-500', source: 'Reference' },
  { name: 'Miriam Al-Hassan', company: 'Monolith Cloud Architectures', email: 'malhassan@monolithcloud.com', status: 'Lead', rev: 11000000, emp: '51-200', source: 'Cold Calling' },
  { name: 'Nathaniel Drake', company: 'NorthStar Navigation Works', email: 'ndrake@northstarnav.org', status: 'Opportunity', rev: 6300000, emp: '51-200', source: 'Advertisement' },
  { name: 'Octavia Rivera', company: 'Optima Health Tech Solutions', email: 'orivera@optimahealthtech.com', status: 'Quotation', rev: 13500000, emp: '201-500', source: 'Campaign' },
  { name: 'Pavel Volkov', company: 'Polymer Nano Composites', email: 'pvolkov@polymernano.com', status: 'Lead', rev: 4100000, emp: '11-50', source: 'Exhibition' },
  { name: 'Quinn Sullivan', company: 'Quantum Cryptography Labs', email: 'qsullivan@quantumcrypt.org', status: 'Open', rev: 19500000, emp: '201-500', source: 'Reference' },
  { name: 'Reese Witherspoon', company: 'Resonance Acoustic Imaging', email: 'rwitherspoon@resonanceai.com', status: 'Interested', rev: 8200000, emp: '51-200', source: 'Advertisement' },
  { name: 'Simon Adler', company: 'Stratosphere Flight Systems', email: 'sadler@stratosphereflight.com', status: 'Lead', rev: 32000000, emp: '1000+', source: 'Existing Customer' },
  { name: 'Talia Kim', company: 'Triton Marine Autonomous Vessels', email: 'tkim@tritonmarine.org', status: 'Opportunity', rev: 9800000, emp: '51-200', source: 'Exhibition' },
  { name: 'Ulysses Grant', company: 'Unified Grid Infrastructure', email: 'ugrant@unifiedgrid.gov', status: 'Open', rev: 27000000, emp: '501-1000', source: 'Campaign' },
  { name: 'Valerie Dupont', company: 'Vanguard Biologics Corporation', email: 'vdupont@vanguardbiologics.fr', status: 'Interested', rev: 15000000, emp: '201-500', source: 'Reference' },
  { name: 'Wesley Thorne', company: 'Wildcat Heavy Machinery', email: 'wthorne@wildcatmachinery.com', status: 'Lead', rev: 22000000, emp: '501-1000', source: 'Cold Calling' },
  { name: 'Xavier Morales', company: 'Xenon Optics & Laser Systems', email: 'xmorales@xenonoptics.io', status: 'Quotation', rev: 7700000, emp: '51-200', source: 'Advertisement' },
  { name: 'Yara Shah', company: 'YieldMax Agriscience Group', email: 'yshah@yieldmaxagri.com', status: 'Open', rev: 10500000, emp: '201-500', source: 'Exhibition' },
];

const NEW_ADDRESSES = [
  { title: 'Aetherial Cloud HQ', line: '100 Cyber Way, Suite 500', city: 'Seattle', state: 'Washington', zip: '98101' },
  { title: 'Aurora Defense Shipyards', line: '200 Naval Yard Blvd', city: 'Norfolk', state: 'Virginia', zip: '23510' },
  { title: 'Borealis Energy Campus', line: '300 Clean Energy Parkway', city: 'Austin', state: 'Texas', zip: '78701' },
  { title: 'Catalyst BioPharma Research Park', line: '400 Innovation Drive', city: 'Cambridge', state: 'Massachusetts', zip: '02142' },
  { title: 'Cerulean Space Center', line: '500 Space Flight Road', city: 'Cape Canaveral', state: 'Florida', zip: '32920' },
  { title: 'Cognitive Cyber DC Center', line: '600 Security Blvd, Suite 800', city: 'Arlington', state: 'Virginia', zip: '22202' },
  { title: 'Delta Precision Robotics Facility', line: '700 Automation Drive', city: 'Detroit', state: 'Michigan', zip: '48226' },
  { title: 'Echelon Federal Logistics Depot', line: '800 Supply Depot Way', city: 'Huntsville', state: 'Alabama', zip: '35801' },
  { title: 'Equinox Power Substation A', line: '900 Solar Valley Blvd', city: 'Phoenix', state: 'Arizona', zip: '85004' },
  { title: 'Fortress Global Security Command', line: '1010 Defense Highway', city: 'Bethesda', state: 'Maryland', zip: '20814' },
  { title: 'Galactic Aerospace Flight Deck', line: '1120 Aeronautics Way', city: 'Long Beach', state: 'California', zip: '90802' },
  { title: 'Genomic Diagnostics Labs', line: '1230 Gene Therapy Road', city: 'San Diego', state: 'California', zip: '92121' },
  { title: 'Hyperion Industrial Works', line: '1340 Heavy Industry Lane', city: 'Cleveland', state: 'Ohio', zip: '44114' },
  { title: 'Insignia Rail Yard Office', line: '1450 Transit Station Plaza', city: 'Chicago', state: 'Illinois', zip: '60606' },
  { title: 'Krypton Microcircuits Cleanroom', line: '1560 Silicon Boulevard', city: 'San Jose', state: 'California', zip: '95134' },
  { title: 'Luminary Medical Devices Center', line: '1670 Healthcare Way', city: 'Minneapolis', state: 'Minnesota', zip: '55401' },
  { title: 'Magellan Maritime Pier 45', line: '1780 Harbour View Road', city: 'New Orleans', state: 'Louisiana', zip: '70130' },
  { title: 'Novus Heavy Engineering Shop', line: '1890 Foundry Street', city: 'Pittsburgh', state: 'Pennsylvania', zip: '15222' },
  { title: 'OmniSecure National Security Lab', line: '2000 Government Plaza', city: 'Washington', state: 'District of Columbia', zip: '20001' },
  { title: 'Pinnacle Agritech Field Station', line: '2110 Harvest Road', city: 'Des Moines', state: 'Iowa', zip: '50309' },
  { title: 'Quasar Satellite Uplink', line: '2220 Telemetry Ridge Road', city: 'Boulder', state: 'Colorado', zip: '80301' },
  { title: 'Radiant Solar Power Station 4', line: '2330 Desert Sun Road', city: 'Las Vegas', state: 'Nevada', zip: '89101' },
  { title: 'Sentinel Autonomous Proving Grounds', line: '2440 Mobility Lane', city: 'Ann Arbor', state: 'Michigan', zip: '48104' },
  { title: 'TerraFirma Eco Research Base', line: '2550 Forest Trail Road', city: 'Portland', state: 'Oregon', zip: '97201' },
];

const NEW_CAMPAIGNS = [
  'Q1 Global Aerospace Sourcing Initiative 2026',
  'Next-Gen BioRobotics Automation Roadshow',
  'Defense & Cybersecurity Executive Summit',
  'Sustainable Supply Chain Tech Expo',
  'Cloud Infrastructure Modernization Campaign',
  'Autonomous Heavy Mobility Innovation Forum',
  'Clean Energy Grid Procurement Drive',
  'Medical Device Global Distribution Expo',
  'Enterprise Strategic Sourcing Conference',
  'Commercial Fleet Electrification Campaign',
  'Quantum Computing Hardware Procurement',
  'National Infrastructure Supply Conference',
  'Smart Warehouse Automation Showcase',
  'Global Rail & Maritime Sourcing Drive',
  'AI-Powered Logistics Procurement Tour',
  'Industrial Internet of Things Summit',
  'Government Defense Logistics Roundtables',
  'Precision Robotics Executive Briefing',
  'Renewable Power Battery Supply Expo',
  'Biopharma Clinical Supply Chain Summit',
  'High-Speed Avionics Innovation Drive',
  'OmniChannel Retail Procurement Expo',
  'Semiconductor Fabrication Sourcing 2026',
  'Public Sector IT Procurement Outreach',
  'Autonomous Marine Fleet Showcase',
  'Next-Gen Material Science Expo',
  'Defense Cyber Resilience Initiative',
  'Commercial Space Logistics Forum',
  'Agritech Sustainable Sourcing Drive',
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. Main Execution Function
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('================================================================');
  console.log(' CRM BULK SEEDING: AT LEAST 30 RECORDS IN EVERY DOCTYPE');
  console.log(` Target ERPNext: ${url}`);
  console.log('================================================================\n');

  // 1. Seed Campaigns (Target: >= 30)
  console.log('--- Step 1: Seeding Campaigns ---');
  let campCount = await getCount('Campaign');
  console.log(`Current Campaigns: ${campCount}`);
  for (const cName of NEW_CAMPAIGNS) {
    if (campCount >= 31) break;
    const checkRes = await api(`/api/resource/Campaign/${encodeURIComponent(cName)}`);
    if (!checkRes.ok) {
      const createRes = await api('/api/resource/Campaign', {
        method: 'POST',
        body: JSON.stringify({
          campaign_name: cName,
          description: `Strategic executive procurement campaign: ${cName}`,
        }),
      });
      if (createRes.ok) {
        campCount++;
        console.log(`[+] Created Campaign (${campCount}/31): ${cName}`);
      }
    }
  }
  campCount = await getCount('Campaign');
  console.log(`[VERIFIED] Total Campaigns in ERPNext: ${campCount}\n`);

  // 2. Seed Customers (Target: >= 30)
  console.log('--- Step 2: Seeding Customers ---');
  let custCount = await getCount('Customer');
  console.log(`Current Customers: ${custCount}`);
  for (const cust of NEW_CUSTOMERS) {
    if (custCount >= 31) break;
    const checkRes = await api(`/api/resource/Customer/${encodeURIComponent(cust.name)}`);
    if (!checkRes.ok) {
      const createRes = await api('/api/resource/Customer', {
        method: 'POST',
        body: JSON.stringify({
          customer_name: cust.name,
          customer_group: cust.group,
          territory: cust.territory,
          customer_type: 'Company',
        }),
      });
      if (createRes.ok) {
        custCount++;
        console.log(`[+] Created Customer (${custCount}/31): ${cust.name}`);
      }
    }
  }
  custCount = await getCount('Customer');
  console.log(`[VERIFIED] Total Customers in ERPNext: ${custCount}\n`);

  // 3. Seed Addresses (Target: >= 30)
  console.log('--- Step 3: Seeding Addresses ---');
  let addrCount = await getCount('Address');
  console.log(`Current Addresses: ${addrCount}`);
  for (const addr of NEW_ADDRESSES) {
    if (addrCount >= 32) break;
    const checkRes = await api(`/api/resource/Address?filters=[["Address","address_title","=","${addr.title}"]]`);
    const existing = parseRecords(checkRes.data);
    if (existing.length === 0) {
      const createRes = await api('/api/resource/Address', {
        method: 'POST',
        body: JSON.stringify({
          address_title: addr.title,
          address_type: 'Office',
          address_line1: addr.line,
          city: addr.city,
          state: addr.state,
          pincode: addr.zip,
          country: 'United States',
        }),
      });
      if (createRes.ok) {
        addrCount++;
        console.log(`[+] Created Address (${addrCount}/32): ${addr.title}`);
      }
    }
  }
  addrCount = await getCount('Address');
  console.log(`[VERIFIED] Total Addresses in ERPNext: ${addrCount}\n`);

  // 4. Seed Leads (Target: >= 30)
  console.log('--- Step 4: Seeding Leads ---');
  let leadCount = await getCount('Lead');
  console.log(`Current Leads: ${leadCount}`);
  const createdLeadNames = [];
  for (const lead of NEW_LEADS) {
    if (leadCount >= 34) break;
    const checkRes = await api(`/api/resource/Lead?filters=[["Lead","company_name","like","%${lead.company}%"]]`);
    const existing = parseRecords(checkRes.data);
    if (existing.length === 0) {
      const createRes = await api('/api/resource/Lead', {
        method: 'POST',
        body: JSON.stringify({
          lead_name: lead.name,
          company_name: lead.company,
          email_id: lead.email,
          phone: '+1-555-0100',
          mobile_no: '+1-555-0100',
          status: lead.status,
          lead_owner: 'crm@netlink.com',
          source: lead.source,
          type: 'Client',
          annual_revenue: lead.rev,
          no_of_employees: lead.emp,
          territory: 'United States',
        }),
      });
      if (createRes.ok) {
        leadCount++;
        createdLeadNames.push(createRes.data?.data?.name);
        console.log(`[+] Created Lead (${leadCount}/34): ${lead.company} (${lead.name})`);
      }
    }
  }
  leadCount = await getCount('Lead');
  console.log(`[VERIFIED] Total Leads in ERPNext: ${leadCount}\n`);

  // 5. Seed Opportunities (Target: >= 30)
  console.log('--- Step 5: Seeding Opportunities ---');
  let oppCount = await getCount('Opportunity');
  console.log(`Current Opportunities: ${oppCount}`);

  // Fetch available customers & stages to create rich diverse opportunities
  const custRes = await api('/api/resource/Customer?limit_page_length=50');
  const allCustomers = parseRecords(custRes.data);
  const stages = [
    'Prospecting',
    'Qualification',
    'Needs Analysis',
    'Value Proposition',
    'Identifying Decision Makers',
    'Perception Analysis',
    'Proposal/Price Quote',
    'Negotiation/Review',
  ];

  const oppDeals = [
    { title: 'Global Cloud Enterprise Architecture Overhaul', amount: 480000, stage: 'Negotiation/Review', status: 'Open' },
    { title: 'Autonomous Fleet Navigation Software Contract', amount: 310000, stage: 'Proposal/Price Quote', status: 'Open' },
    { title: 'Surgical Robotics Consumables 3-Year Sourcing', amount: 620000, stage: 'Perception Analysis', status: 'Open' },
    { title: 'Defense Marine Propulsion Supply Order', amount: 950000, stage: 'Identifying Decision Makers', status: 'Open' },
    { title: 'Clean Energy Grid Microinverters Procurement', amount: 240000, stage: 'Value Proposition', status: 'Open' },
    { title: 'BioPharma Chromatography Resin Supply Agreement', amount: 185000, stage: 'Needs Analysis', status: 'Open' },
    { title: 'Quantum Superconducting Logic Chips Order', amount: 720000, stage: 'Qualification', status: 'Open' },
    { title: 'Rail Transit Signaling Control Systems', amount: 890000, stage: 'Prospecting', status: 'Open' },
    { title: 'Satellite Telemetry Uplink Transceiver Units', amount: 375000, stage: 'Negotiation/Review', status: 'Open' },
    { title: 'Solar Tracking Motor Assemblies Bulk Purchase', amount: 290000, stage: 'Proposal/Price Quote', status: 'Open' },
    { title: 'Autonomous Sensor Lidar Integration Suite', amount: 530000, stage: 'Converted', status: 'Converted' },
    { title: 'Agritech Autonomous Harvester Drivetrains', amount: 420000, stage: 'Needs Analysis', status: 'Open' },
    { title: 'Cyber Intrusion Command Operations Platform', amount: 660000, stage: 'Perception Analysis', status: 'Open' },
    { title: 'High-Speed Aerospace Titanium Forgings', amount: 1150000, stage: 'Converted', status: 'Converted' },
    { title: 'Molecular Diagnostics Assay Reagents Batch', amount: 210000, stage: 'Qualification', status: 'Open' },
    { title: 'Heavy Foundry Castings for Turbine Housings', amount: 580000, stage: 'Prospecting', status: 'Open' },
    { title: 'Government Security Access Protocol Overhaul', amount: 440000, stage: 'Negotiation/Review', status: 'Open' },
    { title: 'Maritime Logistics Vessel Tracking Hub', amount: 330000, stage: 'Value Proposition', status: 'Open' },
    { title: 'Renewable Power Lithium Storage Modules', amount: 850000, stage: 'Proposal/Price Quote', status: 'Open' },
    { title: 'Environmental Sensing Drone Swarm Fleet', amount: 275000, stage: 'Needs Analysis', status: 'Open' },
    { title: 'Medical Imaging Ultrasound Transducer Heads', amount: 395000, stage: 'Identifying Decision Makers', status: 'Open' },
    { title: 'Space Vehicle Thermal Protection Tiles', amount: 1250000, stage: 'Negotiation/Review', status: 'Open' },
    { title: 'Autonomous Heavy Mining Hauler Control Units', amount: 780000, stage: 'Converted', status: 'Converted' },
    { title: 'Precision Micro-Gearboxes for Surgical Arms', amount: 460000, stage: 'Proposal/Price Quote', status: 'Open' },
    { title: 'Cleanroom HVAC Filtration Systems', amount: 190000, stage: 'Prospecting', status: 'Open' },
  ];

  let dealIdx = 0;
  for (const c of allCustomers) {
    if (oppCount >= 32) break;
    const deal = oppDeals[dealIdx % oppDeals.length];
    dealIdx++;

    const checkRes = await api(`/api/resource/Opportunity?filters=[["Opportunity","party_name","=","${c.name}"],["Opportunity","title","like","%${deal.title.slice(0, 15)}%"]]`);
    const existing = parseRecords(checkRes.data);
    if (existing.length === 0) {
      const createRes = await api('/api/resource/Opportunity', {
        method: 'POST',
        body: JSON.stringify({
          opportunity_from: 'Customer',
          party_name: c.name,
          title: `[DEMO] ${deal.title}`,
          opportunity_amount: deal.amount,
          sales_stage: deal.stage,
          status: deal.status,
          probability: deal.status === 'Converted' ? 100 : 70,
        }),
      });
      if (createRes.ok) {
        oppCount++;
        console.log(`[+] Created Opportunity (${oppCount}/32): [DEMO] ${deal.title} ($${deal.amount.toLocaleString()})`);
      }
    }
  }
  oppCount = await getCount('Opportunity');
  console.log(`[VERIFIED] Total Opportunities in ERPNext: ${oppCount}\n`);

  // 6. Summary Verification of all CRM DocTypes
  console.log('================================================================');
  console.log(' FINAL VERIFIED RECORD COUNTS ACROSS ALL CRM DOCTYPES:');
  console.log('================================================================');
  const dts = ['Lead', 'Opportunity', 'Customer', 'Contact', 'Address', 'Campaign'];
  let allAbove30 = true;
  for (const dt of dts) {
    const finalCount = await getCount(dt);
    const pass = finalCount >= 30;
    if (!pass) allAbove30 = false;
    console.log(`DocType "${dt}": ${finalCount} records [${pass ? '>= 30 PASS' : 'BELOW 30 FAIL'}]`);
  }

  if (allAbove30) {
    console.log('\n SUCCESS: Every single CRM DocType now has AT LEAST 30 live records in ERPNext!');
  } else {
    console.error('\n WARNING: Some DocTypes have not reached 30 records yet.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL]:', err);
  process.exit(1);
});
