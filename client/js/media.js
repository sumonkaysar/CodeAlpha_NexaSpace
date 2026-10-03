async function startMedia() {
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

async function leaveRoom() {
  socket?.disconnect();
  peers.forEach((connection) => connection.close());
  peers.clear();
  localStream?.getTracks().forEach((track) => track.stop());
  screenStream?.getTracks().forEach((track) => track.stop());

  localStream = null;
  screenStream = null;

  document.getElementById("local-video").srcObject = null;

  document
    .querySelectorAll("#video-grid video[data-peer]")
    .forEach((video) => video.remove());

  document.getElementById("meeting").hidden = true;
  document.getElementById("lobby").hidden = false;

  currentRoom = null;

  await loadRooms();
}
