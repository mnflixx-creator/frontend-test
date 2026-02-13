import { useEffect, useMemo, useState } from "react";
import { useMnflixAuth } from "@/stores/mnflixAuth";
import { conf } from "@/setup/config";

type HistItem = {
  _id?: string;
  amount?: number;
  status?: string; // "success" etc
  paidBy?: string; // "card", "golomt-email", ...
  startAt?: string;
  endAt?: string;
  createdAt?: string;
};

type UiItem = {
  _id?: string;
  amount: number;
  createdAt: string;
  status: "paid" | "pending" | "failed";
  method?: "bank" | "card";
  startAt?: string;
  endAt?: string;
};

export function SubscriptionHistory() {
  const token = useMnflixAuth((s) => s.token);
  const API_BASE = import.meta.env.VITE_API_URL || conf().BACKEND_URL;

  const [items, setItems] = useState<UiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  // ✅ summary fields
  const [email, setEmail] = useState<string>("");
  const [subStatus, setSubStatus] = useState<string>("");
  const [startAt, setStartAt] = useState<string | null>(null);
  const [endAt, setEndAt] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setErr("");

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d?.message || "Failed to load user");

        const user = d?.user;
        setEmail(user?.email || "");
        setSubStatus(user?.subscriptionStatus || "");

        const history: HistItem[] = Array.isArray(user?.subscriptionHistory)
          ? user.subscriptionHistory
          : [];

        // ✅ pick latest subscription from history (last item)
        const latest = history.length ? history[history.length - 1] : null;

        // ✅ choose start/end
        const s = latest?.startAt || latest?.createdAt || null;
        const e = user?.subscriptionExpiresAt || latest?.endAt || null;

        setStartAt(s);
        setEndAt(e);

        // ✅ map list (newest first)
        const mapped: UiItem[] = history
            .slice()
            .reverse()
            .slice(0, 3) // ✅ ONLY LAST 3
            .map((it: any, idx: number) => ({
                _id: it._id || String(idx),
                amount: Number(it.amount || 0),
                createdAt: it.startAt || it.createdAt || new Date().toISOString(),
                status: it.status === "success" ? "paid" : "failed",
                method: String(it.paidBy || "").includes("card") ? "card" : "bank",
                startAt: it.startAt,
                endAt: it.endAt,
            }));

        setItems(mapped);
      })
      .catch((e) => {
        setErr(String(e?.message || e));
        setItems([]);
        setStartAt(null);
        setEndAt(null);
      })
      .finally(() => setLoading(false));
  }, [token, API_BASE]);

  const fmt = (d: string | null) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString();
  };

  const daysLeft = useMemo(() => {
    if (!endAt) return null;
    const end = new Date(endAt).getTime();
    if (Number.isNaN(end)) return null;
    const diff = end - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [endAt]);

  if (!token) return null;

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
      {/* ✅ TOP SUMMARY (Start / End / Remaining) */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-bold text-white">Subscription</div>

        <span
          className={[
            "text-xs px-2 py-1 rounded-full border border-white/10",
            subStatus === "active" ? "text-green-300" : "text-red-300",
          ].join(" ")}
        >
          {subStatus || "unknown"}
        </span>
      </div>

      {email ? <div className="mt-1 text-white/60 text-sm">{email}</div> : null}

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-white/60 text-xs">Start</div>
          <div className="text-white font-semibold mt-1">{fmt(startAt)}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-white/60 text-xs">End</div>
          <div className="text-white font-semibold mt-1">{fmt(endAt)}</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3">
          <div className="text-white/60 text-xs">Remaining</div>
          <div className="text-white font-semibold mt-1">
            {daysLeft === null ? "—" : `${Math.max(daysLeft, 0)} days`}
          </div>
        </div>
      </div>

      {/* ✅ HISTORY LIST */}
      <div className="mt-6 text-lg font-bold text-white">Subscription history</div>

      {loading && items.length === 0 ? (
        <div className="mt-3 text-white/60">Loading…</div>
      ) : null}
      {err ? <div className="mt-3 text-red-400">{err}</div> : null}

      {!loading && !err && items.length === 0 ? (
        <div className="mt-3 text-white/60">No subscriptions yet.</div>
      ) : null}

      <div className="mt-3 space-y-2">
        {items.map((x) => (
          <div
            key={x._id || x.createdAt}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3"
          >
            <div>
              <div className="text-white font-semibold">{x.amount}₮</div>
              <div className="text-xs text-white/60">
                {x.startAt && x.endAt
                  ? `${new Date(x.startAt).toLocaleString()} → ${new Date(
                      x.endAt,
                    ).toLocaleString()}`
                  : new Date(x.createdAt).toLocaleString()}
              </div>
            </div>

            <span className="text-xs px-2 py-1 rounded-full border border-white/10 text-white/80">
              {x.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
