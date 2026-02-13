import { useEffect, useRef } from "react";
import { useInterval } from "react-use";

import { playerStatus } from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import { ProgressItem, useProgressStore } from "@/stores/progress";
import { getMovieById, getTvById } from "@/services/movies";

function progressIsNotStarted(duration: number, watched: number): boolean {
  // too short watch time
  if (watched < 20) return true;
  return false;
}

function progressIsCompleted(duration: number, watched: number): boolean {
  const timeFromEnd = duration - watched;
  // too close to the end, is completed
  if (timeFromEnd < 60 * 2) return true;
  return false;
}

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

function normalizePoster(p: any) {
  if (!p) return "";
  if (typeof p === "string" && p.startsWith("/")) return `${TMDB_IMG}${p}`;
  return p;
}

function getYear(m: any, type: "movie" | "show") {
  // ✅ prefer backend year first
  if (m.year) {
    const num = typeof m.year === "string" ? parseInt(m.year, 10) : m.year;
    if (Number.isFinite(num)) return num;
  }

  // ✅ then fallback to these
  if (type === "movie" && m.releaseYear) return Number(m.releaseYear);
  if (type === "show" && m.firstAirYear) return Number(m.firstAirYear);

  // ✅ TMDB style dates
  const d =
    type === "movie"
      ? (m.release_date ?? m.releaseDate)
      : (m.first_air_date ?? m.firstAirDate);

  if (d) {
    const y = new Date(d).getFullYear();
    if (!Number.isNaN(y)) return y;
  }

  // ✅ fallback
  const raw = m.year;
  const num = typeof raw === "string" ? parseInt(raw, 10) : raw;
  return Number.isFinite(num) ? num : undefined;
}

function shouldSaveProgress(
  meta: any,
  progress: ProgressItem,
  existingItems: Record<string, any>,
): boolean {
  const { duration, watched } = progress;

  // Check if progress is acceptable
  const isNotStarted = progressIsNotStarted(duration, watched);
  const isCompleted = progressIsCompleted(duration, watched);
  const isAcceptable = !isNotStarted && !isCompleted;

  // For movies, only save if acceptable
  if (meta.type === "movie") {
    return isAcceptable;
  }

  // For shows, save if acceptable OR if season has other watched episodes
  if (isAcceptable) return true;

  // Check if this season has other episodes with progress
  const showItem = existingItems[meta.tmdbId];
  if (!showItem || !meta.season) return false;

  const seasonEpisodes = Object.values(showItem.episodes).filter(
    (episode: any) => episode.seasonId === meta.season.tmdbId,
  );

  // Check if any other episode in this season has acceptable progress
  return seasonEpisodes.some((episode: any) => {
    const epProgress = episode.progress;
    return (
      !progressIsNotStarted(epProgress.duration, epProgress.watched) &&
      !progressIsCompleted(epProgress.duration, epProgress.watched)
    );
  });
}

