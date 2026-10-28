import { AlertCircle, CheckCircle2, Clock, RefreshCw, TrendingUp, Users } from "lucide-react";
import type { CrmDashboardKpi } from "../../types/crm";

interface Props {
  kpis: CrmDashboardKpi;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

export default function CrmKpiCards({
  kpis,
  isLoading = false,
  isError = false,
  onRetry,
}: Props) {
  const cards = [
    {
      title: "New Lead (Last 1 Month)",
      value: kpis.newLeadsLastMonth,
      subtext: "Incoming prospects in last 30 days",
      icon: Users,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
    },
    {
      title: "New Opportunity (Last 1 Month)",
      value: kpis.newOpportunitiesLastMonth,
      subtext: "Deals initiated in last 30 days",
      icon: TrendingUp,
      iconColor: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-100",
    },
    {
      title: "Won Opportunity (Last 1 Month)",
      value: kpis.wonOpportunitiesLastMonth,
      subtext: "Deals successfully converted",
      icon: CheckCircle2,
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
    },
    {
      title: "Open Opportunity",
      value: kpis.openOpportunities,
      subtext: "Active in sales pipeline",
      icon: Clock,
      iconColor: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md ${
              isError ? "border-amber-200 bg-amber-50/20" : "border-neutral-200/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {card.title}
              </span>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  isError ? "bg-amber-100 text-amber-700" : `${card.bgColor} ${card.iconColor}`
                }`}
              >
                {isError ? <AlertCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <div className="h-8 w-20 animate-pulse rounded bg-neutral-200" />
              ) : isError ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xl font-bold tracking-tight text-amber-800">
                      Unavailable
                    </div>
                    <div className="mt-0.5 text-[11px] text-amber-600">
                      Failed to fetch from ERPNext
                    </div>
                  </div>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-200"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold tracking-tight text-neutral-900">
                    {card.value.toLocaleString()}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">{card.subtext}</div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
