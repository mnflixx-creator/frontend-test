# MNFLIX Integration

This repository contains the P-Stream frontend integrated with MNFLIX backend for full streaming functionality.

## 🚀 Quick Start

Navigate to the `p-stream` directory and see the documentation:

```bash
cd p-stream
```

Then read:
- **`MNFLIX_QUICKSTART.md`** - Get started in 5 minutes
- **`MNFLIX_INTEGRATION.md`** - Complete technical guide
- **`IMPLEMENTATION_SUMMARY.md`** - What was built and why

## 📁 Repository Structure

```
frontend-test/
├── p-stream/              # P-Stream frontend application
│   ├── src/
│   │   ├── services/      # API integration layer (NEW)
│   │   ├── pages/         # UI pages including MNFLIX pages (NEW)
│   │   └── types/         # TypeScript definitions (NEW)
│   ├── MNFLIX_QUICKSTART.md       # Quick start guide
│   ├── MNFLIX_INTEGRATION.md      # Technical documentation
│   └── IMPLEMENTATION_SUMMARY.md  # Complete summary
├── backend/               # (External - mnflix-backend-newest)
├── extension/             # Browser extension
├── providers/             # Content providers
└── README.md              # This file
```

## ✨ What's New

This integration adds:

✅ **Backend API Integration** - Connect to MNFLIX backend for movie data
✅ **Video Streaming** - HLS.js player with Zenflify sources
✅ **Progress Tracking** - Auto-save and resume playback
✅ **Authentication** - JWT-based user auth
✅ **Browse Movies** - Grid view of all movies from backend
✅ **Movie Details** - Full movie information pages

## 🎯 Features

- **Browse Movies**: `/mnflix/browse` - See all movies from backend
- **Movie Details**: `/mnflix/movie/:id` - View complete movie info
- **Video Player**: `/mnflix/player/:id` - Stream with HLS.js
- **Progress Tracking**: Auto-save every 10 seconds
- **Authentication**: Login/register with JWT tokens
- **Subtitles**: Load subtitle tracks from backend

## 🔧 Setup

1. **Install dependencies**:
   ```bash
   cd p-stream
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp example.env .env
   ```
   Edit `.env` to set `VITE_API_URL=http://localhost:4000`

3. **Start development server**:
   ```bash
   pnpm dev
   ```

4. **Access MNFLIX**:
   - Open http://localhost:5173
   - Click the Film icon (🎬) in navigation
   - Browse and watch movies!

## 📖 Documentation

- **Quick Start**: `p-stream/MNFLIX_QUICKSTART.md`
- **Integration Guide**: `p-stream/MNFLIX_INTEGRATION.md`
- **Implementation Summary**: `p-stream/IMPLEMENTATION_SUMMARY.md`

## 🔐 Security

✅ All code passed security scans:
- CodeQL: 0 vulnerabilities
- Dependencies: No known issues
- JWT tokens properly managed

## 🧪 Testing

Requires MNFLIX backend running on http://localhost:4000

See `p-stream/MNFLIX_QUICKSTART.md` for testing checklist.

## 📝 API Requirements

Backend must implement these endpoints:
- Movies: `/api/movies`, `/api/movies/:id`, `/api/movies/trending`, `/api/movies/popular`
- Streaming: `/api/streams/:id`, `/api/subtitles/:id`
- Progress: `/api/progress/:id` (GET/POST)
- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- Favorites: `/api/favorites` (GET/POST)

See documentation for complete API specifications.

## 🛠️ Technology Stack

- **React** 18.3.1 - UI framework
- **TypeScript** - Type safety
- **React Router** - Navigation
- **ofetch** - HTTP client
- **HLS.js** - Video streaming
- **Vite** - Build tool

## 📦 What Was Added

**New Services** (4 files):
- `api.ts` - Base API client
- `movies.ts` - Movie operations
- `zenflify.ts` - Streaming & progress
- `auth.ts` - Authentication

**New Pages** (3 files):
- `BrowsePage.tsx` - Browse movies
- `MovieDetailPage.tsx` - Movie details
- `MNFLIXPlayerPage.tsx` - Video player

**Type Definitions**:
- `movie.ts` - TypeScript interfaces

## 🎬 Usage Flow

1. User clicks Film icon in navigation
2. Browse page loads movies from `/api/movies`
3. User clicks a movie
4. Detail page shows movie info from `/api/movies/:id`
5. User clicks "Play"
6. Player fetches stream from `/api/streams/:id`
7. Video plays with HLS.js
8. Progress saves every 10 seconds to `/api/progress/:id`

## 🤝 Contributing

1. Read the documentation in `p-stream/`
2. Make changes in feature branches
3. Test with MNFLIX backend
4. Submit pull request

## 📄 License

Same as P-Stream project.

## 🆘 Support

For issues or questions:
1. Check documentation in `p-stream/`
2. Review code comments
3. Create GitHub issue
4. Contact maintainers

---

**Status**: ✅ Ready for testing with MNFLIX backend
**Version**: 1.0.0
**Last Updated**: 2026-02-09
