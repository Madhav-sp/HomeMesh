import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

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
    memory_percent: number | null;
    memory_used: number | null;
    memory_total: number | null;
    disk_percent: number | null;
    disk_used: number | null;
    disk_total: number | null;
    created_at: string | null;
  } | null;
};

export default function DeviceDetails() {
  const { deviceId } = useParams();

  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        if (mounted) {
          setDevice(response.data);
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
  }, [deviceId]);

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

  const statusClasses = {
    pending: "bg-yellow-500/10 text-yellow-400",
    online: "bg-green-500/10 text-green-400",
    offline: "bg-red-500/10 text-red-400",
  };

  const statusClass =
    statusClasses[
      device.status as keyof typeof statusClasses
    ] || "bg-gray-500/10 text-gray-400";

  return (
    <main className="min-h-screen bg-[#0f1115] px-8 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        <Link
          to="/"
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back to devices
        </Link>

        <div className="mt-8 flex items-center justify-between">
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

          <span
            className={`rounded-full px-4 py-2 text-sm ${statusClass}`}
          >
            ● {device.status}
          </span>
        </div>

        {/* Pending Device */}
        {device.status === "pending" && (
          <div className="mt-10 rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-6">
            <h2 className="text-lg font-semibold text-yellow-400">
              Device waiting for pairing
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Generate a pairing code from the dashboard and
              enter it in the HomeMesh Agent.
            </p>
          </div>
        )}

        {/* Metrics */}
        {device.status !== "pending" && (
          <>
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
                Waiting for the first heartbeat from this device...
              </p>
            )}
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
              value={device.hostname || "Not available"}
            />

            <Info
              label="Operating System"
              value={device.os || "Not available"}
            />

            <Info
              label="Agent Version"
              value={
                device.agent_version || "Not available"
              }
            />

            <Info
              label="Last Seen"
              value={
                device.last_seen
                  ? new Date(
                      device.last_seen
                    ).toLocaleString()
                  : "Never"
              }
            />

          </div>
        </div>

      </div>
    </main>
  );
}

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(
    bytes / Math.pow(1024, index)
  ).toFixed(1)} ${units[index]}`;
}