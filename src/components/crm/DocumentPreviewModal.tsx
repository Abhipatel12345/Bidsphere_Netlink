import { X, Download, FileText, AlertCircle } from "lucide-react";
import type { CrmAttachment } from "../../api/crm";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: CrmAttachment | null;
}

export default function DocumentPreviewModal({ isOpen, onClose, document }: Props) {
  if (!isOpen || !document) return null;

  const fileName = document.displayName || document.file_name;
  const fileUrl = document.file_url;
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const isPdf = ext === "pdf";
  const isImage = ["png", "jpg", "jpeg", "webp", "svg", "gif"].includes(ext);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200 bg-neutral-50/80">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-neutral-900 truncate" title={fileName}>
                {fileName}
              </h3>
              <p className="text-[11px] text-neutral-500">
                {document.stage ? (
                  <span className="font-semibold text-primary-700">{document.stage} • </span>
                ) : null}
                {formatFileSize(document.file_size)}
                {document.creation && ` • Uploaded ${new Date(document.creation).toLocaleDateString()}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs hover:bg-neutral-50"
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </a>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 overflow-auto bg-neutral-900/5 p-4 flex items-center justify-center min-h-[350px]">
          {isPdf ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[72vh] rounded-xl border border-neutral-200 bg-white shadow-xs"
            />
          ) : isImage ? (
            <div className="flex items-center justify-center p-2">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-h-[72vh] max-w-full rounded-xl object-contain shadow-md bg-white border border-neutral-200"
              />
            </div>
          ) : (
            <div className="max-w-md rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-neutral-900">Preview Not Supported</h4>
              <p className="mt-1 text-xs text-neutral-500">
                Direct browser preview is not available for this file extension (.
                {ext.toUpperCase() || "FILE"}). You can securely download the document to view it on your computer.
              </p>
              <div className="mt-4 flex justify-center">
                <a
                  href={fileUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
                >
                  <Download className="h-4 w-4" /> Download {fileName}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
