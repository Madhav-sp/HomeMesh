import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import MetricCharts from "../components/MetricCharts";
import {
  ArrowLeft,
  Trash2,
  Cpu,
  HardDrive,
  Image as ImageIcon,
  X,
  Activity,
} from "lucide-react";

function PhotoImage({
  imageUrl,
  fileName,
}: {
  imageUrl: string;
  fileName: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadImage = async () => {
      try {
        const response = await api.get(
          imageUrl,
          {
            responseType: "blob",
          }
        );

        objectUrl = URL.createObjectURL(
          response.data
        );

        setSrc(objectUrl);
      } catch (error) {
        console.error(
          "Failed to load image:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-slate-900">
        <span className="text-xs text-slate-500">
          Loading...
        </span>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-slate-900 text-slate-600">
        <ImageIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={fileName}
      className="h-48 w-full object-cover rounded-lg"
    />
  );
}

type StoragePartition = {
  mount_point: string;
  filesystem: string | null;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
};

type DevicePhoto = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  modified_at: string | null;
  created_at: string;
  uploaded: boolean;
  image_url: string | null;
};

type Device = {
  id: string;
  name: string;
  hostname: string | null;
  os: string | null;
  agent_version: string | null;
  status: string;
  last_seen: string | null;

  latest_metrics: {
    cpu_percent: number | null;
    cpu_cores: number | null;
    cpu_threads: number | null;
    cpu_frequency_mhz: number | null;

    memory_percent: number | null;
    memory_used: number | null;
    memory_total: number | null;

    disk_percent: number | null;
    disk_used: number | null;
    disk_total: number | null;

    uptime_seconds: number | null;
    created_at: string | null;
  } | null;

  storage?: StoragePartition[];
};

type HistoricalMetric = {
  cpu_percent: number | null;
  memory_percent: number | null;
  disk_percent: number | null;
  created_at: string;
};

export default function DeviceDetails() {
  const { deviceId } = useParams();
  const navigate = useNavigate();

  const [device, setDevice] = useState<Device | null>(null);
  const [history, setHistory] = useState<HistoricalMetric[]>([]);
  const [photos, setPhotos] = useState<DevicePhoto[]>([]);
  const [historyRange, setHistoryRange] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<DevicePhoto | null>(null);

  useEffect(() => {
    if (!deviceId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadDevice = async () => {
      try {
        const response = await api.get(
          `/api/v1/devices/${deviceId}`
        );

        const historyResponse = await api.get(
          `/api/v1/devices/${deviceId}/metrics/history`,
          {
            params: {
              minutes: historyRange,
            },
          }
        );

        const photosResponse = await api.get(
          `/api/v1/devices/${deviceId}/photos`
        );

        if (mounted) {
          setDevice(response.data);
          setHistory(historyResponse.data);
          setPhotos(photosResponse.data);
          setError("");
        }
      } catch (error) {
        console.error(error);

        if (mounted) {
          setError("Unable to load device.");
          setDevice(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDevice();

    const interval = window.setInterval(
      loadDevice,
      10_000
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [deviceId, historyRange]);

  async function handleDelete() {
    if (!deviceId || !device) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove "${device.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeleting(true);

      await api.delete(
        `/api/v1/devices/${deviceId}`
      );

      navigate("/");
    } catch (error) {
      console.error(error);
      alert("Unable to remove device.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] p-10 text-slate-400 text-xs">
        Loading device parameters...
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen bg-[#0b0f17] p-10 text-slate-100">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to devices
        </Link>

        <p className="mt-8 text-xs text-red-400">
          {error || "Device not found."}
        </p>
      </div>
    );
  }

  const metrics = device.latest_metrics;
  const storage = device.storage || [];

  const statusClasses = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    online: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    offline: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const statusClass =
    statusClasses[
      device.status as keyof typeof statusClasses
    ] || "bg-slate-800 text-slate-400 border-slate-700";

  return (
    <main className="min-h-screen bg-[#0b0f17] px-6 py-8 md:px-10 text-slate-100">
      <div className="mx-auto max-w-6xl">
        {/* Back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to devices
        </Link>

        {/* Header */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {device.name}
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              {device.hostname || "Not paired yet"}
              {" · "}
              {device.os || "Unknown OS"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium border ${statusClass}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {device.status}
            </span>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleting ? "Removing..." : "Remove Device"}
            </button>
          </div>
        </div>

        {/* Pending Banner */}
        {device.status === "pending" && (
          <div className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="text-sm font-semibold text-amber-400">
              Device Waiting for Agent Pairing
            </h2>

            <p className="mt-1 text-xs text-slate-400">
              Generate a pairing code from the dashboard and enter it into the HomeMesh Agent window.
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        {device.status !== "pending" && (
          <>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <MetricCard
                title="CPU Utilization"
                icon={<Cpu className="h-4 w-4 text-blue-400" />}
                value={
                  metrics?.cpu_percent != null
                    ? `${metrics.cpu_percent.toFixed(1)}%`
                    : "--"
                }
              />

              <MetricCard
                title="Memory Utilization"
                icon={<Activity className="h-4 w-4 text-emerald-400" />}
                value={
                  metrics?.memory_percent != null
                    ? `${metrics.memory_percent.toFixed(1)}%`
                    : "--"
                }
                details={
                  metrics?.memory_used != null &&
                  metrics?.memory_total != null
                    ? `${formatBytes(
                        metrics.memory_used
                      )} / ${formatBytes(
                        metrics.memory_total
                      )}`
                    : undefined
                }
              />

              <MetricCard
                title="Disk Storage"
                icon={<HardDrive className="h-4 w-4 text-amber-400" />}
                value={
                  metrics?.disk_percent != null
                    ? `${metrics.disk_percent.toFixed(1)}%`
                    : "--"
                }
                details={
                  metrics?.disk_used != null &&
                  metrics?.disk_total != null
                    ? `${formatBytes(
                        metrics.disk_used
                      )} / ${formatBytes(
                        metrics.disk_total
                      )}`
                    : undefined
                }
              />
            </div>

            {!metrics && (
              <p className="mt-4 text-xs text-slate-400">
                Waiting for the initial agent heartbeat...
              </p>
            )}

            {/* Hardware Info */}
            <section className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Hardware & Hardware Specs
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Processor specification and system uptime metrics
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Info
                  label="CPU Cores"
                  value={
                    metrics?.cpu_cores != null
                      ? String(metrics.cpu_cores)
                      : "Not available"
                  }
                />

                <Info
                  label="CPU Threads"
                  value={
                    metrics?.cpu_threads != null
                      ? String(metrics.cpu_threads)
                      : "Not available"
                  }
                />

                <Info
                  label="CPU Clock Frequency"
                  value={
                    metrics?.cpu_frequency_mhz != null
                      ? `${metrics.cpu_frequency_mhz.toFixed(0)} MHz`
                      : "Not available"
                  }
                />

                <Info
                  label="System Uptime"
                  value={
                    metrics?.uptime_seconds != null
                      ? formatUptime(metrics.uptime_seconds)
                      : "Not available"
                  }
                />
              </div>
            </section>

            {/* Storage Section */}
            <section className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Storage Partitions
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Local drives and storage usage reported by agent
                </p>
              </div>

              {storage.length === 0 ? (
                <div className="mt-4 rounded-lg bg-slate-900 p-6 text-center border border-slate-800">
                  <p className="text-xs text-slate-400">
                    No partition information reported yet.
                  </p>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {storage.map((partition) => (
                    <StorageCard
                      key={partition.mount_point}
                      partition={partition}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Device Scanned Photos */}
            <section className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-6 shadow-sm">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Scanned Device Photos
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Photos indexed on this device
                </p>
              </div>

              {photos.length === 0 ? (
                <div className="mt-4 rounded-lg bg-slate-900 p-6 text-center border border-slate-800">
                  <p className="text-xs text-slate-400">
                    No photo files scanned on this device yet.
                  </p>
                </div>
              ) : (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => {
                        if (photo.uploaded && photo.image_url) {
                          setSelectedPhoto(photo);
                        }
                      }}
                      className={`rounded-lg bg-slate-900 p-3 border border-slate-800 ${
                        photo.uploaded
                          ? "cursor-pointer transition hover:border-slate-700"
                          : ""
                      }`}
                    >
                      {photo.uploaded && photo.image_url ? (
                        <PhotoImage
                          imageUrl={photo.image_url}
                          fileName={photo.file_name}
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded-lg bg-slate-950 text-slate-600">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}

                      <p
                        className="mt-2.5 truncate text-xs font-semibold text-white"
                        title={photo.file_name}
                      >
                        {photo.file_name}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatBytes(photo.file_size)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Metric Charts */}
            <MetricCharts
              data={history}
              range={historyRange}
              onRangeChange={setHistoryRange}
            />
          </>
        )}

        {/* Device Metadata */}
        <div className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-white">
            System & Agent Specs
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Info
              label="Hostname"
              value={device.hostname || "Not available"}
            />
            <Info
              label="Operating System"
              value={device.os || "Not available"}
            />
            <Info
              label="Agent Build"
              value={device.agent_version || "Not available"}
            />
            <Info
              label="Last Heartbeat"
              value={
                device.last_seen
                  ? formatLastSeen(device.last_seen)
                  : "Never"
              }
            />
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {selectedPhoto && selectedPhoto.image_url && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute right-6 top-6 z-10 rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close photo viewer"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
            onClick={(event) => event.stopPropagation()}
          >
            <PhotoImage
              imageUrl={selectedPhoto.image_url}
              fileName={selectedPhoto.file_name}
            />

            <p className="mt-3 text-xs font-medium text-white bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-lg">
              {selectedPhoto.file_name} · {formatBytes(selectedPhoto.file_size)}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  title,
  icon,
  value,
  details,
}: {
  title: string;
  icon?: React.ReactNode;
  value: string;
  details?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#151c28] p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </p>
        {icon}
      </div>

      <p className="mt-2 text-2xl font-bold tracking-tight text-white">
        {value}
      </p>

      {details && (
        <p className="mt-1 text-[11px] text-slate-400">
          {details}
        </p>
      )}
    </div>
  );
}

function StorageCard({
  partition,
}: {
  partition: StoragePartition;
}) {
  const usage = Math.min(
    Math.max(partition.usage_percent, 0),
    100
  );

  const isCritical = usage >= 90;
  const isWarning = usage >= 80;

  return (
    <div className="rounded-lg bg-slate-900 p-4 border border-slate-800">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {partition.mount_point}
          </p>

          <p className="text-[11px] text-slate-400">
            {partition.filesystem || "Unknown filesystem"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p
            className={`text-sm font-bold ${
              isCritical
                ? "text-red-400"
                : isWarning
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {usage.toFixed(1)}%
          </p>

          <p className="text-[11px] text-slate-400">
            {formatBytes(partition.used_bytes)} / {formatBytes(partition.total_bytes)}
          </p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${
            isCritical
              ? "bg-red-500"
              : isWarning
              ? "bg-amber-500"
              : "bg-emerald-500"
          }`}
          style={{
            width: `${usage}%`,
          }}
        />
      </div>

      <p className="mt-1.5 text-[11px] text-slate-400">
        {formatBytes(partition.free_bytes)} free
      </p>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-900 p-3 border border-slate-800/80">
      <p className="text-[11px] font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-0.5 text-xs font-semibold text-slate-100 truncate">
        {value}
      </p>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${units[index]}`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) return `${hours}h ${remainingMinutes}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return `${days}d ${remainingHours}h`;
}

function formatLastSeen(lastSeen: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(lastSeen).getTime()) / 1000
  );

  if (diff < 10) return "Just now";
  if (diff < 60) return `${diff} seconds ago`;
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}