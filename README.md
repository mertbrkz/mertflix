# Mertflix — Movie/Series Wiki (Midterm)

Frontend-only Movie/Series Wiki built with React (Vite).

Data sources
- Series: TMDB (TV)
- Movies: TMDB (The Movie Database)

Features
- Series and movie listing + detail pages
- Search + pagination
- Save items to `My List` (stored in `localStorage`)

Quick start

```powershell
cd c:\Users\MSI\midterm-3355
npm install
npm run dev
```

TMDB (Movies)

The `/movies` page uses TMDB to list real movies.

Recommended (secure) setup
- Create a `.env` file in the project root (or copy from `.env.example`).
- `.env` is ignored via `.gitignore`, so it won't be pushed to GitHub.

```powershell
# Option A (recommended): TMDB v4 Read Access Token
VITE_TMDB_ACCESS_TOKEN=YOUR_TMDB_V4_TOKEN

# Option B: TMDB v3 API key
# VITE_TMDB_API_KEY=YOUR_TMDB_API_KEY
```

Optional: If you don't want to use `.env` (e.g. classroom/demo), open the Movies page and paste your token/api key once; it will be stored in `localStorage`.

Deploy (Vercel / Netlify)

If you deploy the app, your teacher can open the live link and see Movies without typing anything.

Vercel
- Import the GitHub repo in Vercel.
- Project Settings -> Environment Variables
	- Add `VITE_TMDB_ACCESS_TOKEN` (or `VITE_TMDB_API_KEY`) with your value.
	- Apply it to Production (and Preview if needed).
- Trigger a redeploy.

Netlify
- Site configuration -> Environment variables
	- Add `VITE_TMDB_ACCESS_TOKEN` (or `VITE_TMDB_API_KEY`).
- Trigger a new deploy.

Important note about “hiding” the token
- This is a frontend-only app; any token used directly from the browser can be extracted by someone who inspects the built JS or network requests.
- If you truly need to keep the TMDB token secret, use a small server-side proxy (serverless function) and call that from the frontend.

Build for production

```powershell
npm run build
npm run preview
```

Notes
- Series and Movies are fetched from TMDB: https://developer.themoviedb.org/

Next steps (optional enhancements)
- Add animations and richer card UI
- Implement user preferences dialog and genre-based recommendations
- Deploy to Vercel for hosting
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
