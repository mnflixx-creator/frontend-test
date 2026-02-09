import { api } from "./api";
import type { StreamingData, WatchProgress, Subtitle } from "@/types/movie";

/**
 * Get streaming sources for a movie from the Zenflify/backend
 */
export async function getStreamingSourcesForMovie(
  movieId: string,
): Promise<StreamingData | null> {
  try {
    const response = await api<StreamingData>(`/api/streams/${movieId}`);
    
    // Transform response to ensure proper format
    return {
      streams: response.streams || [],
      subtitles: response.subtitles || [],
      quality: response.quality || [],
    };
  } catch (error) {
    console.error(`Error fetching streaming sources for movie ${movieId}:`, error);
    return null;
  }
}

/**
 * Get subtitles for a movie
 */
export async function getSubtitles(movieId: string): Promise<Subtitle[]> {
  try {
    const response = await api<{ subtitles: Subtitle[] }>(`/api/subtitles/${movieId}`);
    return response.subtitles || [];
  } catch (error) {
    console.error(`Error fetching subtitles for movie ${movieId}:`, error);
    return [];
  }
}

/**
 * Save watch progress for a movie
 */
export async function saveWatchProgress(
  movieId: string,
  currentTime: number,
  duration: number,
): Promise<boolean> {
  try {
    await api(`/api/progress/${movieId}`, {
      method: "POST",
      body: {
        currentTime,
        duration,
        watched: (currentTime / duration) * 100,
      },
    });
    return true;
  } catch (error) {
    console.error(`Error saving watch progress for movie ${movieId}:`, error);
    return false;
  }
}

/**
 * Get watch progress for a movie
 */
export async function getWatchProgress(
  movieId: string,
): Promise<WatchProgress | null> {
  try {
    const response = await api<{ progress: WatchProgress }>(
      `/api/progress/${movieId}`,
    );
    return response.progress;
  } catch (error) {
    console.error(`Error fetching watch progress for movie ${movieId}:`, error);
    return null;
  }
}
