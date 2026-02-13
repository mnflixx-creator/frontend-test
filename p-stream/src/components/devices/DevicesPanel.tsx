import { useEffect, useState } from "react";
import { useMnflixAuth } from "@/stores/mnflixAuth";
import { conf } from "@/setup/config";

type ApiDevice = {
  deviceId: string;
  deviceName?: string;
  lastActive?: string;
  lastIP?: string;
};

export function DevicesPanel() {
  const token = useMnflixAuth((s) => s.token);
  const API_BASE = import.meta.env.VITE_API_URL || conf().BACKEND_URL;

  const [devices, setDevices] = useState<ApiDevice[]>([]);
  const [activeStreamDeviceId, setActiveStreamDeviceId] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    if (!token) return;
    setLoading(true);
    setErr("");

    try {
      const myDeviceId = localStorage.getItem("deviceId") || "";

      const res = await fetch(`${API_BASE}/api/account/devices`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-device-id": myDeviceId, // ✅ lets backend tell which one is “this device”
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load devices");

      setDevices(Array.isArray(data?.devices) ? data.devices : []);
      setActiveStreamDeviceId(data?.activeStreamDeviceId || null);
      setCurrentDeviceId(data?.currentDeviceId || null);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function removeDevice(deviceId: string) {
    if (!token) return;
    if (!confirm("Remove this device? It will be logged out.")) return;

    const res = await fetch(`${API_BASE}/api/account/devices/${deviceId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.message || "Failed to remove device");
      return;
    }

    setDevices((prev) => prev.filter((d) => d.deviceId !== deviceId));
    if (activeStreamDeviceId === deviceId) setActiveStreamDeviceId(null);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (!token) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white/70">
        Login required.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-white">
      <div className="flex items-center justify-between">
        <div className="text-lg font-bold">Devices</div>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading ? <div className="mt-3 text-white/60">Loading…</div> : null}
      {err ? <div className="mt-3 text-red-400">{err}</div> : null}

      <div className="mt-3 space-y-2">
        {devices.map((d) => {
          const isThisDevice = currentDeviceId === d.deviceId;
          const isActive = activeStreamDeviceId === d.deviceId;

          return (
            <div
              key={d.deviceId}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3"
            >
              <div>
                <div className="font-semibold">
                  {d.deviceName || "Device"}{" "}
                  {isThisDevice ? (
                    <span className="text-xs text-white/60">(this device)</span>
                  ) : null}
                  {isActive ? (
                    <span className="ml-2 text-xs text-green-300/80">(currently streaming)</span>
                  ) : null}
                </div>

                <div className="text-xs text-white/60">
                  {d.lastActive ? `Last active: ${new Date(d.lastActive).toLocaleString()}` : ""}
                  {d.lastIP ? ` • IP: ${d.lastIP}` : ""}
                </div>

                <div className="text-xs text-white/40 font-mono mt-1">
                  ID: {d.deviceId}
                </div>
              </div>

              {!isThisDevice ? (
                <button
                  onClick={() => removeDevice(d.deviceId)}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-sm text-red-200"
                >
                  Remove
                </button>
              ) : (
                <span className="text-xs text-white/60">Current</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
