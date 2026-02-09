import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Hls from "hls.js";

import { Player } from "@/components/player";
import { getMovieById } from "@/services/movies";
import {
  getStreamingSourcesForMovie,
  getWatchProgress,
  saveWatchProgress,
} from "@/services/zenflify";
import type { Movie, StreamingData } from "@/types/movie";

// Progress save interval in milliseconds
const PROGRESS_SAVE_INTERVAL_MS = 10000; // 10 seconds

export function MNFLIXPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [streamingData, setStreamingData] = useState<StreamingData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadMovieAndStream() {
      if (!id) {
        setError("No movie ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch movie details and streaming sources in parallel
        const [movieData, streamData] = await Promise.all([
          getMovieById(id),
          getStreamingSourcesForMovie(id),
        ]);

        if (!movieData) {
          setError("Movie not found");
          return;
        }

        if (!streamData || streamData.streams.length === 0) {
          setError("No streaming sources available");
          return;
        }

        setMovie(movieData);
        setStreamingData(streamData);

        // Get watch progress and resume if available
        const progress = await getWatchProgress(id);
        if (progress && videoRef.current) {
          videoRef.current.currentTime = progress.currentTime;
        }
      } catch (err) {
        console.error("Failed to load movie and stream:", err);
        setError("Failed to load video");
      } finally {
        setLoading(false);
      }
    }

    loadMovieAndStream();

    // Cleanup on unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [id]);

  useEffect(() => {
    if (!streamingData || !videoRef.current) return;

    const video = videoRef.current;
    const hlsStream = streamingData.streams.find((s) => s.type === "hls");
    const mp4Stream = streamingData.streams.find((s) => s.type === "mp4");

    if (hlsStream && Hls.isSupported()) {
      // Use HLS.js for HLS streams
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(hlsStream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest loaded");
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Network error, trying to recover...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Media error, trying to recover...");
              hls.recoverMediaError();
              break;
            default:
              setError("Fatal streaming error");
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (hlsStream && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      video.src = hlsStream.url;
    } else if (mp4Stream) {
      // Fallback to MP4
      video.src = mp4Stream.url;
    } else {
      setError("No compatible streaming format available");
    }

    // Setup progress tracking
    progressIntervalRef.current = setInterval(() => {
      if (video.currentTime > 0 && video.duration > 0 && id) {
        saveWatchProgress(id, video.currentTime, video.duration);
      }
    }, PROGRESS_SAVE_INTERVAL_MS);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [streamingData, id]);

  const handleBackClick = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-xl text-white">Loading video...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-xl text-red-500">{error}</div>
        <button
          onClick={handleBackClick}
          className="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Back button */}
      <button
        onClick={handleBackClick}
        className="absolute top-4 left-4 z-50 px-4 py-2 bg-gray-800 bg-opacity-75 text-white rounded hover:bg-opacity-100 transition-all"
      >
        ← Back
      </button>

      {/* Video player */}
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        playsInline
      >
        {streamingData?.subtitles?.map((subtitle, index) => (
          <track
            key={index}
            kind="subtitles"
            src={subtitle.url}
            srcLang={subtitle.language}
            label={subtitle.label}
          />
        ))}
        Your browser does not support the video tag.
      </video>

      {/* Movie info overlay */}
      {movie && (
        <div className="absolute top-4 right-4 z-40 p-4 bg-gray-900 bg-opacity-90 rounded max-w-md">
          <h2 className="text-lg font-bold text-white">{movie.title}</h2>
          {movie.releaseDate && (
            <p className="text-sm text-gray-300">
              {new Date(movie.releaseDate).getFullYear()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
