import { useState, useRef, useEffect } from "react";
import {
  X,
  ArrowRight,
  UploadCloud,
  FileText,
  AlertCircle,
  Loader2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Opportunity } from "../../types/crm";
import {
  advanceOpportunityStage,
  uploadCrmFile,
  type CrmAttachment,
} from "../../api/crm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity;
  currentStage: string;
  nextStage: string;
  onSuccess: (updatedOpp: Opportunity) => void;
}

export default function OpportunityStageTransitionModal({
  isOpen,
  onClose,
  opportunity,
  currentStage,
  nextStage,
  onSuccess,
}: Props) {
  // All hooks MUST be declared unconditionally at the top level
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  // Reset modal state cleanly whenever it is opened or closed
  useEffect(() => {
    if (isOpen) {
      setNote("");
      setFiles([]);
      setIsSubmitting(false);
      setErrorMessage(null);
      setUploadProgressText("");
      submittingRef.current = false;
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || isSubmitting) {
      return;
    }

    setErrorMessage(null);

    const cleanNote = note.trim();
    if (!cleanNote) {
      setErrorMessage("Please enter a mandatory transition note describing progress or reason to advance.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 1. Upload any selected stage documents
      const uploadedAttachments: CrmAttachment[] = [];
      if (files.length > 0) {
        setUploadProgressText(`Uploading ${files.length} document(s) to ERPNext…`);
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          setUploadProgressText(`Uploading ${file.name} (${i + 1}/${files.length})…`);
          const uploaded = await uploadCrmFile(file, "Opportunity", opportunity.name, nextStage);
          uploadedAttachments.push(uploaded);
        }
      }

      // 2. Advance Opportunity stage and persist notes & history in ERPNext
      setUploadProgressText(`Saving stage transition to "${nextStage}" in ERPNext…`);
      const updated = await advanceOpportunityStage({
        opportunityName: opportunity.name,
        fromStage: currentStage,
        toStage: nextStage,
        note: cleanNote,
        uploadedFiles: uploadedAttachments,
        user: "CRM Manager",
      });

      toast.success(`Deal successfully advanced to "${nextStage}"!`);
      onSuccess(updated);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to advance stage in ERPNext.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
      setUploadProgressText("");
    }
  };

  // Conditional return strictly after ALL hooks have been registered
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50/80">
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Advance Opportunity Stage
            </h2>
            <p className="text-xs text-neutral-500">
              {opportunity.name} • {opportunity.party_name}
            </p>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stage Progression Flow Banner */}
          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Current Stage
              </span>
              <p className="mt-0.5 text-xs font-bold text-neutral-900 truncate">
                {currentStage}
              </p>
            </div>

            <div className="px-3 text-blue-500">
              <ArrowRight className="h-5 w-5" />
            </div>

            <div className="flex-1 text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary-700">
                Proposed Next Stage
              </span>
              <p className="mt-0.5 text-xs font-bold text-primary-800 truncate">
                {nextStage}
              </p>
            </div>
          </div>

          {/* Validation Error Alert */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Mandatory Transition Note */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-neutral-900">
                Stage Transition Note <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-neutral-400">
                Mandatory for audit trail
              </span>
            </div>
            <textarea
              rows={4}
              required
              value={note}
              disabled={isSubmitting}
              onChange={(e) => {
                setNote(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder="Detail the work completed, qualification findings, prospect feedback, scope agreement, or reasons this deal is ready to advance to the next stage…"
              className={`w-full rounded-xl border p-3 text-xs text-neutral-900 placeholder-neutral-400 shadow-2xs focus:bg-white focus:outline-none ${
                errorMessage && !note.trim()
                  ? "border-red-400 bg-red-50/20 focus:border-red-500"
                  : "border-neutral-300 bg-neutral-50/50 focus:border-primary-500"
              }`}
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              This note will be permanently recorded in the Opportunity timeline and CRM Note history.
            </p>
          </div>

          {/* Stage Documents Upload Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-neutral-900">
                Stage Supporting Documents <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <span className="text-[11px] text-neutral-400">
                Tagged under "{nextStage}"
              </span>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => !isSubmitting && fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/60 p-5 text-center transition-all ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary-400 hover:bg-primary-50/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                disabled={isSubmitting}
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-700 mb-2">
                <UploadCloud className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-neutral-800">
                Click to browse documents or drag & drop files here
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Supports PDF, Images (PNG, JPG), Word, Excel up to 10MB each
              </p>
            </div>

            {/* Selected files preview */}
            {files.length > 0 && (
              <div className="mt-3 space-y-2">
                <span className="text-[11px] font-semibold text-neutral-600">
                  Selected for upload ({files.length}):
                </span>
                <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-neutral-50/40 overflow-hidden">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="h-4 w-4 shrink-0 text-primary-600" />
                        <span className="truncate font-medium text-neutral-800">
                          {file.name}
                        </span>
                        <span className="text-[11px] text-neutral-400 shrink-0">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleRemoveFile(idx)}
                        className="rounded p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Upload / Transition progress message */}
          {isSubmitting && uploadProgressText && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
              <span className="font-semibold">{uploadProgressText}</span>
            </div>
          )}

          {/* Governance Notice */}
          <div className="flex items-center gap-2 rounded-lg bg-neutral-100/70 p-2.5 text-[11px] text-neutral-600">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Stage advancement strictly follows the configured canonical sales sequence and enforces backend ERPNext confirmation.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !note.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Advancing…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm & Advance to {nextStage}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
