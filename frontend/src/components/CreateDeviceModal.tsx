import { useState } from "react";
import { api } from "../api/client";
import { X, Laptop, Plus } from "lucide-react";

type Props = {
  onClose: () => void;
  onDeviceCreated: (deviceId: string) => void;
};

export default function CreateDeviceModal({
  onClose,
  onDeviceCreated,
}: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createDevice() {
    if (!name.trim()) {
      setError("Please enter a device name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/v1/devices", {
        name: name.trim(),
      });

      onDeviceCreated(response.data.id);
    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to create device."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0f172a] p-6 text-slate-100 shadow-2xl animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Laptop className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Add New Device
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Enter a friendly name for your device (e.g., "Workstation", "Home PC"). You will receive a pairing code in the next step.
        </p>

        <div className="mt-5">
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Device Name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                createDevice();
              }
            }}
            placeholder="e.g. Madhav-Desktop"
            disabled={loading}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>

        {error && (
          <p className="mt-3 text-xs font-medium text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={createDevice}
            disabled={loading || !name.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {loading ? "Creating..." : "Create Device"}
          </button>
        </div>
      </div>
    </div>
  );
}