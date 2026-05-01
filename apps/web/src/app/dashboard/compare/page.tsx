"use client";

import { useEffect, useState } from "react";
import { env } from "@test-evals/env/web";
import { 
  ArrowLeft, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus,
  Zap
} from "lucide-react";
import Link from "next/link";

interface Run {
  id: string;
  strategy: string;
  model: string;
  aggregateF1: number;
  totalCost: string;
}

export default function ComparePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [runA, setRunA] = useState<string | null>(null);
  const [runB, setRunB] = useState<string | null>(null);
  const [dataA, setDataA] = useState<any>(null);
  const [dataB, setDataB] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchRuns() {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/runs`);
      const data = await res.json();
      setRuns(data);
    }
    fetchRuns();
  }, []);

  const handleCompare = async () => {
    if (!runA || !runB) return;
    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/runs/${runA}`),
        fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/runs/${runB}`)
      ]);
      setDataA(await resA.json());
      setDataB(await resB.json());
    } finally {
      setLoading(false);
    }
  };

  const fields = ["chief_complaint", "vitals", "medications", "diagnoses", "plan", "follow_up"];

  const getAvgFieldScore = (runData: any, field: string) => {
    if (!runData?.results || !Array.isArray(runData.results) || runData.results.length === 0) return 0;
    
    const scores = runData.results.map((r: any) => {
      const val = r?.scores?.[field];
      return typeof val === "number" && !isNaN(val) ? val : 0;
    });
    
    const validScores = scores.filter((s: number) => !isNaN(s));
    if (validScores.length === 0) return 0;
    
    const avg = validScores.reduce((a: number, b: number) => a + b, 0) / validScores.length;
    return isNaN(avg) ? 0 : avg;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft size={18} />
        Back to Dashboard
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Compare Evaluations</h1>
          <p className="text-gray-400 mt-1">Select two runs to compare per-field performance.</p>
        </div>
      </div>

      {/* Selection Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Run A (Baseline)</label>
          <select 
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setRunA(e.target.value)}
          >
            <option value="">Select a run...</option>
            {runs.map(r => <option key={r.id} value={r.id}>{r.strategy} ({r.model}) - {r.id.slice(0,8)}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400">Run B (Challenger)</label>
          <select 
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setRunB(e.target.value)}
          >
            <option value="">Select a run...</option>
            {runs.map(r => <option key={r.id} value={r.id}>{r.strategy} ({r.model}) - {r.id.slice(0,8)}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button 
            onClick={handleCompare}
            disabled={!runA || !runB || loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? "Comparing..." : <><Zap size={18} /> Compare Now</>}
          </button>
        </div>
      </div>

      {dataA && dataB && (
        <div className="space-y-12">
          {/* High Level Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ComparisonCard 
              label="Aggregate F1" 
              valA={dataA.aggregateF1} 
              valB={dataB.aggregateF1} 
              isPercent
            />
            <ComparisonCard 
              label="Total Cost" 
              valA={parseFloat(dataA.totalCost)} 
              valB={parseFloat(dataB.totalCost)} 
              inverse
              isCurrency
            />
            <ComparisonCard 
              label="Avg. Latency" 
              valA={dataA.durationMs / (dataA.results?.length || 1)} 
              valB={dataB.durationMs / (dataB.results?.length || 1)} 
              inverse
              suffix="ms"
            />
          </div>

          {/* Per-Field Comparison */}
          <div>
            <h2 className="text-xl font-bold text-white mb-6">Per-Field Breakdown</h2>
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-300">Field Name</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-300">Run A</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-300">Run B</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-300">Delta</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-300">Winner</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {fields.map(field => {
                    const scoreA = getAvgFieldScore(dataA, field);
                    const scoreB = getAvgFieldScore(dataB, field);
                    const delta = scoreB - scoreA;
                    return (
                      <tr key={field} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-white capitalize">{field.replace(/_/g, " ")}</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{(scoreA * 100).toFixed(1)}%</td>
                        <td className="px-6 py-4 text-sm text-gray-300">{(scoreB * 100).toFixed(1)}%</td>
                        <td className="px-6 py-4">
                          <div className={`flex items-center gap-1 text-sm font-medium ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-gray-500"}`}>
                            {delta > 0 ? <ArrowUpRight size={14} /> : delta < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                            {Math.abs(delta * 100).toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            delta > 0.01 ? "bg-green-900/30 text-green-400 border border-green-800/50" : 
                            delta < -0.01 ? "bg-blue-900/30 text-blue-400 border border-blue-800/50" : 
                            "bg-gray-800 text-gray-500"
                          }`}>
                            {delta > 0.01 ? "Run B" : delta < -0.01 ? "Run A" : "Draw"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ label, valA, valB, inverse, isPercent, isCurrency, suffix }: any) {
  const delta = valB - valA;
  const isBetter = inverse ? delta < 0 : delta > 0;
  const format = (v: number) => {
    if (isPercent) return `${(v * 100).toFixed(1)}%`;
    if (isCurrency) return `$${v.toFixed(4)}`;
    return `${v.toFixed(0)}${suffix || ""}`;
  };

  return (
    <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
      <p className="text-sm font-medium text-gray-400 mb-4">{label}</p>
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <div className="text-xs text-gray-500">Run A: {format(valA)}</div>
          <div className="text-2xl font-bold text-white">B: {format(valB)}</div>
        </div>
        <div className={`flex items-center gap-1 text-lg font-bold ${isBetter ? "text-green-400" : delta === 0 ? "text-gray-500" : "text-red-400"}`}>
          {delta > 0 ? <ArrowUpRight size={20} /> : delta < 0 ? <ArrowDownRight size={20} /> : <Minus size={20} />}
          {isPercent ? `${Math.abs(delta * 100).toFixed(1)}%` : ""}
        </div>
      </div>
    </div>
  );
}
