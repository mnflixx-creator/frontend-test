import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getMovieById } from "@/services/movies";
import { getZentlifyStreams } from "@/services/streaming";
import type { ZentlifyStream } from "@/services/streaming";
import type { Movie } from "@/types/movie";

export function MNFLIXPlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [streams, setStreams] = useState<ZentlifyStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    async function loadMovieAndStream() {
      if (!id) {
        setError("No movie ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

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

        setMovie(movieData);
        setStreams(zentlifyData.streams);
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
    };
  }, [id]);

  useEffect(() => {
    if (!streams || streams.length === 0 || !videoRef.current) return;

    const video = videoRef.current;
    const hlsStream = streams.find((s) => s.type === "hls");
    const mp4Stream = streams.find((s) => s.type === "mp4");

    if (hlsStream && Hls.isSupported()) {
      // Use HLS.js for HLS streams
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(hlsStream.file);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // HLS manifest loaded successfully
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover from network error
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              // Try to recover from media error
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
    } else if (
      hlsStream &&
      video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      // Native HLS support (Safari)
      video.src = hlsStream.file;
    } else if (mp4Stream) {
      // Fallback to MP4
      video.src = mp4Stream.file;
    } else {
      setError("No compatible streaming format available");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streams]);

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
          type="button"
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
        type="button"
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
