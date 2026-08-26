# DigiChamber Backend

A real backend for the DigiChamber frontend: Node.js + Express + MongoDB (Mongoose), JWT auth, and Socket.io for
live chat. It replaces the frontend's fake in-memory `memStorage` with persistent, multi-tenant data storage, and
replaces the non-functional Google Drive upload with real file storage on disk.

## What this gives you

- **Real accounts & auth** — advocate signup/login (email+password), employee/intern login (DC ID + password), JWT sessions, bcrypt password hashing.
- **Multi-tenant data** — every advocate account is its own "workspace"; employees belong to exactly one workspace and (optionally) see only their assigned cases.
- **Persistent storage** — cases, hearings, tasks, reminders, diary entries, activity log, sticky notes, subscription plan, all in MongoDB.
- **Real file uploads** — files are stored on disk (`/uploads`) and served back through an authenticated download route, replacing the old fake Google Drive integration.
- **Real-time chat** — internal team chat (group + 1:1) and client chat, both persisted in MongoDB and pushed live over Socket.io.
- **DPDP Act compliance module** — consent tracking + history, data-rights requests, grievances, breach log, privacy settings — all persisted per workspace.

## 1. Setup

```bash
cd digichamber-backend
npm install
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — point this at a local MongoDB (`mongodb://127.0.0.1:27017/digichamber`) or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.
- `JWT_SECRET` — replace with a long random string (e.g. `openssl rand -hex 32`).
- `CLIENT_ORIGIN` — the URL your frontend will be served from (for CORS). Use `*` while testing locally if you like.

If you don't have MongoDB installed locally, the fastest path is a free Atlas cluster — create one, add a database
user, allow your IP, and paste the connection string into `MONGO_URI`.

## 2. Run it

```bash
npm run dev     # nodemon, auto-restarts on change
# or
npm start
```

You should see:
```
MongoDB connected: ...
DigiChamber API running on port 5000 (development)
```

Check it's alive: `GET http://localhost:5000/api/health`

## 3. Seed demo data (optional but recommended)

Recreates the same demo workspace the frontend's "Try Demo Mode" used to fake — a demo advocate, two employees, sample cases, hearings, tasks, and chat history.

```bash
npm run seed
```

Then log in with:
- **Advocate:** `demo@digichamber.in` / `demo`
- **Employee:** DC ID `EMP-DM01` / `demo123` (Priya Verma)
- **Employee:** DC ID `EMP-DM02` / `demo456` (Rohan Mehta)

## 4. Wire up the existing frontend

The original `digichamber.html` is a single self-contained file that keeps all its data in an in-memory `state`
object and a fake `memStorage`. To connect it to this backend:

1. Copy `frontend-integration/api-client.js` into your project and include it before your app's `<script>` block (or paste its contents into a `<script>` tag near the top of `digichamber.html`). It exposes a `DC` object — see the file for the full method list (`DC.cases.create()`, `DC.tasks.toggle()`, `DC.chat.sendMessage()`, etc.).
2. Add the Socket.io client for real-time chat:
   ```html
   <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
   ```
3. Go through each state-mutating function in the frontend (`addCase`, `addHearing`, `addTask`, `addReminder`, `sendMyChatMessage`, `submitRightsRequest`, etc.) and:
   - Replace the `state.X.push(...)` / `saveState()` pair with an `await DC.X.create(...)` call.
   - Replace reads like `state.cases` with data fetched via `await DC.cases.list()` (e.g. on `updateAllViews()` or right after login), and keep it cached in your existing `state` object if you want to avoid a bigger rewrite — that's the fastest path to "it just works."
   - Replace `loginUser()` / the demo-mode bootstrap with `await DC.auth.login(...)`, `DC.auth.employeeLogin(...)`, or `DC.auth.loginDemo()`, and store the returned user in `state.user` as before.
4. For file uploads, swap the Google Drive MCP calls (`uploadFileToDriveMCP`, `ensureDigiChamberFolder`) for `DC.files.upload(file, { caseId, desc })`.
5. For chat, call `DC.connectRealtime()` after login and listen for `DC.socket.on('chat:message', ...)` / `on('client-chat:message', ...)` to append incoming messages live, in addition to `DC.chat.sendMessage(...)` / `DC.clientChats.sendMessage(...)` to send them.

This is intentionally left as a guided rewire rather than an automatic patch, because the frontend renders directly
from the `state` object in dozens of places — swapping the data source safely means testing each screen. Happy to
do this integration pass function-by-function next if you'd like.

## API reference

All routes except `/api/auth/*` and `/api/health` require `Authorization: Bearer <token>`.

| Resource | Routes |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/employee-login`, `POST /api/auth/demo`, `GET /api/auth/me` |
| Cases | `GET/POST /api/cases`, `GET/PUT/DELETE /api/cases/:id` |
| Hearings | `GET/POST /api/hearings`, `PUT/DELETE /api/hearings/:id` |
| Tasks | `GET/POST /api/tasks`, `PATCH /api/tasks/:id/toggle`, `PUT/DELETE /api/tasks/:id` |
| Reminders | `GET/POST /api/reminders`, `DELETE /api/reminders/:id` |
| Diary | `GET/POST /api/diary`, `PUT/DELETE /api/diary/:id` |
| Files | `GET /api/files`, `POST /api/files/upload` (multipart), `GET /api/files/:id/download`, `DELETE /api/files/:id` |
| Activity | `GET /api/activity?limit=50` |
| Internal chat | `GET /api/chat/conversations`, `GET /api/chat/conversations/group`, `GET /api/chat/conversations/direct/:otherUserId`, `POST /api/chat/conversations/:id/messages` |
| Client chat | `GET /api/client-chats`, `GET /api/client-chats/:clientName`, `POST /api/client-chats/:clientName/messages` |
| Employees | `GET/POST /api/employees` (advocate-only to create), `DELETE /api/employees/:id` (advocate-only) |
| DPDP module | `GET/PUT /api/dpdp/consent`, `GET /api/dpdp/consent/log`, `GET/POST /api/dpdp/rights-requests`, `PATCH /api/dpdp/rights-requests/:id/status`, `GET/POST /api/dpdp/grievances`, `PATCH /api/dpdp/grievances/:id/status`, `GET/POST /api/dpdp/breach-log`, `PATCH /api/dpdp/breach-log/:id`, `GET/PUT /api/dpdp/settings` |
| Stickies | `GET/POST /api/stickies`, `PUT/DELETE /api/stickies/:id` |
| Subscription | `GET/PUT /api/subscription` |

Socket.io events: `chat:message`, `client-chat:message`, `conversation:typing` (client emits `conversation:join`,
`conversation:leave`, `client-chat:join`, `client-chat:leave`, `conversation:typing` to use them).

## Notes on scope and next steps

- **File storage** is local disk for simplicity. For a real deployment, swap `multer.diskStorage` in `routes/fileRoutes.js` for S3/Cloudinary/etc. so files survive redeploys and scale past one server.
- **Google Drive integration** from the original frontend was removed — it never worked outside a Claude Artifact sandbox. If you want real Google Drive sync, that needs a proper OAuth flow (Google API client ID/secret, consent screen, refresh tokens) which is a separate, sizeable piece of work.
- **Rate limiting** is only applied to auth routes right now; add more broadly before any public deployment.
- **Validation** is minimal (required-field checks). Consider adding a schema validation layer (e.g. `zod` or `joi`) before production use.
- **Tests** are not included. Given the size of the surface area, I'd suggest adding integration tests per route group as you wire up the frontend, so regressions show up immediately.
