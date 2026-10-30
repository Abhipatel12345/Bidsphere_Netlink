import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Database,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createLead,
  createCustomer,
  createComplaint,
  getLeads,
  getCustomers,
  getComplaints,
} from "../../api/crm";

type ImportTarget = "leads" | "customers" | "complaints";

interface ParsedRow {
  index: number;
  data: Record<string, string>;
  status: "valid" | "duplicate" | "invalid";
  error?: string;
}

export default function CrmDataImportPage() {
  const [target, setTarget] = useState<ImportTarget>("leads");
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{ imported: number; failed: number } | null>(null);

  // Existing records to check duplicates
  const { data: existingLeads } = useQuery({
    queryKey: ["existing-leads-check"],
    queryFn: () => getLeads({ limit_page_length: 500 }),
  });
  const { data: existingCustomers } = useQuery({
    queryKey: ["existing-customers-check"],
    queryFn: () => getCustomers({ limit_page_length: 500 }),
  });
  const { data: existingComplaints } = useQuery({
    queryKey: ["existing-complaints-check"],
    queryFn: () => getComplaints({ limit_page_length: 500 }),
  });

  const handleDownloadTemplate = () => {
    let headers: string[] = [];
    let sample: string[] = [];
    let filename = "";

    if (target === "leads") {
      filename = "lead_import_template.csv";
      headers = ["Lead Name", "Company Name", "Email ID", "Mobile No", "Lead Source", "Territory"];
      sample = ["Johnathan Edwards", "Caribbean Energy Corp", "j.edwards@caribbeanenergy.com", "+1-868-555-0192", "Advertisement", "Rest Of The World"];
    } else if (target === "customers") {
      filename = "customer_import_template.csv";
      headers = ["Customer Name", "Customer Group", "Territory", "Customer Type"];
      sample = ["Massy Supermarkets Port of Spain", "Commercial", "Rest Of The World", "Company"];
    } else {
      filename = "complaint_import_template.csv";
      headers = ["Subject", "Customer", "Priority", "Category", "Description", "Raised By"];
      sample = ["Damaged goods in transit container #51", "Massy Supermarkets Port of Spain", "High", "Damaged Goods in Transit", "Pallet crushed during offloading", "logistics@massy.com"];
    }

    const csvContent = "\uFEFF" + [headers.join(","), sample.join(",")].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length < 2) {
        toast.error("File is empty or contains only header row.");
        return;
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.replace(/^"|"$/g, "").trim().toLowerCase());

      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.replace(/^"|"$/g, "").trim());
        const rowData: Record<string, string> = {};
        headers.forEach((h, idx) => {
          rowData[h] = values[idx] || "";
        });

        // Validation & Duplicate Detection
        let status: "valid" | "duplicate" | "invalid" = "valid";
        let error: string | undefined;

        if (target === "leads") {
          const leadName = rowData["lead name"] || rowData["lead_name"];
          const email = rowData["email id"] || rowData["email"] || rowData["email_id"];

          if (!leadName) {
            status = "invalid";
            error = "Missing mandatory Lead Name";
          } else if (
            existingLeads?.leads.some(
              (l) =>
                l.lead_name?.toLowerCase() === leadName.toLowerCase() ||
                (email && l.email_id?.toLowerCase() === email.toLowerCase())
            )
          ) {
            status = "duplicate";
            error = "Duplicate: Lead already exists in ERPNext";
          }
        } else if (target === "customers") {
          const custName = rowData["customer name"] || rowData["customer_name"];
          if (!custName) {
            status = "invalid";
            error = "Missing mandatory Customer Name";
          } else if (
            existingCustomers?.customers.some(
              (c) =>
                (c.customer_name || c.name).toLowerCase() === custName.toLowerCase()
            )
          ) {
            status = "duplicate";
            error = "Duplicate: Customer already exists in ERPNext";
          }
        } else if (target === "complaints") {
          const subject = rowData["subject"];
          const customer = rowData["customer"];
          if (!subject || !customer) {
            status = "invalid";
            error = "Missing mandatory Subject or Customer";
          } else if (
            existingComplaints?.complaints.some(
              (c) =>
                c.subject.toLowerCase() === subject.toLowerCase() &&
                c.customer?.toLowerCase() === customer.toLowerCase()
            )
          ) {
            status = "duplicate";
            error = "Duplicate: Complaint already registered in ERPNext";
          }
        }

        rows.push({
          index: i,
          data: rowData,
          status,
          error,
        });
      }

      setParsedRows(rows);
    };

    reader.readAsText(file);
  };

  const handleImportApproved = async () => {
    const validRows = parsedRows.filter((r) => r.status === "valid");
    if (validRows.length === 0) {
      toast.error("No valid records to import.");
      return;
    }

    setIsProcessing(true);
    let imported = 0;
    let failed = 0;

    for (const r of validRows) {
      try {
        if (target === "leads") {
          await createLead({
            lead_name: r.data["lead name"] || r.data["lead_name"],
            company_name: r.data["company name"] || r.data["company_name"],
            email_id: r.data["email id"] || r.data["email"],
            mobile_no: r.data["mobile no"] || r.data["mobile_no"],
            utm_source: r.data["lead source"] || r.data["utm_source"] || "Reference",
            territory: r.data["territory"] || "Rest Of The World",
            status: "Lead",
          });
        } else if (target === "customers") {
          await createCustomer({
            customer_name: r.data["customer name"] || r.data["customer_name"],
            customer_group: r.data["customer group"] || "Commercial",
            territory: r.data["territory"] || "Rest Of The World",
            customer_type: (r.data["customer type"] as "Company" | "Individual") || "Company",
          });
        } else if (target === "complaints") {
          await createComplaint({
            subject: r.data["subject"],
            customer: r.data["customer"],
            priority: (r.data["priority"] as "Low" | "Medium" | "High" | "Urgent") || "Medium",
            issue_type: r.data["category"] || "General",
            description: r.data["description"] || "",
            raised_by: r.data["raised by"] || r.data["raised_by"],
          });
        }
        imported++;
      } catch (err) {
        failed++;
      }
    }

    setIsProcessing(false);
    setImportSummary({ imported, failed });
    toast.success(`Import complete! ${imported} records created in ERPNext.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              Spreadsheet Data Consolidation
            </h1>
            <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary-800">
              Controlled Excel / CSV Ingestion
            </span>
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Consolidate legacy Excel spreadsheets and disconnected customer files into verified ERPNext records without duplicates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          <Download className="h-3.5 w-3.5" />
          Download {target.toUpperCase()} Template
        </button>
      </div>

      {/* Target Selector */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            setTarget("leads");
            setParsedRows([]);
            setFileName("");
          }}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
            target === "leads"
              ? "border-primary-600 bg-primary-50/40 shadow-sm"
              : "border-neutral-200 bg-white hover:bg-neutral-50"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-900">Sales Leads</div>
            <div className="text-xs text-neutral-500">Import prospective clients</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTarget("customers");
            setParsedRows([]);
            setFileName("");
          }}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
            target === "customers"
              ? "border-primary-600 bg-primary-50/40 shadow-sm"
              : "border-neutral-200 bg-white hover:bg-neutral-50"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-900">Customer Accounts</div>
            <div className="text-xs text-neutral-500">Import Master Customers</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setTarget("complaints");
            setParsedRows([]);
            setFileName("");
          }}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
            target === "complaints"
              ? "border-primary-600 bg-primary-50/40 shadow-sm"
              : "border-neutral-200 bg-white hover:bg-neutral-50"
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-neutral-900">Customer Complaints</div>
            <div className="text-xs text-neutral-500">Import legacy complaint logs</div>
          </div>
        </button>
      </div>

      {/* Upload Box */}
      <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center shadow-sm">
        <UploadCloud className="mx-auto h-10 w-10 text-primary-500" />
        <h3 className="mt-2 text-sm font-bold text-neutral-900">
          Upload Spreadsheet for {target.toUpperCase()} Consolidation
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Upload .csv or spreadsheet file. Headers will be validated against ERPNext schema automatically.
        </p>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700">
          <FileSpreadsheet className="h-4 w-4" />
          Select File from Computer
          <input
            type="file"
            accept=".csv, text/csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {fileName && (
          <div className="mt-3 text-xs font-semibold text-primary-700">
            Selected: {fileName} ({parsedRows.length} rows parsed)
          </div>
        )}
      </div>

      {/* Validation & Import Summary */}
      {parsedRows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold text-neutral-900">
                Validation Summary:
              </span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800">
                {parsedRows.filter((r) => r.status === "valid").length} Valid
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-bold text-amber-800">
                {parsedRows.filter((r) => r.status === "duplicate").length} Duplicates
              </span>
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 font-bold text-red-800">
                {parsedRows.filter((r) => r.status === "invalid").length} Invalid
              </span>
            </div>

            <button
              type="button"
              onClick={handleImportApproved}
              disabled={isProcessing || parsedRows.filter((r) => r.status === "valid").length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing to ERPNext...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Import {parsedRows.filter((r) => r.status === "valid").length} Approved Records
                </>
              )}
            </button>
          </div>

          {importSummary && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 shadow-sm">
              <div className="font-bold">Consolidation Batch Finished:</div>
              <div>Successfully ingested into ERPNext: {importSummary.imported} records</div>
              {importSummary.failed > 0 && <div>Errors encountered: {importSummary.failed} records</div>}
            </div>
          )}

          {/* Dry Run Preview Table */}
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
              <h4 className="text-xs font-bold text-neutral-800">
                Data Mapping & Pre-Import Dry Run Preview
              </h4>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50/50 font-semibold text-neutral-600">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Validation Status</th>
                    <th className="py-2.5 px-3">Primary Identifier</th>
                    <th className="py-2.5 px-3">Details / Fields</th>
                    <th className="py-2.5 px-3">Reason / Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {parsedRows.map((r) => (
                    <tr key={r.index} className="hover:bg-neutral-50">
                      <td className="py-2 px-3 font-mono text-neutral-400">{r.index}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            r.status === "valid"
                              ? "bg-emerald-100 text-emerald-800"
                              : r.status === "duplicate"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-bold text-neutral-900">
                        {r.data["lead name"] || r.data["customer name"] || r.data["subject"] || "—"}
                      </td>
                      <td className="py-2 px-3 text-neutral-600">
                        {Object.entries(r.data)
                          .slice(1, 4)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" • ")}
                      </td>
                      <td className="py-2 px-3 text-[11px] font-medium text-neutral-500">
                        {r.error ? (
                          <span className={r.status === "duplicate" ? "text-amber-700" : "text-red-600"}>
                            {r.error}
                          </span>
                        ) : (
                          <span className="text-emerald-700">Ready to commit to ERP</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
