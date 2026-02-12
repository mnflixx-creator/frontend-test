import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { Loading } from "@/components/layout/Loading";
import { usePlayer } from "@/components/player/hooks/usePlayer";
import { Menu } from "@/components/player/internals/ContextMenu";
import { SelectableLink } from "@/components/player/internals/ContextMenu/Links";
import { PlaybackErrorPart } from "@/pages/parts/player/PlaybackErrorPart";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import { getMovieById, getTvById } from "@/services/movies";
import { getZentlifyStreams } from "@/services/streaming";
import type { ZentlifyStream, ZentlifySubtitle } from "@/services/streaming";
import { usePlayerStore } from "@/stores/player/store";

import {
  CaptionListItem,
  PlayerMeta,
  playerStatus,
} from "@/stores/player/slices/source";
import {
  SourceQuality,
  SourceSliceSource,
} from "@/stores/player/utils/qualities";
import type { Movie } from "@/types/movie";

// Forced provider order - matches backend priority
const PROVIDER_ORDER = [
  "flux",
  "lush",
  "flow",
  "sonata",
  "zen",
  "breeze",
  "nova",
  "neko",
] as const;

interface ProviderGroup {
  provider: string;
  streams: ZentlifyStream[];
  qualities: string[];
}

const PLAYER_CACHE = new Map<
  string,
  {
    movieData: Movie;
    zentlifyData: any;
    grouped: ProviderGroup[];
    captions: CaptionListItem[];
    selectedProvider: string | null;
    selectedQuality: string | null;
    isZenFallback: boolean;
  }
>();

/**
 * Maps Zentlify stream quality to SourceQuality format
 */
function mapQuality(quality: string): SourceQuality {
  const normalizedQuality = quality.toLowerCase();

  if (normalizedQuality.includes("4k") || normalizedQuality.includes("2160")) {
    return "4k";
  }
  if (normalizedQuality.includes("1080")) {
    return "1080";
  }
  if (normalizedQuality.includes("720")) {
    return "720";
  }
  if (normalizedQuality.includes("480")) {
    return "480";
  }
  if (normalizedQuality.includes("360")) {
    return "360";
  }
  return "unknown";
}

/**
 * Groups streams by unique provider in forced order
 */
function groupStreamsByProvider(streams: ZentlifyStream[]): ProviderGroup[] {
  const providerMap = new Map<string, ZentlifyStream[]>();

  // Group streams by provider
  streams.forEach((stream) => {
    const provider = stream.provider.toLowerCase();
    if (!providerMap.has(provider)) {
      providerMap.set(provider, []);
    }
    providerMap.get(provider)!.push(stream);
  });

  // Create ordered list of unique providers
  const orderedProviders: ProviderGroup[] = [];

  PROVIDER_ORDER.forEach((providerName) => {
    const providerStreams = providerMap.get(providerName);
    if (providerStreams && providerStreams.length > 0) {
      const uniqueQualities = [
        ...new Set(providerStreams.map((s) => s.quality)),
      ];
      orderedProviders.push({
        provider: providerName,
        streams: providerStreams,
        qualities: uniqueQualities,
      });
      providerMap.delete(providerName);
    }
  });

  // Add any remaining providers not in the forced order
  providerMap.forEach((providerStreams, provider) => {
    const uniqueQualities = [...new Set(providerStreams.map((s) => s.quality))];
    orderedProviders.push({
      provider,
      streams: providerStreams,
      qualities: uniqueQualities,
    });
  });

  return orderedProviders;
}

function getStreamUrl(stream: any) {
  return stream?.file ?? stream?.url ?? "";
}

function pickSubtitlesFromResponse(zentlifyData: any): any[] {
  if (Array.isArray(zentlifyData?.subtitles)) return zentlifyData.subtitles;

  const all: any[] = [];
  for (const s of zentlifyData?.streams ?? []) {
    if (Array.isArray(s?.subtitles)) all.push(...s.subtitles);
  }
  return all;
}

