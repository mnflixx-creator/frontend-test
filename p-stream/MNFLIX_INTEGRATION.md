# MNFLIX Backend Integration

This document explains how the P-Stream frontend has been integrated with the MNFLIX backend for streaming functionality.

## Overview

The integration adds new pages and services to connect P-Stream with the MNFLIX backend API, enabling:
- Movie browsing from the backend database
- Movie detail pages with metadata
- Video streaming using HLS.js with Zenflify sources
- Watch progress tracking
- User authentication

## Architecture

### Services Layer (`src/services/`)

#### `api.ts`
Base API client using `ofetch`:
- Auto-injects JWT tokens from localStorage
- Handles 401 redirects to login
- Provides helper functions: `get()`, `post()`, `put()`, `del()`

#### `movies.ts`
Movie-related API calls:
- `getAllMovies()` - Fetch all movies
- `getMovieById(id)` - Get movie details
- `getTrendingMovies()` - Get trending movies
- `getPopularMovies()` - Get popular movies
- `addToFavorites(movieId)` - Add to favorites
- `getFavorites()` - Get user's favorites

#### `zenflify.ts`
Streaming and progress tracking:
- `getStreamingSourcesForMovie(movieId)` - Get HLS/MP4 streams
- `getSubtitles(movieId)` - Get subtitle files
- `saveWatchProgress(movieId, currentTime, duration)` - Save progress
- `getWatchProgress(movieId)` - Get user's watch progress

#### `auth.ts`
Authentication functions:
- `login(email, password)` - Login user
- `register(email, password, name)` - Register new user
- `getCurrentUser()` - Get current user info
- `logout()` - Logout and clear token
- `isAuthenticated()` - Check if user is logged in

### Pages (`src/pages/`)

#### `BrowsePage.tsx`
Route: `/mnflix/browse`
- Displays a grid of all movies from the backend
- Shows movie posters, titles, and release years
- Click on a movie to navigate to its detail page

#### `MovieDetailPage.tsx`
Route: `/mnflix/movie/:id`
- Shows full movie details (poster, backdrop, overview, genres, rating)
- "Play" button navigates to the player
- "Add to Favorites" button saves to user's favorites

#### `MNFLIXPlayerPage.tsx`
Route: `/mnflix/player/:id`
- Full-screen video player with HLS.js integration
- Automatically loads streaming sources from backend
- Supports HLS and MP4 formats
- Loads and displays subtitles
- Auto-saves watch progress every 10 seconds
- Resumes from last watched position

### Type Definitions (`src/types/movie.ts`)

Defines TypeScript interfaces for:
- `Movie` - Movie metadata
- `StreamSource` - Streaming source (HLS/MP4)
- `Subtitle` - Subtitle track
- `StreamingData` - Complete streaming response
- `WatchProgress` - Watch progress data
- `User` - User information
- `AuthResponse` - Authentication response

## Configuration

### Environment Variables

Create a `.env` file in the `p-stream/` directory:

```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=MNFLIX
VITE_BACKEND_URL=http://localhost:4000
```

### Backend API Endpoints

The integration expects these endpoints:

**Movies:**
- `GET /api/movies` - Get all movies
- `GET /api/movies/:id` - Get movie by ID
- `GET /api/movies/trending` - Get trending movies
- `GET /api/movies/popular` - Get popular movies

**Streaming (Zenflify):**
- `GET /api/streams/:movieId` - Get streaming sources
- `GET /api/subtitles/:movieId` - Get subtitles

**Progress:**
- `GET /api/progress/:movieId` - Get watch progress
- `POST /api/progress/:movieId` - Save watch progress

**Authentication:**
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Get current user

**Favorites:**
- `POST /api/favorites` - Add to favorites
- `GET /api/favorites` - Get favorites

## Usage

### 1. Start Backend

Ensure the MNFLIX backend is running on `http://localhost:4000`

### 2. Start Frontend

```bash
cd p-stream
pnpm install
pnpm dev
```

### 3. Access MNFLIX Features

- Click the Film icon in the navigation bar to browse MNFLIX movies
- Or navigate directly to:
  - `/mnflix/browse` - Browse all movies
  - `/mnflix/movie/:id` - View movie details
  - `/mnflix/player/:id` - Watch a movie

## Flow

1. **Browse Movies**: User navigates to `/mnflix/browse`
   - Fetches all movies from `GET /api/movies`
   - Displays movie grid

2. **View Details**: User clicks on a movie
   - Navigates to `/mnflix/movie/:id`
   - Fetches movie details from `GET /api/movies/:id`
   - Shows movie information

3. **Play Movie**: User clicks "Play"
   - Navigates to `/mnflix/player/:id`
   - Fetches streaming sources from `GET /api/streams/:id`
   - Fetches subtitles from `GET /api/subtitles/:id`
   - Gets watch progress from `GET /api/progress/:id`
   - Initializes HLS.js with stream URL
   - Resumes from last position if available

4. **Watch Progress**: While video plays
   - Every 10 seconds: `POST /api/progress/:id` with current time
   - Allows resuming from where user left off

## Authentication

The auth service stores JWT tokens in localStorage under the key `__MW::auth`.

When a user logs in:
1. `POST /api/auth/login` with credentials
2. Backend returns `{ token, user }`
3. Token is stored in localStorage
4. All subsequent API calls include `Authorization: Bearer {token}` header

On 401 responses, the user is redirected to `/login`.

## HLS.js Integration

The player uses HLS.js for streaming:
- Detects if HLS is supported (modern browsers)
- Falls back to native HLS (Safari) or MP4 if needed
- Handles quality levels automatically
- Recovers from network/media errors

## Next Steps

To complete the integration:
1. Test with real backend
2. Implement error handling and loading states
3. Add user login/register UI updates
4. Test streaming with various video formats
5. Verify progress tracking works correctly
6. Handle CORS if backend is on different domain

## Notes

- The existing P-Stream functionality remains unchanged
- MNFLIX integration is isolated under `/mnflix/*` routes
- Both systems can coexist (TMDB discovery + MNFLIX streaming)
- JWT authentication is separate from P-Stream's account system
