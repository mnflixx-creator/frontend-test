import { api } from "./api";

export interface ZentlifyStream {
  file: string;
  type: "hls" | "mp4";
  quality: string;
  provider: string;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
}

export interface ZentlifySubtitle {
  url: string;
  language: string;
  label: string;
}

export interface ZentlifyResponse {
  streams: ZentlifyStream[];
  subtitles?: ZentlifySubtitle[];
  count: number;
  cached?: boolean;
  fresh?: boolean;
}

export async function getZentlifyStreams(
  tmdbId: string,
  params?: {
    title?: string;
    year?: string;
    season?: string;
    episode?: string;
  },
): Promise<ZentlifyResponse | null> {
  try {
    // Determine if this is a series or movie request
    const isSeries =
      params?.season !== undefined && params?.episode !== undefined;

    let endpoint = `/api/zentlify/movie/${tmdbId}`;
    if (isSeries) {
      // Build query params for series endpoint
      const queryParams = new URLSearchParams({
        season: params.season!,
        episode: params.episode!,
      });

      // Add optional title and year if provided
      if (params.title) {
        queryParams.set("title", params.title);
      }
      if (params.year) {
        queryParams.set("year", params.year);
      }

      endpoint = `/api/zentlify/series/${tmdbId}?${queryParams.toString()}`;
    } else if (params?.title) {
      // For movies, add title as query param if provided (helps Flow provider)
      const queryParams = new URLSearchParams({ title: params.title });
      if (params.year) {
        queryParams.set("year", params.year);
      }
      endpoint = `/api/zentlify/movie/${tmdbId}?${queryParams.toString()}`;
    }

    const response = await api<any>(endpoint);

    // Transform backend streams to match ZentlifyStream interface
    const streams = (response.streams || []).map((s: any) => ({
      file: s.url || s.file, // Backend might use 'url' or 'file'
      type:
        s.url?.includes(".m3u8") ||
        s.file?.includes(".m3u8") ||
        s.provider === "sonata" ||
        s.provider === "breeze" ||
        s.provider === "zen" ||
        s.provider === "nova" ||
        s.provider === "neko"
          ? "hls"
          : "mp4",
      quality: s.quality || s.title || s.name || "auto",
      provider: s.provider || s.name || "unknown",
      intro: s.intro,
      outro: s.outro,
    }));

    return {
      streams,
      subtitles: response.subtitles || [],
      count: response.count || streams.length,
      cached: response.cached,
      fresh: response.fresh,
    };
  } catch (error) {
    console.error(`Error fetching Zentlify streams for ${tmdbId}:`, error);
    return null;
  }
}
