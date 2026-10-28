import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit,
  FileText,
  Trash2,
  XCircle,
  Paperclip,
  History,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getSalesStages,
  makeQuotationFromOpportunity,
  formatOpportunityAmount,
  getCrmAttachments,
  getStageTransitionHistory,
} from "../../api/crm";
import type { Opportunity, OpportunityStatus } from "../../types/crm";
import OpportunityItemTable from "../../components/crm/OpportunityItemTable";
import OpportunityStageProgression from "../../components/crm/OpportunityStageProgression";
import OpportunityStageTransitionModal from "../../components/crm/OpportunityStageTransitionModal";
import OpportunityStageDocuments from "../../components/crm/OpportunityStageDocuments";
import OpportunityStageHistory from "../../components/crm/OpportunityStageHistory";
import CrmNotesAttachments from "../../components/crm/CrmNotesAttachments";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function OpportunityDetailPage() {
  const { name = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isConvertingQuotation, setIsConvertingQuotation] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [targetNextStage, setTargetNextStage] = useState("");
  const [activeTab, setActiveTab] = useState<"documents" | "history" | "timeline">("documents");

  const {
    data: opportunity,
    isLoading,
    refetch: refetchOpportunity,
  } = useQuery({
    queryKey: ["crm-opportunity", name],
    queryFn: () => getOpportunity(decodeURIComponent(name)),
    enabled: Boolean(name),
  });

  const { data: salesStages = [] } = useQuery({
    queryKey: ["crm-sales-stages"],
    queryFn: getSalesStages,
    staleTime: 5 * 60_000,
  });

  // Stage Documents query
  const {
    data: attachments = [],
    refetch: refetchAttachments,
    isLoading: isAttachmentsLoading,
  } = useQuery({
    queryKey: ["crm-attachments", "Opportunity", opportunity?.name],
    queryFn: () => getCrmAttachments("Opportunity", opportunity!.name),
    enabled: Boolean(opportunity?.name),
  });

  // Stage Transition History query
  const {
    data: stageHistory = [],
    refetch: refetchHistory,
    isLoading: isHistoryLoading,
  } = useQuery({
    queryKey: ["crm-stage-history", opportunity?.name],
    queryFn: () => getStageTransitionHistory(opportunity!.name),
    enabled: Boolean(opportunity?.name),
  });

  // Handle successful stage transition from modal
  const handleAdvanceSuccess = (updatedOpp: Opportunity) => {
    // 1. Immediately update cache with returned Opportunity
    queryClient.setQueryData(["crm-opportunity", name], updatedOpp);

    // 2. Refresh related queries asynchronously
    void refetchOpportunity();
    void refetchAttachments();
    void refetchHistory();
    void queryClient.invalidateQueries({ queryKey: ["crm-pipeline-opps"] });
    void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-stage-distribution"] });
    void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-kpis"] });

    // 3. Switch to history tab so user sees their new transition note immediately
    setActiveTab("history");
  };

  const handleStatusChange = async (newStatus: OpportunityStatus) => {
    if (!opportunity) return;
    try {
      await updateOpportunity(opportunity.name, { status: newStatus });
      toast.success(
        newStatus === "Converted"
          ? "Deal successfully marked as Won (Converted)!"
          : `Deal marked as ${newStatus}`
      );
      void refetchOpportunity();
      void queryClient.invalidateQueries({ queryKey: ["crm-pipeline-opps"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-stage-distribution"] });
      void queryClient.invalidateQueries({ queryKey: ["crm-dashboard-kpis"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    }
  };

  const handleConvertToQuotation = async () => {
    if (!opportunity) return;
    setIsConvertingQuotation(true);
    try {
      const quotation = await makeQuotationFromOpportunity(opportunity.name);
      toast.success(`Quotation "${quotation.name}" created successfully in ERPNext!`);
      void refetchOpportunity();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Conversion to Quotation failed.";
      toast.error(msg);
    } finally {
      setIsConvertingQuotation(false);
    }
  };

  const handleDelete = async () => {
    if (!opportunity) return;
    try {
      await deleteOpportunity(opportunity.name);
      toast.success("Opportunity deleted.");
      navigate("/crm/opportunities");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete opportunity.";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="py-12 text-center text-sm text-neutral-500">
        Opportunity not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/crm/opportunities"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 shadow-2xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
                {opportunity.title || opportunity.name}
              </h1>
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
                {opportunity.name}
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              {opportunity.opportunity_from}: <strong className="text-neutral-700">{opportunity.party_name}</strong> • Created on{" "}
              {new Date(opportunity.creation || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleConvertToQuotation}
            disabled={isConvertingQuotation}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Create Quotation
          </button>

          <Link
            to={`/crm/opportunities/${encodeURIComponent(opportunity.name)}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 transition-colors"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Link>

          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-600 hover:bg-red-100 transition-colors"
            title="Delete Opportunity"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Sales Stage Progression Bar with Prominent Move Button */}
      <OpportunityStageProgression
        opportunity={opportunity}
        onOpenAdvanceDialog={(nextStage) => {
          setTargetNextStage(nextStage);
          setIsAdvanceModalOpen(true);
        }}
        onCloseDealWon={() => handleStatusChange("Converted")}
        onCloseDealLost={() => handleStatusChange("Lost")}
        salesStages={salesStages}
      />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 cols) */}
        <div className="space-y-6 lg:col-span-2">
          {/* Key Financials Card */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm sm:grid-cols-4">
            <div>
              <span className="text-xs text-neutral-500">Opportunity Amount</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {formatOpportunityAmount(opportunity.opportunity_amount, opportunity.currency)}
              </p>
              <span className="text-[11px] text-neutral-400">{opportunity.currency || "USD"}</span>
            </div>

            <div>
              <span className="text-xs text-neutral-500">Win Probability</span>
              <p className="mt-1 text-2xl font-bold text-neutral-900">
                {opportunity.probability ?? 50}%
              </p>
              <span className="text-[11px] text-neutral-400">Confidence score</span>
            </div>

            <div>
              <span className="text-xs text-neutral-500">Expected Closing</span>
              <p className="mt-1 text-base font-semibold text-neutral-900">
                {opportunity.expected_closing || "—"}
              </p>
              <span className="text-[11px] text-neutral-400">Target close date</span>
            </div>

            <div>
              <span className="text-xs text-neutral-500">Deal Status</span>
              <p className="mt-1 text-base font-semibold text-neutral-900">
                {opportunity.status}
              </p>
              <span className="text-[11px] text-neutral-400">Current workflow</span>
            </div>
          </div>

          {/* Items Child Table */}
          <OpportunityItemTable items={opportunity.items || []} readOnly={true} />

          {/* Engagement, Documents & Governance Tabs */}
          <div className="space-y-4">
            {/* Tab Buttons */}
            <div className="flex border-b border-neutral-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("documents")}
                className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition-colors ${
                  activeTab === "documents"
                    ? "border-primary-600 text-primary-600 font-bold"
                    : "border-transparent text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <Paperclip className="h-4 w-4" />
                Stage Documents ({attachments.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition-colors ${
                  activeTab === "history"
                    ? "border-primary-600 text-primary-600 font-bold"
                    : "border-transparent text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <History className="h-4 w-4" />
                Stage History ({stageHistory.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition-colors ${
                  activeTab === "timeline"
                    ? "border-primary-600 text-primary-600 font-bold"
                    : "border-transparent text-neutral-500 hover:text-neutral-700"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Timeline & Notes
              </button>
            </div>

            {/* Active Tab Panel */}
            {activeTab === "documents" && (
              <OpportunityStageDocuments
                opportunityName={opportunity.name}
                currentStage={opportunity.sales_stage || "Prospecting"}
                attachments={attachments}
                onRefresh={async () => {
                  await refetchAttachments();
                }}
                isLoading={isAttachmentsLoading}
              />
            )}

            {activeTab === "history" && (
              <OpportunityStageHistory
                history={stageHistory}
                isLoading={isHistoryLoading}
              />
            )}

            {activeTab === "timeline" && (
              <CrmNotesAttachments doctype="Opportunity" docname={opportunity.name} />
            )}
          </div>
        </div>

        {/* Right Column Controls */}
        <div className="space-y-6">
          {/* Status & Outcome Actions */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Deal Outcome Actions
            </h3>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange("Converted")}
                className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <span>Mark as Won (Converted)</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("Lost")}
                className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 transition-colors"
              >
                <span>Mark as Closed Lost</span>
                <XCircle className="h-4 w-4 text-red-600" />
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange("Open")}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                <span>Reopen Opportunity</span>
                <Clock className="h-4 w-4 text-neutral-500" />
              </button>
            </div>
          </div>

          {/* Account Details */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Account Information
            </h3>

            <div className="mt-3 space-y-3 text-xs">
              <div>
                <span className="text-neutral-400">Party Type:</span>
                <p className="font-semibold text-neutral-900">{opportunity.opportunity_from}</p>
              </div>

              <div>
                <span className="text-neutral-400">Party Name:</span>
                <p className="font-semibold text-neutral-900">{opportunity.party_name}</p>
              </div>

              <div>
                <span className="text-neutral-400">Opportunity Owner:</span>
                <p className="font-semibold text-neutral-900">{opportunity.opportunity_owner || "—"}</p>
              </div>

              <div>
                <span className="text-neutral-400">Source:</span>
                <p className="font-semibold text-neutral-900">{opportunity.utm_source || "Direct"}</p>
              </div>

              <div>
                <span className="text-neutral-400">Current Sales Stage:</span>
                <p className="font-bold text-primary-700">{opportunity.sales_stage || "Prospecting"}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advance Stage Modal */}
      <OpportunityStageTransitionModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        opportunity={opportunity}
        currentStage={opportunity.sales_stage || "Prospecting"}
        nextStage={targetNextStage}
        onSuccess={handleAdvanceSuccess}
      />

      {/* Delete Opportunity Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteOpen}
        title="Delete Opportunity"
        description={`Are you sure you want to delete opportunity "${opportunity.title || opportunity.name}"?`}
        confirmLabel="Delete"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
