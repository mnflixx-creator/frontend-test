import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Menu } from "@/components/player/internals/ContextMenu";
import { useOverlayRouter } from "@/hooks/useOverlayRouter";
import { useMnflixAuth } from "@/stores/mnflixAuth";
import { usePlayerStore } from "@/stores/player/store";
import { conf } from "@/setup/config";
import { useParams } from "react-router-dom";

const TEXT = {
  mn: {
    title: "Алдаа мэдээлэх",
    hint: (t: string) => `“${t}” контентын алдааг тайлбарлаарай.`,
    placeholder: "Жишээ нь: хадмал алдаатай, тоглогдохгүй, дуу зөрж байна гэх мэт...",
    cancel: "Болих",
    send: "Илгээх",
    sending: "Илгээж байна…",
    ok: "Мэдээлэл хүлээн авлаа. Баярлалаа.",
    error: "Алдаа гарлаа. Дараа дахин оролдоно уу.",
    needLogin: "Нэвтэрсний дараа илгээх боломжтой.",
    needMessage: "Тайлбар бичнэ үү.",
  },
  en: {
    title: "Report a problem",
    hint: (t: string) => `Describe the issue for “${t}”.`,
    placeholder: "Example: subtitles are wrong, video won't play, audio out of sync...",
    cancel: "Cancel",
    send: "Send",
    sending: "Sending…",
    ok: "Received. Thank you!",
    error: "Something went wrong. Please try again.",
    needLogin: "Please log in to send a report.",
    needMessage: "Please enter a message.",
  },
} as const;

export function ReportProblemView({ id }: { id: string }) {
  const { t } = useTranslation();
  const router = useOverlayRouter(id);
  const params = useParams();

  const token = useMnflixAuth((s) => s.token);
  const API_BASE = import.meta.env.VITE_API_URL || conf().BACKEND_URL;

  // Try to get movie id/title from player store (works even if structure changes)
  const meta = usePlayerStore((s: any) => s.meta || s.playerMeta || s.progress?.meta);
  const movieId =
    meta?.mnflixId ||
    meta?._id ||
    meta?.movieId ||
    meta?.contentId ||
    meta?.id; // tmdbId as LAST fallback

  const title =
    meta?.title ||
    meta?.name ||
    meta?.displayTitle ||
    meta?.originalTitle ||
    meta?.tmdbTitle ||
    "this title";

  const lang = (usePlayerStore as any)((s: any) => s?.language) || "mn"; // if you have it
  const appLang = (t as any)?.i18n?.language || lang || "mn";
  const L = useMemo(() => {
    const key = String(appLang || "mn").toLowerCase().split("-")[0];
    return (TEXT as any)[key] || TEXT.mn;
  }, [appLang]);

  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"" | "sending" | "ok" | "error">("");
  const [localError, setLocalError] = useState<string>("");

  const submit = async () => {
    setLocalError("");

    if (!token) {
        setLocalError(L.needLogin);
        return;
    }
    if (!message.trim()) {
        setLocalError(L.needMessage);
        return;
    }

    try {
        setStatus("sending");

        const m: any = meta || {};

        console.log("REPORT META", m);

        // ✅ 1) Try Mongo id first (manual/admin movies usually have this)
        let mongoId: string | undefined =
        m.mnflixId || m._id || m.movieId || m.contentId;

        // ✅ 2) Otherwise fallback to TMDB id (most TMDB playback cases)
        const tmdbCandidate =
        m.tmdbId ??
        m.tmdb?.id ??
        m.tmdb?.tmdbId ??
        m.media?.tmdbId ??
        m.media?.id ??
        m.id ??
        m.content?.tmdbId ??
        m.content?.id ??
        m.meta?.tmdbId ??
        m.meta?.id ??
        m.mediaId;

        const tmdbId = Number(tmdbCandidate);

        // ✅ fallback to URL like /mnflix/player/79744
        const urlId = Number((params as any)?.id);
        const finalTmdbId = tmdbId || urlId;

        // If no mongo id, convert TMDB -> Mongo by calling your existing endpoint
        if (!mongoId) {
        if (!finalTmdbId || Number.isNaN(finalTmdbId)) {
            setLocalError("Киноны ID олдсонгүй. Дахин ачаалаад үзнэ үү.");
            setStatus("");
            return;
        }

        // Map player type -> your backend allowed types
        const rawType = String(m.type || m.mediaType || "").toLowerCase();
        const backendType =
            rawType === "movie"
            ? "movie"
            : rawType === "anime"
                ? "anime"
                : rawType === "kdrama"
                ? "kdrama"
                : rawType === "cdrama"
                    ? "cdrama"
                    : "series"; // show/tv -> series

        const byTmdbRes = await fetch(
            `${API_BASE}/api/movies/by-tmdb/${finalTmdbId}?type=${backendType}`,
        );

        if (!byTmdbRes.ok) throw new Error(`by-tmdb HTTP ${byTmdbRes.status}`);

        const doc = await byTmdbRes.json();
        mongoId = doc?._id;

        if (!mongoId) {
            throw new Error("Mongo _id not returned from /by-tmdb");
        }
        }

        // ✅ 3) Now send report using Mongo id
        const res = await fetch(`${API_BASE}/api/movies/${mongoId}/report`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: message.trim() }),
        });

        if (!res.ok) throw new Error(`report HTTP ${res.status}`);

        setStatus("ok");
        setMessage("");

        setTimeout(() => {
        router.navigate("/"); // back to settings menu home
        }, 700);
    } catch (e: any) {
        console.error(e);
        setStatus("error");
    }
    };

  return (
    <>
      <Menu.BackLink onClick={() => router.navigate("/")}>
        {L.title}
      </Menu.BackLink>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
        <div className="text-xs text-white/70">{L.hint(title)}</div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full text-sm bg-black/60 border border-white/20 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#2EA8FF]"
          placeholder={L.placeholder}
        />

        {localError ? (
          <div className="text-[11px] text-red-400">{localError}</div>
        ) : null}

        <div className="flex justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={() => router.navigate("/")}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10"
          >
            {L.cancel}
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={status === "sending" || !message.trim()}
            className="px-3 py-1 rounded-lg bg-[#2EA8FF] hover:bg-[#4FB5FF] text-black font-semibold disabled:opacity-50"
          >
            {status === "sending" ? L.sending : L.send}
          </button>
        </div>

        {status === "ok" ? (
          <div className="text-[11px] text-green-400">{L.ok}</div>
        ) : null}
        {status === "error" ? (
          <div className="text-[11px] text-red-400">{L.error}</div>
        ) : null}
      </div>
    </>
  );
}

export default ReportProblemView;
