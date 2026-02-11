/* Define shit here */

// Define the Media type
export interface Media {
  id: number;
  poster_path: string;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
}

// Update the Movie and TVShow interfaces to extend the Media interface
export interface Movie extends Media {
  title: string;
}

export interface TVShow extends Media {
  name: string;
}

// Define the Genre type
export interface Genre {
  id: number;
  name: string;
}

// Define the Category type
export interface Category {
  name: string;
  endpoint: string;
  urlPath: string;
  mediaType: "movie" | "tv";
}

export const categories: Category[] = [
  {
    name: "Trending",
    endpoint: "/trending/movie/day",
    urlPath: "trending",
    mediaType: "movie",
  },
];

export const tvCategories: Category[] = [
  {
    name: "Trending",
    endpoint: "/trending/tv/day",
    urlPath: "trending",
    mediaType: "tv",
  },
];
