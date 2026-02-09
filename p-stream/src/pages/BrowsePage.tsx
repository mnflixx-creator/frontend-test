import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { WideContainer } from "@/components/layout/WideContainer";
import { HomeLayout } from "@/pages/layouts/HomeLayout";
import { getAllMovies } from "@/services/movies";
import type { Movie } from "@/types/movie";

export function BrowsePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true);
        const data = await getAllMovies();
        setMovies(data);
      } catch (err) {
        console.error("Failed to fetch movies:", err);
        setError("Failed to load movies");
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, []);

  const handleMovieClick = (movie: Movie) => {
    // Pass movie data through navigation state for the detail page
    navigate(`/mnflix/movie/${movie.id}`, { state: { movie } });
  };

  return (
    <HomeLayout showBg={false}>
      <Helmet>
        <title>Browse Movies - {t("global.name")}</title>
      </Helmet>

      <WideContainer>
        <div className="py-8">
          <h1 className="text-3xl font-bold mb-6">Browse All Movies</h1>

          {loading && (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-xl">Loading movies...</div>
            </div>
          )}

          {error && (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-xl text-red-500">{error}</div>
            </div>
          )}

          {!loading && !error && movies.length === 0 && (
            <div className="flex justify-center items-center min-h-[400px]">
              <div className="text-xl">No movies found</div>
            </div>
          )}

          {!loading && !error && movies.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((movie) => (
                <div
                  key={movie.id}
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => handleMovieClick(movie)}
                >
                  <div className="aspect-[2/3] bg-gray-800 rounded-lg overflow-hidden">
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
                  <h3 className="mt-2 text-sm font-medium line-clamp-2">
                    {movie.title}
                  </h3>
                  {movie.releaseDate && (
                    <p className="text-xs text-gray-500">
                      {new Date(movie.releaseDate).getFullYear()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </WideContainer>
    </HomeLayout>
  );
}
