- [ ] Add `express.static()` to serve the React build from `dashboard/build` and/or `frontent/build`.
- [ ] Add SPA fallback: `app.get('*', ...)` to return `index.html` for all non-API GET routes.
- [ ] Keep `/api/*` routes working (do NOT break authRequired middleware).
- [ ] After change, redeploy to Render and verify:
  - [ ] GET /health returns JSON
  - [ ] GET / returns HTML
  - [ ] GET /login returns HTML (React Router handles it)

