// Audit CRM Fields against live ERPNext DocType metadata
import fs from "fs";

const ERP_URL = "http://80.225.204.210:8090";
const ERP_KEY = "b80696279c27693";
const ERP_SECRET = "4c83e61c5e427ac";

const docTypes = [
  "Lead",
  "Opportunity",
  "Customer",
  "Contact",
  "Address",
  "Campaign",
  "Issue",
  "Sales Order",
  "Delivery Note",
  "Brand",
  "Issue Type",
  "Issue Priority",
  "Sales Stage",
  "File",
  "Comment"
];

async function fetchDocTypeMeta(doctype) {
  const res = await fetch(`${ERP_URL}/api/resource/DocType/${encodeURIComponent(doctype)}`, {
    headers: {
      Authorization: `token ${ERP_KEY}:${ERP_SECRET}`,
      Accept: "application/json"
    }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch meta for ${doctype}: ${res.status}`);
  }
  const json = await res.json();
  const fields = new Set(json.data.fields.map(f => f.fieldname));
  // Standard Frappe fields present on all DocTypes
  [
    "name", "owner", "creation", "modified", "modified_by",
    "docstatus", "idx", "_user_tags", "_comments", "_assign", "_liked_by"
  ].forEach(f => fields.add(f));
  return fields;
}

async function audit() {
  console.log("Fetching metadata for all CRM DocTypes from ERPNext...");
  const metaMap = {};
  for (const dt of docTypes) {
    try {
      metaMap[dt] = await fetchDocTypeMeta(dt);
      console.log(`✓ Loaded DocType ${dt}: ${metaMap[dt].size} valid fields`);
    } catch (err) {
      console.error(`✗ Error loading ${dt}:`, err.message);
    }
  }

  // Files to scan
  const filesToScan = [
    "src/api/crm.ts",
    "src/api/crmDashboard.ts",
    "src/api/crmReports.ts"
  ];

  console.log("\nScanning API files for field queries...");

  const queriesFound = [];

  for (const filePath of filesToScan) {
    const content = fs.readFileSync(filePath, "utf8");

    // Match patterns like /api/resource/DocType?fields=[...] or queryParams with fields
    // Also match JSON.stringify(["...", "..."])
    // Match fields: JSON.stringify([...])
    const fieldsRegex = /fields:\s*JSON\.stringify\(\s*(\[[^\]]+\])\s*\)/g;
    let match;
    while ((match = fieldsRegex.exec(content)) !== null) {
      try {
        const rawArray = eval(match[1]);
        // Find preceding or following doctype
        const snippet = content.substring(Math.max(0, match.index - 500), Math.min(content.length, match.index + 500));
        queriesFound.push({
          file: filePath,
          fields: rawArray,
          context: snippet
        });
      } catch (e) {
        console.warn("Could not eval fields array:", match[1]);
      }
    }

    // Also match URL fields query: fields=["...", "..."]
    const urlFieldsRegex = /fields=\[([^\]]+)\]/g;
    while ((match = urlFieldsRegex.exec(content)) !== null) {
      try {
        const rawArray = eval(`[${match[1]}]`);
        const snippet = content.substring(Math.max(0, match.index - 300), Math.min(content.length, match.index + 300));
        queriesFound.push({
          file: filePath,
          fields: rawArray,
          context: snippet
        });
      } catch (e) {
        // ignore
      }
    }
  }

  console.log(`Extracted ${queriesFound.length} query field sets across API files.\n`);

  let invalidCount = 0;
  for (const q of queriesFound) {
    // Try to determine doctype from context
    let detectedDocType = null;
    for (const dt of docTypes) {
      if (q.context.includes(dt)) {
        detectedDocType = dt;
        break;
      }
    }

    if (!detectedDocType) {
      // heuristic detection based on field names
      if (q.fields.includes("issue_type") || q.fields.includes("resolution_date") || q.fields.includes("sla_resolution_date")) {
        detectedDocType = "Issue";
      } else if (q.fields.includes("sales_stage") || q.fields.includes("opportunity_amount")) {
        detectedDocType = "Opportunity";
      } else if (q.fields.includes("customer_name") || q.fields.includes("customer_group")) {
        detectedDocType = "Customer";
      } else if (q.fields.includes("lead_name") || q.fields.includes("utm_source")) {
        detectedDocType = "Lead";
      } else if (q.fields.includes("delivery_status") || q.fields.includes("per_delivered")) {
        detectedDocType = "Sales Order";
      }
    }

    if (detectedDocType && metaMap[detectedDocType]) {
      const validSet = metaMap[detectedDocType];
      const invalids = q.fields.filter(f => !validSet.has(f));
      if (invalids.length > 0) {
        console.log(`[FAIL] In ${q.file} for DocType "${detectedDocType}":`);
        console.log(`       Invalid/Unpermitted fields: ${invalids.join(", ")}`);
        invalidCount += invalids.length;
      } else {
        console.log(`[PASS] In ${q.file} for DocType "${detectedDocType}": all ${q.fields.length} fields valid.`);
      }
    } else {
      console.log(`[SKIP] Could not definitively map query in ${q.file} to DocType (fields: ${q.fields.slice(0, 3).join(", ")}...)`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`AUDIT COMPLETE: ${invalidCount} invalid field references identified.`);
  console.log(`======================================================`);
}

audit().catch(console.error);
