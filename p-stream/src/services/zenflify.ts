import { api } from "./api";

export interface ZentlifyStream {
  file: string;
  type: "hls" | "mp4";
  quality: string;
  provider: string;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface ZentlifyResponse {
  streams: ZentlifyStream[];
  count: number;
  cached?: boolean;
  fresh?: boolean;
}

/**
 * Get streaming sources from Zentlify API
 */
export async function getZentlifyStreams(
  tmdbId: string,
): Promise<ZentlifyResponse | null> {
  try {
    const response = await api<ZentlifyResponse>(
      `/api/zentlify/movie/${tmdbId}`,
    );

    return {
      streams: response.streams || [],
      count: response.count || 0,
      cached: response.cached,
      fresh: response.fresh,
    };
  } catch (error) {
    console.error(
      `Error fetching Zentlify streams for movie ${tmdbId}:`,
      error,
    );
    return null;
  }
}

/**
 * Get watch progress for a movie
 */
export async function getWatchProgress(movieId: string) {
  try {
    return await api(`/api/progress/${movieId}`);
  } catch (error) {
    console.error(`Error fetching watch progress for movie ${movieId}:`, error);
    return null;
  }
}

/**
 * Save watch progress for a movie
 */
export async function saveWatchProgress(
  movieId: string,
  currentTime: number,
  duration: number,
) {
  try {
    return await api(`/api/progress/${movieId}`, {
      method: "POST",
      body: {
        currentTime,
        duration,
        watched: (currentTime / duration) * 100,
      },
    });
  } catch (error) {
    console.error(`Error saving watch progress for movie ${movieId}:`, error);
    return false;
  }
}