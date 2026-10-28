import { useState, useEffect } from "react";
import {
  FileText,
  MessageSquare,
  Paperclip,
  Send,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  addCrmComment,
  getCrmAttachments,
  getCrmTimeline,
  type CrmAttachment,
  type CrmTimelineItem,
} from "../../api/crm";

interface Props {
  doctype: "Lead" | "Opportunity" | "Customer" | "Campaign" | "Contact" | "Address" | string;
  docname: string;
}

export default function CrmNotesAttachments({ doctype, docname }: Props) {
  const [activeTab, setActiveTab] = useState<"activity" | "files">("activity");
  const [timeline, setTimeline] = useState<CrmTimelineItem[]>([]);
  const [attachments, setAttachments] = useState<CrmAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tl, att] = await Promise.all([
        getCrmTimeline(doctype, docname),
        getCrmAttachments(doctype, docname),
      ]);
      setTimeline(tl);
      setAttachments(att);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [doctype, docname]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      await addCrmComment(doctype, docname, newComment.trim());
      setNewComment("");
      toast.success("Note added to timeline.");
      await loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not post note.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition-colors ${
            activeTab === "activity"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Timeline & Notes ({timeline.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("files")}
          className={`flex items-center gap-2 border-b-2 py-2.5 px-4 transition-colors ${
            activeTab === "files"
              ? "border-primary-600 text-primary-600"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Paperclip className="h-4 w-4" />
          Attachments ({attachments.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === "activity" ? (
          <div>
            {/* Add note input */}
            <form onSubmit={handleAddComment} className="mb-6">
              <div className="relative rounded-xl border border-neutral-200 bg-neutral-50/50 p-2 focus-within:border-primary-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-primary-500">
                <textarea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a note, comment or update on this record…"
                  className="w-full resize-none bg-transparent p-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none"
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newComment.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3" /> Post Note
                  </button>
                </div>
              </div>
            </form>

            {/* Timeline Stream */}
            {isLoading ? (
              <div className="space-y-3 py-4">
                <div className="h-12 w-full animate-pulse rounded-lg bg-neutral-100" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-neutral-100" />
              </div>
            ) : timeline.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No activity, notes or communications recorded yet.
              </div>
            ) : (
              <div className="space-y-4">
                {timeline.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 p-3.5 text-xs text-neutral-700"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-neutral-900">
                          {item.sender || "User"}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-neutral-400">
                          <Clock className="h-3 w-3" />
                          {new Date(item.date).toLocaleString()}
                        </span>
                      </div>
                      {item.subject && (
                        <div className="mt-1 font-medium text-neutral-800">
                          {item.subject}
                        </div>
                      )}
                      <div
                        className="mt-1.5 whitespace-pre-wrap text-neutral-600"
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            {isLoading ? (
              <div className="space-y-2 py-4">
                <div className="h-10 w-full animate-pulse rounded bg-neutral-100" />
              </div>
            ) : attachments.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No files or documents attached to this record.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {attachments.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-xs hover:border-primary-300"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="h-4 w-4 text-neutral-400" />
                      <span className="truncate font-medium text-neutral-800">
                        {file.file_name}
                      </span>
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
