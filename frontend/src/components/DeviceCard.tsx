import { Link } from "react-router-dom";
import { useState } from "react";
import AddDeviceModal from "./AddDeviceModal";

type Device = {
  id: string;
  name: string;
  hostname: string| null;
  os: string | null;
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

export default function DeviceCard({ device }: Props) {
  const [showPairing, setShowPairing] = useState(false);

  const online = device.status === "online";

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[#171a21] p-6 transition hover:border-white/20">

        {/* Device header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {device.name}
            </h2>

            <p className="text-sm text-gray-400">
              {device.hostname || "waiting for agent..."} - {device.os || "unknown OS"}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              online
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            ● {online ? "Online" : "Offline"}
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <Metric
            label="CPU"
            value={device.latest_metrics?.cpu_percent}
          />

          <Metric
            label="Memory"
            value={device.latest_metrics?.memory_percent}
          />

          <Metric
            label="Disk"
            value={device.latest_metrics?.disk_percent}
          />
        </div>

        {/* Last seen */}
        <div className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-500">
          {device.last_seen
            ? `Last seen ${new Date(
                device.last_seen,
              ).toLocaleString()}`
            : "Never connected"}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-3">
          <Link
            to={`/devices/${device.id}`}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
          >
            View Details
          </Link>

          <button
            type="button"
            onClick={() => setShowPairing(true)}
            className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-gray-200"
          >
            Pair Agent
          </button>
        </div>
      </div>

      {/* Modal */}
      {showPairing && (
        <AddDeviceModal
          deviceId={device.id}
          onClose={() => setShowPairing(false)}
        />
      )}
    </>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) {
  return (
    <div className="rounded-xl bg-[#0f1115] p-4">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold">
        {value != null ? `${value.toFixed(1)}%` : "--"}
      </p>
    </div>
  );
}