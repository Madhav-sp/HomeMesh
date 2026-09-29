import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";
import {
  Cpu,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  RefreshCw,
} from "lucide-react";

type DeviceOption = {
  id: string;
  name: string;
  status: string;
};

type ComputeJobItem = {
  id: string;
  target_device_id: string;
  target_device_name: string;
  job_type: string;
  payload: string | null;
  status: "pending" | "running" | "completed" | "failed";
  result: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

export default function Compute() {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [jobType, setJobType] = useState<string>("ping");
  const [primeN, setPrimeN] = useState<number>(100000);
  const [hashText, setHashText] = useState<string>("HomeMesh AI Node Test");
  const [hashAlgo, setHashAlgo] = useState<string>("sha256");

  const [jobs, setJobs] = useState<ComputeJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await api.get("/api/v1/devices");
        setDevices(res.data);
        const onlineDev = res.data.find((d: DeviceOption) => d.status === "online");
        if (onlineDev) {
          setSelectedDeviceId(onlineDev.id);
        } else if (res.data.length > 0) {
          setSelectedDeviceId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load devices", err);
      }
    }
    loadDevices();
  }, []);

  useEffect(() => {
    async function loadJobs() {
      try {
        const res = await api.get("/api/v1/compute/jobs");
        setJobs(res.data);
      } catch (err) {
        console.error("Failed to load compute jobs", err);
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
    const interval = setInterval(loadJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  async function handleDispatchJob(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDeviceId) {
      alert("Please select a target device.");
      return;
    }

    let payload: any = {};
    if (jobType === "prime_count") {
      payload = { n: primeN };
    } else if (jobType === "hash_calc") {
      payload = { text: hashText, algo: hashAlgo };
    }

    setSubmitting(true);
    try {
      await api.post("/api/v1/compute/jobs", {
        target_device_id: selectedDeviceId,
        job_type: jobType,
        payload: payload,
      });

      const res = await api.get("/api/v1/compute/jobs");
      setJobs(res.data);
    } catch (err: any) {
      console.error("Failed to submit compute job", err);
      alert(err.response?.data?.detail || "Failed to submit compute job.");
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusBadge = (status: ComputeJobItem["status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "running":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-medium text-blue-400 animate-pulse">
            <Zap className="h-3 w-3 text-blue-400" />
            Executing...
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Queued
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-400">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
    }
  };

  const formatResult = (resultStr: string | null) => {
    if (!resultStr) return null;
    try {
      const parsed = JSON.parse(resultStr);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return resultStr;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-100">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 md:ml-64">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Distributed Compute Nodes</h1>
            <p className="mt-1 text-xs text-slate-400">
              Dispatch compute jobs, system tasks, and benchmark algorithms to connected HomeMesh agents.
            </p>
          </div>

          {/* Job Submission Form */}
          <div className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-400" />
              <h2 className="text-base font-semibold text-white">Dispatch New Compute Job</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">Select an online device and set execution parameters.</p>

            <form onSubmit={handleDispatchJob} className="mt-6 space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Device Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Target Device</label>
                  <select
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                  >
                    <option value="" disabled>Select Device</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.name} ({device.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Job Type */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">Job Type</label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-slate-100 outline-none focus:border-blue-500"
                  >
                    <option value="ping">Ping & Latency Check</option>
                    <option value="system_info">System & Hardware Probe</option>
                    <option value="prime_count">Prime Sieve Benchmark (CPU)</option>
                    <option value="hash_calc">Cryptographic Hash Calculation</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Job Parameters */}
              {jobType === "prime_count" && (
                <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
                  <label className="block text-xs font-medium text-slate-300">Count primes up to N:</label>
                  <input
                    type="number"
                    value={primeN}
                    onChange={(e) => setPrimeN(Number(e.target.value))}
                    min={100}
                    max={10000000}
                    className="mt-1.5 w-full max-w-xs rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {jobType === "hash_calc" && (
                <div className="grid gap-4 rounded-lg bg-slate-900 p-4 border border-slate-800 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300">Input Text:</label>
                    <input
                      type="text"
                      value={hashText}
                      onChange={(e) => setHashText(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300">Algorithm:</label>
                    <select
                      value={hashAlgo}
                      onChange={(e) => setHashAlgo(e.target.value)}
                      className="mt-1.5 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-blue-500"
                    >
                      <option value="sha256">SHA-256</option>
                      <option value="sha512">SHA-512</option>
                      <option value="md5">MD5</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedDeviceId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Dispatch Compute Job
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Job History */}
          <div className="mt-10">
            <h2 className="text-base font-bold text-white tracking-tight">Execution History</h2>
            <p className="mt-0.5 text-xs text-slate-400">Real-time compute results and execution logs</p>

            {loading ? (
              <div className="mt-6 flex h-48 items-center justify-center rounded-xl border border-slate-800 bg-[#151c28]">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                  Loading job history...
                </div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="mt-6 rounded-xl border border-slate-800 bg-[#151c28] p-8 text-center">
                <Terminal className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-2 text-xs text-slate-400">No compute jobs dispatched yet.</p>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-slate-800 bg-[#151c28] p-4 transition-colors hover:border-slate-700"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-blue-400 border border-slate-700">
                          <Cpu className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-white">
                            Job: <span className="font-mono text-blue-400">{job.job_type}</span>
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            Node: {job.target_device_name} · Created: {new Date(job.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {getStatusBadge(job.status)}
                      </div>
                    </div>

                    {/* Result output */}
                    {job.result && (
                      <div className="mt-3 rounded-lg bg-slate-950 p-3 text-xs border border-slate-800">
                        <p className="mb-1 text-[10px] uppercase font-medium tracking-wider text-slate-400">Output Result:</p>
                        <pre className="overflow-x-auto font-mono text-emerald-400 text-xs leading-relaxed">
                          {formatResult(job.result)}
                        </pre>
                      </div>
                    )}

                    {job.error_message && (
                      <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
                        <p className="font-semibold">Execution Failure:</p>
                        <p className="mt-0.5">{job.error_message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

