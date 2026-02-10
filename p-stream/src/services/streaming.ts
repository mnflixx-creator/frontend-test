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

export interface SeriesParams {
  title: string;
  year: number;
  season: number;
  episode: number;
}

export async function getZentlifyStreams(
  tmdbId: string,
  seriesParams?: SeriesParams,
  contentType: "movie" | "series" = "movie",
): Promise<ZentlifyResponse | null> {
  try {
    // Construct API URL based on content type
    let apiUrl: string;
    if (contentType === "series") {
      if (!seriesParams) {
        throw new Error("Series parameters required for series content type");
      }
      const { title, year, season, episode } = seriesParams;
      apiUrl = `/api/zentlify/series/${tmdbId}?title=${encodeURIComponent(title)}&year=${year}&season=${season}&episode=${episode}`;
    } else {
      apiUrl = `/api/zentlify/movie/${tmdbId}`;
    }

    const response = await api<any>(apiUrl);

    // Transform backend streams to match ZentlifyStream interface
    const streams = (response.streams || []).map((s: any) => ({
      file: s.url, // Copy url to file field
      type:
        s.url?.includes(".m3u8") ||
        s.provider === "sonata" ||
        s.provider === "breeze" ||
        s.provider === "zen" ||
        s.provider === "nova"
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
    console.error(
      `Error fetching Zentlify streams for ${contentType} ${tmdbId}:`,
      error,
    );
    return null;
  }
}
