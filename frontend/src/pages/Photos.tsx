import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { api } from "../api/client";
import {
  Image,
  Download,
  Trash2,
  X,
  Filter,
  HardDrive,
  Calendar,
  RefreshCw,
} from "lucide-react";

type DeviceOption = {
  id: string;
  name: string;
};

type PhotoItem = {
  id: string;
  device_id: string;
  device_name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  modified_at: string | null;
  created_at: string;
  uploaded: boolean;
  image_url: string | null;
};

function PhotoImage({
  imageUrl,
  fileName,
}: {
  imageUrl: string;
  fileName: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;
    const loadImage = async () => {
      try {
        const response = await api.get(imageUrl, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(response.data);
        setSrc(objectUrl);
      } catch (error) {
        console.error("Failed to load image:", error);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl]);

  if (loading) {
    return (
      <div className="flex h-48 w-full items-center justify-center bg-slate-900">
        <span className="text-xs text-slate-500">Loading image...</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex h-48 w-full items-center justify-center bg-slate-900 text-slate-600">
        <Image className="h-10 w-10" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={fileName}
      className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Photos() {
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoItem | null>(null);

  useEffect(() => {
    async function loadDevices() {
      try {
        const res = await api.get("/api/v1/devices");
        setDevices(res.data);
      } catch (err) {
        console.error("Failed to load devices", err);
      }
    }
    loadDevices();
  }, []);

  useEffect(() => {
    async function loadPhotos() {
      setLoading(true);
      try {
        const url = selectedDeviceId
          ? `/api/v1/photos?device_id=${selectedDeviceId}`
          : "/api/v1/photos";
        const res = await api.get(url);
        setPhotos(res.data);
      } catch (err) {
        console.error("Failed to load photos", err);
      } finally {
        setLoading(false);
      }
    }
    loadPhotos();
  }, [selectedDeviceId]);

  async function handleDownload(photo: PhotoItem, event: React.MouseEvent) {
    event.stopPropagation();
    try {
      const response = await api.get(`/api/v1/photos/${photo.id}/download`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", photo.file_name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download photo file.");
    }
  }

  async function handleDelete(photoId: string, event: React.MouseEvent) {
    event.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this photo record?")) {
      return;
    }
    try {
      await api.delete(`/api/v1/photos/${photoId}`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
      }
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete photo.");
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-100">
      <Sidebar />

      <main className="flex-1 p-6 md:p-10 md:ml-64">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Photo Gallery</h1>
              <p className="mt-1 text-xs text-slate-400">
                View and manage photos discovered across your registered HomeMesh devices.
              </p>
            </div>

            {/* Device Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-blue-500"
              >
                <option value="">All Devices</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Photos Grid */}
          {loading ? (
            <div className="mt-8 flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-[#151c28]">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                Loading photos...
              </div>
            </div>
          ) : photos.length === 0 ? (
            <div className="mt-8 rounded-xl border border-slate-800 bg-[#151c28] p-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                <Image className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-white">No Photos Found</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                {selectedDeviceId
                  ? "No photos found on the selected device."
                  : "No photos scanned yet from any connected HomeMesh agent."}
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    if (photo.uploaded && photo.image_url) {
                      setSelectedPhoto(photo);
                    }
                  }}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#151c28] transition-all hover:border-slate-700 shadow-sm"
                >
                  <div className="relative overflow-hidden cursor-pointer">
                    {photo.uploaded && photo.image_url ? (
                      <PhotoImage imageUrl={photo.image_url} fileName={photo.file_name} />
                    ) : (
                      <div className="flex h-48 w-full flex-col items-center justify-center bg-slate-900 text-slate-500">
                        <Image className="h-8 w-8 opacity-40" />
                        <span className="mt-2 text-[11px] text-slate-500">Pending upload</span>
                      </div>
                    )}

                    <span className="absolute top-2 left-2 flex items-center gap-1 rounded bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 backdrop-blur-sm border border-slate-800">
                      <HardDrive className="h-3 w-3 text-blue-400" />
                      {photo.device_name}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-3.5">
                    <p
                      className="truncate text-xs font-semibold text-white group-hover:text-blue-400 transition-colors"
                      title={photo.file_name}
                    >
                      {photo.file_name}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{formatBytes(photo.file_size)}</span>
                      {photo.modified_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-500" />
                          {new Date(photo.modified_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-2.5">
                      {photo.uploaded ? (
                        <button
                          onClick={(e) => handleDownload(photo, e)}
                          className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">Scanning...</span>
                      )}

                      <button
                        onClick={(e) => handleDelete(photo.id, e)}
                        className="rounded-md border border-red-500/20 bg-red-500/10 p-1 text-[11px] text-red-400 transition-colors hover:bg-red-500/20"
                        title="Delete photo record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Fullscreen Photo Modal */}
      {selectedPhoto && selectedPhoto.image_url && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedPhoto(null)}
            className="absolute right-6 top-6 z-10 rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close photo viewer"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative flex max-h-[90vh] max-w-[90vw] flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <PhotoImage imageUrl={selectedPhoto.image_url} fileName={selectedPhoto.file_name} />

            <div className="mt-4 flex items-center gap-3 text-xs text-slate-300 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-lg">
              <span className="font-semibold text-white">{selectedPhoto.file_name}</span>
              <span>·</span>
              <span>{selectedPhoto.device_name}</span>
              <span>·</span>
              <span>{formatBytes(selectedPhoto.file_size)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

