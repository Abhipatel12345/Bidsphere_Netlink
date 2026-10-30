// Test all actual CRM queries against live ERPNext instance
// Catches every single "Field not permitted in query" error!

const ERP_URL = "http://80.225.204.210:8090";
const ERP_KEY = "b80696279c27693";
const ERP_SECRET = "4c83e61c5e427ac";

async function runTest(name, endpoint, description) {
  const url = `${ERP_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${ERP_KEY}:${ERP_SECRET}`,
        Accept: "application/json"
      }
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // not json
    }

    if (!res.ok || json?.exception || json?._server_messages) {
      const errDetail = json?.exception || json?._server_messages || text;
      console.log(`[FAIL] ${name}: ${res.status}`);
      console.log(`       URL: ${endpoint}`);
      console.log(`       Error: ${errDetail.substring(0, 200)}`);
      return { name, endpoint, status: "FAIL", error: errDetail };
    } else {
      const count = Array.isArray(json?.data) ? json.data.length : (json?.data ? 1 : (json?.message ? 1 : 0));
      console.log(`[PASS] ${name} (returned ${count} records)`);
      return { name, endpoint, status: "PASS", count };
    }
  } catch (err) {
    console.log(`[FAIL] ${name}: ${err.message}`);
    return { name, endpoint, status: "FAIL", error: err.message };
  }
}