/**
 * Converts Zentlify subtitles to CaptionListItem format expected by the player
 */
function toLangCode(x?: string) {
  const s = (x || "").toLowerCase();
  if (s.includes("mong") || s.includes("мон")) return "mn";
  if (s.includes("eng") || s.includes("english")) return "en";
  if (s.includes("kor") || s.includes("korean")) return "ko";
  if (s.includes("jpn") || s.includes("japanese")) return "ja";
  return "und";
}

function convertSubtitlesToCaptions(subtitles: any[] | undefined): CaptionListItem[] {
  if (!subtitles?.length) return [];

  return subtitles
    .map((s, index) => {
      const url = s.url || s.file;
      if (!url) return null;

      const label = s.label || s.language || `Subtitle ${index + 1}`;

      return {
        id: `zentlify-sub-${index}-${label}`,
        language: toLangCode(s.language || s.label),
        url,
        type: s.type || "vtt",     // ✅ important
        needsProxy: false,
        display: label,
      } as CaptionListItem;
    })
    .filter(Boolean) as CaptionListItem[];
}

/**
 * Converts a single Zentlify stream to SourceSliceSource format expected by the player
 */
function convertZentlifyStreamToSource(stream: any): SourceSliceSource | null {
  if (!stream) return null;

  const u = getStreamUrl(stream);
  if (!u) return null;

  const looksLikeHls =
    stream.type === "hls" ||
    u.includes("/cdn/pl") ||
    u.includes(".m3u8");

  if (looksLikeHls) {
    return { type: "hls", url: u };
  }

  if (stream.type === "mp4" || u.includes(".mp4")) {
    const quality = mapQuality(stream.quality || "");
    const qualities: Partial<Record<SourceQuality, { type: "mp4"; url: string }>> = {};
    qualities[quality] = { type: "mp4", url: u };
    return { type: "file", qualities };
  }

  // fallback
  return { type: "hls", url: u };
}

/**
 * Provider and quality selection component
 */
function ProviderQualitySelector({
  providerGroups,
  selectedProvider,
  selectedQuality,
  onSelectProvider,
  onSelectQuality,
  show,
  onClose,
}: {
  providerGroups: ProviderGroup[];
  selectedProvider: string | null;
  selectedQuality: string | null;
  onSelectProvider: (provider: string) => void;
  onSelectQuality: (quality: string) => void;
  show: boolean;
  onClose: () => void;
}) {
  const [view, setView] = useState<"provider" | "quality">("provider");

  // Reset to provider view when selector is shown
  useEffect(() => {
    if (show) {
      setView("provider");
    }
  }, [show]);

  if (!show) return null;

  const selectedProviderGroup = providerGroups.find(
    (pg) => pg.provider === selectedProvider,
  );

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="w-full max-w-md h-[50vh] flex flex-col">
        <Menu.CardWithScrollable>
          {view === "provider" ? (
            <>
              <Menu.BackLink onClick={onClose}>Select Provider</Menu.BackLink>
              <Menu.Section className="pb-4">
                {providerGroups.map((pg) => {
                  const isCurrent = pg.provider === selectedProvider;
                  return (
                    <SelectableLink
                      key={pg.provider}
                      onClick={() => {
                        onSelectProvider(pg.provider);
                        setView("quality");
                      }}
                      selected={isCurrent}
                    >
                      <span className="flex flex-col">
                        <span className="capitalize">
                          {pg.provider}
                          {isCurrent && " (current)"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {pg.qualities.length} quality option
                          {pg.qualities.length !== 1 ? "s" : ""}
                        </span>
                      </span>
                    </SelectableLink>
                  );
                })}
              </Menu.Section>
            </>
          ) : (
            <>
              <Menu.BackLink onClick={() => setView("provider")}>
                <span className="capitalize">{selectedProvider}</span> - Select
                Quality
              </Menu.BackLink>
              <Menu.Section className="pb-4">
                {selectedProviderGroup?.qualities.map((quality) => {
                  const isCurrent = quality === selectedQuality;
                  return (
                    <SelectableLink
                      key={quality}
                      onClick={() => {
                        onSelectQuality(quality);
                        onClose();
                      }}
                      selected={isCurrent}
                    >
                      <span className="flex flex-col">
                        <span>
                          {quality}
                          {isCurrent && " (current)"}
                        </span>
                      </span>
                    </SelectableLink>
                  );
                })}
              </Menu.Section>
            </>
          )}
        </Menu.CardWithScrollable>
      </div>
    </div>
  );
}

