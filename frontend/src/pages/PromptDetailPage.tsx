import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { promptsApi, type Prompt } from "../api/prompts";
import ExecutionHistory from "../components/ExecutionHistory";
import ExecutionPanel from "../components/ExecutionPanel";

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const promptId = parseInt(id ?? "", 10);

  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [executionRefreshTick, setExecutionRefreshTick] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTagsInput, setEditTagsInput] = useState("");

  useEffect(() => {
    if (isNaN(promptId)) {
      navigate("/prompts");
      return;
    }
    promptsApi
      .get(promptId)
      .then((res) => setPrompt(res.data))
      .catch(() => navigate("/prompts"))
      .finally(() => setIsLoading(false));
  }, [promptId, navigate]);

  const startEditing = () => {
    if (!prompt) return;
    setEditTitle(prompt.title);
    setEditContent(prompt.content);
    setEditTagsInput(prompt.tags.join(", "));
    setErrors({});
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setErrors({});
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;
    setErrors({});
    setIsSaving(true);
    const tags = editTagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const res = await promptsApi.update(prompt.id, {
        title: editTitle,
        content: editContent,
        tags,
      });
      setPrompt(res.data);
      setIsEditing(false);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      if (data && typeof data === "object") {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(data)) {
          mapped[k] = Array.isArray(v) ? v[0] : String(v);
        }
        setErrors(mapped);
      } else {
        setErrors({ non_field_errors: "Something went wrong. Please try again." });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!prompt) return;
    await promptsApi.remove(prompt.id);
    navigate("/prompts");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!prompt) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Navbar />
        <div className="flex items-center gap-3 mb-4">
          <Link to="/prompts" className="text-sm text-indigo-600 hover:underline">
            ← Back
          </Link>
        </div>

        {isEditing ? (
          <form
            onSubmit={handleSave}
            className="bg-white rounded-lg border border-gray-200 p-6 space-y-4"
          >
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                id="edit-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="edit-content" className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                id="edit-content"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                required
                rows={8}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errors.content && <p className="text-red-600 text-xs mt-1">{errors.content}</p>}
            </div>

            <div>
              <label htmlFor="edit-tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
              </label>
              <input
                id="edit-tags"
                type="text"
                value={editTagsInput}
                onChange={(e) => setEditTagsInput(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {errors.non_field_errors && (
              <p className="text-red-600 text-sm">{errors.non_field_errors}</p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={cancelEditing}
                className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-xl font-bold text-gray-900">{prompt.title}</h1>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={startEditing}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:border-indigo-400"
                >
                  Edit
                </button>
                {isDeleting ? (
                  <div className="flex gap-2">
                    <span className="text-sm text-gray-600 self-center">Delete?</span>
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setIsDeleting(false)}
                      className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsDeleting(true)}
                    className="px-3 py-1.5 text-sm rounded-md border border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {prompt.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {prompt.tags.map((t) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 rounded p-4">
              {prompt.content}
            </pre>

            <div className="mt-4 text-xs text-gray-400 flex gap-4">
              <span>Created {new Date(prompt.created_at).toLocaleString()}</span>
              <span>Updated {new Date(prompt.updated_at).toLocaleString()}</span>
            </div>
          </div>
        )}

        {!isEditing && prompt && (
          <>
            <ExecutionPanel
              promptId={prompt.id}
              onExecutionComplete={() => setExecutionRefreshTick((t) => t + 1)}
            />
            <div className="mt-4">
              <ExecutionHistory promptId={prompt.id} refreshTick={executionRefreshTick} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
