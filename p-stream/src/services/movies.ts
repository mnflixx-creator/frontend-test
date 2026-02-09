import { api } from "./api";
import type { Movie } from "@/types/movie";

export async function getAllMovies(): Promise<Movie[]> {
  try {
    const response = await api<{ movies: Movie[] }>("/api/movies");
    return response.movies || [];
  } catch (error) {
    console.error("Error fetching all movies:", error);
    return [];
  }
}

export async function getMovieById(id: string): Promise<Movie | null> {
  try {
    const response = await api<{ movie: Movie }>(`/api/movies/${id}`);
    return response.movie;
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
