import { useEffect, useState } from "react";
import { api } from "../api/client";
import DeviceCard from "../components/DeviceCard";
import Sidebar from "../components/Sidebar";

type Device = {
  id: string;
  name: string;
  hostname: string;
  os: string;
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

  useEffect(() => {
    let mounted = true;

    async function loadDevices() {
      try {
        const response = await api.get("/api/v1/devices");

        if (mounted) {
          setDevices(response.data);
          setError("");
        }
      } catch (err) {
        console.error(err);

        if (mounted) {
          setError("Unable to load devices.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDevices();

    const interval = window.setInterval(loadDevices, 10_000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0f1115] text-white">
      <Sidebar />

      {/* Dashboard content */}
      <div className="px-8 py-10 transition-all duration-300 md:ml-0">
        <div className="mx-auto max-w-6xl">

          <header className="mb-10">
            <p className="text-sm text-gray-500">
              HomeMesh
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Device Dashboard
            </h1>

            <p className="mt-2 text-gray-400">
              Monitor your connected devices.
            </p>
          </header>

          {loading && (
            <p className="text-gray-400">
              Loading devices...
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && devices.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
              <h2 className="text-lg font-semibold">
                No devices yet
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                Pair a HomeMesh Agent to start monitoring a device.
              </p>
            </div>
          )}

          {!loading && !error && devices.length > 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                />
              ))}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}