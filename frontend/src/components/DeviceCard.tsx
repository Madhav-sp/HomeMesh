import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AddDeviceModal from "./AddDeviceModal";
import { api } from "../api/client";

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

  const highCpu =
    cpu !== null &&
    cpu !== undefined &&
    cpu >= 80;

  const highMemory =
    memory !== null &&
    memory !== undefined &&
    memory >= 80;

  const criticalDisk =
    disk !== null &&
    disk !== undefined &&
    disk >= 90;

  const hasAlert =
    highCpu ||
    highMemory ||
    criticalDisk;

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
        className="cursor-pointer rounded-2xl border border-white/10 bg-[#171a21] p-5 transition hover:border-white/20"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {device.name}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {device.hostname ||
                "Waiting for agent pairing"}
            </p>
          </div>

          <span
            className={`rounded-full border px-3 py-1 text-xs ${
              isOnline
                ? "border-green-500/20 bg-green-500/10 text-green-400"
                : isOffline
                ? "border-red-500/20 bg-red-500/10 text-red-400"
                : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
            }`}
          >
            {isPending && "Pending"}
            {isOnline && "Online"}
            {isOffline && "Offline"}
          </span>
        </div>

        {/* Pending */}
        {isPending ? (
          <div className="mt-6">
            <p className="text-sm text-gray-400">
              This device has not been paired yet.
            </p>

            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowPairModal(true);
              }}
              className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Pair Device
            </button>
          </div>
        ) : (
          <>
            {/* Alerts */}
            {hasAlert && (
              <div className="mt-5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                <p className="text-sm font-semibold text-yellow-400">
                  ⚠ Resource Alert
                </p>

                <div className="mt-1 space-y-1 text-xs text-gray-400">
                  {highCpu && (
                    <p>
                      CPU usage is high (
                      {cpu?.toFixed(1)}%)
                    </p>
                  )}

                  {highMemory && (
                    <p>
                      Memory usage is high (
                      {memory?.toFixed(1)}%)
                    </p>
                  )}

                  {criticalDisk && (
                    <p>
                      Disk usage is critical (
                      {disk?.toFixed(1)}%)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Metrics */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <Metric
                label="CPU"
                value={cpu}
                suffix="%"
                alert={highCpu}
              />

              <Metric
                label="Memory"
                value={memory}
                suffix="%"
                alert={highMemory}
              />

              <Metric
                label="Disk"
                value={disk}
                suffix="%"
                alert={criticalDisk}
              />
            </div>

            {/* Info */}
            <div className="mt-5 border-t border-white/10 pt-4 text-sm text-gray-500">
              <p>
                OS: {device.os || "Unknown"}
              </p>

              <p className="mt-1">
                Last seen:{" "}
                {formatLastSeen(device.last_seen)}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-end border-t border-white/10 pt-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Removing..."
                  : "Remove Device"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Pairing Modal */}
      {showPairModal && (
        <AddDeviceModal
          deviceId={device.id}
          onClose={() =>
            setShowPairModal(false)
          }
        />
      )}
    </>
  );
}

type MetricProps = {
  label: string;
  value: number | null | undefined;
  suffix: string;
  alert?: boolean;
};

function Metric({
  label,
  value,
  suffix,
  alert = false,
}: MetricProps) {
  return (
    <div
      className={`rounded-xl p-3 ${
        alert
          ? "bg-yellow-500/10 ring-1 ring-yellow-500/20"
          : "bg-[#0f1115]"
      }`}
    >
      <p className="text-xs text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 text-lg font-semibold ${
          alert
            ? "text-yellow-400"
            : "text-white"
        }`}
      >
        {value !== null &&
        value !== undefined
          ? `${value.toFixed(1)}${suffix}`
          : "—"}
      </p>
    </div>
  );
}