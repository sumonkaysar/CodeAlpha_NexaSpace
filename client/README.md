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

## Configuration

The REST API origin is set in `js/common.js` and the Socket.IO origin is set in `js/rooms.js`. Set both to the same server deployment. The server must allow the exact client origin via `CLIENT_ORIGIN`. The app uses the Socket.IO client library from a CDN.

## Links

- **Live client:** [https://nexaspace-client.vercel.app](https://nexaspace-client.vercel.app)
- **Live server:** [https://nexaspace-server.vercel.app](https://nexaspace-server.vercel.app)
- **GitHub:** [sumonkaysar/CodeAlpha_NexaSpace](https://github.com/sumonkaysar/CodeAlpha_NexaSpace)

## Backend integration

Full REST API requests/responses, authentication rules, and Socket.IO event payloads are documented in [`../server/README.md`](../server/README.md). All live room participation requires an account and an open room; clients authenticate REST and Socket.IO using the JWT.

## Privacy and media notes

- Browsers generally allow camera and microphone access only on HTTPS or localhost.
- Calls use peer-to-peer mesh connections and are intended for small groups.
- Whiteboards are private by default. Sharing a whiteboard or screen is an explicit media action.
- Chat messages are ephemeral and are not persisted by the server.
- Files are encrypted in the browser; the room passphrase is not sent to the server. Store the passphrase securely because it is needed to decrypt shared files.

## Troubleshooting

- If the browser cannot access the camera or microphone, use localhost or HTTPS and grant the site permission.
- If signaling fails, confirm the Socket.IO URL, WebSocket availability, and that the client origin is allowed by the server.
- If file upload fails, verify Cloudinary credentials and the 25 MB server upload limit.
- If a file cannot be decrypted, confirm that the same passphrase was used by the uploader and downloader.

## Browser support

Use a current browser with WebRTC, MediaDevices, Web Crypto, Fetch, and WebSocket support. Network connectivity is required for the Socket.IO client CDN and hosted media.
