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

The full HTTP request and Socket.IO event reference is in [`../client/README.md`](../client/README.md).

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
