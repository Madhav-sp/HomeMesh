import { useEffect, useState } from "react";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Send,
} from "lucide-react";

type Device = {
  id: string;
  name: string;
  hostname: string | null;
  os: string | null;
  status: string;
};

type Transfer = {
  id: string;
  file_name: string;
  file_size: number;
  target_device_id: string;
  target_device_name: string;
  status: string;
  created_at?: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(bytes / Math.pow(1024, index)).toFixed(1)} ${
    units[index]
  }`;
}

export default function Upload() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [loadingDevices, setLoadingDevices] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadDevices() {
    try {
      setLoadingDevices(true);
      setError("");

      const response = await api.get(
        "/api/v1/devices"
      );

      const deviceList: Device[] = response.data;

      setDevices(deviceList);

      const firstOnline = deviceList.find(
        (device) => device.status === "online"
      );

      if (firstOnline) {
        setSelectedDevice(firstOnline.id);
      }
    } catch (err) {
      console.error(err);
      setError("Unable to load devices.");
    } finally {
      setLoadingDevices(false);
    }
  }

  async function loadTransfers() {
    try {
      setLoadingTransfers(true);

      const response = await api.get(
        "/api/v1/transfers"
      );

      setTransfers(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransfers(false);
    }
  }

  useEffect(() => {
    loadDevices();
    loadTransfers();

    const interval = window.setInterval(() => {
      loadTransfers();
      loadDevices();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);
    setError("");
    setSuccess("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    if (droppedFile) {
      setFile(droppedFile);
      setError("");
      setSuccess("");
    }
  }

  async function handleUpload(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!file) {
      setError("Please select a file.");
      return;
    }

    if (!selectedDevice) {
      setError("Please select a target device.");
      return;
    }

    const targetDevice = devices.find(
      (device) => device.id === selectedDevice
    );

    if (!targetDevice) {
      setError("Selected device was not found.");
      return;
    }

    if (targetDevice.status !== "online") {
      setError(
        "The selected device is offline."
      );
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError(
        "File must be smaller than 100 MB."
      );
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      formData.append(
        "device_id",
        selectedDevice
      );

      formData.append(
        "file",
        file
      );

      const response = await api.post(
        "/api/v1/transfers",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setSuccess(
        `"${response.data.file_name}" queued for delivery to ${targetDevice.name}.`
      );

      setFile(null);

      const input =
        document.getElementById(
          "photo-upload"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      await loadTransfers();
    } catch (err: any) {
      console.error(err);

      const message =
        err?.response?.data?.detail ||
        "Upload failed.";

      setError(message);
    } finally {
      setUploading(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return (
          <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Completed
          </span>
        );
      case "transferring":
        return (
          <span className="flex items-center gap-1 rounded-md bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 text-[11px] font-medium text-blue-400 animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Transferring
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-400">
            <Clock className="h-3 w-3" />
            Pending Agent
          </span>
        );
      case "failed":
        return (
          <span className="flex items-center gap-1 rounded-md bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-[11px] font-medium text-red-400">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[11px] text-slate-400">
            {status}
          </span>
        );
    }
  }

  return (
    <div className="page-bg flex min-h-screen text-slate-100">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 md:ml-64">
        <div className="relative z-10 mx-auto max-w-4xl animate-fadeIn">
          {/* HEADER */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Transfer File to Device
            </h1>

            <p className="mt-1 text-xs text-slate-400">
              Directly push files from your browser to a target device agent.
            </p>
          </div>

          {/* UPLOAD CARD */}
          <form
            onSubmit={handleUpload}
            className="mt-8 glass-card rounded-xl p-6 md:p-8"
          >
            {/* FILE DROP ZONE */}
            <div>
              <label
                htmlFor="photo-upload"
                className="text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                1. Select File
              </label>

              <div
                className={`mt-2.5 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                  dragOver
                    ? "border-blue-500/60 bg-blue-500/5"
                    : "border-slate-700/80 bg-slate-900/40 hover:border-slate-600"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <UploadCloud className="h-5 w-5" />
                </div>

                <p className="text-xs text-slate-400">
                  Drag & drop your file here, or
                </p>

                <label
                  htmlFor="photo-upload"
                  className="mt-2 inline-block cursor-pointer rounded-lg bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 hover:text-white border border-slate-700"
                >
                  Browse Files
                </label>

                <input
                  id="photo-upload"
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file && (
                  <div className="mt-4 inline-flex items-center gap-3 rounded-lg bg-slate-900 border border-slate-800 px-4 py-2.5 text-left">
                    <FileText className="h-5 w-5 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white max-w-xs">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DEVICE */}
            <div className="mt-6">
              <label
                htmlFor="target-device"
                className="text-xs font-medium uppercase tracking-wider text-slate-400"
              >
                2. Target Device
              </label>

              {loadingDevices ? (
                <div className="mt-2 flex h-10 items-center rounded-lg border border-slate-800 bg-slate-900 px-3.5 text-xs text-slate-400">
                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin text-blue-400" />
                  Loading available devices...
                </div>
              ) : (
                <select
                  id="target-device"
                  value={selectedDevice}
                  onChange={(event) =>
                    setSelectedDevice(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs text-slate-100 outline-none transition focus:border-blue-500"
                >
                  <option value="">
                    Select a device
                  </option>

                  {devices.map((device) => (
                    <option
                      key={device.id}
                      value={device.id}
                      disabled={
                        device.status !== "online"
                      }
                    >
                      {device.name}{" "}
                      {device.status === "online"
                        ? "(Online)"
                        : `(${device.status})`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ERROR */}
            {error && (
              <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400 animate-fadeIn">
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 animate-fadeIn">
                {success}
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={
                uploading ||
                !file ||
                !selectedDevice
              }
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sending File...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send File to Device Agent
                </>
              )}
            </button>

          </form>

          {/* TRANSFERS */}
          <section className="mt-10 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight text-white">
                  Transfer Activity
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Recent files sent across your HomeMesh nodes
                </p>
              </div>

              {loadingTransfers && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-400" />
                  Refreshing
                </div>
              )}
            </div>

            <div className="mt-4 glass-card overflow-hidden rounded-xl">
              {transfers.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="mx-auto h-8 w-8 text-slate-500" />
                  <p className="mt-2 text-xs text-slate-400">
                    No active file transfers found.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {transfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="flex flex-col gap-3 p-4 transition hover:bg-slate-900/40 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
                          <FileText className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-white">
                            {transfer.file_name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {formatBytes(transfer.file_size)}
                            {" · "}
                            Target: {transfer.target_device_name || "Unknown device"}
                          </p>
                        </div>
                      </div>

                      {getStatusBadge(transfer.status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}