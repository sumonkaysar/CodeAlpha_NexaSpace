# CodeAlpha NexaSpace

A browser-based video collaboration room with multi-user WebRTC calling, screen sharing, a synchronized whiteboard, and encrypted file sharing. Its static client follows NexaCart's HTML/CSS/JavaScript approach; the backend uses modular Express, MongoDB, and Socket.IO.

## Run

1. Copy `server/.env.example` to `server/.env`, set `MONGO_URI`, a long random `JWT_SECRET`, and the Cloudinary credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
2. From `server`, run `pnpm install` and `pnpm dev`.
3. Serve `client` from `http://localhost:5500` (WebRTC camera/microphone require localhost or HTTPS). Open `index.html`.

The API defaults to `http://localhost:5200/api`. Create an account, sign in, then create or join a room. All room members need the shared room passphrase to encrypt/decrypt shared files; the passphrase is never sent to the server. Encrypted file payloads are stored in Cloudinary as raw files in `CLOUDINARY_FILES_FOLDER` (by default, `nexaspace/encrypted-files`) and remain encrypted at rest; this Cloudinary folder keeps encrypted payloads organized separately from images and is not a local upload directory. Image uploads use the authenticated `POST /api/uploads/image` endpoint. WebRTC media uses browser DTLS-SRTP. Deploy behind HTTPS and configure `CLIENT_ORIGIN` before use outside local development.

The initial implementation uses peer-to-peer mesh connections, suitable for small calls. Larger rooms should use an SFU such as mediasoup or LiveKit.
