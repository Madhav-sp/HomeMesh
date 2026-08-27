import { useState } from "react";
import AddDeviceModal from "./AddDeviceModal";

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

export default function DeviceCard({ device }: Props) {
  const [showPairModal, setShowPairModal] = useState(false);

  const isPending = device.status === "pending";
  const isOnline = device.status === "online";
  const isOffline = device.status === "offline";

  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-[#171a21] p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {device.name}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {device.hostname || "Waiting for agent pairing"}
            </p>
          </div>

          <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
            {isPending && "Pending"}
            {isOnline && "Online"}
            {isOffline && "Offline"}
          </span>
        </div>

        {isPending ? (
          <div className="mt-6">
            <p className="text-sm text-gray-400">
              This device has not been paired yet.
            </p>

            <button
              onClick={() => setShowPairModal(true)}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200"
            >
              Pair Device
            </button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric
                label="CPU"
                value={device.latest_metrics?.cpu_percent}
                suffix="%"
              />

              <Metric
                label="Memory"
                value={device.latest_metrics?.memory_percent}
                suffix="%"
              />

              <Metric
                label="Disk"
                value={device.latest_metrics?.disk_percent}
                suffix="%"
              />
            </div>

            <div className="mt-5 border-t border-white/10 pt-4 text-sm text-gray-500">
              <p>OS: {device.os || "Unknown"}</p>

              <p className="mt-1">
                Last seen:{" "}
                {device.last_seen
                  ? new Date(device.last_seen).toLocaleString()
                  : "Never"}
              </p>
            </div>
          </>
        )}
      </div>

      {showPairModal && (
        <AddDeviceModal
          deviceId={device.id}
          onClose={() => setShowPairModal(false)}
        />
      )}
    </>
  );
}

type MetricProps = {
  label: string;
  value: number | null | undefined;
  suffix: string;
};

function Metric({
  label,
  value,
  suffix,
}: MetricProps) {
  return (
    <div className="rounded-xl bg-[#0f1115] p-3">
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value !== null && value !== undefined
          ? `${value.toFixed(1)}${suffix}`
          : "—"}
      </p>
    </div>
  );
}