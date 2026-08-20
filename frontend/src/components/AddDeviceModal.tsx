import { useState } from "react";
import { api } from "../api/client";

type Props = {
  deviceId: string;
  onClose: () => void;
};

export default function AddDeviceModal({
  deviceId,
  onClose,
}: Props) {
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateCode() {
    setLoading(true);
    setError("");

    try {
      const response = await api.post(
        `/api/v1/devices/${deviceId}/pairing-code`,
      );

      setCode(response.data.code);
      setExpiresAt(response.data.expires_at);
    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to generate pairing code.",
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
            Pair Device
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white"
          >
            ✕
          </button>
        </div>

        <p className="mt-3 text-sm text-gray-400">
          Generate a pairing code and enter it in your
          HomeMesh Agent.
        </p>

        {!code && (
          <button
            onClick={generateCode}
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-white px-4 py-3 font-semibold text-black hover:bg-gray-200 disabled:opacity-50"
          >
            {loading
              ? "Generating..."
              : "Generate Pairing Code"}
          </button>
        )}

        {code && (
          <div className="mt-6 text-center">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Pairing Code
            </p>

            <p className="mt-3 text-5xl font-bold tracking-[0.3em]">
              {code}
            </p>

            {expiresAt && (
              <p className="mt-4 text-xs text-gray-500">
                Expires:{" "}
                {new Date(expiresAt).toLocaleString()}
              </p>
            )}

            <div className="mt-6 rounded-xl bg-[#0f1115] p-4 text-left">
              <p className="text-xs text-gray-500">
                On the Agent, enter:
              </p>

              <code className="mt-2 block text-sm text-gray-300">
                {code}
              </code>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}