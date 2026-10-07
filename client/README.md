# NexaSpace Client

NexaSpace's client is a static browser app for calls and collaboration rooms. It uses camera/microphone APIs, peer-to-peer WebRTC, Socket.IO signaling, and browser-side encryption for shared files.

## Features and files

- `index.html`, `login.html`, `register.html`: application and account pages
- `js/rooms.js`: room discovery, membership, and signaling
- `js/media.js`: local media and screen sharing
- `js/whiteboard.js`: private canvas and sharing controls
- `js/files.js`: encrypted file uploads/downloads
- `js/app.js`, `js/common.js`: chat and shared app behavior

## Run locally

1. Start the server as described in [`../server/README.md`](../server/README.md).
2. Change `API` in `js/common.js` to `http://localhost:5000/api` and the Socket.IO URL in `js/rooms.js` to `http://localhost:5000`.
3. Serve the client on an allowed origin, such as `http://localhost:5500` (for example, `python -m http.server 5500` from this directory). Open that origin in the browser. Camera/microphone access requires HTTPS or localhost.
4. Register/sign in and create or join a room. Each participant needs the shared passphrase to decrypt files; it is not uploaded.

## Links

- **Live client:** [https://nexaspace-client.vercel.app](https://nexaspace-client.vercel.app)
- **Live server:** [https://nexaspace-server.vercel.app](https://nexaspace-server.vercel.app)
- **GitHub:** [sumonkaysar/CodeAlpha_NexaSpace](https://github.com/sumonkaysar/CodeAlpha_NexaSpace)

## REST API

Base URL: `http://localhost:5000/api` locally; hosted URL: `https://nexaspace-server.vercel.app/api`. Except registration, requests require `Authorization: Bearer <token>`. JSON requests use `Content-Type: application/json`. Errors return JSON with a `message`.

| Method | Path | Request / response |
|---|---|---|
| `POST` | `/auth/register` | `{ "name": "Sam", "email": "sam@example.com", "password": "..." }`; returns `{ "id": "...", "name": "Sam", "email": "sam@example.com" }` (no token until login). |
| `POST` | `/auth/login` | `{ "email": "sam@example.com", "password": "..." }`; returns `{ "token": "...", "user": { "id": "...", "name": "...", "email": "..." } }`. |
| `GET` | `/rooms` | Lists rooms the user belongs to, with owner information and `isOwner`. |
| `POST` | `/rooms` | `{ "name": "Design sync" }`; creates a room and returns it. |
| `GET` | `/rooms/:id` | Gets an accessible room. The identifier may be a room ID or supported room code. |
| `POST` | `/rooms/:id/join` | No body; joins an open room by ID or room code and returns `{ "_id": "...", "uid": "...", "name": "...", "status": "open", "members": 2 }`. |
| `PATCH` | `/rooms/:id/status` | `{ "status": "open" }` or `{ "status": "closed" }`; owner only; returns room ID/code/status. |
| `POST` | `/rooms/:id/leave` | Optional `{ "closeForAll": true }` for the owner; returns room ID/code/status. Socket disconnection is handled by the client; this route only closes the room when `closeForAll` is true. |
| `DELETE` | `/rooms/:id` | Deletes an owned room; success is `204 No Content`. |
| `GET` | `/files?room=:roomId` | Lists room files without exposing storage URLs or internal object names. |
| `POST` | `/files` | Multipart form fields: `room` (room ID), optional `name` (original filename), and `file` (encrypted payload). Max upload 25 MB; returns file `id`, room, original name, size, and timestamp. |
| `GET` | `/files/:id/download` | Downloads the encrypted binary payload for a room member. |
| `POST` | `/uploads/image` | Authenticated multipart image upload endpoint; separate from encrypted file sharing. Returns `{ "message": "Image uploaded successfully", "url": "...", "publicId": "..." }`. |

## Socket.IO events

Connect to the server origin (not `/api`) with a valid JWT. The browser client uses WebSocket transport.

| Event | Direction | Payload / behavior |
|---|---|---|
| `room:join` | Client → server | Send room database ID and acknowledgement. Success `{ "roomId": "...", "peers": ["socket-id"] }`; failure `{ "error": "..." }`. The user must already be a room member. |
| `peer:joined` | Server → room | `{ "peerId": "...", "user": { "id": "...", "name": "..." } }`. |
| `peer:left` | Server → room | `{ "peerId": "..." }` when a connected participant disconnects. |
| `webrtc:offer` | Both directions | Relay `{ "to": "<socket-id>", "description": <RTCSessionDescription> }`; incoming relay includes `from`. |
| `webrtc:answer` | Both directions | Relay `{ "to": "<socket-id>", "description": <RTCSessionDescription> }`; incoming relay includes `from`. |
| `webrtc:ice` | Both directions | Relay `{ "to": "<socket-id>", "candidate": <RTCIceCandidate> }`; incoming relay includes `from`. |
| `chat:send` | Client → server | `{ "message": "Hello room" }` with acknowledgement `{ "ok": true }` or `{ "error": "..." }`; messages are limited to 2,000 characters and are not persisted. |
| `chat:message` | Server → room | `{ "id": "...", "message": "...", "user": { "id": "...", "name": "..." }, "createdAt": "..." }`. |
| `file:created` | Server → room | New-file metadata (`id`, `originalName`, `size`, `uploader`, `createdAt`); encrypted file bytes are delivered through the REST download endpoint. |
| `room:closed` | Server → room | `{ "ownerId": "..." }` when the room closes. |

The whiteboard is private by default and is not synchronized to other members; sharing it explicitly sends the selected media stream.
