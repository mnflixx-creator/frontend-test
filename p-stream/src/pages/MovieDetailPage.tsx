import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { WideContainer } from "@/components/layout/WideContainer";
import { HomeLayout } from "@/pages/layouts/HomeLayout";
import { getMovieById, getTvById } from "@/services/movies";
import type { Movie } from "@/types/movie";
import { useMnflixAuth } from "@/stores/mnflixAuth";
import { SubscribeModal } from "@/components/subscription/SubscribeModal";

export function MovieDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isSubscribed = useMnflixAuth((s) => !!s.user?.subscriptionActive);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const location = useLocation();
  const [movie, setMovie] = useState<Movie | null>(
    location.state?.movie || null,
  );
  const [loading, setLoading] = useState(!location.state?.movie);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMovie() {
      if (location.state?.movie) return;
      if (!id) return;

      try {
        setLoading(true);
        const isSeriesPath =
          location.pathname.includes("/series/") ||
          location.pathname.includes("/show/") ||
          location.pathname.includes("/tv/");

        const data = isSeriesPath ? await getTvById(id) : await getMovieById(id);
        setMovie(data as any);
      } catch (err) {
        console.error("Failed to fetch movie:", err);
        setError("Failed to load movie details");
      } finally {
        setLoading(false);
      }
    }

    fetchMovie();
  }, [id, location.state, location.pathname]);

  const handlePlayClick = () => {
    if (!id) return;

    // 🔒 Not subscribed -> open subscribe modal instead of playing
    if (!isSubscribed) {
      setSubscribeOpen(true);
      return;
    }

    const sp = new URLSearchParams();

    const mediaTitle = (movie as any)?.title || (movie as any)?.name;
    if (mediaTitle) sp.set("title", mediaTitle);

    const isSeries =
      location.pathname.includes("/series/") ||
      location.pathname.includes("/show/") ||
      location.pathname.includes("/tv/") ||
      Array.isArray((movie as any)?.seasons) ||
      (movie as any)?.type === "show" ||
      (movie as any)?.type === "tv";

    if (isSeries) {
      sp.set("season", "1");
      sp.set("episode", "1");
    }

    navigate(`/mnflix/player/${id}?${sp.toString()}`);
  };

  if (loading) {
    return (
      <HomeLayout showBg={false}>
        <WideContainer>
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-xl">Loading movie details...</div>
          </div>
        </WideContainer>
      </HomeLayout>
    );
  }

  const mediaTitle = (movie as any)?.title || (movie as any)?.name || "";

  if (error || !movie) {
    return (
      <HomeLayout showBg={false}>
        <WideContainer>
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-xl text-red-500">
              {error || "Movie not found"}
            </div>
          </div>
        </WideContainer>
      </HomeLayout>
    );
  }

  return (
    <HomeLayout showBg={false}>
      <Helmet>
        <title>
          {movie.title} - {t("global.name")}
        </title>
      </Helmet>

      <div
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: movie.backdropPath
            ? `url(${movie.backdropPath})`
            : "none",
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-70" />

        <WideContainer>
          <div className="relative z-10 py-12">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Poster */}
              <div className="flex-shrink-0">
                <div className="w-64 aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
                  {movie.posterPath ? (
                    <img
                      src={movie.posterPath}
                      alt={movie.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4">{movie.title}</h1>

                {movie.tagline && (
                  <p className="text-xl text-gray-300 mb-4 italic">
                    {movie.tagline}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 mb-6">
                  {movie.releaseDate && (
                    <span className="text-gray-300">
                      {new Date(movie.releaseDate).getFullYear()}
                    </span>
                  )}
                  {movie.runtime && (
                    <span className="text-gray-300">{movie.runtime} min</span>
                  )}
                  {movie.voteAverage && (
                    <span className="text-yellow-400">
                      ⭐ {movie.voteAverage.toFixed(1)}/10
                    </span>
                  )}
                </div>

                {movie.genres && movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {movie.overview && (
                  <p className="text-gray-300 mb-6 max-w-3xl leading-relaxed">
                    {movie.overview}
                  </p>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handlePlayClick}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    {isSubscribed ? "▶ Тоглуулах" : "🔒 Гишүүнчлэл"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </WideContainer>
      </div>
      <SubscribeModal open={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </HomeLayout>
  );
}
