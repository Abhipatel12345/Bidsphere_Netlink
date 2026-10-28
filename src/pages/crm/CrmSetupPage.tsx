import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Layers,
  Plus,
  RefreshCw,
  Tag,
  MapPin,
  Users,
  Briefcase,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getSalesStages,
  getOpportunityTypes,
  getUTMSources,
  getCustomerGroups,
  getTerritories,
  createSalesStage,
  createOpportunityType,
  createUTMSource,
} from "../../api/crm";

type SetupTab = "stages" | "types" | "sources" | "groups" | "territories";

export default function CrmSetupPage() {
  const [activeTab, setActiveTab] = useState<SetupTab>("stages");
  const [newStageName, setNewStageName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const {
    data: salesStages = [],
    refetch: refetchStages,
  } = useQuery({
    queryKey: ["crm-setup-stages"],
    queryFn: getSalesStages,
  });

  const {
    data: oppTypes = [],
    refetch: refetchTypes,
  } = useQuery({
    queryKey: ["crm-setup-types"],
    queryFn: getOpportunityTypes,
  });

  const {
    data: utmSources = [],
    refetch: refetchSources,
  } = useQuery({
    queryKey: ["crm-setup-sources"],
    queryFn: getUTMSources,
  });

  const {
    data: customerGroups = [],
    refetch: refetchGroups,
  } = useQuery({
    queryKey: ["crm-setup-groups"],
    queryFn: getCustomerGroups,
  });

  const {
    data: territories = [],
    refetch: refetchTerritories,
  } = useQuery({
    queryKey: ["crm-setup-territories"],
    queryFn: getTerritories,
  });

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) return;
    setIsSubmitting(true);
    try {
      await createSalesStage(newStageName.trim());
      toast.success(`Sales Stage "${newStageName}" created in ERPNext!`);
      setNewStageName("");
      void refetchStages();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create stage.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    setIsSubmitting(true);
    try {
      await createOpportunityType(newTypeName.trim());
      toast.success(`Opportunity Type "${newTypeName}" created in ERPNext!`);
      setNewTypeName("");
      void refetchTypes();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create type.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) return;
    setIsSubmitting(true);
    try {
      await createUTMSource(newSourceName.trim());
      toast.success(`Lead Source "${newSourceName}" created in ERPNext!`);
      setNewSourceName("");
      void refetchSources();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create source.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            CRM Masters & Setup
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Configure sales stages, opportunity types, lead sources, and territory masters
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void Promise.all([
              refetchStages(),
              refetchTypes(),
              refetchSources(),
              refetchGroups(),
              refetchTerritories(),
            ]);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Masters
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("stages")}
          className={`flex items-center gap-1.5 rounded-lg py-2 px-3.5 transition-colors ${
            activeTab === "stages"
              ? "bg-primary-50 text-primary-700 border border-primary-200"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Layers className="h-4 w-4" />
          Sales Stages ({salesStages.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("types")}
          className={`flex items-center gap-1.5 rounded-lg py-2 px-3.5 transition-colors ${
            activeTab === "types"
              ? "bg-primary-50 text-primary-700 border border-primary-200"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Opportunity Types ({oppTypes.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sources")}
          className={`flex items-center gap-1.5 rounded-lg py-2 px-3.5 transition-colors ${
            activeTab === "sources"
              ? "bg-primary-50 text-primary-700 border border-primary-200"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Tag className="h-4 w-4" />
          Lead Sources ({utmSources.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`flex items-center gap-1.5 rounded-lg py-2 px-3.5 transition-colors ${
            activeTab === "groups"
              ? "bg-primary-50 text-primary-700 border border-primary-200"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <Users className="h-4 w-4" />
          Customer Groups ({customerGroups.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("territories")}
          className={`flex items-center gap-1.5 rounded-lg py-2 px-3.5 transition-colors ${
            activeTab === "territories"
              ? "bg-primary-50 text-primary-700 border border-primary-200"
              : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          <MapPin className="h-4 w-4" />
          Territories ({territories.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        {/* Sales Stages */}
        {activeTab === "stages" && (
          <div className="space-y-5">
            <form onSubmit={handleCreateStage} className="flex gap-2 max-w-md">
              <input
                type="text"
                required
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="New stage name (e.g. Contract Signing)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add Stage
              </button>
            </form>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
              {salesStages.map((s, idx) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[10px] font-bold text-neutral-600">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-neutral-900">{s.stage_name || s.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunity Types */}
        {activeTab === "types" && (
          <div className="space-y-5">
            <form onSubmit={handleCreateType} className="flex gap-2 max-w-md">
              <input
                type="text"
                required
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="New opportunity type (e.g. Consulting)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add Type
              </button>
            </form>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {oppTypes.map((t) => (
                <div key={t.name} className="rounded-lg border border-neutral-200 p-3 text-xs font-semibold text-neutral-900">
                  {t.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead Sources (UTM Source) */}
        {activeTab === "sources" && (
          <div className="space-y-5">
            <form onSubmit={handleCreateSource} className="flex gap-2 max-w-md">
              <input
                type="text"
                required
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                placeholder="New lead source (e.g. LinkedIn Inbound)"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add Source
              </button>
            </form>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {utmSources.map((s) => (
                <div key={s.name} className="rounded-lg border border-neutral-200 p-3 text-xs font-semibold text-neutral-900">
                  {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Customer Groups */}
        {activeTab === "groups" && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {customerGroups.map((g) => (
              <div key={g.name} className="rounded-lg border border-neutral-200 p-3 text-xs font-semibold text-neutral-900">
                {g.name}
              </div>
            ))}
          </div>
        )}

        {/* Territories */}
        {activeTab === "territories" && (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {territories.map((t) => (
              <div key={t.name} className="rounded-lg border border-neutral-200 p-3 text-xs font-semibold text-neutral-900">
                {t.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
