import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import MetricCharts from "../components/MetricCharts";

type StoragePartition = {
  mount_point: string;
  filesystem: string | null;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
  usage_percent: number;
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

  const [device, setDevice] =
    useState<Device | null>(null);

  const [history, setHistory] =
    useState<HistoricalMetric[]>([]);

  const [historyRange, setHistoryRange] =
    useState(5);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [deleting, setDeleting] =
    useState(false);

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

        if (mounted) {
          setDevice(response.data);
          setHistory(historyResponse.data);
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
      <div className="min-h-screen bg-[#0f1115] p-10 text-white">
        Loading device...
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="min-h-screen bg-[#0f1115] p-10 text-white">
        <Link
          to="/"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to devices
        </Link>

        <p className="mt-8 text-red-400">
          {error || "Device not found."}
        </p>
      </div>
    );
  }

  const metrics = device.latest_metrics;

  const storage = device.storage || [];

  const statusClasses = {
    pending:
      "bg-yellow-500/10 text-yellow-400",
    online:
      "bg-green-500/10 text-green-400",
    offline:
      "bg-red-500/10 text-red-400",
  };

  const statusClass =
    statusClasses[
      device.status as keyof typeof statusClasses
    ] || "bg-gray-500/10 text-gray-400";

  return (
    <main className="min-h-screen bg-[#0f1115] px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        {/* Back */}
        <Link
          to="/"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to devices
        </Link>

        {/* Header */}
        <div className="mt-8 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {device.name}
            </h1>

            <p className="mt-2 text-gray-400">
              {device.hostname || "Not paired yet"}
              {" · "}
              {device.os || "Unknown OS"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-4 py-2 text-sm ${statusClass}`}
            >
              ● {device.status}
            </span>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Removing..."
                : "Remove Device"}
            </button>
          </div>
        </div>

        {/* Pending */}
        {device.status === "pending" && (
          <div className="mt-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
            <h2 className="text-lg font-semibold text-yellow-400">
              Device waiting for pairing
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Generate a pairing code from the dashboard
              and enter it in the HomeMesh Agent.
            </p>
          </div>
        )}

        {/* Device Metrics */}
        {device.status !== "pending" && (
          <>
            {/* Main Metrics */}
            <div className="mt-10 grid gap-5 md:grid-cols-3">

              <MetricCard
                title="CPU Usage"
                value={
                  metrics?.cpu_percent != null
                    ? `${metrics.cpu_percent.toFixed(1)}%`
                    : "--"
                }
              />

              <MetricCard
                title="Memory Usage"
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
                title="Disk Usage"
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
              <p className="mt-6 text-sm text-gray-500">
                Waiting for the first heartbeat from
                this device...
              </p>
            )}

            {/* Compute Information */}
            <section className="mt-8 rounded-2xl border border-white/10 bg-[#171a21] p-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Compute
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Processor and system resource information
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

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
                  label="CPU Frequency"
                  value={
                    metrics?.cpu_frequency_mhz != null
                      ? `${metrics.cpu_frequency_mhz.toFixed(
                          0
                        )} MHz`
                      : "Not available"
                  }
                />

                <Info
                  label="Uptime"
                  value={
                    metrics?.uptime_seconds != null
                      ? formatUptime(
                          metrics.uptime_seconds
                        )
                      : "Not available"
                  }
                />

              </div>
            </section>

            {/* Storage */}
            <section className="mt-8 rounded-2xl border border-white/10 bg-[#171a21] p-6">

              <div>
                <h2 className="text-lg font-semibold">
                  Storage
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Disk partitions and storage usage
                </p>
              </div>

              {storage.length === 0 ? (
                <div className="mt-6 rounded-xl bg-[#0f1115] p-6 text-center">
                  <p className="text-sm text-gray-500">
                    No storage information available.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {storage.map((partition) => (
                    <StorageCard
                      key={partition.mount_point}
                      partition={partition}
                    />
                  ))}
                </div>
              )}

            </section>

            {/* History */}
            <MetricCharts
              data={history}
              range={historyRange}
              onRangeChange={setHistoryRange}
            />
          </>
        )}

        {/* Device Information */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#171a21] p-6">

          <h2 className="text-lg font-semibold">
            Device Information
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">

            <Info
              label="Hostname"
              value={
                device.hostname ||
                "Not available"
              }
            />

            <Info
              label="Operating System"
              value={
                device.os ||
                "Not available"
              }
            />

            <Info
              label="Agent Version"
              value={
                device.agent_version ||
                "Not available"
              }
            />

            <Info
              label="Last Seen"
              value={
                device.last_seen
                  ? formatLastSeen(
                      device.last_seen
                    )
                  : "Never"
              }
            />

          </div>
        </div>

      </div>
    </main>
  );
}


/* =========================================================
   METRIC CARD
   ========================================================= */

function MetricCard({
  title,
  value,
  details,
}: {
  title: string;
  value: string;
  details?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#171a21] p-6">

      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold">
        {value}
      </p>

      {details && (
        <p className="mt-2 text-sm text-gray-500">
          {details}
        </p>
      )}

    </div>
  );
}


/* =========================================================
   STORAGE CARD
   ========================================================= */

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
    <div className="rounded-xl bg-[#0f1115] p-5">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <p className="text-lg font-semibold">
            {partition.mount_point}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {partition.filesystem || "Unknown filesystem"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p
            className={`text-lg font-semibold ${
              isCritical
                ? "text-red-400"
                : isWarning
                ? "text-yellow-400"
                : "text-white"
            }`}
          >
            {usage.toFixed(1)}%
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {formatBytes(partition.used_bytes)}
            {" / "}
            {formatBytes(partition.total_bytes)}
          </p>
        </div>

      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${
            isCritical
              ? "bg-red-500"
              : isWarning
              ? "bg-yellow-500"
              : "bg-white"
          }`}
          style={{
            width: `${usage}%`,
          }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        {formatBytes(partition.free_bytes)} free
      </p>

    </div>
  );
}


/* =========================================================
   INFO
   ========================================================= */

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#0f1115] p-4">

      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm">
        {value}
      </p>

    </div>
  );
}


/* =========================================================
   FORMAT BYTES
   ========================================================= */

function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) / Math.log(1024)
    ),
    units.length - 1
  );

  return `${(
    bytes /
    Math.pow(1024, index)
  ).toFixed(1)} ${units[index]}`;
}


/* =========================================================
   FORMAT UPTIME
   ========================================================= */

function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  const remainingMinutes =
    minutes % 60;

  if (hours < 24) {
    return `${hours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(
    hours / 24
  );

  const remainingHours =
    hours % 24;

  return `${days}d ${remainingHours}h`;
}


/* =========================================================
   FRIENDLY LAST SEEN
   ========================================================= */

function formatLastSeen(
  lastSeen: string
): string {
  const diff = Math.floor(
    (Date.now() -
      new Date(lastSeen).getTime()) /
      1000
  );

  if (diff < 10) {
    return "Just now";
  }

  if (diff < 60) {
    return `${diff} seconds ago`;
  }

  const minutes = Math.floor(
    diff / 60
  );

  if (minutes < 60) {
    return `${minutes} minute${
      minutes === 1 ? "" : "s"
    } ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} hour${
      hours === 1 ? "" : "s"
    } ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  return `${days} day${
    days === 1 ? "" : "s"
  } ago`;
}