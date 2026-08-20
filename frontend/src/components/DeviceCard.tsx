import { Link } from "react-router-dom";
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

type Props = {
  device: Device;
};

export default function DeviceCard({ device }: Props) {
  const online = device.status === "online";

  return (
    <Link
  to={`/devices/${device.id}`}
  className="block"
>
    <div className="rounded-2xl border border-white/10 bg-[#171a21] p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{device.name}</h2>
          <p className="text-sm text-gray-400">{device.hostname}</p>
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

      <div className="mt-5 border-t border-white/10 pt-4 text-xs text-gray-500">
        {device.last_seen
          ? `Last seen ${new Date(device.last_seen).toLocaleString()}`
          : "Never connected"}
      </div>
    </div>
    </Link>
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
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">
        {value != null ? `${value.toFixed(1)}%` : "--"}
      </p>
    </div>
  );
}