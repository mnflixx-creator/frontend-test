import { api } from "./api";

export interface ZentlifySubtitle {
  file: string;        // backend uses "file"
  label?: string;
  language?: string;
  kind?: string;       // e.g. "captions"
}

export interface ZentlifyStream {
  file: string;
  type: "hls" | "mp4";
  quality: string;
  provider: string;
  intro?: { start: number; end: number };
  outro?: { start: number; end: number };
  subtitles?: ZentlifySubtitle[];
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
    const isSeries =
      params?.season !== undefined && params?.episode !== undefined;

    let endpoint = `/api/zentlify/movie/${tmdbId}`;

    if (isSeries) {
      const queryParams = new URLSearchParams({
        season: params.season!,
        episode: params.episode!,
      });

      if (params.title) queryParams.set("title", params.title);
      if (params.year) queryParams.set("year", params.year);

      endpoint = `/api/zentlify/series/${tmdbId}?${queryParams.toString()}`;
    } else if (params?.title) {
      const queryParams = new URLSearchParams({ title: params.title });
      if (params.year) queryParams.set("year", params.year);
      endpoint = `/api/zentlify/movie/${tmdbId}?${queryParams.toString()}`;
    }

    const response = await api<any>(endpoint);

    const streams: ZentlifyStream[] = (response.streams || []).map((s: any) => {
      const provider = (s.provider || s.name || "unknown").toLowerCase();
      const file = s.url || s.file;

      return {
        file,
        type:
          file?.includes(".m3u8") ||
          file?.includes("/cdn/pl") ||
          ["sonata", "breeze", "zen", "nova", "neko"].includes(provider)
            ? "hls"
            : "mp4",
        quality: s.quality || s.title || s.name || "auto",
        provider,
        intro: s.intro,
        outro: s.outro,
        subtitles: Array.isArray(s.subtitles) ? s.subtitles : [],
      };
    });

    const flatSubtitles: ZentlifySubtitle[] = (response.streams || []).flatMap(
      (s: any) => (Array.isArray(s?.subtitles) ? s.subtitles : []),
    );

    return {
      streams,
      subtitles: flatSubtitles,
      count: response.count || streams.length,
      cached: response.cached,
      fresh: response.fresh,
    };
  } catch (error) {
    console.error(`Error fetching Zentlify streams for ${tmdbId}:`, error);
    return null;
  }
}
