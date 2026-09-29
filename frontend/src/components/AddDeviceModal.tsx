import { useState } from "react";
import { api } from "../api/client";
import { X, Key, ShieldCheck } from "lucide-react";

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
        `/api/v1/devices/${deviceId}/pairing-code`
      );

      setCode(response.data.code);
      setExpiresAt(response.data.expires_at);
    } catch (err: any) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to generate pairing code."
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
              <Key className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-semibold text-white">
              Pair Device
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Generate a pairing code and enter it in your HomeMesh Agent to connect this machine securely.
        </p>

        {!code && (
          <button
            onClick={generateCode}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? "Generating Code..." : "Generate Pairing Code"}
          </button>
        )}

        {code && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-900/80 p-5 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs uppercase tracking-wider text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Pairing Code
            </div>

            <p className="mt-3 text-4xl font-extrabold tracking-[0.3em] font-mono text-white">
              {code}
            </p>

            {expiresAt && (
              <p className="mt-3 text-[11px] text-slate-400">
                Expires: {new Date(expiresAt).toLocaleString()}
              </p>
            )}

            <div className="mt-4 rounded-lg bg-slate-950 p-3 text-left border border-slate-800">
              <p className="text-[11px] text-slate-400">
                Enter this code into your HomeMesh Agent CLI or dialog:
              </p>

              <code className="mt-1 block text-xs font-mono text-blue-300">
                {code}
              </code>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs font-medium text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}