async function loadRooms() {
  const list = document.getElementById("room-list");
  if (!list || !localStorage.getItem(tokenKey)) return;
  try {
    const rooms = await api("/rooms");
    document.getElementById("room-count").textContent = rooms.length;
    list.innerHTML = rooms.length
      ? rooms
          .map(
            (room) =>
              `
                <article class="room-card">
                  <div>
                    <h3>${escapeHtml(room.name)}</h3>
                    <p>Room ${escapeHtml(room._id.slice(-6))}</p>
                  </div>
                  <button
                    class="outline-button"
                    data-open-room="${room._id}"
                    type="button"
                  >
                    Open
                  </button>
                </article>
              `,
          )
          .join("")
      : '<p class="empty-state">No rooms yet. Create one or join with a room ID.</p>';
    list
      .querySelectorAll("[data-open-room]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          enterRoom(button.dataset.openRoom),
        ),
      );
  } catch (error) {
    list.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function createPeer(peerId) {
  if (peers.has(peerId)) return peers.get(peerId);
  const connection = new RTCPeerConnection(rtcConfig);
  localStream
    ?.getTracks()
    .forEach((track) => connection.addTrack(track, localStream));
  connection.onicecandidate = ({ candidate }) =>
    candidate && socket.emit("webrtc:ice", { to: peerId, candidate });
  connection.ontrack = ({ streams }) => {
    let video = document.getElementById(`video-${peerId}`);
    if (!video) {
      video = document.createElement("video");
      video.id = `video-${peerId}`;
      video.autoplay = true;
      video.playsInline = true;
      video.dataset.peer = peerId;
      document.getElementById("video-grid").append(video);
    }
    video.srcObject = streams[0];
  };
  connection.onconnectionstatechange = () => {
    if (["failed", "closed"].includes(connection.connectionState))
      closePeer(peerId);
  };
  peers.set(peerId, connection);
  return connection;
}

function closePeer(peerId) {
  peers.get(peerId)?.close();
  peers.delete(peerId);
  document.getElementById(`video-${peerId}`)?.remove();
}

async function enterRoom(roomId) {
  const room = await api(`/rooms/${roomId}`);
  currentRoom = room;
  document.getElementById("lobby").hidden = true;
  document.getElementById("meeting").hidden = false;
  document.getElementById("room-title").textContent = room.name;
  document.getElementById("copy-room").dataset.roomId = room.id;
  await loadFiles();
  socket = window.io("http://localhost:5200", {
    auth: { token: localStorage.getItem(tokenKey) },
  });
  socket.on("connect", () =>
    socket.emit("room:join", room.id, async (result) => {
      if (result.error) return showToast(result.error);
      for (const peerId of result.peers) {
        const connection = createPeer(peerId);
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        socket.emit("webrtc:offer", {
          to: peerId,
          description: connection.localDescription,
        });
      }
    }),
  );
  socket.on("peer:left", ({ peerId }) => closePeer(peerId));
  socket.on("webrtc:offer", async ({ from, description }) => {
    const connection = createPeer(from);
    await connection.setRemoteDescription(description);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    socket.emit("webrtc:answer", {
      to: from,
      description: connection.localDescription,
    });
  });
  socket.on("webrtc:answer", async ({ from, description }) =>
    peers.get(from)?.setRemoteDescription(description),
  );
  socket.on("webrtc:ice", async ({ from, candidate }) => {
    try {
      await peers.get(from)?.addIceCandidate(candidate);
    } catch (_error) {
      /* Candidate can arrive during connection setup. */
    }
  });
  socket.on("whiteboard:draw", drawRemoteStroke);
  socket.on("whiteboard:clear", clearBoard);
  socket.on("file:created", loadFiles);
}
