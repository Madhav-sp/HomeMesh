import { useState } from "react";
import { api } from "../api/client";

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#171a21] p-6 text-white">
        
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Add Device
          </h2>

          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-400">
          Give your device a name. You will pair the HomeMesh
          Agent in the next step.
        </p>

        <div className="mt-6">
          <label className="text-sm text-gray-400">
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
            placeholder="My PC"
            disabled={loading}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0f1115] px-4 py-3 text-white outline-none placeholder:text-gray-600 focus:border-white/30"
          />
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-white/10 px-4 py-3 font-medium text-gray-300 hover:bg-white/5"
          >
            Cancel
          </button>

          <button
            onClick={createDevice}
            disabled={loading || !name.trim()}
            className="flex-1 rounded-xl bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Device"}
          </button>
        </div>
      </div>
    </div>
  );
}