export function ProgressSaver() {
  const meta = usePlayerStore((s) => s.meta);
  const progress = usePlayerStore((s) => s.progress);
  const updateItem = useProgressStore((s) => s.updateItem);
  const progressItems = useProgressStore((s) => s.items);
  const status = usePlayerStore((s) => s.status);
  const hasPlayedOnce = usePlayerStore((s) => s.mediaPlaying.hasPlayedOnce);

  const lastSavedRef = useRef<ProgressItem | null>(null);

  const savingRef = useRef(false);

  const dataRef = useRef({
    updateItem,
    progressItems,
    meta,
    progress,
    status,
    hasPlayedOnce,
  });
  useEffect(() => {
    dataRef.current.updateItem = updateItem;
    dataRef.current.progressItems = progressItems;
    dataRef.current.meta = meta;
    dataRef.current.progress = progress;
    dataRef.current.status = status;
    dataRef.current.hasPlayedOnce = hasPlayedOnce;
  }, [updateItem, progressItems, progress, meta, status, hasPlayedOnce]);

  useInterval(async () => {
    const d = dataRef.current;
    if (!d.progress || !d.meta || !d.updateItem) return;
    if (d.status !== playerStatus.PLAYING) return;
    if (!d.hasPlayedOnce) return;

    let isDifferent = false;
    if (!lastSavedRef.current) isDifferent = true;
    else if (
      lastSavedRef.current?.duration !== d.progress.duration ||
      lastSavedRef.current?.watched !== d.progress.time
    )
      isDifferent = true;

    lastSavedRef.current = {
      duration: d.progress.duration,
      watched: d.progress.time,
    };
    if (
  isDifferent &&
    shouldSaveProgress(d.meta, lastSavedRef.current, d.progressItems)
  ) {
    if (savingRef.current) return;
    savingRef.current = true;

    try {
      const m: any = d.meta;
      console.log("PROGRESS META", m);

      const tmdbId = m.tmdbId ?? m.id ?? m.tmdb?.id;
      if (!tmdbId) return;

      const title =
        m.title ?? m.name ?? m.original_title ?? m.original_name ?? "";

      const type = m.type === "movie" ? "movie" : "show";

      const poster = normalizePoster(
        m.poster ??
          m.posterUrl ??
          m.poster_path ??
          m.posterPath ??
          m.thumbnail ??
          m.banner ??
          m.backdrop ??
          m.backdrop_path ??
          ""
      );

      const year = getYear(m, type);

      let posterFinal = poster;
      let yearFinal = year;

      const currentYear = new Date().getFullYear();

      if (!posterFinal || !yearFinal || yearFinal > currentYear) {
        const details =
          type === "movie"
            ? await getMovieById(Number(tmdbId))
            : await getTvById(Number(tmdbId));
        
        // ✅ ADD THIS LINE HERE
        console.log("DETAILS YEAR RAW", {
          year: details?.year,
          first_air_date: details?.first_air_date,
          release_date: details?.release_date,
          firstAirDate: details?.firstAirDate,
          releaseDate: details?.releaseDate,
        });

        console.log("DETAILS KEYS", Object.keys(details || {}));

        const detailsPoster =
          details?.poster ??
          details?.posterUrl ??
          details?.thumbnail ??          // backend
          details?.banner ??             // backend
          details?.poster_path ??        // TMDB
          details?.posterPath ??
          details?.backdrop_path ??      // TMDB
          details?.backdropPath ??
          details?.image ??
          details?.cover ??
          details?.backdrop;

        const detailsYearRaw =
          type === "show"
            ? (details?.first_air_date ??
              details?.firstAirDate ??
              details?.releaseDate ??      // ✅ ADD THIS
              details?.firstAirYear ??
              details?.year)
            : (details?.release_date ??
              details?.releaseDate ??
              details?.releaseYear ??
              details?.year);

        console.log("SHOW DETAILS DATE", details?.first_air_date, details?.firstAirDate, details?.firstAirYear);
       
        let detailsYear: number | undefined = undefined;

        // if it's already a number-like year
        if (typeof detailsYearRaw === "number") detailsYear = detailsYearRaw;
        else if (typeof detailsYearRaw === "string") {
          // if it's a date string, extract year; if it's "2018", parse it
          const y =
            detailsYearRaw.includes("-")
              ? new Date(detailsYearRaw).getFullYear()
              : parseInt(detailsYearRaw, 10);
          if (!Number.isNaN(y)) detailsYear = y;
        }

        if (!posterFinal) posterFinal = normalizePoster(detailsPoster);
        if (detailsYear) yearFinal = detailsYear;
      }

      d.updateItem({
        meta: {
          ...m,
          tmdbId,
          id: tmdbId,
          type,
          title,
          poster: posterFinal,

          // ✅ the “display year”
          year: yearFinal,

          // ✅ IMPORTANT: overwrite these too (your UI is likely reading them)
          releaseYear: yearFinal,
          firstAirYear: yearFinal,
        },
        progress: lastSavedRef.current,
      });
    } finally {
      savingRef.current = false;
    }
  }
  }, 3000);

  return null;
}
