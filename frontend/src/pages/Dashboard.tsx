import { useEffect, useState } from "react";
import { api } from "../api/client";
import DeviceCard from "../components/DeviceCard";
import Sidebar from "../components/Sidebar";
import CreateDeviceModal from "../components/CreateDeviceModal";
import AddDeviceModal from "../components/AddDeviceModal";

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

  const [showCreateDevice, setShowCreateDevice] =
    useState(false);

  const [pairingDeviceId, setPairingDeviceId] =
    useState<string | null>(null);

  async function loadDevices() {
    try {
      const response = await api.get(
        "/api/v1/devices"
      );

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

    const interval = window.setInterval(
      loadDevices,
      10_000
    );

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
      (cpu !== null &&
        cpu !== undefined &&
        cpu >= 80) ||
      (memory !== null &&
        memory !== undefined &&
        memory >= 80) ||
      (disk !== null &&
        disk !== undefined &&
        disk >= 90)
    );
  }).length;

  return (
    <main className="min-h-screen bg-[#0f1115] text-white">
      <Sidebar />

      <div className="px-8 py-10 transition-all duration-300 md:ml-0">
        <div className="mx-auto max-w-6xl">

          {/* Header */}
          <header className="mb-8 flex items-start justify-between gap-6">
            <div>
              <p className="text-sm text-gray-500">
                HomeMesh
              </p>

              <h1 className="mt-2 text-3xl font-bold">
                Device Dashboard
              </h1>

              <p className="mt-2 text-gray-400">
                Monitor your connected devices.
              </p>
            </div>

            <button
              onClick={() =>
                setShowCreateDevice(true)
              }
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200"
            >
              <span className="text-xl leading-none">
                +
              </span>

              Add Device
            </button>
          </header>

          {/* Loading */}
          {loading && (
            <p className="text-gray-400">
              Loading devices...
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              {error}
            </div>
          )}

          {/* Dashboard Summary */}
          {!loading && !error && (
            <>
              <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

                <SummaryCard
                  label="Total Devices"
                  value={totalDevices}
                  description="Registered devices"
                />

                <SummaryCard
                  label="Online"
                  value={onlineDevices}
                  description="Currently connected"
                />

                <SummaryCard
                  label="Offline"
                  value={offlineDevices}
                  description="Not responding"
                />

                <SummaryCard
                  label="Pending"
                  value={pendingDevices}
                  description="Waiting for pairing"
                />

                <SummaryCard
                  label="Alerts"
                  value={alertCount}
                  description="Devices needing attention"
                />

              </div>

              {/* No Devices */}
              {devices.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-2xl">
                    +
                  </div>

                  <h2 className="mt-5 text-lg font-semibold">
                    No devices yet
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Add a device and pair the HomeMesh
                    Agent to start monitoring it.
                  </p>

                  <button
                    onClick={() =>
                      setShowCreateDevice(true)
                    }
                    className="mt-6 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-gray-200"
                  >
                    + Add Your First Device
                  </button>
                </div>
              )}

              {/* Devices */}
              {devices.length > 0 && (
                <section>
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">
                        Your Devices
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        Live device status and resource usage
                      </p>
                    </div>

                    <p className="text-sm text-gray-500">
                      Refreshing every 10s
                    </p>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
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
      </div>

      {/* Create Device */}
      {showCreateDevice && (
        <CreateDeviceModal
          onClose={() =>
            setShowCreateDevice(false)
          }
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
    </main>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#171a21] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {label}
        </p>

        <span className="h-2 w-2 rounded-full bg-white/40" />
      </div>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}