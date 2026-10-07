# CodeAlpha NexaSpace

NexaSpace is a browser-based collaboration room for video calls, screen sharing, private whiteboards, live chat, and encrypted file sharing. The static HTML/CSS/JavaScript client uses WebRTC and Socket.IO; the Express/MongoDB server handles accounts, room membership, signaling, and file metadata.

## Links

- **Client:** [https://nexaspace-client.vercel.app](https://nexaspace-client.vercel.app)
- **Server/API and Socket.IO:** [https://nexaspace-server.vercel.app](https://nexaspace-server.vercel.app)
- **GitHub:** [sumonkaysar/CodeAlpha_NexaSpace](https://github.com/sumonkaysar/CodeAlpha_NexaSpace)

## Features

- Create/join rooms using a shareable room code and manage room status.
- Multi-participant peer-to-peer WebRTC calls, screen sharing, and private whiteboards.
- Live room chat and WebRTC signaling over authenticated Socket.IO.
- Client-side encrypted file sharing; shared passphrases are not sent to the server.

## Technology and layout

- **Client:** HTML, CSS, vanilla JavaScript, WebRTC, Socket.IO client, Web Crypto
- **Server:** Node.js, Express, MongoDB/Mongoose, JWT, Socket.IO
- **File storage:** Cloudinary stores encrypted raw file payloads

```text
client/                  Room, auth, media, whiteboard, and file UI
  js/                    Room state, WebRTC, chat, file crypto
  css/                   App, auth, and responsive styles
server/
  src/server.js          HTTP and authenticated Socket.IO server
  src/app.js             REST routes and Express setup
  src/app/modules/       Auth, rooms, and shared files
```

Read [`server/README.md`](server/README.md) for setup and [`client/README.md`](client/README.md) for REST and Socket.IO details.

## Operational notes

- Calls use peer-to-peer mesh connections, which are intended for small groups; larger rooms generally need an SFU.
- Room chat is live but not persisted. Whiteboards are private by default and are not synchronized unless explicitly shared as media.
- Shared files are encrypted in the browser with the room passphrase before upload. The passphrase is never sent to the server, and Cloudinary stores the encrypted raw payloads.
- The deployed Socket.IO service needs hosting-platform WebSocket support enabled. Local development uses port `5000`; configure the client origin in `CLIENT_ORIGIN`.

## Getting started

Create an account, sign in, then create a room or join one with its shareable code. Grant camera and microphone permissions to participate in a call. For local setup, environment configuration, and deployment considerations, see [`server/README.md`](server/README.md) and [`client/README.md`](client/README.md).

## Privacy and operational considerations

WebRTC media is exchanged peer-to-peer; the server provides signaling and does not relay the call media. The current mesh design is intended for small groups. Chat is transient, whiteboards are private by default, and shared files are encrypted in the browser before being stored.