async function main() {
  console.log("================================================================================");
  console.log("EXECUTING COMPREHENSIVE LIVE QUERY VERIFICATION ACROSS ALL CRM API ENDPOINTS");
  console.log("================================================================================");

  const results = [];

  // 1. Leads query (getLeads)
  const leadFields = JSON.stringify([
    "name", "lead_name", "first_name", "last_name", "company_name",
    "email_id", "mobile_no", "phone", "status", "type", "utm_source",
    "lead_owner", "territory", "annual_revenue", "industry", "lead_date",
    "creation", "modified", "customer"
  ]);
  results.push(await runTest("getLeads", `/api/resource/Lead?fields=${encodeURIComponent(leadFields)}&limit_page_length=5`, "crm.ts:getLeads"));

  // 2. Incoming Leads over time (crmDashboard.ts)
  results.push(await runTest("crmDashboard:IncomingLeads", `/api/resource/Lead?fields=["name","creation","lead_date"]&order_by=creation asc&limit_page_length=1000`, "crmDashboard.ts:getIncomingLeadsOverTime"));

  // 3. Opportunities query (getOpportunities)
  const oppFields = JSON.stringify([
    "name", "title", "opportunity_from", "party_name", "status",
    "opportunity_type", "sales_stage", "expected_closing", "opportunity_amount",
    "probability", "utm_source", "opportunity_owner", "territory", "company",
    "creation", "modified"
  ]);
  results.push(await runTest("getOpportunities", `/api/resource/Opportunity?fields=${encodeURIComponent(oppFields)}&limit_page_length=5`, "crm.ts:getOpportunities"));

  // 4. Opportunities Stage Distribution (crmDashboard.ts)
  results.push(await runTest("crmDashboard:StageDistribution", `/api/resource/Opportunity?fields=["name","sales_stage","opportunity_amount","status","probability"]&limit_page_length=1000`, "crmDashboard.ts:getOpportunityStageDistribution"));

  // 5. Opportunities Closing Soon (crmDashboard.ts)
  results.push(await runTest("crmDashboard:ClosingSoon", `/api/resource/Opportunity?filters=${encodeURIComponent(JSON.stringify([["status","=","Open"]]))}&fields=["name","title","party_name","opportunity_amount","sales_stage","expected_closing","probability"]&order_by=expected_closing asc&limit_page_length=10`, "crmDashboard.ts:getOpportunitiesClosingSoon"));

  // 6. Customers query (getCustomers)
  const custFields = JSON.stringify([
    "name", "customer_name", "customer_type", "customer_group",
    "territory", "lead_name", "opportunity_name", "account_manager",
    "creation", "modified"
  ]);
  results.push(await runTest("getCustomers", `/api/resource/Customer?fields=${encodeURIComponent(custFields)}&limit_page_length=5`, "crm.ts:getCustomers"));

  // 7. Customer 360 Related Opportunities (getCustomerRelatedRecords)
  results.push(await runTest("Customer360:RelatedOpps", `/api/resource/Opportunity?filters=${encodeURIComponent(JSON.stringify([["party_name","=","Titan Enterprise Solutions"]]))}&fields=["name","title","sales_stage","status","opportunity_amount","expected_closing","modified"]`, "crm.ts:getCustomerRelatedRecords"));

  // 8. Complaints query (getComplaints)
  const complaintFields = JSON.stringify([
    "name", "subject", "customer", "customer_name", "raised_by", "status",
    "priority", "issue_type", "description", "resolution_details",
    "opening_date", "opening_time", "sla_resolution_date", "resolution_time",
    "lead", "contact", "company", "attachment", "creation", "modified",
    "owner", "modified_by"
  ]);
  results.push(await runTest("getComplaints", `/api/resource/Issue?fields=${encodeURIComponent(complaintFields)}&limit_page_length=5`, "crm.ts:getComplaints"));

  // 9. Complaints Dashboard Metrics (crmDashboard.ts)
  results.push(await runTest("crmDashboard:ComplaintsMetrics", `/api/resource/Issue?fields=["name","status","priority","issue_type","opening_date"]&limit_page_length=1000`, "crmDashboard.ts:getComplaintsDashboardMetrics"));

  // 10. Sales Orders query (getSalesOrders)
  const soFields = JSON.stringify([
    "name", "customer", "customer_name", "transaction_date", "delivery_date",
    "grand_total", "net_total", "status", "delivery_status", "billing_status",
    "per_delivered", "per_billed", "company", "creation", "modified"
  ]);
  results.push(await runTest("getSalesOrders", `/api/resource/Sales Order?fields=${encodeURIComponent(soFields)}&limit_page_length=5`, "crm.ts:getSalesOrders"));

  // 11. Delivery Notes query (getDeliveryNotes)
  const dnFields = JSON.stringify([
    "name", "customer", "customer_name", "posting_date", "posting_time",
    "grand_total", "status", "currency", "company", "lr_no", "vehicle_no",
    "transporter_name", "creation", "modified"
  ]);
  results.push(await runTest("getDeliveryNotes", `/api/resource/Delivery Note?fields=${encodeURIComponent(dnFields)}&limit_page_length=5`, "crm.ts:getDeliveryNotes"));

  // 12. Delivery Dashboard Metrics (crmDashboard.ts)
  results.push(await runTest("crmDashboard:DeliveryMetrics", `/api/resource/Sales Order?fields=["name","delivery_status","per_delivered","grand_total","delivery_date","status"]&limit_page_length=1000`, "crmDashboard.ts:getDeliveryDashboardMetrics"));

  // 13. Customer Dashboard Metrics (crmDashboard.ts)
  results.push(await runTest("crmDashboard:CustomerMetrics", `/api/resource/Customer?fields=["name","creation","customer_group","territory"]&limit_page_length=1000`, "crmDashboard.ts:getCustomerDashboardMetrics"));

  // 14. Contacts query (getContacts)
  const contactFields = JSON.stringify([
    "name", "first_name", "last_name", "email_id", "mobile_no", "phone",
    "department", "designation", "company_name", "modified"
  ]);
  results.push(await runTest("getContacts", `/api/resource/Contact?fields=${encodeURIComponent(contactFields)}&limit_page_length=5`, "crm.ts:getContacts"));

  // 15. Addresses query (getAddresses)
  const addressFields = JSON.stringify([
    "name", "address_title", "address_type", "address_line1", "address_line2",
    "city", "state", "country", "pincode", "is_primary_address"
  ]);
  results.push(await runTest("getAddresses", `/api/resource/Address?fields=${encodeURIComponent(addressFields)}&limit_page_length=5`, "crm.ts:getAddresses"));

  // 16. Campaigns query (getCampaigns)
  const campaignFields = JSON.stringify([
    "name", "campaign_name", "description", "creation", "modified"
  ]);
  results.push(await runTest("getCampaigns", `/api/resource/Campaign?fields=${encodeURIComponent(campaignFields)}&limit_page_length=5`, "crm.ts:getCampaigns"));

  // 17. Brands query (getBrands)
  results.push(await runTest("getBrands", `/api/resource/Brand?fields=["name","brand","description","image"]&limit_page_length=100`, "crm.ts:getBrands"));

  // 18. Issue Types query (getIssueTypes)
  results.push(await runTest("getIssueTypes", `/api/resource/Issue Type?fields=["name"]&limit_page_length=100`, "crm.ts:getIssueTypes"));

  // 19. Issue Priorities query (getIssuePriorities)
  results.push(await runTest("getIssuePriorities", `/api/resource/Issue Priority?fields=["name"]&limit_page_length=100`, "crm.ts:getIssuePriorities"));

  // 20. Reports Queries (crmReports.ts)
  // - Report: complaints-summary
  const repComplaintFields = JSON.stringify([
    "name", "subject", "customer", "status", "priority", "issue_type",
    "opening_date", "resolution_details", "raised_by"
  ]);
  results.push(await runTest("crmReports:ComplaintsSummary", `/api/resource/Issue?fields=${encodeURIComponent(repComplaintFields)}&limit_page_length=5`, "crmReports.ts:complaints-summary"));

  // - Report: order-delivery-tracking
  const repDeliveryFields = JSON.stringify([
    "name", "customer", "customer_name", "transaction_date", "delivery_date",
    "delivery_status", "per_delivered", "grand_total", "status", "creation"
  ]);
  results.push(await runTest("crmReports:DeliveryTracking", `/api/resource/Sales Order?fields=${encodeURIComponent(repDeliveryFields)}&limit_page_length=5`, "crmReports.ts:order-to-delivery"));

  console.log("\n================================================================================");
  console.log("QUERY AUDIT RESULTS SUMMARY");
  console.log("================================================================================");
  const failed = results.filter(r => r.status === "FAIL");
  const passed = results.filter(r => r.status === "PASS");
  console.log(`Total Queries Tested:  ${results.length}`);
  console.log(`Passed Queries:        ${passed.length}`);
  console.log(`Failed Queries:        ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFAILED QUERIES LIST:");
    failed.forEach(f => {
      console.log(`- ${f.name} (${f.endpoint})`);
      console.log(`  Error: ${f.error}`);
    });
  }
}

main().catch(console.error);
