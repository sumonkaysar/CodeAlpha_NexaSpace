# NexaSpace Server

NexaSpace Server provides account, room, and encrypted file APIs plus Socket.IO signaling for browser WebRTC calls. MongoDB stores room membership and file metadata; Cloudinary stores encrypted file payloads.

## Links

- **Live API and Socket.IO:** [https://nexaspace-server.vercel.app](https://nexaspace-server.vercel.app)
- **Client:** [https://nexaspace-client.vercel.app](https://nexaspace-client.vercel.app)
- **GitHub:** [sumonkaysar/CodeAlpha_NexaSpace](https://github.com/sumonkaysar/CodeAlpha_NexaSpace)

## Features and stack

- JWT-protected room membership, room lifecycle, and file access.
- Socket.IO room membership, peer discovery, WebRTC offer/answer/ICE signaling, and live chat.
- Express, Node.js, MongoDB/Mongoose, Socket.IO, `jsonwebtoken`, and Cloudinary/Multer.
- Files are encrypted in the client before upload; Cloudinary stores raw encrypted payloads.

## Get the project

```sh
git clone https://github.com/sumonkaysar/CodeAlpha_NexaSpace.git
cd CodeAlpha_NexaSpace/server
```

## Install dependencies

Choose one package manager in `server/`:

```sh
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

## Configure and run on port 5000

Create `.env` in this directory with a MongoDB URI, a long private JWT secret, and Cloudinary credentials. Add allowed browser origins to `CLIENT_ORIGIN` as a comma-separated list. For local use, allow `http://localhost:5500`; production uses `https://nexaspace-client.vercel.app`.

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/nexaspace
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_ORIGIN=http://localhost:5500,https://nexaspace-client.vercel.app
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=nexaspace
CLOUDINARY_FILES_FOLDER=nexaspace/encrypted-files
```

Start MongoDB and run one of:

```sh
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun run dev
```

With `PORT=5000`, HTTP API and Socket.IO listen on `http://localhost:5000`. WebRTC client media APIs require HTTPS or localhost. For production deployment, configure the hosting platform to support WebSockets and use the WebSocket transport required by this client. Production start commands: `npm start`, `yarn start`, `pnpm start`, or `bun run start`.

## API, sockets, and structure

Base URL: `http://localhost:5000/api` locally or `https://nexaspace-server.vercel.app/api` deployed. Authenticated routes require `Authorization: Bearer <token>`. Send JSON for ordinary requests and multipart form-data for uploads. Errors return JSON with a `message`.

| Method | Path | Request body / response |
|---|---|---|
| `GET` | `/` | Public health response `{ "name": "NexaSpace API", "status": "ready" }` (outside `/api`). |
| `POST` | `/auth/register` | `{ "name": "Sam", "email": "sam@example.com", "password": "at-least-8-characters" }`; returns `{ "id": "...", "name": "Sam", "email": "sam@example.com" }` (`201`). |
| `POST` | `/auth/login` | `{ "email": "sam@example.com", "password": "..." }`; returns `{ "token": "...", "user": { "id": "...", "name": "...", "email": "..." } }`. |
| `GET` | `/rooms` | Returns the current user's rooms with owner data and an `isOwner` field. |
| `POST` | `/rooms` | `{ "name": "Design sync" }`; creates and returns a room (`201`). |
| `GET` | `/rooms/:id` | Returns an accessible room; identifier can be the room MongoDB ID or room code. |
| `POST` | `/rooms/:id/join` | No body; joins an open room by ID or code; returns `{ "_id": "...", "uid": "...", "name": "...", "status": "open", "members": 2 }`. |
| `PATCH` | `/rooms/:id/status` | `{ "status": "open" }` or `{ "status": "closed" }`; owner-only; returns `{ "_id": "...", "uid": "...", "status": "closed" }`. Closing notifies connected room participants. |
| `POST` | `/rooms/:id/leave` | Optional `{ "closeForAll": true }` (owner-only); returns room ID, code, and status. Client disconnect is performed by Socket.IO, not this endpoint. |
| `DELETE` | `/rooms/:id` | Owner-only; deletes the room; `204 No Content`. |
| `GET` | `/files?room=:roomId` | Lists file metadata for an accessible room; storage URL and internal storage name are excluded. |
| `POST` | `/files` | Multipart fields: `room` (room database ID), optional `name`, and `file` (encrypted bytes, maximum 25 MB); returns `{ "id": "...", "room": "...", "originalName": "...", "size": 1234, "createdAt": "..." }` (`201`). |
| `GET` | `/files/:id/download` | Returns the encrypted binary file for an authorized room member with an attachment filename. |
| `POST` | `/uploads/image` | Multipart form field `image` (JPG/PNG/WEBP/GIF, maximum 5 MB); returns `{ "message": "Image uploaded successfully", "url": "https://...", "publicId": "..." }` (`201`). |

Accounts require a name of at least two characters, a valid email, and a password of at least eight characters. Login tokens expire after 12 hours. All room and file routes enforce room membership; only the owner can change room status or delete a room.

### Socket.IO

Connect to the server origin, not the `/api` base URL. The browser currently requests WebSocket transport:

```js
const socket = io("http://localhost:5000", {
  auth: { token: "<JWT>" },
  transports: ["websocket"],
});
```

| Event | Direction | Payload / behavior |
|---|---|---|
| `room:join` | Client → server | Send room MongoDB ID plus acknowledgement. Success `{ "roomId": "...", "peers": ["socket-id"] }`; failure `{ "error": "..." }`. User must already be a member and room must be open. |
| `peer:joined` | Server → room | `{ "peerId": "...", "user": { "id": "...", "name": "..." } }`. |
| `peer:left` | Server → room | `{ "peerId": "..." }` on disconnect. |
| `webrtc:offer` | Client → peer via server | `{ "to": "<socket-id>", "description": <RTCSessionDescription> }`; recipient payload includes `from`. |
| `webrtc:answer` | Client → peer via server | `{ "to": "<socket-id>", "description": <RTCSessionDescription> }`; recipient payload includes `from`. |
| `webrtc:ice` | Client → peer via server | `{ "to": "<socket-id>", "candidate": <RTCIceCandidate> }`; recipient payload includes `from`. |
| `chat:send` | Client → server | `{ "message": "Hello room" }`; acknowledgement `{ "ok": true }` or `{ "error": "..." }`. Empty messages are rejected; maximum length is 2,000 characters. |
| `chat:message` | Server → room | `{ "id": "...", "message": "...", "user": { "id": "...", "name": "..." }, "createdAt": "..." }`; not persisted. |
| `file:created` | Server → room | Metadata `{ "id": "...", "originalName": "...", "size": 1234, "uploader": { "id": "...", "name": "..." }, "createdAt": "..." }`. |
| `room:closed` | Server → room | `{ "ownerId": "..." }` when an owner closes the room. |

Signal relay events are sent only when sender and recipient belong to the same active Socket.IO room. Standard `connect`, `disconnect`, and `connect_error` events are emitted by Socket.IO.

See [`../client/README.md`](../client/README.md) for browser configuration, local serving, and media troubleshooting.

```text
src/
  server.js                 HTTP listener and authenticated Socket.IO signaling
  app.js                    Express middleware and API mounts
  app/
    config/                 MongoDB, Cloudinary, and CORS
    middlewares/            Auth, image/file upload, and error handling
    modules/
      auth/                 Registration and login
      room/                 Room membership and lifecycle
      file/                 Encrypted-file metadata and downloads
```

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | HTTP and Socket.IO port; set to `5000` locally (fallback is `5200`). |
| `MONGO_URI` | MongoDB connection string. |
| `JWT_SECRET` | Private JWT signing key. |
| `CLIENT_ORIGIN` | Comma-separated allowlist of browser origins; include the local client origin and deployed client origin. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Cloudinary credentials for images and encrypted file payloads. |
| `CLOUDINARY_FOLDER` | Cloudinary image folder. |
| `CLOUDINARY_FILES_FOLDER` | Cloudinary raw-file folder for encrypted payloads. |

## Operational notes

MongoDB must be available before the server can serve requests. The deployed environment must support WebSockets for realtime features. File downloads return encrypted bytes; decryption happens in the browser and requires the original room passphrase. Never store or send that passphrase to the API.
