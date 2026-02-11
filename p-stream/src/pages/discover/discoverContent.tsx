import classNames from "classnames";
import { t } from "i18next";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/buttons/Button";
import { WideContainer } from "@/components/layout/WideContainer";
import { useDiscoverStore } from "@/stores/discover";
import { useOverlayStack } from "@/stores/interface/overlayStack";
import { useProgressStore } from "@/stores/progress";
import { MediaItem } from "@/utils/mediaTypes";

import { DiscoverNavigation } from "./components/DiscoverNavigation";
import type { FeaturedMedia } from "./components/FeaturedCarousel";
import { LazyMediaCarousel } from "./components/LazyMediaCarousel";
import { ScrollToTopButton } from "./components/ScrollToTopButton";

export function DiscoverContent() {
  const { selectedCategory, setSelectedCategory } = useDiscoverStore();
  const navigate = useNavigate();
  const { showModal } = useOverlayStack();
  const carouselRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const progressItems = useProgressStore((state) => state.items);

  // Only load data for the active tab
  const isMoviesTab = selectedCategory === "movies";
  const isTVShowsTab = selectedCategory === "tvshows";
  const isEditorPicksTab = selectedCategory === "editorpicks";

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category as "movies" | "tvshows" | "editorpicks");
  };

  const handleShowDetails = async (media: MediaItem | FeaturedMedia) => {
    showModal("discover-details", {
      id: Number(media.id),
      type: media.type === "movie" ? "movie" : "show",
    });
  };

  const tvProgressItems = Object.entries(progressItems || {}).filter(
    ([_, item]) => item.type === "show",
  );
  const allProgressItems = Object.entries(progressItems || {});

  // Render Movies content with lazy loading
  const renderMoviesContent = () => {
    const carousels = [];

    // Because You Watched - always show, even if empty (will show empty state)
    carousels.push(
      <LazyMediaCarousel
        key="movie-recommendations"
        content={{ type: "recommendations" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        showRecommendations
        priority={carousels.length < 2} // First 2 carousels load immediately
      />,
    );

    // Trending Movies
    carousels.push(
      <LazyMediaCarousel
        key="movie-trending"
        content={{ type: "trending" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // New Releases - Movies only, with TMDB fallback to nowPlaying
    carousels.push(
      <LazyMediaCarousel
        key="movie-latest"
        content={{ type: "latest", fallback: "nowPlaying" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Korean Movies (kdrama type applies to all Korean content, not just dramas)
    carousels.push(
      <LazyMediaCarousel
        key="movie-korean"
        content={{ type: "kdrama" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Anime Movies
    carousels.push(
      <LazyMediaCarousel
        key="movie-anime"
        content={{ type: "anime" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
      />,
    );

    // 18+ Adult Movies
    carousels.push(
      <LazyMediaCarousel
        key="movie-adult"
        content={{ type: "adult18plus" }}
        isTVShow={false}
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
      />,
    );

    return carousels;
  };

  // Render TV Shows content with lazy loading
  const renderTVShowsContent = () => {
    const carousels = [];

    // TV Show Recommendations - always show, even if empty (will show empty state)
    carousels.push(
      <LazyMediaCarousel
        key="tv-recommendations"
        content={{ type: "recommendations" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        showRecommendations
        priority={carousels.length < 2} // First 2 carousels load immediately
      />,
    );

    // Trending TV Shows
    carousels.push(
      <LazyMediaCarousel
        key="tv-trending"
        content={{ type: "trending" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // New Releases (On Air)
    carousels.push(
      <LazyMediaCarousel
        key="tv-on-air"
        content={{ type: "latesttv", fallback: "onTheAir" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Korean TV Shows (kdrama type applies to all Korean content, not just dramas)
    carousels.push(
      <LazyMediaCarousel
        key="tv-korean"
        content={{ type: "kdrama" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
        priority={carousels.length < 2}
      />,
    );

    // Anime TV Shows
    carousels.push(
      <LazyMediaCarousel
        key="tv-anime"
        content={{ type: "anime" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
      />,
    );

    // 18+ Adult TV Shows
    carousels.push(
      <LazyMediaCarousel
        key="tv-adult"
        content={{ type: "adult18plus" }}
        isTVShow
        carouselRefs={carouselRefs}
        onShowDetails={handleShowDetails}
        moreContent
      />,
    );

    return carousels;
  };

  // Render Editor Picks content
  const renderEditorPicksContent = () => {
    return (
      <>
        <LazyMediaCarousel
          content={{ type: "editorPicks" }}
          isTVShow={false}
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
          priority // Editor picks load immediately since they're the main content
        />
        <LazyMediaCarousel
          content={{ type: "editorPicks" }}
          isTVShow
          carouselRefs={carouselRefs}
          onShowDetails={handleShowDetails}
          moreContent
          priority // Editor picks load immediately since they're the main content
        />
      </>
    );
  };

  return (
    <div className="relative min-h-screen">
      <DiscoverNavigation
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />

      <WideContainer ultraWide classNames="!px-0">
        {/* Movies Tab */}
        <div style={{ display: isMoviesTab ? "block" : "none" }}>
          {renderMoviesContent()}
        </div>

        {/* TV Shows Tab */}
        <div style={{ display: isTVShowsTab ? "block" : "none" }}>
          {renderTVShowsContent()}
        </div>

        {/* Editor Picks Tab */}
        <div style={{ display: isEditorPicksTab ? "block" : "none" }}>
          {renderEditorPicksContent()}
        </div>
      </WideContainer>

      {/* View All Button */}
      <div
        className={classNames(
          "flex justify-center mt-8 mb-12",
          isMoviesTab ? "block" : "hidden",
        )}
      >
        <Button theme="purple" onClick={() => navigate("/discover/all")}>
          {t("discover.viewLists")}
        </Button>
      </div>

      <ScrollToTopButton />

      {/* DetailsModal is now managed by overlayStack */}
    </div>
  );
}

export default DiscoverContent;
