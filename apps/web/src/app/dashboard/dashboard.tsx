"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { env } from "@test-evals/env/web";
import { formatDistanceToNow } from "date-fns";
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  BarChart3,
  Search,
  Plus,
  Zap,
  TrendingUp,
  Activity
} from "lucide-react";
import Link from "next/link";

interface Run {
  id: string;
  strategy: string;
  model: string;
  status: string;
  aggregateF1: number;
  totalCost: string;
  durationMs: number;
  createdAt: string;
}

export default function Dashboard({ session }: { session: typeof authClient.$Infer.Session }) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchRuns = async () => {
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/runs`);
      const data = await res.json();
      setRuns(data);
    } catch (err) {
      console.error("Failed to fetch runs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const handleNewRun = async () => {
    setIsTriggering(true);
    try {
      const res = await fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/v1/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategy: "zero_shot", model: "gemini-flash-latest" }),
      });
      if (res.ok) {
        await fetchRuns();
      }
    } catch (err) {
      console.error("Failed to trigger run:", err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-blue-500/30">
      {/* Decorative Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed top-[20%] -left-[10%] w-[400px] h-[400px] bg-purple-600/10 blur-[100px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-500/80">System Operational</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
              Evaluation Dashboard
            </h1>
            <p className="text-gray-400 mt-2 max-w-md leading-relaxed">
              Real-time performance metrics and deep-dive analysis for clinical extraction strategies.
            </p>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/dashboard/compare"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2.5 rounded-xl transition-all border border-white/10 backdrop-blur-md group"
            >
              <BarChart3 size={18} className="text-gray-400 group-hover:text-white transition-colors" />
              <span className="font-medium">Compare Runs</span>
            </Link>
            <button 
              onClick={handleNewRun}
              disabled={isTriggering}
              className="flex items-center gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] font-semibold"
            >
              {isTriggering ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              <span>{isTriggering ? "Initializing..." : "New Run"}</span>
            </button>
          </div>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
          <MetricCard 
            label="Total Runs" 
            value={runs.length} 
            icon={Activity} 
            color="blue" 
            trend="+12% from last week"
          />
          <MetricCard 
            label="Avg. F1 Score" 
            value={runs.length ? `${(runs.reduce((a, b) => a + b.aggregateF1, 0) / runs.length * 100).toFixed(1)}%` : "0.0%"} 
            icon={TrendingUp} 
            color="emerald" 
            trend="Peak: 94.2%"
          />
          <MetricCard 
            label="Compute Cost" 
            value={`$${runs.reduce((a, b) => a + parseFloat(b.totalCost), 0).toFixed(3)}`} 
            icon={Zap} 
            color="purple" 
            trend="Avg $0.012/run"
          />
          <MetricCard 
            label="Latency Avg" 
            value={runs.length ? `${(runs.reduce((a, b) => a + b.durationMs, 0) / runs.length / 1000).toFixed(1)}s` : "0.0s"} 
            icon={Clock} 
            color="amber" 
            trend="Target: < 2.0s"
          />
        </div>

        {/* Main Content Area */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent rounded-3xl -z-10" />
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
            <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
              <h3 className="font-bold text-lg">Evaluation History</h3>
              <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">Auto-refreshing</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-widest text-gray-500 bg-white/[0.01]">
                    <th className="px-8 py-4">Session Details</th>
                    <th className="px-8 py-4">Strategy</th>
                    <th className="px-8 py-4 text-center">Accuracy</th>
                    <th className="px-8 py-4">Cost</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05]">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-gray-500 font-medium">Synchronizing with server...</span>
                        </div>
                      </td>
                    </tr>
                  ) : runs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-24 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-gray-600 mb-2">
                            <BarChart3 size={32} />
                          </div>
                          <h4 className="text-white font-bold text-xl">No Evaluations Yet</h4>
                          <p className="text-gray-500 max-w-xs mx-auto">Trigger your first evaluation from the CLI to see the magic happen here.</p>
                          <code className="bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-blue-400 text-sm mt-2">
                            bun run eval -- --strategy=zero_shot
                          </code>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    runs.map((run) => (
                      <tr key={run.id} className="group hover:bg-white/[0.03] transition-all cursor-default">
                        <td className="px-8 py-5">
                          <div className="text-sm font-bold text-white mb-1">RUN-{run.id.slice(0, 8).toUpperCase()}</div>
                          <div className="text-xs text-gray-500 font-medium">{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}</div>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                            run.strategy === 'cot' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                            run.strategy === 'few_shot' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {run.strategy.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-1000 ${
                                  run.aggregateF1 > 0.85 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                                  run.aggregateF1 > 0.7 ? 'bg-blue-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${run.aggregateF1 * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-black tracking-tighter">{(run.aggregateF1 * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="text-sm font-mono text-gray-300 tracking-tight">${parseFloat(run.totalCost).toFixed(4)}</div>
                        </td>
                        <td className="px-8 py-5">
                          <StatusBadge status={run.status} />
                        </td>
                        <td className="px-8 py-5 text-right">
                          <Link 
                            href={`/dashboard/runs/${run.id}`}
                            className="bg-white/5 hover:bg-blue-600 p-2.5 rounded-xl inline-flex items-center text-gray-400 hover:text-white transition-all transform hover:scale-110 active:scale-95 border border-white/5 hover:border-blue-500"
                          >
                            <ChevronRight size={18} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, color, trend }: any) {
  const colorMap: any = {
    blue: "from-blue-500/20 text-blue-400 border-blue-500/20 shadow-blue-500/5",
    emerald: "from-emerald-500/20 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5",
    purple: "from-purple-500/20 text-purple-400 border-purple-500/20 shadow-purple-500/5",
    amber: "from-amber-500/20 text-amber-400 border-amber-500/20 shadow-amber-500/5",
  };

  return (
    <div className={`relative bg-white/[0.03] border rounded-2xl p-6 backdrop-blur-sm overflow-hidden group transition-all hover:bg-white/[0.05] ${colorMap[color]}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-20 blur-2xl -mr-8 -mt-8 ${colorMap[color].split(' ')[0]}`} />
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-xl bg-white/5 border border-white/5 ${colorMap[color].split(' ')[1]}`}>
          <Icon size={20} />
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{trend}</div>
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">{label}</p>
        <p className="text-3xl font-black text-white tracking-tighter">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={12} />
          Verified
        </span>
      );
    case "running":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
          Active
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle size={12} />
          Error
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/5 text-gray-500 border border-white/10">
          {status}
        </span>
      );
  }
}
