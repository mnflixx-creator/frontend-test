import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { Loading } from "@/components/layout/Loading";
import { usePlayer } from "@/components/player/hooks/usePlayer";
import { PlaybackErrorPart } from "@/pages/parts/player/PlaybackErrorPart";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import { getMovieById } from "@/services/movies";
import { getZentlifyStreams } from "@/services/streaming";
import type { ZentlifyStream, ZentlifySubtitle } from "@/services/streaming";
import {
  CaptionListItem,
  MNFLIXProvider,
  PlayerMeta,
  playerStatus,
} from "@/stores/player/slices/source";
import { usePlayerStore } from "@/stores/player/store";
import {
  SourceQuality,
  SourceSliceSource,
} from "@/stores/player/utils/qualities";
import type { Movie } from "@/types/movie";

/**
 * Provider order preference for MNFLIX
 */
const PROVIDER_ORDER = ["lush", "flow", "sonata", "zen", "breeze", "nova"];

/**
 * Sorts providers according to the preferred order
 */
function sortProvidersByPreference(
  streams: ZentlifyStream[],
): ZentlifyStream[] {
  return [...streams].sort((a, b) => {
    const indexA = PROVIDER_ORDER.indexOf(a.provider.toLowerCase());
    const indexB = PROVIDER_ORDER.indexOf(b.provider.toLowerCase());

    // If both providers are in the order list, sort by their position
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }

    // If only one is in the order list, prioritize it
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;

    // If neither is in the order list, maintain original order
    return 0;
  });
}

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
 * Converts Zentlify subtitles to CaptionListItem format expected by the player
 */
function convertSubtitlesToCaptions(
  subtitles: ZentlifySubtitle[] | undefined,
): CaptionListItem[] {
  if (!subtitles || subtitles.length === 0) return [];

  return subtitles.map((subtitle, index) => ({
    id: `subtitle-${index}`,
    language: subtitle.language,
    url: subtitle.url,
    needsProxy: false,
    display: subtitle.label,
  }));
}

/**
 * Converts a single Zentlify stream to SourceSliceSource format expected by the player
 */
function convertZentlifyStreamToSource(
  stream: ZentlifyStream,
): SourceSliceSource | null {
  if (!stream) return null;

  // Handle HLS streams
  if (stream.type === "hls") {
    return {
      type: "hls",
      url: stream.file,
    };
  }

  // Handle MP4 streams with quality mapping
  if (stream.type === "mp4") {
    const quality = mapQuality(stream.quality);
    const qualities: Partial<
      Record<SourceQuality, { type: "mp4"; url: string }>
    > = {};
    qualities[quality] = {
      type: "mp4",
      url: stream.file,
    };

    return {
      type: "file",
      qualities,
    };
  }

  return null;
}

