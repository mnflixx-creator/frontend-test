export interface Movie {
  id: string;
  tmdbId?: string;
  title: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  voteAverage?: number;
  voteCount?: number;
  genres?: string[];
  runtime?: number;
  tagline?: string;
  popularity?: number;
}

export interface StreamSource {
  url: string;
  quality: string;
  type: 'hls' | 'mp4';
}

export interface Subtitle {
  url: string;
  language: string;
  label: string;
}

export interface StreamingData {
  streams: StreamSource[];
  subtitles: Subtitle[];
  quality: string[];
}

export interface WatchProgress {
  movieId: string;
  currentTime: number;
  duration: number;
  watched: number;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
