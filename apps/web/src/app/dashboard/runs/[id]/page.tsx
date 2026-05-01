"use client";

import { useEffect, useState, use } from "react";
import { env } from "@test-evals/env/web";
import { 
  ArrowLeft, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Code2,
  FileText,
  Filter
} from "lucide-react";
import Link from "next/link";

interface Result {
  id: string;
  transcriptId: string;
  prediction: any;
  gold: any;
  scores: Record<string, number>;
  isSchemaValid: boolean;
  isHallucinated: boolean;
  latencyMs: number;
  tokensInput: number;
  tokensOutput: number;
  retries: number;
}

interface Run {
  id: string;
  strategy: string;
  model: string;
  aggregateF1: number;
  results: Result[];
}

export default function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [run, setRun] = useState<Run | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "fail" | "hallucinated">("all");

  useEffect(() => {
    async function fetchRun() {
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/runs/${resolvedParams.id}`);
        const data = await res.json();
        setRun(data);
      } catch (err) {
        console.error("Failed to fetch run:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRun();
  }, [resolvedParams.id]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading details...</div>;
  if (!run) return <div className="p-8 text-center text-red-500">Run not found.</div>;

  const filteredResults = run.results.filter(r => {
    if (filter === "fail") return !r.isSchemaValid || Object.values(r.scores).some(s => s < 0.7);
    if (filter === "hallucinated") return r.isHallucinated;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>

      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-white">Run Details</h1>
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">
              {run.strategy}
            </span>
          </div>
          <p className="text-gray-400">Model: {run.model} • ID: {run.id}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Aggregate F1 Score</p>
          <p className="text-4xl font-bold text-green-500">{(run.aggregateF1 * 100).toFixed(1)}%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        {[
          { id: "all", label: "All Cases", count: run.results.length },
          { id: "fail", label: "Low Performance", count: run.results.filter(r => !r.isSchemaValid || Object.values(r.scores).some(s => s < 0.7)).length },
          { id: "hallucinated", label: "Hallucinations", count: run.results.filter(r => r.isHallucinated).length },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              filter === f.id 
                ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/20" 
                : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Results Table */}
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-sm font-semibold text-gray-300">Transcript ID</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-300">Overall Score</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-300">Retries</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-300">Tokens</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-300">Flags</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-300"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredResults.map((result) => {
              const scoreValues = Object.values(result.scores);
              const avgScore = scoreValues.length > 0 
                ? scoreValues.reduce((a, b) => a + (b as number), 0) / scoreValues.length 
                : 0;
              return (
                <tr key={result.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-sm text-white font-medium">{result.transcriptId}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${avgScore > 0.8 ? "bg-green-500" : avgScore > 0.6 ? "bg-yellow-500" : "bg-red-500"}`} 
                          style={{ width: `${avgScore * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-300">{(avgScore * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{result.retries}</td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    <div>In: {result.tokensInput}</div>
                    <div>Out: {result.tokensOutput}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {!result.isSchemaValid && <span title="Schema Invalid"><AlertTriangle size={16} className="text-red-500" /></span>}
                      {result.isHallucinated && <span title="Hallucination Detected"><AlertTriangle size={16} className="text-yellow-500" /></span>}
                      {result.isSchemaValid && !result.isHallucinated && <CheckCircle2 size={16} className="text-emerald-500" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-white/10 rounded-lg inline-flex items-center text-blue-400 hover:text-blue-300 transition-all gap-2 text-sm font-medium">
                      Inspect
                      <ExternalLink size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
