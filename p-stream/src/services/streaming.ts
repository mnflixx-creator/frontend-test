import { api } from "./api";

/**
 * Stream object from Zentlify API
 */
export interface ZentlifyStream {
  file: string;
  type: "hls" | "mp4";
  quality: string;
  provider: string;
  intro?: {
    start: number;
    end: number;
  };
  outro?: {
    start: number;
    end: number;
  };
  name?: string;
}

/**
 * Response from Zentlify API
 */
export interface ZentlifyResponse {
  streams: ZentlifyStream[];
  tmdbId: string;
  title?: string;
}

/**
 * Get streaming sources for a TMDB movie from Zentlify API
 */
export async function getZentlifyStreams(
  tmdbId: string,
): Promise<ZentlifyResponse | null> {
  try {
    const response = await api<ZentlifyResponse>(
      `/api/zentlify/movie/${tmdbId}`,
    );

    // Ensure proper format
    return {
      streams: response.streams || [],
      tmdbId: response.tmdbId || tmdbId,
      title: response.title,
    };
  } catch (error) {
    console.error(
      `Error fetching Zentlify streams for TMDB ID ${tmdbId}:`,
      error,
    );
    return null;
  }
}
