import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";
import {
  ArrowRightLeft,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  Filter,
} from "lucide-react";

type DeviceOption = {
  id: string;
  name: string;
};

type TransferItem = {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string | null;
  target_device_id: string;
  target_device_name: string;
  status: "pending" | "transferring" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Files() {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await api.get("/api/v1/devices");
        setDevices(res.data);
      } catch (err) {
        console.error("Failed to load devices", err);
      }
    }
    loadDevices();
  }, []);

  useEffect(() => {
    async function loadTransfers() {
      setLoading(true);
      try {
        const url = selectedDeviceId
          ? `/api/v1/transfers?device_id=${selectedDeviceId}`
          : "/api/v1/transfers";
        const res = await api.get(url);
        setTransfers(res.data);
      } catch (err) {
        console.error("Failed to load transfers", err);
      } finally {
        setLoading(false);
      }
    }
    loadTransfers();
    const interval = setInterval(loadTransfers, 5000);
    return () => clearInterval(interval);
  }, [selectedDeviceId]);

  const getStatusBadge = (status: TransferItem["status"]) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "transferring":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-medium text-blue-400 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Transferring
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Pending Agent
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

  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-100">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 md:ml-64">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Device Transfers</h1>
              <p className="mt-1 text-xs text-slate-400">
                Track and manage files transferred to connected HomeMesh devices.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
                >
                  <option value="">All Target Devices</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>

              <Link
                to="/upload"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-500 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                Transfer New File
              </Link>
            </div>
          </div>

          {/* Transfers Table / List */}
          {loading ? (
            <div className="mt-8 flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-[#151c28]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                Loading transfer logs...
              </div>
            </div>
          ) : transfers.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">No File Transfers Found</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                No files have been sent to devices yet. Click "Transfer New File" to send a file to an agent.
              </p>
              <Link
                to="/upload"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Upload File to Device
              </Link>
            </div>
          ) : (
            <div className="mt-8 overflow-hidden rounded-xl border border-slate-800 bg-[#151c28] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">File Name</th>
                      <th className="px-5 py-3.5 font-semibold">Target Device</th>
                      <th className="px-5 py-3.5 font-semibold">Size</th>
                      <th className="px-5 py-3.5 font-semibold">Status</th>
                      <th className="px-5 py-3.5 font-semibold">Date Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transfers.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-blue-400 border border-slate-700/60">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate max-w-xs text-xs font-semibold text-white">{item.file_name}</p>
                              {item.error_message && (
                                <p className="text-[11px] text-red-400">{item.error_message}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-300 font-medium">
                          {item.target_device_name}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                          {formatBytes(item.file_size)}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 whitespace-nowrap">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

