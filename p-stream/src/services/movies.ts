import type { Movie } from "@/types/movie";

import { api } from "./api";

export async function getAllMovies(): Promise<Movie[]> {
  try {
    // Changed to use TMDB trending endpoint instead of database movies
    const response = await api<{ results: Movie[] }>("/api/tmdb/trending");
    return response.results || [];
  } catch (error) {
    console.error("Error fetching all movies:", error);
    return [];
  }
}

export async function getMovieById(id: string): Promise<Movie | null> {
  try {
    // For TMDB movies, fetch from TMDB API using tmdbId
    const response = await api<Movie>(`/api/tmdb/movie/${id}`);
    return response;
  } catch (error) {
    console.error(`Error fetching movie ${id}:`, error);
    return null;
  }
}

export async function getTrendingMovies(): Promise<Movie[]> {
  try {
    const response = await api<{ movies: Movie[] }>("/api/movies/trending");
    return response.movies || [];
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    return [];
  }
}

export async function getPopularMovies(): Promise<Movie[]> {
  try {
    const response = await api<{ movies: Movie[] }>("/api/movies/popular");
    return response.movies || [];
  } catch (error) {
    console.error("Error fetching popular movies:", error);
    return [];
  }
}

export async function addToFavorites(movieId: string): Promise<boolean> {
  try {
    await api("/api/favorites", {
      method: "POST",
      body: { movieId },
    });
    return true;
  } catch (error) {
    console.error(`Error adding movie ${movieId} to favorites:`, error);
    return false;
  }
}

export async function getFavorites(): Promise<Movie[]> {
  try {
    const response = await api<{ movies: Movie[] }>("/api/favorites");
    return response.movies || [];
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}
