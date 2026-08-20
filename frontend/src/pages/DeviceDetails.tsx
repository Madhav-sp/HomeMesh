import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client";

type Device = {
  id: string;
  name: string;
  hostname: string;
  os: string;
  agent_version: string;
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

  useEffect(() => {
    if (!deviceId) return;

    const loadDevice = async () => {
      try {
        const response = await api.get(
          `/api/v1/devices/${deviceId}`
        );

        setDevice(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadDevice();

    const interval = window.setInterval(loadDevice, 10_000);

    return () => window.clearInterval(interval);
  }, [deviceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1115] p-10 text-white">
        Loading device...
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-screen bg-[#0f1115] p-10 text-white">
        Device not found.
      </div>
    );
  }

  const metrics = device.latest_metrics;

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
              {device.hostname} · {device.os}
            </p>
          </div>

          <span
            className={`rounded-full px-4 py-2 text-sm ${
              device.status === "online"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            ● {device.status}
          </span>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">

          <MetricCard
            title="CPU Usage"
            value={metrics?.cpu_percent}
          />

          <MetricCard
            title="Memory Usage"
            value={metrics?.memory_percent}
          />

          <MetricCard
            title="Disk Usage"
            value={metrics?.disk_percent}
          />

        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#171a21] p-6">
          <h2 className="text-lg font-semibold">
            Device Information
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Info label="Hostname" value={device.hostname} />
            <Info label="Operating System" value={device.os} />
            <Info
              label="Agent Version"
              value={device.agent_version}
            />
            <Info
              label="Last Seen"
              value={
                device.last_seen
                  ? new Date(device.last_seen).toLocaleString()
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
}: {
  title: string;
  value: number | null | undefined;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#171a21] p-6">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-4xl font-bold">
        {value != null ? `${value.toFixed(1)}%` : "--"}
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