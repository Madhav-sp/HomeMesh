import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

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

  const [transfers, setTransfers] = useState<Transfer[]>([]);

  const [loadingDevices, setLoadingDevices] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =========================================================
  // LOAD DEVICES
  // =========================================================

  async function loadDevices() {
    try {
      setLoadingDevices(true);
      setError("");

      const response = await api.get(
        "/api/v1/devices"
      );

      const deviceList: Device[] = response.data;

      setDevices(deviceList);

      // Automatically select first online device
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

  // =========================================================
  // LOAD TRANSFERS
  // =========================================================

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

  // =========================================================
  // FILE SELECT
  // =========================================================

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] || null;

    setFile(selectedFile);
    setError("");
    setSuccess("");
  }

  // =========================================================
  // UPLOAD
  // =========================================================

  async function handleUpload(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!file) {
      setError("Please select an image.");
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

    // Backend currently supports images up to 25 MB.
    if (file.size > 25 * 1024 * 1024) {
      setError(
        "Image must be smaller than 25 MB."
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
        `"${response.data.file_name}" sent to ${targetDevice.name}.`
      );

      setFile(null);

      // Reset file input
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

  // =========================================================
  // STATUS STYLE
  // =========================================================

  function getStatusClass(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-500/10 text-green-400";

      case "transferring":
        return "bg-blue-500/10 text-blue-400";

      case "pending":
        return "bg-yellow-500/10 text-yellow-400";

      case "failed":
        return "bg-red-500/10 text-red-400";

      default:
        return "bg-gray-500/10 text-gray-400";
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="min-h-screen bg-[#0f1115] px-6 py-10 text-white md:px-10">
      <div className="mx-auto max-w-5xl">

        {/* HEADER */}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to="/"
              className="text-sm text-gray-400 transition hover:text-white"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-5 text-3xl font-bold">
              Upload to HomeMesh
            </h1>

            <p className="mt-2 text-gray-400">
              Send a photo directly to one of
              your connected devices.
            </p>
          </div>
        </div>

        {/* UPLOAD CARD */}

        <form
          onSubmit={handleUpload}
          className="mt-10 rounded-2xl border border-white/10 bg-[#171a21] p-6 md:p-8"
        >

          {/* FILE */}

          <div>
            <label
              htmlFor="photo-upload"
              className="text-sm font-medium text-gray-200"
            >
              Select Photo
            </label>

            <div className="mt-3 rounded-xl border border-dashed border-white/20 bg-[#111318] p-6">
              <input
                id="photo-upload"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black hover:file:bg-gray-200"
              />

              {file && (
                <div className="mt-4 rounded-lg bg-white/5 p-4">
                  <p className="truncate text-sm font-medium">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatBytes(file.size)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* DEVICE */}

          <div className="mt-7">
            <label
              htmlFor="target-device"
              className="text-sm font-medium text-gray-200"
            >
              Store on Device
            </label>

            {loadingDevices ? (
              <div className="mt-3 rounded-xl border border-white/10 bg-[#111318] p-4 text-sm text-gray-500">
                Loading devices...
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
                className="mt-3 w-full rounded-xl border border-white/10 bg-[#111318] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
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
                      ? "• Online"
                      : `• ${device.status}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* SELECTED DEVICE */}

          {selectedDevice && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              {(() => {
                const device =
                  devices.find(
                    (item) =>
                      item.id === selectedDevice
                  );

                if (!device) return null;

                return (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {device.name}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {device.hostname ||
                          "No hostname"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs ${getStatusClass(
                        device.status
                      )}`}
                    >
                      ● {device.status}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="mt-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-400">
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
            className="mt-7 w-full rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading
              ? "Uploading..."
              : "Send to Device"}
          </button>

        </form>

        {/* TRANSFERS */}

        <section className="mt-10">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Recent Transfers
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Files moving through your
                HomeMesh.
              </p>
            </div>

            {loadingTransfers && (
              <span className="text-xs text-gray-500">
                Refreshing...
              </span>
            )}
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#171a21]">

            {transfers.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No transfers yet.
              </div>
            ) : (
              <div className="divide-y divide-white/5">

                {transfers.map(
                  (transfer) => {
                    const device =
                      devices.find(
                        (item) =>
                          item.id ===
                          transfer.target_device_id
                      );

                    return (
                      <div
                        key={transfer.id}
                        className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                      >

                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {transfer.file_name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {formatBytes(
                              transfer.file_size
                            )}

                            {" • "}

                            {device?.name ||
                              "Unknown device"}
                          </p>
                        </div>

                        <span
                          className={`w-fit rounded-full px-3 py-1 text-xs ${getStatusClass(
                            transfer.status
                          )}`}
                        >
                          {transfer.status}
                        </span>

                      </div>
                    );
                  }
                )}

              </div>
            )}

          </div>
        </section>

      </div>
    </main>
  );
}