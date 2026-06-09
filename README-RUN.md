# Run guide (Backend + dashboard + frontent)

## 1) Backend
1. Open `Backend/.env` and set at least:
   - `MONGO_URL=...`
   - `JWT_SECRET=...`  (required for `/auth/*`)
   - `PORT=3002` (optional)
2. Start backend:
   ```bat
   cd Backend
   npm run start
   ```
3. Check:
   - `<BACKEND_URL>/health`
   - `<BACKEND_URL>/allholdings`

## 2) Dashboard
Start:
```bat
cd dashboard
npm start
```
Dashboard expects the API at:
- `process.env.REACT_APP_API_URL` (deployed backend URL)

Logout redirect:
- `process.env.REACT_APP_FRONTEND_URL` controls where logout and home send users
- set this to your deployed frontend URL on Render

## 3) Frontent
Start:
```bat
cd frontent
npm start
```

## Notes
- Auth endpoints added in `Backend/index.js`:
  - `POST /auth/signup`
  - `POST /auth/login`
  - `GET /auth/me` (requires `Authorization: Bearer <token>`)