function pushCaptionsToStore(list: CaptionListItem[]) {
  usePlayerStore.setState((state: any) => {
    state.caption = state.caption ?? {};

    // try common caption fields
    if (Array.isArray(state.caption.list)) state.caption.list = list;
    if (Array.isArray(state.caption.items)) state.caption.items = list;
    if (Array.isArray(state.caption.tracks)) state.caption.tracks = list;

    // if none exist, create list
    if (
      !Array.isArray(state.caption.list) &&
      !Array.isArray(state.caption.items) &&
      !Array.isArray(state.caption.tracks)
    ) {
      state.caption.list = list;
    }

    state.caption.selected = state.caption.selected ?? null;
  });
}

export function MNFLIXPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { status, playMedia, setMeta, setStatus } = usePlayer();
  const [_movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerGroups, setProviderGroups] = useState<ProviderGroup[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string | null>(null);
  const [_failedStreams, setFailedStreams] = useState<Set<string>>(new Set());
  const [captions, setCaptions] = useState<CaptionListItem[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const title = searchParams.get("title") || "";
  const year = searchParams.get("year") || "";
  const season = searchParams.get("season") || "";
  const episode = searchParams.get("episode") || "";
  const location = useLocation();
  const navigate = useNavigate();
  const [isTransitioningEpisode, setIsTransitioningEpisode] = useState(false);

  const selectedCustomSourceId = usePlayerStore((s: any) => s.selectedCustomSourceId);

  const contentKey = `${id}|${title}|${year}|${season}|${episode}`;

  const loadedKeyRef = useRef<string>("");

  const lastPlayedRef = useRef<string>(""); // provider|quality|file

  // Zen provider fallback tracking
  const [zenStreamIndex, setZenStreamIndex] = useState(0);
  const [isZenFallback, setIsZenFallback] = useState(false);
  const hasTriedAllStreams = useRef(false);
  const isManualSelection = useRef(false);

  // Store stable references to avoid unnecessary re-renders
  const setMetaRef = useRef(setMeta);
  const setStatusRef = useRef(setStatus);
  const playMediaRef = useRef(playMedia);

  // Keep refs updated
  useEffect(() => {
    setMetaRef.current = setMeta;
    setStatusRef.current = setStatus;
    playMediaRef.current = playMedia;
  }, [setMeta, setStatus, playMedia]);

  // Log helper function - stable function with no dependencies
  // Remove from callback deps to prevent unnecessary re-renders
  const logProvider = (message: string, details?: any) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log(`[MNFLIX Player] ${message}`, details || "");
    }
  };

  // Get current stream based on provider and quality
  const getCurrentStream = useCallback((): ZentlifyStream | null => {
    if (!selectedProvider || !selectedQuality) return null;

    const providerGroup = providerGroups.find(
      (pg) => pg.provider === selectedProvider,
    );
    if (!providerGroup) return null;

    // For zen provider, use zen fallback logic
    if (selectedProvider === "zen" && isZenFallback) {
      return providerGroup.streams[zenStreamIndex] || null;
    }

    // Find stream matching the selected quality
    const stream = providerGroup.streams.find(
      (s) => s.quality === selectedQuality,
    );
    return stream || providerGroup.streams[0] || null;
  }, [
    selectedProvider,
    selectedQuality,
    providerGroups,
    isZenFallback,
    zenStreamIndex,
  ]);

    const handleMetaChange = useCallback(
    (m: PlayerMeta) => {
      setMetaRef.current(m);

      if (m?.type === "show" && m?.season?.number && m?.episode?.number) {
        setIsTransitioningEpisode(true);

        const sp = new URLSearchParams(searchParams);
        sp.set("season", String(m.season.number));
        sp.set("episode", String(m.episode.number));
        if (m.title) sp.set("title", m.title);
        if (m.releaseYear) sp.set("year", String(m.releaseYear));

        PLAYER_CACHE.clear();

        navigate(
          { pathname: location.pathname, search: `?${sp.toString()}` },
          { replace: true },
        );
      }
    },
    [navigate, location.pathname, searchParams, contentKey],
  );

  useEffect(() => {
    setIsTransitioningEpisode(true); // ✅ still transitioning
    setIsLoading(true);              // ✅ show loading immediately

    setProviderGroups([]);
    setSelectedProvider(null);
    setSelectedQuality(null);
    setCaptions([]);
    setError(null);

    setIsZenFallback(false);
    setZenStreamIndex(0);
    setFailedStreams(new Set());

    lastPlayedRef.current = "";
    loadedKeyRef.current = "";
  }, [id, season, episode]);

  // Try to play the current stream
  const tryCurrentStream = useCallback(async () => {
    const stream = getCurrentStream();
    if (!stream) {
      logProvider("No stream available for current selection");
      setError("No stream available");
      return;
    }

    logProvider(`Trying stream`, {
      provider: stream.provider,
      quality: stream.quality,
      type: stream.type,
      url: getStreamUrl(stream),
    });

    const source = convertZentlifyStreamToSource(stream);
    if (!source) {
      logProvider("Stream has no compatible format");
      setFailedStreams((prev) => new Set(prev).add(getStreamUrl(stream)));

      // For zen, try next stream
      if (selectedProvider === "zen" && isZenFallback) {
        const providerGroup = providerGroups.find(
          (pg) => pg.provider === "zen",
        );
        if (
          providerGroup &&
          zenStreamIndex < providerGroup.streams.length - 1
        ) {
          setZenStreamIndex(zenStreamIndex + 1);
          return;
        }
      }

      setError("Stream format not supported");
      return;
    }

    const playKey = `${stream.provider}|${stream.quality}|${getStreamUrl(stream)}|subs:${captions.length}`;

    if (lastPlayedRef.current === playKey) {
      // ✅ already playing this exact stream, do NOT restart
      return;
    }

    lastPlayedRef.current = playKey;

    usePlayerStore.getState().setPlayingCustomSourceId(stream.provider?.toLowerCase() || null);
    playMediaRef.current(source, captions, null);
    setError(null);

    if (isManualSelection.current) {
      isManualSelection.current = false;
    }
  }, [
    getCurrentStream,
    captions,
    logProvider,
    selectedProvider,
    isZenFallback,
    zenStreamIndex,
    providerGroups,
  ]);

  // Handle provider selection
  const handleProviderSelect = useCallback(
    (provider: string) => {
      lastPlayedRef.current = "";
      logProvider(`Manual provider selection: ${provider}`);
      setSelectedProvider(provider);
      setIsZenFallback(provider === "zen");
      setZenStreamIndex(0);

      // Auto-select first quality for the provider
      const providerGroup = providerGroups.find(
        (pg) => pg.provider === provider,
      );
      if (providerGroup && providerGroup.qualities.length > 0) {
        setSelectedQuality(providerGroup.qualities[0]);
      }

      isManualSelection.current = true;
      hasTriedAllStreams.current = false;
    },
    [providerGroups],
  );

  // Handle quality selection
  const handleQualitySelect = useCallback(
    (quality: string) => {
      lastPlayedRef.current = "";
      logProvider(`Manual quality selection: ${quality}`);
      setSelectedQuality(quality);
      setZenStreamIndex(0); // Reset zen index when changing quality
      isManualSelection.current = true;
    },
    [],
  );

  useEffect(() => {
    if (isLoading) return; // ✅ IMPORTANT: don't fight while loading
    if (!selectedCustomSourceId) return;

    // if user picked a provider from Settings -> switch provider
    if (selectedProvider !== selectedCustomSourceId) {
      setSelectedProvider(selectedCustomSourceId);

      const pg = providerGroups.find((p) => p.provider === selectedCustomSourceId);

      if (pg?.qualities?.length) {
        setSelectedQuality(pg.qualities[0]);
      } else {
        // ✅ allow player to continue loading; loadMovieAndProviders will set quality later
        setSelectedQuality(null);
      }

      // reset zen fallback properly
      setIsZenFallback(selectedCustomSourceId === "zen");
      setZenStreamIndex(0);

      lastPlayedRef.current = "";
    }
  }, [selectedCustomSourceId, providerGroups, selectedProvider, isLoading]); // ✅ added isLoading

  // Load movie and providers
  const loadMovieAndProviders = useCallback(async () => {
    if (!id) {
      setError("No movie ID provided");
      setIsLoading(false);
      return;
    }

    lastPlayedRef.current = "";

    // ✅ 1) try memory cache first (prevents refetch after remount)
    const cached = PLAYER_CACHE.get(contentKey);
    if (cached) {
      setMovie(cached.movieData);
      setProviderGroups(cached.grouped);
      setCaptions(cached.captions);
      pushCaptionsToStore(cached.captions);

      setSelectedProvider(cached.selectedProvider);
      setSelectedQuality(cached.selectedQuality);
      setIsZenFallback(cached.isZenFallback);
      usePlayerStore.getState().setPlayingCustomSourceId(cached.selectedProvider);

      // ✅ IMPORTANT: set meta even when using cache (needed for Next Episode)
      const isSeries = Boolean(season) && Boolean(episode);

      const playerMeta: PlayerMeta = isSeries
        ? {
            type: "show",
            title:
              title ||
              (cached.movieData as any).title ||
              (cached.movieData as any).name ||
              "Untitled",
            tmdbId: id!,
            releaseYear: year
              ? parseInt(year, 10)
              : (cached.movieData as any).releaseDate
                ? new Date((cached.movieData as any).releaseDate).getFullYear()
                : new Date().getFullYear(),
            poster: (cached.movieData as any).posterPath,
            episode: season && episode
              ? {
                  number: parseInt(episode, 10),
                  tmdbId: `${id}-s${season}e${episode}`,
                  title: `S${season}E${episode}`,
                }
              : undefined,
            episodes: season && episode
            ? [
                {
                  number: parseInt(episode, 10),
                  title: `S${season}E${episode}`,
                  tmdbId: `${id}-s${season}e${episode}`,
                },
                {
                  number: parseInt(episode, 10) + 1,
                  title: `S${season}E${parseInt(episode, 10) + 1}`,
                  tmdbId: `${id}-s${season}e${parseInt(episode, 10) + 1}`,
                },
              ]
            : undefined,

            season: season
              ? {
                  number: parseInt(season, 10),
                  tmdbId: `${id}-s${season}`,
                  title: `Season ${season}`,
                }
              : undefined,
          }
        : {
            type: "movie",
            title: (cached.movieData as any).title,
            tmdbId: id!,
            releaseYear: (cached.movieData as any).releaseDate
              ? new Date((cached.movieData as any).releaseDate).getFullYear()
              : new Date().getFullYear(),
            poster: (cached.movieData as any).posterPath,
          };

      setMetaRef.current(playerMeta);

      setError(null);
      setIsTransitioningEpisode(false); // ✅ NEW
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logProvider("Fetching movie and Zentlify streams");

      // Check if this is TV/series based on URL params
      const isSeries = Boolean(season) && Boolean(episode);

      // Fetch zentlify data based on content type
      let zentlifyData;
      if (isSeries) {
        // Use the service function with proper parameters for series
        zentlifyData = await getZentlifyStreams(id, {
          title: title || undefined,
          year: year || undefined,
          season: season || undefined,
          episode: episode || undefined,
        });
      } else {
        zentlifyData = await getZentlifyStreams(id);
      }

      // Fetch movie details and streaming sources
      const moviePromise = isSeries ? getTvById(id) : getMovieById(id);

      const [movieData] = await Promise.all([
        moviePromise,
        Promise.resolve(zentlifyData),
      ]);

      if (!movieData) {
        setError("Movie/Series not found");
        return;
      }

      if (
        !zentlifyData ||
        !zentlifyData.streams ||
        zentlifyData.streams.length === 0
      ) {
        setError("No streaming sources available");
        return;
      }

      logProvider(`Loaded ${zentlifyData.streams.length} streams`);

      // Group streams by provider
      const grouped = groupStreamsByProvider(zentlifyData.streams);
      setProviderGroups(grouped);

      usePlayerStore.getState().setCustomSources(
        grouped.map((pg) => ({ id: pg.provider, label: pg.provider }))
      );

      // Auto-select first provider and quality
      if (grouped.length > 0) {
        const saved = usePlayerStore.getState().selectedCustomSourceId;
        const pick = grouped.find((g) => g.provider === saved) ?? grouped[0];

        setSelectedProvider(pick.provider);
        setSelectedQuality(pick.qualities[0] || null);
        setIsZenFallback(pick.provider === "zen");
      }

      // Set up player metadata
      const playerMeta: PlayerMeta = isSeries
        ? {
            type: "show",
            title: title || (movieData as any).title || (movieData as any).name || "Untitled",
            tmdbId: id,
            releaseYear: year
              ? parseInt(year, 10)
              : movieData.releaseDate
                ? new Date(movieData.releaseDate).getFullYear()
                : new Date().getFullYear(),
            poster: movieData.posterPath,
            episode:
              season && episode
                ? {
                    number: parseInt(episode, 10),
                    tmdbId: `${id}-s${season}e${episode}`,
                    title: `S${season}E${episode}`,
                  }
                : undefined,
            episodes: season && episode
            ? [
                {
                  number: parseInt(episode, 10),
                  title: `S${season}E${episode}`,
                  tmdbId: `${id}-s${season}e${episode}`,
                },
                {
                  number: parseInt(episode, 10) + 1,
                  title: `S${season}E${parseInt(episode, 10) + 1}`,
                  tmdbId: `${id}-s${season}e${parseInt(episode, 10) + 1}`,
                },
              ]
            : undefined,

            season: season
              ? {
                  number: parseInt(season, 10),
                  tmdbId: `${id}-s${season}`,
                  title: `Season ${season}`,
                }
              : undefined,
          }
        : {
            type: "movie",
            title: movieData.title,
            tmdbId: id,
            releaseYear: movieData.releaseDate
              ? new Date(movieData.releaseDate).getFullYear()
              : new Date().getFullYear(),
            poster: movieData.posterPath,
          };

      setMovie(movieData);
      setMetaRef.current(playerMeta);

      // Convert subtitles to caption format
      const subsRaw = pickSubtitlesFromResponse(zentlifyData);
      const subtitleCaptions = convertSubtitlesToCaptions(subsRaw);
      setCaptions(subtitleCaptions);
      pushCaptionsToStore(subtitleCaptions);

      setIsTransitioningEpisode(false); // ✅ NEW

      const saved = usePlayerStore.getState().selectedCustomSourceId;
      const pick = grouped.find((g) => g.provider === saved) ?? grouped[0];

      PLAYER_CACHE.set(contentKey, {
        movieData,
        zentlifyData,
        grouped,
        captions: subtitleCaptions,
        selectedProvider: pick?.provider ?? null,
        selectedQuality: pick?.qualities?.[0] ?? null,
        isZenFallback: pick?.provider === "zen",
      });

      // Reset state
      setFailedStreams(new Set());
      setZenStreamIndex(0);
      hasTriedAllStreams.current = false;
      isManualSelection.current = false;
    } catch (err) {
      console.error("Failed to load movie and stream:", err);
      setError("Failed to load video");
      setStatusRef.current(playerStatus.PLAYBACK_ERROR);
      setIsTransitioningEpisode(false); // ✅ NEW
    } finally {
      setIsLoading(false);
    }
  }, [id, title, year, season, episode, contentKey]);

  // Auto-switch to next zen stream on playback error (zen fallback logic)
  useEffect(() => {
    if (
      status === playerStatus.PLAYBACK_ERROR &&
      selectedProvider === "zen" &&
      isZenFallback &&
      !isManualSelection.current &&
      !hasTriedAllStreams.current
    ) {
      const providerGroup = providerGroups.find((pg) => pg.provider === "zen");
      if (providerGroup) {
        const currentStream = providerGroup.streams[zenStreamIndex];
        if (currentStream) {
          logProvider(`Zen stream failed, marking as failed`, {
            url: getStreamUrl(currentStream),
          });
          setFailedStreams((prev) => new Set(prev).add(getStreamUrl(currentStream)));
        }

        const nextIndex = zenStreamIndex + 1;
        if (nextIndex < providerGroup.streams.length) {
          logProvider(
            `Zen fallback: trying next stream (${nextIndex + 1}/${providerGroup.streams.length})`,
          );
          setZenStreamIndex(nextIndex);
        } else {
          logProvider("All zen streams exhausted");
          hasTriedAllStreams.current = true;
          setError("All zen streams failed. Please try another provider.");
        }
      }
    }
  }, [
    status,
    selectedProvider,
    isZenFallback,
    zenStreamIndex,
    providerGroups,
  ]);

  // Try current stream when selection changes
  useEffect(() => {
    if (
      isTransitioningEpisode || // ✅ block old episode replay
      !selectedProvider ||
      !selectedQuality ||
      providerGroups.length === 0 ||
      isLoading
    ) return;

    tryCurrentStream();
  }, [
    isTransitioningEpisode,
    selectedProvider,
    selectedQuality,
    zenStreamIndex,
    providerGroups.length,
    isLoading,
    tryCurrentStream,
  ]);

  // Load movie and providers on mount
  useEffect(() => {
    const key = contentKey;

    // ✅ prevent re-fetching for same video
    if (loadedKeyRef.current === key) return;
    loadedKeyRef.current = key;

    loadMovieAndProviders();
  }, [contentKey, loadMovieAndProviders]);

  const handleRetry = useCallback(() => {
    logProvider("Manual retry initiated");
    setFailedStreams(new Set());
    setZenStreamIndex(0);
    hasTriedAllStreams.current = false;
    isManualSelection.current = true;
    setError(null);
  }, []);

  return (
    <PlayerPart backUrl="/mnflix" onMetaChange={handleMetaChange}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loading text="Loading video..." />
        </div>
      )}
      {error && status !== playerStatus.PLAYING && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="text-xl text-red-500">{error}</div>
          <p className="text-gray-400">
            {selectedProvider && selectedQuality
              ? `Provider: ${selectedProvider}, Quality: ${selectedQuality}`
              : "Unable to load video"}
          </p>
          <div className="flex gap-3">
            {providerGroups.length > 0 && (
              <>
                <Button
                  onClick={handleRetry}
                  theme="purple"
                  padding="px-6 py-2"
                >
                  Retry
                </Button>
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSelector(true);
                  }}
                  theme="secondary"
                  padding="px-6 py-2"
                >
                  Change Source
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {status === playerStatus.PLAYBACK_ERROR && !error && (
        <PlaybackErrorPart />
      )}
    
      <ProviderQualitySelector
        providerGroups={providerGroups}
        selectedProvider={selectedProvider}
        selectedQuality={selectedQuality}
        onSelectProvider={handleProviderSelect}
        onSelectQuality={handleQualitySelect}
        show={showSelector}
        onClose={() => setShowSelector(false)}
      />
    </PlayerPart>
  );
}
