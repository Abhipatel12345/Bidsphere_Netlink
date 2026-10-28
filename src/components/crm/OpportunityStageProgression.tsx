import { useMemo } from "react";
import {
  Check,
  Loader2,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Opportunity, SalesStage } from "../../types/crm";
import { CANONICAL_SALES_STAGES, normalizeStageName } from "../../api/crm";

export const CONFIGURED_SALES_STAGES = CANONICAL_SALES_STAGES;

interface Props {
  opportunity: Opportunity;
  onOpenAdvanceDialog?: (nextStage: string) => void;
  onCloseDealWon?: () => void;
  onCloseDealLost?: () => void;
  isUpdating?: boolean;
  salesStages?: SalesStage[];
}

export default function OpportunityStageProgression({
  opportunity,
  onOpenAdvanceDialog,
  onCloseDealWon,
  onCloseDealLost,
  isUpdating = false,
  salesStages = [],
}: Props) {
  // Map configured stages to ERPNext stage record names
  const stageList = useMemo(() => {
    return CONFIGURED_SALES_STAGES.map((configured) => {
      const normConfig = normalizeStageName(configured);
      const erpMatch = salesStages.find(
        (s) => normalizeStageName(s.name) === normConfig || normalizeStageName(s.stage_name) === normConfig
      );
      return {
        displayName: configured,
        erpName: erpMatch ? erpMatch.name : configured,
      };
    });
  }, [salesStages]);

  // Determine current stage index
  const currentIndex = useMemo(() => {
    const currentNorm = normalizeStageName(opportunity.sales_stage || "Prospecting");
    const idx = stageList.findIndex(
      (st) =>
        normalizeStageName(st.erpName) === currentNorm ||
        normalizeStageName(st.displayName) === currentNorm
    );
    return idx >= 0 ? idx : 0;
  }, [opportunity.sales_stage, stageList]);

  const isWon = opportunity.status === "Converted";
  const isLost = opportunity.status === "Lost";
  const isClosed = isWon || isLost;

  const currentDisplayStage = stageList[currentIndex]?.displayName || opportunity.sales_stage || "Prospecting";
  const nextStage = stageList[currentIndex + 1];
  const canAdvance = !isClosed && currentIndex < stageList.length - 1;
  const isFinalStage = !isClosed && currentIndex === stageList.length - 1;

  const handleStageClick = (idx: number, stageName: string) => {
    if (isUpdating || isClosed) return;
    if (idx === currentIndex) return;

    if (idx === currentIndex + 1) {
      if (onOpenAdvanceDialog) {
        onOpenAdvanceDialog(stageName);
      }
    } else if (idx > currentIndex + 1) {
      const immediateNext = stageList[currentIndex + 1]?.displayName || "the next stage";
      toast.error(`Opportunities must be advanced sequentially. Please advance to "${immediateNext}" first.`);
    } else {
      toast(`Stage "${stageName}" has already been completed.`, { icon: "✓" });
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-5">
      {/* Header with Title, Progress Count, and Active Stage Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-neutral-900">
              Sales Stage Progression
            </h3>
            <p className="text-[11px] text-neutral-500">
              {isWon
                ? "Deal successfully closed & won (Converted)"
                : isLost
                ? "Deal marked as Closed Lost"
                : `Stage ${currentIndex + 1} of ${stageList.length}: ${currentDisplayStage}`}
            </p>
          </div>
        </div>

        {/* Active Stage Badge */}
        <div className="flex items-center gap-2">
          {isUpdating && (
            <span className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              <span>Updating ERPNext…</span>
            </span>
          )}

          {isWon ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Deal Won (Converted)
            </span>
          ) : isLost ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-800 shadow-xs">
              <XCircle className="h-3.5 w-3.5 text-red-600" />
              Closed Lost
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400 font-medium hidden sm:inline">
                Active Stage:
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-700 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                {currentDisplayStage}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Stage Progression Line & Markers */}
      <div className="overflow-x-auto pb-3 pt-2">
        <div className="min-w-[860px] px-4">
          <div className="relative flex items-start justify-between">
            {stageList.map((stage, idx) => {
              const isCompleted = isWon || (!isLost && idx < currentIndex);
              const isCurrent = !isClosed && idx === currentIndex;
              const isNext = !isClosed && idx === currentIndex + 1;

              // Connector line up to this marker
              const isLineCompleted = isWon || (!isLost && idx <= currentIndex);

              return (
                <div
                  key={stage.displayName}
                  className="group relative flex flex-1 flex-col items-center text-center"
                >
                  {/* Connecting Line to Left */}
                  {idx > 0 && (
                    <div
                      className={`absolute top-4 -left-1/2 h-0.5 w-full -translate-y-1/2 transition-colors duration-200 ${
                        isLineCompleted ? "bg-blue-600" : "bg-neutral-200"
                      }`}
                      style={{ zIndex: 0 }}
                    />
                  )}

                  {/* Circular Marker */}
                  <button
                    type="button"
                    disabled={isUpdating || isCurrent || isClosed}
                    onClick={() => handleStageClick(idx, stage.displayName)}
                    title={
                      isClosed
                        ? `Deal is ${opportunity.status}`
                        : isCurrent
                        ? `Current Active Stage: ${stage.displayName}`
                        : isNext
                        ? `Click to advance to "${stage.displayName}"`
                        : `Stage ${idx + 1}: ${stage.displayName}`
                    }
                    className={`relative flex items-center justify-center transition-all duration-200 outline-none ${
                      isCompleted
                        ? "h-8 w-8 rounded-full bg-blue-600 text-white shadow-xs hover:bg-blue-700 cursor-pointer"
                        : isCurrent
                        ? "h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs ring-4 ring-blue-100 shadow-md scale-105 cursor-default"
                        : isNext
                        ? "h-8 w-8 rounded-full border-2 border-primary-500 bg-primary-50 text-primary-700 font-bold text-xs hover:scale-105 hover:bg-primary-600 hover:text-white cursor-pointer shadow-xs"
                        : "h-8 w-8 rounded-full border-2 border-neutral-300 bg-white text-neutral-400 font-semibold text-xs hover:border-neutral-400 cursor-pointer"
                    }`}
                    style={{ zIndex: 10 }}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : (
                      <span>{idx + 1}</span>
                    )}
                  </button>

                  {/* Stage Name Label */}
                  <button
                    type="button"
                    disabled={isUpdating || isCurrent || isClosed}
                    onClick={() => handleStageClick(idx, stage.displayName)}
                    className={`mt-2.5 max-w-[90px] text-center text-xs leading-tight transition-colors outline-none ${
                      isCurrent
                        ? "font-bold text-blue-600"
                        : isCompleted
                        ? "font-semibold text-neutral-800 hover:text-blue-600 cursor-pointer"
                        : isNext
                        ? "font-semibold text-primary-700 hover:text-primary-800 cursor-pointer"
                        : "font-medium text-neutral-500 hover:text-neutral-700 cursor-pointer"
                    }`}
                  >
                    {stage.displayName}
                  </button>

                  {/* Status Subtext below each stage */}
                  <div className="mt-1">
                    {isCurrent ? (
                      <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700 uppercase tracking-wider">
                        Active
                      </span>
                    ) : isCompleted ? (
                      <span className="text-[10px] font-medium text-emerald-600">
                        Completed
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-400">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Prominent Stage Mover Banner & Action Button */}
      <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
        {canAdvance && nextStage ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 font-bold text-sm">
                {currentIndex + 2}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-900">
                    Next Configured Stage:
                  </span>
                  <span className="rounded bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-800">
                    {nextStage.displayName}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Advancing requires mandatory progress notes and allows uploading stage-specific collateral.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onOpenAdvanceDialog && onOpenAdvanceDialog(nextStage.displayName)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-primary-700 hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              <span>Move to Next Stage</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : isFinalStage ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-neutral-900">
                  Final Negotiation Stage Reached
                </span>
                <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-800">
                  {currentDisplayStage}
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">
                This opportunity has completed all 9 pipeline stages. Conclude the deal outcome below.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onCloseDealWon && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={onCloseDealWon}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Won (Converted)
                </button>
              )}
              {onCloseDealLost && (
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={onCloseDealLost}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition-colors"
                >
                  <XCircle className="h-4 w-4" />
                  Mark as Closed Lost
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <ShieldAlert className="h-4 w-4 text-neutral-400" />
              <span>
                {isWon
                  ? "Deal has been successfully closed & won (Converted in ERPNext)."
                  : isLost
                  ? "Deal is closed as Lost in ERPNext."
                  : "Opportunity stage workflow complete."}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
