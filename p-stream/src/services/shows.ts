import { api } from "./api";

export interface Season {
  id: string;
  seasonNumber: number;
  name: string;
  episodeCount: number;
  overview?: string;
  posterPath?: string;
  airDate?: string;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview?: string;
  stillPath?: string;
  airDate?: string;
  runtime?: number;
  voteAverage?: number;
}

export interface Show {
  id: string;
  tmdbId: string;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  firstAirDate?: string;
  voteAverage?: number;
  voteCount?: number;
  genres?: string[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  seasons?: Season[];
  popularity?: number;
}

export async function getShowById(id: string | number): Promise<Show | null> {
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
      firstAirDate: response.first_air_date,
      voteAverage: response.vote_average,
      voteCount: response.vote_count,
      genres: response.genres?.map((g: any) => g.name) || [],
      numberOfSeasons: response.number_of_seasons,
      numberOfEpisodes: response.number_of_episodes,
      seasons: response.seasons?.map((s: any) => ({
        id: String(s.id),
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        overview: s.overview,
        posterPath: s.poster_path
          ? `https://image.tmdb.org/t/p/w500${s.poster_path}`
          : undefined,
        airDate: s.air_date,
      })),
      popularity: response.popularity,
    };
  } catch (error) {
    console.error(`Error fetching show ${id}:`, error);
    return null;
  }
}

export async function getSeasonEpisodes(
  showId: string | number,
  seasonNumber: number,
): Promise<Episode[]> {
  try {
    const response = await api(`/api/tmdb/tv/${showId}/season/${seasonNumber}`);
    return (response.episodes || []).map((ep: any) => ({
      id: String(ep.id),
      episodeNumber: ep.episode_number,
      seasonNumber: ep.season_number,
      name: ep.name,
      overview: ep.overview,
      stillPath: ep.still_path
        ? `https://image.tmdb.org/t/p/w300${ep.still_path}`
        : undefined,
      airDate: ep.air_date,
      runtime: ep.runtime,
      voteAverage: ep.vote_average,
    }));
  } catch (error) {
    console.error(
      `Error fetching episodes for show ${showId} season ${seasonNumber}:`,
      error,
    );
    return [];
  }
}
