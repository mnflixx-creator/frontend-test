import type { Movie } from "@/types/movie";

import { api } from "./api";

export async function getAllMovies(): Promise<Movie[]> {
  try {
    const response = await api("/api/tmdb/trending");

    const items = response.results || response || [];
    return items.map((item: any) => ({
      id: String(item.id),
      tmdbId: String(item.id),
      title: item.title || item.name,
      overview: item.overview,
      posterPath: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : undefined,
      backdropPath: item.backdrop_path
        ? `https://image.tmdb.org/t/p/original${item.backdrop_path}`
        : undefined,
      releaseDate: item.release_date || item.first_air_date,
      voteAverage: item.vote_average,
      voteCount: item.vote_count,
      popularity: item.popularity,
      genres: item.genre_ids || [],
    }));
  } catch (error) {
    console.error("Error fetching all movies:", error);
    return [];
  }
}

export async function getMovieById(id: string | number): Promise<any | null> {
  try {
    const strId = String(id);

    // ✅ If it's a Mongo ObjectId, fetch from your DB API (includes subtitles)
    const isMongoId = /^[a-f0-9]{24}$/i.test(strId);
    if (isMongoId) {
      return await api(`/api/movies/${strId}`);
    }

    // ✅ NEW: try Mongo movie by tmdbId first (this is where your MN subtitles are)
    try {
      return await api(`/api/movies/by-tmdb/${strId}?type=movie`);
    } catch (e) {
      // ignore and fallback to TMDB
    }

    // Otherwise treat it as TMDB id (fallback)
    const response = await api(`/api/tmdb/movie/${strId}`);
    return {
      id: String(response.id),
      tmdbId: String(response.id),
      type: "movie", // ✅ ADD
      title: response.title || response.name,
      overview: response.overview,
      posterPath: response.poster_path
        ? `https://image.tmdb.org/t/p/w500${response.poster_path}`
        : undefined,
      backdropPath: response.backdrop_path
        ? `https://image.tmdb.org/t/p/original${response.backdrop_path}`
        : undefined,
      releaseDate: response.release_date || response.first_air_date,
      voteAverage: response.vote_average,
      voteCount: response.vote_count,
      tagline: response.tagline,
      runtime: response.runtime,
      popularity: response.popularity,
      genres: response.genres?.map((g: any) => g.name) || [],
    };
  } catch (error) {
    console.error(`Error fetching movie ${id}:`, error);
    return null;
  }
}

export async function getTvById(id: string | number): Promise<any | null> {
  try {
    const strId = String(id);

    // ✅ If it's a Mongo ObjectId, fetch from your DB API (includes subtitles / seasons)
    const isMongoId = /^[a-f0-9]{24}$/i.test(strId);
    if (isMongoId) {
      return await api(`/api/movies/${strId}`);
    }

    // ✅ NEW: try Mongo movie/series by tmdbId first (this is where subs/seasons are)
    try {
      // IMPORTANT: tell backend this is NOT a movie
      // map your app types properly:
      // - series/anime/kdrama/cdrama => backend expects type=series|anime|kdrama|cdrama
      // If you don’t know, start with "series".
      return await api(`/api/movies/by-tmdb/${strId}?type=series`);
    } catch (e) {
      // ignore and fallback to TMDB
    }

    // Otherwise treat it as TMDB id (fallback)
    const response = await api(`/api/tmdb/tv/${strId}`);
    return {
      id: String(response.id),
      tmdbId: String(response.id),
      type: "tv",
      title: response.name || response.title,
      overview: response.overview,
      posterPath: response.poster_path
        ? `https://image.tmdb.org/t/p/w500${response.poster_path}`
        : undefined,
      backdropPath: response.backdrop_path
        ? `https://image.tmdb.org/t/p/original${response.backdrop_path}`
        : undefined,
      releaseDate: response.first_air_date || response.release_date,
      voteAverage: response.vote_average,
      voteCount: response.vote_count,
      tagline: response.tagline,
      runtime:
        Array.isArray(response.episode_run_time) && response.episode_run_time.length
          ? response.episode_run_time[0]
          : undefined,
      popularity: response.popularity,
      genres: response.genres?.map((g: any) => g.name) || [],
    };
  } catch (error) {
    console.error(`Error fetching tv ${id}:`, error);
    return null;
  }
}

export async function importByTmdb(
  tmdbId: string | number,
  type: "movie" | "tv" = "tv",
): Promise<any> {
  // ✅ change this URL to your real backend import route
  // examples: "/api/tmdb/import" or "/api/tmdb/import-tv"
  return api(`/api/tmdb/import`, {
    method: "POST",
    body: { tmdbId: String(tmdbId), type },
  });
}
