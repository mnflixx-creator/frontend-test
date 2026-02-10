import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { WideContainer } from "@/components/layout/WideContainer";
import { HomeLayout } from "@/pages/layouts/HomeLayout";
import { getShowById } from "@/services/shows";
import type { Show } from "@/services/shows";

export function ShowDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState<Show | null>(location.state?.show || null);
  const [loading, setLoading] = useState(!location.state?.show);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShow() {
      if (location.state?.show) return;
      if (!id) return;

      try {
        setLoading(true);
        const data = await getShowById(id);
        setShow(data);
      } catch (err) {
        console.error("Failed to fetch show:", err);
        setError("Failed to load show details");
      } finally {
        setLoading(false);
      }
    }

    fetchShow();
  }, [id, location.state]);

  const handlePlayClick = () => {
    if (id) {
      // Navigate to show player with season 1, episode 1 by default
      navigate(`/mnflix/show-player/${id}?season=1&episode=1`);
    }
  };

  if (loading) {
    return (
      <HomeLayout showBg={false}>
        <WideContainer>
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-xl">Loading show details...</div>
          </div>
        </WideContainer>
      </HomeLayout>
    );
  }

  if (error || !show) {
    return (
      <HomeLayout showBg={false}>
        <WideContainer>
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-xl text-red-500">
              {error || "Show not found"}
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
          {show.title} - {t("global.name")}
        </title>
      </Helmet>

      <div
        className="relative min-h-screen bg-cover bg-center"
        style={{
          backgroundImage: show.backdropPath
            ? `url(${show.backdropPath})`
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
                  {show.posterPath ? (
                    <img
                      src={show.posterPath}
                      alt={show.title}
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
                <h1 className="text-4xl font-bold mb-4">{show.title}</h1>

                <div className="flex flex-wrap gap-4 mb-6">
                  {show.firstAirDate && (
                    <span className="text-gray-300">
                      {new Date(show.firstAirDate).getFullYear()}
                    </span>
                  )}
                  {show.numberOfSeasons && (
                    <span className="text-gray-300">
                      {show.numberOfSeasons} Season
                      {show.numberOfSeasons !== 1 ? "s" : ""}
                    </span>
                  )}
                  {show.numberOfEpisodes && (
                    <span className="text-gray-300">
                      {show.numberOfEpisodes} Episode
                      {show.numberOfEpisodes !== 1 ? "s" : ""}
                    </span>
                  )}
                  {show.voteAverage && (
                    <span className="text-yellow-400">
                      ⭐ {show.voteAverage.toFixed(1)}/10
                    </span>
                  )}
                </div>

                {show.genres && show.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {show.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-gray-700 rounded-full text-sm"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {show.overview && (
                  <p className="text-gray-300 mb-6 max-w-3xl leading-relaxed">
                    {show.overview}
                  </p>
                )}

                <div className="flex gap-4">
                  <Button
                    onClick={handlePlayClick}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    ▶ Play
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </WideContainer>
      </div>
    </HomeLayout>
  );
}
