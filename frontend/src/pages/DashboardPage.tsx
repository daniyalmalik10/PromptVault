import { useEffect, useState } from "react";
import { Navbar } from "../components/Navbar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type ExecutionStats, executionsApi } from "../api/executions";

type Window = "7d" | "30d";

export default function DashboardPage() {
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState<Window>("7d");

  useEffect(() => {
    executionsApi
      .stats()
      .then(setStats)
      .catch(() => setError("Failed to load stats."));
  }, []);

  if (error) return <p className="text-red-600 text-sm p-8">{error}</p>;
  if (!stats) return <p className="text-gray-400 text-sm p-8">Loading…</p>;

  const w = stats[window];
  const tokenData = Object.entries(w.tokens_by_provider).map(([provider, tokens]) => ({
    provider,
    tokens,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Navbar>
          <div className="flex rounded-md border border-gray-300 overflow-hidden text-sm">
            {(["7d", "30d"] as Window[]).map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                className={`px-4 py-1.5 ${
                  window === w
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {w === "7d" ? "Last 7 days" : "Last 30 days"}
              </button>
            ))}
          </div>
        </Navbar>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total executions" value={w.total_executions} />
          <KpiCard label="Success rate" value={`${(w.success_rate * 100).toFixed(1)}%`} />
          <KpiCard
            label="Avg latency"
            value={w.avg_latency_ms != null ? `${w.avg_latency_ms} ms` : "—"}
          />
          <KpiCard
            label="Total tokens"
            value={Object.values(w.tokens_by_provider).reduce((a, b) => a + b, 0)}
          />
        </div>

        {/* Executions over time */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Executions over time</h2>
          {w.executions_by_day.length === 0 ? (
            <p className="text-gray-400 text-sm">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={w.executions_by_day}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4f46e5"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Tokens by provider */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Tokens by provider</h2>
          {tokenData.every((d) => d.tokens === 0) ? (
            <p className="text-gray-400 text-sm">No token data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tokenData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="provider" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="tokens" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
