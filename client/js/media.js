async function startMedia() {
  if (localStream) return;

  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    cameraTrack = localStream.getVideoTracks()[0];
    document.getElementById("local-video").srcObject = localStream;
  } catch (_error) {
    showToast(
      "Camera or microphone permission was not granted. You can still join and share the whiteboard.",
    );
  }
}

async function stopScreenShare() {
  const activeScreenStream = screenStream;
  if (!activeScreenStream) return;

  screenStream = null;
  let restoreError;
  for (const connection of peers.values()) {
    const sender = connection
      .getSenders()
      .find((item) => item.track?.kind === "video");
    try {
      await sender?.replaceTrack(cameraTrack || null);
    } catch (error) {
      restoreError ||= error;
    }
  }

  document.getElementById("local-video").srcObject = localStream;
  const shareButton = document.getElementById("share-screen");
  shareButton.textContent = "Share screen";
  shareButton.classList.remove("active");
  activeScreenStream.getTracks().forEach((track) => track.stop());
  if (restoreError) throw restoreError;
}

async function leaveRoom() {
  socket?.disconnect();
  peers.forEach((connection) => connection.close());
  peers.clear();
  pendingIceCandidates.clear();
  localStream?.getTracks().forEach((track) => track.stop());
  const activeScreenStream = screenStream;
  screenStream = null;
  activeScreenStream?.getTracks().forEach((track) => track.stop());
  const shareButton = document.getElementById("share-screen");
  shareButton.textContent = "Share screen";
  shareButton.classList.remove("active");

  localStream = null;
  cameraTrack = null;

  document.getElementById("local-video").srcObject = null;

  document
    .querySelectorAll("#video-grid video[data-peer]")
    .forEach((video) => video.remove());

  document.getElementById("meeting").hidden = true;
  document.getElementById("lobby").hidden = false;

  currentRoom = null;

  await loadRooms();
}
