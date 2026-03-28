# Calendar-App

A small project that generates stylized calendar images from dates and serves a web UI to configure and preview them.

The repository contains two main parts:

- `api/` — Node.js + Express API that renders PNG calendar images using the Canvas library.
- `web/` — React frontend (Vite) that lets you enter dates, choose color/device and request generated images. In production the frontend is built and served by nginx; nginx proxies `/api` to the API service.

## Features

- Generate a framed calendar image (PNG) with highlighted dates.
- Supports multiple device sizes: `iphone16pm`, `iphone15`, and `default`.
- Dockerized mono-repo with `docker-compose` to run both the API and the web app together.

## Architecture

- API: `api/server.js`
  - Express server on port `3000` (inside container).
  - Endpoint: `POST /calendar` — receives JSON and streams a PNG image.
  - Key deps: `canvas`, `dayjs`, `express`, `cors`.

- Web: `web/`
  - React app (Vite) for quick prototyping and a UI to send requests to the API.
  - When built, files are served by `nginx` and `nginx.conf` proxies `/api/*` to the API container.

- docker-compose maps ports on the host:
  - API: host `23000` -> container `3000`
  - Web: host `28080` -> container `80`

## Quick start (recommended): Docker

This repository includes a `docker-compose.yml` that builds and runs both services.

In PowerShell (from the repo root):

```powershell
# build and run in the foreground
docker-compose up --build

# or run in detached mode
docker-compose up --build -d
```

After startup:

- Open the web UI at: http://localhost:28080
- The API is reachable at: http://localhost:23000/calendar (POST)

## Local development (without Docker)

If you prefer to run components individually during development:

API

```powershell
cd api
npm install
node server.js
# API will listen on http://localhost:3000
```

Web (dev)

```powershell
cd web
npm install
npm run dev
# Vite dev server runs at http://localhost:5173 by default
```

Note: the React app currently issues requests to `/api/calendar` (a relative path). When running the web dev server directly, either:

- Change the fetch URL in `web/src/App.jsx` to `http://localhost:3000/calendar` (for local API), or
- Add a proxy to `web/vite.config.js`:

```js
// example vite.config.js snippet
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
```

## API: /calendar

POST /calendar

Request body (JSON):

- `dates`: array of date strings (ISO format), e.g. `["2026-03-22","2026-03-27"]`
- `color`: hex color string used for highlighted dates (default `#ff3b30`)
- `device`: one of `iphone16pm`, `iphone15`, or `default` (controls canvas size)

Response:
- `image/png` stream containing the generated calendar image.

Example curl (talks to dockerized API on host port 23000):

```bash
curl -X POST http://localhost:23000/calendar \
  -H "Content-Type: application/json" \
  -d '{"dates":["2026-03-22","2026-03-27"],"color":"#ff3b30","device":"iphone16pm"}' \
  --output calendar.png
```

## Useful files

- `api/server.js` — main rendering logic and API endpoint.
- `web/src/App.jsx` — simple UI and example usage of the API.
- `web/Dockerfile` and `web/nginx.conf` — build and serve the frontend; nginx forwards `/api` to the API service.
- `api/Dockerfile` — installs native dependencies required by the Canvas library.

## Notes and troubleshooting

- The API uses the `canvas` package which requires native libraries (see `api/Dockerfile`). If installing `canvas` locally on Windows, make sure you have the required native build tools installed.
- If images are blank or the server crashes, check the API logs for canvas-related errors.
- There is a Webhook enabled on this repo

## Contributing

Contributions are welcome. Open a PR with a clear description of the change. Small items we might accept quickly:

- Add more device presets
- Improve UI/UX (image preview/export)
- Add tests for rendering logic

## License

This project currently has no license file.

---
