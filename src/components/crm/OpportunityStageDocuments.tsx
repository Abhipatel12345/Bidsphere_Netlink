import { useState, useRef } from "react";
import {
  UploadCloud,
  Eye,
  Download,
  Trash2,
  Paperclip,
  Loader2,
  FolderOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  uploadCrmFile,
  deleteCrmFile,
  CANONICAL_SALES_STAGES,
  normalizeStageName,
  type CrmAttachment,
} from "../../api/crm";
import DocumentPreviewModal from "./DocumentPreviewModal";
import ConfirmDialog from "../ui/ConfirmDialog";

interface Props {
  opportunityName: string;
  currentStage: string;
  attachments: CrmAttachment[];
  onRefresh: () => Promise<void> | void;
  isLoading?: boolean;
}

export default function OpportunityStageDocuments({
  opportunityName,
  currentStage,
  attachments,
  onRefresh,
  isLoading = false,
}: Props) {
  const [selectedStageTab, setSelectedStageTab] = useState<string>("ALL");
  const [previewDoc, setPreviewDoc] = useState<CrmAttachment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CrmAttachment | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Group attachments by stage
  const filteredAttachments = attachments.filter((att) => {
    if (selectedStageTab === "ALL") return true;
    if (selectedStageTab === "GENERAL") return !att.stage;
    return normalizeStageName(att.stage || "") === normalizeStageName(selectedStageTab);
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    const targetStage = selectedStageTab === "ALL" || selectedStageTab === "GENERAL" ? currentStage : selectedStageTab;

    setIsUploading(true);
    try {
      for (const file of files) {
        await uploadCrmFile(file, "Opportunity", opportunityName, targetStage);
      }
      toast.success(
        files.length === 1
          ? `Document uploaded to "${targetStage}"!`
          : `${files.length} documents uploaded to "${targetStage}"!`
      );
      await onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload document.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCrmFile(deleteTarget.name);
      toast.success(`Document "${deleteTarget.displayName || deleteTarget.file_name}" deleted.`);
      setDeleteTarget(null);
      await onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not delete file.";
      toast.error(msg);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-bold text-neutral-900">
            Stage Documents ({attachments.length})
          </h3>
          <span className="text-xs text-neutral-400">• Persistent ERPNext file storage</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            disabled={isUploading}
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload to {selectedStageTab === "ALL" ? currentStage : selectedStageTab}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stage Tabs / Filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedStageTab("ALL")}
          className={`shrink-0 rounded-lg px-2.5 py-1 font-medium transition-colors ${
            selectedStageTab === "ALL"
              ? "bg-neutral-900 text-white font-semibold shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All Stages ({attachments.length})
        </button>

        {CANONICAL_SALES_STAGES.map((stg) => {
          const count = attachments.filter(
            (a) => normalizeStageName(a.stage || "") === normalizeStageName(stg)
          ).length;
          const isCurrent = normalizeStageName(stg) === normalizeStageName(currentStage);

          return (
            <button
              key={stg}
              type="button"
              onClick={() => setSelectedStageTab(stg)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-colors ${
                selectedStageTab === stg
                  ? "bg-primary-600 text-white font-semibold shadow-xs"
                  : isCurrent
                  ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              <span>{stg}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    selectedStageTab === stg ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="space-y-2 py-4">
          <div className="h-14 w-full animate-pulse rounded-lg bg-neutral-100" />
          <div className="h-14 w-full animate-pulse rounded-lg bg-neutral-100" />
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
          <FolderOpen className="h-8 w-8 text-neutral-300 mb-2" />
          <p className="text-xs font-semibold text-neutral-700">
            No documents in {selectedStageTab === "ALL" ? "this opportunity" : `"${selectedStageTab}"`}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-400">
            Click "Upload to {selectedStageTab === "ALL" ? currentStage : selectedStageTab}" above to attach stage collateral.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {filteredAttachments.map((file) => {
            const displayName = file.displayName || file.file_name;
            const ext = displayName.split(".").pop()?.toUpperCase() || "FILE";
            const isPdf = ext === "PDF";
            const isImage = ["PNG", "JPG", "JPEG", "WEBP", "SVG"].includes(ext);

            return (
              <div
                key={file.name}
                className="group flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-3.5 shadow-2xs hover:border-primary-400 hover:shadow-xs transition-all"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                      isPdf
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : isImage
                        ? "bg-purple-50 text-purple-700 border border-purple-100"
                        : "bg-blue-50 text-blue-700 border border-blue-100"
                    }`}
                  >
                    {ext.slice(0, 4)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-neutral-900" title={displayName}>
                      {displayName}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-neutral-400">
                      {file.stage && (
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-semibold text-neutral-700">
                          {file.stage}
                        </span>
                      )}
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(file.creation).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-end gap-1 border-t border-neutral-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setPreviewDoc(file)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    Preview
                  </button>

                  <a
                    href={file.file_url}
                    download={displayName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary-600 hover:bg-primary-50 transition-colors"
                  >
                    <Download className="h-3 w-3" />
                    Download
                  </a>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(file)}
                    className="rounded-md p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-1"
                    title="Delete document from ERPNext"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Document"
        description={`Are you sure you want to permanently delete "${
          deleteTarget?.displayName || deleteTarget?.file_name
        }" from ERPNext? This action cannot be undone.`}
        confirmLabel="Delete Document"
        tone="danger"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
