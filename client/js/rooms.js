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
                    <p>Room code: ${escapeHtml(room.uid)}</p>
                    <span class="room-status ${room.status}">${escapeHtml(room.status)}</span>
                  </div>
                  <div class="room-card-actions">
                    <button
                      class="outline-button"
                      data-open-room="${escapeHtml(room.uid)}"
                      type="button"
                      ${room.status === "closed" ? "disabled" : ""}
                    >
                      Open
                    </button>
                    ${
                      room.isOwner
                        ? `<button class="outline-button" data-room-status="${escapeHtml(room.uid)}" data-next-status="${room.status === "open" ? "closed" : "open"}" type="button">${room.status === "open" ? "Close" : "Reopen"}</button>`
                        : ""
                    }
                  </div>
                </article>
              `,
          )
          .join("")
      : '<p class="empty-state">No rooms yet. Create one or join with a room ID.</p>';

    list.querySelectorAll("[data-open-room]").forEach((button) =>
      button.addEventListener("click", async () => {
        try {
          const roomCode = button.dataset.openRoom;
          await roomRequest(
            "POST",
            `/rooms/${encodeURIComponent(roomCode)}/join`,
            {},
          );
          await enterRoom(roomCode);
        } catch (error) {
          showToast(error.message);
        }
      }),
    );
    list.querySelectorAll("[data-room-status]").forEach((button) =>
      button.addEventListener("click", async () => {
        try {
          await api(`/rooms/${encodeURIComponent(button.dataset.roomStatus)}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: button.dataset.nextStatus }),
          });
          await loadRooms();
          showToast(`Room ${button.dataset.nextStatus}.`);
        } catch (error) {
          showToast(error.message);
        }
      }),
    );
  } catch (error) {
    list.innerHTML = `<p class="empty-state">${escapeHtml(error.message)}</p>`;
  }
}

function createPeer(peerId) {
  if (peers.has(peerId)) return peers.get(peerId);

  const connection = new RTCPeerConnection(rtcConfig);
  localStream?.getAudioTracks().forEach((track) => {
    connection.addTrack(track, localStream);
  });
  const outgoingVideoTrack =
    whiteboardStream?.getVideoTracks()[0] ||
    screenStream?.getVideoTracks()[0] ||
    cameraTrack;
  if (outgoingVideoTrack)
    connection.addTrack(
      outgoingVideoTrack,
      whiteboardStream ||
        screenStream ||
        localStream ||
        new MediaStream([outgoingVideoTrack]),
    );

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
    if (["failed", "closed"].includes(connection.connectionState)) {
      closePeer(peerId);
      if (connection.connectionState === "failed")
        showToast("A participant connection failed. Try rejoining the room.");
    }
  };

  peers.set(peerId, connection);

  return connection;
}

function closePeer(peerId) {
  peers.get(peerId)?.close();
  peers.delete(peerId);
  pendingIceCandidates.delete(peerId);
  document.getElementById(`video-${peerId}`)?.remove();
}

async function enterRoom(roomId) {
  const room = await api(`/rooms/${encodeURIComponent(roomId)}`);
  if (room.status !== "open") throw new Error("This room is closed");
  await startMedia();
  currentRoom = room;

  document.getElementById("lobby").hidden = true;
  document.getElementById("meeting").hidden = false;
  document.getElementById("room-title").textContent = room.name;
  const copyButton = document.getElementById("copy-room");
  copyButton.dataset.roomId = room.uid;
  copyButton.textContent = `Room ${room.uid} · Copy room ID`;

  await loadFiles();

  socket = window.io("https://nexaspace-server.vercel.app", {
    auth: { token: localStorage.getItem(tokenKey) },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  socket.on("connect_error", (error) => {
    if (/invalid or expired token/i.test(error.message)) {
      localStorage.removeItem(tokenKey);
      showToast("Your session is invalid or expired. Please sign in again.");
      return;
    }
    showToast(`Could not connect to the room: ${error.message}`);
  });

  socket.on("connect", () =>
    socket.emit("room:join", room._id, (result) => {
      if (result.error) showToast(result.error);
    }),
  );

  socket.on("peer:joined", async ({ peerId }) => {
    try {
      const connection = createPeer(peerId);
      if (connection.signalingState !== "stable") return;
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      socket.emit("webrtc:offer", {
        to: peerId,
        description: connection.localDescription,
      });
    } catch (error) {
      showToast(error.message);
    }
  });

  socket.on("peer:left", ({ peerId }) => closePeer(peerId));

  socket.on("webrtc:offer", async ({ from, description }) => {
    const connection = createPeer(from);

    await connection.setRemoteDescription(description);
    await applyPendingIceCandidates(from, connection);

    const answer = await connection.createAnswer();

    await connection.setLocalDescription(answer);

    socket.emit("webrtc:answer", {
      to: from,
      description: connection.localDescription,
    });
  });

  socket.on("webrtc:answer", async ({ from, description }) => {
    const connection = peers.get(from);
    if (!connection) return;
    await connection.setRemoteDescription(description);
    await applyPendingIceCandidates(from, connection);
  });

  socket.on("webrtc:ice", async ({ from, candidate }) => {
    if (!candidate) return;
    const connection = peers.get(from);
    if (!connection || !connection.remoteDescription) {
      const candidates = pendingIceCandidates.get(from) || [];
      candidates.push(candidate);
      pendingIceCandidates.set(from, candidates);
      return;
    }
    try {
      await connection.addIceCandidate(candidate);
    } catch (error) {
      showToast(`Could not add a network candidate: ${error.message}`);
    }
  });

  socket.on("whiteboard:draw", drawRemoteStroke);

  socket.on("whiteboard:clear", clearBoard);

  socket.on("file:created", loadFiles);
  socket.on("room:closed", async ({ ownerId }) => {
    if (String(currentRoom?.owner?._id) === String(ownerId)) return;
    showToast("The room owner closed this room.");
    await leaveRoom();
  });
}

async function applyPendingIceCandidates(peerId, connection) {
  const candidates = pendingIceCandidates.get(peerId) || [];
  pendingIceCandidates.delete(peerId);
  for (const candidate of candidates) {
    await connection.addIceCandidate(candidate);
  }
}