export function MNFLIXPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const { status, playMedia, setMeta, setStatus } = usePlayer();
  const setMNFLIXProviders = usePlayerStore((s) => s.setMNFLIXProviders);
  const setCurrentMNFLIXProvider = usePlayerStore(
    (s) => s.setCurrentMNFLIXProvider,
  );
  const [_movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProviders, setAllProviders] = useState<ZentlifyStream[]>([]);
  const [currentProviderIndex, setCurrentProviderIndex] = useState(0);
  const [failedProviders, setFailedProviders] = useState<Set<string>>(
    new Set(),
  );
  const [captions, setCaptions] = useState<CaptionListItem[]>([]);
  const hasTriedAllProviders = useRef(false);
  const isManualRetry = useRef(false);

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
  const logProvider = useCallback(
    (message: string, provider?: string, details?: any) => {
      // Only log in development mode
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log(
          `[MNFLIX Player] ${message}`,
          provider ? `Provider: ${provider}` : "",
          details || "",
        );
      }
    },
    [],
  );

  // Try to play a specific provider stream
  const tryProvider = useCallback(
    async (providerIndex: number) => {
      if (providerIndex >= allProviders.length) {
        logProvider("All providers exhausted, showing final error");
        hasTriedAllProviders.current = true;
        setError("All providers failed. Please try again.");
        setStatusRef.current(playerStatus.PLAYBACK_ERROR);
        return;
      }

      const stream = allProviders[providerIndex];
      logProvider(`Trying provider`, stream.provider, {
        url: stream.file,
        type: stream.type,
        quality: stream.quality,
      });

      const source = convertZentlifyStreamToSource(stream);

      if (!source) {
        logProvider(
          `Provider has no compatible format, skipping`,
          stream.provider,
        );
        setFailedProviders((prev) => new Set(prev).add(stream.provider));
        // Try next provider immediately
        setCurrentProviderIndex(providerIndex + 1);
        return;
      }

      // Start playing the video with subtitles
      // Note: Playback errors are handled asynchronously via status changes
      playMediaRef.current(source, captions, null);
      setError(null);

      // Update current provider in store
      setCurrentMNFLIXProvider(`provider-${providerIndex}`);

      // Reset manual retry flag after attempting the provider
      // This allows automatic switching if this provider also fails
      if (isManualRetry.current) {
        isManualRetry.current = false;
      }
    },
    [allProviders, captions, logProvider, setCurrentMNFLIXProvider],
  );

  // Load movie and all providers - only re-fetch when movie ID changes
  const loadMovieAndProviders = useCallback(async () => {
    if (!id) {
      setError("No movie ID provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      logProvider("Fetching movie and Zentlify streams");

      // Fetch movie details and streaming sources from Zentlify in parallel
      const [movieData, zentlifyData] = await Promise.all([
        getMovieById(id),
        getZentlifyStreams(id),
      ]);

      if (!movieData) {
        setError("Movie not found");
        return;
      }

      if (!zentlifyData || zentlifyData.streams.length === 0) {
        setError("No streaming sources available");
        return;
      }

      logProvider(
        `Loaded ${zentlifyData.streams.length} provider streams`,
        "",
        {
          providers: zentlifyData.streams.map((s) => s.provider),
        },
      );

      // Set up player metadata
      const playerMeta: PlayerMeta = {
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

      // Sort provider streams according to preferred order
      const sortedStreams = sortProvidersByPreference(zentlifyData.streams);

      // Store all provider streams
      setAllProviders(sortedStreams);

      // Convert providers to MNFLIXProvider format and store in player store
      const mnflixProviders: MNFLIXProvider[] = sortedStreams.map(
        (stream, index) => ({
          id: `provider-${index}`,
          name: stream.provider,
          quality: stream.quality,
          type: stream.type,
        }),
      );
      setMNFLIXProviders(mnflixProviders);
      if (mnflixProviders.length > 0) {
        setCurrentMNFLIXProvider(mnflixProviders[0].id);
      }

      // Convert subtitles to caption format
      const subtitleCaptions = convertSubtitlesToCaptions(
        zentlifyData.subtitles,
      );
      setCaptions(subtitleCaptions);

      // Reset state for new load
      setFailedProviders(new Set());
      setCurrentProviderIndex(0);
      hasTriedAllProviders.current = false;
      isManualRetry.current = false;
    } catch (err) {
      console.error("Failed to load movie and stream:", err);
      setError("Failed to load video");
      setStatusRef.current(playerStatus.PLAYBACK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [id, logProvider, setMNFLIXProviders, setCurrentMNFLIXProvider]);

  // Handle manual provider selection
  const handleProviderSelect = useCallback(
    (providerIndex: number) => {
      if (providerIndex >= 0 && providerIndex < allProviders.length) {
        const provider = allProviders[providerIndex];
        logProvider(`Manual provider selection`, provider.provider);
        setCurrentProviderIndex(providerIndex);
        // Set manual retry flag to skip auto-switching for initial attempt
        // Flag is reset in tryProvider() after the provider is attempted
        isManualRetry.current = true;
      }
    },
    [allProviders, logProvider],
  );

  // Handle manual retry - restarts from first provider
  const handleRetry = useCallback(() => {
    logProvider("Manual retry initiated, restarting from first provider");
    setFailedProviders(new Set());
    setCurrentProviderIndex(0);
    hasTriedAllProviders.current = false;
    isManualRetry.current = true;
    setError(null);
  }, [logProvider]);

  // Auto-switch to next provider on playback error
  useEffect(() => {
    if (
      status === playerStatus.PLAYBACK_ERROR &&
      allProviders.length > 0 &&
      !hasTriedAllProviders.current &&
      !isManualRetry.current
    ) {
      const currentProvider = allProviders[currentProviderIndex];
      if (currentProvider) {
        logProvider(
          `Playback error detected, marking provider as failed`,
          currentProvider.provider,
        );
        setFailedProviders((prev) =>
          new Set(prev).add(currentProvider.provider),
        );
      }
      // Try next provider
      const nextIndex = currentProviderIndex + 1;
      if (nextIndex < allProviders.length) {
        logProvider(
          `Auto-switching to next provider (${nextIndex + 1}/${allProviders.length})`,
        );
        setCurrentProviderIndex(nextIndex);
      } else {
        logProvider("No more providers to try");
        hasTriedAllProviders.current = true;
        setError("All providers failed. Please try again.");
      }
    }
  }, [status, allProviders, currentProviderIndex, logProvider]);

  // Try current provider when index changes
  useEffect(() => {
    if (
      allProviders.length > 0 &&
      currentProviderIndex < allProviders.length &&
      !isLoading
    ) {
      tryProvider(currentProviderIndex);
    }
  }, [currentProviderIndex, allProviders.length, isLoading, tryProvider]);

  // Expose provider selection function globally via window for Settings menu access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).selectMNFLIXProvider = (providerId: string) => {
        const providerIndex = parseInt(providerId.replace("provider-", ""), 10);
        if (!Number.isNaN(providerIndex)) {
          handleProviderSelect(providerIndex);
        }
      };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).selectMNFLIXProvider;
      }
    };
  }, [handleProviderSelect]);

  // Load movie and providers on mount
  useEffect(() => {
    loadMovieAndProviders();
  }, [loadMovieAndProviders]);

  return (
    <PlayerPart backUrl="/mnflix">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loading text="Loading video..." />
        </div>
      )}
      {error && status !== playerStatus.PLAYING && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="text-xl text-red-500">{error}</div>
          <p className="text-gray-400">
            {hasTriedAllProviders.current && allProviders.length > 0
              ? `Tried ${failedProviders.size} of ${allProviders.length} providers`
              : "Unable to load video from any provider"}
          </p>
          <div className="flex gap-3">
            {allProviders.length > 0 && (
              <Button onClick={handleRetry} theme="purple" padding="px-6 py-2">
                Retry from First
              </Button>
            )}
          </div>
        </div>
      )}
      {status === playerStatus.PLAYBACK_ERROR && !error && (
        <PlaybackErrorPart />
      )}
    </PlayerPart>
  );
}
