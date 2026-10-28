import { Clock, ArrowRight, User, CheckCircle2, History } from "lucide-react";
import type { StageTransitionHistoryItem } from "../../api/crm";

interface Props {
  history: StageTransitionHistoryItem[];
  isLoading?: boolean;
}

export default function OpportunityStageHistory({ history, isLoading = false }: Props) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-bold text-neutral-900">
            Stage Transition History ({history.length})
          </h3>
          <span className="text-xs text-neutral-400">• Permanent audit trail</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 py-4">
          <div className="h-20 w-full animate-pulse rounded-xl bg-neutral-100" />
          <div className="h-20 w-full animate-pulse rounded-xl bg-neutral-100" />
        </div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center text-xs text-neutral-400">
          No stage transitions recorded yet. Advance the stage to create the first transition record.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:bottom-0 before:top-2 before:left-2.5 before:w-0.5 before:bg-neutral-200">
          {history.map((item, idx) => (
            <div key={item.id || idx} className="relative group">
              {/* Circle Marker on Timeline Line */}
              <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white ring-4 ring-white border-2 border-primary-600 text-primary-600">
                <CheckCircle2 className="h-3 w-3" />
              </div>

              {/* Card */}
              <div className="rounded-xl border border-neutral-200/90 bg-neutral-50/60 p-4 transition-all hover:border-primary-300 hover:bg-white shadow-2xs">
                {/* Stage path and date */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/60 pb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900">
                    <span className="rounded bg-neutral-200/80 px-2 py-0.5 text-neutral-800">
                      {item.fromStage}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-primary-600" />
                    <span className="rounded bg-primary-100 px-2 py-0.5 text-primary-800">
                      {item.toStage}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="flex items-center gap-1 font-medium">
                      <User className="h-3 w-3 text-neutral-400" />
                      {item.user}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Clock className="h-3 w-3" />
                      {item.timestamp ? new Date(item.timestamp).toLocaleString() : "Recently"}
                    </span>
                  </div>
                </div>

                {/* Mandatory Note Content */}
                <div className="mt-2.5 text-xs text-neutral-700 whitespace-pre-wrap leading-relaxed">
                  {item.note || "Stage transitioned successfully."}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
