import { ScrapingPart } from "./parts/player/ScrapingPart";

/**
 * PlayerView - Legacy player for scraping providers
 * This handles the /media/:media route for traditional scraping-based playback
 */
export default function PlayerView() {
  return <ScrapingPart />;
}
