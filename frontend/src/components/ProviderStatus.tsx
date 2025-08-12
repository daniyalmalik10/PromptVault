import { useEffect, useState } from "react";
import { type ProviderHealth, providersApi } from "../api/providers";

export function ProviderStatus() {
  const [statuses, setStatuses] = useState<ProviderHealth[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = () => {
      providersApi.health().then((data) => {
        if (!cancelled) setStatuses(data);
      });
    };

    fetch();
    const id = setInterval(fetch, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const dotColor = (s: ProviderHealth) => {
    if (s.status === "ok") return "bg-green-500";
    return "bg-red-500";
  };

  const dotTitle = (s: ProviderHealth) =>
    s.status === "ok"
      ? `${s.provider}: ok (${s.latency_ms} ms)`
      : `${s.provider}: error`;

  return (
    <div className="flex items-center gap-2">
      {statuses === null
        ? ["groq", "openrouter"].map((name) => (
            <span
              key={name}
              title={name}
              className="w-2.5 h-2.5 rounded-full bg-gray-300"
            />
          ))
        : statuses.map((s) => (
            <span
              key={s.provider}
              title={dotTitle(s)}
              className={`w-2.5 h-2.5 rounded-full ${dotColor(s)}`}
            />
          ))}
    </div>
  );
}
