import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import DeviceCard from "../components/DeviceCard";
import Sidebar from "../components/Sidebar";
import CreateDeviceModal from "../components/CreateDeviceModal";
import AddDeviceModal from "../components/AddDeviceModal";
import {
  Server,
  Wifi,
  WifiOff,
  Clock,
  AlertTriangle,
  Plus,
  UploadCloud,
  Laptop,
  RefreshCw,
} from "lucide-react";

type Device = {
  id: string;
  name: string;
  hostname: string | null;
  os: string | null;
  status: string;
  last_seen: string | null;
  latest_metrics?: {
    cpu_percent: number | null;
    memory_percent: number | null;
    disk_percent: number | null;
  } | null;
};

export default function Dashboard() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateDevice, setShowCreateDevice] = useState(false);

  const [pairingDeviceId, setPairingDeviceId] = useState<string | null>(null);

  async function loadDevices() {
    try {
      const response = await api.get("/api/v1/devices");

      setDevices(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to load devices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDevices();

    const interval = window.setInterval(loadDevices, 10_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function handleDeviceCreated(deviceId: string) {
    setShowCreateDevice(false);

    loadDevices();

    setPairingDeviceId(deviceId);
  }

  const totalDevices = devices.length;

  const onlineDevices = devices.filter(
    (device) => device.status === "online"
  ).length;

  const offlineDevices = devices.filter(
    (device) => device.status === "offline"
  ).length;

  const pendingDevices = devices.filter(
    (device) => device.status === "pending"
  ).length;

  // Devices currently having resource alerts
  const alertCount = devices.filter((device) => {
    const cpu = device.latest_metrics?.cpu_percent;
    const memory = device.latest_metrics?.memory_percent;
    const disk = device.latest_metrics?.disk_percent;

    return (
      (cpu !== null && cpu !== undefined && cpu >= 80) ||
      (memory !== null && memory !== undefined && memory >= 80) ||
      (disk !== null && disk !== undefined && disk >= 90)
    );
  }).length;

  const summaryCards = [
    {
      label: "Total Devices",
      value: totalDevices,
      description: "Registered devices",
      icon: Server,
      iconColor: "text-blue-400",
      borderColor: "border-blue-500/20",
    },
    {
      label: "Online",
      value: onlineDevices,
      description: "Connected & active",
      icon: Wifi,
      iconColor: "text-emerald-400",
      borderColor: "border-emerald-500/20",
    },
    {
      label: "Offline",
      value: offlineDevices,
      description: "Not responding",
      icon: WifiOff,
      iconColor: "text-red-400",
      borderColor: "border-red-500/20",
    },
    {
      label: "Pending",
      value: pendingDevices,
      description: "Awaiting pairing",
      icon: Clock,
      iconColor: "text-amber-400",
      borderColor: "border-amber-500/20",
    },
    {
      label: "Alerts",
      value: alertCount,
      description: "High resource usage",
      icon: AlertTriangle,
      iconColor: "text-orange-400",
      borderColor: "border-orange-500/20",
    },
  ];

  return (
    <div className="page-bg flex min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 px-6 py-8 md:px-10 md:ml-64">
        <div className="relative z-10 mx-auto max-w-6xl animate-fadeIn">
          {/* Header */}
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  Dashboard
                </span>
              </div>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Connected Devices
              </h1>

              <p className="mt-1 text-xs text-slate-400">
                Monitor machine status, resource utilization, and compute workloads in real time.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Upload File */}
              <Link
                to="/upload"
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <UploadCloud className="h-4 w-4" />
                Upload File
              </Link>

              {/* Add Device */}
              <button
                onClick={() => setShowCreateDevice(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
              >
                <Plus className="h-4 w-4" />
                Add Device
              </button>
            </div>
          </header>

          {/* Loading */}
          {loading && (
            <div className="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-[#151c28]">
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                Loading connected devices...
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400 animate-fadeIn">
              {error}
            </div>
          )}

          {/* Dashboard Summary */}
          {!loading && !error && (
            <>
              <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {summaryCards.map((card) => {
                  const IconComp = card.icon;
                  return (
                    <div
                      key={card.label}
                      className="glass-card rounded-xl p-4 transition-all duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                          {card.label}
                        </p>
                        <IconComp className={`h-4 w-4 ${card.iconColor}`} />
                      </div>

                      <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                        {card.value}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-400">
                        {card.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* No Devices */}
              {devices.length === 0 && (
                <div className="glass-card rounded-xl border-dashed border-slate-700 p-12 text-center animate-slideUp">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <Laptop className="h-6 w-6" />
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-white">
                    No devices paired yet
                  </h2>

                  <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto">
                    Add a device and pair the HomeMesh Agent to monitor CPU, memory, storage, and transfers.
                  </p>

                  <button
                    onClick={() => setShowCreateDevice(true)}
                    className="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Device
                  </button>
                </div>
              )}

              {/* Devices Grid */}
              {devices.length > 0 && (
                <section className="animate-fadeIn">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold tracking-tight text-white">
                        Registered Devices
                      </h2>

                      <p className="mt-0.5 text-xs text-slate-400">
                        Real-time status and health monitors
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                      Auto-refreshing (10s)
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {devices.map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Create Device */}
      {showCreateDevice && (
        <CreateDeviceModal
          onClose={() => setShowCreateDevice(false)}
          onDeviceCreated={handleDeviceCreated}
        />
      )}

      {/* Pair Device */}
      {pairingDeviceId && (
        <AddDeviceModal
          deviceId={pairingDeviceId}
          onClose={() => {
            setPairingDeviceId(null);
            loadDevices();
          }}
        />
      )}
    </div>
  );
}