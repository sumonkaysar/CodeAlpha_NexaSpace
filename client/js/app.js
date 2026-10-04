document.addEventListener("DOMContentLoaded", () => {
  currentUserId = getTokenUserId();
  const authForm = document.getElementById("auth-form");

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(authForm));

    try {
      if (authForm.dataset.mode === "register")
        await roomRequest("POST", "/auth/register", data);

      const result = await roomRequest("POST", "/auth/login", data);

      localStorage.setItem(tokenKey, result.token);
      currentUserId = result.user.id;
      location.href = "index.html";
    } catch (error) {
      document.getElementById("form-message").textContent = error.message;
    }
  });

  if (localStorage.getItem(tokenKey) && document.getElementById("room-list")) {
    document.getElementById("account-actions").innerHTML =
      '<button class="outline-button" id="logout" type="button">Sign out</button>';

    document.getElementById("logout").addEventListener("click", () => {
      localStorage.removeItem(tokenKey);
      location.reload();
    });

    loadRooms();
  }

  document.getElementById("chat-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;
    if (!socket?.connected) {
      showToast("Chat is not connected. Please reconnect to the room.");
      return;
    }

    socket.emit("chat:send", { message }, (result = {}) => {
      if (result.error) showToast(result.error);
    });
    input.value = "";
    input.focus();
  });

  document
    .getElementById("create-room")
    ?.addEventListener("click", async () => {
      if (!localStorage.getItem(tokenKey)) {
        showToast("Please sign in to create or join a room.");
        return;
      }

      const name = await showInputDialog({
        title: "Create a room",
        label: "Room name",
        submitLabel: "Create room",
      });

      if (!name) return;

      try {
        const room = await roomRequest("POST", "/rooms", { name });

        await loadRooms();
        await enterRoom(room._id);
      } catch (error) {
        showToast(error.message);
      }
    });

  document
    .getElementById("join-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!localStorage.getItem(tokenKey)) {
        showToast("Please sign in to create or join a room.");
        return;
      }

      const roomId = new FormData(event.currentTarget).get("roomId").trim();

      try {
        await roomRequest(
          "POST",
          `/rooms/${encodeURIComponent(roomId)}/join`,
          {},
        );

        await enterRoom(roomId);
      } catch (error) {
        showToast(error.message);
      }
    });

  document.getElementById("leave-room")?.addEventListener("click", async () => {
    const action = await showLeaveDialog(Boolean(currentRoom?.isOwner));
    if (action) await leaveRoom({ closeForAll: action === "close" });
  });

  document
    .getElementById("copy-room")
    ?.addEventListener("click", async (event) => {
      const copyButton = event.currentTarget;
      try {
        await navigator.clipboard.writeText(copyButton.dataset.roomId);
        showToast("Room code copied.");
      } catch (error) {
        showToast(`Could not copy the room code: ${error.message}`);
      }
    });

  document.getElementById("toggle-mic")?.addEventListener("click", (event) => {
    const track = localStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      event.currentTarget.textContent = track.enabled ? "Mic on" : "Mic off";
    }
  });

  document
    .getElementById("toggle-camera")
    ?.addEventListener("click", (event) => {
      const track = cameraTrack;
      if (track) {
        track.enabled = !track.enabled;
        event.currentTarget.textContent = track.enabled
          ? "Camera on"
          : "Camera off";
      }
    });

  document
    .getElementById("share-screen")
    ?.addEventListener("click", async () => {
      if (screenStream) {
        try {
          await stopScreenShare();
        } catch (error) {
          showToast(`Could not stop screen sharing: ${error.message}`);
        }
        return;
      }

      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });

        const screenTrack = screenStream.getVideoTracks()[0];

        for (const connection of peers.values()) {
          const sender = connection
            .getSenders()
            .find((item) => item.track?.kind === "video");
          await sender?.replaceTrack(screenTrack);
        }

        document.getElementById("local-video").srcObject = screenStream;
        const shareButton = document.getElementById("share-screen");
        shareButton.textContent = "Stop sharing";
        shareButton.classList.add("active");

        screenTrack.onended = async () => {
          try {
            await stopScreenShare();
          } catch (error) {
            showToast(`Could not stop screen sharing: ${error.message}`);
          }
        };
      } catch (error) {
        if (screenStream) {
          try {
            await stopScreenShare();
          } catch (stopError) {
            showToast(`Could not stop screen sharing: ${stopError.message}`);
          }
        }
        if (error.name !== "NotAllowedError") showToast(error.message);
      }
    });

  document
    .getElementById("share-whiteboard")
    ?.addEventListener("click", async () => {
      if (whiteboardStream) {
        try {
          await stopWhiteboardShare();
        } catch (error) {
          showToast(`Could not stop whiteboard sharing: ${error.message}`);
        }
        return;
      }
      if (screenStream) {
        showToast("Stop screen sharing before sharing the whiteboard.");
        return;
      }

      try {
        const canvas = document.getElementById("whiteboard");
        if (typeof canvas.captureStream !== "function")
          throw new Error("Whiteboard sharing is not supported by this browser");
        whiteboardStream = canvas.captureStream(15);
        const boardTrack = whiteboardStream.getVideoTracks()[0];
        if (!boardTrack) throw new Error("Could not capture the whiteboard");

        for (const connection of peers.values()) {
          const sender = connection
            .getSenders()
            .find((item) => item.track?.kind === "video");
          await sender?.replaceTrack(boardTrack);
        }

        document.getElementById("local-video").srcObject = whiteboardStream;
        const shareButton = document.getElementById("share-whiteboard");
        shareButton.textContent = "Stop sharing board";
        shareButton.classList.add("active");

        boardTrack.onended = async () => {
          try {
            await stopWhiteboardShare();
          } catch (error) {
            showToast(`Could not stop whiteboard sharing: ${error.message}`);
          }
        };
      } catch (error) {
        if (whiteboardStream) {
          try {
            await stopWhiteboardShare();
          } catch (stopError) {
            showToast(`Could not stop whiteboard sharing: ${stopError.message}`);
          }
        }
        showToast(error.message);
      }
    });

  document
    .getElementById("clear-board")
    ?.addEventListener("click", async () => {
      if (!(await showConfirm("Clear your whiteboard?")))
        return;
      window.clearBoard?.();
    });

  document
    .getElementById("file-input")
    ?.addEventListener("change", async (event) => {
      const file = event.target.files[0];
      const passphrase = document.getElementById("file-key").value;

      if (!file) return;

      try {
        if (!passphrase)
          throw new Error("Enter a shared passphrase before uploading");

        const encrypted = await encryptFile(file, passphrase);

        const form = new FormData();
        form.append("file", encrypted, "encrypted.txt");
        form.append("room", currentRoom._id);
        form.append("name", file.name);

        await api("/files", { method: "POST", body: form });
        await loadFiles();
      } catch (error) {
        showToast(error.message);
      }

      event.target.value = "";
    });

  initializeWhiteboard();
});
