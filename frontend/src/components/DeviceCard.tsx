import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddDeviceModal from "./AddDeviceModal";
import { api } from "../api/client";
import {
  Laptop,
  Monitor,
  Server,
  AlertTriangle,
  Cpu,
  Activity,
  HardDrive,
  Trash2,
  ChevronRight,
} from "lucide-react";

type Device = {
  id: string;
  name: string;
  hostname: string | null;
  os: string | null;
  agent_version?: string | null;
  status: string;
  last_seen: string | null;
  latest_metrics?: {
    cpu_percent: number | null;
    memory_percent: number | null;
    disk_percent: number | null;
  } | null;
};

type Props = {
  device: Device;
};

function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Never";

  const diff = Math.floor(
    (Date.now() - new Date(lastSeen).getTime()) / 1000
  );

  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff} seconds ago`;

  const minutes = Math.floor(diff / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getMetricColor(value: number, isAlert: boolean): string {
  if (isAlert) return "#f59e0b";
  if (value > 75) return "#3b82f6";
  return "#10b981";
}

function getDeviceIcon(os: string | null) {
  const osLower = (os || "").toLowerCase();
  if (osLower.includes("windows") || osLower.includes("mac") || osLower.includes("darwin")) {
    return <Laptop className="h-5 w-5" />;
  }
  if (osLower.includes("linux") || osLower.includes("ubuntu")) {
    return <Server className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}

export default function DeviceCard({ device }: Props) {
  const navigate = useNavigate();

  const [showPairModal, setShowPairModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPending = device.status === "pending";
  const isOnline = device.status === "online";
  const isOffline = device.status === "offline";

  const cpu = device.latest_metrics?.cpu_percent;
  const memory = device.latest_metrics?.memory_percent;
  const disk = device.latest_metrics?.disk_percent;

  const highCpu = cpu !== null && cpu !== undefined && cpu >= 80;
  const highMemory = memory !== null && memory !== undefined && memory >= 80;
  const criticalDisk = disk !== null && disk !== undefined && disk >= 90;

  const hasAlert = highCpu || highMemory || criticalDisk;

  async function handleDelete(event: React.MouseEvent) {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Are you sure you want to remove "${device.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await api.delete(
        `/api/v1/devices/${device.id}`
      );

      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Unable to remove device.");
      setDeleting(false);
    }
  }

  function openDetails() {
    navigate(`/devices/${device.id}`);
  }

  return (
    <>
      <div
        onClick={openDetails}
        className="glass-card glass-card-hover group cursor-pointer rounded-xl p-5 transition-all duration-200 animate-fadeIn"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg border ${
                isOnline
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : isOffline
                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
              }`}
            >
              {getDeviceIcon(device.os)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                  {device.name}
                </h2>
                <ChevronRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
              </div>

              <p className="mt-0.5 text-xs text-slate-400">
                {device.hostname || "Waiting for agent pairing"}
              </p>
            </div>
          </div>

          <span
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium border ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : isOffline
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isOnline
                  ? "bg-emerald-400 animate-pulse"
                  : isOffline
                  ? "bg-red-400"
                  : "bg-amber-400"
              }`}
            />
            {isPending && "Pending"}
            {isOnline && "Online"}
            {isOffline && "Offline"}
          </span>
        </div>

        {/* Pending */}
        {isPending ? (
          <div className="mt-5">
            <p className="text-xs text-slate-400">
              This device has not been paired yet.
            </p>

            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowPairModal(true);
              }}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-500"
            >
              Pair Device
            </button>
          </div>
        ) : (
          <>
            {/* Alerts */}
            {hasAlert && (
              <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Resource Alert
                </div>

                <div className="mt-1 space-y-0.5 text-[11px] text-slate-300">
                  {highCpu && (
                    <p>CPU usage is high ({cpu?.toFixed(1)}%)</p>
                  )}
                  {highMemory && (
                    <p>Memory usage is high ({memory?.toFixed(1)}%)</p>
                  )}
                  {criticalDisk && (
                    <p>Disk usage is critical ({disk?.toFixed(1)}%)</p>
                  )}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <MetricBar
                label="CPU"
                icon={<Cpu className="h-3 w-3 text-slate-400" />}
                value={cpu}
                suffix="%"
                alert={highCpu}
              />

              <MetricBar
                label="Memory"
                icon={<Activity className="h-3 w-3 text-slate-400" />}
                value={memory}
                suffix="%"
                alert={highMemory}
              />

              <MetricBar
                label="Disk"
                icon={<HardDrive className="h-3 w-3 text-slate-400" />}
                value={disk}
                suffix="%"
                alert={criticalDisk}
              />
            </div>

            {/* Info & Footer Actions */}
            <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
              <span className="truncate max-w-[140px]">{device.os || "Unknown OS"}</span>

              <div className="flex items-center gap-3">
                <span>{formatLastSeen(device.last_seen)}</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Remove device"
                  className="rounded p-1 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Pairing Modal */}
      {showPairModal && (
        <AddDeviceModal
          deviceId={device.id}
          onClose={() => setShowPairModal(false)}
        />
      )}
    </>
  );
}

type MetricBarProps = {
  label: string;
  icon?: React.ReactNode;
  value: number | null | undefined;
  suffix: string;
  alert?: boolean;
};

function MetricBar({
  label,
  icon,
  value,
  suffix,
  alert = false,
}: MetricBarProps) {
  const safeValue = value !== null && value !== undefined ? value : 0;
  const hasValue = value !== null && value !== undefined;
  const color = getMetricColor(safeValue, alert);

  return (
    <div className="rounded-lg bg-slate-900/60 border border-slate-800/60 p-2.5">
      <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-slate-400">
        <span>{label}</span>
        {icon}
      </div>

      <p className={`mt-1 text-base font-bold ${alert ? "text-amber-400" : "text-slate-100"}`}>
        {hasValue ? `${safeValue.toFixed(1)}${suffix}` : "—"}
      </p>

      {/* Progress bar */}
      {hasValue && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(safeValue, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      )}
    </div>
  );
}