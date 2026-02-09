# MNFLIX Integration - Quick Start Guide

This guide helps you get started with the MNFLIX backend integration in the P-Stream frontend.

## Prerequisites

- Node.js 18+ 
- pnpm package manager
- MNFLIX backend running on http://localhost:4000

## Installation

1. Navigate to the p-stream directory:
```bash
cd p-stream
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment configuration:
```bash
cp example.env .env
```

4. Edit `.env` and configure:
```env
VITE_API_URL=http://localhost:4000
VITE_APP_NAME=MNFLIX
```

## Running the Application

Start the development server:
```bash
pnpm dev
```

The app will be available at http://localhost:5173

## Testing the Integration

### 1. Access MNFLIX Features

Click the Film icon (🎬) in the navigation bar to access MNFLIX movies, or navigate to:

- **Browse Movies**: http://localhost:5173/mnflix/browse
- **Movie Details**: http://localhost:5173/mnflix/movie/{id}
- **Video Player**: http://localhost:5173/mnflix/player/{id}

### 2. Test Workflow

1. Click Film icon in navigation
2. Browse list of movies from backend
3. Click on a movie to see details
4. Click "Play" to start streaming
5. Video should load with HLS.js
6. Progress saves every 10 seconds
7. Refresh page and resume from last position

## API Endpoints Required

Your backend should implement these endpoints:

### Movies
- `GET /api/movies` - List all movies
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies/trending` - Trending movies
- `GET /api/movies/popular` - Popular movies

### Streaming
- `GET /api/streams/:movieId` - Get streaming sources (HLS/MP4)
- `GET /api/subtitles/:movieId` - Get subtitle tracks

### Progress
- `GET /api/progress/:movieId` - Get user progress
- `POST /api/progress/:movieId` - Save progress
  ```json
  {
    "currentTime": 120.5,
    "duration": 3600,
    "watched": 3.35
  }
  ```

### Authentication
- `POST /api/auth/login` - Login
  ```json
  { "email": "user@example.com", "password": "secret" }
  ```
- `POST /api/auth/register` - Register
- `GET /api/auth/me` - Current user

### Favorites
- `POST /api/favorites` - Add favorite
- `GET /api/favorites` - List favorites

## Response Formats

### Movie Object
```json
{
  "id": "123",
  "title": "Example Movie",
  "overview": "Movie description...",
  "posterPath": "https://image.url/poster.jpg",
  "backdropPath": "https://image.url/backdrop.jpg",
  "releaseDate": "2024-01-01",
  "voteAverage": 8.5,
  "genres": ["Action", "Thriller"],
  "runtime": 120
}
```

### Streaming Response
```json
{
  "streams": [
    {
      "url": "https://stream.url/playlist.m3u8",
      "quality": "1080p",
      "type": "hls"
    }
  ],
  "subtitles": [
    {
      "url": "https://subtitle.url/en.vtt",
      "language": "en",
      "label": "English"
    }
  ],
  "quality": ["1080p", "720p", "480p"]
}
```

## Architecture

```
src/
├── services/           # API communication layer
│   ├── api.ts         # Base API client (ofetch)
│   ├── auth.ts        # Authentication
│   ├── movies.ts      # Movie operations
│   └── zenflify.ts    # Streaming & progress
├── pages/             # UI pages
│   ├── BrowsePage.tsx        # /mnflix/browse
│   ├── MovieDetailPage.tsx   # /mnflix/movie/:id
│   └── MNFLIXPlayerPage.tsx  # /mnflix/player/:id
├── types/
│   └── movie.ts       # TypeScript interfaces
└── setup/
    └── App.tsx        # Routes configuration
```

## Key Features

### 1. HLS.js Integration
- Automatically uses HLS.js for .m3u8 streams
- Falls back to native HLS (Safari)
- Falls back to MP4 if HLS unavailable
- Automatic quality switching
- Error recovery

### 2. Progress Tracking
- Auto-saves every 10 seconds
- Resumes from last position
- Calculates percentage watched

### 3. Authentication
- JWT token stored in localStorage
- Auto-injected in API requests
- 401 redirects to login

### 4. Subtitles
- Loads from backend
- Multiple language support
- Standard WebVTT format

## Troubleshooting

### CORS Issues
If you see CORS errors, ensure your backend allows:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Video Won't Play
1. Check browser console for errors
2. Verify stream URL is accessible
3. Ensure proper content-type headers
4. Check if HLS.js is loaded

### Progress Not Saving
1. Check if user is authenticated
2. Verify `/api/progress/:id` endpoint works
3. Check browser console for errors

### Movies Not Loading
1. Ensure backend is running on http://localhost:4000
2. Check `/api/movies` endpoint
3. Verify VITE_API_URL in .env
4. Check network tab in browser DevTools

## Development

### Linting
```bash
pnpm lint
pnpm lint:fix
```

### Building
```bash
pnpm build
```

### Type Checking
```bash
pnpm type-check  # if available
```

## Integration with Existing P-Stream

The MNFLIX integration is isolated under `/mnflix/*` routes and does not interfere with existing P-Stream functionality:

- Original routes still work (`/`, `/discover`, `/media/:id`)
- Uses same components and layouts
- Adds Film icon to navigation
- Can coexist with TMDB discovery

## Support

For detailed architecture and API specifications, see:
- `MNFLIX_INTEGRATION.md` - Full integration documentation
- `src/services/` - API service implementations
- `src/types/movie.ts` - Type definitions

## License

Same as P-Stream project.
