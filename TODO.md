# TODO - Sport-Ecommerce

- [ ] Understand why frontend view is not showing (missing React bootstrap / no server route to serve frontend)
- [x] Fix `src/Frontend/index.jsx` so React actually mounts (currently empty)

- [ ] Add an HTML entry (`index.html`) and minimal client-side routing for /login and /register
- [ ] Update backend (`src/app.ts`) to serve the frontend build (or dev HTML) so visiting http://localhost:3000 shows the UI
- [ ] Add/adjust npm scripts or instructions to run frontend and backend reliably
- [ ] Ensure dev server doesn’t crash on missing MySQL by keeping server up even if DB is unreachable

- [ ] Restart and verify: landing page loads, /login shows form, /api/auth/* endpoints respond (once MySQL is available)

