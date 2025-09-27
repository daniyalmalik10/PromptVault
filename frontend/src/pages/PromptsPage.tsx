import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "../components/Navbar";
import { ProviderStatus } from "../components/ProviderStatus";
import { usePrompts } from "../hooks/usePrompts";

export default function PromptsPage() {
  const { data, isLoading, error, page, setPage, setSearch } = usePrompts();
  const [searchInput, setSearchInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
      setSelectedTags(new Set());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, setSearch, setPage]);

  const allTags = [...new Set((data?.results ?? []).flatMap((p) => p.tags))];

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const displayed =
    selectedTags.size === 0
      ? (data?.results ?? [])
      : (data?.results ?? []).filter((p) => p.tags.some((t) => selectedTags.has(t)));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Navbar>
          <div className="flex items-center gap-4">
            <ProviderStatus />
            <Link
              to="/dashboard"
              className="text-sm text-gray-600 hover:text-indigo-600"
            >
              Dashboard
            </Link>
            <Link
              to="/prompts/new"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              New prompt
            </Link>
          </div>
        </Navbar>

        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search prompts…"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  selectedTags.has(tag)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {isLoading && <p className="text-gray-500 text-sm">Loading…</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        {!isLoading && !error && displayed.length === 0 && (
          <p className="text-gray-400 text-sm">No prompts found.</p>
        )}

        <ul className="space-y-3">
          {displayed.map((prompt) => (
            <li key={prompt.id}>
              <Link
                to={`/prompts/${prompt.id}`}
                className="block bg-white rounded-lg border border-gray-200 px-4 py-3 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-900">{prompt.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(prompt.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {prompt.content.slice(0, 100)}
                  {prompt.content.length > 100 ? "…" : ""}
                </p>
                {prompt.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
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
              </Link>
            </li>
          ))}
        </ul>

        {data && (data.previous || data.next) && (
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setPage(page - 1)}
              disabled={!data.previous}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 disabled:opacity-40 hover:border-indigo-400"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data.next}
              className="px-4 py-2 text-sm rounded-md border border-gray-300 disabled:opacity-40 hover:border-indigo-400"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
