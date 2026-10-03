document.addEventListener("DOMContentLoaded", () => {
  const authForm = document.getElementById("auth-form");

  authForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(authForm));

    try {
      if (authForm.dataset.mode === "register")
        await roomRequest("POST", "/auth/register", data);

      const result = await roomRequest("POST", "/auth/login", data);

      localStorage.setItem(tokenKey, result.token);
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

  document
    .getElementById("create-room")
    ?.addEventListener("click", async () => {
      const name = await showInputDialog({
        title: "Create a room",
        label: "Room name",
        submitLabel: "Create room",
      });

      if (!name) return;

      try {
        const room = await roomRequest("POST", "/rooms", { name });

        await loadRooms();
        await startMedia();
        await enterRoom(room._id);
      } catch (error) {
        showToast(error.message);
      }
    });

  document
    .getElementById("join-form")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const roomId = new FormData(event.currentTarget).get("roomId").trim();

      try {
        await roomRequest(
          "POST",
          `/rooms/${encodeURIComponent(roomId)}/join`,
          {},
        );

        await startMedia();
        await enterRoom(roomId);
      } catch (error) {
        showToast(error.message);
      }
    });

  document.getElementById("leave-room")?.addEventListener("click", async () => {
    if (await showConfirm("Are you sure you want to leave this room?"))
      await leaveRoom();
  });

  document
    .getElementById("copy-room")
    ?.addEventListener("click", async (event) => {
      await navigator.clipboard.writeText(event.currentTarget.dataset.roomId);
      event.currentTarget.textContent = "Copied";
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

        screenTrack.onended = async () => {
          for (const connection of peers.values()) {
            const sender = connection
              .getSenders()
              .find((item) => item.track?.kind === "video");
            await sender?.replaceTrack(cameraTrack || null);
          }

          document.getElementById("local-video").srcObject = localStream;
          screenStream = null;
        };
      } catch (error) {
        if (error.name !== "NotAllowedError") showToast(error.message);
      }
    });

  document.getElementById("clear-board")?.addEventListener("click", async () => {
    if (!(await showConfirm("Clear the shared whiteboard for everyone?")))
      return;
    window.clearBoard?.();
    socket?.emit("whiteboard:clear");
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
        form.append("file", encrypted, "encrypted.bin");
        form.append("room", currentRoom.id);
        form.append("name", file.name);

        await api("/files", { method: "POST", body: form });
        await loadFiles();

        socket?.emit("file:created");
      } catch (error) {
        showToast(error.message);
      }

      event.target.value = "";
    });

  initializeWhiteboard();
});
