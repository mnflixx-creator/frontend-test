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

export async function getZentlifyStreams(
  tmdbId: string,
): Promise<ZentlifyResponse | null> {
  try {
    const response = await api<any>(
      `/api/zentlify/movie/${tmdbId}`,
    );

    // Transform backend streams to match ZentlifyStream interface
    const streams = (response.streams || []).map((s: any) => ({
      file: s.url, // Use url as file
      type:
        s.url?.endsWith(".m3u8") || s.provider === "sonata" ||
        s.provider === "breeze" || s.provider === "zen" || s.provider === "nova"
          ? "hls"
          : "mp4",
      quality: s.quality || s.title || s.name || "auto",
      provider: s.provider || s.name || "unknown",
      intro: s.intro,
      outro: s.outro,
    }));

    return {
      streams,
      count: response.count || streams.length,
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