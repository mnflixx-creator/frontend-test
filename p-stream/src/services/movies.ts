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

export async function getMovieById(id: string | number): Promise<Movie | null> {
  try {
    const response = await api(`/api/tmdb/movie/${id}`);
    return {
      id: String(response.id),
      tmdbId: String(response.id),
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

export async function getTvById(id: string | number): Promise<Movie | null> {
  try {
    const response = await api(`/api/tmdb/tv/${id}`);

    return {
      id: String(response.id),
      tmdbId: String(response.id),
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
        Array.isArray(response.episode_run_time) &&
        response.episode_run_time.length
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
