# Troubleshooting

## Backend won’t start

- **Port 8080 in use:** stop the other process or change `server.port` in `application.yml`.
- **Missing env vars:** copy `env.example` to `.env` and set at least `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (and AI keys if you use those features).

## Database (development)

- Uses **H2 in-memory** with JPA `create-drop`. Console: `http://localhost:8080/h2-console` (JDBC URL from `application.yml`).

## Google Calendar OAuth

- **Redirect URI** in Google Cloud must match **`GOOGLE_REDIRECT_URI`** (default: `http://localhost:8080/api/syllabus/auth/google/callback`).
- **Testing mode:** add your Google account under OAuth consent screen → **Test users**.
- **`invalid_grant` / 401 on token:** client ID/secret mismatch — update `.env`, clear `~/.credentials/syllabussync`, connect again.
- **`ACCESS_TOKEN_SCOPE_INSUFFICIENT`:** add Calendar scopes on the OAuth consent screen, then clear stored credentials and reconnect.

## Vertex / Gemini AI

- **Vertex:** `GOOGLE_CLOUD_PROJECT`, `VERTEX_API_KEY` (or ADC), Vertex AI API enabled, billing on the project.
- **Gemini API key:** use `GEMINI_API_KEY` when not using Vertex for that path.

## Local task files

- `backend/tasks.json` and `backend/courses.json` are **gitignored** local snapshots. They are created when you use the app.
