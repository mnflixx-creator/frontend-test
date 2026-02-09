import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { Loading } from "@/components/layout/Loading";
import { usePlayer } from "@/components/player/hooks/usePlayer";
import { PlaybackErrorPart } from "@/pages/parts/player/PlaybackErrorPart";
import { PlayerPart } from "@/pages/parts/player/PlayerPart";
import { getMovieById } from "@/services/movies";
import { getZentlifyStreams } from "@/services/streaming";
import type { ZentlifyStream, ZentlifySubtitle } from "@/services/streaming";
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
 * Converts Zentlify streams to SourceSliceSource format expected by the player
 */
function convertZentlifyStreamsToSource(
  streams: ZentlifyStream[],
): SourceSliceSource | null {
  if (!streams || streams.length === 0) return null;

  // Prioritize HLS streams
  const hlsStream = streams.find((s) => s.type === "hls");
  if (hlsStream) {
    return {
      type: "hls",
      url: hlsStream.file,
    };
  }

  // Use MP4 streams as fallback with quality mapping
  const mp4Streams = streams.filter((s) => s.type === "mp4");
  if (mp4Streams.length > 0) {
    const qualities: Partial<
      Record<SourceQuality, { type: "mp4"; url: string }>
    > = {};

    mp4Streams.forEach((stream) => {
      const quality = mapQuality(stream.quality);
      qualities[quality] = {
        type: "mp4",
        url: stream.file,
      };
    });

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
  const [_movie, setMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMovieAndStream = useCallback(async () => {
    if (!id) {
      setError("No movie ID provided");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

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
      setMeta(playerMeta);

      // Convert Zentlify streams to player source format
      const source = convertZentlifyStreamsToSource(zentlifyData.streams);

      if (!source) {
        setError("No compatible streaming format available");
        setStatus(playerStatus.PLAYBACK_ERROR);
        return;
      }

      // Convert subtitles to caption format
      const captions = convertSubtitlesToCaptions(zentlifyData.subtitles);

      // Start playing the video with subtitles
      playMedia(source, captions, null);
    } catch (err) {
      console.error("Failed to load movie and stream:", err);
      setError("Failed to load video");
      setStatus(playerStatus.PLAYBACK_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, [id, playMedia, setMeta, setStatus]);

  useEffect(() => {
    loadMovieAndStream();
  }, [loadMovieAndStream]);

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
            Try selecting a different source or go back
          </p>
        </div>
      )}
      {status === playerStatus.PLAYBACK_ERROR && <PlaybackErrorPart />}
    </PlayerPart>
  );
}
